/**
 * 🌐 SUPABASE BROWSER CLIENT (SSR 2025 Compliant)
 *
 * Client pour les Client Components qui s'exécutent dans le navigateur
 * Utilise createBrowserClient selon la documentation officielle Supabase SSR
 *
 * Documentation: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export d'une instance partagée pour compatibilité
export const supabase = createClient()
