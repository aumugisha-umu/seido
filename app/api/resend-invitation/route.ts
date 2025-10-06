import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerUserService } from '@/lib/services'
import { getServerSession } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
import { emailService } from '@/lib/email/email-service'
import type { Database } from '@/lib/database.types'


// Client admin Supabase pour les opérations privilégiées
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: Request) {
  try {
    // ============================================================================
    // ÉTAPE 0: Vérifications préliminaires
    // ============================================================================
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    // Initialize services
    const userService = await createServerUserService()

    // Get current user profile
    const currentUserProfileResult = await userService.getByAuthUserId(session.user.id)
    if (!currentUserProfileResult.success || !currentUserProfileResult.data) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const currentUserProfile = currentUserProfileResult.data

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID d\'invitation manquant' },
        { status: 400 }
      )
    }

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
    // ÉTAPE 2: Générer un nouveau lien d'invitation officiel Supabase
    // ============================================================================
    logger.info({}, '🔗 [STEP-2] Generating official Supabase invitation link...')

    const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite', // ✅ CHANGEMENT: 'invite' au lieu de 'magiclink' pour régénérer une invitation complète
      email: invitation.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          // ✅ Métadonnées complètes pour l'auth user (comme invitation originale)
          full_name: `${invitation.first_name} ${invitation.last_name}`,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          display_name: `${invitation.first_name} ${invitation.last_name}`,
          role: invitation.role,
          provider_category: invitation.provider_category,
          team_id: invitation.team_id,
          password_set: false // ✅ CRITIQUE: Indique que l'utilisateur doit définir son mot de passe
        }
      }
    })

    if (inviteError || !inviteLink?.properties?.action_link) {
      logger.error({ inviteError: inviteError }, '❌ [STEP-2] Failed to generate invitation link:')
      return NextResponse.json(
        { error: 'Échec de la génération du lien d\'invitation: ' + (inviteError?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    const magicLink = inviteLink.properties.action_link
    const hashedToken = inviteLink.properties.hashed_token
    logger.info({ magicLink: magicLink.substring(0, 100) + '...' }, '✅ [STEP-2] Invitation link generated')

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
    // ÉTAPE 4: Envoyer l'email avec le template officiel
    // ============================================================================
    logger.info({}, '📨 [STEP-4] Sending invitation email via Resend...')

    const emailResult = await emailService.sendInvitationEmail(invitation.email, {
      firstName: invitation.first_name,
      inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
      teamName: invitation.team_id,
      role: invitation.role,
      invitationUrl: magicLink, // ✅ Lien officiel Supabase
      expiresIn: 7,
    })

    if (!emailResult.success) {
      logger.warn({ emailResult: emailResult.error }, '⚠️ [STEP-4] Failed to send email via Resend:')
      // Non bloquant - on retourne quand même le lien
    } else {
      logger.info({ emailResult: emailResult.emailId }, '✅ [STEP-4] Invitation email sent successfully via Resend:')
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
