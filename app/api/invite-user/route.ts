import { createClient } from '@supabase/supabase-js'
import { createServerUserService, createServerTeamService } from '@/lib/services'
import { createActivityLogger } from '@/lib/activity-logger'
import { getServerSession } from '@/lib/services'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger, logError } from '@/lib/logger'
// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - invitations will be disabled')
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
      providerCategory, // ✅ FIX: Extraire providerCategory envoyé par le service
      teamId,
      phone,
      notes, // ✅ AJOUT: Notes sur le contact
      speciality, // ✅ AJOUT: Spécialité pour les prestataires
      shouldInviteToApp = false  // ✅ NOUVELLE LOGIQUE SIMPLE
    } = body

    logger.info('📧 [INVITE-USER-SIMPLE] Creating contact:', {
      email,
      firstName,
      lastName,
      role,
      providerCategory, // ✅ LOG: Afficher le providerCategory reçu
      speciality,
      shouldInviteToApp,
      teamId
    })

    // ✅ FIX: Si providerCategory est déjà fourni par le service, l'utiliser directement
    // Sinon, mapper depuis le role (legacy support)
    let validUserRole: Database['public']['Enums']['user_role']
    let finalProviderCategory: Database['public']['Enums']['provider_category'] | null = null

    if (providerCategory) {
      // ✅ NOUVEAU FLUX: Service envoie déjà role + providerCategory
      validUserRole = role as Database['public']['Enums']['user_role']
      finalProviderCategory = providerCategory as Database['public']['Enums']['provider_category']
      logger.info(`✅ [ROLE-DIRECT] Using provided role "${validUserRole}" + category "${finalProviderCategory}"`)
    } else {
      // ✅ LEGACY FLUX: Mapper depuis le type frontend (backward compatibility)
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

      const mapped = mapContactTypeToRoleAndCategory(role)
      validUserRole = mapped.role
      finalProviderCategory = mapped.provider_category
      logger.info(`🔄 [ROLE-MAPPING] Contact type "${role}" → User role "${validUserRole}" + Category "${finalProviderCategory}"`)
    }

    let userProfile
    let invitationResult = null
    let authUserId: string | null = null

    // ============================================================================
    // ÉTAPE 1 (COMMUNE): Créer le profil utilisateur SANS auth
    // ============================================================================
    logger.info('👤 [STEP-1] Creating user profile (common step)...')

    try {
      // Vérifier si l'utilisateur existe déjà en utilisant supabaseAdmin pour bypasser RLS
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      // Si checkError avec code PGRST116, c'est que l'utilisateur n'existe pas (ce qui est OK)
      if (existingUser && !checkError) {
        logger.info('✅ [STEP-1] User already exists:', existingUser.id)
        userProfile = existingUser
        authUserId = existingUser.auth_user_id
      } else if (!existingUser || checkError?.code === 'PGRST116') {
        // Créer profil SANS auth en utilisant supabaseAdmin pour bypasser RLS
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: null, // Sera lié après si invitation
            email: email,
            name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: finalProviderCategory,
            speciality: speciality || null,
            phone: phone || null,
            notes: notes || null,
            team_id: teamId,
            is_active: true,
            password_set: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError || !newUser) {
          logger.error('❌ [STEP-1] User profile creation failed:', createError)
          throw new Error('Failed to create user profile: ' + (createError?.message || 'Unknown error'))
        }

        userProfile = newUser
        logger.info('✅ [STEP-1] User profile created:', userProfile.id)
      } else {
        // Autre erreur lors de la vérification
        logger.error('❌ [STEP-1] Error checking existing user:', checkError)
        throw new Error('Failed to check existing user: ' + checkError?.message)
      }
    } catch (userError) {
      logger.error('❌ [STEP-1] Failed to create user profile:', userError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil utilisateur: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 2 (COMMUNE): Ajouter à l'équipe (OBLIGATOIRE pour tous)
    // ============================================================================
    logger.info('👥 [STEP-2] Adding user to team (common step)...')
    try {
      // Utiliser supabaseAdmin pour bypasser RLS lors de l'ajout à l'équipe
      const { data: teamMember, error: teamError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userProfile.id,
          role: 'member'
          // created_at est auto-généré par Supabase (timestamp default now())
        })
        .select()
        .single()

      if (teamError) {
        // Si erreur critique, ne pas continuer
        logger.error('❌ [STEP-2] Failed to add user to team:', teamError)
        return NextResponse.json(
          { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      logger.info('✅ [STEP-2] User added to team:', teamId)
    } catch (teamError) {
      logger.error('❌ [STEP-2] Failed to add user to team:', teamError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError instanceof Error ? teamError.message : String(teamError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 3 (SI INVITATION): Créer auth + Générer lien officiel + Enregistrer invitation
    // ============================================================================
    if (shouldInviteToApp) {
      logger.info('📧 [STEP-3-INVITE] Processing invitation flow with official Supabase link...')

      try {
        // SOUS-ÉTAPE 1: Générer le lien d'invitation officiel Supabase (crée auth automatiquement)
        logger.info('🔗 [STEP-3-INVITE-1] Generating official Supabase invite link (auto-creates auth user)...')
        const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            data: {
              // ✅ Metadata pour l'auth user (équivalent à user_metadata de createUser)
              full_name: `${firstName} ${lastName}`,
              first_name: firstName,
              last_name: lastName,
              display_name: `${firstName} ${lastName}`,
              role: validUserRole,
              provider_category: finalProviderCategory,
              team_id: teamId,
              password_set: false  // ✅ CRITIQUE: Indique que l'utilisateur doit définir son mot de passe
            }
          }
        })

        if (inviteError || !inviteLink?.properties?.action_link) {
          logger.error('❌ [STEP-3-INVITE-1] Failed to generate invite link:', inviteError)
          throw new Error('Failed to generate invitation link: ' + inviteError?.message)
        }

        // ✅ Récupérer l'auth_user_id créé automatiquement par generateLink
        authUserId = inviteLink.user.id
        const invitationUrl = inviteLink.properties.action_link
        logger.info('✅ [STEP-3-INVITE-1] Auth user created + invite link generated:', authUserId)

        // SOUS-ÉTAPE 2: Lier l'auth au profil (utiliser Service Role pour bypasser RLS)
        logger.info('🔗 [STEP-3-INVITE-2] Linking auth to profile with Service Role...')
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('id', userProfile.id)
          .select()
          .single()

        if (updateError || !updatedUser) {
          logger.error('❌ [STEP-3-INVITE-2] Failed to link auth to profile:', updateError)
          // Cleanup : Supprimer l'auth créé si échec de liaison
          await supabaseAdmin.auth.admin.deleteUser(authUserId)
          throw new Error('Failed to link auth to profile: ' + (updateError?.message || 'No user returned'))
        }

        logger.info('✅ [STEP-3-INVITE-2] Auth linked to profile via Service Role')

        // SOUS-ÉTAPE 3: Créer l'enregistrement d'invitation dans user_invitations
        logger.info('📋 [STEP-3-INVITE-3] Creating invitation record in user_invitations...')
        const { data: invitationRecord, error: invitationError } = await supabaseAdmin
          .from('user_invitations')
          .insert({
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: finalProviderCategory,
            team_id: teamId,
            invited_by: currentUserProfile.id,
            invitation_token: inviteLink.properties.hashed_token,  // ✅ Token Supabase complet (VARCHAR 255)
            user_id: userProfile.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (invitationError) {
          logger.error('⚠️ [STEP-3-INVITE-3] Failed to create invitation record:', invitationError)
          // Non bloquant
        } else {
          logger.info('✅ [STEP-3-INVITE-3] Invitation record created:', invitationRecord.id)
        }

        // SOUS-ÉTAPE 4: Envoyer l'email via Resend
        logger.info('📨 [STEP-3-INVITE-4] Sending invitation email via Resend...')
        const emailResult = await emailService.sendInvitationEmail(email, {
          firstName,
          inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
          teamName: teamId,
          role: validUserRole,
          invitationUrl, // ✅ Lien officiel Supabase
          expiresIn: 7,
        })

        if (!emailResult.success) {
          logger.warn('⚠️ [STEP-3-INVITE-4] Failed to send email via Resend:', emailResult.error)
          invitationResult = {
            success: false,
            invitationSent: false,
            magicLink: invitationUrl,
            error: emailResult.error,
            message: 'Auth et profil créés mais email non envoyé'
          }
        } else {
          logger.info('✅ [STEP-3-INVITE-4] Invitation email sent successfully via Resend:', emailResult.emailId)
          invitationResult = {
            success: true,
            invitationSent: true,
            magicLink: invitationUrl,
            message: 'Invitation envoyée avec succès'
          }
        }

      } catch (inviteError) {
        logger.error('❌ [STEP-3-INVITE] Invitation flow failed:', inviteError)
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'invitation: ' + (inviteError instanceof Error ? inviteError.message : String(inviteError)) },
          { status: 500 }
        )
      }
    } else {
      logger.info('⏭️ [STEP-3] No invitation requested')
      invitationResult = {
        success: true,
        invitationSent: false,
        message: 'Contact créé sans invitation'
      }
    }

    // ============================================================================
    // ÉTAPE 4 (COMMUNE): Logging de l'activité (avec Service Role pour bypasser RLS)
    // ============================================================================
      try {
        await supabaseAdmin.from('activity_logs').insert({
          team_id: teamId,
          user_id: currentUserProfile.id,
          action_type: shouldInviteToApp ? 'invite' : 'create',
          entity_type: 'contact',
          entity_id: userProfile.id,
          entity_name: `${firstName} ${lastName}`,
          description: `Contact ${shouldInviteToApp ? 'créé et invité' : 'créé'}: ${firstName} ${lastName}${speciality ? ` (${speciality})` : ''}`,
          status: 'success',
          metadata: { email, speciality, shouldInviteToApp }
        })
        logger.info('✅ [STEP-4] Activity logged successfully')
      } catch (logError) {
        logger.error('⚠️ [STEP-4] Failed to log activity:', logError)
        // Non bloquant
      }

    logger.info('🎉 [INVITE-USER-SIMPLE] Process completed successfully')

      return NextResponse.json({
        success: true,
      message: shouldInviteToApp ? 
        'Contact créé et invitation envoyée avec succès' : 
        'Contact créé avec succès',
      contact: userProfile,
      invitation: invitationResult
    })

  } catch (error) {
    logger.error('❌ [INVITE-USER-SIMPLE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
