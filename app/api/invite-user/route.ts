import { createClient } from '@supabase/supabase-js'
import { createServerUserService, createServerTeamService } from '@/lib/services'
import { activityLogger } from '@/lib/activity-logger'
import { getServerSession } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'

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
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`

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
            invited: 'true',       // ✅ String pour metadata JSON
            skip_password: 'true'  // ✅ Redirection vers set-password après confirmation
          },
          redirectTo: redirectTo
        })

        if (linkError || !linkData?.user) {
          console.error('❌ [STEP-1] generateLink failed:', linkError?.message || linkError)
          throw linkError || new Error('No user created in auth')
        }

        authUserId = linkData.user.id
        console.log('✅ [STEP-1] Auth user created first:', authUserId)

        // ✅ NOUVEAU: Envoyer l'email d'invitation via Resend avec template React
        const invitationUrl = linkData?.properties?.action_link || `${EMAIL_CONFIG.appUrl}/auth/callback?token=${authUserId}`

        const emailResult = await emailService.sendInvitationEmail(email, {
          firstName,
          inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
          teamName: teamId, // TODO: Récupérer le vrai nom de l'équipe
          role: validUserRole,
          invitationUrl,
          expiresIn: 7,
        })

        if (!emailResult.success) {
          console.warn('⚠️ [STEP-1] Failed to send email via Resend, but auth created:', emailResult.error)
        } else {
          console.log('✅ [STEP-1] Invitation email sent successfully via Resend:', emailResult.emailId)
        }

        invitationResult = {
          success: true,
          authUserId: authUserId,
          invitationSent: emailResult.success,
          magicLink: invitationUrl,
          message: emailResult.success ? 'Email d\'invitation envoyé avec succès' : 'Auth créé mais email non envoyé'
        }

      } catch (inviteError) {
        console.error('❌ [STEP-1] Invitation failed:', inviteError)
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'invitation: ' + (inviteError instanceof Error ? inviteError.message : String(inviteError)) },
          { status: 500 }
        )
      }
    }

    // ÉTAPE 2: CRÉER USER PROFILE
    // ✅ NOUVEAU: Si invitation app (shouldInviteToApp), le Database Trigger créera le profil
    // Sinon (simple contact), créer le profil manuellement sans auth

    if (shouldInviteToApp) {
      // ✅ INVITATION APP: Le trigger créera le profil après confirmation email
      console.log('🔄 [STEP-2] Skipping manual profile creation - trigger will handle it after email confirmation')
      console.log('📍 [STEP-2] User profile will be created by database trigger on_auth_user_confirmed')

      // Pour la compatibilité avec le reste du code, on retourne un objet minimal
      // Le vrai profil sera créé par le trigger
      userProfile = {
        id: authUserId!, // Temporaire, le vrai ID sera généré par le trigger
        auth_user_id: authUserId,
        email: email,
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        role: validUserRole,
        team_id: teamId,
      } as any

    } else {
      // ✅ SIMPLE CONTACT: Créer le profil sans auth (comportement classique)
      console.log('👤 [STEP-2] Creating contact profile (no auth)...')

      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUserResult = await userService.getByEmail(email)
        const existingUser = existingUserResult.success ? existingUserResult.data : null

        if (existingUser) {
          console.log('✅ [STEP-2] User already exists:', existingUser.id)
          userProfile = existingUser
        } else {
          // Créer nouveau contact sans auth
          const createUserResult = await userService.create({
            auth_user_id: null, // Pas d'auth pour simple contact
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
            password_set: false // Contact sans auth = pas de password
          })

          if (!createUserResult.success || !createUserResult.data) {
            console.error('❌ [STEP-2] Contact creation failed:', createUserResult.error)
            throw new Error('Failed to create contact: ' + (createUserResult.error?.message || 'Unknown error'))
          }

          userProfile = createUserResult.data
          console.log('✅ [STEP-2] Contact profile created (no auth):', userProfile.id)
        }
      } catch (userError) {
      console.error('❌ [STEP-2] Failed to create user:', userError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du contact: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }
    } // ✅ Fermeture du bloc else (ligne 200)

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
