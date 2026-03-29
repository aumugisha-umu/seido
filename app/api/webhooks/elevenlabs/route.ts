/**
 * 📞 ElevenLabs Post-Call Webhook
 *
 * Receives post_call_transcription events from ElevenLabs after each AI call.
 * Processes transcript → creates intervention → notifies team via email.
 *
 * CRITICAL: ElevenLabs has ZERO retry. Return 200 immediately, defer work to after().
 * After 10 consecutive failures, ElevenLabs auto-disables the webhook.
 *
 * Flow:
 * 1. DoS protection (Content-Length < 1MB)
 * 2. HMAC-SHA256 signature verification (ElevenLabs-Signature header)
 * 3. Idempotence check (UNIQUE elevenlabs_conversation_id)
 * 4. Return 200 OK immediately
 * 5. after(): team identification → tenant match → AI extraction →
 *    intervention creation → call log → notifications → email → usage update
 */

import { NextRequest, after } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

// ============================================================================
// Constants
// ============================================================================

const MAX_PAYLOAD_SIZE = 1_000_000 // 1MB
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes anti-replay

// ============================================================================
// Types (ElevenLabs webhook payload)
// ============================================================================

interface ElevenLabsTranscriptEntry {
  role: string
  message: string
}

interface ElevenLabsWebhookPayload {
  type: string
  data: {
    agent_id: string
    conversation_id: string
    transcript: ElevenLabsTranscriptEntry[]
    metadata: Record<string, unknown>
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>
    }
  }
}

// ============================================================================
// HMAC-SHA256 Signature Verification
// ============================================================================

/**
 * Verifies ElevenLabs webhook signature.
 * Header format: "t=<unix_timestamp>,v0=<hmac_sha256_hex>"
 * HMAC computed as: SHA256(timestamp + "." + body, secret)
 */
function verifySignature(body: string, header: string, secret: string): boolean {
  try {
    // Parse "t=1234567890,v0=abc123..."
    const parts = header.split(',')
    const timestampPart = parts.find((p) => p.startsWith('t='))
    const signaturePart = parts.find((p) => p.startsWith('v0='))

    if (!timestampPart || !signaturePart) {
      logger.warn({ header }, '⚠️ [ELEVENLABS-WH] Malformed signature header')
      return false
    }

    const timestamp = timestampPart.slice(2)
    const signature = signaturePart.slice(3)

    // Anti-replay: reject if timestamp too old
    const timestampMs = parseInt(timestamp, 10) * 1000
    if (Math.abs(Date.now() - timestampMs) > SIGNATURE_MAX_AGE_MS) {
      logger.warn({ timestamp }, '⚠️ [ELEVENLABS-WH] Signature timestamp too old (replay?)')
      return false
    }

    // Compute expected HMAC
    const signedPayload = `${timestamp}.${body}`
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const receivedBuffer = Buffer.from(signature, 'hex')

    if (expectedBuffer.length !== receivedBuffer.length) return false
    return timingSafeEqual(expectedBuffer, receivedBuffer)
  } catch (err) {
    logger.error({ err }, '❌ [ELEVENLABS-WH] Signature verification error')
    return false
  }
}

// ============================================================================
// Route Handler
// ============================================================================

