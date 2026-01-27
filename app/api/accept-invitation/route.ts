import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'

/**
 * POST /api/accept-invitation
 * Marque l'invitation comme acceptée quand l'utilisateur définit son mot de passe
 *
 * Body optionnel : { teamId?: string }
 * - Si teamId fourni : accepte l'invitation pour cette équipe spécifique
 * - Sinon : accepte l'invitation la plus récente (comportement legacy)
 */
export async function POST(request: Request) {
  try {
    // ✅ AUTH: Centralized authentication
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { authUser } = authResult.data
    const supabaseAdmin = getServiceRoleClient()

    const userEmail = authUser.email
    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur non trouvé' }, { status: 400 })
    }

    // 🆕 Extraire teamId du body (optionnel pour rétrocompatibilité)
    let teamId: string | null = null
    try {
      const body = await request.json()
      teamId = body.teamId || null
    } catch {
      // Body vide ou invalide = comportement legacy (invitation la plus récente)
    }

    logger.info({ email: userEmail, teamId }, '📧 [ACCEPT-INVITATION] Processing invitation acceptance')

    // ============================================================================
    // ÉTAPE 2: FIND PENDING INVITATION
    // ============================================================================
    let query = supabaseAdmin
      .from('user_invitations')
      .select('id, team_id, status')
      .eq('email', userEmail)
      .eq('status', 'pending')

    // 🆕 Si teamId fourni, cibler cette équipe spécifique
    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data: invitation, error: invitationError } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invitationError) {
      logger.error({ invitationError }, '❌ Error fetching invitation')
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'invitation' },
        { status: 500 }
      )
    }

    if (!invitation) {
      logger.info({}, 'ℹ️ No pending invitation found (user may have been invited before or no invitation exists)')
      return NextResponse.json({
        success: true,
        message: 'Aucune invitation en attente'
      })
    }

    // ============================================================================
    // ÉTAPE 3: UPDATE INVITATION STATUS
    // ============================================================================
    const { error: updateError } = await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      logger.error({ updateError }, '❌ Failed to update invitation status')
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'invitation' },
        { status: 500 }
      )
    }

    logger.info({ invitationId: invitation.id }, '✅ Invitation marked as accepted')

    return NextResponse.json({
      success: true,
      message: 'Invitation acceptée avec succès',
      invitationId: invitation.id
    })

  } catch (error) {
    logger.error({ error }, '❌ Unexpected error in accept-invitation')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
