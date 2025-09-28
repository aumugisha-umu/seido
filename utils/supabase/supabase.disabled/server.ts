/**
 * 🖥️ SUPABASE SERVER CLIENT (SSR 2025 Compliant)
 *
 * Client pour les Server Components, Server Actions et Route Handlers
 * Utilise createServerClient selon la documentation officielle Supabase SSR
 *
 * Documentation: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

// 🔧 POLYFILL OBLIGATOIRE: Charge les polyfills avant Supabase
import '@/lib/polyfills'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Alternative pour les Route Handlers avec NextRequest/NextResponse
export function createClientForRouteHandler(request: Request) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.headers.get('cookie')
          if (!cookies) return []

          return cookies
            .split(';')
            .map(cookie => cookie.trim())
            .filter(Boolean)
            .map(cookie => {
              const [name, ...valueParts] = cookie.split('=')
              return { name: name.trim(), value: valueParts.join('=').trim() }
            })
        },
        setAll() {
          // Implementation will be handled by the response
        },
      },
    }
  )
}
