/**
 * 🔐 AUTH ROUTER - ROUTING INTELLIGENT PAR RÔLE (Bonnes Pratiques 2025)
 *
 * Système de routing sécurisé avec redirection automatique basée sur :
 * - Rôle utilisateur
 * - Permissions
 * - État de session
 * - Pages de destination appropriées
 * - Data Access Layer (DAL) integration
 */

import type { Database } from './database.types'
import type { AuthUser } from './auth-service'

// Import conditionnel pour éviter les erreurs côté client
let dalFunctions: any = null
if (typeof window === 'undefined') {
  // Côté serveur uniquement
  try {
    dalFunctions = require('./dal')
  } catch (error) {
    console.warn('DAL server functions not available')
  }
}

export type UserRole = Database['public']['Enums']['user_role']

// Configuration des routes par rôle (Bonnes Pratiques 2025)
export const ROLE_ROUTES = {
  admin: {
    dashboard: '/admin',
    default: '/admin',
    allowed: ['/admin', '/gestionnaire', '/prestataire', '/locataire'] // Admin peut tout voir
  },
  gestionnaire: {
    dashboard: '/gestionnaire',
    default: '/gestionnaire/dashboard',
    allowed: ['/gestionnaire']
  },
  prestataire: {
    dashboard: '/prestataire',
    default: '/prestataire/dashboard',
    allowed: ['/prestataire']
  },
  locataire: {
    dashboard: '/locataire',
    default: '/locataire/dashboard',
    allowed: ['/locataire']
  }
} as const

// Routes publiques (accessibles sans authentification)
export const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/signup-success',
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/callback',
  '/auth/unauthorized'
] as const

// Routes système (toujours accessibles)
export const SYSTEM_ROUTES = [
  '/api',
  '/debug',
  '/_next',
  '/favicon.ico'
] as const

export interface AuthRoutingConfig {
  bypassRedirections: boolean
  currentPath: string
  isAuthPage: boolean
  isCallbackPage: boolean
  isResetPasswordPage: boolean
}

/**
 * Détermine le dashboard approprié selon le rôle utilisateur (Compatible 2025)
 */
export const getDashboardPath = (userRole: string): string => {
  const roleConfig = ROLE_ROUTES[userRole as UserRole]
  return roleConfig?.default || '/gestionnaire/dashboard'
}

/**
 * Détermine si une redirection automatique est nécessaire et autorisée
 */
export const shouldRedirectAfterAuth = (
  user: AuthUser | null,
  config: AuthRoutingConfig
): { shouldRedirect: boolean; targetPath?: string; reason: string } => {
  
  // Pas d'utilisateur = pas de redirection
  if (!user) {
    return {
      shouldRedirect: false,
      reason: 'No authenticated user'
    }
  }
  
  // Bypass explicite des redirections (pour éviter les boucles)
  if (config.bypassRedirections) {
    return {
      shouldRedirect: false,
      reason: 'Redirections bypassed'
    }
  }
  
  // Pas de redirection sur les pages callback/reset (process en cours)
  if (config.isCallbackPage || config.isResetPasswordPage) {
    return {
      shouldRedirect: false,
      reason: 'Callback/reset page - process in progress'
    }
  }
  
  // Redirection uniquement si on est sur une page d'auth
  if (config.isAuthPage) {
    const targetPath = getDashboardPath(user.role)
    return {
      shouldRedirect: true,
      targetPath,
      reason: `User authenticated on auth page - redirect to ${user.role} dashboard`
    }
  }
  
  return {
    shouldRedirect: false,
    reason: 'User on protected page - no redirect needed'
  }
}

/**
 * Créer la configuration de routage depuis le pathname
 */
