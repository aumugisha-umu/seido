import { createClient } from '@supabase/supabase-js'
import { createServerUserService, createServerTeamService } from '@/lib/services'
import { activityLogger } from '@/lib/activity-logger'
import { getServerSession } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - invitations will be disabled')
}

const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification et récupérer le profil utilisateur
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Initialize services
    const userService = await createServerUserService()
    const teamService = await createServerTeamService()

    // Récupérer le profil utilisateur pour avoir le bon ID
    const currentUserProfileResult = await userService.getByAuthUserId(session.user.id)
    if (!currentUserProfileResult.success || !currentUserProfileResult.data) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const currentUserProfile = currentUserProfileResult.data

    // Vérifier si le service d'invitation est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service d\'invitation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      role = 'gestionnaire',
      teamId,
      phone,
      speciality, // ✅ AJOUT: Spécialité pour les prestataires
      shouldInviteToApp = false  // ✅ NOUVELLE LOGIQUE SIMPLE
    } = body

    console.log('📧 [INVITE-USER-SIMPLE] Creating contact:', {
      email,
      firstName,
      lastName,
      speciality,
      shouldInviteToApp,
      teamId
    })

    // ✅ LOGIQUE: Mapper les types de contacts vers role + provider_category
    const mapContactTypeToRoleAndCategory = (_contactType: string) => {
      const mapping: Record<string, { 
        role: Database['public']['Enums']['user_role'], 
        provider_category: Database['public']['Enums']['provider_category'] | null 
      }> = {
        'gestionnaire': { role: 'gestionnaire', provider_category: null },
        'locataire': { role: 'locataire', provider_category: null },
        'prestataire': { role: 'prestataire', provider_category: 'prestataire' },
        // Prestataires spécialisés → tous deviennent 'prestataire' avec category spécifique
        'syndic': { role: 'prestataire', provider_category: 'syndic' },
        'notaire': { role: 'prestataire', provider_category: 'notaire' },
        'assurance': { role: 'prestataire', provider_category: 'assurance' },
        'proprietaire': { role: 'prestataire', provider_category: 'proprietaire' }, // ✅ Sans accent (comme dans l'enum BDD)
        'autre': { role: 'prestataire', provider_category: 'autre' }
      }
      
      return mapping[_contactType] || { role: 'gestionnaire', provider_category: null }
    }

    const { role: validUserRole, provider_category: providerCategory } = mapContactTypeToRoleAndCategory(role)
    console.log(`🔄 [ROLE-MAPPING] Contact type "${role}" → User role "${validUserRole}" + Category "${providerCategory}"`)

    let userProfile
    let invitationResult = null
    let authUserId = null

    // ✅ NOUVEAU FLUX: Si invitation cochée, créer AUTH D'ABORD
    if (shouldInviteToApp) {
      console.log('📨 [STEP-1] Creating auth invitation FIRST...')

      try {
        // Créer l'invitation Supabase Auth EN PREMIER
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

        // Générer le magic link pour créer l'auth user
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: email,
          data: {
            full_name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`,
            role: validUserRole,
            provider_category: providerCategory,
            team_id: teamId,
            invited: true
          },
          redirectTo: redirectTo
        })

        if (linkError || !linkData?.user) {
          console.error('❌ [STEP-1] generateLink failed:', linkError?.message || linkError)
          throw linkError || new Error('No user created in auth')
        }

        authUserId = linkData.user.id
        console.log('✅ [STEP-1] Auth user created first:', authUserId)

        // Envoyer l'email d'invitation
        const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`,
            role: validUserRole,
            provider_category: providerCategory,
            team_id: teamId,
            invited: true
          },
          redirectTo: redirectTo
        })

        if (emailError) {
          console.warn('⚠️ [STEP-1] Failed to send email, but auth created:', emailError.message)
        } else {
          console.log('✅ [STEP-1] Invitation email sent successfully')
        }

        invitationResult = {
          success: true,
          authUserId: authUserId,
          invitationSent: true,
          magicLink: linkData?.properties?.action_link,
          message: 'Email d\'invitation envoyé avec succès'
        }

      } catch (inviteError) {
        console.error('❌ [STEP-1] Invitation failed:', inviteError)
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'invitation: ' + (inviteError instanceof Error ? inviteError.message : String(inviteError)) },
          { status: 500 }
        )
      }
    }

    // ÉTAPE 2: CRÉER USER (avec auth_user_id si invitation, sinon null)
    console.log('👤 [STEP-2] Creating user profile...')

    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUserResult = await userService.getByEmail(email)
      const existingUser = existingUserResult.success ? existingUserResult.data : null

      if (existingUser) {
        console.log('✅ [STEP-2] User already exists:', existingUser.id)
        userProfile = existingUser

        // Si on a créé un auth et que le user n'a pas encore d'auth_user_id, le lier
        if (authUserId && !existingUser.auth_user_id) {
          const linkResult = await userService.update(existingUser.id, {
            auth_user_id: authUserId
          })
          if (linkResult.success) {
            console.log('✅ [STEP-2] Linked existing user to new auth:', authUserId)
          } else {
            console.error('❌ [STEP-2] Failed to link existing user to auth:', linkResult.error)
          }
        }
      } else {
        // Créer nouveau user avec auth_user_id déjà défini si invitation
        const createUserResult = await userService.create({
          auth_user_id: authUserId, // ✅ DÉJÀ DÉFINI si invitation, null sinon
          email: email,
          name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          role: validUserRole,
          provider_category: providerCategory,
          speciality: speciality || null,
          phone: phone || null,
          team_id: teamId,
          is_active: true,
          password_set: authUserId ? false : true // ✅ NOUVEAU: false si invitation (auth créé), true sinon
        })

        if (!createUserResult.success || !createUserResult.data) {
          console.error('❌ [STEP-2] User creation failed:', createUserResult.error)
          throw new Error('Failed to create user: ' + (createUserResult.error?.message || 'Unknown error'))
        }

        userProfile = createUserResult.data
        console.log('✅ [STEP-2] User profile created with auth_user_id:', authUserId || 'null')
      }
    } catch (userError) {
      console.error('❌ [STEP-2] Failed to create user:', userError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du contact: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }

    // ÉTAPE 3: Ajouter à l'équipe
    try {
      const addMemberResult = await teamService.addMember(teamId, userProfile.id, 'member')
      if (addMemberResult.success) {
        console.log('✅ [STEP-3] User added to team:', teamId)
      } else {
        console.log('⚠️ [STEP-3] User might already be in team or team error:', addMemberResult.error)
      }
    } catch (teamError) {
      console.log('⚠️ [STEP-3] User might already be in team or team error:', teamError)
      // Non bloquant, continuer
    }

    // ÉTAPE 4: Créer l'enregistrement d'invitation si applicable
    if (shouldInviteToApp && authUserId) {
      console.log('📋 [STEP-4] Creating invitation record in user_invitations table...')
      try {
        const { data: invitationRecord, error: invitationError } = await supabaseAdmin
          .from('user_invitations')
          .insert({
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: providerCategory,
            team_id: teamId,
            invited_by: currentUserProfile.id,
            invitation_code: authUserId, // Utiliser l'auth user ID comme code unique
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
          })
          .select()
          .single()

        if (invitationError) {
          console.error('⚠️ [STEP-4] Failed to create invitation record:', invitationError)
          // Ne pas faire échouer l'invitation principale pour cette erreur
        } else {
          console.log('✅ [STEP-4] Invitation record created:', invitationRecord.id)
        }
      } catch (invitationRecordError) {
        console.error('⚠️ [STEP-4] Exception creating invitation record:', invitationRecordError)
        // Ne pas faire échouer l'invitation principale
      }
    } else {
      console.log('⏭️ [STEP-4] Skipping invitation (checkbox not checked)')
      invitationResult = {
        success: true,
        invitationSent: false,
        message: 'Contact créé sans invitation'
      }
    }

    // Logging de l'activité
      try {
        await activityLogger.log({
          teamId: teamId,
          userId: session.user.id,
          actionType: shouldInviteToApp ? 'invite' : 'create',
          entityType: 'contact',
          entityId: userProfile.id,
          entityName: `${firstName} ${lastName}`,
          description: `Contact ${shouldInviteToApp ? 'créé et invité' : 'créé'}: ${firstName} ${lastName}${speciality ? ` (${speciality})` : ''}`,
          status: 'success',
          metadata: { email, speciality, shouldInviteToApp }
        })
      } catch (logError) {
        console.warn('⚠️ Failed to log activity:', logError)
      }

    console.log('🎉 [INVITE-USER-SIMPLE] Process completed successfully')

      return NextResponse.json({
        success: true,
      message: shouldInviteToApp ? 
        'Contact créé et invitation envoyée avec succès' : 
        'Contact créé avec succès',
      contact: userProfile,
      invitation: invitationResult
    })

  } catch (error) {
    console.error('❌ [INVITE-USER-SIMPLE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
