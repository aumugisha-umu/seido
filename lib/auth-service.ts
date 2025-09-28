import { createBrowserSupabaseClient } from './services/core/supabase-client'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './services/core/service-types'
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
        console.log('✅ Contact gestionnaire créé lors de la finalisation du profil')
      } catch (contactError) {
        console.error('⚠️ Erreur lors de la création du contact gestionnaire:', contactError)
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
        // NOUVELLE ARCHITECTURE: Chercher par auth_user_id au lieu de id
        const { data: usersData, error: findError } = await this.getSupabaseClient()
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single()
          
        if (findError && findError.code !== 'PGRST116') {
          throw findError
        }
          
        userProfile = usersData
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
      console.log('🔍 [AUTH-SERVICE-REFACTORED] Getting current user...')

      // ✅ Récupération simple de l'utilisateur auth
      const { data: { user: authUser }, error } = await this.getSupabaseClient().auth.getUser()

      if (error) {
        console.log('❌ [AUTH-SERVICE-REFACTORED] Auth error:', error.message)
        throw new Error(`Auth error: ${error.message}`)
      }

      if (!authUser || !authUser.email_confirmed_at) {
        console.log('ℹ️ [AUTH-SERVICE-REFACTORED] No confirmed auth user')
        return { user: null, error: null }
      }

      // ✅ Récupération du profil utilisateur
      console.log('🔍 [AUTH-SERVICE-REFACTORED] Looking up user profile for:', authUser.id)

      const { data: userProfile, error: profileError } = await this.getSupabaseClient()
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
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
          team_id: userProfile.team_id, // ✅ Ajout du team_id manquant
          phone: userProfile.phone || undefined,
          avatar_url: userProfile.avatar_url || undefined,
          created_at: userProfile.created_at || undefined,
          updated_at: userProfile.updated_at || undefined,
        }

        console.log('✅ [AUTH-SERVICE-REFACTORED] User profile found:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        })

        return { user, error: null }
      }

      // ✅ Fallback vers JWT metadata
      console.log('⚠️ [AUTH-SERVICE-REFACTORED] No profile found, using JWT fallback')

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name || 'Utilisateur',
        first_name: authUser.user_metadata?.first_name || undefined,
        last_name: authUser.user_metadata?.last_name || undefined,
        display_name: authUser.user_metadata?.display_name || undefined,
        role: 'gestionnaire',
        team_id: undefined, // ✅ Pas de team_id disponible dans JWT fallback
        phone: undefined,
        avatar_url: undefined,
        created_at: undefined,
        updated_at: undefined,
      }

      return { user, error: null }

    } catch (error) {
      console.error('❌ [AUTH-SERVICE-REFACTORED] getCurrentUser failed:', error)
      return { user: null, error: null }
    }
  }

  // Réinitialiser le mot de passe (via API serveur comme les invitations)
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    console.log('🔄 [RESET-PASSWORD-SERVICE] Starting server-side password reset for:', email)
    console.log('🔧 [RESET-PASSWORD-SERVICE] Client environment:', {
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'server-side',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side',
      timestamp: new Date().toISOString()
    })
    
    try {
      console.log('🔧 [RESET-PASSWORD-SERVICE] Making API request to /api/reset-password...')
      
      // 🎯 NOUVELLE APPROCHE: Utiliser l'API serveur (même système que les invitations)
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      console.log('🔧 [RESET-PASSWORD-SERVICE] API response status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      const result = await response.json()
      console.log('📊 [RESET-PASSWORD-SERVICE] Server API response:', {
        success: result.success,
        hasError: !!result.error,
        hasData: !!result.data,
        hasDebugInfo: !!result.debugInfo,
        fullResult: result
      })
      
      if (!response.ok || !result.success) {
        console.error('❌ [RESET-PASSWORD-SERVICE] Server API failed:', {
          status: response.status,
          error: result.error,
          details: result.details,
          debugInfo: result.debugInfo
        })
        
        // Inclure les informations de debug dans le message d'erreur si disponibles
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
      
      console.log('✅ [RESET-PASSWORD-SERVICE] Server API succeeded:', {
        email: result.data?.email,
        resetEmailSent: result.data?.resetEmailSent,
        debugInfo: result.debugInfo
      })
      
      console.log('🎉 [RESET-PASSWORD-SERVICE] Password reset email sent successfully via server API!')
      return { error: null }
      
    } catch (unexpectedError) {
      console.error('❌ [RESET-PASSWORD-SERVICE] Unexpected error during reset process:', {
        error: unexpectedError,
        message: unexpectedError instanceof Error ? unexpectedError.message : 'Unknown error',
        stack: unexpectedError instanceof Error ? unexpectedError.stack : undefined
      })
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
      email: email,
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

      // ✅ CORRIGER: Récupérer l'ID utilisateur dans la table users via auth_user_id
      const { data: dbUser, error: findError } = await this.getSupabaseClient()
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
      const userSvc = await getUserService()
      const updatedProfile = await userSvc.update(dbUser.id, {
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
          await this.getSupabaseClient().auth.updateUser({
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
        team_id: updatedProfile.team_id, // ✅ Ajout du team_id manquant
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

  // ✅ REFACTORISÉ: onAuthStateChange simplifié
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.getSupabaseClient().auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 [AUTH-STATE-CHANGE-REFACTORED] Event:', event, 'Has session:', !!session?.user)

      if (!session?.user || !session.user.email_confirmed_at) {
        console.log('ℹ️ [AUTH-STATE-CHANGE-REFACTORED] No valid session')
        callback(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        try {
          console.log('🔍 [AUTH-STATE-CHANGE-REFACTORED] Processing auth state change...')

          // ✅ Recherche du profil utilisateur avec timeout et fallback
          let userProfile = null
          let profileError = null

          try {
            console.log('🔍 [AUTH-STATE-CHANGE-TIMEOUT] Searching user profile with 6s timeout...')

            // Promise.race pour timeout + fallback par email
            const profileResult = await Promise.race([
              // Requête principale par auth_user_id
              this.getSupabaseClient()
                .from('users')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .single(),
              // Timeout de 6 secondes (plus réaliste pour Supabase distant)
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 6000)
              )
            ])

            userProfile = profileResult.data
            profileError = profileResult.error

          } catch {
            console.warn('⏰ [AUTH-STATE-CHANGE-TIMEOUT] Profile query timed out, trying email fallback...')

            // Fallback : chercher par email si timeout
            if (session.user.email) {
              try {
                const emailResult = await Promise.race([
                  this.getSupabaseClient()
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .single(),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Email fallback timeout')), 4000)
                  )
                ])

                userProfile = emailResult.data
                // Note: profileError would be emailResult.error if needed

                if (userProfile && !userProfile.auth_user_id) {
                  // Lier le profil trouvé par email à l'auth_user_id
                  console.log('🔗 [AUTH-STATE-CHANGE-LINK] Linking profile found by email to auth_user_id...')
                  await this.getSupabaseClient()
                    .from('users')
                    .update({ auth_user_id: session.user.id })
                    .eq('id', userProfile.id)

                  console.log('✅ [AUTH-STATE-CHANGE-LINK] Profile linked successfully')
                }
              } catch (emailError) {
                console.warn('⚠️ [AUTH-STATE-CHANGE-TIMEOUT] Email fallback also failed:', emailError)
                // emailError logged above, no need to store
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
              team_id: userProfile.team_id, // ✅ Ajout du team_id manquant
              phone: userProfile.phone || undefined,
              created_at: userProfile.created_at || undefined,
              updated_at: userProfile.updated_at || undefined,
            }

            console.log('✅ [AUTH-STATE-CHANGE-REFACTORED] User profile found:', {
              id: user.id,
              email: user.email,
              role: user.role
            })

            callback(user)
            return
          }

          // ✅ Fallback : tentative de requête directe (4s max)
          console.log('⚠️ [AUTH-STATE-CHANGE-FALLBACK] No profile found via timeout, trying quick direct query...')

          try {
            // Requête directe avec timeout de 4s
            const directResult = await Promise.race([
              this.getSupabaseClient()
                .from('users')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .single(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Direct query timeout')), 4000)
              )
            ])

            if (directResult.data) {
              console.log('✅ [AUTH-STATE-CHANGE-FALLBACK] Profile found via direct query!')

              const user: AuthUser = {
                id: directResult.data.id, // ✅ Utiliser le vrai ID du profil
                email: directResult.data.email,
                name: directResult.data.name,
                first_name: directResult.data.first_name || undefined,
                last_name: directResult.data.last_name || undefined,
                display_name: session.user.user_metadata?.display_name || directResult.data.name,
                role: directResult.data.role,
                team_id: directResult.data.team_id, // ✅ Ajout du team_id manquant
                phone: directResult.data.phone || undefined,
                created_at: directResult.data.created_at || undefined,
                updated_at: directResult.data.updated_at || undefined,
              }

              callback(user)
              return
            }
          } catch (directError) {
            console.warn('⚠️ [AUTH-STATE-CHANGE-FALLBACK] Direct query failed or timed out, proceeding with JWT-only:', directError.message)
          }

          // ✅ Fallback final : JWT metadata (mais sans ID de profil incorrect)
          console.log('⚠️ [AUTH-STATE-CHANGE-JWT-ONLY] Using JWT-only fallback')

          const fallbackUser: AuthUser = {
            id: `jwt_${session.user.id}`, // ✅ CORRECTION: Préfixe pour éviter confusion avec IDs profil
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || 'Utilisateur',
            first_name: session.user.user_metadata?.first_name,
            last_name: session.user.user_metadata?.last_name,
            display_name: session.user.user_metadata?.display_name,
            role: session.user.user_metadata?.role || 'gestionnaire',
            phone: undefined,
            created_at: undefined,
            updated_at: undefined,
          }

          callback(fallbackUser)

        } catch (error) {
          console.error('❌ [AUTH-STATE-CHANGE-REFACTORED] Error processing profile:', error)
          callback(null)
        }
      } else {
        console.log('ℹ️ [AUTH-STATE-CHANGE-REFACTORED] Event not processed:', event)
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
