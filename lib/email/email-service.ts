/**
 * 📧 Service d'envoi d'emails centralisé - SEIDO Application
 *
 * Service pour envoyer tous les emails de l'application via Resend
 * avec retry automatique et logging centralisé
 */

import fs from 'fs'
import path from 'path'
import { resend, EMAIL_CONFIG, emailLogger, isResendConfigured } from './resend-client'
import type {
  SignupConfirmationEmailProps,
  WelcomeEmailProps,
  PasswordResetEmailProps,
  PasswordChangedEmailProps,
  InvitationEmailProps,
  EmailSendResult,
  SendEmailOptions,
} from '@/emails/utils/types'
import { renderEmail } from '@/emails/utils/render'
import { logger, logError } from '@/lib/logger'

/**
 * Options de retry pour l'envoi d'emails
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 1000,
}

/**
 * Envoyer un email avec retry automatique
 */
async function sendEmailWithRetry(options: SendEmailOptions): Promise<EmailSendResult> {
  if (!isResendConfigured()) {
    emailLogger.warning('Resend not configured - skipping email send')
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    }
  }

  let lastError: unknown

  // Préparer le logo en pièce jointe (CID)
  const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo', 'Logo_Seido_White.png')
  let logoAttachment = undefined

  // Lire le logo si disponible (graceful degradation si fichier absent)
  try {
    if (fs.existsSync(logoPath)) {
      // Lire le fichier en tant que Buffer pour Resend
      // Note: Resend n'accepte pas les 'path' locaux, seulement URLs http/https ou Buffer
      const logoBuffer = fs.readFileSync(logoPath)

      logoAttachment = {
        filename: 'logo.png',
        content: logoBuffer, // Buffer au lieu de path local
        contentId: 'logo@seido', // Content-ID pour référence dans l'HTML (SDK Node.js utilise camelCase)
        contentType: 'image/png', // Type MIME pour le logo (camelCase pour SDK Node.js)
      }
    } else {
      console.warn('[EMAIL-SERVICE] Logo file not found:', logoPath)
    }
  } catch (error) {
    console.error('[EMAIL-SERVICE] Error loading logo for email:', error)
  }

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        tags: options.tags,
        // Attacher le logo avec CID (Content-ID) pour affichage inline
        attachments: logoAttachment ? [logoAttachment] : undefined,
      })

      if (error) {
        // ✅ Log détaillé de l'erreur Resend
        console.error('❌ [RESEND-ERROR] Attempt', attempt, '/', RETRY_CONFIG.maxAttempts, {
          error,
          errorMessage: error.message || String(error),
          errorName: error.name,
          to: options.to,
          subject: options.subject,
        })
        throw error
      }

      emailLogger.success(options.to, options.subject, data?.id)

      return {
        success: true,
        emailId: data?.id,
      }
    } catch (error) {
      lastError = error

      // Log détaillé avant retry
      console.warn('⚠️ [EMAIL-RETRY]', {
        attempt,
        maxAttempts: RETRY_CONFIG.maxAttempts,
        error: error instanceof Error ? error.message : JSON.stringify(error),
        to: options.to,
        willRetry: attempt < RETRY_CONFIG.maxAttempts
      })

      // Si ce n'est pas la dernière tentative, attendre avant de retry
      if (attempt < RETRY_CONFIG.maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delayMs * attempt))
      }
    }
  }

  // Toutes les tentatives ont échoué
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)
  emailLogger.error(options.to, options.subject, lastError)

  return {
    success: false,
    error: errorMessage,
  }
}

/**
 * Service d'envoi d'emails
 */
export const emailService = {
  /**
   * Envoyer email de confirmation d'inscription (signup)
   */
  async sendSignupConfirmationEmail(
    to: string,
    props: SignupConfirmationEmailProps
  ): Promise<EmailSendResult> {
    try {
      // Import dynamique pour éviter les problèmes SSR
      const { default: SignupConfirmationEmail } = await import('@/emails/templates/auth/signup-confirmation')

      console.log('📧 [EMAIL-SERVICE] Rendering signup confirmation template for:', to)
      // ✅ await le rendu car renderEmail() est async maintenant
      const { html, text } = await renderEmail(SignupConfirmationEmail(props))

      console.log('✅ [EMAIL-SERVICE] Template rendered successfully', {
        to,
        htmlLength: html.length,
        textLength: text?.length || 0
      })

      return sendEmailWithRetry({
        to,
        subject: 'Confirmez votre adresse email - SEIDO',
        html,
        text,
        tags: [
          { name: 'category', value: 'auth' },
          { name: 'type', value: 'signup-confirmation' },
        ],
      })
    } catch (error) {
      console.error('❌ [EMAIL-SERVICE] Failed to render template:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template rendering failed'
      }
    }
  },

  /**
   * Envoyer email de bienvenue (après confirmation email)
   */
  async sendWelcomeEmail(
    to: string,
    props: WelcomeEmailProps
  ): Promise<EmailSendResult> {
    // Import dynamique pour éviter les problèmes SSR
    const { default: WelcomeEmail } = await import('@/emails/templates/auth/welcome')
    const { html, text } = await renderEmail(WelcomeEmail(props))

    return sendEmailWithRetry({
      to,
      subject: 'Bienvenue sur SEIDO - Votre compte est activé',
      html,
      text,
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: 'welcome' },
      ],
    })
  },

  /**
   * Envoyer email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    to: string,
    props: PasswordResetEmailProps
  ): Promise<EmailSendResult> {
    const { default: PasswordResetEmail } = await import('@/emails/templates/auth/password-reset')
    const { html, text } = await renderEmail(PasswordResetEmail(props))

    return sendEmailWithRetry({
      to,
      subject: 'Réinitialisation de votre mot de passe SEIDO',
      html,
      text,
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: 'password-reset' },
      ],
    })
  },

  /**
   * Envoyer email de confirmation de changement de mot de passe
   */
  async sendPasswordChangedEmail(
    to: string,
    props: PasswordChangedEmailProps
  ): Promise<EmailSendResult> {
    const { default: PasswordChangedEmail } = await import('@/emails/templates/auth/password-changed')
    const { html, text } = await renderEmail(PasswordChangedEmail(props))

    return sendEmailWithRetry({
      to,
      subject: 'Votre mot de passe SEIDO a été modifié',
      html,
      text,
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: 'password-changed' },
      ],
    })
  },

  /**
   * Envoyer email d'invitation à rejoindre une équipe
   */
  async sendInvitationEmail(
    to: string,
    props: InvitationEmailProps
  ): Promise<EmailSendResult> {
    const { default: InvitationEmail } = await import('@/emails/templates/auth/invitation')
    const { html, text } = await renderEmail(InvitationEmail(props))

    return sendEmailWithRetry({
      to,
      subject: `${props.inviterName} vous invite à rejoindre son équipe sur SEIDO`,
      html,
      text,
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: 'invitation' },
        { name: 'role', value: props.role },
      ],
    })
  },
}

/**
 * Type du service email pour export
 */
export type EmailService = typeof emailService
