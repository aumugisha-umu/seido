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
  // Inscription - Crée auth user + profil + équipe personnelle
  async signUp({ email, password, name, first_name, last_name, phone }: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      // Créer l'utilisateur auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            first_name,
            last_name,
            display_name: name
          }
        }
      })

      if (authError || !authData.user) {
        return { user: null, error: authError || { message: 'Erreur création compte', name: 'SignUpError', status: 400 } as AuthError }
      }

      // Créer le profil utilisateur
      const userProfile = await userService.create({
        id: authData.user.id,
        email: authData.user.email!,
        name,
        first_name,
        last_name,
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone || null,
      })

      // Créer l'équipe personnelle
      const team = await teamService.create({
        name: `Équipe de ${name}`,
        description: `Équipe personnelle de ${name}`,
        created_by: authData.user.id
      })

      // Créer automatiquement un contact pour ce gestionnaire
      try {
        const { contactService } = await import('./database-service')
        await contactService.create({
          name,
          email: authData.user.email!,
          contact_type: 'gestionnaire' as Database['public']['Enums']['contact_type'],
          team_id: team.id,
          is_active: true,
          notes: 'Contact créé automatiquement lors de l\'inscription'
        })
        console.log('✅ Contact gestionnaire créé lors de l\'inscription')
      } catch (contactError) {
        console.error('⚠️ Erreur lors de la création du contact gestionnaire:', contactError)
        // Ne pas faire échouer l'inscription pour cette erreur
      }

      // Retourner l'utilisateur auth
      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        first_name: userProfile.first_name || undefined,
        last_name: userProfile.last_name || undefined,
        display_name: name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      return { user: authUser, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Compléter le profil après confirmation email
  async completeProfile({ firstName, lastName, phone }: CompleteProfileData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser || !authUser.email_confirmed_at) {
        return { user: null, error: { message: 'Utilisateur non connecté ou email non confirmé', name: 'AuthError', status: 401 } as AuthError }
      }
      
      // Créer profil utilisateur
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const userProfile = await userService.create({
        id: authUser.id,
        email: authUser.email!,
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        phone: phone?.trim() || null,
      })

      // Créer équipe personnelle
      const teamName = `Équipe de ${fullName}`
      const team = await teamService.create({
        name: teamName,
        description: `Équipe personnelle de ${fullName}`,
        created_by: authUser.id
      })

      // Créer automatiquement un contact pour ce gestionnaire
      try {
        const { contactService } = await import('./database-service')
        await contactService.create({
          name: fullName,
          email: authUser.email!,
          contact_type: 'gestionnaire' as Database['public']['Enums']['contact_type'],
          team_id: team.id,
          is_active: true,
          notes: 'Contact créé automatiquement lors de la finalisation du profil'
        })
        console.log('✅ Contact gestionnaire créé lors de la finalisation du profil')
      } catch (contactError) {
        console.error('⚠️ Erreur lors de la création du contact gestionnaire:', contactError)
        // Ne pas faire échouer la finalisation pour cette erreur
      }

      // Mettre à jour metadata auth
      await supabase.auth.updateUser({
        data: { 
          profile_completed: true,
          display_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim()
        }
      })

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

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Connexion - Vérifie ou crée le profil utilisateur
  async signIn({ email, password }: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        return { user: null, error: error || { message: 'Utilisateur non trouvé', name: 'SignInError', status: 401 } as AuthError }
      }

      // Vérifier si profil existe, sinon créer
      let userProfile
      try {
        userProfile = await userService.getById(data.user.id)
      } catch (profileError) {
        // Créer profil depuis metadata
        const metadata = data.user.user_metadata
        if (metadata && metadata.full_name) {
          userProfile = await userService.create({
            id: data.user.id,
            email: data.user.email!,
            name: metadata.full_name,
            first_name: metadata.first_name || null,
            last_name: metadata.last_name || null,
            role: 'gestionnaire' as Database['public']['Enums']['user_role'],
            phone: metadata.phone || null,
          })
          
          await supabase.auth.updateUser({
            data: { ...metadata, profile_created: true }
          })
        } else {
          throw new Error('Cannot create profile - missing signup metadata')
        }
      }

      const authUser: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        first_name: userProfile.first_name || undefined,
        last_name: userProfile.last_name || undefined,
        display_name: data.user.user_metadata?.display_name || userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone || undefined,
        created_at: userProfile.created_at || undefined,
        updated_at: userProfile.updated_at || undefined,
      }

      return { user: authUser, error: null }
    } catch (error) {
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
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    
    if (error || !authUser || !authUser.email_confirmed_at) {
      return { authUser: null, error: null }
    }
    
    return { authUser, error: null }
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

      // ✅ SIMPLIFIÉ: Utiliser JWT metadata directement (comme onAuthStateChange)
      if (authUser.email) {
        const user: AuthUser = {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || 'Utilisateur',
          first_name: authUser.user_metadata?.first_name || undefined,
          last_name: authUser.user_metadata?.last_name || undefined,
          display_name: authUser.user_metadata?.display_name || undefined,
          role: (authUser.user_metadata?.role as Database['public']['Enums']['user_role']) || 'gestionnaire',
          phone: authUser.user_metadata?.phone || undefined,
          created_at: undefined,
          updated_at: undefined,
        }

        console.log('✅ [AUTH-SERVICE] getCurrentUser from JWT (no DB call):', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          source: 'JWT_METADATA_ONLY'
        })

        return { user, error: null }
      }
      
      // Fallback si pas d'email
      return { user: null, error: null }
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
      if (!session?.user || !session.user.email_confirmed_at) {
        callback(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          // ✅ TOUJOURS utiliser JWT metadata - évite les race conditions signup
          if (session.user.email) {
            const user: AuthUser = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || 'Utilisateur',
              first_name: session.user.user_metadata?.first_name || undefined,
              last_name: session.user.user_metadata?.last_name || undefined,
              display_name: session.user.user_metadata?.display_name || undefined,
              role: (session.user.user_metadata?.role as Database['public']['Enums']['user_role']) || 'gestionnaire',
              phone: undefined,
              created_at: undefined,
              updated_at: undefined,
            }
            console.log('✅ [AUTH-SERVICE] User created from JWT (race condition avoided):', {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              source: 'JWT_ONLY_NO_DB_CALL'
            })
            callback(user)
            return
          }
          
          // ❌ FALLBACK SUPPRIMÉ - Causait race condition signup
          console.log('⚠️ [AUTH-SERVICE] No email in session, using minimal fallback')
          const fallbackUser: AuthUser = {
            id: session.user.id,
            email: 'unknown@email.com',
            name: 'Utilisateur',
            role: 'gestionnaire' as Database['public']['Enums']['user_role'],
            phone: undefined,
            created_at: undefined,
            updated_at: undefined,
          }
          callback(fallbackUser)
        } catch (error) {
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
