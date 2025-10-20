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

    // ⚡ PERFORMANCE OPTIMIZATION: Use summary query for list view (90% less data)
    // 2. Récupérer les buildings de l'équipe (version légère)
    const buildingsResult = await buildingService.getBuildingsByTeamSummary(teamId)

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
    logger.info(`🏗️ [BIENS-PAGE] Loaded ${buildings.length} buildings (summary view)`)

    // 3. Récupérer TOUS les lots de l'équipe (incluant lots indépendants)
    logger.info(`🏠 [BIENS-PAGE] Loading ALL lots for team ${teamId} (including independent lots)`)

    const lotsResult = await lotService.getLotsByTeam(teamId)

    if (!lotsResult.success || !lotsResult.data) {
      logger.error("❌ [BIENS-PAGE] Error fetching team lots")
      return (
        <BiensPageClient
          initialBuildings={buildings}
          initialLots={[]}
          teamId={teamId}
        />
      )
    }

    const allLots = lotsResult.data
    logger.info(`🏠 [BIENS-PAGE] Loaded ${allLots.length} total lots for team`)

    // Initialize lots array for each building
    buildings.forEach((building: any) => {
      building.lots = []
    })

    // Séparer les lots et les attacher aux buildings correspondants
    const independentLots: any[] = []

    allLots.forEach((lot: any) => {
      // ✅ Phase 2: Calculate status from is_occupied
      const isOccupied = lot.is_occupied || false
      const lotWithStatus = {
        ...lot,
        status: isOccupied ? "occupied" : "vacant"
      }

      if (lot.building_id) {
        // Lot lié à un immeuble - attacher au building
        const building = buildings.find((b: any) => b.id === lot.building_id)
        if (building) {
          if (!building.lots) building.lots = []
          building.lots.push({
            ...lotWithStatus,
            building_name: building.name
          })
        }
      } else {
        // Lot indépendant (building_id: NULL)
        independentLots.push({
          ...lotWithStatus,
          building_name: null  // Pas d'immeuble associé
        })
      }
    })

    logger.info(`🏢 [BIENS-PAGE] Lots by building: ${allLots.length - independentLots.length}`)
    logger.info(`🏠 [BIENS-PAGE] Independent lots: ${independentLots.length}`)
    logger.info(`📊 [BIENS-PAGE] Total lots: ${allLots.length}`)

    // ✅ FIX: Pass ALL lots for display in Lots tab, not just independent ones
    // ✅ Phase 2: Calculate status from is_occupied (calculated by repository)
    const allLotsForDisplay = allLots.map((lot: any) => {
      const isOccupied = lot.is_occupied || false
      return {
        ...lot,
        status: isOccupied ? "occupied" : "vacant",
        building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
      }
    })
    logger.info(`📊 [BIENS-PAGE] Server data ready - Buildings: ${buildings.length}, Total lots for display: ${allLotsForDisplay.length}`)

    // ✅ Pass data to Client Component
    return (
      <BiensPageClient
        initialBuildings={buildings}
        initialLots={allLotsForDisplay}
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
