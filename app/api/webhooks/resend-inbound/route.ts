/**
 * 📧 Webhook Resend Inbound - Réception des réponses email
 *
 * Endpoint pour recevoir les emails entrants via Resend.
 * Permet aux locataires et prestataires de répondre directement
 * aux notifications d'intervention par email.
 *
 * Flux:
 * 1. Réception du webhook avec vérification signature Svix
 * 2. Parsing de l'adresse reply-to pour identifier l'intervention
 * 3. Vérification hash HMAC (sécurité anti-falsification)
 * 4. Réponse 200 immédiate (Resend attend une réponse rapide)
 * 5. Traitement asynchrone: récupération contenu, stockage, notifications
 *
 * Sécurité:
 * - Signature Svix vérifiée (headers svix-id, svix-timestamp, svix-signature)
 * - Hash HMAC vérifié dans l'adresse reply-to
 * - Validation MIME des pièces jointes
 * - Limite de taille des pièces jointes (10MB)
 *
 * @see lib/services/domain/resend-webhook.service.ts
 * @see lib/services/domain/email-reply.service.ts
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { ResendWebhookService } from '@/lib/services/domain/resend-webhook.service'
import { EmailReplyService } from '@/lib/services/domain/email-reply.service'
import { syncEmailReplyToConversation } from '@/lib/services/domain/email-to-conversation.service'
import { validateRequest, resendInboundWebhookSchema, formatZodErrors, uuidSchema, emailSchema } from '@/lib/validation/schemas'
import type { ResendInboundWebhookPayload } from '@/lib/validation/schemas'

// ══════════════════════════════════════════════════════════════
// Server-Side HTML Sanitization (no jsdom dependency)
// ══════════════════════════════════════════════════════════════

/**
 * Server-side HTML sanitizer (no jsdom dependency)
 *
 * Removes XSS vectors for server-to-DB storage:
 * - <script> tags
 * - Event handlers (onclick, onerror, etc.)
 * - javascript: protocols
 * - data: protocols in src/href
 *
 * Note: Client-side display uses DOMPurify in email-detail.tsx
 * for full sanitization before DOM insertion (defense in depth)
 *
 * @param html - Raw HTML content from email
 * @returns Sanitized HTML safe for database storage
 */
function sanitizeHtmlServer(html: string): string {
  if (!html) return ''

  // Remove script tags completely (including content)
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Remove event handlers (on*) - both quoted and unquoted values
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')

  // Remove javascript: protocols
  cleaned = cleaned.replace(/javascript\s*:/gi, 'blocked:')

  // Remove data: protocols in src/href (potential XSS vector)
  cleaned = cleaned.replace(/\s+(src|href)\s*=\s*["']?\s*data:/gi, ' $1="blocked:')

  return cleaned
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface ProcessedEmail {
  emailId: string
  interventionId: string
  senderEmail: string
  subject: string
}

/**
 * Result of manager notification operation
 */
interface NotificationResult {
  sent: number
  failed: number
}

/**
 * Status values for webhook logs
 */
type WebhookLogStatus =
  | 'processed'
  | 'invalid_address'
  | 'invalid_hash'
  | 'unknown_intervention'
  | 'error'

/**
 * Webhook log entry data
 */
interface WebhookLogEntry {
  eventType: string
  resendEmailId: string
  recipientAddress: string
  senderAddress: string
  subject?: string
  interventionId?: string
  userId?: string
  status: WebhookLogStatus
  errorMessage?: string
  processingTimeMs: number
}

// ══════════════════════════════════════════════════════════════
// Webhook Logging Helper
// ══════════════════════════════════════════════════════════════

/**
 * Logs a webhook event to the email_webhook_logs table
 *
 * This provides an audit trail for debugging and security monitoring.
 * Logs are retained for 90 days (cleanup via pg_cron or manual).
 */
async function logWebhookEvent(entry: WebhookLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from('email_webhook_logs')
      .insert({
        event_type: entry.eventType,
        resend_email_id: entry.resendEmailId,
        recipient_address: entry.recipientAddress,
        sender_address: entry.senderAddress,
        subject: entry.subject || null,
        intervention_id: entry.interventionId || null,
        user_id: entry.userId || null,
        status: entry.status,
        error_message: entry.errorMessage || null,
        processing_time_ms: entry.processingTimeMs
      })

    if (error) {
      logger.warn(
        { error, entry },
        '⚠️ [RESEND-INBOUND] Failed to log webhook event to database'
      )
    }
  } catch (err) {
    // Don't let logging failure affect webhook processing
    logger.warn(
      { error: err },
      '⚠️ [RESEND-INBOUND] Exception while logging webhook event'
    )
  }
}

// ══════════════════════════════════════════════════════════════
// GET Handler (Verification endpoint)
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/webhooks/resend-inbound
 *
 * Endpoint de vérification pour Resend (health check)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'resend-inbound-webhook',
    methods: ['POST']
  })
}

