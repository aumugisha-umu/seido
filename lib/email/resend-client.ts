/**
 * 📧 Resend Email Client - SEIDO Application
 *
 * Client singleton pour l'envoi d'emails via Resend
 * Documentation: https://resend.com/docs/send-with-nextjs
 */

import { Resend } from 'resend'
import { logger, logError } from '@/lib/logger'

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not configured - email sending will be disabled')
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
  from: process.env.RESEND_FROM_EMAIL || 'SEIDO <onboarding@resend.dev>',

  /**
   * Email de support pour les utilisateurs
   */
  supportEmail: process.env.SUPPORT_EMAIL || 'support@seido.app',

  /**
   * URL de base de l'application
   * ⚠️ IMPORTANT: Doit être définie dans les variables d'environnement (Vercel, etc.)
   */
  appUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',

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
    console.log('✅ [EMAIL-SENT]', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      emailId,
      timestamp: new Date().toISOString(),
    })
  },

  error: (to: string | string[], subject: string, error: unknown) => {
    console.error('❌ [EMAIL-FAILED]', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  },

  warning: (message: string) => {
    console.warn('⚠️ [EMAIL-WARNING]', message)
  },
}
