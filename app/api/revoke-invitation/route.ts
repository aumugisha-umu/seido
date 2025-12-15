import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'
import { revokeInvitationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

/**
 * POST /api/revoke-invitation
 * Révoque l'accès d'un contact (soft delete pattern)
 * - Retrait lien auth (users.auth_user_id = NULL)
 * - Soft delete team membership (team_members.left_at = NOW())
 * - Annulation invitation (user_invitations.status = 'cancelled')
 *
 * Utilise le service role client pour bypasser les RLS policies
 * car le contact invité peut ne pas être accessible via les RLS standard.
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { userProfile: manager } = authResult.data
    const supabaseAdmin = getServiceRoleClient()

    // Parser et valider les données
    const body = await request.json()

    const validation = validateRequest(revokeInvitationSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [REVOKE-INVITATION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { contactId, teamId } = validation.data

    logger.info({
      contactId,
      teamId,
      managerId: manager.id
    }, "🚫 [REVOKE-INVITATION] Starting revocation process")

    // ============================================================================
    // ÉTAPE 1: Vérifier que le contact appartient à la bonne équipe
    // ============================================================================
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('users')
      .select('id, team_id, name, auth_user_id')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      logger.error({ contactError, contactId }, '❌ [REVOKE-INVITATION] Contact not found')
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    if (contact.team_id !== teamId) {
      logger.warn({ contactTeamId: contact.team_id, requestedTeamId: teamId }, '⚠️ [REVOKE-INVITATION] Team mismatch')
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Vérifier que le contact a bien un auth_user_id (sinon rien à révoquer)
    if (!contact.auth_user_id) {
      logger.warn({ contactId }, '⚠️ [REVOKE-INVITATION] Contact has no auth_user_id, nothing to revoke')
      return NextResponse.json({
        success: true,
        message: 'Contact non invité - aucune action nécessaire'
      })
    }

    // ============================================================================
    // ÉTAPE 2: Récupérer l'invitation associée
    // ============================================================================
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('user_invitations')
      .select('id, status')
      .eq('user_id', contactId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invError) {
      logger.error({ invError }, '❌ [REVOKE-INVITATION] Error fetching invitation')
      return NextResponse.json({ error: 'Erreur lors de la récupération de l\'invitation' }, { status: 500 })
    }

    // ============================================================================
    // ÉTAPE 3: Exécuter la révocation (directement, sans RPC si elle n'existe pas)
    // ============================================================================

    // 3a. Supprimer le lien auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ auth_user_id: null })
      .eq('id', contactId)

    if (updateError) {
      logger.error({ updateError }, '❌ [REVOKE-INVITATION] Failed to remove auth link')
      return NextResponse.json({ error: 'Erreur lors de la suppression du lien auth' }, { status: 500 })
    }

    logger.info({ contactId }, '✅ [REVOKE-INVITATION] Auth link removed')

    // 3b. NE PAS soft-delete team membership
    // Le contact reste dans l'équipe, on révoque seulement son accès à l'application
    // (auth_user_id = NULL suffit pour empêcher la connexion)
    logger.info({ contactId, teamId }, 'ℹ️ [REVOKE-INVITATION] Team membership preserved (contact stays in team)')

    // 3c. Annuler l'invitation si elle existe
    if (invitation) {
      const { error: invUpdateError } = await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitation.id)

      if (invUpdateError) {
        logger.warn({ invUpdateError }, '⚠️ [REVOKE-INVITATION] Failed to cancel invitation')
        // Non-bloquant
      } else {
        logger.info({ invitationId: invitation.id, previousStatus: invitation.status }, '✅ [REVOKE-INVITATION] Invitation cancelled')
      }
    }

    // ============================================================================
    // ÉTAPE 4: Log d'activité
    // ============================================================================
    try {
      await supabaseAdmin.from('activity_logs').insert({
        team_id: teamId,
        user_id: manager.id,
        action_type: 'revoke',
        entity_type: 'contact',
        entity_id: contactId,
        entity_name: contact.name,
        description: `Accès révoqué pour le contact "${contact.name}"`,
        status: 'success',
        metadata: { previousInvitationStatus: invitation?.status }
      })
    } catch (logError) {
      logger.warn({ logError }, '⚠️ [REVOKE-INVITATION] Failed to log activity (non-blocking)')
    }

    logger.info({ contactId, contactName: contact.name }, '🎉 [REVOKE-INVITATION] Access revoked successfully')

    return NextResponse.json({
      success: true,
      message: `Accès révoqué pour ${contact.name}`
    })

  } catch (error) {
    logger.error({ error }, "❌ [REVOKE-INVITATION] Unexpected error")
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
