import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import {
  sendWhatsAppMessage,
  sendPropertySelectionMessage,
  sendInterventionSelectionMessage,
  parseDisambiguationReply,
  parseConfirmationReply,
} from './twilio-whatsapp.service'
import {
  fetchUserProperties,
  fetchProviderInterventions,
} from './phone-mapping.service'
import { findActiveSession } from './routing-flow.service'
import { detectLanguage } from './claude-ai.service'
import type {
  IncomingWhatsAppMessage,
  RoutingMetadata,
} from './types'

// ============================================================================
// Property selection flow (known tenants/owners with properties)
// ============================================================================

export interface PropertySelectionResult {
  status: 'skip' | 'pending' | 'selected'
  lotId?: string
  buildingId?: string
}

/**
 * Pre-conversation property selection for known tenants/owners.
 * - 0 properties → skip (normal conversation)
 * - 1 property → confirmation (OUI/NON)
 * - 2+ properties → numbered list + "Autre chose"
 *
 * Returns 'pending' if waiting for user reply, 'selected' with IDs if resolved,
 * or 'skip' if not applicable. When 'selected', message.body is restored to the
 * original message (not the "1" or "oui" reply).
 */
export const handlePropertySelectionFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  existingSession?: Awaited<ReturnType<typeof findActiveSession>>
): Promise<PropertySelectionResult> => {
  // Only for locataire/proprietaire with identified user
  if (
    !message.mappingUserRole ||
    !['locataire', 'proprietaire'].includes(message.mappingUserRole)
  ) {
    return { status: 'skip' }
  }
  if (!message.identifiedUserId || !message.teamId) {
    return { status: 'skip' }
  }

  // Use pre-fetched session if available, otherwise fetch
  const session = existingSession !== undefined
    ? existingSession
    : await findActiveSession(supabase, message.teamId, message.from)

  if (session) {
    const extractedData = (session.extracted_data as Record<string, unknown>) ?? {}
    const routing = extractedData.routing as RoutingMetadata | undefined

    if (routing?.routing_state === 'awaiting_property_selection') {
      return handlePropertyReply(supabase, message, session, routing)
    }

    // Session exists but not in property selection → already in conversation
    return { status: 'skip' }
  }

  // No active session → fetch properties and initiate selection
  const properties = await fetchUserProperties(
    supabase,
    message.identifiedUserId,
    message.teamId
  )

  if (properties.length === 0) {
    return { status: 'skip' }
  }

  // Create session with property selection routing state
  const routing: RoutingMetadata = {
    routing_state: 'awaiting_property_selection',
    original_message: message.body,
    property_options: properties.map(p => ({
      lotId: p.lotId,
      buildingId: p.buildingId,
      label: p.label,
    })),
    property_retry_count: 0,
  }

  await createSelectionSession(supabase, message, routing)
  await sendPropertySelectionMessage(
    message.phoneNumber,
    message.from,
    properties,
    message.channel
  )

  logger.info(
    { from: message.from, propertyCount: properties.length, channel: message.channel },
    '[WA-ROUTING] Property selection sent'
  )
  return { status: 'pending' }
}

// ─── Property reply handler ──────────────────────────────────────────────────

