/**
 * Page Modifier Intervention - Server Component
 * Charge l'intervention existante et passe les données au client component
 */

import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerInterventionService, createServerBuildingService, createServerLotService, createServerTeamService, createServerContractService } from '@/lib/services'
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
    .select('*, user:users!user_id(*)')
    .eq('intervention_id', id)

  // Get time slots if any
  const { data: timeSlots } = await supabase
    .from('intervention_time_slots')
    .select('*')
    .eq('intervention_id', id)
    .order('slot_date', { ascending: true })

  // Get quotes if any
  const { data: quotes } = await supabase
    .from('intervention_quotes')
    .select('*, provider:users(*)')
    .eq('intervention_id', id)
    .is('deleted_at', null)

  // Get existing documents
  const { data: documents } = await supabase
    .from('intervention_documents')
    .select('*')
    .eq('intervention_id', id)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  // Generate signed URLs for documents (for preview/download)
  const documentsWithUrls = await Promise.all(
    (documents || []).map(async (doc) => {
      try {
        const { data: signedUrlData } = await supabase.storage
          .from('intervention-documents')
          .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

        return {
          ...doc,
          signedUrl: signedUrlData?.signedUrl || undefined
        }
      } catch {
        return { ...doc, signedUrl: undefined }
      }
    })
  )

  // Load active tenants for the intervention's property
  let tenantsData = null
  let buildingTenantsData = null

  const contractService = await createServerContractService()

  if (intervention.lot_id) {
    // Lot intervention: get tenants from active contracts
    const tenantsResult = await contractService.getActiveTenantsByLot(intervention.lot_id)
    if (tenantsResult.success) {
      tenantsData = tenantsResult.data
    }
  } else if (intervention.building_id) {
    // Building intervention: get tenants grouped by lot
    const buildingTenantsResult = await contractService.getActiveTenantsByBuilding(intervention.building_id)
    if (buildingTenantsResult.success) {
      buildingTenantsData = buildingTenantsResult.data
    }
  }

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
      instructions: intervention.provider_guidelines || '',
      requires_quote: intervention.requires_quote || false,
      // Mode d'assignation et confirmation
      assignment_mode: (intervention as any).assignment_mode || 'single',
      requires_participant_confirmation: (intervention as any).requires_participant_confirmation || false,
      // Planification
      scheduling_type: (intervention as any).scheduling_type || 'flexible',
      scheduled_date: (intervention as any).scheduled_date || null,
    },
    assignments: assignments || [],
    timeSlots: timeSlots || [],
    quotes: quotes || [],
    documents: documentsWithUrls,
    lot: intervention.lot_id ? lots?.find(l => l.id === intervention.lot_id) : null,
    building: intervention.building_id ? buildings?.find(b => b.id === intervention.building_id) : null,
    // Tenant data for the assignment section
    tenants: tenantsData,
    buildingTenants: buildingTenantsData,
    currentTenantIds: (assignments || [])
      .filter((a: { role: string }) => a.role === 'locataire')
      .map((a: { user_id: string }) => a.user_id),
  }

  const buildingsData = {
    buildings: buildings || [],
    lots: lots || [],
    teamId: team.id,
    userId: profile.id,
  }

  const teamMembersData = {
    // ✅ Filter on user.role (business role) not team_members.role (team role)
    managers: teamMembers?.filter(m => m.user?.role === 'gestionnaire' || m.user?.role === 'admin') || [],
    providers: teamMembers?.filter(m => m.user?.role === 'prestataire') || [],
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
