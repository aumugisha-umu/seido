import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { sendWhatsAppMessage, downloadMedia } from './twilio-whatsapp.service'
import { handleRoutingFlow, findActiveSession } from './routing-flow.service'
import { callClaude, getTeamName, detectLanguage } from './claude-ai.service'
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

  // ─── 0. Pre-routing: unknown contact or disambiguation ─────────
  if (!message.teamId || message.identifiedVia === 'disambiguation') {
    const routed = await handleRoutingFlow(supabase, message)
    if (!routed) return // routing in progress or orphan — stop here
    // Routing resolved: message.teamId is now set, continue to normal flow
  }

  // Safety: after routing, teamId must be non-null
  if (!message.teamId) {
    logger.error({ from: message.from }, `${logPrefix} teamId still null after routing — aborting`)
    return
  }

  // ─── 1. Load or create session ──────────────────────────────────
  let session = await findActiveSession(supabase, message.teamId, message.from)

  if (!session) {
    session = await createSession(supabase, message)
    logger.info({ sessionId: session.id, from: message.from }, `${logPrefix} New session created`)
  } else {
    logger.info({ sessionId: session.id, from: message.from }, `${logPrefix} Existing session loaded`)
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
      'Cette conversation a atteint sa limite. Veuillez reessayer plus tard pour creer une nouvelle demande.',
      message.channel
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
  const teamName = await getTeamName(supabase, message.teamId)
  const claudeResponse = await callClaude({
    messages,
    teamName,
    customInstructions: message.customInstructions,
    extractedData: sessionExtracted,
    channel: message.channel,
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
    logger.warn({ error: updateError, sessionId: session.id }, `${logPrefix} Session update failed`)
  }

  // ─── 8. Send reply via Twilio (WhatsApp or SMS) ────────────────
  await sendWhatsAppMessage(message.phoneNumber, message.from, claudeResponse.text, message.channel)
  logger.info({ sessionId: session.id, channel: message.channel, complete: claudeResponse.conversation_complete }, `${logPrefix} Reply sent`)

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
      logger.error({ err, sessionId: session.id }, `${logPrefix} Failed to create intervention`)
    }
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
