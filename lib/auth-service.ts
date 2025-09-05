import { supabase } from './supabase'
import { userService, teamService } from './database-service'
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
  phone?: string
}

export interface CompleteProfileData {
  firstName: string
  lastName: string
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

class AuthService {
  // Vérifier si on est sur la page signup-success (protection contre cleanup)
  private isOnSignupSuccessPage(): boolean {
    if (typeof window === 'undefined') return false
    
    const pathname = window.location.pathname
    const isSignupSuccess = pathname === '/auth/signup-success'
    
    if (isSignupSuccess) {
      console.log('🛡️ [AUTH-PROTECTION] Detected signup-success page - preventing session cleanup')
    }
    
    return isSignupSuccess
  }
  // Inscription - Crée auth user + profil + équipe immédiatement
  async signUp({ email, password, name, phone }: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log('🚀 Starting complete signup for:', email, 'as gestionnaire')
      
      // Temporairement désactiver les listeners d'auth state pour éviter les conflits
      console.log('🔧 Temporarily disabling auth state listeners during signup')
      const isSignupInProgress = true

      // Créer l'utilisateur dans Supabase Auth sans confirmation email  
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Pas de redirection email
          data: {
            signup_in_progress: true // Flag pour identifier le processus en cours
          }
        }
      })

      if (authError) {
        console.error('❌ Auth signup error:', authError)
        return { user: null, error: authError }
      }

      if (!authData.user) {
        return { user: null, error: { message: 'Erreur lors de la création du compte auth', name: 'SignUpError', status: 400 } as AuthError }
      }

      console.log('✅ Auth user created:', authData.user.id)

      // Créer immédiatement le profil utilisateur AVANT que les listeners se déclenchent
      const userData = {
        id: authData.user.id,
        email: authData.user.email!,
        name: name,
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone || null,
      }

      const userProfile = await userService.create(userData)
      console.log('✅ User profile created successfully')

      // Créer l'équipe personnelle pour le gestionnaire
      const teamName = `Équipe de ${name}`
      console.log('🏗️ Creating team with data:', {
        name: teamName,
        description: `Équipe personnelle de ${name}`,
        created_by: authData.user.id
      })
      
      const team = await teamService.create({
        name: teamName,
        description: `Équipe personnelle de ${name}`,
        created_by: authData.user.id
      })
      console.log('✅ Personal team created:', team.id)
      
      // Vérifier immédiatement que l'utilisateur peut accéder à ses équipes
      console.log('🔍 Verifying user can access team after creation...')
      try {
        const userTeams = await teamService.getUserTeams(authData.user.id)
        console.log('✅ User teams verification successful:', userTeams.length, 'teams found')
        console.log('📋 Teams details:', userTeams.map((t: any) => ({ id: t.id, name: t.name })))
      } catch (verifyError) {
        console.error('❌ Failed to verify user teams after creation:', verifyError)
      }

      // Mettre à jour les métadonnées pour indiquer que tout est prêt
      try {
        await supabase.auth.updateUser({
          data: { 
            signup_in_progress: false,
            profile_completed: true
          }
        })
        console.log('✅ Auth metadata updated - signup process complete')
      } catch (updateError) {
        console.warn('⚠️ Could not update auth metadata:', updateError)
      }

      // Créer l'AuthUser à retourner
      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      console.log('🎉 Complete signup successful for:', authUser.name)
      return { user: authUser, error: null }
    } catch (error) {
      console.error('❌ Signup exception:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Compléter le profil après confirmation email
  async completeProfile({ firstName, lastName, phone }: CompleteProfileData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log('🚀 Completing profile for authenticated user')
      
      // Récupérer l'utilisateur auth actuel
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        return { user: null, error: { message: 'Utilisateur non connecté', name: 'AuthError', status: 401 } as AuthError }
      }

      if (!authUser.email_confirmed_at) {
        return { user: null, error: { message: 'Email non confirmé', name: 'AuthError', status: 401 } as AuthError }
      }

      console.log('✅ Authenticated user found:', authUser.id)
      
      // Créer le profil utilisateur dans notre base
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const userData = {
        id: authUser.id,
        email: authUser.email!,
        name: fullName,
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone?.trim() || null,
      }

      const userProfile = await userService.create(userData)
      console.log('✅ User profile created successfully')

      // Créer l'équipe personnelle pour le gestionnaire
      const teamName = `Équipe de ${fullName}`
      const team = await teamService.create({
        name: teamName,
        description: `Équipe personnelle de ${fullName}`,
        created_by: authUser.id
      })
      console.log('✅ Personal team created:', team.id)

      // Marquer le profil comme complété
      try {
        await supabase.auth.updateUser({
          data: { profile_completed: true }
        })
      } catch (updateError) {
        console.warn('⚠️ Could not update user metadata:', updateError)
      }

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      console.log('🎉 Profile completed successfully for:', user.name)
      return { user, error: null }
    } catch (error) {
      console.error('❌ CompleteProfile error:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Connexion - Crée le profil utilisateur mais pas l'équipe
  async signIn({ email, password }: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log('🔐 Starting signIn for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Auth error:', error.message)
        return { user: null, error }
      }

      if (!data.user) {
        return { user: null, error: { message: 'Utilisateur non trouvé', name: 'SignInError', status: 401 } as AuthError }
      }

      console.log('✅ Auth successful for user:', data.user.id)

      // Vérifier si le profil utilisateur existe
      let userProfile
      
      try {
        userProfile = await userService.getById(data.user.id)
        console.log('✅ User profile found')
      } catch (profileError) {
        console.log('📝 Creating user profile from metadata...')
        
        // Créer le profil à partir des métadonnées d'inscription
        const metadata = data.user.user_metadata
        
        if (metadata && metadata.name && metadata.role) {
          const userData = {
            id: data.user.id,
            email: data.user.email!,
            name: metadata.name,
            role: metadata.role,
            phone: metadata.phone || null,
          }

          userProfile = await userService.create(userData)
          console.log('✅ Profile created successfully')

          // Marquer le profil comme créé
          try {
            await supabase.auth.updateUser({
              data: { ...metadata, profile_created: true }
            })
          } catch (updateError) {
            console.warn('⚠️ Could not update user metadata:', updateError)
          }
        } else {
          throw new Error('Cannot create profile - missing signup metadata')
        }
      }

      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      console.log('🎉 Login successful for:', authUser.name, '(' + authUser.role + ')')
      return { user: authUser, error: null }
    } catch (error) {
      console.error('❌ SignIn error:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Déconnexion
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Récupérer seulement la session auth (sans profil utilisateur)
  async getCurrentAuthSession(): Promise<{ authUser: any | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error || !authUser) {
        return { authUser: null, error: null }
      }

      // Si pas confirmé, pas d'accès
      if (!authUser.email_confirmed_at) {
        return { authUser: null, error: null }
      }

      return { authUser, error: null }
    } catch (error) {
      return { authUser: null, error: null }
    }
  }

  // Récupérer l'utilisateur actuel
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error || !authUser) {
        return { user: null, error: null }
      }

      // Si pas confirmé, pas d'accès
      if (!authUser.email_confirmed_at) {
        return { user: null, error: null }
      }

      // Récupérer le profil utilisateur
      try {
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
      } catch (profileError) {
        console.error('❌ Error fetching user profile in getCurrentUser:', {
          authUserId: authUser.id,
          authEmail: authUser.email,
          error: profileError instanceof Error ? {
            name: profileError.name,
            message: profileError.message,
            stack: profileError.stack
          } : String(profileError),
          errorKeys: profileError ? Object.keys(profileError) : []
        })
        // CORRECTION : Être plus prudent avec le nettoyage des sessions
        // Ne pas nettoyer immédiatement - peut être un problème temporaire
        console.log('⚠️ [AUTH-PROTECTION] Profile not found for auth user - this might be temporary')
        
        // Vérifier si on est sur la page signup-success - ne pas nettoyer les sessions ici
        if (this.isOnSignupSuccessPage()) {
          console.log('📍 [AUTH-PROTECTION] On signup-success page - skipping session cleanup')
        } else {
          console.log('🔄 [AUTH-PROTECTION] Profile fetch failed - keeping session for stability (will retry on auth state change)')
        }
        
        // Profil non trouvé
        return { user: null, error: null }
      }
    } catch (error) {
      return { user: null, error: null }
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
      console.log('🔄 Auth state change:', event)
      
      // Si pas de session ou utilisateur pas confirmé → callback null
      if (!session?.user || !session.user.email_confirmed_at) {
        callback(null)
        return
      }

      // Pour tous les événements avec session valide, essayer de récupérer le profil
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          console.log('🔍 Fetching user profile for auth user:', session.user.id)
          const userProfile = await userService.getById(session.user.id)
          
          const user: AuthUser = {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone || undefined,
            created_at: userProfile.created_at || undefined,
            updated_at: userProfile.updated_at || undefined,
          }
          
          console.log('✅ Auth state updated for:', user.name)
          callback(user)
        } catch (error) {
          console.error('❌ Error fetching user profile in auth state change:', {
            authUserId: session.user.id,
            authEmail: session.user.email,
            event: event,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : String(error),
            errorKeys: error ? Object.keys(error) : []
          })
          console.log('⚠️ Profile not found for auth user:', session.user.id)
          
          // Vérifier si un signup est en cours via les métadonnées
          const isSignupInProgress = session.user.user_metadata?.signup_in_progress === true
          
          if (isSignupInProgress) {
            console.log('🔧 Signup in progress for user - waiting for profile creation')
            callback(null)
            return
          }
          
          // CORRECTION : Être plus prudent avec le nettoyage des sessions
          // Ne pas nettoyer la session si on est sur signup-success
          if (this.isOnSignupSuccessPage()) {
            console.log('📍 [AUTH-PROTECTION] On signup-success page - skipping session cleanup in onAuthStateChange')
            callback(null)
            return
          }
          
          console.log('⚠️ [AUTH-PROTECTION] Profile not found in auth state change - keeping session for stability')
          console.log('🔄 [AUTH-PROTECTION] This could be a temporary network/database issue')
          
          // Ne pas faire signOut automatiquement - cela cause des boucles de redirection
          // L'utilisateur pourra se déconnecter manuellement si nécessaire
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