// Quick health check — verify the route is reachable
export async function GET() {
  console.log('🟢 [ELEVENLABS-WH] GET health check hit')
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  logger.info({ timestamp: new Date().toISOString() }, '📞 [ELEVENLABS-WH] POST received')

  try {
    // ─── Step 1: DoS Protection ──────────────────────────────────
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_PAYLOAD_SIZE) {
      logger.warn({ contentLength }, '⚠️ [ELEVENLABS-WH] Payload too large')
      return Response.json({ error: 'Payload too large' }, { status: 413 })
    }

    // ─── Step 2: Signature Verification ──────────────────────────
    const body = await req.text()
    const signatureHeader = req.headers.get('ElevenLabs-Signature')

    if (!signatureHeader) {
      logger.warn('⚠️ [ELEVENLABS-WH] Missing ElevenLabs-Signature header')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error('❌ [ELEVENLABS-WH] ELEVENLABS_WEBHOOK_SECRET not in env')
      return Response.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify HMAC-SHA256 signature
    // Format: "t=<unix_timestamp>,v0=<hmac_sha256_hex>"
    if (!verifySignature(body, signatureHeader, webhookSecret)) {
      logger.warn('⚠️ [ELEVENLABS-WH] Signature verification FAILED')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let event: ElevenLabsWebhookPayload
    try {
      event = JSON.parse(body) as ElevenLabsWebhookPayload
    } catch {
      logger.error({}, '❌ [ELEVENLABS-WH] Invalid JSON payload')
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // ─── Step 3: Event Type Filter ───────────────────────────────
    if (event.type !== 'post_call_transcription') {
      logger.info({ type: event.type }, '📞 [ELEVENLABS-WH] Ignoring event type')
      return Response.json({ ok: true })
    }

    const payload = event.data
    const conversationId = payload.conversation_id

    logger.info(
      { conversationId, agentId: payload.agent_id },
      '📞 [ELEVENLABS-WH] Received post_call_transcription'
    )

    // ─── Step 4: Idempotence Check ───────────────────────────────
    const supabase = createServiceRoleSupabaseClient()
    const { data: existing } = await supabase
      .from('ai_phone_calls')
      .select('id')
      .eq('elevenlabs_conversation_id', conversationId)
      .limit(1)
      .maybeSingle()

    if (existing) {
      logger.info({ conversationId }, '📞 [ELEVENLABS-WH] Already processed (idempotent)')
      return Response.json({ ok: true, already_processed: true })
    }

    // ─── Step 5: Return 200 immediately, defer heavy work ────────
    // Capture all data needed for after() closure
    const asyncPayload = payload
    const asyncConversationId = conversationId

    after(async () => {
      try {
        await processPostCallAsync(asyncPayload, asyncConversationId)
      } catch (error) {
        logger.error(
          { error, conversationId: asyncConversationId },
          '❌ [ELEVENLABS-WH] Async processing failed (in after())'
        )
      }
    })

    logger.info(
      { conversationId, duration: Date.now() - startTime },
      '✅ [ELEVENLABS-WH] Accepted — processing deferred'
    )

    return Response.json({ ok: true })

  } catch (error) {
    logger.error(
      { error, duration: Date.now() - startTime },
      '❌ [ELEVENLABS-WH] Unexpected error'
    )
    // Return 200 even on error — ElevenLabs has ZERO retry
    return Response.json({ ok: true, error: 'Internal error logged' })
  }
}

// ============================================================================
// Async Processing (runs in after() — response already sent)
// ============================================================================

async function processPostCallAsync(
  payload: ElevenLabsWebhookPayload['data'],
  conversationId: string
) {
  const supabase = createServiceRoleSupabaseClient()

  // ─── 1. Team Identification via caller phone → phone_team_mappings ──
  // Shared agent architecture: all teams use the same ELEVENLABS_AGENT_ID,
  // so we can't identify the team from agent_id. Instead, use the caller's
  // phone number to look up the team via phone_team_mappings (same as voice webhook).

  // ElevenLabs Twilio integration uses phone_call.external_number for the caller.
  // Fallback: dynamic_variables.caller_phone (injected by our voice webhook).
  const meta = payload.metadata ?? {}
  const phoneCall = meta.phone_call as Record<string, unknown> | undefined
  const callerPhone =
    (phoneCall?.external_number as string) ??
    payload.conversation_initiation_client_data?.dynamic_variables?.caller_phone ??
    null

  let teamId: string | null = null
  let phoneConfigId: string | null = null

  if (callerPhone) {
    const { resolvePhoneMappings } = await import('@/lib/services/domain/ai-whatsapp/phone-mapping.service')
    const mappings = await resolvePhoneMappings(supabase, callerPhone)

    if (mappings.length > 1) {
      logger.warn(
        { callerPhone, mappingCount: mappings.length, teamIds: mappings.map(m => m.team_id) },
        '⚠️ [ELEVENLABS-WH] Multi-team caller — using most recent mapping'
      )
    }

    if (mappings.length > 0) {
      teamId = mappings[0].team_id

      // Look up ai_phone_numbers for this team (for call log foreign key)
      const { data: phoneConfig } = await supabase
        .from('ai_phone_numbers')
        .select('id')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      phoneConfigId = phoneConfig?.id ?? null
    }
  }

  if (!teamId) {
    logger.error(
      { agentId: payload.agent_id, callerPhone },
      '❌ [ELEVENLABS-WH] No team found for caller phone'
    )
    return
  }

  logger.info({ teamId, phoneConfigId, callerPhone }, '📞 [ELEVENLABS-WH] Team identified')

  // ─── 2. Extract call metadata & build transcript ───────────────
  const durationSeconds = (meta.call_duration_secs as number | undefined) ?? null
  const language = (meta.main_language as string | undefined) ?? 'fr'

  const transcriptText = payload.transcript
    .map((t) => `${t.role}: ${t.message}`)
    .join('\n')

  logger.info(
    { callerPhone, language, transcriptLength: transcriptText.length },
    '📞 [ELEVENLABS-WH] Transcript extracted'
  )

  // ─── 4. Tenant identification via phone number ─────────────────
  let identifiedUserId: string | null = null
  let identifiedUserName = 'Appelant inconnu'

  if (callerPhone) {
    const { normalizePhoneE164 } = await import('@/lib/services/domain/ai-phone/call-transcript-analyzer.service')
    const normalizedPhone = normalizePhoneE164(callerPhone)

    // Find user within the same team by phone number
    const { data: matchedUser } = await supabase
      .from('users')
      .select('id, name, phone')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle()

    // Verify user belongs to this team
    if (matchedUser) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', matchedUser.id)
        .eq('team_id', teamId)
        .limit(1)
        .maybeSingle()

      if (teamMember) {
        identifiedUserId = matchedUser.id
        identifiedUserName = matchedUser.name ?? 'Locataire'
        logger.info({ userId: identifiedUserId, name: identifiedUserName }, '✅ [ELEVENLABS-WH] Tenant identified')
      }
    }
  }

  // ─── 4b. Upsert phone→team mapping for cross-channel routing ──
  if (callerPhone && teamId) {
    try {
      const { createOrUpdateMapping } = await import('@/lib/services/domain/ai-whatsapp/phone-mapping.service')
      await createOrUpdateMapping(supabase, {
        contactPhone: callerPhone,
        teamId,
        userId: identifiedUserId,
        userRole: identifiedUserId ? 'locataire' : null,
        source: 'voice_call',
      })
      logger.info({ callerPhone, teamId }, '✅ [ELEVENLABS-WH] Phone mapping upserted')
    } catch (err) {
      logger.warn({ err }, '[ELEVENLABS-WH] Phone mapping upsert failed (non-blocking)')
    }
  }

  // ─── 5. AI Extraction: structured summary (with fallback) ──────
  const { extractInterventionSummary } = await import('@/lib/services/domain/ai-phone/call-transcript-analyzer.service')
  type InterventionSummary = Awaited<ReturnType<typeof extractInterventionSummary>>

  let summary: InterventionSummary
  try {
    summary = await extractInterventionSummary(transcriptText, language)
    logger.info(
      { callerName: summary.caller_name, urgency: summary.urgency, category: summary.category },
      '✅ [ELEVENLABS-WH] AI extraction complete'
    )
  } catch (aiError) {
    logger.warn({ error: aiError }, '⚠️ [ELEVENLABS-WH] AI extraction failed — using fallback')
    summary = {
      caller_name: identifiedUserName || 'Appelant inconnu',
      address: '',
      problem_description: `[Transcription brute — extraction IA indisponible]\n\n${transcriptText}`,
      urgency: 'normale',
      category: 'autre',
      additional_notes: 'Extraction automatique echouee. Veuillez lire la transcription ci-dessus.',
    }
  }

  // Use AI-extracted name if user not identified
  if (!identifiedUserId && summary.caller_name) {
    identifiedUserName = summary.caller_name
  }

  // ─── 6. Find lot/building from address ─────────────────────────
  // Try to find a matching lot by address within the team
  let lotId: string | null = null
  if (summary.address) {
    // Escape ILIKE wildcards from user-controlled content
    const safeAddress = summary.address.substring(0, 20).replace(/%/g, '\\%').replace(/_/g, '\\_')
    const { data: matchedLot } = await supabase
      .from('lots')
      .select('id')
      .eq('team_id', teamId)
      .ilike('address', `%${safeAddress}%`)
      .limit(1)
      .maybeSingle()

    if (matchedLot) {
      lotId = matchedLot.id
      logger.info({ lotId }, '📍 [ELEVENLABS-WH] Lot matched by address')
    }
  }

  // ─── 7. Create Intervention (3-step pattern) ───────────────────
  const { InterventionRepository } = await import('@/lib/services/repositories/intervention.repository')
  const interventionRepo = new InterventionRepository(supabase)

  // Map urgency to intervention urgency enum
  const urgencyMap: Record<string, string> = {
    basse: 'basse',
    normale: 'normale',
    haute: 'haute',
    urgente: 'urgente',
  }

  // Generate reference
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
  const reference = `INT-${year}${month}${day}${hours}${minutes}${seconds}-${randomSuffix}`

  // Build rich description with full call details for email notification
  const descriptionParts = [
    summary.problem_description,
    '',
    '--- Details de l\'appel ---',
    `Appelant : ${identifiedUserName}`,
    callerPhone ? `Telephone : ${callerPhone}` : null,
    summary.address ? `Adresse : ${summary.address}` : null,
    summary.category ? `Categorie : ${summary.category}` : null,
    `Urgence : ${summary.urgency}`,
    durationSeconds ? `Duree : ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}` : null,
    `Langue : ${language === 'fr' ? 'Francais' : language === 'nl' ? 'Neerlandais' : 'Anglais'}`,
    summary.additional_notes ? `\nNotes : ${summary.additional_notes}` : null,
    '',
    '--- Transcription complete ---',
    transcriptText,
  ].filter(Boolean).join('\n')

  // STEP 1: INSERT intervention (no SELECT — RLS blocks before assignment)
  const interventionResult = await interventionRepo.create(
    {
      title: `[IA] ${summary.category ?? 'Intervention'} — ${identifiedUserName}`,
      description: descriptionParts,
      type: summary.category ?? 'autre',
      urgency: urgencyMap[summary.urgency] ?? 'normale',
      reference,
      team_id: teamId,
      lot_id: lotId,
      status: 'demande',
      source: 'phone_ai',
      created_by: identifiedUserId,
    },
    { skipInitialSelect: true }
  )

  if (!interventionResult.success || !interventionResult.data) {
    logger.error(
      { error: interventionResult.error },
      '❌ [ELEVENLABS-WH] Failed to create intervention'
    )
    // Still save the call log without intervention link
    await saveCallLog(supabase, {
      teamId,
      phoneConfigId,
      conversationId,
      callerPhone,
      identifiedUserId,
      interventionId: null,
      transcriptText,
      summary,
      language,
      durationSeconds,
    })
    return
  }

  const interventionId = interventionResult.data.id
  logger.info({ interventionId }, '✅ [ELEVENLABS-WH] Intervention created (step 1/3)')

  // STEP 2a: ASSIGN tenant to intervention (if identified)
  if (identifiedUserId) {
    const { error: assignError } = await supabase
      .from('intervention_assignments')
      .insert({
        intervention_id: interventionId,
        user_id: identifiedUserId,
        role: 'locataire',
        is_primary: true,
        assigned_by: identifiedUserId,
        assigned_at: new Date().toISOString(),
      })

    if (assignError) {
      logger.error({ error: assignError }, '⚠️ [ELEVENLABS-WH] Failed to assign tenant (non-blocking)')
    } else {
      logger.info({ userId: identifiedUserId }, '✅ [ELEVENLABS-WH] Tenant assigned')
    }
  }

  // STEP 2b: ASSIGN team managers so notifications/emails find recipients
  // Include 'admin' role — team admins are gestionnaires (two role systems)
  const { data: teamManagers } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .in('role', ['gestionnaire', 'admin'])
    .is('left_at', null)

  if (teamManagers && teamManagers.length > 0) {
    const managerAssignments = teamManagers.map((m) => ({
      intervention_id: interventionId,
      user_id: m.user_id,
      role: 'gestionnaire' as const,
      is_primary: false,
      assigned_by: identifiedUserId,
      assigned_at: new Date().toISOString(),
    }))

    const { error: managerAssignError } = await supabase
      .from('intervention_assignments')
      .insert(managerAssignments)

    if (managerAssignError) {
      logger.warn({ error: managerAssignError }, '⚠️ [ELEVENLABS-WH] Failed to assign managers (non-blocking)')
    } else {
      logger.info({ count: teamManagers.length }, '✅ [ELEVENLABS-WH] Managers assigned (step 2b/3)')
    }
  }

  // STEP 3: Create conversation threads (direct insert — bypasses validateRequired)
  try {
    // created_by is NOT NULL — use tenant if identified, else first team manager
    const threadCreatedBy = identifiedUserId ?? teamManagers?.[0]?.user_id ?? null

    if (!threadCreatedBy) {
      logger.warn('⚠️ [ELEVENLABS-WH] No user available for thread created_by — skipping threads')
    }

    // GROUP thread
    const { error: groupThreadError } = threadCreatedBy ? await supabase
      .from('conversation_threads')
      .insert({
        intervention_id: interventionId,
        thread_type: 'group',
        title: 'Discussion generale',
        created_by: threadCreatedBy,
        team_id: teamId,
      }) : { error: null }

    if (groupThreadError) {
      logger.warn({ error: groupThreadError }, '⚠️ [ELEVENLABS-WH] Group thread creation failed')
    }

    // TENANT_TO_MANAGERS thread (only if tenant identified)
    if (identifiedUserId) {
      const { error: tenantThreadError } = await supabase
        .from('conversation_threads')
        .insert({
          intervention_id: interventionId,
          thread_type: 'tenant_to_managers',
          title: `Conversation avec ${identifiedUserName}`,
          created_by: identifiedUserId,
          team_id: teamId,
        })

      if (tenantThreadError) {
        logger.warn({ error: tenantThreadError }, '⚠️ [ELEVENLABS-WH] Tenant thread creation failed')
      }

      // Add tenant as thread participant
      const { data: tenantThread } = await supabase
        .from('conversation_threads')
        .select('id')
        .eq('intervention_id', interventionId)
        .eq('thread_type', 'tenant_to_managers')
        .limit(1)
        .maybeSingle()

      if (tenantThread) {
        await supabase.from('conversation_participants').insert({
          thread_id: tenantThread.id,
          user_id: identifiedUserId,
          role: 'locataire',
        })
      }
    }

    logger.info({ interventionId }, '✅ [ELEVENLABS-WH] Conversation threads created (step 3/3)')
  } catch (threadError) {
    logger.warn({ error: threadError }, '⚠️ [ELEVENLABS-WH] Thread creation failed (non-blocking)')
  }

  // ─── 8. Persist conversation history to phone_team_mappings (cross-channel memory) ──
  if (callerPhone && teamId) {
    try {
      const { appendConversationSummary } = await import('@/lib/services/domain/ai-whatsapp/phone-mapping.service')
      await appendConversationSummary(supabase, callerPhone, teamId, {
        date: new Date().toISOString().slice(0, 10),
        channel: 'phone',
        problem: summary.problem_description || 'Appel vocal',
        address: summary.address || undefined,
        urgency: summary.urgency || undefined,
        caller_name: identifiedUserName !== 'Appelant inconnu' ? identifiedUserName : summary.caller_name || undefined,
        intervention_ref: reference,
      })
      logger.info({ callerPhone, teamId }, '✅ [ELEVENLABS-WH] Conversation history appended')
    } catch (err) {
      logger.warn({ err }, '⚠️ [ELEVENLABS-WH] Append conversation history failed (non-blocking)')
    }
  }

  // ─── 9. Save Call Log ──
  await saveCallLog(supabase, {
    teamId,
    phoneConfigId,
    conversationId,
    callerPhone,
    identifiedUserId,
    interventionId,
    transcriptText,
    summary,
    language,
    durationSeconds,
  })

  // ─── 10. Push Notification ─────────────────────────────────────
  try {
    const { createInterventionNotification } = await import('@/app/actions/notification-actions')
    await createInterventionNotification(interventionId)
    logger.info({ interventionId }, '✅ [ELEVENLABS-WH] Push notification sent')
  } catch (notifError) {
    logger.warn({ error: notifError }, '⚠️ [ELEVENLABS-WH] Notification failed (non-blocking)')
  }

  // ─── 11. Email Recap to Gestionnaires ──────────────────────────
  // IMPORTANT: Use service role client — webhook has no authenticated session
  try {
    const { EmailNotificationService } = await import('@/lib/services/domain/email-notification.service')
    const { EmailService } = await import('@/lib/services/domain/email.service')
    const { NotificationRepository } = await import('@/lib/services/repositories/notification-repository')
    const { InterventionRepository } = await import('@/lib/services/repositories/intervention.repository')
    const { UserRepository } = await import('@/lib/services/repositories/user.repository')
    const { BuildingRepository } = await import('@/lib/services/repositories/building.repository')
    const { LotRepository } = await import('@/lib/services/repositories/lot.repository')

    const serviceSupabase = createServiceRoleSupabaseClient()
    const notificationRepo = new NotificationRepository(serviceSupabase)
    const interventionEmailRepo = new InterventionRepository(serviceSupabase)
    const userRepo = new UserRepository(serviceSupabase)
    const buildingRepo = new BuildingRepository(serviceSupabase)
    const lotRepo = new LotRepository(serviceSupabase)

    const emailService = new EmailService()
    const emailNotificationService = new EmailNotificationService(
      notificationRepo,
      emailService,
      interventionEmailRepo,
      userRepo,
      buildingRepo,
      lotRepo
    )

    const emailResult = await emailNotificationService.sendInterventionEmails({
      interventionId,
      eventType: 'created',
      excludeUserId: identifiedUserId ?? undefined,
    })

    logger.info(
      { interventionId, emailsSent: emailResult.sentCount },
      '✅ [ELEVENLABS-WH] Email recap sent'
    )
  } catch (emailError) {
    logger.warn({ error: emailError }, '⚠️ [ELEVENLABS-WH] Email recap failed (non-blocking)')
  }

  // ─── 12. Update Usage Counter (atomic upsert via RPC) ──────────
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01' // YYYY-MM-01
    const minutesUsed = durationSeconds ? Math.ceil(durationSeconds / 60) : 1

    // Atomic upsert: INSERT ... ON CONFLICT DO UPDATE with SQL addition
    const { error: upsertError } = await supabase.rpc('upsert_ai_phone_usage', {
      p_team_id: teamId,
      p_month: currentMonth,
      p_minutes: minutesUsed,
    })

    if (upsertError) {
      // Fallback to non-atomic if RPC doesn't exist yet
      logger.warn({ error: upsertError }, '⚠️ [ELEVENLABS-WH] RPC upsert failed, using fallback')
      const { data: existingUsage } = await supabase
        .from('ai_phone_usage')
        .select('id, minutes_used, calls_count')
        .eq('team_id', teamId)
        .eq('month', currentMonth)
        .limit(1)
        .maybeSingle()

      if (existingUsage) {
        await supabase
          .from('ai_phone_usage')
          .update({
            minutes_used: (Number(existingUsage.minutes_used) || 0) + minutesUsed,
            calls_count: (existingUsage.calls_count || 0) + 1,
          })
          .eq('id', existingUsage.id)
      } else {
        await supabase.from('ai_phone_usage').insert({
          team_id: teamId,
          month: currentMonth,
          minutes_used: minutesUsed,
          calls_count: 1,
        })
      }
    }

    logger.info({ teamId, minutesUsed }, '✅ [ELEVENLABS-WH] Usage updated')
  } catch (usageError) {
    logger.warn({ error: usageError }, '⚠️ [ELEVENLABS-WH] Usage update failed (non-blocking)')
  }

  logger.info(
    { conversationId, interventionId, teamId },
    '🎉 [ELEVENLABS-WH] Full processing complete'
  )
}

