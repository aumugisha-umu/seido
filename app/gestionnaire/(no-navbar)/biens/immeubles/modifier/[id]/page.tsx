import { redirect } from "next/navigation"
import { getServerAuthContext } from "@/lib/server-context"
import { createServerBuildingService, createServerTeamService } from "@/lib/services"
import EditBuildingClient from "./edit-building-client"
import { transformBuildingForEdit } from "@/lib/utils/building-transform"
import { logger } from "@/lib/logger"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBuildingPage({ params }: PageProps) {
  const resolvedParams = await params

  // ✅ Centralized auth + team fetching
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  if (!user || !profile || !team) {
    redirect('/login')
  }

  // Initialize services
  const buildingService = await createServerBuildingService()
  const teamService = await createServerTeamService()

  try {
    // STEP 1: Log start of loading process
    logger.info(`[EDIT-BUILDING] Loading building ${resolvedParams.id} for team ${team.id}`)

    const buildingResult = await buildingService.getByIdWithRelations(resolvedParams.id)

    // STEP 2: Log query result
    logger.info(`[EDIT-BUILDING] Query result:`, {
      success: buildingResult.success,
      hasData: !!buildingResult.data,
      error: buildingResult.success ? null : buildingResult.error
    })

    // STEP 3: Check query success with detailed error
    if (!buildingResult.success || !buildingResult.data) {
      logger.error(`[EDIT-BUILDING] Building not found or query failed`, {
        buildingId: resolvedParams.id,
        success: buildingResult.success,
        error: buildingResult.error
      })
      redirect('/gestionnaire/biens')
    }

    const building = buildingResult.data

    // STEP 4: Log building data structure
    logger.info(`[EDIT-BUILDING] Building loaded:`, {
      buildingId: building.id,
      buildingName: building.name,
      buildingTeamId: building.team_id,
      userTeamId: team.id,
      lotsCount: building.lots?.length || 0,
      buildingContactsCount: building.building_contacts?.length || 0
    })

    // STEP 5: Verify team ownership with detailed error
    if (building.team_id !== team.id) {
      logger.error(`[EDIT-BUILDING] Team mismatch - building does not belong to user's team`, {
        buildingId: resolvedParams.id,
        buildingTeamId: building.team_id,
        userTeamId: team.id,
        buildingName: building.name
      })
      redirect('/gestionnaire/biens')
    }

    // STEP 6: Log before transformation
    logger.info(`[EDIT-BUILDING] Team verification passed, transforming data...`)

    const transformedData = transformBuildingForEdit(building)

    // STEP 7: Log transformation success
    logger.info(`[EDIT-BUILDING] Data transformation complete:`, {
      lotsCount: transformedData.lots.length,
      buildingManagersCount: transformedData.buildingManagers.length,
      buildingContactsCount: Object.values(transformedData.buildingContacts).flat().length
    })

    // STEP 8: Load team members
    logger.info(`[EDIT-BUILDING] Loading team members for team ${team.id}`)
    const teamMembersResult = await teamService.getTeamMembers(team.id)
    const teamMembers = teamMembersResult?.data || []
    logger.info(`[EDIT-BUILDING] Loaded ${teamMembers.length} team members`)

    // Prepare user profile for client component
    const userProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      role: profile.role || 'gestionnaire'
    }

    logger.info(`[EDIT-BUILDING] Successfully prepared all data, rendering client component`)

    return (
      <EditBuildingClient
        buildingId={resolvedParams.id}
        userProfile={userProfile}
        userTeam={team}
        initialBuilding={transformedData}
        initialTeamManagers={teamMembers}
      />
    )
  } catch (error) {
    // STEP 9: Detailed error logging
    logger.error(`[EDIT-BUILDING] Unexpected error loading building for edit`)
    logger.error(`[EDIT-BUILDING] Building ID: ${resolvedParams.id}`)
    logger.error(`[EDIT-BUILDING] Team ID: ${team.id}`)

    if (error instanceof Error) {
      logger.error(`[EDIT-BUILDING] Error name: ${error.name}`)
      logger.error(`[EDIT-BUILDING] Error message: ${error.message}`)
      logger.error(`[EDIT-BUILDING] Error stack:`)
      logger.error(error.stack)
    } else {
      logger.error(`[EDIT-BUILDING] Non-Error object thrown:`)
      logger.error(error)
    }

    redirect('/gestionnaire/biens')
  }
}
