/**
 * 📧 Resend Email Client - SEIDO Application
 *
 * Client singleton pour l'envoi d'emails via Resend
 * Documentation: https://resend.com/docs/send-with-nextjs
 */

import { Resend } from 'resend'
import { logger } from '@/lib/logger'

if (!process.env.RESEND_API_KEY) {
  logger.warn('RESEND_API_KEY not configured - email sending will be disabled')
}

/**
 * Client Resend configuré avec API key
 * @singleton
 */
export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Configuration email par défaut
 */
export const EMAIL_CONFIG = {
  /**
   * Adresse d'envoi par défaut
   * ⚠️ IMPORTANT: Doit être un domaine vérifié dans Resend
   * En développement, utiliser onboarding@resend.dev
   */
  from: process.env.RESEND_FROM_EMAIL || 'SEIDO <notifications@seido-app.com>',

  /**
   * Email de support pour les utilisateurs
   */
  supportEmail: process.env.SUPPORT_EMAIL || 'support@seido-app.com',

  /**
   * URL de base de l'application
   * ⚠️ IMPORTANT: Doit être définie dans les variables d'environnement (Vercel, etc.)
   */
  appUrl: (() => {
    const url = process.env.NEXT_PUBLIC_SITE_URL
    if (!url && process.env.NODE_ENV === 'production') {
      logger.error('[EMAIL-CONFIG] NEXT_PUBLIC_SITE_URL not set in production!')
    }
    return url || 'http://localhost:3000'
  })(),

  /**
   * Email de contact général
   */
  contactEmail: process.env.CONTACT_EMAIL || 'contact@seido-app.com',

  /**
   * Nom de l'application
   */
  appName: 'SEIDO',
} as const

/**
 * Vérifier si Resend est configuré
 */
export const isResendConfigured = (): boolean => {
  return !!process.env.RESEND_API_KEY
}

/**
 * Logger pour les envois d'emails
 */
export const emailLogger = {
  success: (to: string | string[], subject: string, emailId?: string) => {
    logger.info({
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      emailId,
    }, '[EMAIL-SENT] Email sent successfully')
  },

  error: (to: string | string[], subject: string, error: unknown) => {
    logger.error({
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    }, '[EMAIL-FAILED] Email send failed')
  },

  warning: (message: string) => {
    logger.warn('[EMAIL-WARNING] ' + message)
  },
}
