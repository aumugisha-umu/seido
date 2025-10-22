import { NextRequest, NextResponse } from "next/server"
import { createServerContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * POST /api/revoke-invitation
 * Révoque l'accès d'un contact (soft delete pattern)
 * - Retrait lien auth (users.auth_user_id = NULL)
 * - Soft delete team membership (team_members.left_at = NOW())
 * - Annulation invitation (user_invitations.status = 'cancelled')
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK: 20 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { userProfile: managerResult } = authResult.data

    // 3. Parser les données de la requête
    const { contactId, teamId } = await request.json()

    if (!contactId || !teamId) {
      return NextResponse.json({
        error: "Contact ID et Team ID requis"
      }, { status: 400 })
    }

    logger.info({
      contactId,
      teamId,
      managerId: managerResult.data.id
    }, "🚫 Starting revocation process")

    // 4. Déléguer la révocation au service
    const invitationService = await createServerContactInvitationService()
    const result = await invitationService.revokeAccess(
      contactId,
      teamId
    )

    if (!result.success) {
      const statusCode = result.error.code === 'FORBIDDEN' ? 403
                        : result.error.code === 'NOT_FOUND' ? 404
                        : 400

      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode }
      )
    }

    // 5. Retour succès
    return NextResponse.json({
      success: true,
      message: result.data.message
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in revoke-invitation API")
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
