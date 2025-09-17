/**
 * 🧹 SYSTÈME DE NETTOYAGE DES SESSIONS CORROMPUES
 * 
 * Gère les cas où les cookies sont présents mais la session est invalide :
 * - Compte supprimé de la DB
 * - Session expirée côté serveur  
 * - Tokens corrompus
 * - Désynchronisation client/serveur
 */

import { supabase } from './supabase'
import { logRoutingDecision } from './auth-router'

/**
 * Erreurs d'authentification non-récupérables
 * Ces erreurs indiquent que la session est corrompue et doit être nettoyée
 */
const IRRECOVERABLE_AUTH_ERRORS = [
  'Auth session missing!',
  'Invalid JWT', 
  'JWT expired',
  'refresh_token_not_found',
  'invalid_refresh_token',
  'User not found',
  'Invalid token',
  'Token has expired',
  'Invalid session',
  'Session not found'
] as const

/**
 * Types d'erreurs de session
 */
export type SessionErrorType = 'corrupted' | 'expired' | 'missing' | 'invalid' | 'recoverable'

/**
 * Vérifier si des cookies Supabase sont présents dans le navigateur
 */
export const hasSupabaseCookies = (): boolean => {
  if (typeof document === 'undefined') return false
  
  const cookies = document.cookie
  return cookies.includes('sb-') && 
    (cookies.includes('session') || cookies.includes('auth') || cookies.includes('token'))
}

/**
 * Analyser le type d'erreur de session avec contexte des cookies
 */
export const analyzeSessionError = (error: Error | string, checkCookies = true): SessionErrorType => {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  console.log('🔍 [SESSION-CLEANUP] Analyzing error:', errorMessage)
  
  // ✅ NOUVEAU: Vérifier le contexte des cookies
  if (checkCookies) {
    const cookiesPresent = hasSupabaseCookies()
    console.log('🔍 [SESSION-CLEANUP] Cookie context:', {
      errorMessage,
      cookiesPresent,
      shouldIgnoreIfNoCookies: errorMessage.includes('Auth session missing!')
    })
    
    // Si "Auth session missing!" et pas de cookies → c'est normal (utilisateur non connecté)
    if (errorMessage.includes('Auth session missing!') && !cookiesPresent) {
      console.log('ℹ️ [SESSION-CLEANUP] Auth session missing but no cookies present - this is normal for logged out users')
      return 'recoverable'
    }
  }
  
  // Vérifier si c'est une erreur non-récupérable
  const isIrrecoverable = IRRECOVERABLE_AUTH_ERRORS.some(pattern => 
    errorMessage.includes(pattern)
  )
  
  if (isIrrecoverable) {
    if (errorMessage.includes('expired') || errorMessage.includes('JWT expired')) {
      return 'expired'
    } else if (errorMessage.includes('missing') || errorMessage.includes('not_found')) {
      return 'missing'
    } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
      return 'invalid'
    } else {
      return 'corrupted'
    }
  }
  
  return 'recoverable'
}

/**
 * Nettoyer tous les cookies Supabase du navigateur
 */
