/**
 * Prestataire Intervention Detail Page
 * Server Component that loads intervention data for provider view
 */

import { notFound, redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerInterventionRepository } from '@/lib/services'
import { PrestataireInterventionDetailClient } from './components/intervention-detail-client'
import { logger } from '@/lib/logger'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PrestataireInterventionDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { profile: userData, supabase } = await getServerAuthContext('prestataire')

  logger.info('🔧 [PRESTATAIRE-INTERVENTION] Loading intervention', {
    interventionId: id,
    userId: userData.id
  })

  // Check if this provider is assigned to the intervention
  const { data: assignment } = await supabase
    .from('intervention_assignments')
    .select('*')
    .eq('intervention_id', id)
    .eq('user_id', userData.id)
    .single()

  if (!assignment) {
    logger.warn('⚠️ [PRESTATAIRE-INTERVENTION] User not assigned to intervention', {
      interventionId: id,
      userId: userData.id
    })
    redirect('/prestataire/interventions')
  }

  // Load intervention data using repository (includes relations: building, lot, creator)
  const interventionRepo = await createServerInterventionRepository()
  const result = await interventionRepo.findByIdWithRelations(id)

  if (!result.success || !result.data) {
    logger.error('❌ [PRESTATAIRE-INTERVENTION] Intervention not found', {
      interventionId: id,
      error: result.error
    })
    notFound()
  }

  const intervention = result.data

  // Load additional data for provider view
  const [
    { data: documents },
    { data: quotes },
    { data: threads },
    { data: timeSlots },
    { data: assignments }
  ] = await Promise.all([

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
      .select(`
        id,
        intervention_id,
        provider_id,
        amount,
        description,
        line_items,
        status,
        quote_type,
        created_at,
        updated_at,
        provider:users!provider_id(*)
      `)
      .eq('intervention_id', id)
      .eq('provider_id', userData.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    // Conversation threads with last message (provider can see group and provider_to_managers)
    (async () => {
      const { data: threads } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('intervention_id', id)
        .in('thread_type', ['group', 'provider_to_managers'])
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

  // Debug logging for location data
  logger.info('✅ [PRESTATAIRE-INTERVENTION] Intervention loaded with relations', {
    id: intervention.id,
    building_id: intervention.building_id,
    lot_id: intervention.lot_id,
    status: intervention.status,
    hasBuilding: !!intervention.building,
    hasLot: !!intervention.lot,
    hasCreator: !!intervention.creator
  })

  console.log('🔍 [SERVER-DEBUG] Full intervention with relations:', {
    id: intervention.id,
    status: intervention.status,
    building: intervention.building ? {
      id: intervention.building.id,
      name: intervention.building.name,
      postal_code: intervention.building.postal_code,
      city: intervention.building.city,
      country: intervention.building.country
    } : null,
    lot: intervention.lot ? {
      id: intervention.lot.id,
      reference: intervention.lot.reference,
      postal_code: intervention.lot.postal_code,
      city: intervention.lot.city,
      country: intervention.lot.country
    } : null
  })

  return (
    <PrestataireInterventionDetailClient
      intervention={intervention}
      documents={documents || []}
      quotes={quotes || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      assignments={assignments || []}
      currentUser={userData}
    />
  )
}
