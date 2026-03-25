import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createLotService } from '@/lib/services/domain/lot.service'
import type { LotUpdate } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { updateLotSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { notifyLotUpdated, notifyLotDeleted } from '@/app/actions/notifications'
import { createActivityLogger } from '@/lib/activity-logger'

/**
 * GET /api/lots/[id]
 * Récupère un lot par son ID
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

    logger.info({ lotId: id, userId: userProfile.id }, '🏠 [LOTS-API] GET by ID request')

    // Initialiser le service
    const lotService = await createLotService()

    // Récupérer le lot avec relations
    const result = await lotService.getByIdWithRelations(id)

    if (!result.success || !result.data) {
      logger.warn({ lotId: id }, '⚠️ [LOTS-API] Lot not found')
      return NextResponse.json({
        success: false,
        error: 'Lot introuvable'
      }, { status: 404 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot fetched successfully')

    return NextResponse.json({
      success: true,
      lot: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in GET by ID')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * PUT /api/lots/[id]
 * Met à jour un lot
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
    const validation = validateRequest(updateLotSchema, { ...body, id })
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [LOTS-API] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { id: _id, ...validatedData } = validation.data

    logger.info({
      lotId: id,
      userId: userProfile.id,
      updates: Object.keys(validatedData)
    }, '🏠 [LOTS-API] PUT request - Updating lot')

    // Initialiser le service
    const lotService = await createLotService()

    // Mettre à jour le lot
    const result = await lotService.update(id, validatedData as LotUpdate)

    if (!result.success) {
      logger.error({ lotId: id, error: result.error }, '❌ [LOTS-API] Error updating lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la mise à jour du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot updated successfully')

    // 📝 ACTIVITY LOG: Lot modifié
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: userProfile.team_id || '' })
      await activityLogger.logLotAction(
        'update',
        id,
        result.data!.reference,
        { changes: Object.keys(validatedData) }
      )
      logger.info({ lotId: id }, '📝 [LOTS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, lotId: id }, '⚠️ [LOTS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Lot modifié
    try {
      const notifResult = await notifyLotUpdated({
        lotId: id,
        changes: validatedData
      })

      if (notifResult.success) {
        logger.info({ lotId: id, count: notifResult.data?.length }, '🔔 [LOTS-API] Lot update notifications sent')
      } else {
        logger.error({ error: notifResult.error, lotId: id }, '⚠️ [LOTS-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, lotId: id }, '⚠️ [LOTS-API] Failed to send lot update notification')
    }

    return NextResponse.json({
      success: true,
      lot: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in PUT')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/lots/[id]
 * Supprime un lot
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
      lotId: id,
      userId: userProfile.id
    }, '🏠 [LOTS-API] DELETE request - Deleting lot')

    // Initialiser le service
    const lotService = await createLotService()

    // Supprimer le lot
    const result = await lotService.delete(id)

    if (!result.success) {
      logger.error({ lotId: id, error: result.error }, '❌ [LOTS-API] Error deleting lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la suppression du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot deleted successfully')

    const lotReference = result.data?.reference || 'Lot supprimé'
    const buildingId = result.data?.building_id || ''

    // 📝 ACTIVITY LOG: Lot supprimé
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: userProfile.team_id || '' })
      await activityLogger.logLotAction(
        'delete',
        id,
        lotReference
      )
      logger.info({ lotId: id }, '📝 [LOTS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, lotId: id }, '⚠️ [LOTS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Lot supprimé
    try {
      const notifResult = await notifyLotDeleted({
        id,
        reference: lotReference,
        building_id: buildingId,
        team_id: result.data?.team_id || userProfile.team_id || ''
      })

      if (notifResult.success) {
        logger.info({ lotId: id, count: notifResult.data?.length }, '🔔 [LOTS-API] Lot deletion notifications sent')
      } else {
        logger.error({ error: notifResult.error, lotId: id }, '⚠️ [LOTS-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, lotId: id }, '⚠️ [LOTS-API] Failed to send lot deletion notification')
    }

    return NextResponse.json({
      success: true,
      message: 'Lot supprimé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in DELETE')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
