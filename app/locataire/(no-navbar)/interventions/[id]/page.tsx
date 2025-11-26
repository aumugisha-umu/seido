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

    // Conversation threads with last message (tenant can see)
    (async () => {
      const { data: threads } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('intervention_id', id)
        .in('thread_type', ['group', 'tenant_to_managers'])
        .order('created_at', { ascending: true })

      if (!threads || threads.length === 0) return { data: [] }

      // Fetch last messages for all threads in one query
      const threadIds = threads.map(t => t.id)
      const { data: allMessages } = await supabase
        .from('conversation_messages')
        .select('id, thread_id, content, created_at, user:user_id(name)')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })

      // Group by thread_id, keeping only the most recent message per thread
      const lastMessageByThread: Record<string, any> = {}
      if (allMessages) {
        for (const msg of allMessages) {
          if (!lastMessageByThread[msg.thread_id]) {
            lastMessageByThread[msg.thread_id] = msg
          }
        }
      }

      // Enrich threads with last_message
      return {
        data: threads.map(t => ({
          ...t,
          last_message: lastMessageByThread[t.id] ? [lastMessageByThread[t.id]] : []
        }))
      }
    })(),

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

  // Construct full intervention object
  const fullIntervention = {
    ...result.data,
    building: building || undefined,
    lot: lot || undefined,
    tenant: userData,
    creator: firstAssignment?.user ? {
      id: firstAssignment.user.id,
      name: firstAssignment.user.name,
      email: firstAssignment.user.email,
      role: firstAssignment.user.role
    } : undefined,
    // Assignments needed for action buttons (validate/contest work)
    assignments: assignments?.map(a => ({
      role: a.role,
      user_id: a.user?.id || a.user_id
    })) || []
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