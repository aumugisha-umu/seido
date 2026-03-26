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

  // ── Phase 0: Service instantiation + gate query ──────────────────────
  // All service factories are stateless — parallelize them
  const [interventionService, buildingService, lotService, teamService, contractService] = await Promise.all([
    createServerInterventionService(),
    createServerBuildingService(),
    createServerLotService(),
    createServerTeamService(),
    createServerContractService(),
  ])

  // Gate query: needed for team_id check + lot_id/building_id for tenants
  const { data: intervention, error: interventionError } = await interventionService.getById(id)

  if (interventionError || !intervention) {
    redirect('/gestionnaire/operations')
  }

  if (intervention.team_id !== team.id) {
    redirect('/gestionnaire/operations')
  }

  // ── Wave 1: All independent queries in parallel ─────────────────────
  const [
    { data: buildings },
    { data: lots },
    { data: teamMembers },
    { data: assignments },
    { data: timeSlots },
    { data: quotes },
    { data: documents },
    tenantResult,
  ] = await Promise.all([
    buildingService.getBuildingsByTeam(team.id),
    lotService.getLotsByTeam(team.id),
    teamService.getTeamMembers(team.id),
    supabase.from('intervention_assignments').select('*, user:users!user_id(*)').eq('intervention_id', id),
    supabase.from('intervention_time_slots').select('*').eq('intervention_id', id).order('slot_date', { ascending: true }),
    supabase.from('intervention_quotes').select('*, provider:users(*)').eq('intervention_id', id).is('deleted_at', null),
    supabase.from('intervention_documents').select('*').eq('intervention_id', id).is('deleted_at', null).order('uploaded_at', { ascending: false }),
    // Tenant data depends on intervention gate (lot_id / building_id)
    (async () => {
      if (intervention.lot_id) {
        const r = await contractService.getActiveTenantsByLot(intervention.lot_id)
        return { tenants: r.success ? r.data : null, buildingTenants: null }
      } else if (intervention.building_id) {
        const r = await contractService.getActiveTenantsByBuilding(intervention.building_id)
        return { tenants: null, buildingTenants: r.success ? r.data : null }
      }
      return { tenants: null, buildingTenants: null }
    })(),
  ])

  const tenantsData = tenantResult.tenants
  const buildingTenantsData = tenantResult.buildingTenants

  // ── Wave 2: Signed URLs (depends on documents from wave 1) ──────────
  const documentsWithUrls = await Promise.all(
    (documents || []).map(async (doc) => {
      try {
        const { data: signedUrlData } = await supabase.storage
          .from(doc.storage_bucket || 'documents')
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, signedUrl: signedUrlData?.signedUrl || undefined }
      } catch {
        return { ...doc, signedUrl: undefined }
      }
    })
  )

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
