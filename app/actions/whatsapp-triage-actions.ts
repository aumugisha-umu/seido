'use server'

import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

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
  created_at: string
  building_id: string | null
  lot_id: string | null
  callerPhone: string | null
  callerName: string | null
  address: string | null
  problemSummary: string | null
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  sessionId: string | null
}

// ============================================================================
// Fetch WhatsApp triage items for a team
// ============================================================================

export async function getWhatsAppTriageItems(): Promise<WhatsAppTriageItem[]> {
  const { team } = await getServerAuthContext('gestionnaire')
  const supabase = createServiceRoleSupabaseClient()

  // Fetch demande_whatsapp interventions still in "demande" status
  const { data: interventions, error } = await supabase
    .from('interventions')
    .select('id, reference, title, description, urgency, created_at, building_id, lot_id, created_by')
    .eq('team_id', team.id)
    .eq('type', 'demande_whatsapp')
    .eq('status', 'demande')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !interventions?.length) {
    if (error) logger.warn({ error }, '[WA-TRIAGE] Failed to fetch interventions')
    return []
  }

  // Fetch matching WhatsApp sessions
  const interventionIds = interventions.map(i => i.id)
  const { data: sessions } = await supabase
    .from('ai_whatsapp_sessions')
    .select('id, intervention_id, contact_phone, extracted_data, messages, identified_user_id')
    .in('intervention_id', interventionIds)

  // If we have identified users, fetch their names
  const identifiedUserIds = [
    ...new Set([
      ...(sessions?.filter(s => s.identified_user_id).map(s => s.identified_user_id!) ?? []),
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

  // Map sessions by intervention_id
  const sessionMap = new Map(sessions?.map(s => [s.intervention_id, s]) ?? [])

  return interventions.map(intervention => {
    const session = sessionMap.get(intervention.id)
    const extractedData = (session?.extracted_data ?? {}) as Record<string, unknown>
    const userId = session?.identified_user_id ?? intervention.created_by

    return {
      id: intervention.id,
      reference: intervention.reference,
      title: intervention.title,
      description: intervention.description,
      urgency: intervention.urgency,
      created_at: intervention.created_at,
      building_id: intervention.building_id,
      lot_id: intervention.lot_id,
      callerPhone: session?.contact_phone ?? null,
      callerName: userId ? (userNames[userId] ?? null) : (extractedData.caller_name as string | null) ?? null,
      address: (extractedData.address as string | null) ?? null,
      problemSummary: (extractedData.problem_description as string | null) ?? null,
      messages: Array.isArray(session?.messages) ? session.messages as WhatsAppTriageItem['messages'] : [],
      sessionId: session?.id ?? null,
    }
  })
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
    .eq('type', 'demande_whatsapp')

  if (error) {
    logger.error({ error, interventionId }, '[WA-TRIAGE] Failed to mark as handled')
    return { success: false, error: error.message }
  }

  logger.info({ interventionId }, '[WA-TRIAGE] Marked as handled')
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
    .eq('type', 'demande_whatsapp')

  if (error) {
    logger.error({ error, interventionId }, '[WA-TRIAGE] Failed to reject')
    return { success: false, error: error.message }
  }

  logger.info({ interventionId, reason }, '[WA-TRIAGE] Rejected')
  return { success: true }
}
