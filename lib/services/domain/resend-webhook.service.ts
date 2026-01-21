/**
 * 📧 ResendWebhookService - Vérification et traitement des webhooks Resend
 *
 * Gère la réception des emails entrants via Resend Inbound API.
 *
 * Architecture:
 * - Vérifie la signature Svix des webhooks Resend
 * - Pour les webhooks INBOUND (email.received), le contenu HTML/text EST dans le payload
 * - Télécharge les pièces jointes (URLs expirent en 7 jours)
 *
 * IMPORTANT: Ne pas confondre avec les webhooks de TRACKING (email.sent, email.delivered)
 * qui eux ne contiennent PAS le body de l'email.
 *
 * See: https://resend.com/docs/dashboard/receiving/introduction
 * "When an email is received, a webhook will be triggered containing the email data including the body."
 *
 * Sécurité:
 * - Vérification signature Svix (svix-id, svix-timestamp, svix-signature)
 * - Validation du payload avec schéma Zod
 * - Hash HMAC pour authentifier les adresses reply-to
 *
 * @see app/api/webhooks/resend-inbound/route.ts - Endpoint webhook
 * @see lib/services/domain/email-reply.service.ts - Génération/parsing reply-to
 */

import * as crypto from 'crypto'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════

/**
 * Secret Svix pour vérifier les signatures webhook Resend
 * Obtenu depuis Resend Dashboard → Webhooks
 */
const WEBHOOK_SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET || ''

/**
 * Limite de taille pour le contenu email (HTML + Text)
 * Protège contre les emails volumineux malveillants
 */
const MAX_EMAIL_CONTENT_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Limite de taille pour les pièces jointes
 */
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Configuration du retry avec exponential backoff
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,  // 1 second
  maxDelayMs: 10000,     // 10 seconds
  backoffMultiplier: 2,
}

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Execute a function with exponential backoff retry
 *
 * @param fn - Async function to execute
 * @param operationName - Name for logging purposes
 * @returns Result of fn, or null if all retries failed
 */
async function withRetry<T>(
  fn: () => Promise<T | null>,
  operationName: string
): Promise<T | null> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await fn()

      // If result is null but no error, this is a valid "not found" response
      // Don't retry for explicit null returns (like 404s)
      if (result !== null || attempt === 0) {
        return result
      }

      // If first attempt returns null, retry (might be temporary API issue)
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelayMs
        )
        logger.warn(
          { operationName, attempt: attempt + 1, delayMs: delay },
          `⏳ [RESEND-WEBHOOK] ${operationName} returned null, retrying...`
        )
        await sleep(delay)
      }
    } catch (error) {
      lastError = error as Error

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelayMs
        )
        logger.warn(
          { operationName, attempt: attempt + 1, delayMs: delay, error: lastError.message },
          `⏳ [RESEND-WEBHOOK] ${operationName} failed, retrying...`
        )
        await sleep(delay)
      }
    }
  }

  logger.error(
    { operationName, maxRetries: RETRY_CONFIG.maxRetries, error: lastError?.message },
    `❌ [RESEND-WEBHOOK] ${operationName} failed after all retries`
  )
  return null
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/**
 * Contenu d'email récupéré via l'API Resend
 */
export interface EmailContent {
  html: string
  text: string
  headers: Record<string, string>
}

/**
 * Pièce jointe téléchargée
 */
export interface DownloadedAttachment {
  buffer: ArrayBuffer
  filename: string
  contentType: string
}

/**
 * Métadonnées d'une pièce jointe dans le webhook
 */
export interface WebhookAttachment {
  id: string
  filename: string
  content_type: string
  content_disposition?: string
  content_id?: string
}

// ══════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════

/**
 * Service de gestion des webhooks Resend pour les emails entrants
 */
export class ResendWebhookService {
  /**
   * Vérifie la signature Svix du webhook Resend
   *
   * Resend utilise Svix pour signer les webhooks avec les headers:
   * - svix-id: Identifiant unique du message
   * - svix-timestamp: Timestamp UNIX de l'envoi
   * - svix-signature: Signature HMAC
   *
   * @param rawBody - Corps brut de la requête (string, pas JSON parsé)
   * @param svixId - Header svix-id
   * @param svixTimestamp - Header svix-timestamp
   * @param svixSignature - Header svix-signature
   * @returns true si la signature est valide, false sinon
   *
   * @example
   * ```typescript
   * const rawBody = await request.text()
   * const isValid = ResendWebhookService.verifySignature(
   *   rawBody,
   *   request.headers.get('svix-id'),
   *   request.headers.get('svix-timestamp'),
   *   request.headers.get('svix-signature')
   * )
   * ```
   */
  static verifySignature(
    rawBody: string,
    svixId: string | null,
    svixTimestamp: string | null,
    svixSignature: string | null
  ): boolean {
    // 1. Vérifier que tous les headers sont présents
    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.warn(
        { hasSvixId: !!svixId, hasSvixTimestamp: !!svixTimestamp, hasSvixSignature: !!svixSignature },
        '⚠️ [RESEND-WEBHOOK] Missing Svix headers'
      )
      return false
    }