export const clearSupabaseCookies = (): void => {
  console.log('🧹 [SESSION-CLEANUP] Starting Supabase cookies cleanup...')
  
  if (typeof document === 'undefined') {
    console.log('⚠️ [SESSION-CLEANUP] Running on server - cannot clear cookies')
    return
  }
  
  // Récupérer tous les cookies
  const cookies = document.cookie.split(';')
  
  let clearedCount = 0
  cookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim()
    
    // Identifier les cookies Supabase
    if (cookieName.startsWith('sb-') || 
        cookieName.includes('supabase') || 
        cookieName.includes('auth-token') ||
        cookieName.includes('refresh-token')) {
      
      console.log('🧹 [SESSION-CLEANUP] Clearing cookie:', cookieName)
      
      // Supprimer le cookie sur tous les domaines/paths possibles
      const pathsToTry = ['/', '/auth', '/gestionnaire', '/locataire', '/prestataire', '/admin']
      const domainsToTry = [window.location.hostname, `.${window.location.hostname}`]
      
      pathsToTry.forEach(path => {
        domainsToTry.forEach(domain => {
          try {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`
          } catch (e) {
            // Ignore errors for invalid domain/path combinations
          }
        })
      })
      
      clearedCount++
    }
  })
  
  console.log(`✅ [SESSION-CLEANUP] Cleared ${clearedCount} Supabase cookies`)
}

/**
 * ✅ VERSION SIMPLIFIÉE de forceSupabaseSignOut pour éviter les timeouts
 */
export const forceSupabaseSignOut = async (): Promise<void> => {
  console.log('🚪 [SESSION-CLEANUP-SIMPLE] Starting simple sign out...')
  
  try {
    // ✅ NOUVEAU: Timeout de 2 secondes max pour éviter les hangs
    const signOutPromise = (async () => {
      const { supabase } = await import('./supabase')
      return await supabase.auth.signOut()
    })()
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SignOut timeout')), 2000)
    )
    
    const result = await Promise.race([signOutPromise, timeoutPromise])
    console.log('✅ [SESSION-CLEANUP-SIMPLE] SignOut completed:', result)
    
  } catch (error) {
    console.log('⚠️ [SESSION-CLEANUP-SIMPLE] SignOut failed or timed out:', error)
    // Continuer quand même avec le nettoyage des cookies
  }
  
  // ✅ Toujours nettoyer les cookies, même si signOut échoue
  console.log('🧹 [SESSION-CLEANUP-SIMPLE] Cleaning cookies...')
  clearSupabaseCookies()
  
  // ✅ Nettoyer le storage rapidement
  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          sessionStorage.removeItem(key)
        }
      })
    }
    console.log('✅ [SESSION-CLEANUP-SIMPLE] Storage cleared')
  } catch (storageError) {
    console.log('⚠️ [SESSION-CLEANUP-SIMPLE] Storage error (ignored):', storageError)
  }
  
  console.log('✅ [SESSION-CLEANUP-SIMPLE] Force signOut completed')
}

/**
 * Interface pour les options de nettoyage
 */
export interface CleanupOptions {
  redirectToLogin: boolean
  reason: string
  errorType: SessionErrorType
  clearStorage: boolean
}

/**
 * ✅ FONCTION SIMPLIFIÉE pour test manuel
 * Appelle cette fonction dans la console pour tester le nettoyage
 */
export const manualSessionCleanup = async (): Promise<void> => {
  console.log('🧪 [MANUAL-CLEANUP] Starting manual session cleanup for testing...')
  
  try {
    // 1. Nettoyer Supabase
    console.log('1️⃣ [MANUAL-CLEANUP] Signing out from Supabase...')
    await forceSupabaseSignOut()
    
    // 2. Attendre un peu
    console.log('2️⃣ [MANUAL-CLEANUP] Waiting 500ms...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 3. Redirection simple
    console.log('3️⃣ [MANUAL-CLEANUP] Redirecting to login...')
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login?reason=manual_cleanup'
      console.log('✅ [MANUAL-CLEANUP] Redirect executed')
    } else {
      console.error('❌ [MANUAL-CLEANUP] No window object')
    }
    
  } catch (error) {
    console.error('❌ [MANUAL-CLEANUP] Error:', error)
  }
}

// ✅ RENDRE DISPONIBLE GLOBALEMENT pour test dans la console
if (typeof window !== 'undefined') {
  (window as any).testSessionCleanup = manualSessionCleanup
  console.log('🧪 [SESSION-CLEANUP] Test function available: window.testSessionCleanup()')
}

/**
 * Nettoyage complet et redirection vers login (VERSION COMPLEXE TEMPORAIREMENT COMMENTÉE)
 */
export const cleanupCorruptedSession = async (options: CleanupOptions): Promise<void> => {
  console.log('⚠️ [SESSION-CLEANUP] Complex cleanup temporarily disabled - use manualSessionCleanup() for testing')
  
  // Fallback vers la fonction simple
  await manualSessionCleanup()
  
  /* VERSION COMPLEXE TEMPORAIREMENT COMMENTÉE
  const { redirectToLogin, reason, errorType, clearStorage = true } = options
  
  console.log('🚨 [SESSION-CLEANUP] Starting complete session cleanup:', {
    reason,
    errorType,
    redirectToLogin,
    clearStorage
  })
  
  try {
    // Log pour tracking/debug
    logRoutingDecision(
      { 
        strategy: 'none', 
        reason: `session-cleanup-${errorType}`
      },
      null,
      {
        trigger: 'session-cleanup',
        reason,
        errorType,
        timestamp: new Date().toISOString()
      }
    )
    
    // Forcer la déconnexion complète
    if (clearStorage) {
      console.log('🧹 [SESSION-CLEANUP] Starting Supabase sign out...')
      await forceSupabaseSignOut()
      console.log('✅ [SESSION-CLEANUP] Supabase sign out completed')
    }
    
    // Attendre un peu pour que les cookies soient bien nettoyés
    console.log('⏳ [SESSION-CLEANUP] Waiting 100ms for cookie cleanup...')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // ✅ NOUVEAU: Debug détaillé pour la redirection
    console.log('🔍 [SESSION-CLEANUP] Checking redirection condition:', {
      redirectToLogin,
      redirectToLoginType: typeof redirectToLogin,
      windowExists: typeof window !== 'undefined'
    })
    
    // Rediriger vers login si demandé
    if (redirectToLogin) {
      console.log('🔄 [SESSION-CLEANUP] Redirecting to login after cleanup...')
      
      if (typeof window === 'undefined') {
        console.error('❌ [SESSION-CLEANUP] Cannot redirect - window is undefined (SSR context)')
        return
      }
      
      // Utiliser window.location pour forcer une navigation complète
      const loginUrl = '/auth/login?reason=session_cleanup'
      
      console.log('⏰ [SESSION-CLEANUP] Setting up redirect timer to:', loginUrl)
      
      setTimeout(() => {
        console.log('🚀 [SESSION-CLEANUP] Executing redirect now...')
        try {
          window.location.href = loginUrl
          console.log('✅ [SESSION-CLEANUP] Redirect command executed')
        } catch (redirectError) {
          console.error('❌ [SESSION-CLEANUP] Redirect failed:', redirectError)
        }
      }, 200)
      
      console.log('⏱️ [SESSION-CLEANUP] Redirect timer set (200ms delay)')
    } else {
      console.log('🚫 [SESSION-CLEANUP] No redirection requested (redirectToLogin is falsy)')
    }
    
  } catch (cleanupError) {
    console.error('❌ [SESSION-CLEANUP] Error during cleanup process:', cleanupError)
  }
  
  console.log('✅ [SESSION-CLEANUP] Complete session cleanup finished')
  */
}

/**
 * Vérifier si une erreur nécessite un nettoyage de session
 */
export const shouldCleanupSession = (error: Error | string, checkCookies = true): boolean => {
  const errorType = analyzeSessionError(error, checkCookies)
  return errorType !== 'recoverable'
}

/**
 * Helper pour logger les informations de session pour debug
 */
export const logSessionState = () => {
  if (typeof document === 'undefined') return
  
  const cookies = document.cookie
  const hasSupabaseCookies = cookies.includes('sb-')
  
  console.log('🔍 [SESSION-STATE] Current session state:', {
    hasCookies: cookies.length > 0,
    hasSupabaseCookies,
    cookieCount: cookies.split(';').filter(c => c.trim().startsWith('sb-')).length,
    timestamp: new Date().toISOString()
  })
}

/**
 * Détecter automatiquement les sessions potentiellement corrompues au chargement
 */
export const detectCorruptedSessionOnLoad = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  
  console.log('🔍 [SESSION-DETECTION] Starting corrupted session detection on page load...')
  
  // ✅ NOUVEAU: Ne pas faire de détection sur dashboard (false positives avec auth en cours)
  const currentPath = window.location.pathname
  const isOnDashboard = currentPath.includes('/dashboard')
  const isOnAuthPage = currentPath.startsWith('/auth')
  
  if (isOnDashboard) {
    console.log('ℹ️ [SESSION-DETECTION] Skipping detection on dashboard - auth may be in progress')
    return false
  }
  
  if (isOnAuthPage) {
    console.log('ℹ️ [SESSION-DETECTION] Skipping detection on auth pages - normal to have no session')
    return false
  }
  
  try {
    // Import dynamique pour éviter les problèmes de dépendances circulaires
    const { supabase } = await import('./supabase')
    
    // Vérifier si on a des cookies Supabase
    const cookies = document.cookie
    const hasSupabaseCookies = cookies.includes('sb-') && 
      (cookies.includes('session') || cookies.includes('auth') || cookies.includes('token'))
    
    if (!hasSupabaseCookies) {
      console.log('ℹ️ [SESSION-DETECTION] No Supabase cookies found - no session to check')
      return false
    }
    
    console.log('🔍 [SESSION-DETECTION] Supabase cookies detected, checking session validity...')
    
    // ✅ NOUVEAU: Timeout plus long pour éviter les faux positifs
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 8000) // 8s au lieu de 3s
    )
    
    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any
    
    if (error) {
      console.log('🚨 [SESSION-DETECTION] Session error detected:', error.message)
      const errorType = analyzeSessionError(error.message)
      
      if (errorType !== 'recoverable') {
        console.log('🚨 [SESSION-DETECTION] Non-recoverable session error - cleanup required')
        return true
      }
    }
    
    if (!session || !session.user) {
      console.log('🚨 [SESSION-DETECTION] Cookies present but no valid session - likely corrupted')
      return true
    }
    
    // Si on arrive ici, la session semble valide au niveau Supabase
    console.log('✅ [SESSION-DETECTION] Session appears valid at Supabase level')
    
    // Vérifier rapidement si l'utilisateur existe dans notre DB
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        console.log('🚨 [SESSION-DETECTION] User profile not found in database - account deleted')
        return true
      }
      
      if (!userProfile) {
        console.log('🚨 [SESSION-DETECTION] No user profile found - corrupted session')
        return true
      }
      
      console.log('✅ [SESSION-DETECTION] User profile exists - session valid')
      return false
      
    } catch (dbError) {
      console.warn('⚠️ [SESSION-DETECTION] Database check failed:', dbError)
      // En cas d'erreur DB, on ne considère pas forcément comme corrompu
      return false
    }
    
  } catch (detectionError) {
    console.error('❌ [SESSION-DETECTION] Error during detection:', detectionError)
    
    // Si c'est un timeout ou erreur de session, considérer comme potentiellement corrompu
    if (detectionError instanceof Error && 
       (detectionError.message.includes('timeout') || 
        detectionError.message.includes('session') || 
        detectionError.message.includes('Auth'))) {
      console.log('🚨 [SESSION-DETECTION] Detection error suggests corrupted session')
      return true
    }
    
    return false
  }
}

/**
 * Fonction d'initialisation à appeler au démarrage de l'app
 * ✅ TEMPORAIREMENT DÉSACTIVÉE pour debug
 */
export const initializeSessionDetection = async (): Promise<void> => {
  console.log('🔄 [SESSION-INIT] Session detection temporarily disabled for debugging')
  // Temporairement désactivé
  return
  
  /* 
  // Code original commenté temporairement
  console.log('🚀 [SESSION-INIT] Initializing session detection system...')
  
  const isCorrupted = await detectCorruptedSessionOnLoad()
  
  if (isCorrupted) {
    console.log('🚨 [SESSION-INIT] Corrupted session detected on load - triggering cleanup')
    
    await cleanupCorruptedSession({
      redirectToLogin: true,
      reason: 'Corrupted session detected during app initialization',
      errorType: 'corrupted',
      clearStorage: true
    })
  } else {
    console.log('✅ [SESSION-INIT] Session detection completed - no issues found')
  }
  */
}
