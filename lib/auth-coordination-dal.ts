/**
 * 🎯 PHASE 2.1: AUTH COORDINATION DAL
 *
 * Helpers de coordination spécifiques pour auth-dal
 * Extensions server-side des fonctions de coordination
 */

import {
  extractCoordinationSignals,
  shouldMiddlewareWaitForAuthProvider,
  type AuthCoordinationSignals
} from './auth-coordination'

/**
 * Helper pour middleware : vérifier si AuthProvider est en cours de chargement
 */
export async function isAuthProviderLoading(
  cookies: { get: (name: string) => { value: string } | undefined },
  pathname: string = '/'
): Promise<{ isLoading: boolean; shouldWait: boolean; reason: string }> {
  const signals = extractCoordinationSignals(cookies)
  const decision = shouldMiddlewareWaitForAuthProvider(signals, pathname)

  return {
    isLoading: signals.authProviderLoading,
    shouldWait: decision.shouldWait,
    reason: decision.reason
  }
}

/**
 * Helper pour vérifier l'état de coordination complet
 */
export function getCoordinationState(
  cookies: { get: (name: string) => { value: string } | undefined }
): AuthCoordinationSignals {
  return extractCoordinationSignals(cookies)
}

/**
 * Vérifier si on peut procéder à une vérification middleware sans conflit
 */
export async function canProceedWithMiddlewareCheck(
  cookies: { get: (name: string) => { value: string } | undefined },
  pathname: string
): Promise<{ canProceed: boolean; reason: string }> {
  const { shouldWait, reason } = await isAuthProviderLoading(cookies, pathname)

  if (shouldWait) {
    return {
      canProceed: false,
      reason
    }
  }

  return {
    canProceed: true,
    reason: 'No coordination conflict - safe to proceed'
  }
}
