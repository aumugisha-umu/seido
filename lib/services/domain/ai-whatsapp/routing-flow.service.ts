import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import {
  sendWhatsAppMessage,
  sendDisambiguationMessage,
  parseDisambiguationReply,
} from './twilio-whatsapp.service'
import {
  createOrUpdateMapping,
} from './phone-mapping.service'
import { detectLanguage } from './claude-ai.service'
import type {
  IncomingWhatsAppMessage,
  ConversationMessage,
  RoutingMetadata,
  RoutingState,
} from './types'

// ============================================================================
// Session lookup (shared with conversation-engine + selection flows)
// ============================================================================

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours

export const findActiveSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string | null,
  contactPhone: string
) => {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString()

  let query = supabase
    .from('ai_whatsapp_sessions')
    .select('*')
    .eq('contact_phone', contactPhone)
    .eq('status', 'active')
    .gt('last_message_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)

  // Nullable team_id: use .is() for null, .eq() for non-null
  query = teamId ? query.eq('team_id', teamId) : query.is('team_id', null)

  const { data } = await query.maybeSingle()
  return data
}

// ============================================================================
// Routing flow — unknown contact / disambiguation
// ============================================================================

/**
 * Pre-routing layer for unknown contacts (teamId is null) or disambiguation
 * (contact belongs to multiple teams). Uses a state machine stored in the
 * session's extracted_data.routing field.
 *
 * Returns true if routing resolved (message.teamId is now set) — caller
 * should continue to normal conversation flow.
 * Returns false if routing is still in progress or resulted in orphan — caller
 * should stop processing.
 */
export const handleRoutingFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage
): Promise<boolean> => {
  // ─── 1. Find or create a routing session (team_id: null) ───────
  let session = await findActiveSession(supabase, null, message.from)
  const isNewSession = !session

  if (!session) {
    session = await createRoutingSession(supabase, message)
    logger.info({ sessionId: session.id, from: message.from, via: message.identifiedVia }, '[WA-ROUTING] New routing session created')
  }

  const extractedData = (session.extracted_data as Record<string, unknown>) ?? {}
  const routing = (extractedData.routing as RoutingMetadata | undefined) ?? null
  const currentState: RoutingState = routing?.routing_state ?? 'awaiting_address'

  // ─── 2. Disambiguation flow ────────────────────────────────────
  if (message.identifiedVia === 'disambiguation' && message.candidateTeams?.length) {
    return handleDisambiguationFlow(supabase, message, session, routing, currentState, isNewSession)
  }

  // ─── 3. Unknown contact flow (address → agency → orphan) ──────
  return handleUnknownContactFlow(supabase, message, session, routing, currentState, isNewSession)
}

// ─── Disambiguation sub-flow ─────────────────────────────────────────────────

const handleDisambiguationFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata | null,
  currentState: RoutingState,
  isNewSession: boolean
): Promise<boolean> => {
  const candidates = message.candidateTeams ?? []

  // State: awaiting_disambiguation — send the disambiguation message
  if (isNewSession || currentState === 'awaiting_disambiguation') {
    const options = await fetchTeamAddresses(supabase, candidates.map(c => c.teamId))

    await sendDisambiguationMessage(message.phoneNumber, message.from, options.map(o => ({ id: o.teamId, label: o.label })), message.channel)

    const newRouting: RoutingMetadata = {
      routing_state: 'resolving_disambiguation',
      original_message: message.body,
      candidate_teams: candidates,
      disambiguation_options: options,
    }

    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[])
    logger.info({ sessionId: session.id, optionCount: options.length }, '[WA-ROUTING] Disambiguation message sent')
    return false
  }

  // State: resolving_disambiguation — parse the user's reply
  if (currentState === 'resolving_disambiguation' && routing) {
    const optionCount = routing.disambiguation_options?.length ?? 0
    const selectedIndex = parseDisambiguationReply(message.body, optionCount)

    if (selectedIndex === null) {
      // Invalid reply — ask again
      await sendWhatsAppMessage(
        message.phoneNumber,
        message.from,
        `Veuillez repondre avec un numero entre 1 et ${optionCount}.`,
        message.channel
      )
      return false
    }

    const selectedOption = routing.disambiguation_options?.[selectedIndex]
    const selectedCandidate = selectedOption
      ? routing.candidate_teams?.find(c => c.teamId === selectedOption.teamId)
      : undefined
    if (!selectedOption || !selectedCandidate) {
      logger.error({ sessionId: session.id, selectedIndex }, '[WA-ROUTING] Invalid disambiguation selection')
      return false
    }

    // Resolve: set teamId on message and update session
    message.teamId = selectedOption.teamId
    message.identifiedVia = 'disambiguation'
    message.identifiedUserId = selectedCandidate.userId

    // Restore original message body (not the "1" reply)
    if (routing.original_message) {
      message.body = routing.original_message
    }

    await resolveRoutingSession(supabase, session.id, selectedOption.teamId, 'disambiguation')
    logger.info({ sessionId: session.id, teamId: selectedOption.teamId }, '[WA-ROUTING] Disambiguation resolved')
    return true
  }

  return false
}

