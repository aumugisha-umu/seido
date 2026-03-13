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
  // Phase 0: Auth + params in parallel
  const [resolvedParams, { user, profile, team }] = await Promise.all([
    params,
    getServerAuthContext('gestionnaire')
  ])

  if (!user || !profile || !team) {
    redirect('/login')
  }

  // Phase 1: Create services in parallel
  const [buildingService, teamService] = await Promise.all([
    createServerBuildingService(),
    createServerTeamService()
  ])

  try {
    logger.info(`[EDIT-BUILDING] Loading building ${resolvedParams.id} for team ${team.id}`)

    // Phase 2: Fetch building + team members in parallel (both only need team.id)
    const [buildingResult, teamMembersResult] = await Promise.all([
      buildingService.getByIdWithRelations(resolvedParams.id),
      teamService.getTeamMembers(team.id)
    ])

    if (!buildingResult.success || !buildingResult.data) {
      logger.error(`[EDIT-BUILDING] Building not found or query failed`, {
        buildingId: resolvedParams.id,
        success: buildingResult.success,
        error: buildingResult.error
      })
      redirect('/gestionnaire/biens')
    }

    const building = buildingResult.data
    const teamMembers = teamMembersResult?.data || []

    logger.info(`[EDIT-BUILDING] Building loaded:`, {
      buildingId: building.id,
      buildingName: building.name,
      buildingTeamId: building.team_id,
      userTeamId: team.id,
      lotsCount: building.lots?.length || 0,
      buildingContactsCount: building.building_contacts?.length || 0
    })

    if (building.team_id !== team.id) {
      logger.error(`[EDIT-BUILDING] Team mismatch`, {
        buildingId: resolvedParams.id,
        buildingTeamId: building.team_id,
        userTeamId: team.id
      })
      redirect('/gestionnaire/biens')
    }

    const transformedData = transformBuildingForEdit(building)

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
