/**
 * ✅ UTILITAIRE CENTRALISÉ - DÉTECTION D'ENVIRONNEMENT
 * 
 * Permet de détecter de manière cohérente si on est en production/staging
 * ou en développement local, et d'adapter les timeouts et configurations.
 */

export interface EnvironmentConfig {
  isProduction: boolean
  isDevelopment: boolean
  authTimeout: number
  gracePeriod: {
    callback: number
    dashboard: number
  }
  retry: {
    maxAttempts: number
    baseDelay: number
    jitterRange: number
  }
  fetch: {
    timeout: number
  }
}

/**
 * Détecte si l'application s'exécute en environnement de production
 */
export const detectEnvironment = (): boolean => {
  if (typeof window === 'undefined') {
    // Côté serveur - utiliser NODE_ENV
    return process.env.NODE_ENV === 'production'
  }
  
  // Côté client - vérifier plusieurs indicateurs
  const hostname = window.location.hostname
  const isVercel = hostname.includes('vercel.app')
  const isSupabaseHosted = hostname.includes('supabase.co')
  const isNodeProduction = process.env.NODE_ENV === 'production'
  const isNotLocalhost = !hostname.includes('localhost') && !hostname.includes('127.0.0.1')
  
  return isNodeProduction || isVercel || isSupabaseHosted || isNotLocalhost
}

/**
 * Retourne la configuration adaptée à l'environnement actuel
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isProduction = detectEnvironment()
  
  console.log(`🌍 [ENV-CONFIG] Environment detected: ${isProduction ? 'PRODUCTION/STAGING' : 'DEVELOPMENT'}`)
  
  if (isProduction) {
    // Configuration pour production/staging
    return {
      isProduction: true,
      isDevelopment: false,
      authTimeout: 15000, // 15s
      gracePeriod: {
        callback: 5000,   // 5s pour callback
        dashboard: 4000   // 4s pour dashboard
      },
      retry: {
        maxAttempts: 5,   // Plus de retries
        baseDelay: 2000,  // 2s délai de base
        jitterRange: 2000 // 2s de jitter
      },
      fetch: {
        timeout: 20000    // 20s timeout fetch
      }
    }
  } else {
    // Configuration pour développement local
    return {
      isProduction: false,
      isDevelopment: true,
      authTimeout: 8000,  // 8s
      gracePeriod: {
        callback: 3000,   // 3s pour callback
        dashboard: 2000   // 2s pour dashboard
      },
      retry: {
        maxAttempts: 3,   // Moins de retries
        baseDelay: 1000,  // 1s délai de base
        jitterRange: 1000 // 1s de jitter
      },
      fetch: {
        timeout: 10000    // 10s timeout fetch
      }
    }
  }
}

/**
 * Instance globale de configuration
 */
export const ENV_CONFIG = getEnvironmentConfig()

/**
 * Helpers pour vérifications rapides
 */
export const isProduction = () => ENV_CONFIG.isProduction
export const isDevelopment = () => ENV_CONFIG.isDevelopment

/**
 * Calculer un timeout avec retry progressif
 */
export const calculateTimeout = (baseTimeout: number, retryCount: number = 0): number => {
  return baseTimeout + (retryCount * 5000) // +5s par retry
}

/**
 * Calculer un délai de retry avec backoff exponentiel et jitter
 */
export const calculateRetryDelay = (attempt: number, baseDelay: number = ENV_CONFIG.retry.baseDelay): number => {
  const backoff = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * ENV_CONFIG.retry.jitterRange
  return backoff + jitter
}

/**
 * Log d'environnement pour debug
 */
export const logEnvironmentInfo = () => {
  if (typeof window !== 'undefined') {
    console.log('🌍 [ENV-INFO] Environment Configuration:', {
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      isProduction: ENV_CONFIG.isProduction,
      authTimeout: ENV_CONFIG.authTimeout,
      gracePeriods: ENV_CONFIG.gracePeriod,
      retryConfig: ENV_CONFIG.retry,
      fetchTimeout: ENV_CONFIG.fetch.timeout
    })
  }
}
