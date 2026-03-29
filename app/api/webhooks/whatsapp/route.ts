import { NextRequest, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
import {
  resolvePhoneMappings,
  touchMapping,
} from '@/lib/services/domain/ai-whatsapp/phone-mapping.service'
import type { IncomingWhatsAppMessage, MessageChannel } from '@/lib/services/domain/ai-whatsapp/types'

// ============================================================================
// TwiML helper — empty response (we reply via API, not inline TwiML)
// ============================================================================

const twimlResponse = (status = 200) =>
  new Response('<Response></Response>', { status, headers: { 'Content-Type': 'text/xml' } })

// ============================================================================
// Shared routing logic (used by both WhatsApp and SMS webhooks)
// ============================================================================

export async function handleTwilioIncoming(
  request: NextRequest,
  channel: MessageChannel,
  webhookPath: string
) {
  const startTime = Date.now()
  const logPrefix = channel === 'sms' ? '[SMS-WEBHOOK]' : '[WA-WEBHOOK]'

  try {
    // ─── Step 1: Parse Twilio form-encoded body ──────────────────────
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => { params[key] = String(value) })

    const rawFrom = params.From ?? ''
    const rawTo = params.To ?? ''
    const body = params.Body ?? ''
    const numMedia = parseInt(params.NumMedia ?? '0', 10)
    const mediaUrl = numMedia > 0 ? (params.MediaUrl0 ?? null) : null
    const mediaContentType = numMedia > 0 ? (params.MediaContentType0 ?? null) : null
    const profileName = params.ProfileName ?? null
    const messageSid = params.MessageSid ?? ''

    // Strip "whatsapp:" prefix (no-op for SMS)
    const from = rawFrom.replace('whatsapp:', '').trim()
    const to = rawTo.replace('whatsapp:', '').trim()

    logger.info(
      { from, to, messageSid, numMedia, bodyLength: body.length, channel },
      `${logPrefix} POST received`
    )

    // ─── Step 2: Validate Twilio signature ───────────────────────────
    const signature = request.headers.get('X-Twilio-Signature') ?? ''
    const forwardedHost = request.headers.get('X-Forwarded-Host')
    const forwardedProto = request.headers.get('X-Forwarded-Proto') ?? 'https'
    const webhookUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}${webhookPath}`
      : `${process.env.NEXT_PUBLIC_SITE_URL}${webhookPath}`

    if (!validateTwilioSignature(webhookUrl, params, signature)) {
      logger.warn({ from, webhookUrl }, `${logPrefix} Signature validation failed`)
      return twimlResponse(403)
    }

    // ─── Step 3: Route via phone_team_mappings (with freshness check) ─
    const supabase = createServiceRoleSupabaseClient()
    const mappings = await resolvePhoneMappings(supabase, from, { checkFreshness: true })

    // ─── Step 4: Build message and defer processing ──────────────────
    const sharedNumber = process.env.SEIDO_WHATSAPP_NUMBER ?? to

    const deferProcessing = (messageData: IncomingWhatsAppMessage) => {
      after(async () => {
        try {
          const { handleIncomingWhatsApp } = await import(
            '@/lib/services/domain/ai-whatsapp/conversation-engine.service'
          )
          await handleIncomingWhatsApp(messageData)
        } catch (error) {
          logger.error({ error, from }, `${logPrefix} Async processing failed`)
        }
      })
    }

    const baseMessage = {
      from,
      to,
      body,
      numMedia,
      mediaUrl,
      mediaContentType,
      contactName: profileName,
      phoneNumber: sharedNumber,
      channel,
    }

    if (mappings.length === 1) {
      // ─── Single mapping → auto-route ───────────────────────────────
      const mapping = mappings[0]

      const [{ data: aiConfig }] = await Promise.all([
        supabase
          .from('ai_phone_numbers')
          .select('id, custom_instructions')
          .eq('team_id', mapping.team_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        // Touch mapping to keep it fresh
        touchMapping(supabase, from, mapping.team_id),
      ])

      deferProcessing({
        ...baseMessage,
        teamId: mapping.team_id,
        phoneNumberId: aiConfig?.id ?? null,
        customInstructions: aiConfig?.custom_instructions ?? null,
        identifiedUserId: mapping.user_id,
        identifiedVia: mapping.source as IncomingWhatsAppMessage['identifiedVia'],
        mappingUserRole: mapping.user_role,
      })

      logger.info(
        { from, teamId: mapping.team_id, identifiedVia: mapping.source, userId: mapping.user_id, channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — mapping route`
      )

    } else if (mappings.length > 1) {
      // ─── Multiple mappings → team selection needed ─────────────────
      deferProcessing({
        ...baseMessage,
        teamId: null,
        phoneNumberId: null,
        customInstructions: null,
        identifiedUserId: null,
        identifiedVia: 'disambiguation',
        candidateTeams: mappings.map(m => ({
          teamId: m.team_id,
          userId: m.user_id ?? '',
        })),
      })

      logger.info(
        { from, teamCount: mappings.length, channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — multi-team disambiguation`
      )

    } else {
      // ─── No mapping, no cascade match → unknown contact ────────────
      deferProcessing({
        ...baseMessage,
        teamId: null,
        phoneNumberId: null,
        customInstructions: null,
        identifiedUserId: null,
        identifiedVia: 'orphan',
      })

      logger.info(
        { from, channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — unknown contact`
      )
    }

    return twimlResponse()

  } catch (error) {
    logger.error({ error, duration: Date.now() - startTime }, `${logPrefix} Unexpected error`)
    return twimlResponse()
  }
}

// ============================================================================
// POST — Receive incoming WhatsApp messages from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  return handleTwilioIncoming(request, 'whatsapp', '/api/webhooks/whatsapp')
}
