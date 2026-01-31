import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { resendInvitationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: Request) {
  try {
    // ✅ AUTH: 28 lignes → 3 lignes! (ancien pattern getServerSession → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUserProfile } = authResult.data

    if (!isServiceRoleAvailable()) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const supabaseAdmin = getServiceRoleClient()
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(resendInvitationSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [RESEND-INVITATION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { invitationId } = validatedData

    logger.info({ invitationId: invitationId }, '🔄 [RESEND-INVITATION] Processing resend for invitation:')

    // ============================================================================
    // ÉTAPE 1: Récupérer l'invitation
    // ============================================================================
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      logger.error({ invitationError: invitationError }, '❌ [STEP-1] Invitation not found:')
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      )
    }

    logger.info({
      email: invitation.email,
      role: invitation.role,
      team_id: invitation.team_id
    }, '✅ [STEP-1] Found invitation:')

    // ============================================================================
    // ÉTAPE 1.5: MULTI-ÉQUIPE - Vérifier si c'est un utilisateur existant
    // ============================================================================
    logger.info({ email: invitation.email }, '🔍 [STEP-1.5] Checking if user has existing auth account...')

    // ✅ OPTIMISATION (Jan 2026): Requête indexée sur public.users au lieu de listUsers()
    // Un utilisateur "existant" = a un auth_user_id lié (a déjà créé un compte sur une autre équipe)
    const { data: existingUserWithAuth } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id')
      .eq('email', invitation.email)
      .not('auth_user_id', 'is', null)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    const isExistingUser = !!existingUserWithAuth?.auth_user_id
    const existingAuthUserId = existingUserWithAuth?.auth_user_id || null

    logger.info({
      hasAuthUser: isExistingUser,
      existingAuthUserId
    }, '✅ [STEP-1.5] Auth user check completed (optimized query)')

    // ============================================================================
    // ÉTAPE 2: Générer le lien approprié selon le type d'utilisateur
    // ============================================================================
    let hashedToken: string
    let magicLink: string

    if (isExistingUser) {
      // ✅ MULTI-ÉQUIPE: Utilisateur existant = magic link (pas de création de compte)
      logger.info({}, '🔗 [STEP-2A] Generating magic link for existing user...')

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: invitation.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?team_id=${invitation.team_id}`
        }
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        logger.error({ linkError }, '❌ [STEP-2A] Failed to generate magic link:')
        return NextResponse.json(
          { error: 'Échec de la génération du lien: ' + (linkError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      hashedToken = linkData.properties.hashed_token
      // ✅ Ajouter team_id pour acceptation auto de l'invitation
      // ✅ BUGFIX: Utiliser type=magiclink pour matcher le token généré avec type: 'magiclink'
      magicLink = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&team_id=${invitation.team_id}`
      logger.info({ magicLink: magicLink.substring(0, 80) + '...' }, '✅ [STEP-2A] Magic link generated for existing user')

    } else {
      // Nouvel utilisateur = lien d'invitation complet (création de compte)
      logger.info({}, '🔗 [STEP-2B] Generating invitation link for new user...')

      const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: invitation.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: {
            // Métadonnées complètes pour l'auth user
            full_name: `${invitation.first_name} ${invitation.last_name}`,
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            display_name: `${invitation.first_name} ${invitation.last_name}`,
            role: invitation.role,
            provider_category: invitation.provider_category,
            team_id: invitation.team_id,
            password_set: false
          }
        }
      })

      if (inviteError || !inviteLink?.properties?.hashed_token) {
        logger.error({ inviteError }, '❌ [STEP-2B] Failed to generate invitation link:')
        return NextResponse.json(
          { error: 'Échec de la génération du lien d\'invitation: ' + (inviteError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      hashedToken = inviteLink.properties.hashed_token
      magicLink = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`
      logger.info({ magicLink: magicLink.substring(0, 80) + '...' }, '✅ [STEP-2B] Invitation link generated for new user')
    }

    // ============================================================================
    // ÉTAPE 3: Mettre à jour le token dans user_invitations
    // ============================================================================
    logger.info({}, '🔄 [STEP-3] Updating invitation token in database...')

    const { error: updateError } = await supabaseAdmin
      .from('user_invitations')
      .update({
        invitation_token: hashedToken, // ✅ NOUVEAU: Mettre à jour le token
        status: 'pending', // Remettre à pending
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      logger.warn({ updateError: updateError }, '⚠️ [STEP-3] Failed to update invitation token:')
      // Non bloquant
    } else {
      logger.info({}, '✅ [STEP-3] Invitation token updated successfully')
    }

    // ============================================================================
    // ÉTAPE 4: Récupérer le nom d'équipe et envoyer l'email
    // ============================================================================
    logger.info({ isExistingUser }, '📨 [STEP-4] Fetching team name and sending email...')

    // ✅ FIX (Jan 2026): Récupérer le vrai nom d'équipe au lieu de passer l'UUID
    const { data: teamData } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', invitation.team_id)
      .single()
    const teamName = teamData?.name || 'votre équipe'

    let emailResult
    if (isExistingUser) {
      // ✅ MULTI-ÉQUIPE: Utilisateur existant = email avec magic link
      emailResult = await emailService.sendTeamAdditionEmail(invitation.email, {
        firstName: invitation.first_name,
        inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
        teamName,
        role: invitation.role,
        magicLinkUrl: magicLink  // ✅ Magic link pour connexion auto + acceptation invitation
      })
      logger.info({ teamName }, '📧 [STEP-4] Using team addition email template')
    } else {
      // Nouvel utilisateur = email d'invitation classique
      emailResult = await emailService.sendInvitationEmail(invitation.email, {
        firstName: invitation.first_name,
        inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
        teamName,
        role: invitation.role,
        invitationUrl: magicLink,
        expiresIn: 7,
      })
      logger.info({ teamName }, '📧 [STEP-4] Using invitation email template')
    }

    if (!emailResult.success) {
      logger.warn({ emailResult: emailResult.error }, '⚠️ [STEP-4] Failed to send email via Resend:')
      // Non bloquant - on retourne quand même le lien
    } else {
      logger.info({ emailResult: emailResult.emailId }, '✅ [STEP-4] Email sent successfully via Resend:')
    }

    // ============================================================================
    // ÉTAPE 5: Retourner le lien pour affichage UI
    // ============================================================================
    return NextResponse.json({
      success: true,
      magicLink: magicLink, // ✅ Important pour affichage dans UI avec bouton copier
      message: 'Invitation renvoyée avec succès',
      emailSent: emailResult.success
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [RESEND-INVITATION] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
