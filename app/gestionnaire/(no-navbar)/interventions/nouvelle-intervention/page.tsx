// Server Component - loads data server-side
import {
  createServerBuildingService,
  createServerLotService,
  createServerContractService,
  createServerSupabaseClient
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import NouvelleInterventionClient from './nouvelle-intervention-client'
import { logger } from '@/lib/logger'
import { getInterventionTypesServer } from '@/lib/services/domain/intervention-types.server'

export default async function NouvelleInterventionPage() {
  const startTime = Date.now()

  logger.info('🚀 [INTERVENTION-PAGE-SERVER] Loading intervention creation page', {
    timestamp: new Date().toISOString()
  })

  try {
    // ✅ AUTH + TEAM + PROFILE en 1 ligne (cached via React.cache())
    // Remplace ~50 lignes d'auth manuelle !
    const { team, profile } = await getServerAuthContext('gestionnaire')

    // ✅ Defensive guard: ensure team exists before accessing team.id
    if (!team || !team.id) {
      logger.warn('⚠️ [INTERVENTION-PAGE-SERVER] Missing team in auth context, rendering empty state')
      return (
        <NouvelleInterventionClient
          initialBuildingsData={{
            buildings: [],
            lots: [],
            teamId: null,
            userId: null
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

    // ✅ 2025-12-10: Get occupied lot IDs from ACTIVE CONTRACTS FIRST (before transforming buildings)
    let occupiedLotIds = new Set<string>()
    try {
      const contractService = await createServerContractService()
      const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
      if (occupiedResult.success) {
        occupiedLotIds = occupiedResult.data
        logger.info('✅ [INTERVENTION-PAGE-SERVER] Occupied lots from contracts:', {
          count: occupiedLotIds.size
        })
      }
    } catch (error) {
      logger.warn('⚠️ [INTERVENTION-PAGE-SERVER] Could not get occupied lots from contracts')
    }

    // Step 2.5: Transform lots inside buildings to add status field
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 2.5: Transforming lots inside buildings...')
    buildings = buildings.map((building: any) => ({
      ...building,
      lots: (building.lots || []).map((lot: any) => {
        // ✅ 2025-12-10: Utiliser contrats actifs au lieu de lot_contacts
        const isOccupied = occupiedLotIds.has(lot.id)
        return {
          ...lot,
          is_occupied: isOccupied,
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
      // ✅ 2025-12-10: Utiliser contrats actifs au lieu de lot_contacts
      const isOccupied = occupiedLotIds.has(lot.id)
      const transformed = {
        ...lot,
        is_occupied: isOccupied,
        status: isOccupied ? "occupied" : "vacant",
        building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
      }

      // DEBUG: Log transformation for each lot
      if (lot.reference?.includes('Appartement')) {
        logger.info(`🔍 [DEBUG] Lot transformation: ${lot.reference}`, {
          lotId: lot.id,
          inOccupiedSet: occupiedLotIds.has(lot.id),
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

    // ✅ Count existing interventions for default title numbering
    let interventionCount = 0
    try {
      const supabase = await createServerSupabaseClient()
      const { count } = await supabase
        .from('interventions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .is('deleted_at', null)
      interventionCount = count || 0
    } catch (countError) {
      logger.warn('⚠️ Could not count interventions:', countError)
    }

    // ✅ 2026-01-08: Pre-fetch intervention types server-side to avoid loading delay
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 5: Loading intervention types...')
    const interventionTypes = await getInterventionTypesServer()
    logger.info('✅ [INTERVENTION-PAGE-SERVER] Intervention types loaded', {
      typeCount: interventionTypes?.types?.length || 0,
      categoryCount: interventionTypes?.categories?.length || 0,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Prepare data for client component
    const buildingsData = {
      buildings,
      lots: transformedLots,
      teamId: team.id,
      userId: profile.id,  // ✅ Passer userId pour pré-sélection gestionnaire
      interventionCount     // ✅ Pour numérotation titre par défaut
    }

    logger.info('🎉 [INTERVENTION-PAGE-SERVER] All data loaded successfully', {
      buildingCount: buildings.length,
      lotCount: transformedLots.length,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return (
      <NouvelleInterventionClient
        initialBuildingsData={buildingsData}
        initialInterventionTypes={interventionTypes}
      />
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
          teamId: null,
          userId: null
        }}
      />
    )
  }
}
