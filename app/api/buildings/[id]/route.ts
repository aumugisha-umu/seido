import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createBuildingService } from '@/lib/services/domain/building.service'
import type { UpdateBuildingDTO } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { updateBuildingSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { notifyBuildingUpdated, notifyBuildingDeleted } from '@/app/actions/notification-actions'
import { createActivityLogger } from '@/lib/activity-logger'

/**
 * GET /api/buildings/[id]
 * Récupère un bâtiment par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH: 42 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    logger.info({ buildingId: id, userId: userProfile.id }, '🏢 [BUILDINGS-API] GET by ID request')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Récupérer le bâtiment avec relations
    const result = await buildingService.getByIdWithRelations(id)

    if (!result.success || !result.data) {
      logger.warn({ buildingId: id }, '⚠️ [BUILDINGS-API] Building not found')
      return NextResponse.json({
        success: false,
        error: 'Bâtiment introuvable'
      }, { status: 404 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building fetched successfully')

    return NextResponse.json({
      success: true,
      building: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in GET by ID')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * PUT /api/buildings/[id]
 * Met à jour un bâtiment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH + ROLE CHECK: 51 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser le body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(updateBuildingSchema, { ...body, id })
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [BUILDINGS-API] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { id: _id, ...validatedData } = validation.data

    logger.info({
      buildingId: id,
      userId: userProfile.id,
      updates: Object.keys(validatedData)
    }, '🏢 [BUILDINGS-API] PUT request - Updating building')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Mettre à jour le bâtiment
    const result = await buildingService.update(id, validatedData as UpdateBuildingDTO)

    if (!result.success) {
      logger.error({ buildingId: id, error: result.error }, '❌ [BUILDINGS-API] Error updating building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la mise à jour du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building updated successfully')

    // 📝 ACTIVITY LOG: Bâtiment modifié
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: result.data!.team_id })
      await activityLogger.logBuildingAction(
        'update',
        id,
        result.data!.name,
        { changes: Object.keys(validatedData) }
      )
      logger.info({ buildingId: id }, '📝 [BUILDINGS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Bâtiment modifié
    try {
      const notifResult = await notifyBuildingUpdated({
        buildingId: id,
        changes: validatedData
      })

      if (notifResult.success) {
        logger.info({ buildingId: id, count: notifResult.data?.length }, '🔔 [BUILDINGS-API] Building update notifications sent')
      } else {
        logger.error({ error: notifResult.error, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to send building update notification')
    }

    return NextResponse.json({
      success: true,
      building: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in PUT')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/buildings/[id]
 * Supprime un bâtiment (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH + ROLE CHECK: 51 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    logger.info({
      buildingId: id,
      userId: userProfile.id
    }, '🏢 [BUILDINGS-API] DELETE request - Deleting building')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Supprimer le bâtiment
    const result = await buildingService.delete(id)

    if (!result.success) {
      logger.error({ buildingId: id, error: result.error }, '❌ [BUILDINGS-API] Error deleting building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la suppression du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building deleted successfully')

    // Note: On ne peut plus accéder au nom/team_id après suppression, donc on les récupère avant
    const buildingName = result.data?.name || 'Bâtiment supprimé'
    const teamId = result.data?.team_id || ''

    // 📝 ACTIVITY LOG: Bâtiment supprimé
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId })
      await activityLogger.logBuildingAction(
        'delete',
        id,
        buildingName
      )
      logger.info({ buildingId: id }, '📝 [BUILDINGS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Bâtiment supprimé
    try {
      const notifResult = await notifyBuildingDeleted({
        id,
        name: buildingName,
        address: result.data?.address || '',
        team_id: teamId
      })

      if (notifResult.success) {
        logger.info({ buildingId: id, count: notifResult.data?.length }, '🔔 [BUILDINGS-API] Building deletion notifications sent')
      } else {
        logger.error({ error: notifResult.error, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, buildingId: id }, '⚠️ [BUILDINGS-API] Failed to send building deletion notification')
    }

    return NextResponse.json({
      success: true,
      message: 'Bâtiment supprimé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in DELETE')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
