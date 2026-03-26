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

    // ── Phase 0: Service instantiation (all stateless factories) ──────────
    const [buildingService, lotService, contractService, supabase] = await Promise.all([
      createServerBuildingService(),
      createServerLotService(),
      createServerContractService(),
      createServerSupabaseClient(),
    ])

    // ── Wave 1: All independent queries in parallel ───────────────────────
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Wave 1: Loading all data in parallel...')
    const [buildingsResult, occupiedResult, lotsResult, countResult, interventionTypes] = await Promise.all([
      buildingService.getBuildingsByTeam(team.id),
      contractService.getOccupiedLotIdsByTeam(team.id).catch(() => ({ success: false as const, data: new Set<string>() })),
      lotService.getLotsByTeam(team.id),
      supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('team_id', team.id).is('deleted_at', null),
      getInterventionTypesServer(),
    ])

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Wave 1 complete', { elapsed: `${Date.now() - startTime}ms` })

    // ── Sequential transforms (CPU only, no DB) ──────────────────────────
    const occupiedLotIds = occupiedResult.success ? occupiedResult.data : new Set<string>()

    let buildings = buildingsResult.success ? (buildingsResult.data || []) : []
    buildings = buildings.map((building: any) => ({
      ...building,
      lots: (building.lots || []).map((lot: any) => {
        const isOccupied = occupiedLotIds.has(lot.id)
        return { ...lot, is_occupied: isOccupied, status: isOccupied ? "occupied" : "vacant" }
      })
    }))

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Buildings lots transformed', {
      buildingCount: buildings.length,
      totalLotsInBuildings: buildings.reduce((sum: number, b: any) => sum + (b.lots?.length || 0), 0),
      elapsed: `${Date.now() - startTime}ms`
    })

    const lots = lotsResult.success ? (lotsResult.data || []) : []
    const transformedLots = lots.map((lot: any) => {
      const isOccupied = occupiedLotIds.has(lot.id)
      return {
        ...lot,
        is_occupied: isOccupied,
        status: isOccupied ? "occupied" : "vacant",
        building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
      }
    })

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Lots transformed', {
      lotCount: transformedLots.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    const interventionCount = countResult.count || 0

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