// ══════════════════════════════════════════════════════════════
// POST Handler
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/resend-inbound
 *
 * Reçoit et traite les emails entrants via Resend Inbound API.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  logger.info({
    method: request.method,
    url: request.url,
    headers: {
      hasSvixId: !!request.headers.get('svix-id'),
      hasSvixTimestamp: !!request.headers.get('svix-timestamp'),
      hasSvixSignature: !!request.headers.get('svix-signature'),
      contentType: request.headers.get('content-type')
    }
  }, '📧 [RESEND-INBOUND] Webhook request received')

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. Obtenir le body brut AVANT parsing (crucial pour signature)
    // ═══════════════════════════════════════════════════════════
    const rawBody = await request.text()

    // ═══════════════════════════════════════════════════════════
    // 2. Vérifier signature Svix
    // ═══════════════════════════════════════════════════════════
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    const isValidSignature = ResendWebhookService.verifySignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature
    )

    if (!isValidSignature) {
      logger.error(
        { 
          svixId,
          hasSvixHeaders: { id: !!svixId, timestamp: !!svixTimestamp, signature: !!svixSignature },
          hasSecret: !!process.env.RESEND_INBOUND_WEBHOOK_SECRET
        },
        '❌ [RESEND-INBOUND] Invalid webhook signature - rejecting request'
      )
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid signature' },
        { status: 401 }
      )
    }

    logger.info({ svixId }, '✅ [RESEND-INBOUND] Webhook signature verified')

    // ═══════════════════════════════════════════════════════════
    // 3. Parser et valider le payload
    // ═══════════════════════════════════════════════════════════
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      logger.error({}, '❌ [RESEND-INBOUND] Failed to parse JSON payload')
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const validation = validateRequest(resendInboundWebhookSchema, payload)

    if (!validation.success) {
      logger.warn(
        { errors: formatZodErrors(validation.errors) },
        '⚠️ [RESEND-INBOUND] Payload validation failed'
      )
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid payload format' },
        { status: 400 }
      )
    }

    const event = validation.data

    logger.info(
      {
        emailId: event.data.email_id,
        from: event.data.from,
        to: event.data.to,
        subject: event.data.subject
      },
      '📧 [RESEND-INBOUND] Email received via webhook'
    )

    // ═══════════════════════════════════════════════════════════
    // 4. Extraire et parser l'adresse reply-to
    //    Supports deux formats :
    //    - Conversation: reply+conv_{interventionId}_{threadType}_{hash}@
    //    - Intervention: reply+int_{interventionId}_{hash}@
    // ═══════════════════════════════════════════════════════════
    const toAddress = event.data.to[0] // Premier destinataire

    // Try conversation format first (new format)
    const convParsed = EmailReplyService.parseConversationReplyToAddress(toAddress)

    // Fallback to intervention format (legacy)
    const intParsed = convParsed ? null : EmailReplyService.parseReplyToAddress(toAddress)

    // Neither format matched
    if (!convParsed && !intParsed) {
      logger.warn(
        { to: toAddress, from: event.data.from },
        '⚠️ [RESEND-INBOUND] Invalid reply-to format - email ignored'
      )

      // Log to audit table
      await logWebhookEvent({
        eventType: 'email.received',
        resendEmailId: event.data.email_id,
        recipientAddress: toAddress,
        senderAddress: event.data.from,
        subject: event.data.subject,
        status: 'invalid_address',
        errorMessage: 'Reply-to address format not recognized',
        processingTimeMs: Date.now() - startTime
      })

      // Retourner 200 pour éviter les retries de Resend
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'Invalid reply-to format'
      })
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Vérifier le hash (sécurité anti-falsification)
    // ═══════════════════════════════════════════════════════════
    let isValidHash = false
    let interventionId: string

    if (convParsed) {
      // Conversation format: verify with intervention ID + thread type
      isValidHash = EmailReplyService.verifyConversationHash(
        convParsed.interventionId,
        convParsed.threadType,
        convParsed.hash
      )
      interventionId = convParsed.interventionId

      logger.info(
        { interventionId, threadType: convParsed.threadType, from: event.data.from },
        '📧 [RESEND-INBOUND] Conversation reply-to address parsed'
      )
    } else if (intParsed) {
      // Intervention format: verify with type + ID
      isValidHash = EmailReplyService.verifyHash(intParsed.type, intParsed.id, intParsed.hash)
      interventionId = intParsed.id

      logger.info(
        { interventionId, from: event.data.from },
        '📧 [RESEND-INBOUND] Intervention reply-to address parsed'
      )
    } else {
      // Should never reach here due to earlier check, but TypeScript needs it
      return NextResponse.json({ success: true, ignored: true, reason: 'Parse error' })
    }

    if (!isValidHash) {
      // SECURITY: Enhanced logging for potential tampering attempts
      logger.error(
        {
          convParsed,
          intParsed,
          from: event.data.from,
          to: event.data.to,
          svixId,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        '❌ [RESEND-INBOUND] Invalid hash - potential tampering attempt'
      )

      // Log to audit table - SECURITY: This is a potential tampering attempt
      await logWebhookEvent({
        eventType: 'email.received',
        resendEmailId: event.data.email_id,
        recipientAddress: toAddress,
        senderAddress: event.data.from,
        subject: event.data.subject,
        interventionId: interventionId, // Keep for forensics even though hash is invalid
        status: 'invalid_hash',
        errorMessage: 'HMAC hash verification failed - potential tampering',
        processingTimeMs: Date.now() - startTime
      })

      // Retourner 200 pour éviter les retries de Resend
      // (on ne veut pas révéler qu'on a détecté une falsification)
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'Security validation failed'
      })
    }

    logger.info(
      { interventionId },
      '✅ [RESEND-INBOUND] Hash verification passed'
    )

    // ═══════════════════════════════════════════════════════════
    // 6. Répondre 200 OK immédiatement (Resend attend une réponse rapide)
    // ═══════════════════════════════════════════════════════════
    const response = NextResponse.json({
      success: true,
      processing: true,
      emailId: event.data.email_id,
      interventionId: interventionId,
      threadType: convParsed?.threadType || null,
      duration: Date.now() - startTime
    })

    // ═══════════════════════════════════════════════════════════
    // 7. Traitement asynchrone via after() (Vercel-compatible)
    // ═══════════════════════════════════════════════════════════
    // IMPORTANT: On Vercel serverless, the function is terminated after response.
    // Using after() keeps the context alive for background processing.
    // See: https://nextjs.org/docs/app/api-reference/functions/after
    const loggingContext = {
      startTime,
      toAddress
    }

    // Capture variables for closure (avoid stale references)
    const asyncEmailData = event.data
    // Create a unified parsed object that works with both formats
    const asyncParsed = convParsed
      ? { type: 'intervention' as const, id: convParsed.interventionId, hash: convParsed.hash, threadType: convParsed.threadType }
      : intParsed
        ? { ...intParsed, threadType: undefined }
        : { type: 'intervention' as const, id: interventionId, hash: '', threadType: undefined }
    const asyncLoggingContext = loggingContext

    after(async () => {
      try {
        await processEmailAsync(asyncEmailData, asyncParsed, asyncLoggingContext)
      } catch (error) {
        logger.error(
          { error, emailId: asyncEmailData.email_id, interventionId: asyncParsed.id },
          '❌ [RESEND-INBOUND] Async processing failed (in after())'
        )
      }
    })

    logger.info(
      {
        emailId: event.data.email_id,
        interventionId: interventionId,
        threadType: convParsed?.threadType || null,
        duration: Date.now() - startTime
      },
      '📧 [RESEND-INBOUND] Email received and queued for processing'
    )

    return response

  } catch (error) {
    logger.error(
      { error, duration: Date.now() - startTime },
      '❌ [RESEND-INBOUND] Unexpected error processing webhook'
    )
    // Return 500 for recoverable errors to trigger Resend retry
    // Only return 200 for validation errors (invalid format, invalid hash, etc.)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ══════════════════════════════════════════════════════════════
// Async Processing
// ══════════════════════════════════════════════════════════════

/**
 * Context for webhook logging (passed from POST handler)
 */
interface LoggingContext {
  startTime: number
  toAddress: string
}

/**
 * Traitement asynchrone de l'email reçu
 *
 * Étapes:
 * 1. Utiliser le contenu email directement depuis le payload webhook
 *    NOTE: Pour les webhooks INBOUND (email.received), le contenu EST dans le payload!
 * 2. Vérifier que l'intervention existe
 * 3. Identifier l'expéditeur
 * 4. Créer l'email dans la table emails
 * 5. Créer le lien email ↔ intervention
 * 6. Télécharger les pièces jointes (URLs doivent être fetch séparément)
 * 7. Notifier les gestionnaires
 *
 * Note: threadType is extracted from conversation reply-to format (conv_{id}_{threadType}_{hash})
 * and allows routing email replies to the correct conversation thread.
 */
async function processEmailAsync(
  emailData: ResendInboundWebhookPayload['data'],
  parsed: { type: 'intervention'; id: string; threadType?: 'group' | 'tenant_to_managers' | 'provider_to_managers' },
  loggingContext: LoggingContext
): Promise<ProcessedEmail | null> {
  const supabase = createServiceRoleSupabaseClient()

  logger.info(
    { emailId: emailData.email_id, interventionId: parsed.id },
    '📧 [RESEND-INBOUND] Starting async email processing...'
  )

  // ═══════════════════════════════════════════════════════════
  // 0. SECURITY: Validate intervention ID format (UUID)
  // ═══════════════════════════════════════════════════════════
  const interventionIdValidation = uuidSchema.safeParse(parsed.id)
  if (!interventionIdValidation.success) {
    logger.error(
      { id: parsed.id, error: interventionIdValidation.error },
      '❌ [RESEND-INBOUND] Invalid intervention ID format - potential injection attempt'
    )
    return null
  }

  // ═══════════════════════════════════════════════════════════
  // 0.1 IDEMPOTENCE: Check if this email was already processed
  // Resend may send the same webhook multiple times
  // ═══════════════════════════════════════════════════════════
  const messageId = emailData.message_id
  if (messageId) {
    const { data: existingEmail } = await supabase
      .from('emails')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle()

    if (existingEmail) {
      logger.info(
        { messageId, existingEmailId: existingEmail.id },
        '⚠️ [RESEND-INBOUND] Email already processed (idempotence check) - skipping'
      )
      return null
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1. Get email content: prefer webhook payload, fallback to API fetch
  // ═══════════════════════════════════════════════════════════
  // NOTE: Resend documentation says content IS in the webhook payload,
  // but in practice it's often missing. We use API fetch as fallback.
  // See: https://resend.com/docs/dashboard/receiving/introduction
  let emailContent = {
    html: emailData.html || '',
    text: emailData.text || '',
    headers: emailData.headers || {}
  }

  // Check if content is in webhook payload
  const hasContentInPayload = !!(emailData.html || emailData.text)

  if (hasContentInPayload) {
    logger.info(
      {
        emailId: emailData.email_id,
        hasHtml: !!emailData.html,
        hasText: !!emailData.text,
        htmlLength: emailContent.html.length,
        textLength: emailContent.text.length
      },
      '📧 [RESEND-INBOUND] Using email content from webhook payload'
    )
  } else {
    // Fallback: Fetch content from Resend API
    logger.info(
      { emailId: emailData.email_id },
      '📧 [RESEND-INBOUND] No content in webhook payload, fetching from Resend API...'
    )

    const fetchedContent = await ResendWebhookService.fetchReceivedEmailContent(emailData.email_id)

    if (fetchedContent) {
      emailContent = fetchedContent
      logger.info(
        {
          emailId: emailData.email_id,
          hasHtml: !!fetchedContent.html,
          hasText: !!fetchedContent.text,
          htmlLength: fetchedContent.html.length,
          textLength: fetchedContent.text.length
        },
        '✅ [RESEND-INBOUND] Email content fetched from Resend API'
      )
    } else {
      logger.warn(
        { emailId: emailData.email_id },
        '⚠️ [RESEND-INBOUND] Could not fetch email content from API - saving without body'
      )
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1.1 SECURITY: Sanitize HTML content to prevent XSS
  // Uses server-side regex sanitizer (no jsdom dependency)
  // Client-side uses DOMPurify for additional protection on display
  // ═══════════════════════════════════════════════════════════
  const sanitizedHtml = sanitizeHtmlServer(emailContent.html)

  // ═══════════════════════════════════════════════════════════
  // 2. Vérifier que l'intervention existe et récupérer team_id
  // ═══════════════════════════════════════════════════════════
  const { data: intervention, error: interventionError } = await supabase
    .from('interventions')
    .select('id, team_id, title, reference')
    .eq('id', parsed.id)
    .single()

  if (interventionError || !intervention) {
    logger.warn(
      { interventionId: parsed.id, error: interventionError },
      '⚠️ [RESEND-INBOUND] Intervention not found - email ignored'
    )

    // Log to audit table
    await logWebhookEvent({
      eventType: 'email.received',
      resendEmailId: emailData.email_id,
      recipientAddress: loggingContext.toAddress,
      senderAddress: emailData.from,
      subject: emailData.subject,
      interventionId: parsed.id,
      status: 'unknown_intervention',
      errorMessage: 'Intervention not found in database',
      processingTimeMs: Date.now() - loggingContext.startTime
    })

    return null
  }

  logger.info(
    { interventionId: intervention.id, teamId: intervention.team_id },
    '✅ [RESEND-INBOUND] Intervention found'
  )

  // ═══════════════════════════════════════════════════════════
  // 3. Identifier l'expéditeur (optionnel - peut être null)
  // ═══════════════════════════════════════════════════════════
  const senderEmail = extractEmailAddress(emailData.from)
  const { data: sender } = await supabase
    .from('users')
    .select('id, name, first_name, last_name, email, role')
    .eq('email', senderEmail.toLowerCase())
    .single()

  if (sender) {
    logger.info(
      { senderId: sender.id, senderEmail: sender.email },
      '✅ [RESEND-INBOUND] Sender identified'
    )
  } else {
    logger.info(
      { senderEmail },
      '📧 [RESEND-INBOUND] Sender not found in users table (external email)'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Créer l'email dans la table emails
  // ═══════════════════════════════════════════════════════════
  const { data: email, error: emailError } = await supabase
    .from('emails')
    .insert({
      team_id: intervention.team_id,
      direction: 'received',
      status: 'unread',
      from_address: emailData.from,
      to_addresses: emailData.to,
      cc_addresses: emailData.cc || [],
      subject: emailData.subject,
      body_html: sanitizedHtml, // ✅ SECURITY: Using sanitized HTML (XSS prevention)
      body_text: emailContent.text,
      message_id: emailData.message_id || emailContent.headers['message-id'] || null,
      // Use in_reply_to from payload (snake_case) or fallback to headers (kebab-case)
      in_reply_to_header: emailData.in_reply_to || emailContent.headers['in-reply-to'] || null,
      references: emailContent.headers['references'] || null,
      received_at: new Date().toISOString()
    })
    .select()
    .single()

  if (emailError || !email) {
    logger.error(
      { error: emailError },
      '❌ [RESEND-INBOUND] Failed to create email record'
    )

    // ✅ Log failure to webhook_logs for debugging
    await logWebhookEvent({
      eventType: 'email.received',
      resendEmailId: emailData.email_id,
      recipientAddress: loggingContext.toAddress,
      senderAddress: emailData.from,
      subject: emailData.subject,
      interventionId: parsed.id,
      status: 'error',
      errorMessage: `Email insert failed: ${emailError?.message || 'Unknown error'}`,
      processingTimeMs: Date.now() - loggingContext.startTime
    })

    return null
  }

  logger.info(
    { emailId: email.id, subject: email.subject },
    '✅ [RESEND-INBOUND] Email record created'
  )

  // ═══════════════════════════════════════════════════════════
  // 5. Créer le lien email ↔ intervention (via infrastructure existante)
  // ═══════════════════════════════════════════════════════════
  const { error: linkError } = await supabase
    .from('email_links')
    .insert({
      email_id: email.id,
      entity_type: 'intervention',
      entity_id: intervention.id,
      linked_by: sender?.id || null,
      notes: 'Auto-linked from email reply'
    })

  if (linkError) {
    logger.error(
      { error: linkError, emailId: email.id, interventionId: intervention.id },
      '❌ [RESEND-INBOUND] Failed to create email link'
    )
    // Continue quand même - l'email est créé
  } else {
    logger.info(
      { emailId: email.id, interventionId: intervention.id },
      '✅ [RESEND-INBOUND] Email linked to intervention'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 5.1 NEW: Sync email reply to intervention conversation
  // ═══════════════════════════════════════════════════════════
  // This creates a message in the appropriate conversation thread:
  // - If threadType is specified (from conv_ format), route to that specific thread
  // - Otherwise, default to "group" thread for backward compatibility
  try {
    const syncResult = await syncEmailReplyToConversation({
      interventionId: intervention.id,
      emailContent: { html: sanitizedHtml, text: emailContent.text },
      senderUserId: sender?.id || null,
      senderEmail: senderEmail,
      senderName: emailData.from,
      emailId: email.id,
      teamId: intervention.team_id,
      // NEW: Pass threadType if available (from conversation reply-to format)
      threadType: parsed.threadType
    })

    if (syncResult.success && syncResult.messageId) {
      logger.info(
        {
          emailId: email.id,
          messageId: syncResult.messageId,
          threadId: syncResult.threadId,
          threadType: parsed.threadType || 'group'
        },
        '✅ [RESEND-INBOUND] Email synced to conversation'
      )
    } else if (syncResult.error) {
      // Non-blocking: log but continue
      logger.info(
        { emailId: email.id, reason: syncResult.error, threadType: parsed.threadType },
        '📧 [RESEND-INBOUND] Email not synced to conversation (expected in some cases)'
      )
    }
  } catch (convError) {
    // Non-blocking: conversation sync failure should not break email processing
    logger.warn(
      { error: convError, emailId: email.id },
      '⚠️ [RESEND-INBOUND] Conversation sync failed (non-blocking)'
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 6. Télécharger les pièces jointes IMMÉDIATEMENT (URLs expirent en 7 jours)
  // ═══════════════════════════════════════════════════════════
  if (emailData.attachments && emailData.attachments.length > 0) {
    logger.info(
      { attachmentCount: emailData.attachments.length },
      '📎 [RESEND-INBOUND] Processing attachments...'
    )

    for (const attachment of emailData.attachments) {
      // Vérifier le type MIME
      if (!ResendWebhookService.isAllowedMimeType(attachment.content_type)) {
        logger.warn(
          { filename: attachment.filename, contentType: attachment.content_type },
          '⚠️ [RESEND-INBOUND] Skipping attachment - unsupported MIME type'
        )
        continue
      }

      // Télécharger la pièce jointe
      const downloaded = await ResendWebhookService.downloadAttachment(
        emailData.email_id,
        attachment.id,
        { filename: attachment.filename, content_type: attachment.content_type }
      )

      if (!downloaded) {
        logger.warn(
          { attachmentId: attachment.id, filename: attachment.filename },
          '⚠️ [RESEND-INBOUND] Failed to download attachment'
        )
        continue
      }

      // Vérifier la taille
      if (!ResendWebhookService.isAllowedSize(downloaded.buffer.byteLength)) {
        logger.warn(
          { filename: attachment.filename, size: downloaded.buffer.byteLength },
          '⚠️ [RESEND-INBOUND] Skipping attachment - too large'
        )
        continue
      }

      // Uploader vers Supabase Storage (email-attachments bucket — matches download route)
      const storagePath = `${intervention.team_id}/${intervention.id}/email-attachments/${Date.now()}_${downloaded.filename}`

      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(storagePath, downloaded.buffer, {
          contentType: downloaded.contentType,
          upsert: false
        })

      if (uploadError) {
        logger.error(
          { error: uploadError, filename: downloaded.filename },
          '❌ [RESEND-INBOUND] Failed to upload attachment to storage'
        )
        continue
      }

      // Créer l'enregistrement email_attachments
      const { error: attachmentDbError } = await supabase
        .from('email_attachments')
        .insert({
          email_id: email.id,
          filename: downloaded.filename,
          mime_type: downloaded.contentType,
          storage_path: storagePath,
          size: downloaded.buffer.byteLength
        })

      if (attachmentDbError) {
        logger.error(
          { error: attachmentDbError, filename: downloaded.filename },
          '❌ [RESEND-INBOUND] Failed to create attachment record'
        )
      } else {
        logger.info(
          { filename: downloaded.filename, size: downloaded.buffer.byteLength },
          '✅ [RESEND-INBOUND] Attachment saved'
        )
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. Notifier les gestionnaires
  // ═══════════════════════════════════════════════════════════
  const notificationResult = await notifyManagers(supabase, intervention, sender, emailData.subject, emailContent.text)

  const processingTimeMs = Date.now() - loggingContext.startTime

  logger.info(
    {
      emailId: email.id,
      interventionId: intervention.id,
      sender: sender?.email || senderEmail,
      notificationsSent: notificationResult.sent,
      notificationsFailed: notificationResult.failed,
      processingTimeMs
    },
    '✅ [RESEND-INBOUND] Email fully processed and linked to intervention'
  )

  // Log success to audit table
  await logWebhookEvent({
    eventType: 'email.received',
    resendEmailId: emailData.email_id,
    recipientAddress: loggingContext.toAddress,
    senderAddress: emailData.from,
    subject: emailData.subject,
    interventionId: intervention.id,
    userId: sender?.id,
    status: 'processed',
    processingTimeMs
  })

  return {
    emailId: email.id,
    interventionId: intervention.id,
    senderEmail: senderEmail,
    subject: emailData.subject
  }
}

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

/**
 * Extrait et valide l'adresse email d'un format "Name <email@domain.com>"
 *
 * SECURITY: Validates extracted email with Zod schema to prevent injection
 * Vulnerable pattern: "attacker@evil.com" <innocent@example.com>
 *
 * @param from - Raw from field (e.g., "John Doe <john@example.com>")
 * @returns Validated lowercase email address
 */
function extractEmailAddress(from: string): string {
  // Try to extract email from angle brackets format
  const match = from.match(/<([^>]+)>/)
  const extracted = match ? match[1] : from

  // Validate extracted email with Zod schema
  const validation = emailSchema.safeParse(extracted)

  if (!validation.success) {
    logger.warn(
      { from, extracted, error: validation.error.message },
      '⚠️ [RESEND-INBOUND] Invalid email format extracted - using raw input'
    )
    // Fallback: return cleaned version of the input
    return from.toLowerCase().trim()
  }

  return validation.data // Already lowercase and trimmed by schema
}

/**
 * Determine the sender role from user data
 */
function determineSenderRole(sender: { role?: string } | null): 'locataire' | 'prestataire' | 'externe' {
  if (sender?.role === 'locataire') return 'locataire'
  if (sender?.role === 'prestataire') return 'prestataire'
  return 'externe'
}

/**
 * Notifie les gestionnaires assignés à l'intervention
 *
 * Sends in-app notifications, push notifications, and email notifications
 * to all managers assigned to the intervention.
 *
 * @param subject - Email subject from the reply
 * @param textSnippet - Text body snippet from the reply
 * @returns Object with sent and failed counts for monitoring
 */
async function notifyManagers(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  intervention: { id: string; team_id: string; title: string; reference: string | null },
  sender: { id: string; name: string | null; first_name: string | null; last_name: string | null; email: string; role: string | null } | null,
  subject: string,
  textSnippet: string
): Promise<NotificationResult> {
  try {
    // Récupérer les gestionnaires assignés à l'intervention
    // NOTE: Use explicit FK name to avoid ambiguity (intervention_assignments has user_id FK)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('intervention_assignments')
      .select(`
        user_id,
        users!intervention_assignments_user_id_fkey!inner (
          id,
          name,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .eq('intervention_id', intervention.id)
      .eq('users.role', 'gestionnaire')

    if (assignmentsError) {
      logger.error(
        { error: assignmentsError, interventionId: intervention.id },
        '❌ [RESEND-INBOUND] Failed to fetch manager assignments'
      )
      return { sent: 0, failed: 0 }
    }

    if (!assignments || assignments.length === 0) {
      logger.info(
        { interventionId: intervention.id },
        '📧 [RESEND-INBOUND] No managers assigned to intervention'
      )
      return { sent: 0, failed: 0 }
    }

    const senderName = sender?.first_name && sender?.last_name
      ? `${sender.first_name} ${sender.last_name}`
      : sender?.name || 'Un utilisateur externe'

    // Créer une notification pour chaque gestionnaire
    const notifications = assignments.map(assignment => ({
      user_id: assignment.user_id,
      team_id: intervention.team_id,
      type: 'email_reply_received' as const,
      title: 'Nouvelle réponse par email',
      message: `${senderName} a répondu par email à l'intervention "${intervention.title || intervention.reference}"`,
      link: `/gestionnaire/operations/interventions/${intervention.id}?tab=emails`,
      is_read: false
    }))

    const { error: notifError, data: insertedNotifications } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id')

    if (notifError) {
      logger.error(
        {
          error: notifError,
          managerIds: notifications.map(n => n.user_id),
          interventionId: intervention.id
        },
        '❌ [RESEND-INBOUND] Failed to create manager notifications'
      )
      return { sent: 0, failed: notifications.length }
    }

    const sentCount = insertedNotifications?.length || notifications.length
    logger.info(
      { count: sentCount, interventionId: intervention.id },
      '✅ [RESEND-INBOUND] Manager notifications created'
    )

    // ═══════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Alert managers about email reply
    // ═══════════════════════════════════════════════════════════
    const managerIds = assignments.map(a => a.user_id)
    try {
      const { sendPushNotificationToUsers } = await import('@/lib/send-push-notification')
      sendPushNotificationToUsers(managerIds, {
        title: '📧 Réponse par email',
        message: `${senderName} a répondu`,
        url: `/gestionnaire/operations/interventions/${intervention.id}?tab=emails`,
        type: 'email_reply'
      }).catch(err => logger.warn({ err }, '⚠️ [PUSH] Failed in notifyManagers'))
    } catch (pushError) {
      logger.warn({ pushError }, '⚠️ [PUSH] Import failed in notifyManagers')
    }

    // ═══════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Send EmailReplyReceivedEmail to managers
    // ═══════════════════════════════════════════════════════════
    try {
      const { EmailService } = await import('@/lib/services/domain/email.service')
      const emailService = new EmailService()
      if (emailService.isConfigured()) {
        const { EmailReplyReceivedEmail } = await import('@/emails/templates/notifications/email-reply-received')
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido.app'

        for (const assignment of assignments) {
          const user = assignment.users as any
          if (!user?.email) continue

          try {
            await emailService.send({
              to: user.email,
              subject: `📧 Re: ${intervention.reference || intervention.title}`,
              react: EmailReplyReceivedEmail({
                firstName: user.first_name || user.name || 'Gestionnaire',
                intervention: {
                  id: intervention.id,
                  title: intervention.title,
                  reference: intervention.reference,
                },
                sender: {
                  name: senderName,
                  email: sender?.email || 'inconnu',
                  role: determineSenderRole(sender),
                },
                subject,
                snippet: textSnippet.substring(0, 200),
                viewUrl: `${baseUrl}/gestionnaire/operations/interventions/${intervention.id}?tab=emails`,
              }),
              tags: [{ name: 'type', value: 'email_reply_received' }],
            })
          } catch (singleEmailError) {
            logger.warn(
              { error: singleEmailError, to: user.email },
              '⚠️ [EMAIL] Failed to send reply notification to individual manager'
            )
          }
        }
      }
    } catch (emailError) {
      logger.warn({ emailError }, '⚠️ [EMAIL] Failed in notifyManagers')
    }

    return { sent: sentCount, failed: 0 }
  } catch (error) {
    logger.error(
      { error, interventionId: intervention.id },
      '❌ [RESEND-INBOUND] Error notifying managers'
    )
    return { sent: 0, failed: 1 }
  }
}
