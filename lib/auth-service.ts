import { supabase } from './supabase'
import { userService } from './database-service'
import type { AuthError, AuthResponse, User as SupabaseUser } from '@supabase/supabase-js'
import type { Database } from './database.types'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Database['public']['Enums']['user_role']
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  role: Database['public']['Enums']['user_role']
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

class AuthService {
  // Inscription
  async signUp({ email, password, name, role, phone }: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        return { user: null, error: authError }
      }

      if (!authData.user) {
        return { user: null, error: { message: 'Erreur lors de la création du compte', name: 'SignUpError', status: 400 } as AuthError }
      }

      // 2. Créer le profil utilisateur dans notre table users
      const userData = {
        id: authData.user.id,
        email,
        name,
        role,
        phone: phone || null,
      }

      console.log('🚀 About to create user profile with data:', userData)
      const userProfile = await userService.create(userData)
      console.log('✅ User profile created successfully:', userProfile)

      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      return { user: authUser, error: null }
    } catch (error) {
      console.error('Error in signUp:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return { user: null, error: error as AuthError }
    }
  }

  // Connexion
  async signIn({ email, password }: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log('🔐 Starting signIn for email:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Supabase auth error:', error)
        return { user: null, error }
      }

      if (!data.user) {
        console.error('❌ No user in auth response')
        return { user: null, error: { message: 'Utilisateur non trouvé', name: 'SignInError', status: 401 } as AuthError }
      }

      console.log('✅ Supabase auth successful, user ID:', data.user.id)
      console.log('📧 User email from auth:', data.user.email)

      // Récupérer le profil utilisateur depuis notre table
      console.log('🔍 Looking for user profile in public.users table...')
      const userProfile = await userService.getById(data.user.id)

      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      return { user: authUser, error: null }
    } catch (error) {
      console.error('Error in signIn:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return { user: null, error: error as AuthError }
    }
  }

  // Déconnexion
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Récupérer l'utilisateur actuel
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error) {
        return { user: null, error }
      }

      if (!authUser) {
        return { user: null, error: null }
      }

      // Récupérer le profil utilisateur depuis notre table
      const userProfile = await userService.getById(authUser.id)

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error getting current user:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return { user: null, error: error as AuthError }
    }
  }

  // Réinitialiser le mot de passe
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  // Renvoyer l'email de confirmation
  async resendConfirmation(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })
    return { error }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(updates: Partial<AuthUser>): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        return { user: null, error: authError }
      }

      // Mettre à jour le profil dans notre table
      const updatedProfile = await userService.update(authUser.id, {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
      })

      const user: AuthUser = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        phone: updatedProfile.phone || undefined,
        created_at: updatedProfile.created_at || undefined,
        updated_at: updatedProfile.updated_at || undefined,
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Écouter les changements d'état d'authentification
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, 'Session exists:', !!session?.user)
      
      if (session?.user) {
        try {
          console.log('Attempting to fetch profile for user:', session.user.id)
          const userProfile = await userService.getById(session.user.id)
          console.log('User profile fetched successfully:', userProfile)
          
          const user: AuthUser = {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone || undefined,
            created_at: userProfile.created_at || undefined,
            updated_at: userProfile.updated_at || undefined,
          }
          callback(user)
        } catch (error) {
          console.error('Error fetching user profile:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: (error as any)?.code,
            userId: session.user.id,
            userEmail: session.user.email
          })
          
          // Simplement retourner null sans nettoyage automatique
          callback(null)
        }
      } else {
        console.log('No session user, calling callback with null')
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
