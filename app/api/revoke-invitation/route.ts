import { NextRequest, NextResponse } from "next/server"
import { createServerUserService, createServerContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * POST /api/revoke-invitation
 * Révoque l'accès d'un contact (soft delete pattern)
 * - Retrait lien auth (users.auth_user_id = NULL)
 * - Soft delete team membership (team_members.left_at = NOW())
 * - Annulation invitation (user_invitations.status = 'cancelled')
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer la session utilisateur
    const userService = await createServerUserService()
    const session = await userService['repository']['supabase'].auth.getUser()

    if (!session.data.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // 2. Récupérer et vérifier le profil gestionnaire
    const managerResult = await userService.getByAuthUserId(session.data.user.id)

    if (!managerResult.success || !managerResult.data) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 })
    }

    if (managerResult.data.role !== 'gestionnaire' && managerResult.data.role !== 'admin') {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

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
