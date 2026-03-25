import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createServerBuildingService } from '@/lib/services/domain/building.service'
import { createBuildingRepository } from '@/lib/services/repositories/building.repository'
import type { CreateBuildingDTO } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createBuildingSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createBuildingNotification } from '@/app/actions/notifications'
import { createActivityLogger } from '@/lib/activity-logger'

/**
 * GET /api/buildings
 * Récupère la liste des bâtiments (filtrable par équipe)
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH: 45 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser query params
    const { searchParams } = new URL(request.url)
    const queryTeamId = searchParams.get('teamId')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    logger.info({ queryTeamId, userId: userProfile.id, role: userProfile.role, teamId: userProfile.team_id }, '🏢 [BUILDINGS-API] GET request')

    // Vérifier que l'utilisateur a une équipe
    if (!userProfile.team_id) {
      logger.warn({ userId: userProfile.id }, '⚠️ [BUILDINGS-API] No team found for user')
      return NextResponse.json({
        success: false,
        error: 'No team'
      }, { status: 403 })
    }

    const teamId = userProfile.team_id

    // Initialiser le service
    const buildingService = await createServerBuildingService()

    // Récupérer les bâtiments de l'équipe
    const result = await buildingService.getBuildingsByTeam(teamId)

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [BUILDINGS-API] Error fetching buildings')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des bâtiments'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [BUILDINGS-API] Buildings fetched successfully')

    // ⚡ CACHE: 5 minutes pour la liste des bâtiments (données relativement stables)
    return NextResponse.json({
      success: true,
      buildings: result.data || []
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error({
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name
    }, '❌ [BUILDINGS-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * POST /api/buildings
 * Crée un nouveau bâtiment
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK: 51 lignes → 3 lignes! (admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser le body
    const body = await request.json()

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(createBuildingSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [BUILDINGS-API] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    logger.info({
      name: validatedData.name,
      teamId: validatedData.team_id,
      userId: userProfile.id
    }, '🏢 [BUILDINGS-API] POST request - Creating building')

    // Initialiser le service
    const buildingService = await createServerBuildingService()

    // Créer le bâtiment
    const result = await buildingService.create({
      ...validatedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [BUILDINGS-API] Error creating building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la création du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: result.data?.id }, '✅ [BUILDINGS-API] Building created successfully')

    // 📝 ACTIVITY LOG: Bâtiment créé
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: validatedData.team_id })
      await activityLogger.logBuildingAction(
        'create',
        result.data!.id,
        result.data!.name,
        { address: validatedData.address, city: validatedData.city }
      )
      logger.info({ buildingId: result.data?.id }, '📝 [BUILDINGS-API] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, buildingId: result.data?.id }, '⚠️ [BUILDINGS-API] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Nouveau bâtiment créé
    try {
      const notifResult = await createBuildingNotification(result.data!.id)

      if (notifResult.success) {
        logger.info({ buildingId: result.data?.id, count: notifResult.data?.length }, '🔔 [BUILDINGS-API] Building creation notifications sent')
      } else {
        logger.error({ error: notifResult.error, buildingId: result.data?.id }, '⚠️ [BUILDINGS-API] Failed to send notifications')
      }
    } catch (notifError) {
      // Ne pas bloquer la réponse si la notification échoue
      logger.error({ error: notifError, buildingId: result.data?.id }, '⚠️ [BUILDINGS-API] Failed to send building creation notification')
    }

    // ⚡ NO-CACHE: Mutations ne doivent pas être cachées
    return NextResponse.json({
      success: true,
      building: result.data
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error({
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name
    }, '❌ [BUILDINGS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
