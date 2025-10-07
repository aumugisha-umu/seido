'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService, type AuthUser } from '@/lib/auth-service'
import { createClient } from '@/utils/supabase/client'
import {
  createCoordinationCookies,
  clearCoordinationCookies,
  setCoordinationCookiesClient,
  getExponentialBackoffDelay,
  AUTH_RETRY_CONFIG,
  type AuthLoadingState
} from '@/lib/auth-coordination'
// Fonction simplifiée pour routing côté client (sans import DAL)
function getSimpleRedirectPath(userRole: string): string {
  const routes = {
    admin: '/admin',
    gestionnaire: '/gestionnaire/dashboard',
    prestataire: '/prestataire/dashboard',
    locataire: '/locataire/dashboard'
  }
  return routes[userRole as keyof typeof routes] || '/gestionnaire/dashboard'
}
import type { AuthError } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'
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
  getCurrentAuthSession: () => Promise<{ authUser: unknown | null; error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const isRedirectingRef = useRef(false) // Prevent infinite redirect loop
  const authStateRef = useRef<AuthLoadingState>('idle')

  // 🎯 PHASE 2.1: Helper pour mettre à jour l'état de coordination
  const updateCoordinationState = (state: AuthLoadingState) => {
    authStateRef.current = state
    const cookies = createCoordinationCookies(state, pathname || '/')
    setCoordinationCookiesClient(cookies)
  }

  useEffect(() => {
    logger.info('🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system with official patterns...')

    // 🎯 PHASE 2.1: Signaler que AuthProvider est en loading
    updateCoordinationState('loading')

    // ✅ PATTERN OFFICIEL SUPABASE: Utiliser onAuthStateChange pour tous les événements
    const supabase = createClient()

    // ✅ TIMEOUT DE SÉCURITÉ: Forcer loading = false après 3.5s max
    const loadingTimeout = setTimeout(() => {
      logger.warn('⚠️ [AUTH-PROVIDER] Loading timeout reached (3.5s) - forcing loading = false')
      updateCoordinationState('error')
      setLoading(false)
    }, AUTH_RETRY_CONFIG.TIMEOUT_MS)

    // ✅ OPTIMISATION: Check immédiat de session au mount (non-bloquant)
    const checkInitialSession = async () => {
      try {
        logger.info('🔍 [AUTH-PROVIDER] Checking initial session immediately...')
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          logger.info('✅ [AUTH-PROVIDER] Found existing session on mount, loading profile...')
          const { user } = await authService.getCurrentUser()
          setUser(user)
          setLoading(false)
          updateCoordinationState('loaded')
          clearTimeout(loadingTimeout)
          return true
        } else {
          logger.info('ℹ️ [AUTH-PROVIDER] No session found on mount, waiting for onAuthStateChange...')
        }
      } catch (error) {
        logger.error('❌ [AUTH-PROVIDER] Initial session check failed:', error)
      }
      return false
    }

    // Check immédiat (optimisation, mais pas bloquant)
    checkInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('🔄 [AUTH-STATE-CHANGE] Event:', event, 'Has session:', !!session)

      switch (event) {
        case 'INITIAL_SESSION':
          clearTimeout(loadingTimeout)
          if (session?.user) {
            logger.info('🔍 [AUTH-STATE-CHANGE] Initial session found, loading user profile...')
            try {
              const { user } = await authService.getCurrentUser()
              setUser(user)
              updateCoordinationState('loaded')
            } catch (error) {
              logger.error('❌ [AUTH-STATE-CHANGE] Error loading initial user:', error)
              setUser(null)
              updateCoordinationState('error')
            }
          } else {
            logger.info('🔍 [AUTH-STATE-CHANGE] No initial session')
            setUser(null)
            updateCoordinationState('loaded')
          }
          setLoading(false)
          break

        case 'SIGNED_IN':
          logger.info('✅ [AUTH-STATE-CHANGE] User signed in, loading profile...')
          try {
            const { user } = await authService.getCurrentUser()
            setUser(user)
            updateCoordinationState('loaded')
            logger.info('✅ [AUTH-STATE-CHANGE] Profile loaded:', user?.name)
          } catch (error) {
            logger.error('❌ [AUTH-STATE-CHANGE] Error loading signed-in user:', error)
            // 🎯 PHASE 2.1: Retry avec exponential backoff
            let retryCount = 0
            const retryWithBackoff = async () => {
              if (retryCount >= AUTH_RETRY_CONFIG.MAX_RETRIES) {
                logger.error('❌ [AUTH-STATE-CHANGE] Max retries reached, giving up')
                setUser(null)
                updateCoordinationState('error')
                return
              }

              const delay = getExponentialBackoffDelay(retryCount)
              logger.info(`🔄 [AUTH-STATE-CHANGE] Retry ${retryCount + 1}/${AUTH_RETRY_CONFIG.MAX_RETRIES} in ${delay}ms...`)

              setTimeout(async () => {
                try {
                  const { user } = await authService.getCurrentUser()
                  setUser(user)
                  updateCoordinationState('loaded')
                  logger.info('✅ [AUTH-STATE-CHANGE] Profile loaded on retry:', user?.name)
                } catch (retryError) {
                  logger.error(`❌ [AUTH-STATE-CHANGE] Retry ${retryCount + 1} failed:`, retryError)
                  retryCount++
                  retryWithBackoff()
                }
              }, delay)
            }

            retryWithBackoff()
          }
          break

        case 'SIGNED_OUT':
          logger.info('🚪 [AUTH-STATE-CHANGE] User signed out')
          setUser(null)
          updateCoordinationState('idle')
          // 🎯 PHASE 2.1: Nettoyer les cookies de coordination
          setCoordinationCookiesClient(clearCoordinationCookies())
          break

        case 'TOKEN_REFRESHED':
          logger.info('🔄 [AUTH-STATE-CHANGE] Token refreshed')
          break

        default:
          logger.info('🔍 [AUTH-STATE-CHANGE] Other event:', event)
      }
    })

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
      // 🎯 PHASE 2.1: Nettoyer les signaux au démontage
      setCoordinationCookiesClient(clearCoordinationCookies())
    }
  }, [])

  // ✅ REFACTORISÉ: Redirection centralisée avec gestion callback
  useEffect(() => {
    // Seulement si chargement terminé et pathname disponible
    if (loading || !pathname) return

    // ✅ NOUVEAU: Détecter redirection serveur et forcer refresh session
    if (pathname === '/auth/login' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('reason') === 'session_invalid') {
        logger.info('🔄 [AUTH-PROVIDER] Server-initiated redirect detected, forcing session refresh...')
        getCurrentUser()
        return
      }
    }

    // ✅ Système de routage simplifié côté client
    if (user && pathname.startsWith('/auth/') &&
            !pathname.includes('/callback') &&
            !pathname.includes('/reset-password') &&
            !pathname.includes('/set-password') &&
            !isRedirectingRef.current) {

          const redirectPath = getSimpleRedirectPath(user.role)
          logger.info('🚀 [AUTH-PROVIDER] User already authenticated, redirecting immediately to:', redirectPath)
          isRedirectingRef.current = true
          router.push(redirectPath)

          setTimeout(() => {
            isRedirectingRef.current = false
          }, 2000)
          return
        }
  }, [user, loading, pathname, router])

  // 🎯 PHASE 2.1: getCurrentUser avec exponential backoff
  const getCurrentUser = async (retryCount = 0) => {
    try {
      logger.info('🔍 [AUTH-PROVIDER-REFACTORED] Getting current user...', retryCount > 0 ? `(retry ${retryCount})` : '')

      const { user } = await authService.getCurrentUser()

      logger.info('✅ [AUTH-PROVIDER-REFACTORED] User loaded:', user ? `${user.name} (${user.role})` : 'none')
      setUser(user)
      updateCoordinationState('loaded')

    } catch (error) {
      logger.error('❌ [AUTH-PROVIDER-REFACTORED] Error getting user:', error)

      // 🎯 PHASE 2.1: Retry avec exponential backoff
      if (retryCount < AUTH_RETRY_CONFIG.MAX_RETRIES &&
          error.message?.includes('session missing') &&
          window.location.pathname.startsWith('/auth/')) {

        const delay = getExponentialBackoffDelay(retryCount)
        logger.info(`🔄 [AUTH-PROVIDER-REFACTORED] Session may be syncing, retrying in ${delay}ms...`)

        setTimeout(() => getCurrentUser(retryCount + 1), delay)
        return
      }

      setUser(null)
      updateCoordinationState('error')
    } finally {
      if (retryCount === 0) {
        setLoading(false)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    logger.info('🚀 [AUTH-PROVIDER-REFACTORED] SignIn called for:', email)

    const result = await authService.signIn({ email, password })

    if (result.user) {
      logger.info('✅ [AUTH-PROVIDER-REFACTORED] SignIn successful, updating state')
      setUser(result.user)
      updateCoordinationState('loaded')

      logger.info('🔄 [AUTH-PROVIDER] Login successful - letting server routing handle redirection')
    }

    return result
  }

  const signUp = async (data: { email: string; password: string; name: string; phone?: string }) => {
    const result = await authService.signUp(data)
    if (result.user) {
      setUser(result.user)
      updateCoordinationState('loaded')
    }
    return result
  }

  const completeProfile = async (data: { firstName: string; lastName: string; phone?: string }) => {
    const result = await authService.completeProfile(data)
    if (result.user) {
      setUser(result.user)
      updateCoordinationState('loaded')
    }
    return result
  }

  const signOut = async () => {
    try {
      logger.info('🚪 [AUTH-PROVIDER-REFACTORED] Starting simple sign out...')

      await authService.signOut()

      setUser(null)
      updateCoordinationState('idle')
      setCoordinationCookiesClient(clearCoordinationCookies())
      logger.info('✅ [AUTH-PROVIDER-REFACTORED] Sign out completed')

    } catch (error) {
      logger.error('❌ [AUTH-PROVIDER-REFACTORED] Sign out error:', error)
      setUser(null)
      updateCoordinationState('error')
    }
  }

  const resetPassword = async (_email: string) => {
    return await authService.resetPassword(_email)
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

  const resendConfirmation = async (_email: string) => {
    return await authService.resendConfirmation(_email)
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