export const createAuthRoutingConfig = (pathname: string): AuthRoutingConfig => {
  // ✅ NOUVEAU: Exclure les pages de configuration du mot de passe des redirections auth
  const isAuthPage = pathname.startsWith('/auth/') &&
                     !pathname.includes('/auth/set-password') &&
                     !pathname.includes('/auth/update-password')
  const isCallbackPage = pathname.includes('/auth/callback')
  const isResetPasswordPage = pathname.includes('/auth/reset-password')

  return {
    bypassRedirections: false, // Par défaut, permettre les redirections
    currentPath: pathname,
    isAuthPage,
    isCallbackPage,
    isResetPasswordPage
  }
}

/**
 * Types pour les stratégies de redirection
 */
export type RedirectionStrategy = 'immediate' | 'middleware-only' | 'none'

export interface RedirectionDecision {
  strategy: RedirectionStrategy
  targetPath?: string
  reason: string
  delayMs?: number
}

/**
 * 🎯 FONCTION PRINCIPALE - Décider de la stratégie de redirection
 * 
 * Cette fonction centralise toute la logique de décision pour éviter
 * les conflits entre Auth Provider, middleware, et pages.
 */
export const decideRedirectionStrategy = (
  user: AuthUser | null,
  pathname: string,
  context: {
    isLoginSubmit?: boolean
    isAuthStateChange?: boolean  
    isMiddlewareEval?: boolean
  } = {}
): RedirectionDecision => {
  
  const config = createAuthRoutingConfig(pathname)
  const { shouldRedirect, targetPath, reason } = shouldRedirectAfterAuth(user, config)
  
  if (!shouldRedirect) {
    return {
      strategy: 'none',
      reason
    }
  }
  
  // 🎯 STRATÉGIE BASÉE SUR LE CONTEXTE
  
  if (context.isLoginSubmit) {
    // Après soumission login → Laisser le middleware gérer  
    // Évite la race condition avec Auth Provider
    return {
      strategy: 'middleware-only',
      targetPath,
      reason: 'Login submit - let middleware handle redirection',
      delayMs: 100 // Petit délai pour laisser les cookies se synchroniser
    }
  }
  
  if (context.isAuthStateChange && !context.isLoginSubmit) {
    // Auth state change sans login (ex: refresh page) → Redirection immédiate OK
    return {
      strategy: 'immediate',
      targetPath,
      reason: 'Auth state restored - safe to redirect immediately'
    }
  }
  
  if (context.isMiddlewareEval) {
    // Évaluation middleware → Redirection serveur
    return {
      strategy: 'immediate',
      targetPath, 
      reason: 'Middleware evaluation - server-side redirect'
    }
  }
  
  // Cas par défaut → Pas de redirection pour éviter les conflits
  return {
    strategy: 'none',
    reason: 'Default case - avoid potential conflicts'
  }
}

/**
 * Vérifier si on est dans un état de transition auth
 */
export const isInAuthTransition = (pathname: string): boolean => {
  return pathname.includes('/auth/callback') || 
         pathname.includes('/auth/signup-success') ||
         pathname.includes('/auth/reset-password')
}

/**
 * Logger pour debug des décisions de routage
 */
export const logRoutingDecision = (
  decision: RedirectionDecision,
  user: AuthUser | null,
  context: any
) => {
  console.log('🎯 [AUTH-ROUTER] Redirection decision:', {
    strategy: decision.strategy,
    targetPath: decision.targetPath,
    reason: decision.reason,
    user: user ? `${user.name} (${user.role})` : null,
    context
  })
}

// ✅ NOUVELLES FONCTIONS BONNES PRATIQUES 2025

/**
 * Vérifie si l'utilisateur peut accéder à une route donnée (DAL Integration - Server Only)
 */
