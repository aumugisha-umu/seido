import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { sendWhatsAppMessage, downloadMedia } from './twilio-whatsapp.service'
import {
  handleRoutingFlow,
  findActiveSession,
} from './routing-flow.service'
import { handleTeamSelectionFlow } from './team-selection-flow.service'
import {
  handlePropertySelectionFlow,
  handleInterventionSelectionFlow,
} from './property-selection-flow.service'
import { callClaude, getTeamName, detectLanguage } from './claude-ai.service'
import { fetchUserName } from './phone-mapping.service'
import type {
  IncomingWhatsAppMessage,
  SessionExtractedData,
  ConversationMessage,
} from './types'

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGES_PER_SESSION = 30

// ============================================================================
// Main entry point (called from webhook after())
// ============================================================================

export const handleIncomingWhatsApp = async (
  message: IncomingWhatsAppMessage
): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()
  const logPrefix = message.channel === 'sms' ? '[SMS-ENGINE]' : '[WA-ENGINE]'

  // ─── 0. Pre-routing: multi-team selection or unknown contact ────
  if (!message.teamId && message.candidateTeams?.length) {
    const teamResult = await handleTeamSelectionFlow(supabase, message)
    if (teamResult.status === 'pending') return
    // 'resolved': message.teamId is now set, continue to property/intervention
  }

  if (!message.teamId) {
    const routed = await handleRoutingFlow(supabase, message)
    if (!routed) return // routing in progress or orphan — stop here
  }

  // Safety: after routing, teamId must be non-null
  if (!message.teamId) {
    logger.error({ from: message.from }, `${logPrefix} teamId still null after routing — aborting`)
    return
  }

  // ─── 0.5. Property/intervention selection for known contacts ──
  // Pre-fetch session once to avoid 3 separate findActiveSession calls
  let session = await findActiveSession(supabase, message.teamId, message.from)

  const propertyResult = await handlePropertySelectionFlow(supabase, message, session)
  if (propertyResult.status === 'pending') return

  const interventionResult = await handleInterventionSelectionFlow(supabase, message, session)
  if (interventionResult.status === 'pending') return

  // ─── 1. Load or create session ──────────────────────────────────

  if (!session) {
    session = await createSession(supabase, message)
    logger.info({ sessionId: session.id, from: message.from }, `${logPrefix} New session created`)
  } else {
    logger.info({ sessionId: session.id, from: message.from }, `${logPrefix} Existing session loaded`)
  }

  // Extract typed data once — avoid repeated casts
  const sessionExtracted: SessionExtractedData = (session.extracted_data as SessionExtractedData) ?? {}

  // Pre-fill caller name: from identified user (DB) > Meta contact > nothing
  if (!sessionExtracted.caller_name) {
    if (message.identifiedUserId) {
      const userName = await fetchUserName(supabase, message.identifiedUserId)
      if (userName) sessionExtracted.caller_name = userName
    }
    if (!sessionExtracted.caller_name && message.contactName) {
      sessionExtracted.caller_name = message.contactName
    }
  }

  // Pre-fill address from pre-identified property (lot or building)
  if (sessionExtracted.pre_identified && !sessionExtracted.address) {
    const preAddr = await fetchPreIdentifiedAddress(
      supabase,
      sessionExtracted.lot_id,
      sessionExtracted.building_id
    )
    if (preAddr) sessionExtracted.address = preAddr
  }

  // Check max messages
  const currentMessages = (session.messages as ConversationMessage[]) ?? []
  const isFirstMessage = currentMessages.length === 0
  if (currentMessages.length >= MAX_MESSAGES_PER_SESSION) {
    await sendWhatsAppMessage(
      message.phoneNumber,
      message.from,
      'Cette conversation a atteint sa limite. Veuillez reessayer plus tard pour creer une nouvelle demande.',
      message.channel
    )
    await supabase.from('ai_whatsapp_sessions').update({ status: 'completed' }).eq('id', session.id)
    return
  }

  // ─── 2. Handle media (photo — WhatsApp only, MMS not supported outside US/CA) ──
  let imageBase64: string | null = null
  const isTwilioMedia = message.mediaUrl?.startsWith('https://api.twilio.com/')
  if (message.channel !== 'sms' && message.numMedia > 0 && message.mediaUrl && isTwilioMedia && message.mediaContentType?.startsWith('image/')) {
    try {
      const { buffer, contentType } = await downloadMedia(message.mediaUrl)

      // Derive file extension from actual content type
      const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'application/pdf': 'pdf' }
      const ext = extMap[contentType] ?? contentType.split('/')[1] ?? 'bin'

      // Store in Supabase Storage — path must start with {teamId}/ for RLS
      const storagePath = `${message.teamId}/whatsapp/${session.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, { contentType, upsert: false })

      if (!uploadError) {
        const mediaUrls = sessionExtracted.media_urls ?? []
        mediaUrls.push(storagePath)
        sessionExtracted.media_urls = mediaUrls
      } else {
        logger.warn({ uploadError, storagePath }, `${logPrefix} Photo upload failed — continuing without stored URL`)
      }

      // Prepare for Claude vision
      imageBase64 = buffer.toString('base64')

      logger.info({ storagePath }, `${logPrefix} Photo downloaded and stored`)
    } catch (err) {
      logger.error({ err }, `${logPrefix} Failed to download/store photo — continuing without it`)
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
  // Fetch conversation history for returning contacts (only on first message)
  let conversationHistoryText: string | null = null
  if (isFirstMessage && message.teamId) {
    try {
      const { getConversationHistory, formatHistoryForPrompt } = await import('./phone-mapping.service')
      const history = await getConversationHistory(supabase, message.from, message.teamId)
      logger.info(
        { from: message.from, teamId: message.teamId, hasHistory: !!history, entryCount: history?.entries?.length ?? 0 },
        `${logPrefix} Conversation history lookup`
      )
      if (history) {
        conversationHistoryText = formatHistoryForPrompt(history)
        logger.info({ historyText: conversationHistoryText.slice(0, 200) }, `${logPrefix} History injected into prompt`)
      }
    } catch (err) {
      logger.warn({ err }, `${logPrefix} Conversation history fetch failed`)
    }
  }

  const teamName = await getTeamName(supabase, message.teamId)
  const claudeResponse = await callClaude({
    messages,
    teamName,
    customInstructions: message.customInstructions,
    extractedData: sessionExtracted,
    channel: message.channel,
    conversationHistory: conversationHistoryText,
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
  // Session stays active unless user explicitly closes ("terminer")
  const explicitClose = claudeResponse.conversation_complete === true
  const { error: updateError } = await supabase
    .from('ai_whatsapp_sessions')
    .update({
      messages: messages as unknown as Record<string, unknown>[], // Supabase Json column requires cast
      extracted_data: extractedData as unknown as Record<string, unknown>, // Supabase Json column requires cast
      status: explicitClose ? 'completed' : 'active',
      last_message_at: new Date().toISOString(),
      // Only detect language on first message — preserve initial detection afterwards
      ...(isFirstMessage && message.body ? { language: detectLanguage(message.body) } : {}),
    })
    .eq('id', session.id)

  if (updateError) {
    logger.warn({ error: updateError, sessionId: session.id }, `${logPrefix} Session update failed`)
  }

  // ─── 8. Send reply via Twilio (WhatsApp or SMS) ────────────────
  await sendWhatsAppMessage(message.phoneNumber, message.from, claudeResponse.text, message.channel)
  logger.info({ sessionId: session.id, channel: message.channel, explicitClose }, `${logPrefix} Reply sent`)

  // ─── 9. If user explicitly closed → complete session now ────────
  // Otherwise, the close-ai-sessions cron handles it after 30 min idle.
  if (explicitClose && message.teamId) {
    const { completeSession } = await import('./session-completion.service')
    await completeSession(supabase, {
      id: session.id,
      team_id: message.teamId,
      contact_phone: session.contact_phone,
      identified_user_id: session.identified_user_id,
      identified_via: message.identifiedVia ?? null,
      language: session.language,
      channel: message.channel,
      messages,
      extracted_data: extractedData,
    })
  }
}

// ============================================================================
// Session management
// ============================================================================

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
      channel: message.channel ?? 'whatsapp',
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
// Pre-identified property address lookup
// ============================================================================

const fetchPreIdentifiedAddress = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  lotId?: string,
  buildingId?: string
): Promise<string | null> => {
  if (lotId) {
    const { data: lot } = await supabase
      .from('lots')
      .select('reference, apartment_number, addresses(street, city, postal_code), buildings(name, addresses(street, city, postal_code))')
      .eq('id', lotId)
      .limit(1)
      .maybeSingle()

    if (lot) {
      const addr = (lot.addresses as unknown as { street: string; city: string; postal_code: string } | null)
        ?? (lot.buildings as unknown as { addresses: { street: string; city: string; postal_code: string } | null } | null)?.addresses

      if (addr) {
        const aptLabel = (lot as unknown as { apartment_number: string | null }).apartment_number
          ? `Apt ${(lot as unknown as { apartment_number: string }).apartment_number}, `
          : ''
        return `${aptLabel}${addr.street}, ${addr.postal_code} ${addr.city}`
      }
    }
  }

  if (buildingId) {
    const { data: building } = await supabase
      .from('buildings')
      .select('name, addresses(street, city, postal_code)')
      .eq('id', buildingId)
      .limit(1)
      .maybeSingle()

    if (building) {
      const addr = building.addresses as unknown as { street: string; city: string; postal_code: string } | null
      if (addr) return `${addr.street}, ${addr.postal_code} ${addr.city}`
    }
  }

  return null
}
