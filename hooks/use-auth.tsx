'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService, type AuthUser } from '@/lib/auth-service'
import { decideRedirectionStrategy, logRoutingDecision } from '@/lib/auth-router'
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
    console.log('🚀 [AUTH-PROVIDER-REFACTORED] Initializing simple auth system...')

    // ✅ Récupération initiale de l'utilisateur
    getCurrentUser()

    // ✅ Écouter les changements d'état - version simplifiée
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      console.log('🔄 [AUTH-PROVIDER-REFACTORED] Auth state changed:', user ? `${user.name} (${user.role})` : 'null')
      setUser(user)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ✅ REFACTORISÉ: Redirection centralisée avec gestion callback
  useEffect(() => {
    // Seulement si chargement terminé et pathname disponible
    if (loading || !pathname) return

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
        // ✅ Système de routage centralisé normal
        const decision = decideRedirectionStrategy(user, pathname, {
          isAuthStateChange: true,
          isLoginSubmit: false
        })

        logRoutingDecision(decision, user, {
          trigger: 'auth-provider-effect',
          pathname,
          loading
        })

        if (decision.strategy === 'immediate' && decision.targetPath) {
          console.log('🚀 [AUTH-PROVIDER-REFACTORED] Immediate redirect to:', decision.targetPath)
          router.push(decision.targetPath)
        } else {
          console.log('🔄 [AUTH-PROVIDER-REFACTORED] No action needed:', decision.reason)
        }
      }
    })
  }, [user, loading, pathname, router])

  const getCurrentUser = async () => {
    try {
      console.log('🔍 [AUTH-PROVIDER-REFACTORED] Getting current user...')

      // ✅ SIMPLIFIÉ: Appel direct sans timeouts ni retries
      const { user } = await authService.getCurrentUser()

      console.log('✅ [AUTH-PROVIDER-REFACTORED] User loaded:', user ? `${user.name} (${user.role})` : 'none')
      setUser(user)

    } catch (error) {
      console.error('❌ [AUTH-PROVIDER-REFACTORED] Error getting user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🚀 [AUTH-PROVIDER-REFACTORED] SignIn called for:', email)

    const result = await authService.signIn({ email, password })

    if (result.user) {
      console.log('✅ [AUTH-PROVIDER-REFACTORED] SignIn successful, updating state')
      setUser(result.user)

      // ✅ REFACTORISÉ: Système de routage centralisé pour login
      const decision = decideRedirectionStrategy(result.user, pathname || '/auth/login', {
        isLoginSubmit: true,
        isAuthStateChange: false
      })

      logRoutingDecision(decision, result.user, {
        trigger: 'login-submit',
        pathname
      })

      // ✅ STRATÉGIE CLAIRE: AuthProvider ne fait plus de redirections après login
      // Le système centralisé + pages gèrent automatiquement
      console.log('🔄 [AUTH-PROVIDER-REFACTORED] Login successful - letting auth system handle redirection')
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
