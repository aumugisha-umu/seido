// Server Component - loads data server-side
import {
  createServerBuildingService,
  createServerLotService
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import NouvelleInterventionClient from './nouvelle-intervention-client'
import { logger } from '@/lib/logger'

export default async function NouvelleInterventionPage() {
  const startTime = Date.now()

  logger.info('🚀 [INTERVENTION-PAGE-SERVER] Loading intervention creation page', {
    timestamp: new Date().toISOString()
  })

  try {
    // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
    // Remplace ~50 lignes d'auth manuelle !
    const { team } = await getServerAuthContext('gestionnaire')

    // ✅ Defensive guard: ensure team exists before accessing team.id
    if (!team || !team.id) {
      logger.warn('⚠️ [INTERVENTION-PAGE-SERVER] Missing team in auth context, rendering empty state')
      return (
        <NouvelleInterventionClient
          initialBuildingsData={{
            buildings: [],
            lots: [],
            teamId: null
          }}
        />
      )
    }

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Auth context loaded', {
      teamId: team.id,
      teamName: team.name
    })

    // Initialize services
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()

    // Step 2: Load buildings for the team
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 2: Loading buildings...')
    const buildingsResult = await buildingService.getBuildingsByTeam(team.id)

    let buildings = buildingsResult.success ? (buildingsResult.data || []) : []

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Buildings loaded', {
      buildingCount: buildings.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Step 2.5: Transform lots inside buildings to add status field
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 2.5: Transforming lots inside buildings...')
    buildings = buildings.map((building: any) => ({
      ...building,
      lots: (building.lots || []).map((lot: any) => {
        const isOccupied = lot.is_occupied || false
        return {
          ...lot,
          status: isOccupied ? "occupied" : "vacant"
        }
      })
    }))

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Buildings lots transformed', {
      buildingCount: buildings.length,
      totalLotsInBuildings: buildings.reduce((sum: number, b: any) => sum + (b.lots?.length || 0), 0),
      elapsed: `${Date.now() - startTime}ms`
    })

    // Step 3: Load all lots for the team (independent + building-attached)
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 3: Loading lots...')
    const lotsResult = await lotService.getLotsByTeam(team.id)

    const lots = lotsResult.success ? (lotsResult.data || []) : []

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Lots loaded', {
      lotCount: lots.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Step 4: Transform lots to add status field and debug data
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 4: Transforming lots data...')

    // DEBUG: Check raw lots data from repository
    logger.info('🔍 [DEBUG] Raw lots from repository:', {
      count: lots.length,
      firstLot: lots[0] ? {
        id: lots[0].id,
        reference: lots[0].reference,
        is_occupied: lots[0].is_occupied,
        status: lots[0].status,
        lot_contacts_count: lots[0].lot_contacts?.length || 0,
        tenant: lots[0].tenant?.name || null
      } : null
    })

    const transformedLots = lots.map((lot: any) => {
      const isOccupied = lot.is_occupied || false
      const transformed = {
        ...lot,
        status: isOccupied ? "occupied" : "vacant",
        building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
      }

      // DEBUG: Log transformation for each lot
      if (lot.reference?.includes('Appartement')) {
        logger.info(`🔍 [DEBUG] Lot transformation: ${lot.reference}`, {
          original_is_occupied: lot.is_occupied,
          original_status: lot.status,
          lot_contacts_count: lot.lot_contacts?.length || 0,
          calculated_isOccupied: isOccupied,
          final_status: transformed.status
        })
      }

      return transformed
    })

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Lots transformed', {
      lotCount: transformedLots.length,
      elapsed: `${Date.now() - startTime}ms`,
      sample: transformedLots[0] ? {
        reference: transformedLots[0].reference,
        status: transformedLots[0].status,
        is_occupied: transformedLots[0].is_occupied
      } : null
    })

    // Prepare data for client component
    const buildingsData = {
      buildings,
      lots: transformedLots,
      teamId: team.id
    }

    logger.info('🎉 [INTERVENTION-PAGE-SERVER] All data loaded successfully', {
      buildingCount: buildings.length,
      lotCount: transformedLots.length,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return (
      <NouvelleInterventionClient initialBuildingsData={buildingsData} />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [INTERVENTION-PAGE-SERVER] Failed to load intervention page data', {
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Return with empty data on error
    return (
      <NouvelleInterventionClient
        initialBuildingsData={{
          buildings: [],
          lots: [],
          teamId: null
        }}
      />
    )
  }
}
