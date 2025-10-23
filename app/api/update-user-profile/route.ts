import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerUserService } from '@/lib/services'
import { updatePasswordSetSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function PATCH(request: Request) {
  try {
    // ✅ AUTH: getServerSession pattern → getApiAuthContext (26 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUserProfile } = authResult.data
    const userService = await createServerUserService()

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(updatePasswordSetSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [UPDATE-USER-PROFILE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { password_set } = validatedData

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
