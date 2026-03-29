import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { sendWhatsAppMessage, sendDisambiguationMessage, parseDisambiguationReply, downloadMedia } from './twilio-whatsapp.service'
import type {
  IncomingWhatsAppMessage,
  SessionExtractedData,
  ConversationMessage,
  ClaudeResponse,
  RoutingMetadata,
  RoutingState,
} from './types'

// ============================================================================
// Constants
// ============================================================================

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours
const MAX_MESSAGES_PER_SESSION = 30

// ============================================================================
// Claude response schema (AI SDK 6.x — Output.object)
// ============================================================================

const claudeResponseSchema = z.object({
  text: z.string().describe('The message to send to the tenant'),
  conversation_complete: z.boolean().describe('true when step 4 (closure) is done'),
  extracted_data: z.object({
    caller_name: z.string().optional(),
    address: z.string().optional(),
    problem_description: z.string().optional(),
    urgency: z.enum(['basse', 'normale', 'haute', 'urgente']).optional(),
    additional_notes: z.string().optional(),
  }).optional().describe('Data extracted from this message'),
})

// ============================================================================
// Main entry point (called from webhook after())
// ============================================================================

export const handleIncomingWhatsApp = async (
  message: IncomingWhatsAppMessage
): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()

  // ─── 0. Pre-routing: unknown contact or disambiguation ─────────
  if (!message.teamId || message.identifiedVia === 'disambiguation') {
    const routed = await handleRoutingFlow(supabase, message)
    if (!routed) return // routing in progress or orphan — stop here
    // Routing resolved: message.teamId is now set, continue to normal flow
  }

  // Safety: after routing, teamId must be non-null
  if (!message.teamId) {
    logger.error({ from: message.from }, '[WA-ENGINE] teamId still null after routing — aborting')
    return
  }

  // ─── 1. Load or create session ──────────────────────────────────
  let session = await findActiveSession(supabase, message.teamId, message.from)

  if (!session) {
    session = await createSession(supabase, message)
    logger.info({ sessionId: session.id, from: message.from }, '[WA-ENGINE] New session created')
  } else {
    logger.info({ sessionId: session.id, from: message.from }, '[WA-ENGINE] Existing session loaded')
  }

  // Extract typed data once — avoid repeated casts
  const sessionExtracted: SessionExtractedData = (session.extracted_data as SessionExtractedData) ?? {}

  // Pre-fill caller name from Meta contact if not yet known
  if (!sessionExtracted.caller_name && message.contactName) {
    sessionExtracted.caller_name = message.contactName
  }

  // Check max messages
  const currentMessages = (session.messages as ConversationMessage[]) ?? []
  if (currentMessages.length >= MAX_MESSAGES_PER_SESSION) {
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Cette conversation a atteint sa limite. Veuillez reessayer plus tard pour creer une nouvelle demande.'
    )
    await supabase.from('ai_whatsapp_sessions').update({ status: 'completed' }).eq('id', session.id)
    return
  }

  // ─── 2. Handle media (photo) ────────────────────────────────────
  let imageBase64: string | null = null
  if (message.numMedia > 0 && message.mediaUrl && message.mediaContentType?.startsWith('image/')) {
    try {
      const { buffer, contentType } = await downloadMedia(message.mediaUrl)

      // Derive file extension from actual content type
      const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'application/pdf': 'pdf' }
      const ext = extMap[contentType] ?? contentType.split('/')[1] ?? 'bin'

      // Store in Supabase Storage — save path (private bucket, not public URL)
      const storagePath = `whatsapp/${session.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, { contentType, upsert: false })

      if (!uploadError) {
        const mediaUrls = sessionExtracted.media_urls ?? []
        mediaUrls.push(storagePath)
        sessionExtracted.media_urls = mediaUrls
      } else {
        logger.warn({ uploadError, storagePath }, '[WA-ENGINE] Photo upload failed — continuing without stored URL')
      }

      // Prepare for Claude vision
      imageBase64 = buffer.toString('base64')

      logger.info({ storagePath }, '[WA-ENGINE] Photo downloaded and stored')
    } catch (err) {
      logger.error({ err }, '[WA-ENGINE] Failed to download/store photo — continuing without it')
    }
  }

  // ─── 3. Add user message to history ─────────────────────────────
  const messages = (session.messages as ConversationMessage[]) ?? []
  messages.push({
    role: 'user',
    content: message.body || (message.numMedia > 0 ? '[photo]' : '[empty]'),
    timestamp: new Date().toISOString(),
    media_type: message.numMedia > 0 ? 'image' : 'text',
  })

  // ─── 4. Call Claude ─────────────────────────────────────────────
  const teamName = await getTeamName(supabase, message.teamId)
  const claudeResponse = await callClaude({
    messages,
    teamName,
    customInstructions: message.customInstructions,
    extractedData: sessionExtracted,
    image: imageBase64 && message.mediaContentType
      ? { base64: imageBase64, contentType: message.mediaContentType }
      : undefined,
  })

  // Free image memory — no longer needed after Claude call
  imageBase64 = null

  // ─── 5. Add assistant response to history ───────────────────────
  messages.push({
    role: 'assistant',
    content: claudeResponse.text,
    timestamp: new Date().toISOString(),
  })

  // ─── 6. Merge extracted data ────────────────────────────────────
  const extractedData: SessionExtractedData = {
    ...sessionExtracted,
    ...claudeResponse.extracted_data,
  }
  // Preserve media_urls from step 2
  if (sessionExtracted.media_urls) {
    extractedData.media_urls = sessionExtracted.media_urls
  }

  // ─── 7. Update session in DB ────────────────────────────────────
  const newStatus = claudeResponse.conversation_complete ? 'completed' : 'active'
  const { error: updateError } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      messages: messages as unknown as Record<string, unknown>[], // Supabase Json column requires cast
      extracted_data: extractedData as unknown as Record<string, unknown>, // Supabase Json column requires cast
      status: newStatus,
      last_message_at: new Date().toISOString(),
      // Only detect language on first message — preserve initial detection afterwards
      ...(currentMessages.length === 0 && message.body ? { language: detectLanguage(message.body) } : {}),
    })
    .eq('id', session.id)

  if (updateError) {
    logger.warn({ error: updateError, sessionId: session.id }, '[WA-ENGINE] Session update failed')
  }

  // ─── 8. Send reply via Twilio WhatsApp API ─────────────────────
  await sendWhatsAppMessage(message.phoneNumber, message.from, claudeResponse.text)
  logger.info({ sessionId: session.id, complete: claudeResponse.conversation_complete }, '[WA-ENGINE] Reply sent')

  // ─── 9. If complete → create intervention ───────────────────────
  if (claudeResponse.conversation_complete) {
    try {
      const { createInterventionFromSession } = await import('./intervention-creator.service')
      await createInterventionFromSession({
        sessionId: session.id,
        teamId: message.teamId,
        extractedData,
        messages,
        contactPhone: session.contact_phone,
        identifiedUserId: session.identified_user_id,
        language: session.language,
      })
    } catch (err) {
      logger.error({ err, sessionId: session.id }, '[WA-ENGINE] Failed to create intervention')
    }
  }
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
const handleRoutingFlow = async (
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

    await sendDisambiguationMessage(message.phoneNumber, message.from, options.map(o => ({ id: o.teamId, label: o.label })))

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
        `Veuillez repondre avec un numero entre 1 et ${optionCount}.`
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
      'Bonjour, je suis l\'assistant Seido. Pouvez-vous me donner l\'adresse de votre logement ?'
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
        'Pourriez-vous me donner l\'adresse de votre logement (rue et ville) ?'
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
      logger.info({ sessionId: session.id, teamId: matchedTeamId }, '[WA-ROUTING] Address matched')
      return true
    }

    // No match — ask for agency name
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Je ne trouve pas cette adresse. Quel est le nom de votre agence ou gestionnaire ?'
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
        'Pourriez-vous me donner le nom de votre agence ou gestionnaire immobilier ?'
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
      logger.info({ sessionId: session.id, teamId: matchedTeamId }, '[WA-ROUTING] Agency matched')
      return true
    }

    // No match — orphan
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Merci, je prends votre demande en charge. Notre equipe va la transferer au bon gestionnaire dans les plus brefs delais.'
    )

    const newRouting: RoutingMetadata = {
      ...routing,
      routing_state: 'orphan',
    }

    await updateRoutingSession(supabase, session.id, newRouting, session.messages as ConversationMessage[], 'orphan')
    logger.info({ sessionId: session.id }, '[WA-ROUTING] Orphan session — no team match')
    return false
  }

  // State: orphan — no further processing
  if (currentState === 'orphan') {
    logger.info({ sessionId: session.id }, '[WA-ROUTING] Ignoring message on orphan session')
    return false
  }

  return false
}

// ─── Routing session helpers ─────────────────────────────────────────────────

const createRoutingSession = async (
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

const updateRoutingSession = async (
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

const resolveRoutingSession = async (
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

// ─── Agency name matching ────────────────────────────────────────────────────

const matchTeamByName = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  agencyName: string
): Promise<string | null> => {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', `%${agencyName.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`)
    .limit(5)

  if (!teams?.length) return null

  // If exactly 1 match, use it. If multiple, use the first (v1 simplicity).
  return teams[0].id
}

// ============================================================================
// Session management
// ============================================================================

const findActiveSession = async (
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

const createSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage
) => {
  const { data, error } = await supabase
    .from('ai_whatsapp_sessions')
    .insert({
      team_id: message.teamId,
      phone_number_id: message.phoneNumberId,
      contact_phone: message.from,
      status: 'active',
      messages: [],
      extracted_data: {},
      language: detectLanguage(message.body) ?? 'fr',
      identified_via: message.identifiedVia ?? 'phone_match',
      identified_user_id: message.identifiedUserId ?? null,
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? 'no data'}`)
  }
  return data
}

