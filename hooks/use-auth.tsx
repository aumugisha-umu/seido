'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authService, type AuthUser } from '@/lib/auth-service'
import type { AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signUp: (data: { email: string; password: string; name: string; role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'; phone?: string }) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  refreshUser: () => Promise<void>
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const getCurrentUser = async () => {
    try {
      const { user } = await authService.getCurrentUser()
      setUser(user)
    } catch (error) {
      console.error('Error getting current user:', error)
      setUser(null)
    } finally {
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

  const signUp = async (data: { email: string; password: string; name: string; role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'; phone?: string }) => {
    const result = await authService.signUp(data)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }

  const signOut = async () => {
    await authService.signOut()
    setUser(null)
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshUser,
    resendConfirmation,
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