const handlePropertyReply = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata
): Promise<PropertySelectionResult> => {
  const options = routing.property_options ?? []
  const retryCount = routing.property_retry_count ?? 0

  // ─── Single property → confirmation (OUI/NON) ──────────────────
  if (options.length === 1) {
    const confirmed = parseConfirmationReply(message.body)

    if (confirmed === null) {
      if (retryCount >= 2) {
        await clearSelectionState(supabase, session.id)
        restoreOriginalMessage(message, routing)
        logger.info({ sessionId: session.id }, '[WA-ROUTING] Property confirmation max retries — skipping')
        return { status: 'skip' }
      }

      await sendWhatsAppMessage(
        message.phoneNumber,
        message.from,
        'Répondez OUI ou NON.',
        message.channel
      )
      await bumpRetryCount(supabase, session.id, routing, 'property_retry_count')
      return { status: 'pending' }
    }

    if (!confirmed) {
      await clearSelectionState(supabase, session.id)
      restoreOriginalMessage(message, routing)
      return { status: 'skip' }
    }

    // Confirmed → pre-identify
    const prop = options[0]
    await resolveSelectionState(supabase, session.id, prop.lotId, prop.buildingId)
    restoreOriginalMessage(message, routing)

    logger.info(
      { sessionId: session.id, lotId: prop.lotId, buildingId: prop.buildingId },
      '[WA-ROUTING] Property confirmed'
    )
    return { status: 'selected', lotId: prop.lotId, buildingId: prop.buildingId }
  }

  // ─── Multiple properties → numbered reply ──────────────────────
  const totalOptions = options.length + 1 // +1 for "Autre chose"
  const selectedIndex = parseDisambiguationReply(message.body, totalOptions)

  if (selectedIndex === null) {
    if (retryCount >= 2) {
      await clearSelectionState(supabase, session.id)
      restoreOriginalMessage(message, routing)
      logger.info({ sessionId: session.id }, '[WA-ROUTING] Property selection max retries — skipping')
      return { status: 'skip' }
    }

    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      `Répondez avec un numéro entre 1 et ${totalOptions}.`,
      message.channel
    )
    await bumpRetryCount(supabase, session.id, routing, 'property_retry_count')
    return { status: 'pending' }
  }

  // "Autre chose" selected (last option)
  if (selectedIndex === options.length) {
    await clearSelectionState(supabase, session.id)
    restoreOriginalMessage(message, routing)
    logger.info({ sessionId: session.id }, '[WA-ROUTING] "Autre chose" selected — skipping property')
    return { status: 'skip' }
  }

  // Property selected
  const prop = options[selectedIndex]
  await resolveSelectionState(supabase, session.id, prop.lotId, prop.buildingId)
  restoreOriginalMessage(message, routing)

  logger.info(
    { sessionId: session.id, lotId: prop.lotId, buildingId: prop.buildingId, index: selectedIndex },
    '[WA-ROUTING] Property selected'
  )
  return { status: 'selected', lotId: prop.lotId, buildingId: prop.buildingId }
}

// ============================================================================
// Intervention selection flow (known providers with active interventions)
// ============================================================================

export interface InterventionSelectionResult {
  status: 'skip' | 'pending' | 'selected'
  lotId?: string
  buildingId?: string
}

/**
 * Pre-conversation intervention selection for known providers.
 * MVP: provider always creates a NEW intervention — selection only pre-fills
 * building/lot context from the selected intervention.
 * - 0 active interventions → skip (normal conversation)
 * - 1+ active interventions → numbered list + "Nouveau problème"
 */
export const handleInterventionSelectionFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  existingSession?: Awaited<ReturnType<typeof findActiveSession>>
): Promise<InterventionSelectionResult> => {
  if (message.mappingUserRole !== 'prestataire') {
    return { status: 'skip' }
  }
  if (!message.identifiedUserId || !message.teamId) {
    return { status: 'skip' }
  }

  // Use pre-fetched session if available, otherwise fetch
  const session = existingSession !== undefined
    ? existingSession
    : await findActiveSession(supabase, message.teamId, message.from)

  if (session) {
    const extractedData = (session.extracted_data as Record<string, unknown>) ?? {}
    const routing = extractedData.routing as RoutingMetadata | undefined

    if (routing?.routing_state === 'awaiting_intervention_selection') {
      return handleInterventionReply(supabase, message, session, routing)
    }

    return { status: 'skip' }
  }

  const interventions = await fetchProviderInterventions(
    supabase,
    message.identifiedUserId,
    message.teamId
  )

  if (interventions.length === 0) {
    return { status: 'skip' }
  }

  const routing: RoutingMetadata = {
    routing_state: 'awaiting_intervention_selection',
    original_message: message.body,
    intervention_options: interventions.map(iv => ({
      interventionId: iv.interventionId,
      label: iv.label,
      buildingId: iv.buildingId,
      lotId: iv.lotId,
    })),
    intervention_retry_count: 0,
  }

  await createSelectionSession(supabase, message, routing)
  await sendInterventionSelectionMessage(
    message.phoneNumber,
    message.from,
    interventions,
    message.channel
  )

  logger.info(
    { from: message.from, interventionCount: interventions.length, channel: message.channel },
    '[WA-ROUTING] Intervention selection sent'
  )
  return { status: 'pending' }
}

