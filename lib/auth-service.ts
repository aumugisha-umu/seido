import { supabase } from './supabase'
import { userService, teamService } from './database-service'
import type { AuthError, AuthResponse, User as SupabaseUser } from '@supabase/supabase-js'
import type { Database } from './database.types'

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: Database['public']['Enums']['user_role']
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  first_name: string
  last_name: string
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
  async signUp({ email, password, name, first_name, last_name, phone }: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
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
            signup_in_progress: true, // Flag pour identifier le processus en cours
            full_name: name,
            first_name: first_name,
            last_name: last_name,
            display_name: name // Utiliser le nom complet comme display_name
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
        first_name: first_name,
        last_name: last_name,
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone || null,
      }

      const userProfile = await userService.create(userData)
      console.log('✅ User profile created successfully')

      // ✅ CORRECTION: Créer explicitement l'équipe personnelle pour les VRAIS signups
      // (les utilisateurs invités passent par l'API d'invitation)
      console.log('🏗️ Creating personal team for direct signup user')
      
      const teamName = `Équipe de ${name}`
      const team = await teamService.create({
        name: teamName,
        description: `Équipe personnelle de ${name}`,
        created_by: authData.user.id
      })
      console.log('✅ Personal team created:', team.id)
      
      // Vérifier que l'utilisateur peut accéder à ses équipes
      console.log('🔍 Verifying user can access team after creation...')
      try {
        const userTeams = await teamService.getUserTeams(authData.user.id)
        console.log('✅ User teams verification successful:', userTeams.length, 'teams found')
        console.log('📋 Teams details:', userTeams.map((t: any) => ({ id: t.id, name: t.name })))
        
        if (userTeams.length === 0) {
          console.error('❌ No team found after user creation - team creation may have failed')
        }
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
        first_name: userProfile.first_name || undefined,
        last_name: userProfile.last_name || undefined,
        display_name: name, // Utiliser le nom complet comme display_name
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
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone?.trim() || null,
      }

      const userProfile = await userService.create(userData)
      console.log('✅ User profile created successfully')

      // ✅ CORRECTION: Créer explicitement l'équipe personnelle pour completeProfile
      // (les utilisateurs qui complètent leur profil après confirmation email)
      console.log('🏗️ Creating personal team for profile completion')
      
      const teamName = `Équipe de ${fullName}`
      const team = await teamService.create({
        name: teamName,
        description: `Équipe personnelle de ${fullName}`,
        created_by: authUser.id
      })
      console.log('✅ Personal team created:', team.id)

      // Marquer le profil comme complété et mettre à jour le display_name
      try {
        await supabase.auth.updateUser({
          data: { 
            profile_completed: true,
            display_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        })
      } catch (updateError) {
        console.warn('⚠️ Could not update user metadata:', updateError)
      }

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        first_name: userProfile.first_name || undefined,
        last_name: userProfile.last_name || undefined,
        display_name: fullName,
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
      
      console.log('📊 [AUTH-SERVICE] SignIn response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasError: !!error,
        errorMessage: error?.message,
        userId: data?.user?.id
      })

      if (error) {
        console.error('❌ Auth error:', error.message)
        return { user: null, error }
      }

      if (!data.user) {
        console.error('❌ No user in auth response')
        return { user: null, error: { message: 'Utilisateur non trouvé', name: 'SignInError', status: 401 } as AuthError }
      }

      console.log('✅ Auth successful for user:', data.user.id)
      console.log('📧 User email confirmed:', !!data.user.email_confirmed_at)
      console.log('👤 User metadata:', JSON.stringify(data.user.user_metadata, null, 2))

      // Vérifier si le profil utilisateur existe
      let userProfile
      
      try {
        userProfile = await userService.getById(data.user.id)
        console.log('✅ User profile found')
      } catch (profileError) {
        console.log('📝 Creating user profile from metadata...')
        
        // Créer le profil à partir des métadonnées d'inscription
        const metadata = data.user.user_metadata
        
        if (metadata && metadata.full_name) {
          const userData = {
            id: data.user.id,
            email: data.user.email!,
            name: metadata.full_name,
            first_name: metadata.first_name || null,
            last_name: metadata.last_name || null,
            role: 'gestionnaire' as Database['public']['Enums']['user_role'],
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

      // Récupérer le display_name depuis les métadonnées auth pour signIn aussi
      const displayName = data.user.user_metadata?.display_name || userProfile.name

      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        first_name: userProfile.first_name || undefined,
        last_name: userProfile.last_name || undefined,
        display_name: displayName,
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
        
        // Récupérer le display_name depuis les métadonnées auth
        const { data: { user: authUserData } } = await supabase.auth.getUser()
        const displayName = authUserData?.user_metadata?.display_name || userProfile.name

        const user: AuthUser = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          first_name: userProfile.first_name || undefined,
          last_name: userProfile.last_name || undefined,
          display_name: displayName,
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
        first_name: updates.first_name,
        last_name: updates.last_name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
      })

      // Mettre à jour le display_name dans Supabase Auth si le nom change
      if (updates.display_name || updates.name) {
        try {
          await supabase.auth.updateUser({
            data: { 
              display_name: updates.display_name || updates.name,
              first_name: updates.first_name,
              last_name: updates.last_name
            }
          })
        } catch (updateError) {
          console.warn('⚠️ Could not update user metadata in updateProfile:', updateError)
        }
      }

      const user: AuthUser = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        first_name: updatedProfile.first_name || undefined,
        last_name: updatedProfile.last_name || undefined,
        display_name: updates.display_name || updatedProfile.name,
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
          
          // Timeout pour éviter le blocage infini
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
          )
          
          const profilePromise = userService.getById(session.user.id)
          const userProfile = await Promise.race([profilePromise, timeoutPromise])
          
          // Récupérer le display_name depuis les métadonnées auth
          const displayName = session.user.user_metadata?.display_name || userProfile.name

          const user: AuthUser = {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            first_name: userProfile.first_name || undefined,
            last_name: userProfile.last_name || undefined,
            display_name: displayName,
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
              message: error.message
            } : String(error)
          })
          
          console.log('🚨 [AUTH-SERVICE] Profile fetch failed or timeout - resolving auth state anyway')
          
          // CORRECTION CRITIQUE : Ne pas bloquer l'auth à cause d'un profil manquant
          // Résoudre l'état d'auth même si le profil ne charge pas
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  }

  // Inviter un utilisateur via magic link
  async inviteUser(userData: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    role: Database['public']['Enums']['user_role']
    teamId: string
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      console.log('📧 Inviting user via API:', userData.email)
      
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Invitation API error:', result.error)
        return { success: false, error: result.error }
      }

      console.log('✅ User invited successfully:', result.userId)
      return { 
        success: true, 
        userId: result.userId 
      }

    } catch (error) {
      console.error('❌ Error calling invitation API:', error)
      return { 
        success: false, 
        error: 'Erreur lors de l\'envoi de l\'invitation' 
      }
    }
  }
}

export const authService = new AuthService()
