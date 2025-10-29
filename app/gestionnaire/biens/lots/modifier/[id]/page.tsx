/**
 * Lot Edit Page - Server Component
 * Loads lot data and renders client wizard component
 * Following the building edit pattern with getServerAuthContext()
 */

import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerLotService, createServerTeamService } from '@/lib/services'
import { transformLotForEdit } from '@/lib/utils/lot-transform'
import LotEditClient from './lot-edit-client'
import { logger } from '@/lib/logger'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditLotPage({ params }: PageProps) {
  const resolvedParams = await params

  logger.info('🏠 [LOT-EDIT-PAGE] Starting lot edit page load', {
    lotId: resolvedParams.id,
    timestamp: new Date().toISOString()
  })

  // ✅ STEP 1: Get authenticated context
  logger.info('🔐 [LOT-EDIT-PAGE] Step 1: Getting server auth context...')
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  logger.info('✅ [LOT-EDIT-PAGE] Auth context obtained:', {
    userId: user.id,
    userEmail: user.email,
    profileId: profile.id,
    teamId: team.id,
    teamName: team.name
  })

  // ✅ STEP 2: Initialize services
  logger.info('🔧 [LOT-EDIT-PAGE] Step 2: Initializing services...')
  const lotService = await createServerLotService()
  const teamService = await createServerTeamService()

  logger.info('✅ [LOT-EDIT-PAGE] Services initialized')

  // ✅ STEP 3: Load lot with relations
  logger.info('📥 [LOT-EDIT-PAGE] Step 3: Loading lot with relations...')
  const lotResult = await lotService.getByIdWithRelations(resolvedParams.id)

  if (!lotResult.success || !lotResult.data) {
    logger.error('❌ [LOT-EDIT-PAGE] Failed to load lot:', {
      lotId: resolvedParams.id,
      error: lotResult.error,
      success: lotResult.success
    })
    redirect('/gestionnaire/biens/lots')
  }

  const lot = lotResult.data

  logger.info('✅ [LOT-EDIT-PAGE] Lot loaded successfully:', {
    lotId: lot.id,
    reference: lot.reference,
    teamId: lot.team_id,
    buildingId: lot.building_id,
    contactsCount: lot.lot_contacts?.length || 0
  })

  // ✅ STEP 4: Verify lot belongs to user's team
  if (lot.team_id !== team.id) {
    logger.error('❌ [LOT-EDIT-PAGE] Lot does not belong to user team:', {
      lotTeamId: lot.team_id,
      userTeamId: team.id
    })
    redirect('/gestionnaire/biens/lots')
  }

  // ✅ STEP 5: Transform lot data for component
  logger.info('🔄 [LOT-EDIT-PAGE] Step 4: Transforming lot data...')
  const transformedData = transformLotForEdit(lot)

  logger.info('✅ [LOT-EDIT-PAGE] Data transformed:', {
    lotReference: transformedData.lotInfo.reference,
    hasBuilding: !!transformedData.building,
    buildingName: transformedData.building?.name,
    contactsCount: Object.values(transformedData.contacts).flat().length,
    managersCount: transformedData.managers.length
  })

  // ✅ STEP 6: Load team managers for selection
  logger.info('👥 [LOT-EDIT-PAGE] Step 5: Loading team managers...')
  const teamMembersResult = await teamService.getTeamMembers(team.id)

  if (!teamMembersResult.success) {
    logger.warn('⚠️ [LOT-EDIT-PAGE] Failed to load team members:', teamMembersResult.error)
  }

  const teamMembers = teamMembersResult.success && teamMembersResult.data
    ? teamMembersResult.data
    : []

  logger.info('✅ [LOT-EDIT-PAGE] Team managers loaded:', {
    managersCount: teamMembers.length
  })

  // ✅ STEP 7: Prepare user profile for client
  const userProfile = {
    id: profile.id,
    name: profile.name || user.email,
    email: user.email,
    role: profile.role || 'gestionnaire'
  }

  logger.info('✅ [LOT-EDIT-PAGE] Rendering client component...')

  // ✅ STEP 8: Render client wizard component
  return (
    <LotEditClient
      lotId={resolvedParams.id}
      userProfile={userProfile}
      userTeam={team}
      initialLot={transformedData}
      initialTeamManagers={teamMembers}
    />
  )
}
