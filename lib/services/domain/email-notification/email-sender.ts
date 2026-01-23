/**
 * 📧 Batch Email Sender
 *
 * Handles the common logic for sending batch emails with:
 * - Rate limiting (Resend 2 req/s)
 * - Exponential backoff retry for 429 errors
 * - Magic link generation
 * - Result aggregation
 *
 * @module email-notification/email-sender
 */

import { logger } from '@/lib/logger'
import type { EmailService } from '../email.service'
import { generateMagicLinksBatch } from '../magic-link.service'
import {
  RESEND_RATE_LIMIT_DELAY_MS,
  MAX_RETRIES,
  RETRY_DELAY_MS
} from './constants'
import { delay, isRateLimitError, calculateBackoffDelay } from './helpers'
import type { EmailBatchResult, EmailRecipientResult, RecipientWithEmail, BuiltEmail } from './types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/**
 * Parameters for sending a batch of emails
 */
export interface BatchSendParams {
  /** Recipients with email details */
  recipients: RecipientWithEmail[]
  /** Function to build email for each recipient */
  buildEmail: (recipient: RecipientWithEmail, magicLinkUrl: string) => Promise<BuiltEmail>
  /** Intervention ID for logging */
  interventionId: string
  /** Event type for logging */
  eventType: string
  /** Base URL for magic link redirects */
  redirectBasePath: string
}

/**
 * Single email send parameters
 */
export interface SingleSendParams {
  email: BuiltEmail
  recipient: RecipientWithEmail
  interventionId: string
  index: number
  totalEmails: number
}

// ══════════════════════════════════════════════════════════════
// BatchEmailSender
// ══════════════════════════════════════════════════════════════

/**
 * Service for sending batch emails with rate limiting and retry logic.
 * Consolidates the common sending pattern used across all email notification types.
 */
export class BatchEmailSender {
  constructor(private emailService: EmailService) {}

  /**
   * Check if the email service is configured
   */
  isConfigured(): boolean {
    return this.emailService.isConfigured()
  }

  /**
   * Send a batch of emails with rate limiting and retry
   *
   * @param params - Batch send parameters
   * @returns Batch result with success counts
   */
  async sendBatch(params: BatchSendParams): Promise<EmailBatchResult> {
    const { recipients, buildEmail, interventionId, eventType, redirectBasePath } = params
    const startTime = Date.now()

    logger.info({
      interventionId,
      eventType,
      recipientCount: recipients.length,
      rateLimit: '2 req/s (Resend)',
      strategy: 'sequential with 500ms delay + retry on 429'
    }, '📧 [EMAIL-SENDER] Starting batch send')

    // Check if configured
    if (!this.isConfigured()) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-SENDER] Resend not configured - skipping')
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    if (recipients.length === 0) {
      logger.info({ interventionId }, '📧 [EMAIL-SENDER] No recipients - skipping')
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    // Generate magic links for all recipients
    const magicLinkRecipients = recipients.map(r => ({
      email: r.email,
      redirectTo: `${redirectBasePath}/${r.role}/interventions/${interventionId}`
    }))
    const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)

    logger.info({
      interventionId,
      requested: recipients.length,
      generated: magicLinksMap.size
    }, '✅ [EMAIL-SENDER] Magic links generated')

    // Build and send emails
    const results: EmailRecipientResult[] = []

    for (const [index, recipient] of recipients.entries()) {
      // Rate limiting delay
      if (index > 0) {
        await delay(RESEND_RATE_LIMIT_DELAY_MS)
      }

      // Get magic link or fallback
      const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipient.role}/interventions/${interventionId}`
      const magicLinkUrl = magicLinksMap.get(recipient.email) || fallbackUrl

      try {
        // Build email
        const email = await buildEmail(recipient, magicLinkUrl)

        // Send with retry
        const result = await this.sendSingle({
          email,
          recipient,
          interventionId,
          index,
          totalEmails: recipients.length
        })

        results.push(result)

      } catch (error) {
        logger.error({
          interventionId,
          recipientId: recipient.id,
          error: error instanceof Error ? error.message : 'Unknown'
        }, '❌ [EMAIL-SENDER] Failed to build/send email')

        results.push({
          userId: recipient.id,
          email: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate stats
    const sentCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length
    const timing = Date.now() - startTime

    logger.info({
      interventionId,
      eventType,
      sentCount,
      failedCount,
      timing,
      totalEmails: recipients.length
    }, '✅ [EMAIL-SENDER] Batch send completed')

    return {
      success: failedCount === 0,
      sentCount,
      failedCount,
      results
    }
  }

  /**
   * Send a single email with retry on rate limit
   *
   * @param params - Single send parameters
   * @returns Result for this recipient
   */
  async sendSingle(params: SingleSendParams): Promise<EmailRecipientResult> {
    const { email, recipient, interventionId, index, totalEmails } = params

    logger.info({
      interventionId,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      recipientRole: recipient.role,
      subject: email.subject,
      emailIndex: index + 1,
      totalEmails
    }, '📧 [EMAIL-SENDER] Sending email to recipient')

    // Send with retry
    let result = await this.emailService.send(email)
    let retryCount = 0

    // Retry on rate limit errors
    while (!result.success && retryCount < MAX_RETRIES) {
      if (!isRateLimitError(result.error)) {
        break // Not a rate limit error, don't retry
      }

      retryCount++
      const retryDelay = calculateBackoffDelay(retryCount, RETRY_DELAY_MS)

      logger.warn({
        interventionId,
        recipientId: recipient.id,
        retryCount,
        maxRetries: MAX_RETRIES,
        retryDelay,
        error: result.error
      }, '⚠️ [EMAIL-SENDER] Rate limit hit, retrying...')

      await delay(retryDelay)
      result = await this.emailService.send(email)
    }

    // Log final result
    if (result.success) {
      logger.info({
        interventionId,
        recipientId: recipient.id,
        emailId: result.emailId,
        retryCount
      }, '✅ [EMAIL-SENDER] Email sent successfully')
    } else {
      logger.error({
        interventionId,
        recipientId: recipient.id,
        error: result.error,
        retryCount
      }, '❌ [EMAIL-SENDER] Failed to send email (after retries)')
    }

    return {
      userId: recipient.id,
      email: recipient.email,
      success: result.success,
      emailId: result.emailId,
      error: result.error
    }
  }

  /**
   * Send a single email directly (no batch context)
   * Used for one-off emails like quote notifications
   *
   * @param email - Built email to send
   * @returns Send result
   */
  async sendDirect(email: BuiltEmail): Promise<{ success: boolean; emailId?: string; error?: string }> {
    if (!this.isConfigured()) {
      logger.warn({}, '⚠️ [EMAIL-SENDER] Resend not configured - skipping')
      return { success: false, error: 'Email service not configured' }
    }

    return this.emailService.send(email)
  }
}

// ══════════════════════════════════════════════════════════════
// Factory
// ══════════════════════════════════════════════════════════════

/**
 * Create a BatchEmailSender with dependencies
 */
export function createBatchEmailSender(emailService: EmailService): BatchEmailSender {
  return new BatchEmailSender(emailService)
}
