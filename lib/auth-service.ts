import { supabase } from './supabase'
import { userService, teamService } from './database-service'
import type { AuthError, AuthResponse, User as SupabaseUser } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { activityLogger } from './activity-logger'
import { authCache } from './auth-cache'

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: Database['public']['Enums']['user_role']
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
  // ✅ PHASE 1.5: Circuit breaker et recovery properties
  private recoveryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private failureCounts: Map<string, number> = new Map()
  private lastFailureTime: Map<string, number> = new Map()
  private readonly MAX_FAILURES = 3
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute

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

  // ✅ OPTIMISÉ: Déconnexion avec invalidation cache
  async signOut(): Promise<{ error: AuthError | null }> {
    console.log('🚪 [AUTH-SERVICE-OPTIMIZED] Signing out and clearing cache...')

    // ✅ NOUVEAU: Invalider tout le cache lors de la déconnexion
    authCache.invalidateAll()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('❌ [AUTH-SERVICE-OPTIMIZED] SignOut error:', error.message)
    } else {
      console.log('✅ [AUTH-SERVICE-OPTIMIZED] SignOut successful, cache cleared')
    }

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

  // ✅ OPTIMISÉ: getCurrentUser avec cache intelligent
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log('🔍 [AUTH-SERVICE-OPTIMIZED] Getting current user with cache support...')

      // ✅ Récupération simple de l'utilisateur auth
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error) {
        console.log('❌ [AUTH-SERVICE-OPTIMIZED] Auth error:', error.message)
        throw new Error(`Auth error: ${error.message}`)
      }

      if (!authUser || !authUser.email_confirmed_at) {
        console.log('ℹ️ [AUTH-SERVICE-OPTIMIZED] No confirmed auth user')
        return { user: null, error: null }
      }

      // ✅ NOUVEAU: Vérifier le cache d'abord
      let cachedUser = authCache.getUserProfile(authUser.id)
      if (cachedUser) {
        console.log('⚡ [AUTH-CACHE-HIT] getCurrentUser found cached profile, skipping DB query')
        return { user: cachedUser, error: null }
      }

      // ✅ Cache miss : requête DB optimisée avec timeout
      console.log('🔍 [AUTH-SERVICE-OPTIMIZED] Cache miss, querying database with 2s timeout...')

      const profileResult = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile query timeout')), 2000)
        )
      ])

      if (profileResult.data) {
        const user: AuthUser = {
          id: profileResult.data.id,
          email: profileResult.data.email,
          name: profileResult.data.name,
          first_name: profileResult.data.first_name || undefined,
          last_name: profileResult.data.last_name || undefined,
          display_name: authUser.user_metadata?.display_name || profileResult.data.name,
          role: profileResult.data.role,
          team_id: profileResult.data.team_id,
          phone: profileResult.data.phone || undefined,
          avatar_url: profileResult.data.avatar_url || undefined,
          created_at: profileResult.data.created_at || undefined,
          updated_at: profileResult.data.updated_at || undefined,
        }

        console.log('✅ [AUTH-SERVICE-OPTIMIZED] User profile found and cached:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        })

        // ✅ NOUVEAU: Mettre en cache pour éviter futures requêtes
        authCache.setUserProfile(authUser.id, user)

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
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 [AUTH-STATE-CHANGE-REFACTORED] Event:', event, 'Has session:', !!session?.user)

      if (!session?.user || !session.user.email_confirmed_at) {
        console.log('ℹ️ [AUTH-STATE-CHANGE-REFACTORED] No valid session')
        callback(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        try {
          console.log('🔍 [AUTH-STATE-CHANGE-REFACTORED] Processing auth state change...')

          // ✅ OPTIMISÉ: Recherche du profil avec cache intelligent et requêtes parallèles
          console.log('🚀 [AUTH-STATE-CHANGE-OPTIMIZED] Starting optimized profile search...')

          // 1. Vérifier le cache d'abord
          let cachedUser = authCache.getUserProfile(session.user.id)
          if (cachedUser) {
            console.log('⚡ [AUTH-CACHE-HIT] User profile found in cache, skipping DB queries')
            callback(cachedUser)
            return
          }

          // 2. Cache miss : requêtes parallèles avec timeout réduit
          let userProfile = null
          let profileError = null

          try {
            console.log('🔍 [AUTH-STATE-CHANGE-OPTIMIZED] Cache miss, running parallel queries with 4s timeout...')

            // ✅ PHASE 1.5: Timeouts augmentés pour plus de robustesse
            const authTimeout = 4000 // 2s → 4s
            const emailTimeout = 4000 // 2s → 4s

            // Requêtes parallèles simultanées (plus robuste)
            const [authResult, emailResult] = await Promise.allSettled([
              // Requête par auth_user_id avec timeout 4s
              Promise.race([
                supabase
                  .from('users')
                  .select('*')
                  .eq('auth_user_id', session.user.id)
                  .single(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Auth query timeout')), authTimeout)
                )
              ]),
              // Requête par email en parallèle avec timeout 4s
              session.user.email ? Promise.race([
                supabase
                  .from('users')
                  .select('*')
                  .eq('email', session.user.email)
                  .single(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Email query timeout')), emailTimeout)
                )
              ]) : Promise.reject(new Error('No email available'))
            ])

            // Priorité à la requête auth_user_id si réussie
            if (authResult.status === 'fulfilled' && authResult.value.data) {
              userProfile = authResult.value.data
              console.log('✅ [AUTH-STATE-CHANGE-OPTIMIZED] Profile found via auth_user_id')
            }
            // Sinon utiliser email fallback
            else if (emailResult.status === 'fulfilled' && emailResult.value.data) {
              userProfile = emailResult.value.data
              console.log('✅ [AUTH-STATE-CHANGE-OPTIMIZED] Profile found via email fallback')

              // Lier le profil trouvé par email si pas déjà lié
              if (!userProfile.auth_user_id) {
                console.log('🔗 [AUTH-STATE-CHANGE-LINK] Linking profile found by email to auth_user_id...')
                try {
                  await supabase
                    .from('users')
                    .update({ auth_user_id: session.user.id })
                    .eq('id', userProfile.id)
                  console.log('✅ [AUTH-STATE-CHANGE-LINK] Profile linked successfully')
                } catch (linkError) {
                  console.warn('⚠️ [AUTH-STATE-CHANGE-LINK] Could not link profile:', linkError)
                }
              }
            } else {
              // Les deux requêtes ont échoué ou timeout
              console.warn('⚠️ [AUTH-STATE-CHANGE-OPTIMIZED] Both parallel queries failed:', {
                authResult: authResult.status === 'rejected' ? authResult.reason.message : 'no data',
                emailResult: emailResult.status === 'rejected' ? emailResult.reason.message : 'no data'
              })
              profileError = new Error('Profile not found in parallel queries')
            }

          } catch (error) {
            console.warn('⚠️ [AUTH-STATE-CHANGE-OPTIMIZED] Parallel queries failed:', error)
            profileError = error
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

            console.log('✅ [AUTH-STATE-CHANGE-OPTIMIZED] User profile found and cached:', {
              id: user.id,
              email: user.email,
              role: user.role
            })

            // ✅ NOUVEAU: Mettre en cache pour les prochaines requêtes
            authCache.setUserProfile(session.user.id, user)
            // ✅ PHASE 1.5: Marquer comme utilisateur actif pour protection
            authCache.setActiveUser(session.user.id)

            callback(user)
            return
          }

          // ✅ OPTIMISÉ: Plus besoin de fallback directe, les requêtes parallèles couvrent tous les cas

                  // ✅ PHASE 1.5: JWT-only fallback avec recovery mechanism
          console.log('⚠️ [AUTH-STATE-CHANGE-JWT-ONLY] Using JWT-only fallback with recovery')

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

          // ✅ NOUVEAU: Mettre en cache temporaire avec TTL court pour éviter boucles
          authCache.setUserProfile(session.user.id, fallbackUser, 30000) // 30s TTL
          // ✅ PHASE 1.5: Marquer comme utilisateur actif même en mode JWT-only
          authCache.setActiveUser(session.user.id)

          // ✅ NOUVEAU: Programmer une tentative de recovery après un délai
          this.scheduleJWTRecovery(session.user.id, callback)

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

  // ✅ PHASE 1.5: Recovery mechanism pour JWT-only users
  private scheduleJWTRecovery(authUserId: string, callback: (user: AuthUser | null) => void) {
    // Éviter les tentatives multiples
    if (this.recoveryTimeouts.has(authUserId)) {
      console.log('🔄 [JWT-RECOVERY] Recovery already scheduled for:', authUserId)
      return
    }

    // Vérifier circuit breaker
    if (this.isCircuitBreakerOpen(authUserId)) {
      console.log('🚫 [JWT-RECOVERY] Circuit breaker open, skipping recovery for:', authUserId)
      return
    }

    console.log('⏰ [JWT-RECOVERY] Scheduling recovery attempt for:', authUserId)

    const recoveryTimeout = setTimeout(async () => {
      try {
        console.log('🔄 [JWT-RECOVERY] Attempting profile recovery for:', authUserId)

        // Tentative de recovery avec timeout plus long
        const { data, error } = await Promise.race([
          supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUserId)
            .single(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Recovery timeout')), 6000)
          )
        ])

        if (data && !error) {
          console.log('✅ [JWT-RECOVERY] Profile recovery successful:', data.email)

          // Reset failure count
          this.failureCounts.delete(authUserId)
          this.lastFailureTime.delete(authUserId)

          // Create full user profile
          const recoveredUser: AuthUser = {
            id: data.id,
            email: data.email,
            name: data.name,
            first_name: data.first_name || undefined,
            last_name: data.last_name || undefined,
            display_name: data.name,
            role: data.role,
            team_id: data.team_id,
            phone: data.phone || undefined,
            created_at: data.created_at || undefined,
            updated_at: data.updated_at || undefined,
          }

          // Remplacer le cache JWT-only par le vrai profil
          authCache.setUserProfile(authUserId, recoveredUser)
          // ✅ PHASE 1.5: Maintenir la protection active user
          authCache.setActiveUser(authUserId)

          // Notifier la recovery
          callback(recoveredUser)
        } else {
          this.handleRecoveryFailure(authUserId)
        }
      } catch (error) {
        console.warn('⚠️ [JWT-RECOVERY] Recovery failed:', error)
        this.handleRecoveryFailure(authUserId)
      } finally {
        this.recoveryTimeouts.delete(authUserId)
      }
    }, 5000) // Attendre 5s avant tentative

    this.recoveryTimeouts.set(authUserId, recoveryTimeout)
  }

  // Circuit breaker logic
  private isCircuitBreakerOpen(authUserId: string): boolean {
    const failures = this.failureCounts.get(authUserId) || 0
    const lastFailure = this.lastFailureTime.get(authUserId) || 0
    const now = Date.now()

    if (failures >= this.MAX_FAILURES) {
      if (now - lastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        return true // Circuit ouvert
      } else {
        // Reset après timeout
        this.failureCounts.delete(authUserId)
        this.lastFailureTime.delete(authUserId)
        return false
      }
    }

    return false
  }

  private handleRecoveryFailure(authUserId: string) {
    const currentFailures = this.failureCounts.get(authUserId) || 0
    this.failureCounts.set(authUserId, currentFailures + 1)
    this.lastFailureTime.set(authUserId, Date.now())

    console.log(`⚠️ [JWT-RECOVERY] Failure count for ${authUserId}: ${currentFailures + 1}/${this.MAX_FAILURES}`)
  }

  // Cleanup recovery timeouts on logout
  private cleanupRecovery(authUserId?: string) {
    if (authUserId) {
      const timeout = this.recoveryTimeouts.get(authUserId)
      if (timeout) {
        clearTimeout(timeout)
        this.recoveryTimeouts.delete(authUserId)
      }
    } else {
      // Cleanup all
      for (const timeout of this.recoveryTimeouts.values()) {
        clearTimeout(timeout)
      }
      this.recoveryTimeouts.clear()
    }
  }
}

export const authService = new AuthService()
