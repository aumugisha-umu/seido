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
import { isResendConfigured } from '@/lib/email/resend-client'
import { emailService } from '@/lib/email/email-service'
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
  phone: z.string().min(1, 'Téléphone requis'),
  message: z.string().min(1, 'Description de votre activité requise').max(500, 'Message trop long (maximum 500 caractères)'),
})

type ActionResult = {
  success: boolean
  error?: string
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
      phone: formData.get('phone') as string,
      message: formData.get('message') as string,
    })

    const fullName = `${data.firstName} ${data.lastName}`
    logger.info(`[ACCESS-GATE] Access request from: ${fullName} (${data.email})`)

    if (!isResendConfigured()) {
      logger.error('[ACCESS-GATE] Resend not configured')
      return { success: false, error: 'Service email non configuré. Contactez-nous directement.' }
    }

    const recipients = getAdminRecipients()

    const result = await emailService.sendBetaAccessRequestEmail(
      recipients,
      {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        message: data.message,
        ip,
        requestedAt: new Date(),
      }
    )

    if (!result.success) {
      logger.error({ error: result.error }, '[ACCESS-GATE] Failed to send notification')
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
