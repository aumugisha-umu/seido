'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService, type AuthUser } from '@/lib/auth-service'
import { createClient } from '@/utils/supabase/client'
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

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signUp: (data: { email: string; password: string; name: string; phone?: string }) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  completeProfile: (data: { firstName: string; lastName: string; phone?: string }) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (_email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  refreshUser: () => Promise<void>
  resendConfirmation: (_email: string) => Promise<{ error: AuthError | null }>
  getCurrentAuthSession: () => Promise<{ authUser: unknown | null; error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system with official patterns...')

    // ✅ PATTERN OFFICIEL SUPABASE: Utiliser onAuthStateChange pour tous les événements
    const supabase = createClient()

    // ✅ TIMEOUT DE SÉCURITÉ: Forcer loading = false après 3.5s max
    // Délai ajusté à 3.5s (login-form attend 2.5s + marge 1s)
    // Permet de détecter les sessions même si onAuthStateChange est lent
    // Évite le blocage infini si onAuthStateChange ne se déclenche jamais
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ [AUTH-PROVIDER] Loading timeout reached (3.5s) - forcing loading = false')
      setLoading(false)
    }, 3500)

    // ✅ OPTIMISATION: Check immédiat de session au mount (non-bloquant)
    // Permet détection rapide mais ne doit PAS bloquer si pas de session
    const checkInitialSession = async () => {
      try {
        console.log('🔍 [AUTH-PROVIDER] Checking initial session immediately...')
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          console.log('✅ [AUTH-PROVIDER] Found existing session on mount, loading profile...')
          const { user } = await authService.getCurrentUser()
          setUser(user)
          setLoading(false)
          clearTimeout(loadingTimeout) // Annuler le timeout si succès
          return true
        } else {
          console.log('ℹ️ [AUTH-PROVIDER] No session found on mount, waiting for onAuthStateChange...')
        }
      } catch (error) {
        console.error('❌ [AUTH-PROVIDER] Initial session check failed:', error)
      }
      // Note: NE PAS mettre setLoading(false) ici car onAuthStateChange va le gérer
      return false
    }

    // Check immédiat (optimisation, mais pas bloquant)
    checkInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AUTH-STATE-CHANGE] Event:', event, 'Has session:', !!session)

      switch (event) {
        case 'INITIAL_SESSION':
          // Session initiale - récupérer le profil utilisateur si session exists
          clearTimeout(loadingTimeout) // Annuler le timeout de sécurité
          if (session?.user) {
            console.log('🔍 [AUTH-STATE-CHANGE] Initial session found, loading user profile...')
            try {
              const { user } = await authService.getCurrentUser()
              setUser(user)
            } catch (error) {
              console.error('❌ [AUTH-STATE-CHANGE] Error loading initial user:', error)
              setUser(null)
            }
          } else {
            console.log('🔍 [AUTH-STATE-CHANGE] No initial session')
            setUser(null)
          }
          setLoading(false)
          break

        case 'SIGNED_IN':
          // Utilisateur vient de se connecter - récupérer le profil
          console.log('✅ [AUTH-STATE-CHANGE] User signed in, loading profile...')
          try {
            const { user } = await authService.getCurrentUser()
            setUser(user)
            console.log('✅ [AUTH-STATE-CHANGE] Profile loaded:', user?.name)
          } catch (error) {
            console.error('❌ [AUTH-STATE-CHANGE] Error loading signed-in user:', error)
            // Retry une fois après un délai court
            setTimeout(async () => {
              try {
                const { user } = await authService.getCurrentUser()
                setUser(user)
                console.log('✅ [AUTH-STATE-CHANGE] Profile loaded on retry:', user?.name)
              } catch (retryError) {
                console.error('❌ [AUTH-STATE-CHANGE] Retry also failed:', retryError)
                setUser(null)
              }
            }, 500)
          }
          break

        case 'SIGNED_OUT':
          // Utilisateur déconnecté
          console.log('🚪 [AUTH-STATE-CHANGE] User signed out')
          setUser(null)
          break

        case 'TOKEN_REFRESHED':
          // Token rafraîchi - optionnellement recharger le profil
          console.log('🔄 [AUTH-STATE-CHANGE] Token refreshed')
          break

        default:
          console.log('🔍 [AUTH-STATE-CHANGE] Other event:', event)
      }
    })

    return () => {
      clearTimeout(loadingTimeout) // Cleanup du timeout de sécurité
      subscription.unsubscribe()
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
        console.log('🔄 [AUTH-PROVIDER] Server-initiated redirect detected, forcing session refresh...')
        // Forcer un refresh de la session côté client
        getCurrentUser()
        return
      }
    }

    // ✅ Détecter si on vient d'un callback invitation
    const handleInvitationCallback = async () => {
      if (user && pathname === '/auth/callback') {
        try {
          const callbackContext = sessionStorage.getItem('auth_callback_context')
          if (callbackContext) {
            const context = JSON.parse(callbackContext)
            if (context.type === 'invitation') {
              console.log('📧 [AUTH-PROVIDER-CALLBACK] Processing invitation callback for:', user.email)

              // ✅ CORRECTION: Extraire le vrai auth_user_id si JWT-only
              const authUserId = user.id.startsWith('jwt_')
                ? user.id.replace('jwt_', '')
                : user.id

              console.log('🔍 [AUTH-PROVIDER-CALLBACK] Using auth_user_id for invitation:', {
                originalId: user.id,
                extractedAuthUserId: authUserId,
                isJwtOnly: user.id.startsWith('jwt_')
              })

              // Traiter les invitations
              try {
                const response = await fetch('/api/mark-invitation-accepted', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: user.email,
                    invitationCode: authUserId
                  })
                })

                if (response.ok) {
                  const result = await response.json()
                  if (result.success && result.count > 0) {
                    console.log(`✅ [AUTH-PROVIDER-CALLBACK] ${result.count} invitation(s) marked as accepted`)
                  }
                }
              } catch (invitationError) {
                console.warn('⚠️ [AUTH-PROVIDER-CALLBACK] Invitation processing failed:', invitationError)
              }

              // Nettoyer le contexte
              sessionStorage.removeItem('auth_callback_context')

              // ✅ NOUVEAU: Vérifier si l'utilisateur doit définir son mot de passe (via base de données)
              // Pour les utilisateurs JWT-only, récupérer les vraies données depuis la DB
              let needsPasswordSetup = user.password_set === false

              if (user.id.startsWith('jwt_')) {
                try {
                  // Récupérer les vraies données utilisateur depuis la base de données
                  const response = await fetch('/api/get-user-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authUserId: authUserId })
                  })

                  if (response.ok) {
                    const profileData = await response.json()
                    if (profileData.success && profileData.user) {
                      needsPasswordSetup = profileData.user.password_set === false
                      console.log('🔍 [AUTH-PROVIDER-CALLBACK] Retrieved user profile from DB:', {
                        password_set: profileData.user.password_set,
                        needsPasswordSetup
                      })
                    }
                  }
                } catch (error) {
                  console.warn('⚠️ [AUTH-PROVIDER-CALLBACK] Failed to get user profile, using default check:', error)
                }
              }

              if (needsPasswordSetup) {
                console.log('🔐 [AUTH-PROVIDER-CALLBACK] User needs password setup (password_set: false), redirecting to password setup')
                router.push('/auth/set-password')
              } else {
                // Rediriger vers le dashboard approprié
                const dashboardPath = `/${user.role}/dashboard`
                console.log('🔄 [AUTH-PROVIDER-CALLBACK] User password already set, redirecting to dashboard:', dashboardPath)
                router.push(dashboardPath)
              }
              return true
            }
          }
        } catch (error) {
          console.warn('⚠️ [AUTH-PROVIDER-CALLBACK] Error processing callback context:', error)
        }
      }
      return false
    }

    // Traiter callback d'abord, sinon logique normale
    handleInvitationCallback().then(handled => {
      if (!handled) {
        // ✅ Système de routage simplifié côté client
        // ✅ CORRECTION: Rediriger immédiatement si déjà authentifié sur page auth
        if (user && pathname.startsWith('/auth/') &&
            !pathname.includes('/callback') &&
            !pathname.includes('/reset-password')) {

          const redirectPath = getSimpleRedirectPath(user.role)
          console.log('🚀 [AUTH-PROVIDER] User already authenticated, redirecting immediately to:', redirectPath)
          router.push(redirectPath)
          return
        }
      }
    })
  }, [user, loading, pathname, router])

  const getCurrentUser = async (retryCount = 0) => {
    try {
      console.log('🔍 [AUTH-PROVIDER-REFACTORED] Getting current user...', retryCount > 0 ? `(retry ${retryCount})` : '')

      // ✅ AMÉLIORATION: Retry logic pour détecter les sessions récentes
      const { user } = await authService.getCurrentUser()

      console.log('✅ [AUTH-PROVIDER-REFACTORED] User loaded:', user ? `${user.name} (${user.role})` : 'none')
      setUser(user)

    } catch (error) {
      console.error('❌ [AUTH-PROVIDER-REFACTORED] Error getting user:', error)

      // ✅ RETRY: Si erreur session missing et qu'on est sur une page auth, retry une fois
      if (retryCount === 0 && error.message?.includes('session missing') && window.location.pathname.startsWith('/auth/')) {
        console.log('🔄 [AUTH-PROVIDER-REFACTORED] Session may be syncing, retrying in 200ms...')
        setTimeout(() => getCurrentUser(1), 200)
        return
      }

      setUser(null)
    } finally {
      if (retryCount === 0) {
        setLoading(false)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🚀 [AUTH-PROVIDER-REFACTORED] SignIn called for:', email)

    const result = await authService.signIn({ email, password })

    if (result.user) {
      console.log('✅ [AUTH-PROVIDER-REFACTORED] SignIn successful, updating state')
      setUser(result.user)

      // ✅ Login successful - let server-side routing handle redirection
      console.log('🔄 [AUTH-PROVIDER] Login successful - letting server routing handle redirection')
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
      console.log('🚪 [AUTH-PROVIDER-REFACTORED] Starting simple sign out...')

      // ✅ REFACTORISÉ: SignOut simple via authService
      await authService.signOut()

      // ✅ Nettoyer l'état local
      setUser(null)
      console.log('✅ [AUTH-PROVIDER-REFACTORED] Sign out completed')

    } catch (error) {
      console.error('❌ [AUTH-PROVIDER-REFACTORED] Sign out error:', error)
      // Toujours nettoyer l'état local même en cas d'erreur
      setUser(null)
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
