/**
 * Locataire Intervention Detail Page
 * Server Component that loads intervention data for tenant view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { getServerAuthContext } from '@/lib/server-context'
import { LocataireInterventionDetailClient } from './components/intervention-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LocataireInterventionDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // Remplace ~18 lignes d'auth manuelle (getUser + role check)
  const { profile: userData, supabase } = await getServerAuthContext('locataire')

  // Load intervention data
  const result = await getInterventionAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Check if this tenant is assigned to the intervention
  const { data: assignment } = await supabase
    .from('intervention_assignments')
    .select('id')
    .eq('intervention_id', id)
    .eq('user_id', userData.id)
    .eq('role', 'locataire')
    .single()

  if (!assignment) {
    redirect('/locataire/interventions')
  }

  // Load additional data for tenant view
  const [
    { data: building },
    { data: lot },
    { data: documents },
    { data: threads },
    { data: timeSlots },
    { data: assignments }
  ] = await Promise.all([
    // Building data
    result.data.building_id
      ? supabase.from('buildings').select('*').eq('id', result.data.building_id).single()
      : Promise.resolve({ data: null }),

    // Lot data
    result.data.lot_id
      ? supabase.from('lots').select('*').eq('id', result.data.lot_id).single()
      : Promise.resolve({ data: null }),

    // Documents (visible to tenant)
    supabase
      .from('intervention_documents')
      .select('*')
      .eq('intervention_id', id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false }),

    // Conversation threads (tenant can see)
    supabase
      .from('conversation_threads')
      .select('*')
      .eq('intervention_id', id)
      .in('thread_type', ['group', 'tenant_to_managers'])
      .order('created_at', { ascending: true }),

    // Time slots with responses
    supabase
      .from('intervention_time_slots')
      .select(`
        *,
        proposed_by_user:users!proposed_by(*),
        responses:time_slot_responses(
          *,
          user:users(*)
        )
      `)
      .eq('intervention_id', id)
      .order('slot_date', { ascending: true }),

    // All assignments with user details (to find creator)
    supabase
      .from('intervention_assignments')
      .select('*, user:users!user_id(*)')
      .eq('intervention_id', id)
      .order('assigned_at', { ascending: true })
  ])

  // Get creator from first assignment (usually gestionnaire or locataire)
  const firstAssignment = assignments && assignments.length > 0 ? assignments[0] : null

  const creatorName = firstAssignment?.user?.name ||
                      firstAssignment?.user?.email?.split('@')[0] ||
                      'Utilisateur'

  // Construct full intervention object
  const fullIntervention = {
    ...result.data,
    building: building || undefined,
    lot: lot || undefined,
    tenant: userData,
    creator_name: creatorName
  }

  return (
    <LocataireInterventionDetailClient
      intervention={fullIntervention}
      documents={documents || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      currentUser={userData}
    />
  )
}