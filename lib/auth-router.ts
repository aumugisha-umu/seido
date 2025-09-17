/**
 * 🎯 AUTH ROUTER - POINT CENTRAL DE ROUTAGE D'AUTHENTIFICATION
 * 
 * Architecture SaaS robuste pour NextJS :
 * - Un seul point de vérité pour les redirections auth
 * - Coordination entre client/serveur
 * - Évite les race conditions et boucles
 */

import type { AuthUser } from './auth-service'

export interface AuthRoutingConfig {
  bypassRedirections: boolean
  currentPath: string
  isAuthPage: boolean
  isCallbackPage: boolean
  isResetPasswordPage: boolean
}

/**
 * Détermine le dashboard approprié selon le rôle utilisateur
 */
export const getDashboardPath = (userRole: string): string => {
  const roleMapping: Record<string, string> = {
    'gestionnaire': '/gestionnaire/dashboard',
    'locataire': '/locataire/dashboard', 
    'prestataire': '/prestataire/dashboard',
    'admin': '/admin/dashboard'
  }
  
  return roleMapping[userRole] || '/gestionnaire/dashboard'
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
  const isAuthPage = pathname.startsWith('/auth/')
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
