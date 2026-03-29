import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { sendWhatsAppMessage, downloadMedia } from './twilio-whatsapp.service'
import type {
  IncomingWhatsAppMessage,
  SessionExtractedData,
  ConversationMessage,
  ClaudeResponse,
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
// Session management
// ============================================================================

const findActiveSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string,
  contactPhone: string
) => {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString()

  const { data } = await supabase
    .from('ai_whatsapp_sessions')
    .select('*')
    .eq('team_id', teamId)
    .eq('contact_phone', contactPhone)
    .eq('status', 'active')
    .gt('last_message_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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
      language: 'fr',
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
  teamId: string
): Promise<string> => {
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
