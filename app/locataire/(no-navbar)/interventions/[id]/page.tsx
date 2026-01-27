/**
 * Locataire Intervention Detail Page
 * Server Component that loads intervention data for tenant view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services'
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
    { data: participantsByThread }
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

      // Calculate unread_count for each thread
      const unreadCounts = await Promise.all(
        threads.map(async (thread) => {
          try {
            // Get participant's last read message
            const { data: participant } = await adminClient
              .from('conversation_participants')
              .select('last_read_message_id')
              .eq('thread_id', thread.id)
              .eq('user_id', userData.id)
              .single()

            if (!participant || !participant.last_read_message_id) {
              // User hasn't read any messages, return total count
              const { count } = await adminClient
                .from('conversation_messages')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id)
                .is('deleted_at', null)

              return { threadId: thread.id, count: count || 0 }
            }

            // Count messages after last read
            const { data: lastRead } = await adminClient
              .from('conversation_messages')
              .select('created_at')
              .eq('id', participant.last_read_message_id)
              .single()

            if (!lastRead) {
              return { threadId: thread.id, count: 0 }
            }

            const { count } = await adminClient
              .from('conversation_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .is('deleted_at', null)
              .gt('created_at', lastRead.created_at)

            return { threadId: thread.id, count: count || 0 }
          } catch (error) {
            return { threadId: thread.id, count: 0 }
          }
        })
      )

      // Create a map for quick lookup
      const unreadCountByThread: Record<string, number> = {}
      unreadCounts.forEach(({ threadId, count }) => {
        unreadCountByThread[threadId] = count
      })

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
    })()
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
        role: a.user.role
      } : undefined
    })) || []
  }

  return (
    <LocataireInterventionDetailClient
      intervention={fullIntervention}
      documents={documents || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      currentUser={userData}
      initialMessagesByThread={messagesByThread || {}}
      initialParticipantsByThread={participantsByThread || {}}
    />
  )
}