/**
 * Prestataire Intervention Detail Page
 * Server Component that loads intervention data for provider view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { createServerSupabaseClient } from '@/lib/services'
import { PrestataireInterventionDetailClient } from './components/intervention-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PrestataireInterventionDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // Auth check
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!userData || userData.role !== 'prestataire') {
    redirect('/')
  }

  // Load intervention data
  const result = await getInterventionAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Check if this provider is assigned to the intervention
  const { data: assignment } = await supabase
    .from('intervention_assignments')
    .select('*')
    .eq('intervention_id', id)
    .eq('user_id', userData.id)
    .eq('role', 'prestataire')
    .single()

  if (!assignment) {
    redirect('/prestataire/interventions')
  }

  // Load additional data for provider view
  const [
    { data: building },
    { data: lot },
    { data: documents },
    { data: quotes },
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

    // Documents (provider can see)
    supabase
      .from('intervention_documents')
      .select('*')
      .eq('intervention_id', id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false }),

    // Quotes (provider can only see their own quotes)
    supabase
      .from('intervention_quotes')
      .select('*, provider:users!provider_id(*)')
      .eq('intervention_id', id)
      .eq('provider_id', userData.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    // Conversation threads (provider can see group and provider_to_managers)
    supabase
      .from('conversation_threads')
      .select('*')
      .eq('intervention_id', id)
      .in('thread_type', ['group', 'provider_to_managers'])
      .order('created_at', { ascending: true }),

    // Time slots (provider can see their own proposed slots)
    supabase
      .from('intervention_time_slots')
      .select('*, proposed_by_user:users!proposed_by(*)')
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
    creator_name: creator?.name || creator?.email || 'Utilisateur'
  }

  return (
    <PrestataireInterventionDetailClient
      intervention={fullIntervention}
      documents={documents || []}
      quotes={quotes || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      currentUser={userData}
    />
  )
}
