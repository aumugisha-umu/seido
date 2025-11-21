/**
 * 🚀 SERVER ACTIONS - BETA ACCESS
 *
 * Gestion de l'accès beta à l'application SEIDO
 * - Validation du mot de passe beta
 * - Soumission de demandes d'intérêt
 */

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { setBetaAccessCookie } from '@/lib/beta-access'
import { rateLimiters } from '@/lib/rate-limit'
import { resend, EMAIL_CONFIG, isResendConfigured } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'

// ✅ VALIDATION: Schemas Zod pour sécurité server-side
const BetaPasswordSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis')
})

const BetaInterestSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  message: z.string().min(10, 'Message trop court (minimum 10 caractères)').max(500, 'Message trop long (maximum 500 caractères)')
})

// ✅ TYPES: Return types pour actions
type BetaActionResult = {
  success: boolean
  error?: string
  data?: {
    message?: string
    redirectTo?: string
    [key: string]: unknown
  }
}

/**
 * ✅ SERVER ACTION: Valider le mot de passe beta
 * Si valide, définit le cookie d'accès et redirige vers signup
 */
export async function validateBetaPassword(
  prevState: BetaActionResult,
  formData: FormData
): Promise<BetaActionResult> {
  logger.info('🚀 [BETA-PASSWORD] Validating beta access password...')

  try {
    // ✅ RATE LIMITING: Empêcher brute force (5 tentatives / 10s)
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'
    const identifier = `beta-password:${ip}`

    const rateLimit = await rateLimiters.auth.limit(identifier)
    if (!rateLimit.success) {
      logger.info(`⚠️ [BETA-PASSWORD] Rate limit exceeded for IP: ${ip}`)
      return {
        success: false,
        error: 'Trop de tentatives. Veuillez patienter avant de réessayer.'
      }
    }

    // ✅ VALIDATION: Parser et valider les données
    const rawData = {
      password: formData.get('password') as string
    }

    const validatedData = BetaPasswordSchema.parse(rawData)
    logger.info('📝 [BETA-PASSWORD] Data validated')

    // ✅ VÉRIFIER: Mot de passe beta configuré
    const betaPassword = process.env.BETA_ACCESS_PASSWORD
    if (!betaPassword) {
      logger.error('❌ [BETA-PASSWORD] BETA_ACCESS_PASSWORD not configured in environment')
      return {
        success: false,
        error: 'Accès beta non configuré. Contactez l\'administrateur.'
      }
    }

    // ✅ COMPARER: Mot de passe fourni vs environnement
    if (validatedData.password !== betaPassword) {
      logger.info('❌ [BETA-PASSWORD] Invalid password attempt')
      return {
        success: false,
        error: 'Mot de passe incorrect'
      }
    }

    // ✅ SUCCÈS: Définir le cookie d'accès
    await setBetaAccessCookie()
    logger.info('✅ [BETA-PASSWORD] Beta access granted, cookie set')

    // ✅ REVALIDATE: Forcer refresh de la page signup
    revalidatePath('/auth/signup')

    // ✅ REDIRECTION: Vers la page signup (qui affichera maintenant le formulaire)
    redirect('/auth/signup')

  } catch (error) {
    logger.error(`❌ [BETA-PASSWORD] Exception: ${error instanceof Error ? error.message : String(error)}`)

    // ✅ GESTION: Erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }

    // ✅ GESTION: redirect() throws - c'est normal, on le propage
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la validation'
    }
  }
}

/**
 * ✅ SERVER ACTION: Soumettre une demande d'intérêt beta
 * Envoie un email de notification à contact@seido.pm
 */
export async function submitBetaInterest(
  prevState: BetaActionResult,
  formData: FormData
): Promise<BetaActionResult> {
  logger.info('🚀 [BETA-INTEREST] Processing beta interest submission...')

  try {
    // ✅ RATE LIMITING: Empêcher spam (3 soumissions / 60s par IP)
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'
    const identifier = `beta-interest:${ip}`

    const rateLimit = await rateLimiters.sensitive.limit(identifier)
    if (!rateLimit.success) {
      logger.info(`⚠️ [BETA-INTEREST] Rate limit exceeded for IP: ${ip}`)
      return {
        success: false,
        error: 'Trop de demandes. Veuillez patienter avant de réessayer.'
      }
    }

    // ✅ VALIDATION: Parser et valider les données
    const rawData = {
      email: formData.get('email') as string,
      message: formData.get('message') as string
    }

    const validatedData = BetaInterestSchema.parse(rawData)
    logger.info(`📝 [BETA-INTEREST] Data validated for: ${validatedData.email}`)

    // ✅ VÉRIFIER: Service email disponible
    if (!isResendConfigured()) {
      logger.error('❌ [BETA-INTEREST] Resend not configured - RESEND_API_KEY missing')
      return {
        success: false,
        error: 'Service d\'envoi d\'email non configuré. Veuillez contacter l\'administrateur.'
      }
    }

    // ✅ ENVOYER EMAIL: Notification d'intérêt à contact@seido.pm
    logger.info('📧 [BETA-INTEREST] Sending interest notification email...')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-row { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; }
            .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📬 Nouvelle demande d'accès beta</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">SEIDO - Gestion Immobilière</p>
            </div>
            <div class="content">
              <div class="info-row">
                <div class="label">Email:</div>
                <div class="value">${validatedData.email}</div>
              </div>
              <div class="info-row">
                <div class="label">Message:</div>
                <div class="value">${validatedData.message}</div>
              </div>
              <div class="info-row">
                <div class="label">Date:</div>
                <div class="value">${new Date().toLocaleString('fr-FR', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}</div>
              </div>
              <div class="info-row">
                <div class="label">IP:</div>
                <div class="value">${ip}</div>
              </div>
            </div>
            <div class="footer">
              <p>Cet email a été généré automatiquement par SEIDO.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: 'contact@seido.pm',
      subject: `[BETA] Nouvelle demande d'accès - ${validatedData.email}`,
      html: emailHtml,
      tags: [
        { name: 'type', value: 'beta-interest' },
        { name: 'email', value: validatedData.email }
      ]
    })

    if (error) {
      logger.error(`❌ [BETA-INTEREST] Email send failed: ${error.message}`)
      return {
        success: false,
        error: 'Erreur lors de l\'envoi de votre demande. Veuillez réessayer.'
      }
    }

    logger.info(`✅ [BETA-INTEREST] Email sent successfully: ${data?.id}`)

    // ✅ REVALIDATE: Forcer refresh
    revalidatePath('/auth/signup')

    // ✅ REDIRECTION: Vers page de remerciement
    redirect('/auth/beta-thank-you')

  } catch (error) {
    logger.error(`❌ [BETA-INTEREST] Exception: ${error instanceof Error ? error.message : String(error)}`)

    // ✅ GESTION: Erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }

    // ✅ GESTION: redirect() throws - c'est normal, on le propage
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'envoi de votre demande'
    }
  }
}
