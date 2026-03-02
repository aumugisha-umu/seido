/**
 * 🚀 SERVER ACTIONS - BETA ACCESS
 *
 * Gestion de l'accès beta à l'application SEIDO
 * - Validation du mot de passe beta
 * - Soumission de demandes d'intérêt
 */

'use server'

import { redirect } from 'next/navigation'
// Pages are force-dynamic — no cache invalidation needed
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
  firstName: z.string().min(2, 'Prénom requis (minimum 2 caractères)'),
  lastName: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  phone: z.string().optional(),
  company: z.string().min(2, 'Société requise (minimum 2 caractères)'),
  lotsCount: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'], { errorMap: () => ({ message: 'Veuillez sélectionner le nombre de lots' }) }),
  message: z.string().max(500, 'Message trop long (maximum 500 caractères)').optional()
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
 * Envoie un email de notification à contact@seido-app.com
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
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      company: formData.get('company') as string,
      lotsCount: formData.get('lotsCount') as string,
      message: formData.get('message') as string || undefined
    }

    const validatedData = BetaInterestSchema.parse(rawData)
    logger.info(`📝 [FONDATEURS-2026] Candidature validée: ${validatedData.firstName} ${validatedData.lastName} (${validatedData.company})`)

    // ✅ VÉRIFIER: Service email disponible
    if (!isResendConfigured()) {
      logger.error('❌ [BETA-INTEREST] Resend not configured - RESEND_API_KEY missing')
      return {
        success: false,
        error: 'Service d\'envoi d\'email non configuré. Veuillez contacter l\'administrateur.'
      }
    }

    // ✅ ENVOYER EMAIL: Notification de candidature Programme Fondateurs
    logger.info('📧 [FONDATEURS-2026] Envoi notification candidature...')

    const lotsLabel = {
      '1-10': '1 à 10 lots',
      '11-50': '11 à 50 lots',
      '51-200': '51 à 200 lots',
      '200+': 'Plus de 200 lots'
    }[validatedData.lotsCount] || validatedData.lotsCount

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 10px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-row { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; }
            .value { color: #333; font-size: 16px; }
            .highlight { background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border: 1px solid #667eea30; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚀 Nouvelle candidature Fondateurs 2026</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Programme Beta Privée SEIDO</p>
              <span class="badge">${lotsLabel}</span>
            </div>
            <div class="content">
              <div class="info-row highlight">
                <div class="label">Candidat</div>
                <div class="value">${validatedData.firstName} ${validatedData.lastName}</div>
              </div>
              <div class="info-row">
                <div class="label">Société</div>
                <div class="value">${validatedData.company}</div>
              </div>
              <div class="info-row">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${validatedData.email}" style="color: #667eea;">${validatedData.email}</a></div>
              </div>
              ${validatedData.phone ? `
              <div class="info-row">
                <div class="label">Téléphone</div>
                <div class="value"><a href="tel:${validatedData.phone}" style="color: #667eea;">${validatedData.phone}</a></div>
              </div>
              ` : ''}
              <div class="info-row">
                <div class="label">Patrimoine géré</div>
                <div class="value">${lotsLabel}</div>
              </div>
              ${validatedData.message ? `
              <div class="info-row">
                <div class="label">Message</div>
                <div class="value">${validatedData.message}</div>
              </div>
              ` : ''}
              <div class="info-row" style="border-left-color: #ccc;">
                <div class="label">Infos techniques</div>
                <div class="value" style="font-size: 12px; color: #666;">
                  Date: ${new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}<br>
                  IP: ${ip}
                </div>
              </div>
            </div>
            <div class="footer">
              <p><strong>Action requise:</strong> Recontacter sous 48h comme promis !</p>
              <p style="margin-top: 10px;">Programme Fondateurs 2026 - SEIDO</p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: 'contact@seido.pm',
      subject: `[FONDATEURS 2026] ${validatedData.firstName} ${validatedData.lastName} - ${validatedData.company} (${lotsLabel})`,
      html: emailHtml,
      tags: [
        { name: 'type', value: 'fondateurs-2026' },
        { name: 'company', value: validatedData.company },
        { name: 'lots', value: validatedData.lotsCount }
      ]
    })

    if (error) {
      logger.error(`❌ [FONDATEURS-2026] Échec envoi email: ${error.message}`)
      return {
        success: false,
        error: 'Erreur lors de l\'envoi de votre candidature. Veuillez réessayer.'
      }
    }

    logger.info(`✅ [FONDATEURS-2026] Candidature enregistrée: ${validatedData.company} - ${data?.id}`)

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