// ─── Intervention reply handler ──────────────────────────────────────────────

const handleInterventionReply = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata
): Promise<InterventionSelectionResult> => {
  const options = routing.intervention_options ?? []
  const retryCount = routing.intervention_retry_count ?? 0
  const totalOptions = options.length + 1 // +1 for "Nouveau problème"

  const selectedIndex = parseDisambiguationReply(message.body, totalOptions)

  if (selectedIndex === null) {
    if (retryCount >= 2) {
      await clearSelectionState(supabase, session.id)
      restoreOriginalMessage(message, routing)
      logger.info({ sessionId: session.id }, '[WA-ROUTING] Intervention selection max retries — skipping')
      return { status: 'skip' }
    }

    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      `Répondez avec un numéro entre 1 et ${totalOptions}.`,
      message.channel
    )
    await bumpRetryCount(supabase, session.id, routing, 'intervention_retry_count')
    return { status: 'pending' }
  }

  // "Nouveau problème" selected (last option) — skip pre-fill
  if (selectedIndex === options.length) {
    await clearSelectionState(supabase, session.id)
    restoreOriginalMessage(message, routing)
    logger.info({ sessionId: session.id }, '[WA-ROUTING] "Nouveau problème" selected — skipping intervention')
    return { status: 'skip' }
  }

  // Intervention selected — pre-fill building/lot from that intervention
  const iv = options[selectedIndex]
  await resolveSelectionState(supabase, session.id, iv.lotId, iv.buildingId)
  restoreOriginalMessage(message, routing)

  logger.info(
    { sessionId: session.id, interventionId: iv.interventionId, buildingId: iv.buildingId, lotId: iv.lotId },
    '[WA-ROUTING] Intervention selected — pre-filling context'
  )
  return { status: 'selected', lotId: iv.lotId, buildingId: iv.buildingId }
}

// ============================================================================
// Shared selection session helpers (used by property + intervention + team)
// ============================================================================

export const restoreOriginalMessage = (
  message: IncomingWhatsAppMessage,
  routing: RoutingMetadata
): void => {
  if (routing.original_message) {
    message.body = routing.original_message
  }
}

export const createSelectionSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  routing: RoutingMetadata
): Promise<void> => {
  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .insert({
      team_id: message.teamId,
      phone_number_id: message.phoneNumberId,
      contact_phone: message.from,
      status: 'active',
      messages: [],
      extracted_data: { routing } as unknown as Record<string, unknown>,
      identified_via: message.identifiedVia,
      identified_user_id: message.identifiedUserId ?? null,
      channel: message.channel ?? 'whatsapp',
      language: message.body ? detectLanguage(message.body) : 'fr',
      last_message_at: new Date().toISOString(),
    })

  if (error) {
    logger.warn({ error, from: message.from }, '[WA-ROUTING] Selection session creation failed')
  }
}

export const clearSelectionState = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  sessionId: string
): Promise<void> => {
  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      extracted_data: {},
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    logger.warn({ error, sessionId }, '[WA-ROUTING] Clear selection state failed')
  }
}

export const resolveSelectionState = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  sessionId: string,
  lotId?: string,
  buildingId?: string
): Promise<void> => {
  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      extracted_data: {
        lot_id: lotId ?? null,
        building_id: buildingId ?? null,
        pre_identified: true,
      },
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    logger.warn({ error, sessionId }, '[WA-ROUTING] Resolve selection state failed')
  }
}

// ─── Retry bumper (shared by property + intervention flows) ─────────────────

const bumpRetryCount = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  sessionId: string,
  routing: RoutingMetadata,
  field: 'property_retry_count' | 'intervention_retry_count'
): Promise<void> => {
  const updated: RoutingMetadata = {
    ...routing,
    [field]: (routing[field] ?? 0) + 1,
  }

  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      extracted_data: { routing: updated } as unknown as Record<string, unknown>,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    logger.warn({ error, sessionId, field }, '[WA-ROUTING] Bump retry failed')
  }
}
