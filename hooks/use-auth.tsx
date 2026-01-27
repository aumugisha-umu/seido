'use client'

import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react'
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
import { logger } from '@/lib/logger'
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
    // 🎯 PHASE 2.1: Signaler que AuthProvider est en loading
    updateCoordinationState('loading')

    // ✅ PATTERN OFFICIEL SUPABASE: Utiliser onAuthStateChange pour tous les événements
    const supabase = createClient()

    // ✅ TIMEOUT DE SÉCURITÉ: Forcer loading = false après 3.5s max
    const loadingTimeout = setTimeout(() => {
      updateCoordinationState('error')
      setLoading(false)
    }, AUTH_RETRY_CONFIG.TIMEOUT_MS)

    // ✅ OPTIMISATION: Check immédiat de session au mount (BLOQUANT pour peupler localStorage)
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { user } = await authService.getCurrentUser()
          setUser(user)
          setLoading(false)
          updateCoordinationState('loaded')
          clearTimeout(loadingTimeout)
          return true
        }
      } catch (error) {
        logger.error('❌ [AUTH-PROVIDER] Initial session check failed:', error)
      }
      return false
    }

    // 🎯 FIX CRITIQUE: Await checkInitialSession pour garantir localStorage peuplé
    const initializeAuth = async () => {
      await checkInitialSession()

      // 🎯 Maintenant, configurer les listeners APRÈS que la session soit initialisée
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        switch (event) {
          case 'INITIAL_SESSION':
            clearTimeout(loadingTimeout)
            if (session?.user) {
              try {
                const { user } = await authService.getCurrentUser()
                setUser(user)
                updateCoordinationState('loaded')
              } catch (error) {
                logger.error('❌ [AUTH-PROVIDER] Error loading initial user:', error)
                setUser(null)
                updateCoordinationState('error')
              }
            } else {
              setUser(null)
              updateCoordinationState('loaded')
            }
            setLoading(false)
            break

          case 'SIGNED_IN':
            try {
              const { user } = await authService.getCurrentUser()
              setUser(user)
              updateCoordinationState('loaded')
            } catch (error) {
              logger.error('❌ [AUTH-PROVIDER] Error loading signed-in user:', error)
              // 🎯 PHASE 2.1: Retry avec exponential backoff
              let retryCount = 0
              const retryWithBackoff = async () => {
                if (retryCount >= AUTH_RETRY_CONFIG.MAX_RETRIES) {
                  setUser(null)
                  updateCoordinationState('error')
                  return
                }

                const delay = getExponentialBackoffDelay(retryCount)

                setTimeout(async () => {
                  try {
                    const { user } = await authService.getCurrentUser()
                    setUser(user)
                    updateCoordinationState('loaded')
                  } catch (retryError) {
                    retryCount++
                    retryWithBackoff()
                  }
                }, delay)
              }

              retryWithBackoff()
            }
            break

          case 'SIGNED_OUT':
            setUser(null)
            updateCoordinationState('idle')
            setCoordinationCookiesClient(clearCoordinationCookies())
            break

          case 'TOKEN_REFRESHED':
            // Token refreshed - no action needed
            break

          default:
            // Other events - no action needed
        }
      })

      return subscription
    }

    // Bloquer jusqu'à ce que la session soit chargée, puis configurer les listeners
    let subscription: { unsubscribe: () => void } | undefined
    initializeAuth().then((sub) => {
      subscription = sub
    })

    return () => {
      clearTimeout(loadingTimeout)
      if (subscription?.unsubscribe) {
        subscription.unsubscribe()
      }
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
      const { user } = await authService.getCurrentUser()
      setUser(user)
      updateCoordinationState('loaded')

    } catch (error) {
      logger.error('❌ [AUTH-PROVIDER] Error getting user:', error)

      // 🎯 PHASE 2.1: Retry avec exponential backoff
      if (retryCount < AUTH_RETRY_CONFIG.MAX_RETRIES &&
          (error as Error).message?.includes('session missing') &&
          window.location.pathname.startsWith('/auth/')) {

        const delay = getExponentialBackoffDelay(retryCount)
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

  // ✅ OPTIMISATION: Mémoïser les fonctions avec useCallback pour éviter les re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn({ email, password })

    if (result.user) {
      setUser(result.user)
      updateCoordinationState('loaded')
    }

    return result
  }, [])

  const signUp = useCallback(async (data: { email: string; password: string; name: string; phone?: string }) => {
    const result = await authService.signUp(data)
    if (result.user) {
      setUser(result.user)
      updateCoordinationState('loaded')
    }
    return result
  }, [])

  const completeProfile = useCallback(async (data: { firstName: string; lastName: string; phone?: string }) => {
    const result = await authService.completeProfile(data)
    if (result.user) {
      setUser(result.user)
      updateCoordinationState('loaded')
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setUser(null)
      updateCoordinationState('idle')
      setCoordinationCookiesClient(clearCoordinationCookies())
    } catch (error) {
      logger.error('❌ [AUTH-PROVIDER] Sign out error:', error)
      setUser(null)
      updateCoordinationState('error')
    }
  }, [])

  const resetPassword = useCallback(async (_email: string) => {
    return await authService.resetPassword(_email)
  }, [])

  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    const result = await authService.updateProfile(updates)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }, [])

  const refreshUser = useCallback(async () => {
    // ✅ CRITIQUE: Forcer refresh de la session Supabase avant de charger le profil
    try {
      const supabase = createClient()
      await supabase.auth.getSession()
    } catch (error) {
      logger.error('❌ [AUTH-PROVIDER] Session refresh failed:', error)
    }

    // Maintenant charger le profil utilisateur
    await getCurrentUser()
  }, [])

  const resendConfirmation = useCallback(async (_email: string) => {
    return await authService.resendConfirmation(_email)
  }, [])

  const getCurrentAuthSession = useCallback(async () => {
    return await authService.getCurrentAuthSession()
  }, [])

  // ✅ OPTIMISATION: Mémoïser le value pour éviter les re-renders des consommateurs
  const value = useMemo(() => ({
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
  }), [user, loading, signIn, signUp, completeProfile, signOut, resetPassword, updateProfile, refreshUser, resendConfirmation, getCurrentAuthSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
