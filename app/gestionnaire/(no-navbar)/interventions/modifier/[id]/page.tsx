/**
 * Page Modifier Intervention - Server Component
 * Charge l'intervention existante et passe les données au client component
 */

import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerInterventionService, createServerBuildingService, createServerLotService, createServerTeamService } from '@/lib/services'
import InterventionEditClient from './intervention-edit-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ModifierInterventionPage({ params }: PageProps) {
  const { id } = await params

  // Auth check
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  if (!profile || !team) {
    redirect('/auth/login')
  }

  // Load intervention with all relations
  const interventionService = await createServerInterventionService()
  const { data: intervention, error: interventionError } = await interventionService.getById(id)

  if (interventionError || !intervention) {
    redirect('/gestionnaire/interventions')
  }

  // Verify the intervention belongs to user's team
  if (intervention.team_id !== team.id) {
    redirect('/gestionnaire/interventions')
  }

  // Load additional data for the form
  const buildingService = await createServerBuildingService()
  const lotService = await createServerLotService()
  const teamService = await createServerTeamService()

  // Get buildings and lots for the team
  const { data: buildings } = await buildingService.getBuildingsByTeam(team.id)
  const { data: lots } = await lotService.getLotsByTeam(team.id)

  // Get team members (gestionnaires and prestataires)
  const { data: teamMembers } = await teamService.getTeamMembers(team.id)

  // Get intervention assignments
  const { data: assignments } = await supabase
    .from('intervention_assignments')
    .select('*, user:users(*)')
    .eq('intervention_id', id)

  // Get time slots if any
  const { data: timeSlots } = await supabase
    .from('intervention_time_slots')
    .select('*')
    .eq('intervention_id', id)
    .order('proposed_date', { ascending: true })

  // Get quotes if any
  const { data: quotes } = await supabase
    .from('intervention_quotes')
    .select('*, provider:users(*)')
    .eq('intervention_id', id)
    .is('deleted_at', null)

  // Prepare initial data for the form
  const initialData = {
    intervention: {
      id: intervention.id,
      title: intervention.title,
      description: intervention.description || '',
      type: intervention.type,
      urgency: intervention.urgency,
      status: intervention.status,
      reference: intervention.reference,
      lot_id: intervention.lot_id,
      building_id: intervention.building_id,
      team_id: intervention.team_id,
      created_by: intervention.created_by,
      instructions: intervention.instructions || '',
      require_quote: intervention.require_quote || false,
    },
    assignments: assignments || [],
    timeSlots: timeSlots || [],
    quotes: quotes || [],
    lot: intervention.lot_id ? lots?.find(l => l.id === intervention.lot_id) : null,
    building: intervention.building_id ? buildings?.find(b => b.id === intervention.building_id) : null,
  }

  const buildingsData = {
    buildings: buildings || [],
    lots: lots || [],
    teamId: team.id,
    userId: profile.id,
  }

  const teamMembersData = {
    managers: teamMembers?.filter(m => m.role === 'gestionnaire' || m.role === 'admin') || [],
    providers: teamMembers?.filter(m => m.role === 'prestataire') || [],
  }

  return (
    <InterventionEditClient
      initialData={initialData}
      buildingsData={buildingsData}
      teamMembers={teamMembersData}
      currentUserId={profile.id}
    />
  )
}