    // 2. Vérifier que le secret est configuré
    if (!WEBHOOK_SECRET) {
      logger.error({}, '❌ [RESEND-WEBHOOK] RESEND_INBOUND_WEBHOOK_SECRET not configured')
      return false
    }

    try {
      // 3. Vérifier que le timestamp n'est pas trop vieux (5 minutes max)
      const timestampSeconds = parseInt(svixTimestamp, 10)
      const now = Math.floor(Date.now() / 1000)
      const tolerance = 5 * 60 // 5 minutes

      if (Math.abs(now - timestampSeconds) > tolerance) {
        logger.warn(
          { timestampSeconds, now, diff: Math.abs(now - timestampSeconds) },
          '⚠️ [RESEND-WEBHOOK] Timestamp too old or in future (replay attack?)'
        )
        return false
      }

      // 4. Construire la signature attendue
      // Format Svix: "${svix_id}.${svix_timestamp}.${body}"
      const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`

      // 5. Le secret Svix commence par "whsec_" - on le retire pour obtenir la clé base64
      const secretKey = WEBHOOK_SECRET.startsWith('whsec_')
        ? WEBHOOK_SECRET.substring(6)
        : WEBHOOK_SECRET

      // 6. Décoder la clé (base64) et calculer la signature HMAC-SHA256
      const secretBytes = Buffer.from(secretKey, 'base64')
      const expectedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedPayload)
        .digest('base64')

      // 7. Le header svix-signature peut contenir plusieurs versions (v1,v2...)
      // Format: "v1,{base64_sig1} v1,{base64_sig2}"
      const signatures = svixSignature.split(' ')
      let isValid = false

      for (const sig of signatures) {
        const [version, sigValue] = sig.split(',')
        if (version === 'v1' && sigValue) {
          // Comparaison constant-time
          const sigBuffer = Buffer.from(sigValue, 'base64')
          const expectedBuffer = Buffer.from(expectedSignature, 'base64')

          if (sigBuffer.length === expectedBuffer.length) {
            try {
              if (crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
                isValid = true
                break
              }
            } catch {
              // timingSafeEqual peut throw si les buffers ont des longueurs différentes
            }
          }
        }
      }

      if (!isValid) {
        logger.warn({}, '⚠️ [RESEND-WEBHOOK] Signature verification failed')
      }

      return isValid
    } catch (error) {
      logger.error(
        { error },
        '❌ [RESEND-WEBHOOK] Error during signature verification'
      )
      return false
    }
  }

  /**
   * @deprecated The inbound webhook payload DOES contain html/text for email.received events.
   * This method is NOT needed - use emailData.html and emailData.text from the webhook payload directly.
   * The /emails/received/:id API endpoint may not work as expected (returns 404 in many cases).
   *
   * This method is kept for potential future use with other webhook types or debugging purposes.
   *
   * @see https://resend.com/docs/dashboard/receiving/introduction
   * "When an email is received, a webhook will be triggered containing the email data including the body."
   *
   * @param emailId - ID of the received email
   * @returns Email content or null if not found/failed
   */
  static async fetchReceivedEmailContent(emailId: string): Promise<EmailContent | null> {
    return withRetry(
      () => this.fetchReceivedEmailContentInternal(emailId),
      `fetchReceivedEmailContent(${emailId})`
    )
  }

  /**
   * Internal implementation of fetchReceivedEmailContent without retry
   * @private
   */
  private static async fetchReceivedEmailContentInternal(emailId: string): Promise<EmailContent | null> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      logger.error({}, '❌ [RESEND-WEBHOOK] RESEND_API_KEY not configured')
      return null
    }

    logger.info({ emailId }, '📧 [RESEND-WEBHOOK] Fetching RECEIVED email content from Resend API...')

    // ✅ CORRECT: Use /emails/received/:id for INBOUND emails
    const response = await fetch(`https://api.resend.com/emails/received/${emailId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 404) {
        logger.warn(
          { emailId, status: response.status },
          '⚠️ [RESEND-WEBHOOK] Received email not found in Resend (404)'
        )
        return null
      }
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }

    const emailData = await response.json()

    // ═══════════════════════════════════════════════════════════
    // SECURITY: Validate email content size to prevent DoS
    // ═══════════════════════════════════════════════════════════
    const htmlSize = (emailData.html || '').length
    const textSize = (emailData.text || '').length
    const totalSize = htmlSize + textSize

    if (totalSize > MAX_EMAIL_CONTENT_SIZE) {
      logger.warn(
        { emailId, htmlSize, textSize, totalSize, maxSize: MAX_EMAIL_CONTENT_SIZE },
        '⚠️ [RESEND-WEBHOOK] Received email content too large - rejecting'
      )
      return null
    }

    logger.info(
      { emailId, hasHtml: !!emailData.html, hasText: !!emailData.text, totalSize },
      '✅ [RESEND-WEBHOOK] Received email content fetched successfully'
    )

    return {
      html: emailData.html || '',
      text: emailData.text || '',
      headers: emailData.headers || {}
    }
  }

  /**
   * @deprecated For inbound emails, use fetchReceivedEmailContent() instead!
   * The /emails/{id} API is for SENT emails only and returns 404 for inbound emails.
   *
   * This method is kept for backward compatibility and potential future use
   * with outbound email tracking.
   *
   * @param emailId - ID of the email (only works for SENT emails)
   * @returns Email content or null if not found/failed
   */
  static async fetchEmailContent(emailId: string): Promise<EmailContent | null> {
    return withRetry(
      () => this.fetchEmailContentInternal(emailId),
      `fetchEmailContent(${emailId})`
    )
  }

  /**
   * Internal implementation of fetchEmailContent without retry
   * @private
   */
  private static async fetchEmailContentInternal(emailId: string): Promise<EmailContent | null> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      logger.error({}, '❌ [RESEND-WEBHOOK] RESEND_API_KEY not configured')
      return null
    }

    logger.info({ emailId }, '📧 [RESEND-WEBHOOK] Fetching email content from Resend API...')

    // Appeler l'API Resend pour récupérer l'email complet
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Throw error for retry logic to catch (except for 404s)
      if (response.status === 404) {
        logger.warn(
          { emailId, status: response.status },
          '⚠️ [RESEND-WEBHOOK] Email not found in Resend (404) - not retrying'
        )
        return null
      }
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }

    const emailData = await response.json()

    // ═══════════════════════════════════════════════════════════
    // SECURITY: Validate email content size to prevent DoS
    // ═══════════════════════════════════════════════════════════
    const htmlSize = (emailData.html || '').length
    const textSize = (emailData.text || '').length
    const totalSize = htmlSize + textSize

    if (totalSize > MAX_EMAIL_CONTENT_SIZE) {
      logger.warn(
        { emailId, htmlSize, textSize, totalSize, maxSize: MAX_EMAIL_CONTENT_SIZE },
        '⚠️ [RESEND-WEBHOOK] Email content too large - rejecting'
      )
      return null
    }

    logger.info(
      { emailId, hasHtml: !!emailData.html, hasText: !!emailData.text, totalSize },
      '✅ [RESEND-WEBHOOK] Email content fetched successfully'
    )

    return {
      html: emailData.html || '',
      text: emailData.text || '',
      headers: emailData.headers || {}
    }
  }

  /**
   * Télécharge une pièce jointe d'email (avec retry)
   *
   * IMPORTANT: Les URLs de téléchargement expirent en 7 jours!
   * Télécharger IMMÉDIATEMENT lors de la réception du webhook.
   *
   * Cette méthode inclut un retry automatique avec exponential backoff
   * en cas d'échec temporaire.
   *
   * @param emailId - ID de l'email
   * @param attachmentId - ID de la pièce jointe
   * @param attachmentMeta - Métadonnées de la pièce jointe (filename, content_type)
   * @returns Pièce jointe téléchargée ou null si échec après tous les retries
   *
   * @example
   * ```typescript
   * const attachment = await ResendWebhookService.downloadAttachment(
   *   'email_123',
   *   'att_456',
   *   { filename: 'photo.jpg', content_type: 'image/jpeg' }
   * )
   * if (attachment) {
   *   // Uploader vers Supabase Storage
   *   await supabase.storage.from('attachments').upload(path, attachment.buffer)
   * }
   * ```
   */
  static async downloadAttachment(
    emailId: string,
    attachmentId: string,
    attachmentMeta: Pick<WebhookAttachment, 'filename' | 'content_type'>
  ): Promise<DownloadedAttachment | null> {
    return withRetry(
      () => this.downloadAttachmentInternal(emailId, attachmentId, attachmentMeta),
      `downloadAttachment(${emailId}, ${attachmentId})`
    )
  }

  /**
   * Internal implementation of downloadAttachment without retry
   * @private
   */
  private static async downloadAttachmentInternal(
    emailId: string,
    attachmentId: string,
    attachmentMeta: Pick<WebhookAttachment, 'filename' | 'content_type'>
  ): Promise<DownloadedAttachment | null> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      logger.error({}, '❌ [RESEND-WEBHOOK] RESEND_API_KEY not configured')
      return null
    }

    logger.info(
      { emailId, attachmentId, filename: attachmentMeta.filename },
      '📎 [RESEND-WEBHOOK] Downloading attachment...'
    )

    // Récupérer l'URL de téléchargement via l'API Resend
    const response = await fetch(
      `https://api.resend.com/emails/${emailId}/attachments/${attachmentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      // 404 = attachment doesn't exist, don't retry
      if (response.status === 404) {
        logger.warn(
          { emailId, attachmentId, status: response.status },
          '⚠️ [RESEND-WEBHOOK] Attachment not found (404) - not retrying'
        )
        return null
      }
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }

    const attachmentData = await response.json()
    const downloadUrl = attachmentData.download_url || attachmentData.url

    if (!downloadUrl) {
      logger.error(
        { emailId, attachmentId },
        '❌ [RESEND-WEBHOOK] No download URL in attachment response'
      )
      return null
    }

    // ═══════════════════════════════════════════════════════════
    // SECURITY: Check Content-Length BEFORE downloading
    // This prevents downloading large malicious files
    // ═══════════════════════════════════════════════════════════
    const headResponse = await fetch(downloadUrl, { method: 'HEAD' })
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10)

    if (contentLength > MAX_ATTACHMENT_SIZE) {
      logger.warn(
        { emailId, attachmentId, contentLength, maxSize: MAX_ATTACHMENT_SIZE },
        '⚠️ [RESEND-WEBHOOK] Attachment too large - skipping download'
      )
      return null
    }

    // Télécharger le fichier
    const fileResponse = await fetch(downloadUrl)
    if (!fileResponse.ok) {
      throw new Error(`Download failed with status ${fileResponse.status}`)
    }

    const buffer = await fileResponse.arrayBuffer()

    // Double-check size after download (Content-Length can be spoofed)
    if (buffer.byteLength > MAX_ATTACHMENT_SIZE) {
      logger.warn(
        { emailId, attachmentId, actualSize: buffer.byteLength, maxSize: MAX_ATTACHMENT_SIZE },
        '⚠️ [RESEND-WEBHOOK] Downloaded attachment exceeded size limit - discarding'
      )
      return null
    }

    logger.info(
      { emailId, attachmentId, filename: attachmentMeta.filename, size: buffer.byteLength },
      '✅ [RESEND-WEBHOOK] Attachment downloaded successfully'
    )

    return {
      buffer,
      filename: attachmentMeta.filename,
      contentType: attachmentMeta.content_type
    }
  }

  /**
   * Vérifie si le service webhook est configuré
   *
   * @returns true si RESEND_INBOUND_WEBHOOK_SECRET est défini
   */
  static isConfigured(): boolean {
    return !!WEBHOOK_SECRET && !!process.env.RESEND_API_KEY
  }

  /**
   * Valide le type MIME d'une pièce jointe
   *
   * Filtre les types dangereux (exécutables, scripts, etc.)
   *
   * @param contentType - Type MIME de la pièce jointe
   * @returns true si le type est autorisé
   */
  static isAllowedMimeType(contentType: string): boolean {
    const ALLOWED_MIME_TYPES = [
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Texte
      'text/plain',
      'text/csv',
    ]

    const normalizedType = contentType.toLowerCase().split(';')[0].trim()
    return ALLOWED_MIME_TYPES.includes(normalizedType)
  }

  /**
   * Vérifie la taille d'une pièce jointe
   *
   * @param size - Taille en bytes
   * @returns true si la taille est acceptable (< 10MB)
   */
  static isAllowedSize(size: number): boolean {
    const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB
    return size <= MAX_ATTACHMENT_SIZE
  }
}

// ══════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Crée une instance du ResendWebhookService
 * Note: Cette classe utilise des méthodes statiques, pas besoin d'instanciation
 */
export const createResendWebhookService = () => ResendWebhookService