// ============================================================================
// Claude AI
// ============================================================================

interface CallClaudeOptions {
  messages: ConversationMessage[]
  teamName: string
  customInstructions: string | null
  extractedData: SessionExtractedData
  image?: { base64: string; contentType: string }
}

const callClaude = async (opts: CallClaudeOptions): Promise<ClaudeResponse> => {
  const systemPrompt = buildSystemPrompt(opts.teamName, opts.customInstructions, opts.extractedData)

  // Build AI SDK messages from conversation history
  const aiMessages = opts.messages.map((m) => {
    if (m.role === 'user' && opts.image && m === opts.messages[opts.messages.length - 1] && m.media_type === 'image') {
      // Last message with image → multimodal
      return {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: m.content || 'Le locataire a envoye cette photo.' },
          {
            type: 'image' as const,
            image: opts.image.base64,
            mimeType: opts.image.contentType,
          },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages: aiMessages,
    output: Output.object({ schema: claudeResponseSchema }),
    temperature: 0.2,
    maxTokens: 400,
  })

  if (!result.output) {
    // Fallback: if structured output fails, use raw text
    logger.warn('[WA-ENGINE] Claude structured output failed — using fallback')
    return {
      text: result.text || 'Desole, je rencontre un probleme technique. Veuillez reessayer.',
      conversation_complete: false,
    }
  }

  return result.output
}

// ============================================================================
// System prompt
// ============================================================================

const buildSystemPrompt = (
  teamName: string,
  customInstructions: string | null,
  extractedData: SessionExtractedData
): string => {
  let prompt = `Tu es un assistant WhatsApp de prise de demandes d'intervention pour ${teamName}.

## Ton role
Tu collectes les informations necessaires pour creer une demande d'intervention de maintenance. Tu ne donnes JAMAIS de conseils techniques, d'estimation de prix, ni de decision sur l'urgence ou le prestataire.

## Regles strictes
- Tes reponses font maximum 2-3 phrases. WhatsApp = messages courts.
- Tu reponds dans la langue du locataire (francais, neerlandais ou anglais).
- Si tu ne comprends pas, demande de reformuler.
- Propose d'envoyer une photo quand c'est pertinent (fuite, degat, casse).
- Si le locataire mentionne un danger (gaz, incendie, inondation), dis immediatement : "Si vous etes en danger, appelez le 112." puis continue avec urgence "urgente".
- Si le locataire parle d'un sujet hors-intervention, redirige poliment.
- Si le locataire envoie une note vocale, reponds : "Je ne peux pas ecouter les messages vocaux pour le moment. Pourriez-vous decrire votre probleme par ecrit ? Merci !"

## Script (4 etapes)
ETAPE 1 — IDENTIFICATION : Demande le nom complet et l'adresse du logement.
ETAPE 2 — DESCRIPTION : "Quel est le probleme ?" + propose une photo.
ETAPE 3 — CONFIRMATION : Resume (nom, adresse, probleme) et demande confirmation.
ETAPE 4 — CLOTURE : Confirme l'enregistrement, remercie. Met conversation_complete a true.

## Format de reponse
TOUJOURS repondre avec un objet JSON :
- text: le message a envoyer
- conversation_complete: true uniquement apres confirmation a l'etape 3
- extracted_data: donnees extraites de ce message (cumulatif)`

  if (extractedData.caller_name || extractedData.address || extractedData.problem_description) {
    prompt += `\n\n## Donnees deja collectees\n`
    if (extractedData.caller_name) prompt += `- Nom: ${extractedData.caller_name}\n`
    if (extractedData.address) prompt += `- Adresse: ${extractedData.address}\n`
    if (extractedData.problem_description) prompt += `- Probleme: ${extractedData.problem_description}\n`
    if (extractedData.urgency) prompt += `- Urgence: ${extractedData.urgency}\n`
  }

  if (customInstructions) {
    prompt += `\n\n## Instructions specifiques de l'equipe\n${customInstructions}`
  }

  return prompt
}

// ============================================================================
// Helpers
// ============================================================================

const getTeamName = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string | null
): Promise<string> => {
  if (!teamId) return 'Votre gestionnaire'
  const { data } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()
  return data?.name ?? 'Votre gestionnaire'
}

