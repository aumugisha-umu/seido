import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { userService, teamService } from '@/lib/database-service'
import type { Database } from '@/lib/database.types'
import { activityLogger } from '@/lib/activity-logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, firstName, lastName, phone } = body
    
    console.log('🚀 [SIGNUP-SIMPLE] Starting simple signup process for:', email)
    
    // Créer le client Supabase
    const supabase = await createSupabaseServerClient()

    // ÉTAPE 1: CRÉER LE USER PROFILE TEMPORAIRE (pour avoir un UUID pour la team)
    console.log('👤 [STEP-1] Creating temporary user profile...')
    const userProfile = await userService.create({
      auth_user_id: null, // Pas encore d'auth
      email: email,
      name: name,
      first_name: firstName,
      last_name: lastName,
      role: 'gestionnaire' as Database['public']['Enums']['user_role'],
      phone: phone || null,
      is_active: true
    })
    console.log('✅ [STEP-1] Temporary user profile created:', userProfile.id)

    // ÉTAPE 2: CRÉER L'ÉQUIPE AVEC L'ID USER VALIDE
    console.log('👥 [STEP-2] Creating team with valid user ID...')
    const team = await teamService.create({
      name: `Équipe de ${name}`,
      description: `Équipe personnelle de ${name}`,
      created_by: userProfile.id // ✅ UUID valide de users
    })
    console.log('✅ [STEP-2] Team created:', team.id)

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

      console.log('✅ [LOGS] Activity logs created for user and team creation')
    } catch (logError) {
      console.error('⚠️ [LOGS] Failed to create activity logs:', logError)
      // Non bloquant, on continue même si les logs échouent
    }

    // Lier le user à l'équipe
    await userService.update(userProfile.id, {
      team_id: team.id
    })

    // ÉTAPE 3: CRÉER L'AUTH USER ET LIER AU PROFIL
    console.log('🔐 [STEP-3] Creating auth user and linking to profile...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
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
      console.error('❌ [STEP-3] Auth creation failed:', authError)
      throw authError || new Error('Failed to create auth user')
    }
    
    // Lier l'auth au user existant
    await userService.update(userProfile.id, {
      auth_user_id: authData.user.id
    })
    console.log('✅ [STEP-3] Auth user created and linked:', authData.user.id)

    // ✅ L'utilisateur est déjà ajouté à l'équipe par teamService.create
    console.log('✅ [STEP-3] User already added to team as admin by teamService.create')

    // ÉTAPE 4: REDIRECTION AVEC TOUTES LES INFOS
    console.log('🎯 [STEP-4] All setup complete - ready for dashboard!')
    
    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      ready: true, // ✅ Signal pour arrêter le loader
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
    console.error('❌ [SIGNUP-SIMPLE] Process failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la création du compte: ' + (error instanceof Error ? error.message : String(error)) 
      },
      { status: 500 }
    )
  }
}
