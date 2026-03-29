import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import {
  sendWhatsAppMessage,
  sendTeamSelectionMessage,
  parseDisambiguationReply,
} from './twilio-whatsapp.service'
import {
  touchMapping,
  createOrUpdateMapping,
} from './phone-mapping.service'
import {
  findActiveSession,
  createRoutingSession,
  updateRoutingSession,
  resolveRoutingSession,
  matchTeamByName,
} from './routing-flow.service'
import { restoreOriginalMessage } from './property-selection-flow.service'
import type {
  IncomingWhatsAppMessage,
  ConversationMessage,
  RoutingMetadata,
} from './types'

// ============================================================================
// Team selection flow (known contacts with 2+ team mappings)
// ============================================================================

export interface TeamSelectionResult {
  status: 'skip' | 'pending' | 'resolved'
}

/**
 * Multi-team selection for contacts with 2+ phone_team_mappings.
 * Shows team names sorted by last_used_at DESC (mapping order).
 * "Autre" option → ask for agency name → create mapping if match.
 *
 * After selection: updates last_used_at on mapping, sets message.teamId,
 * then caller should continue to property/intervention selection.
 */
export const handleTeamSelectionFlow = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage
): Promise<TeamSelectionResult> => {
  if (message.teamId || !message.candidateTeams?.length) {
    return { status: 'skip' }
  }

  // Check for active routing session (team_id: null)
  const session = await findActiveSession(supabase, null, message.from)

  if (session) {
    const extractedData = (session.extracted_data as Record<string, unknown>) ?? {}
    const routing = extractedData.routing as RoutingMetadata | undefined

    if (routing?.routing_state === 'awaiting_team_selection') {
      return handleTeamReply(supabase, message, session, routing)
    }
    if (routing?.routing_state === 'awaiting_team_agency') {
      return handleTeamAgencyReply(supabase, message, session, routing)
    }
  }

  // No session → fetch team names and send selection
  const teamIds = message.candidateTeams.map(c => c.teamId)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', teamIds)

  const teamNameMap = new Map((teams ?? []).map(t => [t.id, t.name]))
  const options = teamIds.map(id => ({
    teamId: id,
    label: teamNameMap.get(id) ?? id,
  }))

  const routing: RoutingMetadata = {
    routing_state: 'awaiting_team_selection',
    original_message: message.body,
    candidate_teams: message.candidateTeams,
    disambiguation_options: options,
  }

  // Issue 3 fix: createRoutingSession already returns the session via .select('*').single()
  // No need to call findActiveSession again to retrieve it.
  const newSession = await createRoutingSession(supabase, {
    ...message,
    identifiedVia: 'disambiguation',
  } as IncomingWhatsAppMessage)

  await updateRoutingSession(supabase, newSession.id, routing, [])

  await sendTeamSelectionMessage(
    message.phoneNumber,
    message.from,
    options,
    message.channel
  )

  logger.info(
    { from: message.from, teamCount: options.length, channel: message.channel },
    '[WA-ROUTING] Team selection sent'
  )
  return { status: 'pending' }
}

// ─── Team selection reply handler ────────────────────────────────────────────

const handleTeamReply = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata
): Promise<TeamSelectionResult> => {
  const options = routing.disambiguation_options ?? []
  const totalOptions = options.length + 1 // +1 for "Autre"

  const selectedIndex = parseDisambiguationReply(message.body, totalOptions)

  if (selectedIndex === null) {
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      `Répondez avec un numéro entre 1 et ${totalOptions}.`,
      message.channel
    )
    return { status: 'pending' }
  }

  // "Autre" selected → ask for agency name
  if (selectedIndex === options.length) {
    const newRouting: RoutingMetadata = {
      ...routing,
      routing_state: 'awaiting_team_agency',
    }
    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[])

    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Quel est le nom de votre agence ou gestionnaire ?',
      message.channel
    )

    logger.info({ sessionId: session.id }, '[WA-ROUTING] "Autre" selected — asking for agency name')
    return { status: 'pending' }
  }

  // Team selected
  const selected = options[selectedIndex]
  const candidate = routing.candidate_teams?.find(c => c.teamId === selected.teamId)

  message.teamId = selected.teamId
  message.identifiedVia = 'disambiguation'
  message.identifiedUserId = candidate?.userId ?? null

  if (routing.original_message) {
    message.body = routing.original_message
  }

  // Touch mapping to update last_used_at
  await touchMapping(supabase, message.from, selected.teamId)
  await resolveRoutingSession(supabase, session.id, selected.teamId, 'disambiguation')

  logger.info(
    { sessionId: session.id, teamId: selected.teamId },
    '[WA-ROUTING] Team selected'
  )
  return { status: 'resolved' }
}

// ─── Agency name reply after "Autre" ─────────────────────────────────────────

const handleTeamAgencyReply = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage,
  session: { id: string; extracted_data: unknown; messages: unknown },
  routing: RoutingMetadata
): Promise<TeamSelectionResult> => {
  const agencyName = message.body?.trim()
  if (!agencyName) {
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Quel est le nom de votre agence ou gestionnaire ?',
      message.channel
    )
    return { status: 'pending' }
  }

  const matchedTeamId = await matchTeamByName(supabase, agencyName)

  if (matchedTeamId) {
    message.teamId = matchedTeamId
    message.identifiedVia = 'agency_match'

    restoreOriginalMessage(message, routing)

    // Create a new mapping for this team
    await createOrUpdateMapping(supabase, {
      contactPhone: message.from,
      teamId: matchedTeamId,
      source: 'agency_match',
    })

    await resolveRoutingSession(supabase, session.id, matchedTeamId, 'agency_match')

    logger.info(
      { sessionId: session.id, teamId: matchedTeamId, agency: agencyName },
      '[WA-ROUTING] Agency matched from team selection'
    )
    return { status: 'resolved' }
  }

  // No match — send back to team list
  await sendWhatsAppMessage(
    message.phoneNumber,
    message.from,
    'Je ne trouve pas cette agence. Veuillez réessayer ou choisir dans la liste.',
    message.channel
  )

  // Reset to team selection state
  const newRouting: RoutingMetadata = {
    ...routing,
    routing_state: 'awaiting_team_selection',
  }
  await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[])

  // Re-send team list
  const options = routing.disambiguation_options ?? []
  await sendTeamSelectionMessage(message.phoneNumber, message.from, options, message.channel)

  return { status: 'pending' }
}
