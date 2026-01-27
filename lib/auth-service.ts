import { createBrowserSupabaseClient } from './services/core/supabase-client'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './services/core/service-types'
import { logger } from '@/lib/logger'
import { activityLogger } from './activity-logger'
// ✅ TEMPORAIRE: Type pour user_role en attendant la synchronisation
type UserRole = 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'

// Types pour les services
interface UserServiceType {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

interface TeamServiceType {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

// ✅ IMPORTS des services nécessaires pour les méthodes legacy
let userService: UserServiceType | null = null
let teamService: TeamServiceType | null = null

// ✅ Initialisation lazy des services
const getUserService = async () => {
  if (!userService) {
    const { createServerUserService } = await import('./services')
    userService = await createServerUserService()
  }
  return userService
}

const getTeamService = async () => {
  if (!teamService) {
    // ✅ TEMPORAIRE: Utiliser le legacy service en attendant la migration
    const { createTeamService } = await import('./services')
    const legacyTeamService = createTeamService()
    teamService = legacyTeamService
  }
  return teamService
}

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: UserRole
  team_id?: string // ✅ Ajout du team_id manquant
  phone?: string
  avatar_url?: string
  password_set?: boolean // ✅ Ajout pour détecter l'onboarding des invitations
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
  // ✅ NOUVEAU: Méthode pour obtenir le client approprié selon le contexte
  private getSupabaseClient(): SupabaseClient<Database> {
    // Si nous sommes côté serveur, utiliser le client server
    if (typeof window === 'undefined') {
      throw new Error('❌ AuthService server-side operations should use server actions')
    }
    // Sinon, utiliser le client browser pour les composants client
    return createBrowserSupabaseClient()
  }
  // Inscription - Crée auth user + profil + équipe personnelle
  async signUp({ email, password, name, first_name, last_name, phone }: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      // Créer l'utilisateur auth
      const { data: authData, error: authError } = await this.getSupabaseClient().auth.signUp({
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
      const userSvc = await getUserService()
      const userProfile = await userSvc.create({
        auth_user_id: authData.user.id, // ✅ LIEN vers auth.users.id
        email: authData.user.email!,
        name,
        first_name,
        last_name,
        role: 'gestionnaire' as UserRole,
        provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
        phone: phone || null,
      })

      // Créer l'équipe personnelle (NOUVELLE ARCHITECTURE)
      const teamSvc = await getTeamService()
      const team = await teamSvc.create({
        name: `Équipe de ${name}`,
        description: `Équipe personnelle de ${name}`,
        created_by: userProfile.id // ✅ UTILISE l'ID généré de users, pas auth.users.id
      })

      // NOUVELLE ARCHITECTURE: L'utilisateur est déjà créé dans users avec auth_user_id
      // Plus besoin de créer un contact séparé - architecture unifiée

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

      } catch (logError) {
        logger.warn('⚠️ [AUTH-SERVICE] Failed to create activity logs:', logError)
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
      const { data: { user: authUser }, error: authError } = await this.getSupabaseClient().auth.getUser()

      if (authError || !authUser || !authUser.email_confirmed_at) {
        return { user: null, error: { message: 'Utilisateur non connecté ou email non confirmé', name: 'AuthError', status: 401 } as AuthError }
      }
      
      // Créer profil utilisateur
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const userSvc = await getUserService()
      const userProfile = await userSvc.create({
        id: authUser.id,
        email: authUser.email!,
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'gestionnaire' as UserRole,
        provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
        phone: phone?.trim() || null,
      })

      // Créer équipe personnelle
      const teamName = `Équipe de ${fullName}`
      const teamSvc = await getTeamService()
      const team = await teamSvc.create({
        name: teamName,
        description: `Équipe personnelle de ${fullName}`,
        created_by: authUser.id
      })

      // Créer automatiquement un contact pour ce gestionnaire
      try {
        const { createContactService } = await import('./services')
        const contactService = createContactService()
        await contactService.create({
          name: fullName,
          email: authUser.email!,
          role: 'manager',
          team_id: team.id,
          is_active: true,
          notes: 'Contact créé automatiquement lors de la finalisation du profil'
        })
      } catch (contactError) {
        logger.warn('⚠️ Erreur lors de la création du contact gestionnaire:', contactError)
        // Ne pas faire échouer la finalisation pour cette erreur
      }

      // Mettre à jour metadata auth
      await this.getSupabaseClient().auth.updateUser({
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
        team_id: userProfile.team_id, // ✅ Ajout du team_id manquant
        phone: userProfile.phone || undefined,
        avatar_url: userProfile.avatar_url || undefined,
        password_set: userProfile.password_set ?? false, // ✅ Ajout pour onboarding (default false si null)
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
      const { data, error } = await this.getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        return { user: null, error: error || { message: 'Utilisateur non trouvé', name: 'SignInError', status: 401 } as AuthError }
      }

      // Vérifier si profil existe, sinon créer (NOUVELLE ARCHITECTURE)
      let userProfile
      try {
        // ✅ MULTI-ÉQUIPE: Récupérer tous les profils, prendre le plus récent
        const { data: profiles, error: findError } = await this.getSupabaseClient()
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (findError) {
          throw findError
        }

        userProfile = profiles?.[0] || null
      } catch {
        // Créer profil depuis metadata (NOUVELLE ARCHITECTURE)
        const metadata = data.user.user_metadata
        if (metadata && metadata.full_name) {
          const userSvc = await getUserService()
          userProfile = await userSvc.create({
            auth_user_id: data.user.id, // ✅ NOUVELLE ARCHITECTURE
            email: data.user.email!,
            name: metadata.full_name,
            first_name: metadata.first_name || null,
            last_name: metadata.last_name || null,
            role: 'gestionnaire' as UserRole,
            provider_category: null, // ✅ NOUVEAU: Gestionnaires n'ont pas de catégorie
            phone: metadata.phone || null,
          })

          await this.getSupabaseClient().auth.updateUser({
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
    const { error } = await this.getSupabaseClient().auth.signOut()
    return { error }
  }

  // Récupérer seulement la session auth (sans profil utilisateur)
  async getCurrentAuthSession(): Promise<{ authUser: Record<string, unknown> | null; error: AuthError | null }> {
    const { data: { user: authUser }, error } = await this.getSupabaseClient().auth.getUser()
    
    if (error || !authUser || !authUser.email_confirmed_at) {
      return { authUser: null, error: null }
    }
    
    return { authUser, error: null }
  }

  // ✅ REFACTORISÉ: getCurrentUser simplifié
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      // ✅ Récupération simple de l'utilisateur auth
      const { data: { user: authUser }, error } = await this.getSupabaseClient().auth.getUser()

      if (error) {
        throw new Error(`Auth error: ${error.message}`)
      }

      if (!authUser || !authUser.email_confirmed_at) {
        return { user: null, error: null }
      }

      // ✅ MULTI-ÉQUIPE: Récupérer tous les profils, prendre le plus récent
      const { data: profiles, error: profileError } = await this.getSupabaseClient()
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)

      const userProfile = profiles?.[0] || null

      if (profileError) {
        logger.error('❌ [AUTH-SERVICE] Profile query failed:', profileError.message)
        throw new Error(`Profile query error: ${profileError.message}`)
      }

      if (userProfile) {
        const user: AuthUser = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          first_name: userProfile.first_name || undefined,
          last_name: userProfile.last_name || undefined,
          display_name: authUser.user_metadata?.display_name || userProfile.name,
          role: userProfile.role,
          team_id: userProfile.team_id,
          phone: userProfile.phone || undefined,
          avatar_url: userProfile.avatar_url || undefined,
          password_set: userProfile.password_set,
          created_at: userProfile.created_at || undefined,
          updated_at: userProfile.updated_at || undefined,
        }

        return { user, error: null }
      }

      // ✅ Profile manquant en DB - retourner null pour redirection vers onboarding
      return { user: null, error: null }

    } catch (error) {
      logger.error('❌ [AUTH-SERVICE] getCurrentUser failed:', error)
      return { user: null, error: null }
    }
  }

  // Réinitialiser le mot de passe (via API serveur comme les invitations)
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        logger.error('❌ [AUTH-SERVICE] Password reset failed:', result.error)

        let errorMessage = result.error || `Server API returned ${response.status}`
        if (result.debugInfo && process.env.NODE_ENV === 'development') {
          errorMessage += ` (Debug: ${JSON.stringify(result.debugInfo)})`
        }

        return {
          error: {
            message: errorMessage,
            name: 'ServerError',
            status: response.status
          } as AuthError
        }
      }

      return { error: null }

    } catch (unexpectedError) {
      logger.error('❌ [AUTH-SERVICE] Password reset network error:', unexpectedError)
      return {
        error: {
          message: 'Erreur de réseau lors de l\'envoi de l\'email: ' + (unexpectedError instanceof Error ? unexpectedError.message : 'Unknown error'),
          name: 'NetworkError',
          status: 500
        } as AuthError
      }
    }
  }