// ─── Unknown contact sub-flow ────────────────────────────────────────────────

const handleUnknownContactFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata | null,
  currentState: RoutingState,
  isNewSession: boolean
): Promise<boolean> => {

  // State: awaiting_address — first message from unknown contact
  if (isNewSession || currentState === 'awaiting_address') {
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Bonjour, je suis l\'assistant Seido. Pouvez-vous me donner l\'adresse de votre logement ?',
      message.channel
    )

    const newRouting: RoutingMetadata = {
      routing_state: 'resolving_address',
      original_message: message.body,
    }

    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[])
    logger.info({ sessionId: session.id }, '[WA-ROUTING] Asked for address')
    return false
  }

  // State: resolving_address — user replied with address
  if (currentState === 'resolving_address') {
    const addressText = message.body?.trim()
    if (!addressText) {
      await sendWhatsAppMessage(
        message.phoneNumber,
        message.from,
        'Pourriez-vous me donner l\'adresse de votre logement (rue et ville) ?',
        message.channel
      )
      return false
    }

    // Fuzzy match on buildings (all teams with whatsapp_enabled)
    const matchedTeamId = await matchBuildingByAddress(supabase, addressText)

    if (matchedTeamId) {
      message.teamId = matchedTeamId
      message.identifiedVia = 'address_match'

      // Restore original message if we have one
      if (routing?.original_message) {
        message.body = routing.original_message
      }

      await resolveRoutingSession(supabase, session.id, matchedTeamId, 'address_match')
      await createOrUpdateMapping(supabase, {
        contactPhone: message.from,
        teamId: matchedTeamId,
        source: 'address_match',
      })
      logger.info({ sessionId: session.id, teamId: matchedTeamId }, '[WA-ROUTING] Address matched')
      return true
    }

    // No match — ask for agency name
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Je ne trouve pas cette adresse. Quel est le nom de votre agence ou gestionnaire ?',
      message.channel
    )

    const newRouting: RoutingMetadata = {
      ...routing,
      routing_state: 'awaiting_agency',
      original_message: routing?.original_message ?? message.body,
    }

    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[])
    logger.info({ sessionId: session.id }, '[WA-ROUTING] Address not found — asking for agency')
    return false
  }

  // State: awaiting_agency — user replied with agency name
  if (currentState === 'awaiting_agency') {
    const agencyName = message.body?.trim()
    if (!agencyName) {
      await sendWhatsAppMessage(
        message.phoneNumber,
        message.from,
        'Pourriez-vous me donner le nom de votre agence ou gestionnaire immobilier ?',
        message.channel
      )
      return false
    }

    const matchedTeamId = await matchTeamByName(supabase, agencyName)

    if (matchedTeamId) {
      message.teamId = matchedTeamId
      message.identifiedVia = 'agency_match'

      if (routing?.original_message) {
        message.body = routing.original_message
      }

      await resolveRoutingSession(supabase, session.id, matchedTeamId, 'agency_match')
      await createOrUpdateMapping(supabase, {
        contactPhone: message.from,
        teamId: matchedTeamId,
        source: 'agency_match',
      })
      logger.info({ sessionId: session.id, teamId: matchedTeamId }, '[WA-ROUTING] Agency matched')
      return true
    }

    // No match — route to Seido admin team (fallback)
    const fallbackTeamId = process.env.SEIDO_FALLBACK_TEAM_ID
    if (fallbackTeamId) {
      message.teamId = fallbackTeamId
      message.identifiedVia = 'orphan'

      if (routing?.original_message) {
        message.body = routing.original_message
      }

      await resolveRoutingSession(supabase, session.id, fallbackTeamId, 'orphan')
      await createOrUpdateMapping(supabase, {
        contactPhone: message.from,
        teamId: fallbackTeamId,
        source: 'orphan',
      })
      logger.info({ sessionId: session.id, teamId: fallbackTeamId }, '[WA-ROUTING] No team match — routed to admin team')
      return true
    }

    // No fallback team configured — dead-end
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Merci, je prends votre demande en charge. Notre equipe va la transferer au bon gestionnaire dans les plus brefs delais.',
      message.channel
    )

    const newRouting: RoutingMetadata = {
      ...routing,
      routing_state: 'orphan',
    }

    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[], 'orphan')
    logger.info({ sessionId: session.id }, '[WA-ROUTING] Orphan session — no team match (no fallback configured)')
    return false
  }

  // State: orphan — route to admin team if fallback configured, otherwise ignore
  if (currentState === 'orphan') {
    const fallbackTeamId = process.env.SEIDO_FALLBACK_TEAM_ID
    if (fallbackTeamId) {
      message.teamId = fallbackTeamId
      message.identifiedVia = 'orphan'

      await resolveRoutingSession(supabase, session.id, fallbackTeamId, 'orphan')
      await createOrUpdateMapping(supabase, {
        contactPhone: message.from,
        teamId: fallbackTeamId,
        source: 'orphan',
      })
      logger.info({ sessionId: session.id, teamId: fallbackTeamId }, '[WA-ROUTING] Orphan session resolved to admin team')
      return true
    }

    logger.info({ sessionId: session.id }, '[WA-ROUTING] Ignoring message on orphan session')
    return false
  }

  return false
}

