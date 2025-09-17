import { supabase, withRetry } from './supabase'
import { userService, teamService } from './database-service'
import { analyzeSessionError, shouldCleanupSession } from './session-cleanup'
import type { AuthError, AuthResponse, User as SupabaseUser } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { activityLogger } from './activity-logger'

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: Database['public']['Enums']['user_role']
  phone?: string
  avatar_url?: string
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

      // Créer le profil utilisateur (NOUVELLE ARCHITECTURE)
      const userProfile = await userService.create({
        auth_user_id: authData.user.id, // ✅ LIEN vers auth.users.id
        email: authData.user.email!,
        name,
        first_name,
        last_name,
        role: 'gestionnaire' as Database['public']['Enums']['user_role'],
        provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
        phone: phone || null,
      })

      // Créer l'équipe personnelle (NOUVELLE ARCHITECTURE)
      const team = await teamService.create({
        name: `Équipe de ${name}`,
        description: `Équipe personnelle de ${name}`,
        created_by: userProfile.id // ✅ UTILISE l'ID généré de users, pas auth.users.id
      })

      // NOUVELLE ARCHITECTURE: L'utilisateur est déjà créé dans users avec auth_user_id
      // Plus besoin de créer un contact séparé - architecture unifiée
      console.log('✅ [AUTH-SERVICE] Architecture unifiée: utilisateur créé avec auth_user_id:', authData.user.id)

      // LOGS D'ACTIVITÉ: Enregistrer la création de l'équipe et du compte utilisateur
      try {
        // Configurer le contexte pour les logs
        activityLogger.setContext({
          teamId: team.id,
          userId: userProfile.id
        })

        // Log pour la création de l'équipe (premier log de l'équipe)
        await activityLogger.logTeamAction(
          'create',
          team.id,
          team.name,
          {
            created_by: userProfile.id,
            creator_name: name,
            description: team.description
          }
        )

        // Log pour la création du compte utilisateur  
        await activityLogger.logUserAction(
          'create',
          userProfile.id,
          name,
          {
            email: authData.user.email!,
            role: 'gestionnaire',
            phone: phone || null,
            first_login: true
          }
        )

        console.log('✅ [AUTH-SERVICE] Activity logs created for user and team creation')
      } catch (logError) {
        console.error('⚠️ [AUTH-SERVICE] Failed to create activity logs:', logError)
        // Non bloquant, on continue même si les logs échouent
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
        avatar_url: userProfile.avatar_url || undefined,
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
        provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
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
          role: 'manager',
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
        avatar_url: userProfile.avatar_url || undefined,
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

      // Vérifier si profil existe, sinon créer (NOUVELLE ARCHITECTURE)
      let userProfile
      try {
        // NOUVELLE ARCHITECTURE: Chercher par auth_user_id au lieu de id
        const { data: usersData, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single()
          
        if (findError && findError.code !== 'PGRST116') {
          throw findError
        }
          
        userProfile = usersData
      } catch (profileError) {
        // Créer profil depuis metadata (NOUVELLE ARCHITECTURE)
        const metadata = data.user.user_metadata
        if (metadata && metadata.full_name) {
          userProfile = await userService.create({
            auth_user_id: data.user.id, // ✅ NOUVELLE ARCHITECTURE
            email: data.user.email!,
            name: metadata.full_name,
            first_name: metadata.first_name || null,
            last_name: metadata.last_name || null,
            role: 'gestionnaire' as Database['public']['Enums']['user_role'],
            provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
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
        avatar_url: userProfile.avatar_url || undefined,
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

  // ✅ AMÉLIORATION: Récupérer l'utilisateur actuel avec retry automatique et cleanup
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null; requiresCleanup?: boolean }> {
    try {
      // ✅ NOUVEAU: Utiliser withRetry pour la récupération de l'utilisateur
      const result = await withRetry(async () => {
        console.log('🔍 [getCurrentUser-RETRY] Attempting to get current user...')
        
        const { data: { user: authUser }, error } = await supabase.auth.getUser()

        if (error) {
          console.log('❌ [getCurrentUser-RETRY] Auth error:', error.message)
          
          // ✅ NOUVEAU: Vérifier si l'erreur nécessite un nettoyage de session (avec contexte cookies)
          const errorType = analyzeSessionError(error.message, true)
          console.log('🔍 [getCurrentUser-RETRY] Error analysis:', {
            errorMessage: error.message,
            errorType,
            needsCleanup: errorType !== 'recoverable'
          })
          
          if (shouldCleanupSession(error.message, true)) {
            // Créer une erreur spéciale qui indique qu'un nettoyage est nécessaire
            const cleanupError = new Error(`Auth error: ${error.message}`)
            cleanupError.name = 'SessionCleanupRequired'
            throw cleanupError
          }
          
          throw new Error(`Auth error: ${error.message}`)
        }

        if (!authUser) {
          console.log('ℹ️ [getCurrentUser-RETRY] No auth user found')
          return { user: null, error: null }
        }

        // Si pas confirmé, pas d'accès
        if (!authUser.email_confirmed_at) {
          console.log('ℹ️ [getCurrentUser-RETRY] User email not confirmed')
          return { user: null, error: null }
        }

        // ✅ NOUVELLE ARCHITECTURE: Chercher le user profile via auth_user_id avec retry
        console.log('🔍 [getCurrentUser-RETRY] Looking up user profile for auth_user_id:', authUser.id)
        console.log('🔍 [getCurrentUser-RETRY] Auth user email:', authUser.email)
        console.log('🔍 [getCurrentUser-RETRY] Auth user confirmed:', authUser.email_confirmed_at)
        
        try {
          // Chercher l'utilisateur par auth_user_id avec timeout approprié
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single()
            
          console.log('🔍 [getCurrentUser-RETRY] Profile query result:', {
            userProfile: userProfile ? 'found' : 'not found',
            error: profileError ? profileError.message : 'none',
            authUserId: authUser.id
          })

          if (profileError && profileError.code !== 'PGRST116') {
            // Erreur autre que "not found" - retry
            throw new Error(`Profile query error: ${profileError.message}`)
          }
            
          if (userProfile) {
            const user: AuthUser = {
              id: userProfile.id, // ✅ ID de la table users, pas auth.users
              email: userProfile.email,
              name: userProfile.name,
              first_name: userProfile.first_name || undefined,
              last_name: userProfile.last_name || undefined,
              display_name: authUser.user_metadata?.display_name || userProfile.name,
              role: userProfile.role,
              phone: userProfile.phone || undefined,
              avatar_url: userProfile.avatar_url || undefined,
              created_at: userProfile.created_at || undefined,
              updated_at: userProfile.updated_at || undefined,
            }
            console.log('✅ [getCurrentUser-RETRY] User profile found:', {
              id: user.id,
              auth_user_id: authUser.id,
              email: user.email,
              name: user.name,
              linkStatus: 'LINKED'
            })
            return { user, error: null }
          } else {
            console.log('❌ [getCurrentUser-RETRY] No profile found for auth_user_id:', authUser.id)
          }
        } catch (profileError) {
          console.error('❌ [getCurrentUser-RETRY] Error looking up profile:', profileError)
          throw profileError // Re-throw pour déclencher retry
        }
        
        // FALLBACK: Utiliser JWT metadata si pas de profil trouvé
        if (authUser.email) {
          console.log('⚠️ [getCurrentUser-RETRY] No profile found, using JWT fallback')
          const user: AuthUser = {
            id: authUser.id, // Fallback vers auth.users.id
            email: authUser.email!,
            name: authUser.user_metadata?.full_name || 'Utilisateur',
            first_name: authUser.user_metadata?.first_name || undefined,
            last_name: authUser.user_metadata?.last_name || undefined,
            display_name: authUser.user_metadata?.display_name || undefined,
            role: 'gestionnaire',
            phone: undefined,
            avatar_url: undefined,
            created_at: undefined,
            updated_at: undefined,
          }
          return { user, error: null }
        }
        
        // Fallback si pas d'email
        return { user: null, error: null }
      })

      return result
    } catch (error) {
      console.error('❌ [getCurrentUser-RETRY] All retries failed:', error)
      
      // ✅ NOUVEAU: Indiquer si un nettoyage de session est nécessaire
      const requiresCleanup = error instanceof Error && error.name === 'SessionCleanupRequired'
      
      return { 
        user: null, 
        error: null,
        requiresCleanup 
      }
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

      // ✅ CORRIGER: Récupérer l'ID utilisateur dans la table users via auth_user_id
      const { data: dbUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      if (findError || !dbUser) {
        console.error('❌ [UPDATE-PROFILE] User not found in database:', findError)
        return { user: null, error: findError as AuthError || { message: 'Utilisateur non trouvé', name: 'UserNotFound', status: 404 } as AuthError }
      }

      console.log('✅ [UPDATE-PROFILE] Found user in database:', dbUser.id)
      console.log('🔄 [UPDATE-PROFILE] Updating with data:', {
        name: updates.name,
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone: updates.phone
      })

      // Mettre à jour le profil dans notre table avec le bon ID
      const updatedProfile = await userService.update(dbUser.id, {
        name: updates.name,
        first_name: updates.first_name,
        last_name: updates.last_name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
      })

      console.log('✅ [UPDATE-PROFILE] Profile updated successfully:', updatedProfile.id)

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
        avatar_url: updatedProfile.avatar_url || undefined,
        created_at: updatedProfile.created_at || undefined,
        updated_at: updatedProfile.updated_at || undefined,
      }

      return { user, error: null }
    } catch (error) {
      console.error('❌ [UPDATE-PROFILE] Unexpected error:', error)
      console.error('❌ [UPDATE-PROFILE] Error details:', JSON.stringify(error, null, 2))
      
      // Créer un message d'erreur plus explicite
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la mise à jour du profil'
      
      return { user: null, error: { 
        message: errorMessage,
        name: 'UpdateProfileError',
        status: 500
      } as AuthError }
    }
  }

  // Écouter les changements d'état d'authentification avec détection des sessions corrompues
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 [AUTH-STATE-CHANGE] Event received:', event, 'Session valid:', !!session?.user)
      
      if (!session?.user || !session.user.email_confirmed_at) {
        console.log('ℹ️ [AUTH-STATE-CHANGE] No valid session or unconfirmed email')
        callback(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          // ✅ NOUVELLE ARCHITECTURE: Chercher le user profile via auth_user_id
          console.log('🔍 [AUTH-SERVICE-NEW] Looking up user profile for auth_user_id:', session.user.id)
          
          try {
            // Chercher l'utilisateur par auth_user_id
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single()
            
            // ✅ NOUVEAU: Détecter les sessions corrompues (user supprimé de la DB)
            if (profileError && profileError.code === 'PGRST116') {
              console.log('🚨 [AUTH-STATE-CHANGE] User profile not found - account deleted or corrupted session')
              console.log('🔍 [AUTH-STATE-CHANGE] Profile error details:', {
                code: profileError.code,
                message: profileError.message,
                authUserId: session.user.id,
                email: session.user.email
              })
              
              // Session corrompue détectée - signaler pour nettoyage
              callback(null)
              
              // ✅ NOUVEAU: Déclencher un nettoyage automatique après un délai
              setTimeout(async () => {
                const { cleanupCorruptedSession, analyzeSessionError } = await import('./session-cleanup')
                console.log('🚨 [AUTH-STATE-CHANGE] Triggering automatic session cleanup for deleted user profile')
                
                await cleanupCorruptedSession({
                  redirectToLogin: true,
                  reason: 'User profile not found in database - account may have been deleted',
                  errorType: analyzeSessionError('User not found', false), // Ne pas vérifier les cookies pour ce cas spécifique
                  clearStorage: true
                })
              }, 1000)
              
              return
            } else if (profileError) {
              console.error('❌ [AUTH-STATE-CHANGE] Database error looking up profile:', profileError)
              callback(null)
              return
            }
            
            if (userProfile) {
              const user: AuthUser = {
                id: userProfile.id, // ✅ ID de la table users, pas auth.users
                email: userProfile.email,
                name: userProfile.name,
                first_name: userProfile.first_name || undefined,
                last_name: userProfile.last_name || undefined,
                display_name: session.user.user_metadata?.display_name || userProfile.name,
                role: userProfile.role,
                phone: userProfile.phone || undefined,
                created_at: userProfile.created_at || undefined,
                updated_at: userProfile.updated_at || undefined,
              }
              console.log('✅ [AUTH-SERVICE-NEW] User profile found:', {
                id: user.id,
                auth_user_id: session.user.id,
                email: user.email,
                name: user.name
              })
              
              // ✅ MARQUER L'INVITATION COMME ACCEPTÉE SI C'EST UNE PREMIÈRE CONNEXION
              if (event === 'SIGNED_IN' && session.user.user_metadata?.invited) {
                console.log('📧 [AUTH-SERVICE-NEW] User was invited, marking invitation as accepted...')
                console.log('🔍 [AUTH-SERVICE-DEBUG] Invitation marking details:', {
                  email: userProfile.email,
                  authUserId: session.user.id,
                  profileUserId: userProfile.id,
                  invitationCode: session.user.id
                })
                try {
                  await fetch('/api/mark-invitation-accepted', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      email: userProfile.email,
                      invitationCode: session.user.id // ✅ Correct: auth.users.id
                    })
                  })
                  console.log('✅ [AUTH-SERVICE-NEW] Invitation marked as accepted')
                } catch (inviteError) {
                  console.warn('⚠️ [AUTH-SERVICE-NEW] Failed to mark invitation as accepted:', inviteError)
                  // Ne pas faire échouer la connexion pour cette erreur
                }
              }
              
              callback(user)
              return
            }
          } catch (profileError) {
            console.warn('⚠️ [AUTH-SERVICE-NEW] Error looking up profile:', profileError)
          }
          
          // FALLBACK: Utiliser JWT metadata si pas de profil trouvé
          if (session.user.email) {
            console.log('⚠️ [AUTH-SERVICE-NEW] No profile found, using JWT fallback')
            const user: AuthUser = {
              id: session.user.id, // Fallback vers auth.users.id
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || 'Utilisateur',
              first_name: session.user.user_metadata?.first_name || undefined,
              last_name: session.user.user_metadata?.last_name || undefined,
              display_name: session.user.user_metadata?.display_name || undefined,
              role: 'gestionnaire',
              phone: undefined,
              created_at: undefined,
              updated_at: undefined,
            }
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
