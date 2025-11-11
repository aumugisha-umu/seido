/**
 * Prestataire Intervention Detail Page
 * Server Component that loads intervention data for provider view
 */

import { notFound, redirect } from 'next/navigation'
import { getInterventionAction } from '@/app/actions/intervention-actions'
import { getServerAuthContext } from '@/lib/server-context'
import { PrestataireInterventionDetailClient } from './components/intervention-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PrestataireInterventionDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // Remplace ~18 lignes d'auth manuelle (getUser + role check)
  const { profile: userData, supabase } = await getServerAuthContext('prestataire')

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

  // Load intervention with relations using join
  const { data: interventionWithRelations } = await supabase
    .from('interventions')
    .select('*, building:buildings(*), lot:lots(*)')
    .eq('id', id)
    .single()

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
      .select('*, provider:users!provider_id(*)')
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

  // Get creator from created_by field
  const { data: creatorUser } = result.data.created_by
    ? await supabase.from('users').select('id, name, email, role').eq('id', result.data.created_by).single()
    : { data: null }

  // Construct full intervention object with relations from joined query
  const fullIntervention = {
    ...result.data,
    building: interventionWithRelations?.building || undefined,
    lot: interventionWithRelations?.lot || undefined,
    creator: creatorUser ? {
      id: creatorUser.id,
      name: creatorUser.name,
      email: creatorUser.email,
      role: creatorUser.role
    } : undefined
  }

  // Debug logging for location data
  console.log('🔍 [SERVER-DEBUG] Intervention from repository:', {
    id: result.data.id,
    building_id: result.data.building_id,
    lot_id: result.data.lot_id,
    status: result.data.status
  })
  console.log('🔍 [SERVER-DEBUG] Jointure result:', {
    hasBuilding: !!interventionWithRelations?.building,
    hasLot: !!interventionWithRelations?.lot,
    building: interventionWithRelations?.building,
    lot: interventionWithRelations?.lot
  })
  console.log('🔍 [SERVER-DEBUG] Full intervention with relations:', {
    id: fullIntervention.id,
    status: fullIntervention.status,
    building: fullIntervention.building ? {
      id: fullIntervention.building.id,
      name: fullIntervention.building.name,
      postal_code: fullIntervention.building.postal_code,
      city: fullIntervention.building.city,
      country: fullIntervention.building.country
    } : null,
    lot: fullIntervention.lot ? {
      id: fullIntervention.lot.id,
      reference: fullIntervention.lot.reference,
      postal_code: fullIntervention.lot.postal_code,
      city: fullIntervention.lot.city,
      country: fullIntervention.lot.country
    } : null
  })

  return (
    <PrestataireInterventionDetailClient
      intervention={fullIntervention}
      documents={documents || []}
      quotes={quotes || []}
      threads={threads || []}
      timeSlots={timeSlots || []}
      assignments={assignments || []}
      currentUser={userData}
    />
  )
}
