/**
 * Gestionnaire Intervention Detail Page
 * ✅ RECONSTRUCTED: Pattern EXACT de lots/[id]/page.tsx et immeubles/[id]/page.tsx
 * ✅ Simple queries Supabase directes (pas de méthodes custom complexes)
 * ✅ RLS policies Supabase pour permissions (pas de checks custom)
 * ✅ Logging structuré à chaque étape
 */

import { notFound } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerInterventionService } from '@/lib/services'
import { InterventionDetailClient } from './components/intervention-detail-client'
import { logger } from '@/lib/logger'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InterventionDetailPage({ params }: PageProps) {
  const startTime = Date.now()
  const { id } = await params

  // ✅ AUTH centralisée (comme Lots/Immeubles)
  const { supabase } = await getServerAuthContext('gestionnaire')

  logger.info('🔧 [INTERVENTION-PAGE] Loading intervention', {
    interventionId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // ✅ Service standard (pas de méthode custom)
    const interventionService = await createServerInterventionService()

    // Step 1: Load intervention de base
    logger.info('📍 [INTERVENTION-PAGE] Step 1: Loading intervention')
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const interventionResult = await interventionService.getById(id, authUser.id)

    if (!interventionResult.success || !interventionResult.data) {
      logger.error('❌ [INTERVENTION-PAGE] Intervention not found', {
        interventionId: id,
        error: interventionResult.error,
        elapsed: `${Date.now() - startTime}ms`
      })
      notFound()
    }

    const intervention = interventionResult.data
    logger.info('✅ [INTERVENTION-PAGE] Step 1 complete', {
      interventionId: intervention.id,
      status: intervention.status,
      teamId: intervention.team_id,
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
      { data: activityLogs }
    ] = await Promise.all([
      // Building
      intervention.building_id
        ? supabase.from('buildings').select('*').eq('id', intervention.building_id).single()
        : Promise.resolve({ data: null }),

      // Lot
      intervention.lot_id
        ? supabase.from('lots').select('*').eq('id', intervention.lot_id).single()
        : Promise.resolve({ data: null }),

      // Assignments
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

        // Enrich threads with last_message
        return {
          data: threads.map(t => ({
            ...t,
            last_message: lastMessageByThread[t.id] ? [lastMessageByThread[t.id]] : []
          })),
          allMessages: allMsgsData.data || [],
          allParticipants: participantsData.data || []
        }
      })(),

      // Activity logs
      supabase
        .from('activity_logs')
        .select('*, user:users!user_id(*)')
        .eq('entity_type', 'intervention')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    logger.info('✅ [INTERVENTION-PAGE] Step 2 complete', {
      hasBuilding: !!building,
      hasLot: !!lot,
      assignmentsCount: assignments?.length || 0,
      documentsCount: documents?.length || 0,
      quotesCount: quotes?.length || 0,
      timeSlotsCount: timeSlots?.length || 0,
      threadsCount: threads?.length || 0,
      logsCount: activityLogs?.length || 0,
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
        activityLogs={activityLogs || []}
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