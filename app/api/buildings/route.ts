import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createBuildingService } from '@/lib/services/domain/building.service'
import { createBuildingRepository } from '@/lib/services/repositories/building.repository'
import type { CreateBuildingDTO } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'

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
    const teamId = searchParams.get('teamId')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    logger.info({ teamId, userId: userProfile.id, role: userProfile.role }, '🏢 [BUILDINGS-API] GET request')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Récupérer les bâtiments
    let result
    if (teamId) {
      result = await buildingService.getBuildingsByTeam(teamId, {
        userId: userProfile.id,
        userRole: userProfile.role
      })
    } else if (page && limit) {
      result = await buildingService.getAll({
        page: parseInt(page),
        limit: parseInt(limit)
      })
    } else {
      result = await buildingService.getAll()
    }

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [BUILDINGS-API] Error fetching buildings')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des bâtiments'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [BUILDINGS-API] Buildings fetched successfully')

    return NextResponse.json({
      success: true,
      buildings: result.data || []
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error')
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
    const body: CreateBuildingDTO = await request.json()

    logger.info({
      name: body.name,
      teamId: body.team_id,
      userId: userProfile.id
    }, '🏢 [BUILDINGS-API] POST request - Creating building')

    // Valider les champs requis
    if (!body.name || !body.address || !body.city || !body.postal_code || !body.team_id || !body.gestionnaire_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : name, address, city, postal_code, team_id, gestionnaire_id'
      }, { status: 400 })
    }

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Créer le bâtiment
    const result = await buildingService.create({
      ...body,
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

    return NextResponse.json({
      success: true,
      building: result.data
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
