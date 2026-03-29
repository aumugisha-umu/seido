'use server'

import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import { AI_SOURCES } from '@/lib/services/domain/ai-whatsapp/types'

type Urgency = 'basse' | 'normale' | 'haute' | 'urgente'

// ============================================================================
// Types
// ============================================================================

export interface WhatsAppTriageItem {
  id: string
  reference: string
  title: string
  description: string | null
  urgency: Urgency
  type: string | null
  created_at: string
  building_id: string | null
  lot_id: string | null
  callerPhone: string | null
  callerName: string | null
  address: string | null
  problemSummary: string | null
  channel: 'whatsapp' | 'sms' | 'phone'
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  transcript: string | null
  sessionId: string | null
  documents?: Array<{
    id: string
    storage_path: string
    storage_bucket: string
    filename: string
    original_filename: string
    mime_type: string
    document_type: string
    description: string | null
  }>
}

/** Derive channel from source column */
const sourceToChannel = (source: string | null): WhatsAppTriageItem['channel'] => {
  if (source === 'sms_ai') return 'sms'
  if (source === 'phone_ai') return 'phone'
  return 'whatsapp'
}

// ============================================================================
// Fetch AI triage items for a team (WhatsApp + SMS + Phone)
// ============================================================================

export async function getWhatsAppTriageItems(): Promise<WhatsAppTriageItem[]> {
  const { team } = await getServerAuthContext('gestionnaire')
  const supabase = createServiceRoleSupabaseClient()

  // Fetch all AI-sourced interventions still in "demande" status
  const { data: interventions, error } = await supabase
    .from('interventions')
    .select('id, reference, title, description, urgency, type, source, created_at, building_id, lot_id, created_by')
    .eq('team_id', team.id)
    .in('source', AI_SOURCES as unknown as string[])
    .eq('status', 'demande')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !interventions?.length) {
    if (error) logger.warn({ error }, '[AI-TRIAGE] Failed to fetch interventions')
    return []
  }

  const interventionIds = interventions.map(i => i.id)

  // Fetch matching WhatsApp sessions + phone calls in parallel
  const [{ data: sessions }, { data: phoneCalls }] = await Promise.all([
    supabase
      .from('ai_whatsapp_sessions')
      .select('id, intervention_id, contact_phone, extracted_data, messages, identified_user_id')
      .in('intervention_id', interventionIds),
    supabase
      .from('ai_phone_calls')
      .select('id, intervention_id, caller_phone, structured_summary, transcript, identified_user_id')
      .in('intervention_id', interventionIds),
  ])

  // Collect all identified user IDs for name lookup
  const identifiedUserIds = [
    ...new Set([
      ...(sessions?.filter(s => s.identified_user_id).map(s => s.identified_user_id!) ?? []),
      ...(phoneCalls?.filter(c => c.identified_user_id).map(c => c.identified_user_id!) ?? []),
      ...interventions.filter(i => i.created_by).map(i => i.created_by!),
    ])
  ]

  let userNames: Record<string, string> = {}
  if (identifiedUserIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, name')
      .in('id', identifiedUserIds)

    if (users) {
      userNames = Object.fromEntries(
        users.map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || ''])
      )
    }
  }

  // Map sessions and phone calls by intervention_id
  const sessionMap = new Map(sessions?.map(s => [s.intervention_id, s]) ?? [])
  const phoneCallMap = new Map(phoneCalls?.map(c => [c.intervention_id, c]) ?? [])

  return interventions.map(intervention => {
    const session = sessionMap.get(intervention.id)
    const phoneCall = phoneCallMap.get(intervention.id)
    const channel = sourceToChannel(intervention.source)

    // Extract data from the appropriate source
    if (channel === 'phone' && phoneCall) {
      // Phone call — data from ai_phone_calls
      const summary = (phoneCall.structured_summary ?? {}) as Record<string, unknown>
      const userId = phoneCall.identified_user_id ?? intervention.created_by

      return {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title,
        description: intervention.description,
        urgency: intervention.urgency,
        type: intervention.type,
        created_at: intervention.created_at,
        building_id: intervention.building_id,
        lot_id: intervention.lot_id,
        callerPhone: phoneCall.caller_phone ?? null,
        callerName: userId ? (userNames[userId] ?? null) : (summary.caller_name as string | null) ?? null,
        address: (summary.address as string | null) ?? null,
        problemSummary: (summary.problem_description as string | null) ?? null,
        channel,
        messages: [],
        transcript: phoneCall.transcript ?? null,
        sessionId: null,
      }
    }

    // WhatsApp/SMS — data from ai_whatsapp_sessions
    const extractedData = (session?.extracted_data ?? {}) as Record<string, unknown>
    const userId = session?.identified_user_id ?? intervention.created_by

    return {
      id: intervention.id,
      reference: intervention.reference,
      title: intervention.title,
      description: intervention.description,
      urgency: intervention.urgency,
      type: intervention.type,
      created_at: intervention.created_at,
      building_id: intervention.building_id,
      lot_id: intervention.lot_id,
      callerPhone: session?.contact_phone ?? null,
      callerName: userId ? (userNames[userId] ?? null) : (extractedData.caller_name as string | null) ?? null,
      address: (extractedData.address as string | null) ?? null,
      problemSummary: (extractedData.problem_description as string | null) ?? null,
      channel,
      messages: Array.isArray(session?.messages) ? session.messages as WhatsAppTriageItem['messages'] : [],
      transcript: null,
      sessionId: session?.id ?? null,
    }
  })
}

