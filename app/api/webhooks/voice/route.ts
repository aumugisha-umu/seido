import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
import { registerTwilioCall } from '@/lib/services/domain/ai-phone/elevenlabs-agent.service'
import {
  resolvePhoneMappings,
  fetchUserName,
  fetchUserAddress,
  getConversationHistory,
  formatHistoryForPrompt,
} from '@/lib/services/domain/ai-whatsapp/phone-mapping.service'
import { getTeamName } from '@/lib/services/domain/ai-whatsapp/claude-ai.service'

// ============================================================================
// TwiML helpers
// ============================================================================

const twimlResponse = (twiml: string, status = 200) =>
  new Response(twiml, { status, headers: { 'Content-Type': 'text/xml' } })

const twimlReject = () =>
  twimlResponse('<Response><Say language="fr-FR">Desolee, le service vocal est temporairement indisponible. Veuillez reessayer plus tard.</Say><Hangup/></Response>')

// ============================================================================
// POST — Receive inbound voice calls from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const logPrefix = '[VOICE-WEBHOOK]'

  try {
    // ─── Step 1: Parse Twilio form-encoded body ──────────────────────
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => { params[key] = String(value) })

    const from = params.From ?? ''
    const to = params.To ?? ''
    const callSid = params.CallSid ?? ''

    logger.info({ from, to, callSid }, `${logPrefix} Inbound call received`)

    // ─── Step 2: Validate Twilio signature ───────────────────────────
    const signature = request.headers.get('X-Twilio-Signature') ?? ''
    const forwardedHost = request.headers.get('X-Forwarded-Host')
    const forwardedProto = request.headers.get('X-Forwarded-Proto') ?? 'https'
    const webhookUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}/api/webhooks/voice`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/voice`

    if (!validateTwilioSignature(webhookUrl, params, signature)) {
      logger.warn({ from, webhookUrl }, `${logPrefix} Signature validation failed`)
      return twimlReject()
    }

    // ─── Step 3: Check config ────────────────────────────────────────
    const agentId = process.env.ELEVENLABS_AGENT_ID ?? ''
    if (!agentId) {
      logger.error({}, `${logPrefix} Missing ELEVENLABS_AGENT_ID`)
      return twimlReject()
    }

    // ─── Step 4: Pre-call routing via phone_team_mappings ────────────
    const supabase = createServiceRoleSupabaseClient()
    const mappings = await resolvePhoneMappings(supabase, from)

    // ─── Step 5: Build dynamic variables ─────────────────────────────
    // For voice, pick the most recent mapping (sorted by last_used_at DESC).
    // Voice calls can't disambiguate interactively like WhatsApp text menus.
    const mapping = mappings.length > 0 ? mappings[0] : null

    if (mappings.length > 1) {
      logger.warn(
        { from, callSid, mappingCount: mappings.length, teamIds: mappings.map(m => m.team_id) },
        `${logPrefix} Multi-team caller — using most recent mapping (voice cannot disambiguate)`
      )
    }
    const dynamicVariables: Record<string, string> = {
      // Always pass caller phone — used by post-call webhook for team identification
      caller_phone: from,
    }

    if (mapping) {
      // Known caller — fetch team name, user name, address, history in parallel
      const [teamName, callerName, callerAddress, history] = await Promise.all([
        getTeamName(supabase, mapping.team_id),
        mapping.user_id ? fetchUserName(supabase, mapping.user_id) : Promise.resolve(null),
        mapping.user_id ? fetchUserAddress(supabase, mapping.user_id, mapping.team_id) : Promise.resolve(null),
        getConversationHistory(supabase, from, mapping.team_id),
      ])

      dynamicVariables.team_name = teamName
      dynamicVariables.caller_name = callerName ?? ''
      dynamicVariables.caller_address = callerAddress ?? ''
      dynamicVariables.conversation_history = history
        ? `\n## Historique des conversations\n${formatHistoryForPrompt(history)}`
        : ''

      logger.info(
        {
          from, callSid, teamId: mapping.team_id,
          hasName: !!callerName, hasAddress: !!callerAddress, hasHistory: !!history,
          duration: Date.now() - startTime,
        },
        `${logPrefix} Known caller — routing with context`
      )
    } else {
      // Unknown caller — generic agent, no personalization
      dynamicVariables.team_name = 'Votre gestionnaire'
      dynamicVariables.caller_name = ''
      dynamicVariables.caller_address = ''
      dynamicVariables.conversation_history = ''

      logger.info(
        { from, callSid, duration: Date.now() - startTime },
        `${logPrefix} Unknown caller — generic agent`
      )
    }

    // ─── Step 6: Register call with ElevenLabs → get TwiML ──────────
    const twiml = await registerTwilioCall(agentId, from, to, dynamicVariables)

    logger.info(
      { from, callSid, duration: Date.now() - startTime },
      `${logPrefix} Call registered with ElevenLabs`
    )

    return twimlResponse(twiml)

  } catch (error) {
    logger.error({ error, duration: Date.now() - startTime }, `${logPrefix} Failed to handle inbound call`)
    return twimlReject()
  }
}
