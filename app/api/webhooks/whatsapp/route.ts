import { NextRequest, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'
import type { IncomingWhatsAppMessage } from '@/lib/services/domain/ai-whatsapp/types'

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

    // ─── Step 3: Route by sender phone (shared number model) ─────────
    const supabase = createServiceRoleSupabaseClient()
    const normalizedFrom = normalizePhoneE164(from)

    // Find teams this contact belongs to (as locataire)
    const { data: teamMatches } = await supabase
      .from('team_members')
      .select('team_id, users!inner(id, first_name, last_name, phone)')
      .eq('role', 'locataire')
      .is('left_at', null)
      .eq('users.phone', normalizedFrom)

    let matches = teamMatches ?? []

    // Fallback: try with raw phone (DB may have non-normalized phones)
    if (matches.length === 0 && normalizedFrom !== from) {
      const { data: rawMatches } = await supabase
        .from('team_members')
        .select('team_id, users!inner(id, first_name, last_name, phone)')
        .eq('role', 'locataire')
        .is('left_at', null)
        .eq('users.phone', from)
      matches = rawMatches ?? []
    }

    // ─── Step 4: Build message and defer processing ────────────────
    const sharedNumber = process.env.SEIDO_WHATSAPP_NUMBER ?? to

    type UserRecord = { id: string; first_name: string | null; last_name: string | null }

    const deferProcessing = (messageData: IncomingWhatsAppMessage) => {
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
    }

    if (matches.length === 1) {
      // ── Direct route (most common case) ──
      const teamId = matches[0].team_id
      const user = matches[0].users as unknown as UserRecord

      // Get team-specific AI config (custom_instructions etc.)
      const { data: aiConfig } = await supabase
        .from('ai_phone_numbers')
        .select('id, custom_instructions')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      const messageData: IncomingWhatsAppMessage = {
        from,
        to,
        body,
        numMedia,
        mediaUrl,
        mediaContentType,
        contactName: profileName,
        teamId,
        phoneNumberId: aiConfig?.id ?? null,
        phoneNumber: sharedNumber,
        customInstructions: aiConfig?.custom_instructions ?? null,
        identifiedUserId: user.id,
        identifiedVia: 'phone_match',
      }

      deferProcessing(messageData)

      logger.info(
        { from, teamId, identifiedVia: 'phone_match', duration: Date.now() - startTime },
        '[WA-WEBHOOK] Accepted — direct route'
      )

    } else if (matches.length > 1) {
      // ── Multi-team: need disambiguation (Task 3) ──
      const messageData: IncomingWhatsAppMessage = {
        from,
        to,
        body,
        numMedia,
        mediaUrl,
        mediaContentType,
        contactName: profileName,
        teamId: null,
        phoneNumberId: null,
        phoneNumber: sharedNumber,
        customInstructions: null,
        identifiedUserId: null,
        identifiedVia: 'disambiguation',
        candidateTeams: matches.map(m => ({
          teamId: m.team_id,
          userId: (m.users as unknown as UserRecord).id,
        })),
      }

      deferProcessing(messageData)

      logger.info(
        { from, teamCount: matches.length, identifiedVia: 'disambiguation', duration: Date.now() - startTime },
        '[WA-WEBHOOK] Accepted — disambiguation needed'
      )

    } else {
      // ── Unknown contact: address discovery flow (Task 4) ──
      const messageData: IncomingWhatsAppMessage = {
        from,
        to,
        body,
        numMedia,
        mediaUrl,
        mediaContentType,
        contactName: profileName,
        teamId: null,
        phoneNumberId: null,
        phoneNumber: sharedNumber,
        customInstructions: null,
        identifiedUserId: null,
        identifiedVia: 'orphan',
      }

      deferProcessing(messageData)

      logger.info(
        { from, identifiedVia: 'orphan', duration: Date.now() - startTime },
        '[WA-WEBHOOK] Accepted — unknown contact'
      )
    }

    return twimlResponse()

  } catch (error) {
    logger.error({ error, duration: Date.now() - startTime }, '[WA-WEBHOOK] Unexpected error')
    return twimlResponse()
  }
}
