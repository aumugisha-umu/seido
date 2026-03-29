import { NextRequest, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'

// ============================================================================
// TwiML helper — empty response (we reply via API, not inline TwiML)
// ============================================================================

const twimlResponse = (status = 200) =>
  new Response('<Response></Response>', { status, headers: { 'Content-Type': 'text/xml' } })

// ============================================================================
// POST — Receive incoming WhatsApp messages from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

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

    // Strip "whatsapp:" prefix to get clean E.164 numbers
    const from = rawFrom.replace('whatsapp:', '').trim()
    const to = rawTo.replace('whatsapp:', '').trim()

    logger.info(
      { from, to, messageSid, numMedia, bodyLength: body.length },
      '[WA-WEBHOOK] POST received'
    )

    // ─── Step 2: Validate Twilio signature ───────────────────────────
    const signature = request.headers.get('X-Twilio-Signature') ?? ''
    const forwardedHost = request.headers.get('X-Forwarded-Host')
    const forwardedProto = request.headers.get('X-Forwarded-Proto') ?? 'https'
    const webhookUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}/api/webhooks/whatsapp`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/whatsapp`

    if (!validateTwilioSignature(webhookUrl, params, signature)) {
      logger.warn({ from, webhookUrl }, '[WA-WEBHOOK] Signature validation failed')
      return twimlResponse(403)
    }

    // ─── Step 3: Identify team by Twilio phone number ────────────────
    const supabase = createServiceRoleSupabaseClient()
    const { data: phoneConfig } = await supabase
      .from('ai_phone_numbers')
      .select('id, team_id, phone_number, whatsapp_number, custom_instructions')
      .or(`whatsapp_number.eq.${to},phone_number.eq.${to}`)
      .eq('is_active', true)
      .eq('whatsapp_enabled', true)
      .limit(1)
      .maybeSingle()

    if (!phoneConfig) {
      logger.warn({ to }, '[WA-WEBHOOK] No team found for phone number')
      return twimlResponse()
    }

    // ─── Step 4: Return 200 immediately, defer AI processing ─────────
    const messageData = {
      from,
      to,
      body,
      numMedia,
      mediaUrl,
      mediaContentType,
      contactName: profileName,
      teamId: phoneConfig.team_id,
      phoneNumberId: phoneConfig.id,
      phoneNumber: phoneConfig.whatsapp_number ?? phoneConfig.phone_number,
      customInstructions: phoneConfig.custom_instructions,
    }

    after(async () => {
      try {
        const { handleIncomingWhatsApp } = await import(
          '@/lib/services/domain/ai-whatsapp/conversation-engine.service'
        )
        await handleIncomingWhatsApp(messageData)
      } catch (error) {
        logger.error({ error, from }, '[WA-WEBHOOK] Async processing failed')
      }
    })

    logger.info(
      { from, teamId: phoneConfig.team_id, duration: Date.now() - startTime },
      '[WA-WEBHOOK] Accepted — processing deferred'
    )

    return twimlResponse()

  } catch (error) {
    logger.error({ error, duration: Date.now() - startTime }, '[WA-WEBHOOK] Unexpected error')
    return twimlResponse()
  }
}
