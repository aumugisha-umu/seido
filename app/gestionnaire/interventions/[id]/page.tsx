/**
 * Gestionnaire Intervention Detail Page
 * Server Component that loads intervention data and renders client components
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { createServerSupabaseClient } from '@/lib/services'
import { InterventionDetailClient } from './components/intervention-detail-client'
import type { Database } from '@/lib/database.types'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InterventionDetailPage({ params }: PageProps) {
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
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!userData || !['gestionnaire', 'admin'].includes(userData.role)) {
    redirect('/')
  }

  // Load intervention data
  const result = await getInterventionAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Load additional related data in parallel
  const [
    { data: building },
    { data: lot },
    { data: assignments },
    { data: documents },
    { data: quotes },
    { data: timeSlots },
    { data: threads },
    { data: activityLogs }
  ] = await Promise.all([
    // Building data
    result.data.building_id
      ? supabase.from('buildings').select('*').eq('id', result.data.building_id).single()
      : Promise.resolve({ data: null }),

    // Lot data
    result.data.lot_id
      ? supabase.from('lots').select('*').eq('id', result.data.lot_id).single()
      : Promise.resolve({ data: null }),

    // Assignments with user details (includes tenants)
    supabase
      .from('intervention_assignments')
      .select('*, user:users!user_id(*)')
      .eq('intervention_id', id)
      .order('assigned_at', { ascending: false }),

    // Documents
    supabase
      .from('intervention_documents')
      .select('*')
      .eq('intervention_id', id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false }),

    // Quotes
    supabase
      .from('intervention_quotes')
      .select('*, provider:users!provider_id(*)')
      .eq('intervention_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    // Time slots
    supabase
      .from('intervention_time_slots')
      .select('*, proposed_by_user:users!proposed_by(*)')
      .eq('intervention_id', id)
      .order('slot_date', { ascending: true }),

    // Conversation threads
    supabase
      .from('conversation_threads')
      .select('*')
      .eq('intervention_id', id)
      .order('created_at', { ascending: true }),

    // Activity logs
    supabase
      .from('activity_logs')
      .select('*, user:users!user_id(*)')
      .eq('entity_type', 'intervention')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
  ])

  // Extract tenant from assignments (tenants are now linked via intervention_assignments)
  const tenant = assignments?.find(a => a.role === 'locataire')?.user || null

  // Get creator from first assignment (usually gestionnaire or locataire)
  const firstAssignment = assignments && assignments.length > 0
    ? assignments.sort((a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime())[0]
    : null

  const creatorName = firstAssignment?.user?.name ||
                      firstAssignment?.user?.email?.split('@')[0] ||
                      'Utilisateur'

  // Construct full intervention object
  const fullIntervention = {
    ...result.data,
    building: building || undefined,
    lot: lot || undefined,
    tenant: tenant || undefined,
    creator_name: creatorName
  }

  return (
    <InterventionDetailClient
      intervention={fullIntervention}
      assignments={assignments || []}
      documents={documents || []}
      quotes={quotes || []}
      timeSlots={timeSlots || []}
      threads={threads || []}
      activityLogs={activityLogs || []}
    />
  )
}