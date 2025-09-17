'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService, type AuthUser } from '@/lib/auth-service'
import { ENV_CONFIG, calculateTimeout } from '@/lib/environment'
import { decideRedirectionStrategy, logRoutingDecision } from '@/lib/auth-router'
import { cleanupCorruptedSession, analyzeSessionError, logSessionState, initializeSessionDetection } from '@/lib/session-cleanup'
import type { AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signUp: (data: { email: string; password: string; name: string; phone?: string }) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  completeProfile: (data: { firstName: string; lastName: string; phone?: string }) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  refreshUser: () => Promise<void>
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>
  getCurrentAuthSession: () => Promise<{ authUser: any | null; error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ✅ NOUVEAU: Initialiser la détection automatique des sessions corrompues
    const initializeAuth = async () => {
      console.log('🚀 [AUTH-PROVIDER] Initializing authentication system...')
      
      try {
        // Détecter et nettoyer les sessions corrompues avant tout
        await initializeSessionDetection()
        
        // Ensuite récupérer l'utilisateur actuel
        getCurrentUser()
        
      } catch (initError) {
        console.error('❌ [AUTH-PROVIDER] Error during auth initialization:', initError)
        // Continuer quand même avec getCurrentUser en cas d'erreur d'initialisation
        getCurrentUser()
      }
    }

    // Démarrer l'initialisation
    initializeAuth()

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ✅ NOUVEAU : Redirection intelligente avec système centralisé
  useEffect(() => {
    // Ne traiter que si loading terminé et pathname disponible  
    if (loading || !pathname) return
    
    // Décider de la stratégie de redirection avec le système centralisé
    const decision = decideRedirectionStrategy(user, pathname, {
      isAuthStateChange: true,
      isLoginSubmit: false // Ce n'est pas une soumission de login
    })
    
    logRoutingDecision(decision, user, { trigger: 'auth-provider-effect', pathname })
    
    // Exécuter selon la stratégie
    if (decision.strategy === 'immediate' && decision.targetPath) {
      console.log('🚀 [AUTH-PROVIDER] Executing immediate redirection to:', decision.targetPath)
      router.push(decision.targetPath)
    } else if (decision.strategy === 'middleware-only') {
      console.log('🔄 [AUTH-PROVIDER] Deferring to middleware for redirection')
      // Le middleware s'en charge - ne rien faire ici
    } else {
      console.log('🚫 [AUTH-PROVIDER] No redirection needed:', decision.reason)
    }
  }, [user, loading, pathname, router])

  const getCurrentUser = async (retryCount = 0) => {
    try {
      console.log(`🔍 [USE-AUTH] Getting current user (attempt ${retryCount + 1})...`)
      
      // ✅ NOUVEAU: Logger l'état des cookies pour debug
      logSessionState()
      
      // ✅ UTILISATION DE L'UTILITAIRE CENTRALISÉ
      const timeoutDuration = calculateTimeout(ENV_CONFIG.authTimeout, retryCount)
      
      console.log(`⏱️ [USE-AUTH] Environment: ${ENV_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}, timeout: ${timeoutDuration}ms`)
      
      // Timeout avec durée adaptative
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getCurrentUser timeout')), timeoutDuration)
      )
      
      const userPromise = authService.getCurrentUser()
      const result = await Promise.race([userPromise, timeoutPromise])
      
      // ✅ NOUVEAU: Vérifier si un nettoyage de session est nécessaire
      if (result && result.requiresCleanup) {
        console.log('🚨 [USE-AUTH] Session cleanup required - corrupted session detected')
        
        const errorType = analyzeSessionError('Auth session missing!', true)
        
        // Double vérification : ne nettoyer que si vraiment nécessaire
        if (errorType !== 'recoverable') {
          await cleanupCorruptedSession({
            redirectToLogin: true,
            reason: 'Corrupted session detected during getCurrentUser',
            errorType,
            clearStorage: true
          })
          
          // Arrêter l'exécution ici car on redirige vers login
          return
        } else {
          console.log('ℹ️ [USE-AUTH] Session cleanup not needed after double check - continuing normally')
        }
      }
      
      const { user } = result
      
      console.log('✅ [USE-AUTH] Current user loaded:', user ? `${user.name} (${user.role})` : 'none')
      setUser(user)
      
      // Si pas d'user et on est sur dashboard après signup, essayer encore
      if (!user && retryCount < 2 && window.location.pathname.includes('/dashboard')) {
        console.log('🔄 [USE-AUTH] No user on dashboard - retrying in 1s...')
        setTimeout(() => getCurrentUser(retryCount + 1), 1000)
        return
      }
      
    } catch (error) {
      console.error('❌ [USE-AUTH] Error getting current user:', error)
      
      // ✅ NOUVEAU: Vérifier si l'erreur nécessite un nettoyage immédiat
      if (error instanceof Error && error.name === 'SessionCleanupRequired') {
        console.log('🚨 [USE-AUTH] Session cleanup required from error - checking if really needed')
        
        const errorType = analyzeSessionError(error.message, true)
        
        // Double vérification : ne nettoyer que si vraiment nécessaire
        if (errorType !== 'recoverable') {
          console.log('🚨 [USE-AUTH] Confirmed: session cleanup needed')
          await cleanupCorruptedSession({
            redirectToLogin: true,
            reason: 'Session cleanup required error caught',
            errorType,
            clearStorage: true
          })
          
          // Arrêter l'exécution ici car on redirige vers login
          return
        } else {
          console.log('ℹ️ [USE-AUTH] Session cleanup not needed after double check - treating as normal error')
        }
      }
      
      // ✅ UTILISATION DE LA CONFIGURATION CENTRALISÉE
      const maxRetries = ENV_CONFIG.retry.maxAttempts - 1 // -1 car on compte depuis 0
      const retryDelay = retryCount < 1 ? 2000 : 3000 // 2s first retry, 3s subsequent
      
      // Retry si erreur et on est sur dashboard
      if (retryCount < maxRetries && window.location.pathname.includes('/dashboard')) {
        console.log(`🔄 [USE-AUTH] Error on dashboard (${retryCount + 1}/${maxRetries + 1}) - retrying in ${retryDelay}ms...`)
        setTimeout(() => getCurrentUser(retryCount + 1), retryDelay)
        return
      }
      
      console.log('🚨 [USE-AUTH] Max retries reached - checking if session cleanup needed')
      
      // ✅ NOUVEAU: Si on a épuisé tous les retries, vérifier si on doit nettoyer la session
      const shouldCleanup = typeof error === 'object' && error !== null && 
                           'message' in error && 
                           typeof (error as any).message === 'string'
      
      if (shouldCleanup) {
        const errorType = analyzeSessionError((error as any).message, true)
        if (errorType !== 'recoverable') {
          console.log('🚨 [USE-AUTH] All retries failed with non-recoverable error - cleaning up session')
          
          await cleanupCorruptedSession({
            redirectToLogin: true,
            reason: 'Max retries reached with corrupted session',
            errorType,
            clearStorage: true
          })
          
          // Arrêter l'exécution ici car on redirige vers login
          return
        } else {
          console.log('ℹ️ [USE-AUTH] Error not requiring cleanup after cookie context check')
        }
      }
      
      console.log('🔄 [USE-AUTH] Setting user to null after max retries')
      setUser(null)
    } finally {
      console.log('✅ [USE-AUTH] Setting loading to false')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🚀 [AUTH-PROVIDER] signIn called - setting login context')
    
    const result = await authService.signIn({ email, password })
    if (result.user) {
      console.log('✅ [AUTH-PROVIDER] signIn successful, updating user state')
      setUser(result.user)
      
      // ✅ NOUVEAU : Décision de redirection après login submit
      const decision = decideRedirectionStrategy(result.user, pathname || '/auth/login', {
        isLoginSubmit: true,
        isAuthStateChange: false
      })
      
      logRoutingDecision(decision, result.user, { trigger: 'login-submit', pathname })
      
      // Stratégie middleware-only : on laisse le middleware + router.refresh() gérer
      if (decision.strategy === 'middleware-only') {
        console.log('🔄 [AUTH-PROVIDER] Login successful - deferring to middleware redirection')
        // La page login va faire router.refresh() et le middleware redirigera
      } else if (decision.strategy === 'immediate' && decision.targetPath) {
        console.log('🚀 [AUTH-PROVIDER] Login successful - immediate redirection to:', decision.targetPath)
        // Redirection immédiate (cas rare après login)
        setTimeout(() => router.push(decision.targetPath!), decision.delayMs || 0)
      }
    }
    
    return result
  }

  const signUp = async (data: { email: string; password: string; name: string; phone?: string }) => {
    const result = await authService.signUp(data)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }

  const completeProfile = async (data: { firstName: string; lastName: string; phone?: string }) => {
    const result = await authService.completeProfile(data)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }

  const signOut = async () => {
    try {
      console.log('🚪 [LOGOUT] Starting enhanced sign out process...')
      
      // ✅ NOUVEAU: Utiliser le système de nettoyage complet
      await cleanupCorruptedSession({
        redirectToLogin: false, // Pas de redirection automatique sur signOut volontaire
        reason: 'User initiated sign out',
        errorType: 'corrupted', // Peu importe le type pour un signOut volontaire
        clearStorage: true
      })
      
      // Nettoyer l'état utilisateur local
      setUser(null)
      console.log('✅ [LOGOUT] Complete sign out and cleanup finished')
      
    } catch (error) {
      console.error('❌ [LOGOUT] Exception during enhanced sign out:', error)
      
      // Fallback : nettoyage minimal si l'enhanced signOut échoue
      try {
        await authService.signOut()
      } catch (fallbackError) {
        console.error('❌ [LOGOUT] Fallback signOut also failed:', fallbackError)
      }
      
      // Toujours nettoyer l'état local
      setUser(null)
    }
  }

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email)
  }

  const updateProfile = async (updates: Partial<AuthUser>) => {
    const result = await authService.updateProfile(updates)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }

  const refreshUser = async () => {
    await getCurrentUser()
  }

  const resendConfirmation = async (email: string) => {
    return await authService.resendConfirmation(email)
  }

  const getCurrentAuthSession = async () => {
    return await authService.getCurrentAuthSession()
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    completeProfile,
    signOut,
    resetPassword,
    updateProfile,
    refreshUser,
    resendConfirmation,
    getCurrentAuthSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
