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

    const buildings = buildingsResult.success ? (buildingsResult.data || []) : []

    logger.info('✅ [INTERVENTION-PAGE-SERVER] Buildings loaded', {
      buildingCount: buildings.length,
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

    // Prepare data for client component
    const buildingsData = {
      buildings,
      lots,
      teamId
    }

    logger.info('🎉 [INTERVENTION-PAGE-SERVER] All data loaded successfully', {
      buildingCount: buildings.length,
      lotCount: lots.length,
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
