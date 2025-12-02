import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createLotService } from '@/lib/services/domain/lot.service'
import type { LotInsert } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createLotSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createLotNotification } from '@/app/actions/notification-actions'
import { createActivityLogger } from '@/lib/activity-logger'

/**
 * GET /api/lots
 * Récupère la liste des lots (filtrable par building ou team)
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH: 45 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser query params
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    logger.info({
      buildingId,
      userId: userProfile.id,
      role: userProfile.role
    }, '🏠 [LOTS-API] GET request')

    // Initialiser le service
    const lotService = await createLotService()

    // Récupérer les lots
    let result
    if (buildingId) {
      result = await lotService.getLotsByBuilding(buildingId)
    } else if (page && limit) {
      result = await lotService.getAll({
        page: parseInt(page),
        limit: parseInt(limit)
      })
    } else {
      result = await lotService.getAll()
    }

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [LOTS-API] Error fetching lots')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des lots'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [LOTS-API] Lots fetched successfully')

    // ⚡ CACHE: 5 minutes pour la liste des lots (données relativement stables)
    return NextResponse.json({
      success: true,
      lots: result.data || []
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * POST /api/lots
 * Crée un nouveau lot
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK: 51 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser le body
    const body = await request.json()

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(createLotSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [LOTS-API] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    logger.info({
      reference: validatedData.reference,
      buildingId: validatedData.building_id,
      userId: userProfile.id
    }, '🏠 [LOTS-API] POST request - Creating lot')

    // Initialiser le service
    const lotService = await createLotService()

    // Créer le lot
    const result = await lotService.create({
      ...validatedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [LOTS-API] Error creating lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la création du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: result.data?.id }, '✅ [LOTS-API] Lot created successfully')

    // 📝 ACTIVITY LOG: Lot créé
    try {
      const activityLogger = await createActivityLogger()
      // Note: team_id isn't directly on lot, we'd need to fetch building's team_id
      // For now, using userProfile's team as fallback
      activityLogger.setContext({ userId: userProfile.id, teamId: userProfile.team_id || '' })
      await activityLogger.logLotAction(
        'create',
        result.data!.id,
        result.data!.reference,
        { building_id: validatedData.building_id, category: validatedData.category }
      )
      logger.info({ lotId: result.data?.id }, '📝 [LOTS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, lotId: result.data?.id }, '⚠️ [LOTS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Nouveau lot créé
    try {
      const notifResult = await createLotNotification(result.data!.id)

      if (notifResult.success) {
        logger.info({ lotId: result.data?.id, count: notifResult.data?.length }, '🔔 [LOTS-API] Lot creation notifications sent')
      } else {
        logger.error({ error: notifResult.error, lotId: result.data?.id }, '⚠️ [LOTS-API] Failed to send notifications')
      }
    } catch (notifError) {
      logger.error({ error: notifError, lotId: result.data?.id }, '⚠️ [LOTS-API] Failed to send lot creation notification')
    }

    // ⚡ NO-CACHE: Mutations ne doivent pas être cachées
    return NextResponse.json({
      success: true,
      lot: result.data
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
