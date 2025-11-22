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
   * Envoie un email en mode batch (plusieurs destinataires)
   */
  async sendBatch(emails: SendEmailParams[]): Promise<EmailResult[]> {
    logger.info({ count: emails.length }, '📧 [EMAIL-SERVICE] Sending batch emails...')

    const results = await Promise.allSettled(emails.map((email) => this.send(email)))

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        logger.error(
          { error: result.reason, email: emails[index] },
          '❌ [EMAIL-SERVICE] Batch email failed'
        )
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        }
      }
    })
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
