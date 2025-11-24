/**
 * 📧 EmailService - Service d'envoi d'emails avec Resend
 *
 * Architecture:
 * - Utilise Resend pour l'envoi effectif
 * - Render les templates React Email en HTML
 * - Gère les erreurs et les logs
 * - Support des templates interventions et devis
 */

import { Resend } from 'resend'
import { renderEmail } from '@/emails/utils/render'
import type { ReactElement } from 'react'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface SendEmailParams {
  to: string | string[]
  subject: string
  react: ReactElement
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  success: boolean
  emailId?: string
  error?: string
}

/**
 * Résultat d'envoi batch avec Resend
 * Correspond à la réponse de resend.batch.send()
 */
export interface BatchEmailResult {
  success: boolean
  results: Array<{
    index: number
    emailId?: string
    error?: string
  }>
  sentCount: number
  failedCount: number
}

// ══════════════════════════════════════════════════════════════
// EmailService Class
// ══════════════════════════════════════════════════════════════

export class EmailService {
  private resend: Resend
  private defaultFrom: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      logger.warn('⚠️ [EMAIL-SERVICE] RESEND_API_KEY not configured - emails disabled')
      // Mode dégradé : pas d'erreur, mais emails non envoyés
    }

    this.resend = new Resend(apiKey)
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'SEIDO <noreply@seido.app>'
  }

  /**
   * Envoie un email en utilisant un template React Email
   */
  async send(params: SendEmailParams): Promise<EmailResult> {
    const { to, subject, react, from, replyTo, tags } = params

    try {
      // 1. Vérifier que Resend est configuré
      if (!process.env.RESEND_API_KEY) {
        logger.warn({ to, subject }, '⚠️ [EMAIL-SERVICE] Email not sent - Resend not configured')
        return {
          success: false,
          error: 'Email service not configured',
        }
      }

      // 2. Render le template en HTML + texte brut
      logger.info({ to, subject }, '📧 [EMAIL-SERVICE] Rendering email template...')
      const { html, text } = await renderEmail(react)

      // 3. Envoyer via Resend
      logger.info({ to, subject }, '📧 [EMAIL-SERVICE] Sending email via Resend...')
      const { data, error } = await this.resend.emails.send({
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
        tags,
      })

      if (error) {
        logger.error({ error, to, subject }, '❌ [EMAIL-SERVICE] Failed to send email')
        return {
          success: false,
          error: error.message || 'Unknown error',
        }
      }

      logger.info({ emailId: data?.id, to, subject }, '✅ [EMAIL-SERVICE] Email sent successfully')
      return {
        success: true,
        emailId: data?.id,
      }
    } catch (error) {
      logger.error({ error, to, subject }, '❌ [EMAIL-SERVICE] Unexpected error sending email')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Envoie plusieurs emails en batch via Resend Batch API
   *
   * Utilise resend.batch.send() pour envoyer jusqu'à 100 emails en 1 seule requête HTTP.
   * Mode "permissive" : envoie tous les emails valides même si certains échouent.
   *
   * @param emails - Array de max 100 emails à envoyer
   * @returns BatchEmailResult avec détails par email
   */
  async sendBatch(emails: SendEmailParams[]): Promise<BatchEmailResult> {
    const startTime = Date.now()
    logger.info({ count: emails.length }, '📧 [EMAIL-SERVICE] Sending batch emails via Resend Batch API...')

    try {
      // 1. Vérifier que Resend est configuré
      if (!process.env.RESEND_API_KEY) {
        logger.warn({ count: emails.length }, '⚠️ [EMAIL-SERVICE] Batch not sent - Resend not configured')
        return {
          success: false,
          results: emails.map((_, index) => ({
            index,
            error: 'Email service not configured',
          })),
          sentCount: 0,
          failedCount: emails.length,
        }
      }

      // 2. Valider la limite de 100 emails
      if (emails.length > 100) {
        logger.error({ count: emails.length }, '❌ [EMAIL-SERVICE] Batch too large (max 100)')
        throw new Error(`Batch size ${emails.length} exceeds Resend limit of 100 emails`)
      }

      // 3. Préparer les emails pour Resend (render les templates React)
      logger.info({ count: emails.length }, '📧 [EMAIL-SERVICE] Rendering email templates for batch...')
      const renderedEmails = await Promise.all(
        emails.map(async (email) => {
          const { html, text } = await renderEmail(email.react)
          return {
            from: email.from || this.defaultFrom,
            to: Array.isArray(email.to) ? email.to : [email.to],
            subject: email.subject,
            html,
            text,
            reply_to: email.replyTo,
            tags: email.tags,
          }
        })
      )

      // 4. Envoyer le batch via Resend (1 seule requête HTTP)
      logger.info({ count: renderedEmails.length }, '📧 [EMAIL-SERVICE] Sending batch via resend.batch.send()...')
      const { data, error } = await this.resend.batch.send(renderedEmails)

      // 5. Traiter la réponse
      if (error) {
        logger.error({ error, count: emails.length }, '❌ [EMAIL-SERVICE] Batch send failed')
        return {
          success: false,
          results: emails.map((_, index) => ({
            index,
            error: error.message || JSON.stringify(error) || 'Batch send failed',
          })),
          sentCount: 0,
          failedCount: emails.length,
        }
      }

      // 6. Parser les résultats
      // Note: Resend retourne { data: { data: [{id}], errors?: [] } }
      // L'array d'emails est dans data.data, pas data directement!
      const emailResults = (data as any)?.data || []
      const emailErrors = (data as any)?.errors || []

      const results = emailResults.map((item: { id: string }, index: number) => ({
        index,
        emailId: item.id,
        error: undefined,
      }))

      // Ajouter les erreurs si présentes (mode permissive)
      emailErrors.forEach((err: { index: number; message: string }) => {
        if (results[err.index]) {
          results[err.index].error = err.message
        }
      })

      const sentCount = results.filter(r => !r.error).length
      const failedCount = results.filter(r => r.error).length
      const timing = Date.now() - startTime

      logger.info(
        { sentCount, failedCount, timing, totalEmails: emails.length },
        '✅ [EMAIL-SERVICE] Batch completed successfully'
      )

      return {
        success: failedCount === 0,
        results,
        sentCount,
        failedCount,
      }
    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          count: emails.length,
          timing
        },
        '❌ [EMAIL-SERVICE] Unexpected error in batch send'
      )
      return {
        success: false,
        results: emails.map((_, index) => ({
          index,
          error: error instanceof Error ? error.message : JSON.stringify(error) || 'Unknown error',
        })),
        sentCount: 0,
        failedCount: emails.length,
      }
    }
  }

  /**
   * Vérifie si le service email est configuré
   */
  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY
  }
}

// ══════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Crée une instance du EmailService
 */
export const createEmailService = (): EmailService => {
  return new EmailService()
}