// ============================================================================
// Routing session helpers (exported for selection flows)
// ============================================================================

export const createRoutingSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage
) => {
  const initialRouting: RoutingMetadata = message.identifiedVia === 'disambiguation'
    ? { routing_state: 'awaiting_disambiguation', candidate_teams: message.candidateTeams }
    : { routing_state: 'awaiting_address', original_message: message.body }

  const { data, error } = await supabase
    .from('ai_whatsapp_sessions')
    .insert({
      team_id: null,
      phone_number_id: message.phoneNumberId,
      contact_phone: message.from,
      status: 'active',
      messages: [],
      extracted_data: { routing: initialRouting } as unknown as Record<string, unknown>,
      identified_via: message.identifiedVia,
      channel: message.channel ?? 'whatsapp',
      language: message.body ? detectLanguage(message.body) : 'fr',
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create routing session: ${error?.message ?? 'no data'}`)
  }
  return data
}

export const updateRoutingSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  sessionId: string,
  routing: RoutingMetadata,
  messages: ConversationMessage[],
  identifiedVia?: string
) => {
  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      extracted_data: { routing } as unknown as Record<string, unknown>,
      messages: messages as unknown as Record<string, unknown>[],
      last_message_at: new Date().toISOString(),
      ...(identifiedVia ? { identified_via: identifiedVia } : {}),
    })
    .eq('id', sessionId)

  if (error) {
    logger.warn({ error, sessionId }, '[WA-ROUTING] Session update failed')
  }
}

export const resolveRoutingSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  sessionId: string,
  teamId: string,
  identifiedVia: string
) => {
  // Mark the routing session as completed — a new team-scoped session
  // will be created by the normal flow
  const { error } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      team_id: teamId,
      identified_via: identifiedVia,
      status: 'completed', // routing session is done, normal session takes over
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    logger.warn({ error, sessionId }, '[WA-ROUTING] Session resolve failed')
  }
}

// ─── Address fuzzy matching (cross-team, whatsapp-enabled only) ──────────────

const matchBuildingByAddress = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  addressText: string
): Promise<string | null> => {
  // Get all whatsapp-enabled team IDs
  const { data: enabledTeams } = await supabase
    .from('ai_phone_numbers')
    .select('team_id')
    .eq('whatsapp_enabled', true)

  if (!enabledTeams?.length) return null

  const teamIds = enabledTeams.map(t => t.team_id).filter(Boolean) as string[]

  // Query buildings with addresses for those teams
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, team_id, addresses!inner(street, city)')
    .in('team_id', teamIds)
    .is('deleted_at', null)
    .limit(200)

  if (!buildings?.length) return null

  const normalizedInput = addressText.toLowerCase()

  const match = buildings.find((b) => {
    const addr = b.addresses as unknown as { street: string; city: string } | null
    if (!addr) return false
    // Require street match (city-only is too broad — would match all buildings in a city)
    return normalizedInput.includes(addr.street.toLowerCase())
  })

  return match?.team_id ?? null
}

// ─── Agency name matching (exported for team-selection-flow) ─────────────────

export const matchTeamByName = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  agencyName: string
): Promise<string | null> => {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', `%${agencyName.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`)
    .limit(5)

  if (!teams?.length) return null

  // If exactly 1 match, use it. If multiple, use the first (v1 simplicity).
  return teams[0].id
}

// ============================================================================
// Disambiguation: fetch building addresses per team for multi-team tenants
// ============================================================================

/**
 * For each team, fetch the primary building address to display in the
 * disambiguation message. Falls back to team name if no building found.
 */
export const fetchTeamAddresses = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamIds: string[]
): Promise<Array<{ teamId: string; label: string }>> => {
  // Batch: fetch buildings + team names in 2 queries instead of N+1
  const [{ data: buildings }, { data: teams }] = await Promise.all([
    supabase
      .from('buildings_active')
      .select('team_id, addresses(street, city, postal_code)')
      .in('team_id', teamIds)
      .limit(50),
    supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds),
  ])

  const teamNameMap = new Map((teams ?? []).map(t => [t.id, t.name]))

  // Group first building per team
  const buildingByTeam = new Map<string, { street: string; city: string; postal_code: string }>()
  for (const b of buildings ?? []) {
    if (buildingByTeam.has(b.team_id)) continue
    const addr = b.addresses as unknown as { street: string; city: string; postal_code: string } | null
    if (addr?.street) {
      buildingByTeam.set(b.team_id, addr)
    }
  }

  return teamIds.map(teamId => {
    const addr = buildingByTeam.get(teamId)
    if (addr) {
      return { teamId, label: `${addr.street}, ${addr.postal_code} ${addr.city}` }
    }
    return { teamId, label: teamNameMap.get(teamId) ?? teamId }
  })
}
