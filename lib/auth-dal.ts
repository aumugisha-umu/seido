/**
 * 🛡️ DATA ACCESS LAYER (DAL) - AUTHENTICATION
 *
 * Conformément aux bonnes pratiques Next.js 15 / Supabase 2025 :
 * - Centralise tous les auth checks server-side
 * - Utilise createServerClient pour sécurité maximale
 * - Validation session systématique avec getUser()
 * - Protection multi-couches (données + UI)
 */

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { createServerUserService } from '@/lib/services'
import type { User } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'
/**
 * ✅ PATTERN 2025: getUser() avec cache React et retry logic
 * Fonction centrale pour toute vérification auth server-side
 * Cache automatique pendant le cycle de rendu
 */
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient()

  // ✅ NOUVEAU: Retry logic pour éviter les race conditions après login
  let retryCount = 0
  const maxRetries = 3

  while (retryCount <= maxRetries) {
    try {
      // ✅ SÉCURITÉ: getUser() recommandé vs getSession()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        if (retryCount === maxRetries) {
          logger.info('❌ [AUTH-DAL] Error getting user after retries:', error.message)
          return null
        }
        logger.info(`⏳ [AUTH-DAL] Error getting user, retry ${retryCount + 1}/${maxRetries}:`, error.message)
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      if (!user) {
        if (retryCount === maxRetries) {
          logger.info('🔍 [AUTH-DAL] No authenticated user found after retries')
          return null
        }
        logger.info(`⏳ [AUTH-DAL] No user found, retry ${retryCount + 1}/${maxRetries}`)
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      logger.info('✅ [AUTH-DAL] User authenticated:', user.email)
      return user
    } catch (error) {
      if (retryCount === maxRetries) {
        logger.error('❌ [AUTH-DAL] Exception in getUser after retries:', error)
        return null
      }
      logger.info(`⏳ [AUTH-DAL] Exception in getUser, retry ${retryCount + 1}/${maxRetries}:`, error)
      retryCount++
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return null
})

/**
 * ✅ PATTERN 2025: getSession() avec validation
 * Pour les cas où on a besoin de la session complète
 */
export const getSession = cache(async () => {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      logger.info('❌ [AUTH-DAL] Error getting session:', error.message)
      return null
    }

    // ✅ DOUBLE VALIDATION: Vérifier que l'utilisateur existe vraiment
    if (session?.user) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        logger.info('⚠️ [AUTH-DAL] Session exists but user validation failed')
        return null
      }
    }

    return session
  } catch (error) {
    logger.error('❌ [AUTH-DAL] Exception in getSession:', error)
    return null
  }
})

/**
 * ✅ PROTECTION MULTI-COUCHES: Auth check avec redirection automatique
 * Pour protéger des pages complètes
 */
export async function requireAuth(redirectTo: string = '/auth/login') {
  const user = await getUser()

  if (!user) {
    logger.info('🚫 [AUTH-DAL] Authentication required, redirecting to:', redirectTo)
    redirect(redirectTo)
  }

  return user
}

/**
 * ✅ PROTECTION RÔLE: Vérification role-based access (IMPLÉMENTÉE Phase 2.5)
 * Pour protéger selon les rôles utilisateur - utilise le profil DB réel
 *
 * @param allowedRoles - Un rôle (string) ou plusieurs rôles (string[]), optionnel
 *                       Si non fourni, vérifie seulement que l'utilisateur est authentifié
 * @param redirectTo - URL de redirection si accès refusé
 */
export async function requireRole(
  allowedRoles?: string | string[],
  redirectTo: string = '/auth/unauthorized'
) {
  // Récupérer profil complet avec rôle depuis DB
  const userProfile = await getUserProfile()

  if (!userProfile) {
    logger.info('🚫 [AUTH-DAL] No user profile found, redirecting to login')
    redirect('/auth/login?reason=no_profile')
  }

  const userRole = userProfile.profile.role

  // 🔒 Normaliser allowedRoles: string → [string], string[] → string[], undefined → []
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : (allowedRoles ? [allowedRoles] : [])

  // Si des rôles sont requis, vérifier que l'utilisateur a un rôle autorisé
  if (roles.length > 0 && !roles.includes(userRole)) {
    logger.info('🚫 [AUTH-DAL] Insufficient permissions. Required:', roles, 'Got:', userRole)
    redirect(redirectTo)
  }

  logger.info('✅ [AUTH-DAL] Role check passed:', { role: userRole, allowed: roles.length > 0 ? roles : 'any' })
  return { user: userProfile.supabaseUser, profile: userProfile.profile }
}

/**
 * ✅ PROTECTION GUEST: S'assurer que l'utilisateur n'est PAS connecté
 * Pour les pages comme login/signup
 */
