import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { emailService } from '@/lib/email/email-service'
import { createServerUserService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
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
    logger.info('📧 [WELCOME-EMAIL-API] Starting welcome email send...')

    const { userId } = await request.json()

    if (!userId) {
      logger.error('❌ [WELCOME-EMAIL-API] Missing userId in request')
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      )
    }

    // ✅ SÉCURITÉ: Vérifier que l'utilisateur authentifié correspond au userId
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('❌ [WELCOME-EMAIL-API] No authenticated user:', userError?.message)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.id !== userId) {
      logger.error('❌ [WELCOME-EMAIL-API] User ID mismatch:', {
        requestedUserId: userId,
        authenticatedUserId: user.id
      })
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('✅ [WELCOME-EMAIL-API] User authenticated:', user.email)

    // ✅ RÉCUPÉRER PROFIL: Pour obtenir le rôle réel
    const userService = await createServerUserService()
    const profileResult = await userService.getByAuthUserId(userId)

    let userRole: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire' = 'gestionnaire'
    if (profileResult.success && profileResult.data) {
      userRole = profileResult.data.role
      logger.info('✅ [WELCOME-EMAIL-API] User profile found:', {
        userId: profileResult.data.id,
        role: userRole,
        teamId: profileResult.data.team_id
      })
    } else {
      logger.warn('⚠️ [WELCOME-EMAIL-API] Profile not found, using default role:', userRole)
    }

    // ✅ ENVOYER EMAIL: Email de bienvenue via Resend
    const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Utilisateur'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    logger.info('📧 [WELCOME-EMAIL-API] Sending welcome email to:', user.email)
    const emailResult = await emailService.sendWelcomeEmail(user.email!, {
      firstName,
      confirmationUrl: `${appUrl}/auth/login`,
      role: userRole
    })

    if (!emailResult.success) {
      logger.error('❌ [WELCOME-EMAIL-API] Failed to send email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: emailResult.error },
        { status: 500 }
      )
    }

    logger.info('✅ [WELCOME-EMAIL-API] Welcome email sent successfully:', emailResult.emailId)

    return NextResponse.json({
      success: true,
      emailId: emailResult.emailId
    })

  } catch (error) {
    logger.error('❌ [WELCOME-EMAIL-API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
