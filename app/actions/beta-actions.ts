/**
 * Server Actions — Invite-Only Access Gate
 *
 * - Access code validation (cookie-based)
 * - Access request submission (email notification to admins)
 */

'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { setBetaAccessCookie } from '@/lib/beta-access'
import { rateLimiters } from '@/lib/rate-limit'
import { resend, EMAIL_CONFIG, isResendConfigured } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const AccessCodeSchema = z.object({
  password: z.string().min(1, 'Code requis')
})

const AccessRequestSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis (minimum 2 caractères)'),
  lastName: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  phone: z.string().optional(),
  message: z.string().max(500, 'Message trop long (maximum 500 caractères)').optional(),
})

type ActionResult = {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ---------------------------------------------------------------------------
// Recipients — reuses ADMIN_NOTIFICATION_EMAILS with fallback
// ---------------------------------------------------------------------------

const DEFAULT_ADMIN_EMAIL = 'arthur@seido-app.com'

function getAdminRecipients(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS ?? ''
  const parsed = raw.split(',').map(e => e.trim()).filter(Boolean)
  return parsed.length > 0 ? parsed : [DEFAULT_ADMIN_EMAIL]
}

// ---------------------------------------------------------------------------
// 1. Validate access code
// ---------------------------------------------------------------------------

export async function validateBetaPassword(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'

    const rateLimit = await rateLimiters.auth.limit(`access-code:${ip}`)
    if (!rateLimit.success) {
      return { success: false, error: 'Trop de tentatives. Veuillez patienter.' }
    }

    const { password } = AccessCodeSchema.parse({
      password: formData.get('password') as string
    })

    const accessCode = process.env.BETA_ACCESS_PASSWORD
    if (!accessCode) {
      logger.error('[ACCESS-GATE] BETA_ACCESS_PASSWORD not configured')
      return { success: false, error: 'Code d\'invitation non configuré. Contactez-nous.' }
    }

    if (password !== accessCode) {
      return { success: false, error: 'Code d\'invitation incorrect' }
    }

    await setBetaAccessCookie()
    logger.info('[ACCESS-GATE] Access granted via code')

    redirect('/auth/signup')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    return { success: false, error: 'Une erreur est survenue' }
  }
}

// ---------------------------------------------------------------------------
// 2. Submit access request
// ---------------------------------------------------------------------------

export async function submitBetaInterest(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'

    const rateLimit = await rateLimiters.sensitive.limit(`access-request:${ip}`)
    if (!rateLimit.success) {
      return { success: false, error: 'Trop de demandes. Veuillez patienter.' }
    }

    const data = AccessRequestSchema.parse({
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      message: formData.get('message') as string || undefined,
    })

    const fullName = `${data.firstName} ${data.lastName}`
    logger.info(`[ACCESS-GATE] Access request from: ${fullName} (${data.email})`)

    if (!isResendConfigured()) {
      logger.error('[ACCESS-GATE] Resend not configured')
      return { success: false, error: 'Service email non configuré. Contactez-nous directement.' }
    }

    const recipients = getAdminRecipients()

    // Escape all user-provided fields to prevent HTML injection in emails
    const safe = {
      firstName: escapeHtml(data.firstName),
      lastName: escapeHtml(data.lastName),
      email: escapeHtml(data.email),
      phone: data.phone ? escapeHtml(data.phone) : null,
      message: data.message ? escapeHtml(data.message) : null,
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 28px; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; opacity: 0.85; font-size: 14px; }
            .content { background: #f9fafb; padding: 28px; border-radius: 0 0 12px 12px; }
            .field { margin: 12px 0; padding: 14px 16px; background: white; border-radius: 8px; border-left: 3px solid #2563eb; }
            .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .field-value { font-size: 15px; color: #111827; }
            .field-value a { color: #2563eb; text-decoration: none; }
            .meta { margin-top: 16px; padding: 12px 16px; background: white; border-radius: 8px; border-left: 3px solid #d1d5db; }
            .meta .field-value { font-size: 12px; color: #6b7280; }
            .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
            .cta { display: inline-block; margin-top: 8px; padding: 8px 20px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nouvelle demande d'accès</h1>
              <p>Un professionnel souhaite rejoindre SEIDO</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">Nom</div>
                <div class="field-value">${safe.firstName} ${safe.lastName}</div>
              </div>
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value"><a href="mailto:${safe.email}">${safe.email}</a></div>
              </div>
              ${safe.phone ? `
              <div class="field">
                <div class="field-label">Téléphone</div>
                <div class="field-value"><a href="tel:${safe.phone}">${safe.phone}</a></div>
              </div>
              ` : ''}
              ${safe.message ? `
              <div class="field">
                <div class="field-label">Message</div>
                <div class="field-value">${safe.message}</div>
              </div>
              ` : ''}
              <div class="meta">
                <div class="field-label">Informations techniques</div>
                <div class="field-value">
                  ${new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })} — IP: ${ip}
                </div>
              </div>
            </div>
            <div class="footer">
              <p><strong>Recontacter sous 48h</strong></p>
              <a class="cta" href="mailto:${safe.email}?subject=Votre demande d'accès à SEIDO">Répondre à ${safe.firstName}</a>
            </div>
          </div>
        </body>
      </html>
    `

    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: recipients,
      subject: `[SEIDO] Demande d'accès — ${data.firstName} ${data.lastName} (${data.email})`,
      html: emailHtml,
      tags: [
        { name: 'type', value: 'access-request' },
        { name: 'email', value: data.email },
      ]
    })

    if (error) {
      logger.error({ error }, '[ACCESS-GATE] Failed to send notification')
      return { success: false, error: 'Erreur lors de l\'envoi. Veuillez réessayer.' }
    }

    logger.info(`[ACCESS-GATE] Notification sent to ${recipients.join(', ')}`)

    redirect('/auth/beta-thank-you')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    return { success: false, error: 'Une erreur est survenue' }
  }
}
