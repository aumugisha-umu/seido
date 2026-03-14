/**
 * Locataire Intervention Detail Page
 * Server Component that loads intervention data for tenant view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { LocataireInterventionDetailClient } from './components/intervention-detail-client'
import { isTeamSubscriptionBlocked } from '@/lib/subscription-guard'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LocataireInterventionDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { profile: userData, supabase } = await getServerAuthContext('locataire')

  // Block access if team subscription is blocked
  if (await isTeamSubscriptionBlocked(userData.team_id)) {
    redirect('/locataire/dashboard')
  }

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
    redirect('/locataire/dashboard')
  }

  // Load additional data for tenant view
  const [
    { data: building },
    { data: lot },
    { data: documents },
    { data: threads },
    { data: timeSlots },
    { data: assignments },
    { data: messagesByThread },
    { data: participantsByThread },
    { data: reports }
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
    // Use service role to bypass RLS - user already verified as assigned above
    (async () => {
      const adminClient = createServiceRoleSupabaseClient()

      const { data: threads } = await adminClient
        .from('conversation_threads')
        .select('*')
        .eq('intervention_id', id)
        .in('thread_type', ['group', 'tenant_to_managers'])
        .order('created_at', { ascending: true })

      if (!threads || threads.length === 0) return { data: [] }

      // Fetch last messages for all threads in one query
      const threadIds = threads.map(t => t.id)
      const { data: allMessages } = await adminClient
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

      // Batch unread counts via RPC (replaces N+1 per-thread queries)
      const unreadCountByThread: Record<string, number> = {}
      const { data: unreadData } = await adminClient.rpc('get_thread_unread_counts', {
        p_thread_ids: threadIds,
        p_user_id: userData.id
      })
      if (unreadData) {
        for (const row of unreadData) {
          unreadCountByThread[row.thread_id] = row.unread_count
        }
      }

      // Enrich threads with last_message and unread_count
      return {
        data: threads.map(t => ({
          ...t,
          last_message: lastMessageByThread[t.id] ? [lastMessageByThread[t.id]] : [],
          unread_count: unreadCountByThread[t.id] || 0
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
      .order('assigned_at', { ascending: true }),

    // Messages for all threads (for InterventionChatTab)
    // Use service role to bypass RLS - user already verified as assigned above
    (async () => {
      const adminClient = createServiceRoleSupabaseClient()

      const { data: threadsList } = await adminClient
        .from('conversation_threads')
        .select('id')
        .eq('intervention_id', id)
        .in('thread_type', ['group', 'tenant_to_managers'])

      if (!threadsList || threadsList.length === 0) return { data: {} }

      const threadIds = threadsList.map(t => t.id)
      const { data: messages } = await adminClient
        .from('conversation_messages')
        .select('*, user:user_id(id, name, email, role)')
        .in('thread_id', threadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      // Group by thread_id
      const byThread: Record<string, any[]> = {}
      messages?.forEach(m => {
        if (!byThread[m.thread_id]) byThread[m.thread_id] = []
        byThread[m.thread_id].push(m)
      })
      return { data: byThread }
    })(),

    // Participants for all threads (for InterventionChatTab)
    // Use service role to bypass RLS - user already verified as assigned above
    (async () => {
      const adminClient = createServiceRoleSupabaseClient()

      const { data: threadsList } = await adminClient
        .from('conversation_threads')
        .select('id')
        .eq('intervention_id', id)
        .in('thread_type', ['group', 'tenant_to_managers'])

      if (!threadsList || threadsList.length === 0) return { data: {} }

      const threadIds = threadsList.map(t => t.id)
      const { data: participants } = await adminClient
        .from('conversation_participants')
        .select('*, user:user_id(id, name, email, role)')
        .in('thread_id', threadIds)

      // Group by thread_id
      const byThread: Record<string, any[]> = {}
      participants?.forEach(p => {
        if (!byThread[p.thread_id]) byThread[p.thread_id] = []
        byThread[p.thread_id].push(p)
      })
      return { data: byThread }
    })(),

    // Reports (closure reports from all roles)
    supabase
      .from('intervention_reports')
      .select('*, creator:created_by(name)')
      .eq('intervention_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
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
    // Assignments with full user data for participants display
    assignments: assignments?.map(a => ({
      role: a.role,
      user_id: a.user?.id || a.user_id,
      user: a.user ? {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        phone: a.user.phone,
        role: a.user.role,
        auth_user_id: a.user.auth_user_id
      } : undefined
    })) || []
  }

  return (
    <LocataireInterventionDetailClient
      intervention={fullIntervention}
      documents={documents || []}
      reports={reports || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      currentUser={userData}
      initialMessagesByThread={messagesByThread || {}}
      initialParticipantsByThread={participantsByThread || {}}
    />
  )
}