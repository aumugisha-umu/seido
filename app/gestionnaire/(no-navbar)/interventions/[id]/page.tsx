/**
 * Gestionnaire Intervention Detail Page
 * ✅ RECONSTRUCTED: Pattern EXACT de lots/[id]/page.tsx et immeubles/[id]/page.tsx
 * ✅ Simple queries Supabase directes (pas de méthodes custom complexes)
 * ✅ RLS policies Supabase pour permissions (pas de checks custom)
 * ✅ Logging structuré à chaque étape
 */

import { notFound } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerInterventionRepository } from '@/lib/services'
import { InterventionDetailClient } from './components/intervention-detail-client'
import { logger } from '@/lib/logger'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InterventionDetailPage({ params }: PageProps) {
  const startTime = Date.now()
  const { id } = await params

  // ✅ AUTH centralisée (comme Lots/Immeubles)
  const { supabase, profile } = await getServerAuthContext('gestionnaire')

  logger.info('🔧 [INTERVENTION-PAGE] Loading intervention', {
    interventionId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // ✅ Use repository method that includes creator join
    const interventionRepo = await createServerInterventionRepository()

    // Step 1: Load intervention with relations (includes creator)
    logger.info('📍 [INTERVENTION-PAGE] Step 1: Loading intervention with creator')

    const interventionResult = await interventionRepo.findByIdWithRelations(id)

    if (!interventionResult.success || !interventionResult.data) {
      logger.error('❌ [INTERVENTION-PAGE] Intervention not found', {
        interventionId: id,
        error: interventionResult.error,
        elapsed: `${Date.now() - startTime}ms`
      })
      notFound()
    }

    const intervention = interventionResult.data
    const assignmentMode = intervention.assignment_mode || 'single'
    const isSeparateMode = assignmentMode === 'separate'

    logger.info('✅ [INTERVENTION-PAGE] Step 1 complete', {
      interventionId: intervention.id,
      status: intervention.status,
      teamId: intervention.team_id,
      assignmentMode,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Step 2: Load relations EN PARALLÈLE (pattern Lots/Immeubles)
    logger.info('📍 [INTERVENTION-PAGE] Step 2: Loading relations')
    const [
      { data: building },
      { data: lot },
      { data: assignments },
      { data: documents },
      { data: quotes },
      { data: timeSlots },
      { data: threads, allMessages: threadMessages, allParticipants: threadParticipants },
      { data: comments },
      { data: linkedInterventions }
    ] = await Promise.all([
      // Building (avec address_record pour la localisation)
      intervention.building_id
        ? supabase.from('buildings').select('*, address_record:address_id(*)').eq('id', intervention.building_id).single()
        : Promise.resolve({ data: null }),

      // Lot (avec building et address_record pour la localisation complète)
      intervention.lot_id
        ? supabase.from('lots').select('*, address_record:address_id(*), building:building_id(*, address_record:address_id(*))').eq('id', intervention.lot_id).single()
        : Promise.resolve({ data: null }),

      // Assignments (with company data for contacts navigator)
      supabase
        .from('intervention_assignments')
        .select('*, user:users!user_id(*, company:company_id(*))')
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
        .select(`
          *,
          proposed_by_user:users!proposed_by(*),
          responses:time_slot_responses(*, user:users(*))
        `)
        .eq('intervention_id', id)
        .order('slot_date', { ascending: true }),

      // Threads with last message + pre-fetch all messages and participants (Phase 2 optimization)
      (async () => {
        const { data: threads } = await supabase
          .from('conversation_threads')
          .select('*')
          .eq('intervention_id', id)
          .order('created_at', { ascending: true })

        if (!threads || threads.length === 0) return { data: [] }

        const threadIds = threads.map(t => t.id)

        // Fetch last messages, all messages, and participants in parallel
        const [lastMsgsData, allMsgsData, participantsData] = await Promise.all([
          // Last messages for thread list
          supabase
            .from('conversation_messages')
            .select('id, thread_id, content, created_at, user:user_id(name)')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: false }),

          // ALL messages with attachments for chat interface (Phase 2)
          supabase
            .from('conversation_messages')
            .select(`
              *,
              user:user_id(id, name, email, avatar_url, role),
              attachments:intervention_documents!message_id(
                id, filename, original_filename, mime_type,
                file_size, storage_path, document_type
              )
            `)
            .in('thread_id', threadIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: true }),

          // ALL participants for chat interface (Phase 2)
          supabase
            .from('conversation_participants')
            .select('*, user:users!user_id(*)')
            .in('thread_id', threadIds)
        ])

        // Group by thread_id, keeping only the most recent message per thread
        const lastMessageByThread: Record<string, any> = {}
        if (lastMsgsData.data) {
          for (const msg of lastMsgsData.data) {
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
              const { data: participant } = await supabase
                .from('conversation_participants')
                .select('last_read_message_id')
                .eq('thread_id', thread.id)
                .eq('user_id', profile.id)
                .single()

              if (!participant || !participant.last_read_message_id) {
                // User hasn't read any messages, return total count
                const { count } = await supabase
                  .from('conversation_messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('thread_id', thread.id)
                  .is('deleted_at', null)

                return { threadId: thread.id, count: count || 0 }
              }

              // Count messages after last read
              const { data: lastRead } = await supabase
                .from('conversation_messages')
                .select('created_at')
                .eq('id', participant.last_read_message_id)
                .single()

              if (!lastRead) {
                return { threadId: thread.id, count: 0 }
              }

              const { count } = await supabase
                .from('conversation_messages')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id)
                .is('deleted_at', null)
                .gt('created_at', lastRead.created_at)

              return { threadId: thread.id, count: count || 0 }
            } catch (error) {
              logger.error('Error getting thread unread count', { threadId: thread.id, error })
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
          })),
          allMessages: allMsgsData.data || [],
          allParticipants: participantsData.data || []
        }
      })(),

      // Comments
      supabase
        .from('intervention_comments')
        .select('*, user:user_id(id, name, email, avatar_url, role)')
        .eq('intervention_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      // Linked interventions (parent/children) for multi-provider mode
      supabase
        .from('intervention_links')
        .select(`
          id,
          parent_intervention_id,
          child_intervention_id,
          provider_id,
          link_type,
          created_at,
          parent:interventions!parent_intervention_id(id, reference, title, status),
          child:interventions!child_intervention_id(id, reference, title, status),
          provider:users!provider_id(id, first_name, last_name, avatar_url)
        `)
        .or(`parent_intervention_id.eq.${id},child_intervention_id.eq.${id}`)
    ])

    logger.info('✅ [INTERVENTION-PAGE] Step 2 complete', {
      hasBuilding: !!building,
      hasLot: !!lot,
      assignmentsCount: assignments?.length || 0,
      documentsCount: documents?.length || 0,
      quotesCount: quotes?.length || 0,
      timeSlotsCount: timeSlots?.length || 0,
      threadsCount: threads?.length || 0,
      elapsed: `${Date.now() - startTime}ms`
    })

    logger.info('🎉 [INTERVENTION-PAGE] All data loaded successfully', {
      interventionId: id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // ✅ Group messages and participants by thread_id (Phase 2 optimization)
    const messagesByThread: Record<string, any[]> = {}
    const participantsByThread: Record<string, any[]> = {}

    // Initialize empty arrays for ALL threads (even if no messages/participants yet)
    // This prevents client-side loading state for empty threads
    if (threads) {
      for (const thread of threads) {
        messagesByThread[thread.id] = []
        participantsByThread[thread.id] = []
      }
    }

    // Populate with actual data
    if (threadMessages) {
      for (const msg of threadMessages) {
        if (!messagesByThread[msg.thread_id]) {
          messagesByThread[msg.thread_id] = []
        }
        messagesByThread[msg.thread_id].push(msg)
      }
    }

    if (threadParticipants) {
      for (const participant of threadParticipants) {
        if (!participantsByThread[participant.thread_id]) {
          participantsByThread[participant.thread_id] = []
        }
        participantsByThread[participant.thread_id].push(participant)
      }
    }

    // Determine if this is a parent intervention (has children) or child (has parent)
    const isParentIntervention = linkedInterventions?.some(link => link.parent_intervention_id === id) || false
    const isChildIntervention = linkedInterventions?.some(link => link.child_intervention_id === id) || false

    // Get provider count for multi-provider interventions
    const providerAssignments = assignments?.filter(a => a.role === 'prestataire') || []
    const providerCount = providerAssignments.length

    // Step 3: Load address for map (from lot or building)
    let interventionAddress: { latitude: number; longitude: number; formatted_address: string | null } | null = null

    // First try lot's address
    if (lot && (lot as any).address_id) {
      const { data: addressData } = await supabase
        .from('addresses')
        .select('latitude, longitude, formatted_address')
        .eq('id', (lot as any).address_id)
        .single()

      if (addressData?.latitude && addressData?.longitude) {
        interventionAddress = {
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          formatted_address: addressData.formatted_address
        }
      }
    }

    // If no lot address, try lot's building address
    if (!interventionAddress && lot?.building_id) {
      const { data: buildingData } = await supabase
        .from('buildings')
        .select('address_id')
        .eq('id', lot.building_id)
        .single()

      if (buildingData?.address_id) {
        const { data: addressData } = await supabase
          .from('addresses')
          .select('latitude, longitude, formatted_address')
          .eq('id', buildingData.address_id)
          .single()

        if (addressData?.latitude && addressData?.longitude) {
          interventionAddress = {
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            formatted_address: addressData.formatted_address
          }
        }
      }
    }

    // If no lot, try building's address directly
    if (!interventionAddress && building && (building as any).address_id) {
      const { data: addressData } = await supabase
        .from('addresses')
        .select('latitude, longitude, formatted_address')
        .eq('id', (building as any).address_id)
        .single()

      if (addressData?.latitude && addressData?.longitude) {
        interventionAddress = {
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          formatted_address: addressData.formatted_address
        }
      }
    }

    logger.info('📍 [INTERVENTION-PAGE] Address loaded', {
      hasAddress: !!interventionAddress,
      fromLot: !!lot,
      fromBuilding: !!building
    })

    // ✅ Pass to Client Component
    return (
      <InterventionDetailClient
        intervention={{
          ...intervention,
          building: building || undefined,
          lot: lot || undefined
        }}
        assignments={assignments || []}
        documents={documents || []}
        quotes={quotes || []}
        timeSlots={timeSlots || []}
        threads={threads || []}
        initialMessagesByThread={messagesByThread}
        initialParticipantsByThread={participantsByThread}
        comments={comments || []}
        serverUserRole={profile.role as 'gestionnaire'}
        serverUserId={profile.id}
        // Multi-provider mode data
        assignmentMode={assignmentMode}
        linkedInterventions={linkedInterventions || []}
        isParentIntervention={isParentIntervention}
        isChildIntervention={isChildIntervention}
        providerCount={providerCount}
        interventionAddress={interventionAddress}
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [INTERVENTION-PAGE] Failed to load intervention', {
      interventionId: id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${Date.now() - startTime}ms`
    })
    notFound()
  }
}