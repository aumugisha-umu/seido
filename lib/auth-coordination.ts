/**
 * 🎯 PHASE 2.1: AUTH COORDINATION - Middleware ↔ AuthProvider
 *
 * Système de signaux pour éviter les race conditions entre :
 * - Middleware (vérifications serveur)
 * - AuthProvider (état client)
 *
 * Principe : Chaque système signale son état via cookies de courte durée
 * pour permettre la coordination sans API calls supplémentaires
 */

import { isInAuthTransition } from './auth-router'

export type AuthLoadingState = 'idle' | 'loading' | 'loaded' | 'error'

export interface AuthCoordinationSignals {
  authProviderLoading: boolean
  authProviderTimeout: boolean
  inAuthTransition: boolean
  middlewareCheckPassed: boolean
}

/**
 * Extraire les signaux de coordination depuis les cookies/headers
 */
export function extractCoordinationSignals(
  cookies: { get: (name: string) => { value: string } | undefined }
): AuthCoordinationSignals {
  return {
    authProviderLoading: cookies.get('auth-loading')?.value === 'true',
    authProviderTimeout: cookies.get('auth-timeout')?.value === 'true',
    inAuthTransition: cookies.get('auth-transition')?.value === 'true',
    middlewareCheckPassed: cookies.get('middleware-check')?.value === 'true',
  }
}

/**
 * Décider si le middleware doit attendre AuthProvider
 */
export function shouldMiddlewareWaitForAuthProvider(
  signals: AuthCoordinationSignals,
  pathname: string
): { shouldWait: boolean; reason: string } {
  // Si AuthProvider est en loading et pas encore timeout
  if (signals.authProviderLoading && !signals.authProviderTimeout) {
    return {
      shouldWait: true,
      reason: 'AuthProvider is loading - let it complete'
    }
  }

  // Si on est en transition auth (callback, signup-success)
  if (signals.inAuthTransition && isInAuthTransition(pathname)) {
    return {
      shouldWait: true,
      reason: 'In auth transition - let process complete'
    }
  }

  return {
    shouldWait: false,
    reason: 'No coordination needed - middleware can proceed'
  }
}

/**
 * Générer les cookies de coordination pour AuthProvider
 */
export function createCoordinationCookies(
  state: AuthLoadingState,
  pathname: string
): Array<{ name: string; value: string; maxAge: number }> {
  const cookies = []

  // Signal de loading
  if (state === 'loading') {
    cookies.push({
      name: 'auth-loading',
      value: 'true',
      maxAge: 5 // 5 secondes max
    })
  }

  // Signal de timeout
  if (state === 'error') {
    cookies.push({
      name: 'auth-timeout',
      value: 'true',
      maxAge: 5
    })
  }

  // Signal de transition
  if (isInAuthTransition(pathname)) {
    cookies.push({
      name: 'auth-transition',
      value: 'true',
      maxAge: 10 // 10 secondes pour les transitions
    })
  }

  return cookies
}

/**
 * Nettoyer les cookies de coordination
 */
export function clearCoordinationCookies(): Array<{ name: string; value: string; maxAge: number }> {
  return [
    { name: 'auth-loading', value: '', maxAge: 0 },
    { name: 'auth-timeout', value: '', maxAge: 0 },
    { name: 'auth-transition', value: '', maxAge: 0 },
    { name: 'middleware-check', value: '', maxAge: 0 },
  ]
}

/**
 * Helper pour définir les cookies de coordination côté client
 */
export function setCoordinationCookiesClient(cookies: Array<{ name: string; value: string; maxAge: number }>) {
  if (typeof document === 'undefined') return

  cookies.forEach(({ name, value, maxAge }) => {
    if (maxAge === 0) {
      // Supprimer le cookie
      document.cookie = `${name}=; path=/; max-age=0`
    } else {
      // Définir le cookie
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`
    }
  })
}

/**
 * Exponential backoff pour retry logic
 * Retourne le délai en ms pour le retry N
 */
export function getExponentialBackoffDelay(retryCount: number, baseDelay: number = 100): number {
  // Retry 0 : 100ms
  // Retry 1 : 200ms
  // Retry 2 : 400ms
  // Retry 3 : 800ms
  // Max : 3200ms (3.2s)
  return Math.min(baseDelay * Math.pow(2, retryCount), 3200)
}

/**
 * Constantes pour retry logic
 */
export const AUTH_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 100,
  TIMEOUT_MS: 3500,
} as const
