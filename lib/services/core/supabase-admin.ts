/**
 * 🔐 SUPABASE ADMIN CLIENT - Service Role
 *
 * Client Supabase avec permissions élevées (SERVICE_ROLE_KEY)
 * ATTENTION : À utiliser UNIQUEMENT côté serveur (Server Actions, API Routes)
 * Ne JAMAIS exposer au client (pas de 'use client')
 *
 * Use Cases :
 * - Créer utilisateurs sans trigger d'email automatique (generateLink)
 * - Opérations admin (bypass RLS, admin.listUsers, etc.)
 * - Invitations et réinitialisations de mot de passe
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Vérifier que la SERVICE_ROLE_KEY est configurée
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - admin operations will be disabled')
}

/**
 * Client Admin Supabase (singleton avec Service Role Key)
 *
 * ⚠️ SÉCURITÉ : Ce client bypasse RLS (Row Level Security)
 * - Ne pas exposer au client
 * - Utiliser UNIQUEMENT pour opérations admin sécurisées
 * - Toujours valider les permissions avant utilisation
 *
 * @example
 * ```typescript
 * const admin = getSupabaseAdmin()
 * if (!admin) {
 *   return { error: 'Service admin non configuré' }
 * }
 *
 * const { data, error } = await admin.auth.admin.generateLink({
 *   type: 'signup',
 *   email: 'user@example.com',
 *   password: 'secure-password'
 * })
 * ```
 */
export const supabaseAdmin = SERVICE_ROLE_KEY ? createClient<Database>(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

/**
 * Obtenir le client admin Supabase
 *
 * @returns Client admin ou null si SERVICE_ROLE_KEY non configuré
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    console.error('❌ [SUPABASE-ADMIN] SERVICE_ROLE_KEY not configured')
    console.error('❌ [SUPABASE-ADMIN] Available env vars:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SERVICE_ROLE_KEY,
      supabaseEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
    })
  }
  return supabaseAdmin
}

/**
 * Vérifier si le client admin est disponible
 *
 * @example
 * ```typescript
 * if (!isAdminConfigured()) {
 *   throw new Error('Service admin non disponible')
 * }
 * ```
 */
export function isAdminConfigured(): boolean {
  return supabaseAdmin !== null
}