// ============================================================================
// Fetch single triage item by intervention ID (for detail page)
// ============================================================================

export async function getWhatsAppTriageItemById(interventionId: string): Promise<WhatsAppTriageItem | null> {
  const { team } = await getServerAuthContext('gestionnaire')
  const supabase = createServiceRoleSupabaseClient()

  const { data: intervention, error } = await supabase
    .from('interventions')
    .select('id, reference, title, description, urgency, type, source, created_at, building_id, lot_id, created_by')
    .eq('id', interventionId)
    .eq('team_id', team.id)
    .in('source', AI_SOURCES as unknown as string[])
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !intervention) {
    if (error) logger.warn({ error, interventionId }, '[AI-TRIAGE] Failed to fetch single item')
    return null
  }

  const channel = sourceToChannel(intervention.source)

  // Fetch session/call + documents in parallel
  const [{ data: sessions }, { data: phoneCalls }, { data: documents }] = await Promise.all([
    supabase
      .from('ai_whatsapp_sessions')
      .select('id, intervention_id, contact_phone, extracted_data, messages, identified_user_id')
      .eq('intervention_id', interventionId)
      .limit(1),
    supabase
      .from('ai_phone_calls')
      .select('id, intervention_id, caller_phone, structured_summary, transcript, identified_user_id')
      .eq('intervention_id', interventionId)
      .limit(1),
    supabase
      .from('intervention_documents')
      .select('id, storage_path, storage_bucket, filename, original_filename, mime_type, document_type, description')
      .eq('intervention_id', interventionId)
      .is('deleted_at', null),
  ])

  const session = sessions?.[0] ?? null
  const phoneCall = phoneCalls?.[0] ?? null

  // Look up user name
  const userId = session?.identified_user_id ?? phoneCall?.identified_user_id ?? intervention.created_by
  let callerName: string | null = null
  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, name')
      .eq('id', userId)
      .maybeSingle()
    if (user) callerName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || null
  }

  if (channel === 'phone' && phoneCall) {
    const summary = (phoneCall.structured_summary ?? {}) as Record<string, unknown>
    return {
      id: intervention.id,
      reference: intervention.reference,
      title: intervention.title,
      description: intervention.description,
      urgency: intervention.urgency,
      type: intervention.type,
      created_at: intervention.created_at,
      building_id: intervention.building_id,
      lot_id: intervention.lot_id,
      callerPhone: phoneCall.caller_phone ?? null,
      callerName: callerName ?? (summary.caller_name as string | null) ?? null,
      address: (summary.address as string | null) ?? null,
      problemSummary: (summary.problem_description as string | null) ?? null,
      channel,
      messages: [],
      transcript: phoneCall.transcript ?? null,
      sessionId: null,
      documents: documents ?? [],
    }
  }

  const extractedData = (session?.extracted_data ?? {}) as Record<string, unknown>
  return {
    id: intervention.id,
    reference: intervention.reference,
    title: intervention.title,
    description: intervention.description,
    urgency: intervention.urgency,
    type: intervention.type,
    created_at: intervention.created_at,
    building_id: intervention.building_id,
    lot_id: intervention.lot_id,
    callerPhone: session?.contact_phone ?? null,
    callerName: callerName ?? (extractedData.caller_name as string | null) ?? null,
    address: (extractedData.address as string | null) ?? null,
    problemSummary: (extractedData.problem_description as string | null) ?? null,
    channel,
    messages: Array.isArray(session?.messages) ? session.messages as WhatsAppTriageItem['messages'] : [],
    transcript: null,
    sessionId: session?.id ?? null,
    documents: documents ?? [],
  }
}

// ============================================================================
// Triage actions
// ============================================================================

export async function markWhatsAppAsHandled(interventionId: string): Promise<{ success: boolean; error?: string }> {
  const { team } = await getServerAuthContext('gestionnaire')
  const supabase = createServiceRoleSupabaseClient()

  const { error } = await supabase
    .from('interventions')
    .update({ status: 'cloturee_par_gestionnaire', updated_at: new Date().toISOString() })
    .eq('id', interventionId)
    .eq('team_id', team.id)
    .in('source', AI_SOURCES as unknown as string[])

  if (error) {
    logger.error({ error, interventionId }, '[AI-TRIAGE] Failed to mark as handled')
    return { success: false, error: error.message }
  }

  logger.info({ interventionId }, '[AI-TRIAGE] Marked as handled')
  return { success: true }
}

export async function rejectWhatsAppDemande(
  interventionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { team } = await getServerAuthContext('gestionnaire')
  const supabase = createServiceRoleSupabaseClient()

  const updateData: Record<string, unknown> = {
    status: 'rejetee',
    updated_at: new Date().toISOString(),
  }

  // Store rejection reason in description if provided
  if (reason) {
    const { data: current } = await supabase
      .from('interventions')
      .select('description')
      .eq('id', interventionId)
      .single()

    updateData.description = `${current?.description ?? ''}\n\n--- Motif de rejet ---\n${reason}`
  }

  const { error } = await supabase
    .from('interventions')
    .update(updateData)
    .eq('id', interventionId)
    .eq('team_id', team.id)
    .in('source', AI_SOURCES as unknown as string[])

  if (error) {
    logger.error({ error, interventionId }, '[AI-TRIAGE] Failed to reject')
    return { success: false, error: error.message }
  }

  logger.info({ interventionId, reason }, '[AI-TRIAGE] Rejected')
  return { success: true }
}
