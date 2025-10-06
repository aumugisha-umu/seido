import { getServerSession } from '@/lib/services'
import { createServerUserService } from '@/lib/services'
import { NextResponse } from 'next/server'
import { logger, logError } from '@/lib/logger'
export async function PATCH(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Initialiser le service utilisateur
    const userService = await createServerUserService()

    // Récupérer le profil utilisateur pour avoir le bon ID
    const currentUserProfileResult = await userService.getByAuthUserId(session.user.id)
    if (!currentUserProfileResult.success || !currentUserProfileResult.data) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const currentUserProfile = currentUserProfileResult.data

    const body = await request.json()
    const { password_set } = body

    logger.info({ user: currentUserProfile.email, passwordSetTo: password_set }, '🔐 [UPDATE-USER-PROFILE] Updating password_set for user')

    // ✅ SÉCURITÉ: Vérifier que l'utilisateur a vraiment besoin de définir son mot de passe
    if (password_set === true && currentUserProfile.password_set === true) {
      logger.info({}, '⚠️ [UPDATE-USER-PROFILE] User already has password_set=true, rejecting update')
      return NextResponse.json(
        { error: 'Le mot de passe a déjà été configuré' },
        { status: 400 }
      )
    }

    // Mettre à jour le champ password_set
    const updateResult = await userService.update(currentUserProfile.id, {
      password_set: password_set
    })

    if (!updateResult.success) {
      logger.error({ user: updateResult.error }, '❌ [UPDATE-USER-PROFILE] Failed to update user:')
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      )
    }

    logger.info({}, '✅ [UPDATE-USER-PROFILE] User profile updated successfully')

    return NextResponse.json({
      success: true,
      user: updateResult.data
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [UPDATE-USER-PROFILE] Error:')
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du profil' },
      { status: 500 }
    )
  }
}