const detectLanguage = (text: string): 'fr' | 'nl' | 'en' => {
  const lower = text.toLowerCase()
  const nlWords = ['hallo', 'goedendag', 'probleem', 'lekkage', 'verwarming', 'dank', 'huis']
  const enWords = ['hello', 'hi', 'problem', 'leak', 'heating', 'thanks', 'house']
  if (nlWords.some(w => lower.includes(w))) return 'nl'
  if (enWords.some(w => lower.includes(w))) return 'en'
  return 'fr'
}

// ============================================================================
// Disambiguation: fetch building addresses per team for multi-team tenants
// ============================================================================

/**
 * For each team, fetch the primary building address to display in the
 * disambiguation message. Falls back to team name if no building found.
 * Used by Task 4 (unknown contact flow) when a tenant belongs to multiple teams.
 */
export const fetchTeamAddresses = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamIds: string[]
): Promise<Array<{ teamId: string; label: string }>> => {
  const results: Array<{ teamId: string; label: string }> = []

  for (const teamId of teamIds) {
    const { data: building } = await supabase
      .from('buildings_active')
      .select('id, addresses(street, city, postal_code)')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    const addr = building?.addresses as unknown as {
      street: string
      city: string
      postal_code: string
    } | null

    if (addr?.street) {
      results.push({
        teamId,
        label: `${addr.street}, ${addr.postal_code} ${addr.city}`,
      })
    } else {
      // Fallback: use team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single()
      results.push({
        teamId,
        label: team?.name ?? teamId,
      })
    }
  }

  return results
}
