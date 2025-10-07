import { BiensPageClient } from './biens-page-client'
import {
  createServerBuildingService,
  createServerLotService,
  createServerTeamService
} from '@/lib/services'
import { logger } from '@/lib/logger'
import { requireRole } from '@/lib/auth-dal'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function BiensPage() {
  try {
    // ✅ LAYER 1: Auth validation FIRST (Dashboard pattern)
    logger.info("🔵 [BIENS-PAGE] Server-side fetch starting")
    const { user, profile } = await requireRole(['gestionnaire'])

    // ✅ LAYER 2: Create services AFTER auth validation
    const teamService = await createServerTeamService()
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()

    // 1. Récupérer l'équipe de l'utilisateur
    // 🔍 CORRECTIF: Utiliser profile.id (users table ID) au lieu de user.id (auth_user_id)
    const teamsResult = await teamService.getUserTeams(profile.id)
    const teams = teamsResult?.data || []

    if (!teams || teams.length === 0) {
      logger.info("⚠️ [BIENS-PAGE] No team found for user")
      return (
        <BiensPageClient
          initialBuildings={[]}
          initialLots={[]}
          teamId={null}
        />
      )
    }

    const teamId = teams[0].id
    logger.info(`🏢 [BIENS-PAGE] Found team: ${teamId}`)

    // 2. Récupérer les buildings de l'équipe
    const buildingsResult = await buildingService.getBuildingsByTeam(teamId)

    if (!buildingsResult.success || !buildingsResult.data) {
      logger.error("❌ [BIENS-PAGE] Error fetching buildings")
      return (
        <BiensPageClient
          initialBuildings={[]}
          initialLots={[]}
          teamId={teamId}
        />
      )
    }

    const buildings = buildingsResult.data
    logger.info(`🏗️ [BIENS-PAGE] Loaded ${buildings.length} buildings`)

    // 3. Récupérer les lots pour chaque building EN PARALLÈLE
    logger.info(`🏠 [BIENS-PAGE] Loading lots for ${buildings.length} buildings IN PARALLEL`)

    const lotsPromises = buildings.map(building =>
      lotService.getLotsByBuilding(building.id)
        .then(response => ({
          buildingId: building.id,
          buildingName: building.name,
          lots: response.success ? response.data : [],
          success: true
        }))
        .catch(error => ({
          buildingId: building.id,
          buildingName: building.name,
          lots: [],
          success: false,
          error: String(error)
        }))
    )

    const lotsResults = await Promise.all(lotsPromises)
    const allLots: any[] = []

    // Traiter les résultats et attacher aux buildings
    lotsResults.forEach((result, index) => {
      const building = buildings[index]

      if (result.success && result.lots) {
        const buildingLots = result.lots.map((lot: any) => ({
          ...lot,
          building_name: building.name
        }))

        building.lots = buildingLots
        allLots.push(...buildingLots)
        logger.info(`✅ [BIENS-PAGE] Loaded ${buildingLots.length} lots for ${result.buildingName}`)
      } else {
        building.lots = []
        if (!result.success) {
          logger.error(`❌ [BIENS-PAGE] Error loading lots for ${result.buildingName}: ${result.error}`)
        }
      }
    })

    logger.info(`🏠 [BIENS-PAGE] Total lots loaded: ${allLots.length} (parallel fetch)`)
    logger.info(`📊 [BIENS-PAGE] Server data ready - Buildings: ${buildings.length}, Lots: ${allLots.length}`)

    // ✅ Pass data to Client Component
    return (
      <BiensPageClient
        initialBuildings={buildings}
        initialLots={allLots}
        teamId={teamId}
      />
    )
  } catch (error) {
    logger.error("❌ [BIENS-PAGE] Server error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state
    return (
      <BiensPageClient
        initialBuildings={[]}
        initialLots={[]}
        teamId={null}
      />
    )
  }
}
