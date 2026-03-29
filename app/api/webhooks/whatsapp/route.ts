import { NextRequest, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'
import type { IncomingWhatsAppMessage, MessageChannel } from '@/lib/services/domain/ai-whatsapp/types'

// ============================================================================
// TwiML helper — empty response (we reply via API, not inline TwiML)
// ============================================================================

const twimlResponse = (status = 200) =>
  new Response('<Response></Response>', { status, headers: { 'Content-Type': 'text/xml' } })

// ============================================================================
// Shared routing logic (used by both WhatsApp and SMS webhooks)
// ============================================================================

type UserRecord = { id: string; first_name: string | null; last_name: string | null }

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

    // ─── Step 3: Route by sender phone (shared number model) ─────────
    const supabase = createServiceRoleSupabaseClient()
    const normalizedFrom = normalizePhoneE164(from)

    const { data: teamMatches } = await supabase
      .from('team_members')
      .select('team_id, users!inner(id, first_name, last_name, phone)')
      .eq('role', 'locataire')
      .is('left_at', null)
      .eq('users.phone', normalizedFrom)

    let matches = teamMatches ?? []

    if (matches.length === 0 && normalizedFrom !== from) {
      const { data: rawMatches } = await supabase
        .from('team_members')
        .select('team_id, users!inner(id, first_name, last_name, phone)')
        .eq('role', 'locataire')
        .is('left_at', null)
        .eq('users.phone', from)
      matches = rawMatches ?? []
    }

    // ─── Step 3b: Session-based fallback (routing continuity) ───────
    // If user is not in team_members but has an active session with a resolved
    // team (from previous address/agency routing), reuse that team to avoid
    // restarting the routing flow on every message.
    let sessionFallback: { team_id: string; identified_via: string | null } | null = null
    if (matches.length === 0) {
      const { data: existingSession } = await supabase
        .from('ai_whatsapp_sessions')
        .select('team_id, identified_via')
        .eq('contact_phone', from)
        .eq('status', 'active')
        .not('team_id', 'is', null)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession?.team_id) {
        sessionFallback = existingSession as { team_id: string; identified_via: string | null }
        logger.info(
          { from, teamId: sessionFallback.team_id, via: sessionFallback.identified_via, channel },
          `${logPrefix} Session-based fallback — reusing resolved team`
        )
      }
    }

    // ─── Step 4: Build message and defer processing ────────────────
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

    if (matches.length === 1) {
      const teamId = matches[0].team_id
      const user = matches[0].users as unknown as UserRecord

      const { data: aiConfig } = await supabase
        .from('ai_phone_numbers')
        .select('id, custom_instructions')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      deferProcessing({
        ...baseMessage,
        teamId,
        phoneNumberId: aiConfig?.id ?? null,
        customInstructions: aiConfig?.custom_instructions ?? null,
        identifiedUserId: user.id,
        identifiedVia: 'phone_match',
      })

      logger.info(
        { from, teamId, identifiedVia: 'phone_match', channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — direct route`
      )

    } else if (sessionFallback) {
      // Routing already resolved in a previous message — continue in same team
      const { data: aiConfig } = await supabase
        .from('ai_phone_numbers')
        .select('id, custom_instructions')
        .eq('team_id', sessionFallback.team_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      deferProcessing({
        ...baseMessage,
        teamId: sessionFallback.team_id,
        phoneNumberId: aiConfig?.id ?? null,
        customInstructions: aiConfig?.custom_instructions ?? null,
        identifiedUserId: null,
        identifiedVia: (sessionFallback.identified_via as IncomingWhatsAppMessage['identifiedVia']) ?? 'phone_match',
      })

      logger.info(
        { from, teamId: sessionFallback.team_id, identifiedVia: 'session_continuity', channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — session continuity`
      )

    } else if (matches.length > 1) {
      deferProcessing({
        ...baseMessage,
        teamId: null,
        phoneNumberId: null,
        customInstructions: null,
        identifiedUserId: null,
        identifiedVia: 'disambiguation',
        candidateTeams: matches.map(m => ({
          teamId: m.team_id,
          userId: (m.users as unknown as UserRecord).id,
        })),
      })

      logger.info(
        { from, teamCount: matches.length, channel, duration: Date.now() - startTime },
        `${logPrefix} Accepted — disambiguation needed`
      )

    } else {
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
