/**
 * API Authentication Helper
 *
 * Centralizes authentication logic for API routes.
 * Replaces ~30-40 lines of duplicated code per route.
 *
 * Usage:
 * ```typescript
 * const authResult = await getApiAuthContext()
 * if (!authResult.success) {
 *   return authResult.error // Returns 401 NextResponse
 * }
 *
 * const { supabase, authUser, userProfile } = authResult.data
 * ```
 */

import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'

/**
 * Success result with authenticated context
 */
export interface ApiAuthContext {
  supabase: ReturnType<typeof createServerClient<Database>>
  authUser: {
    id: string
    email?: string
    [key: string]: any
  }
  userProfile?: {
    id: string
    role: string
    team_id?: string
    name?: string
    email?: string
    [key: string]: any
  }
}

/**
 * Result type for API auth operations
 */
export type ApiAuthResult =
  | { success: true; data: ApiAuthContext }
  | { success: false; error: NextResponse }

/**
 * Options for getApiAuthContext
 */
export interface GetApiAuthContextOptions {
  /**
   * If true, fetches user profile from database.
   * Default: true
   */
  fetchProfile?: boolean

  /**
   * If provided, validates user has this role.
   * Returns 403 if role doesn't match.
   */
  requiredRole?: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'

  /**
   * If true, returns 403 on unauthorized instead of 401
   */
  return403OnUnauth?: boolean
}

/**
 * Get authenticated API context
 *
 * Centralizes:
 * - Supabase client creation with cookies
 * - Authentication check
 * - Optional user profile fetch
 * - Optional role validation
 *
 * @param options Configuration options
 * @returns ApiAuthResult with either authenticated context or error response
 */
export async function getApiAuthContext(
  options: GetApiAuthContextOptions = {}
): Promise<ApiAuthResult> {
  const {
    fetchProfile = true,
    requiredRole,
    return403OnUnauth = false
  } = options

  try {
    // ✅ Step 1: Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
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
                cookieStore.set(name, value, options as CookieOptions)
              )
            } catch {
              // Ignore cookie setting errors in API routes
              // This can happen when called from Server Component
            }
          },
        },
      }
    )

    // ✅ Step 2: Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      logger.warn({ authError }, '❌ [API-AUTH] Unauthorized access attempt')

      const status = return403OnUnauth ? 403 : 401
      const message = return403OnUnauth ? 'Accès interdit' : 'Non autorisé'

      return {
        success: false,
        error: NextResponse.json({
          success: false,
          error: message
        }, { status })
      }
    }

    // ✅ Step 3: Optionally fetch user profile
    let userProfile: ApiAuthContext['userProfile'] = undefined

    if (fetchProfile) {
      // ✅ MULTI-ÉQUIPE FIX: Récupérer TOUS les profils au lieu de .single()
      // Ceci évite l'erreur PGRST116 quand l'utilisateur a 2+ profils
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, role, team_id, name, email, phone, avatar_url')
        .eq('auth_user_id', authUser.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (profilesError || !profiles || profiles.length === 0) {
        logger.error({ profilesError, authUserId: authUser.id }, '❌ [API-AUTH] User profile not found')

        return {
          success: false,
          error: NextResponse.json({
            success: false,
            error: 'Profil utilisateur introuvable'
          }, { status: 404 })
        }
      }

      // Sélectionner le profil selon cookie seido_current_team
      const preferredTeamId = cookieStore.get('seido_current_team')?.value
      let selectedProfile = profiles[0]  // Défaut: plus récent (updated_at DESC)

      if (preferredTeamId && preferredTeamId !== 'all') {
        const preferred = profiles.find(p => p.team_id === preferredTeamId)
        if (preferred) {
          selectedProfile = preferred
        }
      }

      logger.debug({
        authUserId: authUser.id,
        totalProfiles: profiles.length,
        selectedTeamId: selectedProfile.team_id,
        preferredTeamId
      }, '✅ [API-AUTH] Multi-profile selection completed')

      userProfile = selectedProfile
    }

    // ✅ Step 4: Optionally validate role
    if (requiredRole && userProfile) {
      if (userProfile.role !== requiredRole && userProfile.role !== 'admin') {
        logger.warn({
          requiredRole,
          actualRole: userProfile.role,
          userId: userProfile.id
        }, '❌ [API-AUTH] Insufficient permissions')

        return {
          success: false,
          error: NextResponse.json({
            success: false,
            error: 'Permissions insuffisantes'
          }, { status: 403 })
        }
      }
    }

    // ✅ Success - return authenticated context
    return {
      success: true,
      data: {
        supabase,
        authUser,
        userProfile
      }
    }

  } catch (error) {
    logger.error({ error }, '❌ [API-AUTH] Unexpected error in getApiAuthContext')

    return {
      success: false,
      error: NextResponse.json({
        success: false,
        error: 'Erreur interne du serveur'
      }, { status: 500 })
    }
  }
}

/**
 * Shorthand for getApiAuthContext with role validation
 *
 * Usage:
 * ```typescript
 * const authResult = await requireApiRole('gestionnaire')
 * if (!authResult.success) return authResult.error
 * ```
 */
export async function requireApiRole(
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
): Promise<ApiAuthResult> {
  return getApiAuthContext({ requiredRole: role })
}
