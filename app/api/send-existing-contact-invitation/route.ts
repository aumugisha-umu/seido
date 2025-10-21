import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerUserService, getServerSession } from '@/lib/services'
import { logger } from '@/lib/logger'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import type { Database } from '@/lib/database.types'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    // ============================================================================
    // ÉTAPE 1: AUTH VERIFICATION
    // ============================================================================
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userService = await createServerUserService()
    const currentUserResult = await userService.getByAuthUserId(session.user.id)
    if (!currentUserResult.success || !currentUserResult.data) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }
    const currentUser = currentUserResult.data

    logger.info({ currentUser: currentUser.id }, '📧 [SEND-EXISTING-CONTACT-INVITATION] Starting process')

    // ============================================================================
    // ÉTAPE 2: GET CONTACT
    // ============================================================================
    const { contactId } = await request.json()
    if (!contactId) {
      return NextResponse.json({ error: 'contactId requis' }, { status: 400 })
    }

    const { data: contact, error: contactError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      logger.error({ contactError }, '❌ Contact not found')
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    logger.info({ contact: contact.id, email: contact.email }, '✅ Contact found')

    // ============================================================================
    // ÉTAPE 3: CHECK EXISTING INVITATION
    // ============================================================================
    const { data: existingInvitation } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('email', contact.email)
      .eq('team_id', contact.team_id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle()

    if (existingInvitation) {
      logger.warn({ invitation: existingInvitation.id }, '⚠️ Invitation already active')
      return NextResponse.json(
        { error: 'Une invitation est déjà active pour ce contact' },
        { status: 409 }
      )
    }

    // ============================================================================
    // ÉTAPE 4: MULTI-TEAM LOGIC - CHECK IF AUTH EXISTS
    // ============================================================================
    logger.info({ email: contact.email }, '🔍 Checking if auth user exists (multi-team support)')

    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = authUsersData?.users?.find(u => u.email === contact.email)

    let authUserId: string
    let invitationUrl: string
    let hashedToken: string
    let isNewAuthUser: boolean

    if (!existingAuthUser) {
      // ========================================================================
      // CAS A: AUTH N'EXISTE PAS - CRÉER NOUVEAU AUTH USER
      // ========================================================================
      logger.info({}, '📝 Auth user does not exist, creating new one')
      isNewAuthUser = true

      const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: contact.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            full_name: contact.name,
            first_name: contact.first_name,
            last_name: contact.last_name,
            role: contact.role,
            provider_category: contact.provider_category,
            team_id: contact.team_id,
            password_set: false
          }
        }
      })

      if (inviteError || !inviteLink) {
        logger.error({ inviteError }, '❌ Failed to generate invite link')
        return NextResponse.json(
          { error: 'Échec génération lien invitation' },
          { status: 500 }
        )
      }

      authUserId = inviteLink.user.id
      hashedToken = inviteLink.properties.hashed_token
      // ✅ Construire l'URL avec notre domaine (pas celui de Supabase dashboard)
      invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`

      logger.info({ authUserId }, '✅ New auth user created')

    } else {
      // ========================================================================
      // CAS B: AUTH EXISTE (AUTRE ÉQUIPE) - RÉUTILISER AUTH EXISTANT
      // ========================================================================
      logger.info({ authUserId: existingAuthUser.id }, '♻️ Auth user already exists (other team), reusing')
      isNewAuthUser = false
      authUserId = existingAuthUser.id

      // Générer magic link (pas invite car auth existe déjà)
      const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: contact.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?team_id=${contact.team_id}`
        }
      })

      if (magicError || !magicLink) {
        logger.error({ magicError }, '❌ Failed to generate magic link')
        return NextResponse.json(
          { error: 'Échec génération lien magique' },
          { status: 500 }
        )
      }

      hashedToken = magicLink.properties.hashed_token
      // ✅ Construire l'URL avec notre domaine (pas celui de Supabase dashboard)
      invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`

      logger.info({}, '✅ Magic link generated for existing auth user')
    }

    // ============================================================================
    // ÉTAPE 5: LINK AUTH TO CONTACT
    // ============================================================================
    logger.info({}, '🔗 Linking auth to contact')

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('id', contactId)

    if (updateError) {
      logger.error({ updateError }, '❌ Failed to link auth to contact')
      // Cleanup: delete auth if we just created it
      if (isNewAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return NextResponse.json(
        { error: 'Échec liaison auth au contact' },
        { status: 500 }
      )
    }

    logger.info({}, '✅ Auth linked to contact')

    // ============================================================================
    // ÉTAPE 6: CREATE INVITATION RECORD
    // ============================================================================
    logger.info({}, '📋 Creating invitation record')

    const { data: invitationRecord, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        role: contact.role,
        provider_category: contact.provider_category,
        team_id: contact.team_id,
        invited_by: currentUser.id,
        invitation_token: hashedToken,
        user_id: contactId,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      logger.warn({ invitationError }, '⚠️ Failed to create invitation record (non-blocking)')
    } else {
      logger.info({ invitationId: invitationRecord.id }, '✅ Invitation record created')
    }

    // ============================================================================
    // ÉTAPE 7: SEND EMAIL
    // ============================================================================
    logger.info({}, '📨 Sending email')

    try {
      if (isNewAuthUser) {
        // Email: "Vous avez été invité à rejoindre [App]"
        await emailService.sendInvitationEmail(contact.email, {
          firstName: contact.first_name,
          inviterName: currentUser.first_name || currentUser.name || 'Un membre',
          teamName: contact.team_id,
          role: contact.role,
          invitationUrl,
          expiresIn: 7
        })
        logger.info({}, '✅ Invitation email sent')
      } else {
        // Email: "Vous avez été ajouté à une nouvelle équipe"
        // TODO: Créer template sendTeamAdditionEmail
        // Pour l'instant, on envoie l'invitation standard
        await emailService.sendInvitationEmail(contact.email, {
          firstName: contact.first_name,
          inviterName: currentUser.first_name || currentUser.name || 'Un membre',
          teamName: contact.team_id,
          role: contact.role,
          invitationUrl,
          expiresIn: 7
        })
        logger.info({}, '✅ Team addition email sent (using invitation template)')
      }
    } catch (emailError) {
      logger.warn({ emailError }, '⚠️ Failed to send email (non-blocking)')
    }

    // ============================================================================
    // ÉTAPE 8: LOG ACTIVITY
    // ============================================================================
    try {
      await supabaseAdmin.from('activity_logs').insert({
        team_id: contact.team_id,
        user_id: currentUser.id,
        action_type: 'invite',
        entity_type: 'contact',
        entity_id: contactId,
        entity_name: contact.name,
        description: `Invitation envoyée à ${contact.name}${isNewAuthUser ? '' : ' (compte existant)'}`,
        status: 'success',
        metadata: { isNewAuthUser, email: contact.email }
      })
      logger.info({}, '✅ Activity logged')
    } catch (logError) {
      logger.warn({ logError }, '⚠️ Failed to log activity (non-blocking)')
    }

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================
    logger.info({}, '🎉 Process completed successfully')

    return NextResponse.json({
      success: true,
      invitationId: invitationRecord?.id,
      isNewAuthUser,
      message: isNewAuthUser
        ? 'Invitation envoyée avec succès'
        : 'Contact ajouté à votre équipe (compte existant réutilisé)'
    })

  } catch (error) {
    logger.error({ error }, '❌ Unexpected error in send-existing-contact-invitation')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
