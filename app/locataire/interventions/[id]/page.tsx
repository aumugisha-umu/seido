/**
 * Locataire Intervention Detail Page
 * Server Component that loads intervention data for tenant view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { createServerSupabaseClient } from '@/lib/services'
import { LocataireInterventionDetailClient } from './components/intervention-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LocataireInterventionDetailPage({ params }: PageProps) {
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

  if (!userData || userData.role !== 'locataire') {
    redirect('/')
  }

  // Load intervention data
  const result = await getInterventionAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Check if this tenant created the intervention
  if (result.data.tenant_id !== userData.id) {
    redirect('/locataire/interventions')
  }

  // Load additional data for tenant view
  const [
    { data: building },
    { data: lot },
    { data: documents },
    { data: threads },
    { data: timeSlots }
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

    // Time slots (for selection)
    supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('intervention_id', id)
      .order('slot_date', { ascending: true })
  ])

  // Construct full intervention object
  const fullIntervention = {
    ...result.data,
    building: building || undefined,
    lot: lot || undefined,
    tenant: userData
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