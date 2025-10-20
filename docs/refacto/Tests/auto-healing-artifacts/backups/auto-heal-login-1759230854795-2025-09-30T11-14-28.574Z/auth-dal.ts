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
          console.log('❌ [AUTH-DAL] Error getting user after retries:', error.message)
          return null
        }
        console.log(`⏳ [AUTH-DAL] Error getting user, retry ${retryCount + 1}/${maxRetries}:`, error.message)
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      if (!user) {
        if (retryCount === maxRetries) {
          console.log('🔍 [AUTH-DAL] No authenticated user found after retries')
          return null
        }
        console.log(`⏳ [AUTH-DAL] No user found, retry ${retryCount + 1}/${maxRetries}`)
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      console.log('✅ [AUTH-DAL] User authenticated:', user.email)
      return user
    } catch (error) {
      if (retryCount === maxRetries) {
        console.error('❌ [AUTH-DAL] Exception in getUser after retries:', error)
        return null
      }
      console.log(`⏳ [AUTH-DAL] Exception in getUser, retry ${retryCount + 1}/${maxRetries}:`, error)
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
      console.log('❌ [AUTH-DAL] Error getting session:', error.message)
      return null
    }

    // ✅ DOUBLE VALIDATION: Vérifier que l'utilisateur existe vraiment
    if (session?.user) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log('⚠️ [AUTH-DAL] Session exists but user validation failed')
        return null
      }
    }

    return session
  } catch (error) {
    console.error('❌ [AUTH-DAL] Exception in getSession:', error)
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
    console.log('🚫 [AUTH-DAL] Authentication required, redirecting to:', redirectTo)
    redirect(redirectTo)
  }

  return user
}

/**
 * ✅ PROTECTION RÔLE: Vérification role-based access
 * Pour protéger selon les rôles utilisateur
 */
export async function requireRole(allowedRoles: string[], redirectTo: string = '/auth/unauthorized') {
  const user = await requireAuth()

  // TODO: Récupérer le rôle depuis la base de données ou metadata
  // const userRole = user.user_metadata?.role || 'user'
  const userRole = 'admin' // Placeholder - à implémenter selon votre logique

  if (!allowedRoles.includes(userRole)) {
    console.log('🚫 [AUTH-DAL] Insufficient permissions. Required:', allowedRoles, 'Got:', userRole)
    redirect(redirectTo)
  }

  return { user, role: userRole }
}

/**
 * ✅ PROTECTION GUEST: S'assurer que l'utilisateur n'est PAS connecté
 * Pour les pages comme login/signup
 */
export async function requireGuest(redirectTo: string = '/dashboard') {
  const user = await getUser()

  if (user) {
    // TODO: Déterminer redirection selon le rôle
    console.log('🔄 [AUTH-DAL] User already authenticated, redirecting to:', redirectTo)
    redirect(redirectTo)
  }

  return true
}

/**
 * ✅ NOUVEAU: Récupération profil utilisateur complet avec rôle
 * Retourne le user Supabase + profil app avec rôle
 */
export const getUserProfile = cache(async () => {
  const supabaseUser = await getUser()

  if (!supabaseUser) {
    return null
  }

  try {
    // ✅ Récupérer le profil complet depuis la table users
    const userService = await createServerUserService()
    const userResult = await userService.getByAuthUserId(supabaseUser.id)

    if (!userResult.success || !userResult.data) {
      console.log('⚠️ [AUTH-DAL] Supabase user exists but no profile found in users table:', supabaseUser.email)
      return null
    }

    const userProfile = userResult.data

    console.log('✅ [AUTH-DAL] Complete user profile loaded:', {
      email: userProfile.email,
      role: userProfile.role,
      id: userProfile.id
    })

    return {
      supabaseUser,
      profile: userProfile
    }
  } catch (error) {
    console.error('❌ [AUTH-DAL] Error loading user profile:', error)
    return null
  }
})

/**
 * ✅ UTILITAIRE: Déterminer dashboard selon le rôle
 */
export function getDashboardPath(_role: string): string {
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
    console.log('✅ [AUTH-DAL] Session invalidated successfully')
  } catch (error) {
    console.error('❌ [AUTH-DAL] Error invalidating session:', error)
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
