/**
 * 🎯 CLIENT SUPABASE BROWSER - PATTERN 2025
 *
 * Client pour composants React côté client (Client Components)
 * Suit les bonnes pratiques officielles Supabase + Next.js 15
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // ✅ 2025: PKCE flow pour sécurité maximale
        flowType: 'pkce',
        // ✅ Persistance session dans localStorage
        persistSession: true,
        // ✅ Auto-refresh tokens
        autoRefreshToken: true,
        // ✅ Détection URL de callback
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'x-client-info': 'seido-app@2025'
        }
      }
    }
  )
}