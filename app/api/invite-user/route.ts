import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { inviteUserSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn({}, '⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - invitations will be disabled')
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
    // ✅ AUTH: 22 lignes → 3 lignes! (ancien pattern getServerSession → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUserProfile } = authResult.data

    // Vérifier si le service d'invitation est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service d\'invitation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(inviteUserSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INVITE-USER] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
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
    } = validatedData

    logger.info({
      email,
      firstName,
      lastName,
      role,
      providerCategory, // ✅ LOG: Afficher le providerCategory reçu
      speciality,
      shouldInviteToApp,
      teamId
    }, '📧 [INVITE-USER-SIMPLE] Creating contact:')

    // ✅ FIX: Si providerCategory est déjà fourni par le service, l'utiliser directement
    // Sinon, mapper depuis le role (legacy support)
    let validUserRole: Database['public']['Enums']['user_role']
    let finalProviderCategory: Database['public']['Enums']['provider_category'] | null = null

    if (providerCategory) {
      // ✅ NOUVEAU FLUX: Service envoie déjà role + providerCategory
      validUserRole = role as Database['public']['Enums']['user_role']
      finalProviderCategory = providerCategory as Database['public']['Enums']['provider_category']
      logger.info({ validUserRole, finalProviderCategory }, "✅ [ROLE-DIRECT] Using provided role and category")
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
          'proprietaire': { role: 'proprietaire', provider_category: null }, // Proprietaire est maintenant un rôle distinct
          // Anciennes catégories spécialisées → mappées vers 'autre'
          'syndic': { role: 'prestataire', provider_category: 'autre' },
          'notaire': { role: 'prestataire', provider_category: 'autre' },
          'assurance': { role: 'prestataire', provider_category: 'autre' },
          'autre': { role: 'prestataire', provider_category: 'autre' }
        }

        return mapping[_contactType] || { role: 'gestionnaire', provider_category: null }
      }

      const mapped = mapContactTypeToRoleAndCategory(role)
      validUserRole = mapped.role
      finalProviderCategory = mapped.provider_category
      logger.info({ role, validUserRole, finalProviderCategory }, "🔄 [ROLE-MAPPING] Contact type mapped to user role and category")
    }

    let userProfile
    let invitationResult = null
    let authUserId: string | null = null

    // ============================================================================
    // ÉTAPE 1 (COMMUNE): Créer le profil utilisateur SANS auth (SUPPORT MULTI-ÉQUIPES)
    // ============================================================================
    logger.info({}, '👤 [STEP-1] Creating user profile (multi-team support)...')

    try {
      // ✅ MULTI-ÉQUIPES: Vérifier si l'utilisateur existe dans L'ÉQUIPE COURANTE uniquement
      const { data: existingUserInCurrentTeam, error: checkError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('team_id', teamId) // ✅ Vérifier dans l'équipe courante uniquement
        .is('deleted_at', null) // ✅ FIX: Utiliser .is() pour vérifier NULL sur colonne timestamp
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error({ error: checkError }, '❌ [STEP-1] Error checking existing user in current team:')
        throw new Error('Failed to check existing user: ' + checkError?.message)
      }

      // ✅ CAS 1: Utilisateur existe déjà dans l'équipe courante → ERREUR
      if (existingUserInCurrentTeam) {
        logger.warn({ user: existingUserInCurrentTeam.id, teamId }, '⚠️ [STEP-1] User already exists in current team - blocking')
        return NextResponse.json(
          { error: 'Un contact avec cet email existe déjà dans votre équipe.' },
          { status: 409 } // Conflict
        )
      }

      // ✅ CAS 2: Utilisateur n'existe pas dans l'équipe courante → CRÉER nouvelle entrée
      // (même si l'email existe dans une autre équipe, on crée une nouvelle entrée public.users)
      logger.info({}, '📝 [STEP-1] Creating new user profile for this team...')
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
        logger.error({ error: createError }, '❌ [STEP-1] User profile creation failed:')
        throw new Error('Failed to create user profile: ' + (createError?.message || 'Unknown error'))
      }

      userProfile = newUser
      authUserId = newUser.auth_user_id // Sera null sauf si l'email existe dans autre équipe avec auth
      logger.info({ user: userProfile.id, teamId }, '✅ [STEP-1] User profile created for team:')

    } catch (userError) {
      logger.error({ error: userError }, '❌ [STEP-1] Failed to create user profile:')
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil utilisateur: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 2 (COMMUNE): Ajouter à l'équipe (OBLIGATOIRE pour tous)
    // ============================================================================
    logger.info({}, '👥 [STEP-2] Adding user to team (common step)...')
    try {
      // Utiliser supabaseAdmin pour bypasser RLS lors de l'ajout à l'équipe
      const { data: teamMember, error: teamError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userProfile.id,
          role: validUserRole as Database['public']['Enums']['team_member_role']
          // created_at est auto-généré par Supabase (timestamp default now())
        })
        .select()
        .single()

      if (teamError) {
        // Si erreur critique, ne pas continuer
        logger.error({ user: teamError }, '❌ [STEP-2] Failed to add user to team:')
        return NextResponse.json(
          { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      logger.info({ user: teamId }, '✅ [STEP-2] User added to team:')
    } catch (teamError) {
      logger.error({ user: teamError }, '❌ [STEP-2] Failed to add user to team:')
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError instanceof Error ? teamError.message : String(teamError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 3 (SI INVITATION): Créer auth + Générer lien officiel + Enregistrer invitation
    // ============================================================================
    if (shouldInviteToApp) {
      logger.info({}, '📧 [STEP-3-INVITE] Processing invitation flow with official Supabase link...')

      try {
        // SOUS-ÉTAPE 1: Générer le lien d'invitation officiel Supabase (crée auth automatiquement)
        logger.info({}, '🔗 [STEP-3-INVITE-1] Generating official Supabase invite link (auto-creates auth user)...')
        const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
          logger.error({ inviteError: inviteError }, '❌ [STEP-3-INVITE-1] Failed to generate invite link:')
          throw new Error('Failed to generate invitation link: ' + inviteError?.message)
        }

        // ✅ Récupérer l'auth_user_id et le hashed_token
        authUserId = inviteLink.user.id
        const hashedToken = inviteLink.properties.hashed_token
        // ✅ Construire l'URL avec notre domaine (pas celui de Supabase dashboard)
        const invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`
        logger.info({ user: authUserId }, '✅ [STEP-3-INVITE-1] Auth user created + invite link generated:')

        // SOUS-ÉTAPE 2: Lier l'auth au profil (utiliser Service Role pour bypasser RLS)
        logger.info({}, '🔗 [STEP-3-INVITE-2] Linking auth to profile with Service Role...')
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('id', userProfile.id)
          .select()
          .single()

        if (updateError || !updatedUser) {
          logger.error({ updateError: updateError }, '❌ [STEP-3-INVITE-2] Failed to link auth to profile:')
          // Cleanup : Supprimer l'auth créé si échec de liaison
          await supabaseAdmin.auth.admin.deleteUser(authUserId)
          throw new Error('Failed to link auth to profile: ' + (updateError?.message || 'No user returned'))
        }

        logger.info({}, '✅ [STEP-3-INVITE-2] Auth linked to profile via Service Role')

        // SOUS-ÉTAPE 3: Créer l'enregistrement d'invitation dans user_invitations
        logger.info({}, '📋 [STEP-3-INVITE-3] Creating invitation record in user_invitations...')
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
            invitation_token: hashedToken,  // ✅ Token Supabase complet (VARCHAR 255)
            user_id: userProfile.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (invitationError) {
          logger.error({ invitationError: invitationError }, '⚠️ [STEP-3-INVITE-3] Failed to create invitation record:')
          // Non bloquant
        } else {
          logger.info({ invitationRecord: invitationRecord.id }, '✅ [STEP-3-INVITE-3] Invitation record created:')
        }

        // SOUS-ÉTAPE 4: Envoyer l'email via Resend
        logger.info({}, '📨 [STEP-3-INVITE-4] Sending invitation email via Resend...')
        const emailResult = await emailService.sendInvitationEmail(email, {
          firstName,
          inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
          teamName: teamId,
          role: validUserRole,
          invitationUrl, // ✅ Lien officiel Supabase
          expiresIn: 7,
        })

        if (!emailResult.success) {
          logger.warn({ emailResult: emailResult.error }, '⚠️ [STEP-3-INVITE-4] Failed to send email via Resend:')
          invitationResult = {
            success: false,
            invitationSent: false,
            magicLink: invitationUrl,
            error: emailResult.error,
            message: 'Auth et profil créés mais email non envoyé'
          }
        } else {
          logger.info({ emailResult: emailResult.emailId }, '✅ [STEP-3-INVITE-4] Invitation email sent successfully via Resend:')
          invitationResult = {
            success: true,
            invitationSent: true,
            magicLink: invitationUrl,
            message: 'Invitation envoyée avec succès'
          }
        }

      } catch (inviteError) {
        logger.error({ inviteError: inviteError }, '❌ [STEP-3-INVITE] Invitation flow failed:')
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'invitation: ' + (inviteError instanceof Error ? inviteError.message : String(inviteError)) },
          { status: 500 }
        )
      }
    } else {
      logger.info({}, '⏭️ [STEP-3] No invitation requested')
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
        logger.info({}, '✅ [STEP-4] Activity logged successfully')
      } catch (logError) {
        logger.error({ logError: logError }, '⚠️ [STEP-4] Failed to log activity:')
        // Non bloquant
      }

    logger.info({}, '🎉 [INVITE-USER-SIMPLE] Process completed successfully')

      return NextResponse.json({
        success: true,
      message: shouldInviteToApp ? 
        'Contact créé et invitation envoyée avec succès' : 
        'Contact créé avec succès',
      contact: userProfile,
      invitation: invitationResult
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [INVITE-USER-SIMPLE] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
