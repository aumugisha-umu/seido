import { createBrowserClient, createServerClient } from '@supabase/ssr'
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
 * Browser client for client-side operations
 * Use this in components that run in the browser
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
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
}

/**
 * Server client for Server Components (READ-ONLY)
 * Use this in Server Components where you can't modify cookies
 * ⚠️ Cannot refresh session or modify auth state
 */
export async function createServerSupabaseClient() {
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
}

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
 * Legacy browser client for backward compatibility
 * @deprecated Use createBrowserSupabaseClient() instead
 */
export const supabase = createBrowserSupabaseClient()

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
 */
export async function isAuthenticated(client?: ReturnType<typeof createBrowserSupabaseClient>): Promise<boolean> {
  try {
    const supabaseClient = client || createBrowserSupabaseClient()
    const { data: { session } } = await supabaseClient.auth.getSession()
    return !!session?.user
  } catch (error) {
    logger.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Get server session (for API routes and Server Components)
 * Helper for authentication checks on the server
 */
export async function getServerSession() {
  const supabase = await createServerSupabaseClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return session
}

// Re-export types
export type { Database } from '../../database.types'
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
