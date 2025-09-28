/**
 * 🛡️ SERVER SUPABASE CLIENT - PATTERN 2025
 *
 * Client pour Server Components, Server Actions, et Route Handlers
 * Gestion sécurisée des cookies et session server-side
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // ✅ 2025: Gestion gracieuse des erreurs cookies en SSR
            console.warn('⚠️ [SUPABASE-SERVER] Unable to set cookies:', error)
          }
        }
      },
      global: {
        headers: {
          'x-client-info': 'seido-app@2025/server'
        }
      }
    }
  )
}

/**
 * ✅ UTILITAIRE: Client server simplifié pour DAL
 * Version optimisée pour le Data Access Layer
 */
export async function createAuthClient() {
  const supabase = await createClient()

  // ✅ 2025: Opt-out du cache Next.js pour data authentifiée
  // Note: cookies() appel automatiquement opte out du cache

  return supabase
}
