import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createServerUserService, createServerTeamService } from '@/lib/services'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { activityLogger } from '@/lib/activity-logger'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, _password, name, firstName, lastName, phone } = body

    logger.info('🚀 [SIGNUP-SIMPLE] Starting simple signup process for:', email)

    // Créer le client Supabase
    const supabase = await createSupabaseServerClient()

    // Initialize services
    const userService = await createServerUserService()
    const teamService = await createServerTeamService()

    // ÉTAPE 1: CRÉER LE USER PROFILE TEMPORAIRE (pour avoir un UUID pour la team)
    logger.info('👤 [STEP-1] Creating temporary user profile...')
    const userProfileResult = await userService.create({
      auth_user_id: null, // Pas encore d'auth
      email: email,
      name: name,
      first_name: firstName,
      last_name: lastName,
      role: 'gestionnaire' as Database['public']['Enums']['user_role'],
      phone: phone || null,
      is_active: true
    })

    if (!userProfileResult.success || !userProfileResult.data) {
      logger.error('❌ [STEP-1] User profile creation failed:', userProfileResult.error)
      throw new Error('Failed to create user profile: ' + (userProfileResult.error?.message || 'Unknown error'))
    }

    const userProfile = userProfileResult.data
    logger.info('✅ [STEP-1] Temporary user profile created:', userProfile.id)

    // ÉTAPE 2: CRÉER L'ÉQUIPE AVEC L'ID USER VALIDE
    logger.info('👥 [STEP-2] Creating team with valid user ID...')
    const teamResult = await teamService.create({
      name: `Équipe de ${name}`,
      description: `Équipe personnelle de ${name}`,
      created_by: userProfile.id // ✅ UUID valide de users
    })

    if (!teamResult.success || !teamResult.data) {
      logger.error('❌ [STEP-2] Team creation failed:', teamResult.error)
      throw new Error('Failed to create team: ' + (teamResult.error?.message || 'Unknown error'))
    }

    const team = teamResult.data
    logger.info('✅ [STEP-2] Team created:', team.id)

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
          email: email,
          role: 'gestionnaire',
          phone: phone || null,
          first_login: true
        }
      )

      logger.info('✅ [LOGS] Activity logs created for user and team creation')
    } catch (logError) {
      logger.error('⚠️ [LOGS] Failed to create activity logs:', logError)
      // Non bloquant, on continue même si les logs échouent
    }

    // Lier le user à l'équipe
    const updateResult = await userService.update(userProfile.id, {
      team_id: team.id
    })

    if (!updateResult.success) {
      logger.error('❌ Failed to link user to team:', updateResult.error)
      throw new Error('Failed to link user to team: ' + (updateResult.error?.message || 'Unknown error'))
    }

    // ÉTAPE 3: CRÉER L'AUTH USER ET LIER AU PROFIL
    logger.info('🔐 [STEP-3] Creating auth user and linking to profile...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      _password,
      options: {
        data: {
          full_name: name,
          first_name: firstName,
          last_name: lastName,
          display_name: name
        }
      }
    })

    if (authError || !authData.user) {
      logger.error('❌ [STEP-3] Auth creation failed:', authError)
      throw authError || new Error('Failed to create auth user')
    }
    
    // Lier l'auth au user existant
    const linkResult = await userService.update(userProfile.id, {
      auth_user_id: authData.user.id
    })

    if (!linkResult.success) {
      logger.error('❌ Failed to link auth to user:', linkResult.error)
      throw new Error('Failed to link auth to user: ' + (linkResult.error?.message || 'Unknown error'))
    }

    logger.info('✅ [STEP-3] Auth user created and linked:', authData.user.id)

    // ✅ L'utilisateur est déjà ajouté à l'équipe par teamService.create
    logger.info('✅ [STEP-3] User already added to team as admin by teamService.create')

    // ÉTAPE 4: RETOURNER LES CREDENTIALS POUR AUTO-LOGIN
    logger.info('🎯 [STEP-4] All setup complete - ready for auto-login!')

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      ready: true, // ✅ Signal pour arrêter le loader
      // ✅ Credentials pour auto-login
      credentials: {
        email: userProfile.email,
        password: password // Nécessaire pour l'auto-login
      },
      user: {
        id: userProfile.id,
        auth_user_id: authData.user.id,
        email: userProfile.email,
        name: userProfile.name,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        role: userProfile.role,
        phone: userProfile.phone,
        team_id: team.id
      },
      team: team,
      redirectTo: '/gestionnaire/dashboard'
    })

  } catch (error) {
    logger.error('❌ [SIGNUP-SIMPLE] Process failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la création du compte: ' + (error instanceof Error ? error.message : String(error)) 
      },
      { status: 500 }
    )
  }
}