export async function requireGuest(redirectTo: string = '/dashboard') {
  const user = await getUser()

  if (user) {
    // TODO: Déterminer redirection selon le rôle
    logger.info('🔄 [AUTH-DAL] User already authenticated, redirecting to:', redirectTo)
    redirect(redirectTo)
  }

  return true
}

/**
 * ✅ MIDDLEWARE HELPER: Récupération profil optimisée pour middleware
 * Version légère sans cache React (pour middleware edge runtime)
 */
export async function getUserProfileForMiddleware(authUserId: string) {
  try {
    const userService = await createServerUserService()
    const result = await userService.getByAuthUserId(authUserId)

    if (!result.success || !result.data) {
      logger.warn('⚠️ [AUTH-DAL] getUserProfileForMiddleware: No profile found for auth user:', authUserId)
      return null
    }

    logger.info('✅ [AUTH-DAL] getUserProfileForMiddleware: Profile loaded:', {
      userId: result.data.id,
      role: result.data.role,
      isActive: result.data.is_active,
      passwordSet: result.data.password_set
    })

    return result.data
  } catch (error) {
    logger.error('❌ [AUTH-DAL] getUserProfileForMiddleware error:', error)
    return null
  }
}

/**
 * ✅ NOUVEAU: Récupération profil utilisateur complet avec rôle
 * Retourne le user Supabase + profil app avec rôle
 */
export const getUserProfile = cache(async () => {
  const supabaseUser = await getUser()

  if (!supabaseUser) {
    logger.info('🔍 [AUTH-DAL-DEBUG] getUserProfile: No supabase user')
    return null
  }

  logger.info('🔍 [AUTH-DAL-DEBUG] getUserProfile: Supabase user found:', {
    id: supabaseUser.id,
    email: supabaseUser.email,
    aud: supabaseUser.aud
  })

  try {
    // ✅ Récupérer le profil complet depuis la table users
    logger.info('🔍 [AUTH-DAL-DEBUG] Creating userService...')
    const userService = await createServerUserService()

    logger.info('🔍 [AUTH-DAL-DEBUG] Calling userService.getByAuthUserId with:', supabaseUser.id)
    const userResult = await userService.getByAuthUserId(supabaseUser.id)

    logger.info('🔍 [AUTH-DAL-DEBUG] userService.getByAuthUserId result:', {
      success: userResult.success,
      hasData: !!userResult.data,
      error: userResult.success ? null : (userResult as any).error
    })

    if (!userResult.success || !userResult.data) {
      logger.info('⚠️ [AUTH-DAL] Supabase user exists but no profile found in users table:', supabaseUser.email)
      return null
    }

    const userProfile = userResult.data

    logger.info('✅ [AUTH-DAL] Complete user profile loaded:', {
      email: userProfile.email,
      role: userProfile.role,
      id: userProfile.id,
      team_id: (userProfile as any).team_id
    })

    return {
      supabaseUser,
      profile: userProfile
    }
  } catch (error) {
    logger.error('❌ [AUTH-DAL] Error loading user profile:', error)
    logger.error('❌ [AUTH-DAL-DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return null
  }
})

/**
 * ✅ UTILITAIRE: Déterminer dashboard selon le rôle
 */
export function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'gestionnaire':
      return '/gestionnaire/dashboard'
    case 'prestataire':
      return '/prestataire/dashboard'
    case 'locataire':
      return '/locataire/dashboard'
    default:
      return '/admin/dashboard' // Fallback
  }
}

/**
 * ✅ UTILITAIRE: Vérification auth sans redirection
 * Pour les composants qui s'adaptent selon l'état auth
 */
export async function checkAuth() {
  const user = await getUser()
  const session = await getSession()

  return {
    isAuthenticated: !!user,
    user,
    session
  }
}

/**
 * ✅ PATTERN 2025: Server Action pour invalidation session
 * Peut être utilisé dans les Server Actions de déconnexion
 */
export async function invalidateAuth() {
  const supabase = await createServerSupabaseClient()

  try {
    await supabase.auth.signOut()
    logger.info('✅ [AUTH-DAL] Session invalidated successfully')
  } catch (error) {
    logger.error('❌ [AUTH-DAL] Error invalidating session:', error)
    throw error
  }
}

/**
 * ✅ OPTIMISATION: Type-safe auth state pour TypeScript
 */
export type AuthState = {
  isAuthenticated: boolean
  user: User | null
  session: unknown | null
}

/**
 * ✅ UTILITAIRE: Helper pour Server Components
 * Récupère l'état auth complet de manière optimisée
 */
export async function getAuthState(): Promise<AuthState> {
  const [user, session] = await Promise.all([
    getUser(),
    getSession()
  ])

  return {
    isAuthenticated: !!user,
    user,
    session
  }
}