// ============================================================================
// Helper: Save call log to ai_phone_calls
// ============================================================================

interface CallLogData {
  teamId: string
  phoneConfigId: string | null
  conversationId: string
  callerPhone: string | null
  identifiedUserId: string | null
  interventionId: string | null
  transcriptText: string
  summary: { caller_name: string; address: string; problem_description: string; urgency: string; category?: string; additional_notes?: string }
  language: string
  durationSeconds: number | null
}

async function saveCallLog(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  data: CallLogData
) {
  try {
    const { error } = await supabase.from('ai_phone_calls').insert({
      team_id: data.teamId,
      phone_number_id: data.phoneConfigId,
      elevenlabs_conversation_id: data.conversationId,
      caller_phone: data.callerPhone,
      channel: 'phone',
      duration_seconds: data.durationSeconds,
      identified_user_id: data.identifiedUserId,
      intervention_id: data.interventionId,
      transcript: data.transcriptText,
      structured_summary: data.summary,
      language: data.language,
      call_status: 'completed',
    })

    if (error) {
      // 23505 = unique violation (already processed — race condition)
      if (error.code === '23505') {
        logger.info({ conversationId: data.conversationId }, '📞 [ELEVENLABS-WH] Call log already exists (race condition)')
        return
      }
      logger.error({ error }, '❌ [ELEVENLABS-WH] Failed to save call log')
    } else {
      logger.info({ conversationId: data.conversationId }, '✅ [ELEVENLABS-WH] Call log saved')
    }
  } catch (err) {
    logger.error({ err }, '❌ [ELEVENLABS-WH] Call log insert crashed')
  }
}