  // Renvoyer l'email de confirmation
  async resendConfirmation(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.getSupabaseClient().auth.resend({
      type: 'signup',
      email,
    })
    return { error }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(updates: Partial<AuthUser>): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser }, error: authError } = await this.getSupabaseClient().auth.getUser()

      if (authError || !authUser) {
        return { user: null, error: authError }
      }

      // ✅ MULTI-ÉQUIPE: Récupérer l'ID utilisateur, prendre le plus récent si plusieurs profils
      const { data: dbUsers, error: findError } = await this.getSupabaseClient()
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)

      const dbUser = dbUsers?.[0] || null

      if (findError || !dbUser) {
        logger.error('❌ [AUTH-SERVICE] User not found in database for profile update')
        return { user: null, error: findError as AuthError || { message: 'Utilisateur non trouvé', name: 'UserNotFound', status: 404 } as AuthError }
      }

      // Mettre à jour le profil dans notre table avec le bon ID
      const userSvc = await getUserService()
      const updatedProfile = await userSvc.update(dbUser.id, {
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
          await this.getSupabaseClient().auth.updateUser({
            data: { 
              display_name: updates.display_name || updates.name,
              first_name: updates.first_name,
              last_name: updates.last_name
            }
          })
        } catch (updateError) {
          logger.warn('⚠️ Could not update user metadata in updateProfile:', updateError)
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
        team_id: updatedProfile.team_id, // ✅ Ajout du team_id manquant
        phone: updatedProfile.phone || undefined,
        avatar_url: updatedProfile.avatar_url || undefined,
        created_at: updatedProfile.created_at || undefined,
        updated_at: updatedProfile.updated_at || undefined,
      }

      return { user, error: null }
    } catch (error) {
      logger.error('❌ [AUTH-SERVICE] Profile update failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la mise à jour du profil'

      return { user: null, error: {
        message: errorMessage,
        name: 'UpdateProfileError',
        status: 500
      } as AuthError }
    }
  }

  // ✅ REFACTORISÉ: onAuthStateChange simplifié
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.getSupabaseClient().auth.onAuthStateChange(async (event, session) => {
      if (!session?.user || !session.user.email_confirmed_at) {
        callback(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        try {
          // ✅ Recherche du profil utilisateur avec timeout et fallback
          let userProfile = null

          try {
            // ✅ MULTI-ÉQUIPE: Promise.race pour timeout, récupérer tous les profils
            const profileResult = await Promise.race([
              this.getSupabaseClient()
                .from('users')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(1),
              new Promise<{ data: null; error: Error }>((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 6000)
              )
            ])

            userProfile = profileResult.data?.[0] || null

          } catch {
            // ✅ MULTI-ÉQUIPE: Fallback par email si timeout
            if (session.user.email) {
              try {
                const emailResult = await Promise.race([
                  this.getSupabaseClient()
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(1),
                  new Promise<{ data: null; error: Error }>((_, reject) =>
                    setTimeout(() => reject(new Error('Email fallback timeout')), 6000)
                  )
                ])

                userProfile = emailResult.data?.[0] || null

                if (userProfile && !userProfile.auth_user_id) {
                  // Lier le profil trouvé par email à l'auth_user_id
                  await this.getSupabaseClient()
                    .from('users')
                    .update({ auth_user_id: session.user.id })
                    .eq('id', userProfile.id)
                }
              } catch {
                // Fallback also failed - continue to next strategy
              }
            }
          }

          if (userProfile) {
            const user: AuthUser = {
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name,
              first_name: userProfile.first_name || undefined,
              last_name: userProfile.last_name || undefined,
              display_name: session.user.user_metadata?.display_name || userProfile.name,
              role: userProfile.role,
              team_id: userProfile.team_id,
              phone: userProfile.phone || undefined,
              created_at: userProfile.created_at || undefined,
              updated_at: userProfile.updated_at || undefined,
            }

            callback(user)
            return
          }

          // ✅ Fallback : tentative de requête directe
          try {
            const directResult = await Promise.race([
              this.getSupabaseClient()
                .from('users')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(1),
              new Promise<{ data: null; error: Error }>((_, reject) =>
                setTimeout(() => reject(new Error('Direct query timeout')), 6000)
              )
            ])

            const directProfile = directResult.data?.[0] || null
            if (directProfile) {
              const user: AuthUser = {
                id: directProfile.id,
                email: directProfile.email,
                name: directProfile.name,
                first_name: directProfile.first_name || undefined,
                last_name: directProfile.last_name || undefined,
                display_name: session.user.user_metadata?.display_name || directProfile.name,
                role: directProfile.role,
                team_id: directProfile.team_id,
                phone: directProfile.phone || undefined,
                created_at: directProfile.created_at || undefined,
                updated_at: directProfile.updated_at || undefined,
              }

              callback(user)
              return
            }
          } catch {
            // Direct query failed - proceed to self-healing
          }

          // ✅ SELF-HEALING: Profile manquant, création automatique
          try {
            const userSvc = await getUserService()
            const createdProfileResult = await userSvc.create({
              auth_user_id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
              first_name: session.user.user_metadata?.first_name || undefined,
              last_name: session.user.user_metadata?.last_name || undefined,
              role: session.user.user_metadata?.role || 'gestionnaire',
              provider_category: null,
              phone: session.user.user_metadata?.phone || undefined,
              password_set: session.user.user_metadata?.password_set ?? true
            })

            if (!createdProfileResult.success || !createdProfileResult.data) {
              throw new Error('Failed to create user profile')
            }

            const createdProfile = createdProfileResult.data

            const healedUser: AuthUser = {
              id: createdProfile.id,
              email: createdProfile.email,
              name: createdProfile.name,
              first_name: createdProfile.first_name || undefined,
              last_name: createdProfile.last_name || undefined,
              display_name: session.user.user_metadata?.display_name || createdProfile.name,
              role: createdProfile.role,
              team_id: createdProfile.team_id,
              phone: createdProfile.phone || undefined,
              avatar_url: createdProfile.avatar_url || undefined,
              password_set: createdProfile.password_set,
              created_at: createdProfile.created_at || undefined,
              updated_at: createdProfile.updated_at || undefined,
            }

            callback(healedUser)
          } catch (healError) {
            logger.error('❌ [AUTH-SERVICE] Profile auto-creation failed:', healError)
            callback(null)
          }

        } catch (error) {
          logger.error('❌ [AUTH-SERVICE] Error processing auth state change:', error)
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
    role: UserRole
    teamId: string
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (!response.ok) {
        logger.error('❌ [AUTH-SERVICE] Invitation failed:', result.error)
        return { success: false, error: result.error }
      }

      return {
        success: true,
        userId: result.userId
      }

    } catch (error) {
      logger.error('❌ [AUTH-SERVICE] Invitation API error:', error)
      return {
        success: false,
        error: 'Erreur lors de l\'envoi de l\'invitation'
      }
    }
  }
}

export const authService = new AuthService()
