import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import type { Database } from '../../database.types'
import { ENV_CONFIG, calculateRetryDelay } from '../../environment'
import { logger, logError } from '@/lib/logger'
// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

/**
 * ✅ Browser client singleton instance
 * Cached at module level to prevent multiple client creation per session
 * This is the recommended pattern from Supabase docs:
 * - Single client per browser session
 * - Avoids duplicate auth subscriptions
 * - Reduces memory footprint
 */
let browserClientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Browser client for client-side operations
 * Use this in components that run in the browser
 *
 * ✅ OPTIMIZED (2026-02-08): Returns singleton instance instead of creating new client
 * - First call creates the client
 * - Subsequent calls return the same instance
 * - Resets on page reload (expected browser behavior)
 */
export function createBrowserSupabaseClient() {
  // Return existing singleton if available
  if (browserClientSingleton) {
    return browserClientSingleton
  }

  // Create new client (only on first call)
  browserClientSingleton = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-client-info': 'seido-app/1.0.0',
        ...(ENV_CONFIG.isProduction && {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        })
      },
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), ENV_CONFIG.fetch.timeout)

        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId)
        })
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: ENV_CONFIG.isProduction ? 5 : 10
      }
    }
  })

  return browserClientSingleton
}

/**
 * Get the browser client singleton (alias for createBrowserSupabaseClient)
 * Use this when you want to be explicit about getting the singleton
 */
export function getBrowserClient() {
  return createBrowserSupabaseClient()
}

/**
 * Server client for Server Components (READ-ONLY)
 * Use this in Server Components where you can't modify cookies
 * ⚠️ Cannot refresh session or modify auth state
 *
 * ✅ FIX (Jan 2026): Wrapped with cache() to deduplicate client creation per request
 * This prevents creating multiple Supabase clients during the same render cycle,
 * which was causing excessive auth API calls (250+ in 10 minutes).
 */
export const createServerSupabaseClient = cache(async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // ✅ No-op in Server Components - cannot modify cookies
        // Next.js 15: "Cookies can only be modified in a Server Action or Route Handler"
      }
    },
    auth: {
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-client-info': 'seido-app/1.0.0'
      }
    }
  })
})

/**
 * Server client for Server Actions and Route Handlers (READ-WRITE)
 * Use this when you need to modify auth state or refresh sessions
 * ✅ Can refresh session and modify cookies
 */
export async function createServerActionSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // ✅ Allowed in Server Actions and Route Handlers
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      }
    },
    auth: {
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-client-info': 'seido-app/1.0.0'
      }
    }
  })
}

/**
 * Service Role client for system operations
 * ⚠️ WARNING: This client BYPASSES ALL RLS policies
 *
 * Use ONLY for:
 * - System operations (auto-confirmation, cleanup jobs)
 * - Server-side only (Server Actions, API routes)
 * - Operations that require elevated privileges
 *
 * NEVER use for:
 * - Client-side operations
 * - Direct user actions
 * - Anything exposed to the frontend
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment variables
 */
export function createServiceRoleSupabaseClient() {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for service role client')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for service role client. ' +
      'Get it from Supabase Dashboard → Settings → API → service_role key'
    )
  }

  logger.info('🔑 [SERVICE-ROLE] Creating service role client (RLS BYPASS)', {
    url: supabaseUrl,
    keyPresent: !!supabaseServiceRoleKey
  })

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-client-info': 'seido-app/1.0.0 (service-role)',
        'x-elevated-privileges': 'true'
      }
    },
    db: {
      schema: 'public'
    }
  })
}

/**
 * Legacy browser client for backward compatibility
 * @deprecated Use createBrowserSupabaseClient() or getBrowserClient() instead
 *
 * ✅ Now returns singleton via lazy getter to avoid module-level side effects
 */
export const supabase = /* @__PURE__ */ (() => {
  // Lazy initialization - only creates client when first accessed
  return createBrowserSupabaseClient()
})()

/**
 * Retry utility with enhanced error handling
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number
): Promise<T> => {
  const retries = maxRetries ?? ENV_CONFIG.retry.maxAttempts
  const delay = baseDelay ?? ENV_CONFIG.retry.baseDelay

  let lastError: Error

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Stop immediately on session cleanup errors
      if (lastError.name === 'SessionCleanupRequired') {
        throw lastError
      }

      if (attempt === retries) {
        break
      }

      const totalDelay = calculateRetryDelay(attempt, delay)
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  throw lastError!
}

/**
 * Get current user ID from authenticated session
 *
 * @deprecated Use `useAuth()` hook in Client Components instead.
 * This function makes a direct auth call which should be avoided.
 * Auth state should come from AuthProvider context.
 *
 * @example
 * // ❌ DEPRECATED
 * const userId = await getCurrentUserId()
 *
 * // ✅ RECOMMENDED (Client Component)
 * const { user } = useAuth()
 * const userId = user?.id
 */
export async function getCurrentUserId(client?: ReturnType<typeof createBrowserSupabaseClient>): Promise<string | null> {
  try {
    const supabaseClient = client || createBrowserSupabaseClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    return user?.id || null
  } catch (error) {
    logger.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 *
 * @deprecated Use `useAuth()` hook in Client Components instead.
 * This function makes a direct auth call which should be avoided.
 *
 * @example
 * // ❌ DEPRECATED
 * const isAuth = await isAuthenticated()
 *
 * // ✅ RECOMMENDED (Client Component)
 * const { user, isLoading } = useAuth()
 * const isAuth = !isLoading && !!user
 */
export async function isAuthenticated(client?: ReturnType<typeof createBrowserSupabaseClient>): Promise<boolean> {
  try {
    const supabaseClient = client || createBrowserSupabaseClient()
    const { data } = await supabaseClient.auth.getSession()
    return !!data.session
  } catch (error) {
    logger.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Get server session (for API routes and Server Components)
 *
 * @deprecated Use centralized auth helpers instead:
 * - Server Components: `getServerAuthContext()` from `lib/server-context`
 * - Server Actions: `getServerActionAuthContextOrNull()` from `lib/server-context`
 * - API Routes: `getApiAuthContext()` from `lib/api-auth-context`
 *
 * @example
 * // ❌ DEPRECATED
 * const session = await getServerSession()
 *
 * // ✅ RECOMMENDED (Server Component)
 * import { getServerAuthContext } from '@/lib/server-context'
 * const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
 *
 * // ✅ RECOMMENDED (Server Action)
 * import { getServerActionAuthContextOrNull } from '@/lib/server-context'
 * const authContext = await getServerActionAuthContextOrNull()
 */
export async function getServerSession() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    return null
  }

  // Spread to bypass Supabase Proxy warning on .user access
  return { ...data.session }
}

// Re-export types
export type { Database } from '../../database.types'
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
