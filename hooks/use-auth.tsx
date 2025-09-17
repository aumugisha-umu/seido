'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService, type AuthUser } from '@/lib/auth-service'
import { ENV_CONFIG, calculateTimeout } from '@/lib/environment'
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
    // Récupérer l'utilisateur actuel au chargement
    getCurrentUser()

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Redirection automatique après authentification
  useEffect(() => {
    // Ne rediriger que si : user chargé, pas en cours de chargement, et on est sur une page d'auth
    if (user && !loading && pathname?.startsWith('/auth')) {
      
      // ✅ PROTECTION RENFORCÉE : pas de redirection sur callback ou reset-password
      if (pathname.includes('/callback') || pathname.includes('/reset-password')) {
        console.log('🚫 [AUTH-PROVIDER] Redirection blocked - on callback/reset page:', pathname)
        return
      }
      
      // ✅ PROTECTION SUPPLÉMENTAIRE : vérifier l'URL actuelle aussi
      if (window.location.pathname.includes('/callback') || window.location.pathname.includes('/reset-password')) {
        console.log('🚫 [AUTH-PROVIDER] Redirection blocked - window location on callback/reset page:', window.location.pathname)
        return
      }
      
      console.log('🎯 [AUTH-PROVIDER] Auto-redirect detected:', {
        user: user.name,
        role: user.role,
        currentPath: pathname,
        windowLocation: window.location.pathname,
        redirectAllowed: true
      })
      
      // Déterminer le dashboard selon le rôle
      let targetDashboard = '/gestionnaire/dashboard' // default
      
      switch (user.role) {
        case 'gestionnaire':
          targetDashboard = '/gestionnaire/dashboard'
          break
        case 'locataire':
          targetDashboard = '/locataire/dashboard'
          break
        case 'prestataire':
          targetDashboard = '/prestataire/dashboard'
          break
        case 'admin':
          targetDashboard = '/admin/dashboard'
          break
        default:
          targetDashboard = '/gestionnaire/dashboard'
      }
      
      console.log('🚀 [AUTH-PROVIDER] Redirecting to:', targetDashboard)
      router.push(targetDashboard)
    }
  }, [user, loading, pathname, router])

  const getCurrentUser = async (retryCount = 0) => {
    try {
      console.log(`🔍 [USE-AUTH] Getting current user (attempt ${retryCount + 1})...`)
      
      // ✅ UTILISATION DE L'UTILITAIRE CENTRALISÉ
      const timeoutDuration = calculateTimeout(ENV_CONFIG.authTimeout, retryCount)
      
      console.log(`⏱️ [USE-AUTH] Environment: ${ENV_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}, timeout: ${timeoutDuration}ms`)
      
      // Timeout avec durée adaptative
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getCurrentUser timeout')), timeoutDuration)
      )
      
      const userPromise = authService.getCurrentUser()
      const { user } = await Promise.race([userPromise, timeoutPromise])
      
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
      
      // ✅ UTILISATION DE LA CONFIGURATION CENTRALISÉE
      const maxRetries = ENV_CONFIG.retry.maxAttempts - 1 // -1 car on compte depuis 0
      const retryDelay = retryCount < 1 ? 2000 : 3000 // 2s first retry, 3s subsequent
      
      // Retry si erreur et on est sur dashboard
      if (retryCount < maxRetries && window.location.pathname.includes('/dashboard')) {
        console.log(`🔄 [USE-AUTH] Error on dashboard (${retryCount + 1}/${maxRetries + 1}) - retrying in ${retryDelay}ms...`)
        setTimeout(() => getCurrentUser(retryCount + 1), retryDelay)
        return
      }
      
      console.log('🔄 [USE-AUTH] Max retries reached or not on dashboard - setting user to null')
      setUser(null)
    } finally {
      console.log('✅ [USE-AUTH] Setting loading to false')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn({ email, password })
    if (result.user) {
      setUser(result.user)
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
      console.log('🚪 [LOGOUT] Starting sign out process...')
      const { error } = await authService.signOut()
      
      if (error) {
        console.error('❌ [LOGOUT] Error during sign out:', error.message)
        // Continuer quand même pour nettoyer l'état local
      } else {
        console.log('✅ [LOGOUT] Sign out successful')
      }
      
      // Nettoyer l'état utilisateur local
      setUser(null)
      console.log('🧹 [LOGOUT] Local user state cleared')
      
    } catch (error) {
      console.error('❌ [LOGOUT] Exception during sign out:', error)
      // Nettoyer l'état local même en cas d'erreur
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
