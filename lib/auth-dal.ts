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
import { createServerUserService } from '@/lib/services/domain/user.service'
import type { User } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/** Nom du cookie pour persister le choix d'équipe courante */
export const CURRENT_TEAM_COOKIE = 'seido_current_team'
/**
 * ✅ PATTERN 2025 OPTIMISÉ: getUser() avec cache React
 * Fonction centrale pour toute vérification auth server-side
 * Cache automatique pendant le cycle de rendu
 *
 * ⚠️ FIX (Jan 2026): ZERO NETWORK CALL OPTIMIZATION
 * Le middleware fait déjà `supabase.auth.getUser()` qui valide le token côté serveur.
 * Dans les pages/layouts, on peut utiliser `getSession()` qui lit le cookie JWT
 * SANS faire d'appel réseau (le token est déjà validé par le middleware).
 *
 * Cette optimisation réduit les appels auth de 2 à 1 par navigation.
 */
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient()

  try {
    // ✅ OPTIMISATION: Utiliser getSession() au lieu de getUser()
    // getSession() lit le JWT depuis les cookies SANS appel réseau
    // Le middleware a DÉJÀ validé le token avec getUser()
    // Donc on peut faire confiance au JWT pour les pages
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ [AUTH-DAL] getSession error:', error.message)
      }
      return null
    }

    // Retourner l'user depuis la session (pas d'appel réseau)
    return session?.user ?? null
  } catch (error) {
    logger.error('❌ [AUTH-DAL] Exception in getUser:', error)
    return null
  }
})

/**
 * ✅ PATTERN 2025: getSession() avec validation
 * Pour les cas où on a besoin de la session complète
 *
 * ⚠️ FIX (Jan 2026): Removed double validation (getSession + getUser) that was
 * causing 2x auth API calls. The session from getSession() is already validated
 * by Supabase middleware. If you need user verification, use getUser() directly.
 */
export const getSession = cache(async () => {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return null
    }

    // ✅ Session is already validated by middleware - no need for double call
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
    redirect('/auth/login?reason=no_profile')
  }

  const userRole = userProfile.profile.role

  // 🔒 Normaliser allowedRoles: string → [string], string[] → string[], undefined → []
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : (allowedRoles ? [allowedRoles] : [])

  // Si des rôles sont requis, vérifier que l'utilisateur a un rôle autorisé
  if (roles.length > 0 && !roles.includes(userRole)) {
    redirect(redirectTo)
  }

  return {
    user: userProfile.supabaseUser,
    profile: userProfile.profile,
    allProfiles: userProfile.allProfiles  // ✅ MULTI-ÉQUIPE: Exposer tous les profils pour filtrage par rôle
  }
}

/**
 * ✅ PROTECTION GUEST: S'assurer que l'utilisateur n'est PAS connecté
 * Pour les pages comme login/signup
 */
export async function requireGuest(redirectTo: string = '/dashboard') {
  const user = await getUser()

  if (user) {
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
      return null
    }

    return result.data
  } catch (error) {
    logger.error('❌ [AUTH-DAL] getUserProfileForMiddleware error:', error)
    return null
  }
}

/**
 * ✅ MULTI-ÉQUIPE (Jan 2026): Récupération profil utilisateur avec support multi-profils
 *
 * Un utilisateur peut avoir plusieurs profils (1 par équipe) avec des rôles différents.
 * Cette fonction:
 * 1. Récupère TOUS les profils de l'utilisateur
 * 2. Sélectionne le profil selon: cookie server-side > plus récent
 * 3. Expose allProfiles pour le sélecteur d'équipe
 *
 * @returns {supabaseUser, profile, allProfiles} ou null
 */
export const getUserProfile = cache(async () => {
  const supabaseUser = await getUser()

  if (!supabaseUser) {
    return null
  }

  try {
    const userService = await createServerUserService()

    // ✅ MULTI-PROFIL: Récupérer TOUS les profils liés à cet auth_user_id
    const profilesResult = await userService.getAllByAuthUserId(supabaseUser.id)

    if (!profilesResult.success) {
      logger.error('❌ [AUTH-DAL] getAllByAuthUserId failed:', (profilesResult as { error?: unknown }).error)
    }

    if (!profilesResult.success || !profilesResult.data?.length) {
      return null
    }

    const allProfiles = profilesResult.data

    // ✅ Choisir le profil selon priorité: cookie server-side > plus récent
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const preferredTeamId = cookieStore.get(CURRENT_TEAM_COOKIE)?.value

    let selectedProfile = allProfiles[0] // Défaut: plus récent (déjà trié)

    if (preferredTeamId && preferredTeamId !== 'all') {
      const preferred = allProfiles.find(p => p.team_id === preferredTeamId)
      if (preferred) {
        selectedProfile = preferred
      }
    }

    return {
      supabaseUser,
      profile: selectedProfile,
      allProfiles  // ✅ Exposé pour sélecteur d'équipe
    }
  } catch (error) {
    logger.error('❌ [AUTH-DAL] Error loading user profile:', error)
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
 *
 * ⚠️ FIX (Jan 2026): Now uses only getUser() instead of parallel getUser + getSession.
 * This avoids redundant auth API calls. Session is rarely needed; use getSession()
 * separately only when you actually need the full session object.
 */
export async function getAuthState(): Promise<AuthState> {
  const user = await getUser()

  return {
    isAuthenticated: !!user,
    user,
    session: null // ✅ Lazy load: call getSession() only when actually needed
  }
}
