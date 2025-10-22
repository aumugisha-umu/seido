import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/email-service'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * 📧 API ROUTE - Envoi Email de Bienvenue
 *
 * Appelé après confirmation email pour envoyer un email de bienvenue
 * avec instructions de connexion et informations sur le rôle attribué.
 *
 * Pattern: Post-confirmation non-bloquant
 */
export async function POST(request: NextRequest) {
  try {
    logger.info({}, '📧 [WELCOME-EMAIL-API] Starting welcome email send...')

    const { userId } = await request.json()

    if (!userId) {
      logger.error({}, '❌ [WELCOME-EMAIL-API] Missing userId in request')
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      )
    }

    // ✅ AUTH: createServerSupabaseClient pattern → getApiAuthContext (29 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { authUser, userProfile: profileResult } = authResult.data

    // ✅ SÉCURITÉ: Vérifier que l'utilisateur authentifié correspond au userId
    if (authUser.id !== userId) {
      logger.error({
        requestedUserId: userId,
        authenticatedUserId: authUser.id
      }, '❌ [WELCOME-EMAIL-API] User ID mismatch:')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info({ user: authUser.email }, '✅ [WELCOME-EMAIL-API] User authenticated:')

    // ✅ RÉCUPÉRER PROFIL: Déjà disponible via getApiAuthContext
    const userRole = profileResult.role
    logger.info({
      userId: profileResult.id,
      role: userRole,
      teamId: profileResult.team_id
    }, '✅ [WELCOME-EMAIL-API] User profile found:')

    // ✅ ENVOYER EMAIL: Email de bienvenue via Resend
    const firstName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'Utilisateur'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    logger.info({ user: authUser.email }, '📧 [WELCOME-EMAIL-API] Sending welcome email to:')
    const emailResult = await emailService.sendWelcomeEmail(authUser.email!, {
      firstName,
      confirmationUrl: `${appUrl}/auth/login`,
      role: userRole
    })

    if (!emailResult.success) {
      logger.error({ emailResult: emailResult.error }, '❌ [WELCOME-EMAIL-API] Failed to send email:')
      return NextResponse.json(
        { success: false, error: emailResult.error },
        { status: 500 }
      )
    }

    logger.info({ emailResult: emailResult.emailId }, '✅ [WELCOME-EMAIL-API] Welcome email sent successfully:')

    return NextResponse.json({
      success: true,
      emailId: emailResult.emailId
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [WELCOME-EMAIL-API] Unexpected error:')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