export async function canAccessRoute(pathname: string): Promise<{ canAccess: boolean; redirectTo?: string; user?: any }> {
  try {
    // Routes publiques → toujours autorisées
    if (PUBLIC_ROUTES.some(route => pathname === route)) {
      return { canAccess: true }
    }

    // Routes système → toujours autorisées
    if (SYSTEM_ROUTES.some(route => pathname.startsWith(route))) {
      return { canAccess: true }
    }

    // Vérification côté serveur uniquement
    if (typeof window !== 'undefined' || !dalFunctions) {
      console.log('🚫 [AUTH-ROUTER] Client-side access check not supported')
      return { canAccess: false, redirectTo: '/auth/login' }
    }

    // Vérifier la session avec DAL (côté serveur)
    const { isValid, user } = await dalFunctions.verifySession()

    if (!isValid || !user) {
      console.log(`🚫 [AUTH-ROUTER] No valid session for ${pathname}`)
      return { canAccess: false, redirectTo: '/auth/login' }
    }

    // Vérifier les permissions pour la route
    const userRoleConfig = ROLE_ROUTES[user.role]
    if (!userRoleConfig) {
      console.log(`🚫 [AUTH-ROUTER] Unknown role ${user.role} for ${pathname}`)
      return { canAccess: false, redirectTo: '/auth/unauthorized' }
    }

    // Vérifier si l'utilisateur peut accéder à cette route
    const hasAccess = userRoleConfig.allowed.some(allowedRoute =>
      pathname.startsWith(allowedRoute)
    )

    if (!hasAccess) {
      console.log(`🚫 [AUTH-ROUTER] User ${user.role} cannot access ${pathname}`)
      const redirectTo = userRoleConfig.default
      return { canAccess: false, redirectTo, user }
    }

    console.log(`✅ [AUTH-ROUTER] User ${user.role} can access ${pathname}`)
    return { canAccess: true, user }
  } catch (error) {
    console.error('❌ [AUTH-ROUTER] Route access check failed:', error)
    return { canAccess: false, redirectTo: '/auth/login' }
  }
}

/**
 * Protection de route côté serveur - à utiliser dans les layouts
 */
export async function protectRoute(pathname: string): Promise<{ user: any }> {
  if (typeof window !== 'undefined') {
    throw new Error('protectRoute can only be used server-side')
  }

  const { canAccess, redirectTo, user } = await canAccessRoute(pathname)

  if (!canAccess && redirectTo && dalFunctions) {
    console.log(`🔄 [AUTH-ROUTER] Redirecting ${pathname} → ${redirectTo}`)
    dalFunctions.redirect(redirectTo)
  }

  return { user }
}

/**
 * Gestion des redirections post-authentification (Mise à jour 2025)
 */
export function getPostAuthRedirect(role: UserRole, intendedPath?: string): string {
  const roleConfig = ROLE_ROUTES[role]

  if (!roleConfig) {
    console.warn(`⚠️ [AUTH-ROUTER] Unknown role ${role}, using default`)
    return '/auth/login'
  }

  // Si l'utilisateur avait une destination prévue ET qu'il peut y accéder
  if (intendedPath && roleConfig.allowed.some(allowed => intendedPath.startsWith(allowed))) {
    console.log(`📍 [AUTH-ROUTER] Redirecting ${role} to intended path: ${intendedPath}`)
    return intendedPath
  }

  // Sinon, redirection vers dashboard par défaut
  console.log(`📍 [AUTH-ROUTER] Redirecting ${role} to default dashboard: ${roleConfig.default}`)
  return roleConfig.default
}

/**
 * Middleware helper pour vérification rapide (Optimisation 2025)
 */
export function shouldRedirectToLogin(pathname: string, hasAuthCookie: boolean): boolean {
  // Routes publiques → pas de redirection
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return false
  }

  // Routes système → pas de redirection
  if (SYSTEM_ROUTES.some(route => pathname.startsWith(route))) {
    return false
  }

  // Routes protégées sans cookie → redirection
  const isProtectedRoute = Object.values(ROLE_ROUTES)
    .some(config => config.allowed.some(allowed => pathname.startsWith(allowed)))

  return isProtectedRoute && !hasAuthCookie
}
