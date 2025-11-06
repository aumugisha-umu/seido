import { BiensPageClient } from './biens-page-client'
import {
  createServerBuildingService,
  createServerLotService
} from '@/lib/services'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function BiensPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  logger.info("🔵 [BIENS-PAGE] Server-side fetch starting")
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  let buildings: any[] = []
  let allLots: any[] = []

  try {
    logger.info('🔧 [BIENS-PAGE] Starting service initialization...')

    // Initialiser les services (Server Components = read-only)
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()

    logger.info('✅ [BIENS-PAGE] All services initialized successfully')
    logger.info('📦 [BIENS-PAGE] Using team ID from context:', team.id)

    // ⚡ Charger buildings et lots en parallèle (pattern dashboard)
    logger.info('🏗️ [BIENS-PAGE] Starting data loading for team:', team.id)

    const buildingsResult = await buildingService.getBuildingsByTeam(team.id)

    if (buildingsResult.success && buildingsResult.data) {
      buildings = (buildingsResult.data || []) as any[]
      logger.info('✅ [BIENS-PAGE] Buildings loaded:', buildings.length)
    } else {
      logger.error('❌ [BIENS-PAGE] Error loading buildings:', buildingsResult.error || 'No data')
    }

    // Récupérer TOUS les lots de l'équipe (incluant lots indépendants)
    logger.info(`🏠 [BIENS-PAGE] Loading ALL lots for team ${team.id} (including independent lots)`)
    const lotsResult = await lotService.getLotsByTeam(team.id)

    if (lotsResult.success && lotsResult.data) {
      allLots = lotsResult.data || []
      logger.info('✅ [BIENS-PAGE] ALL lots loaded:', allLots.length, '(including independent lots)')

      // Log breakdown for debugging
      const buildingLots = allLots.filter(lot => lot.building_id)
      const independentLots = allLots.filter(lot => !lot.building_id)
      logger.info('  → Building-linked lots:', buildingLots.length)
      logger.info('  → Independent lots:', independentLots.length)
    } else {
      logger.error('❌ [BIENS-PAGE] Error loading lots:', lotsResult.error || 'No data')
    }

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
    logger.info(`📊 [BIENS-PAGE] Server data ready - Buildings: ${buildings.length}, Total lots for display: ${allLotsForDisplay.length}`, {
      buildingsIsArray: Array.isArray(buildings),
      lotsIsArray: Array.isArray(allLotsForDisplay),
      buildingsCount: buildings.length,
      lotsCount: allLotsForDisplay.length,
      teamId: team.id
    })

    // ✅ Ensure arrays before passing to Client Component
    const safeBuildings = Array.isArray(buildings) ? buildings : []
    const safeLots = Array.isArray(allLotsForDisplay) ? allLotsForDisplay : []

    // ✅ Pass data to Client Component
    return (
      <BiensPageClient
        initialBuildings={safeBuildings}
        initialLots={safeLots}
        teamId={team.id}
      />
    )
  } catch (error) {
    // Capturer toutes les propriétés de l'erreur pour diagnostic complet
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    }

    logger.error('❌ [BIENS-PAGE] Error loading data - Full Details:')
    logger.error(JSON.stringify(errorDetails, null, 2))

    // Cas spécial : erreur Supabase avec code
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint
      }
      logger.error('❌ [BIENS-PAGE] Supabase error details:')
      logger.error(JSON.stringify(supabaseError, null, 2))
    }

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state with teamId from context
    return (
      <BiensPageClient
        initialBuildings={[]}
        initialLots={[]}
        teamId={team?.id || null}
      />
    )
  }
}
