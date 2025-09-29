/**
 * 🛡️ USE AUTH READY - Hook utilitaire pour attendre l'état prêt de l'auth
 *
 * Objectifs :
 * - Simplifier l'attente d'initialisation auth dans les composants
 * - Éviter les rendus prématurés avec données auth incomplètes
 * - Fournir un état stable pour les tests automatisés
 */

import { useAuth } from './use-auth'

/**
 * Hook qui attend que l'authentification soit complètement initialisée
 *
 * @returns Object avec isReady, user, loading et des helpers
 */
export function useAuthReady() {
  const { user, loading, isReady } = useAuth()

  return {
    // États de base
    user,
    loading,
    isReady,

    // États dérivés utiles
    isAuthenticated: isReady && !!user,
    isUnauthenticated: isReady && !user,
    isInitializing: !isReady,

    // Helper pour conditionner le rendu
    whenReady: (component: React.ReactNode) => isReady ? component : null,

    // Helper pour les composants de loading
    withFallback: (component: React.ReactNode, fallback?: React.ReactNode) => {
      if (!isReady) {
        return fallback || null
      }
      return component
    }
  }
}

/**
 * Hook pour les tests - expose un flag global pour Puppeteer
 */
export function useAuthReadyForTests() {
  const { isReady, user } = useAuth()

  // ✅ Exposer un flag global pour les tests automatisés
  if (typeof window !== 'undefined') {
    (window as any).__AUTH_READY__ = isReady
    (window as any).__AUTH_USER__ = user
  }

  return { isReady, user }
}