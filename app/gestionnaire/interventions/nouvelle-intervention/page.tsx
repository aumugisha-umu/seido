// Server Component - loads data server-side
import {
  createServerSupabaseClient,
  createServerTeamService,
  createServerBuildingService,
  createServerLotService,
  createServerUserService
} from '@/lib/services'
import NouvelleInterventionClient from './nouvelle-intervention-client'
import { logger } from '@/lib/logger'

export default async function NouvelleInterventionPage() {
  const startTime = Date.now()

  logger.info('🚀 [INTERVENTION-PAGE-SERVER] Loading intervention creation page', {
    timestamp: new Date().toISOString()
  })

  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('❌ [INTERVENTION-PAGE-SERVER] Authentication failed', {
        error: authError?.message
      })
      throw new Error('Authentication required')
    }

    logger.info('✅ [INTERVENTION-PAGE-SERVER] User authenticated', {
      userId: user.id,
      email: user.email
    })

    // Initialize services (server-side)
    const userService = await createServerUserService()
    const teamService = await createServerTeamService()
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()

    // Get internal user ID (convert auth_user_id → users.id)
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Looking up user profile...')
    const userProfileResult = await userService.getByAuthUserId(user.id)

    if (!userProfileResult.success || !userProfileResult.data) {
      logger.error('❌ [INTERVENTION-PAGE-SERVER] User profile not found', {
        authUserId: user.id,
        error: userProfileResult.error
      })
      throw new Error('User profile not found')
    }

    const internalUserId = userProfileResult.data.id
    logger.info('✅ [INTERVENTION-PAGE-SERVER] User profile loaded', {
      internalUserId,
      authUserId: user.id,
      email: userProfileResult.data.email
    })

    // Step 1: Get user's team (using internal user ID)
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 1: Loading user team...')
    const teamsResult = await teamService.getUserTeams(internalUserId)

    if (!teamsResult.success || !teamsResult.data || teamsResult.data.length === 0) {
      logger.warn('⚠️ [INTERVENTION-PAGE-SERVER] No team found for user', {
        internalUserId,
        authUserId: user.id
      })
      // Return empty data if no team found
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

    const team = teamsResult.data[0]
    const teamId = team.id

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Team loaded', {
      teamId,
      teamName: team.name,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Step 2: Load buildings for the team
    logger.info('📍 [INTERVENTION-PAGE-SERVER] Step 2: Loading buildings...')
    const buildingsResult = await buildingService.getBuildingsByTeam(teamId)

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
    const lotsResult = await lotService.getLotsByTeam(teamId)

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
      teamId
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
