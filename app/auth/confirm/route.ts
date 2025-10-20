import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'
/**
 * 📧 ROUTE UNIFIÉE - Confirmation Email & Invitations
 *
 * Gère 3 types de confirmations:
 * 1. type=email → Confirmation inscription (signup)
 * 2. type=invite → Confirmation invitation (team invite)
 * 3. type=recovery → Réinitialisation mot de passe
 *
 * Pattern: PKCE Flow avec verifyOtp()
 * Référence: https://supabase.com/docs/guides/auth/sessions/pkce-flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'email' | 'invite' | 'recovery' | null

    logger.info('🔐 [AUTH-CONFIRM] Starting confirmation:', {
      type,
      has_token: !!token_hash,
      token_length: token_hash?.length || 0,
      full_url: request.url
    })

    // Validation paramètres
    if (!token_hash || !type) {
      logger.error('❌ [AUTH-CONFIRM] Missing parameters:', {
        token_hash: !!token_hash,
        type,
        all_params: Object.fromEntries(searchParams.entries())
      })
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_confirmation_link', request.url)
      )
    }

    // ✅ CORRECTIF (2025-10-07): Utiliser client READ-WRITE pour écrire la session
    // Le même bug que pour loginAction: verifyOtp() doit écrire les cookies de session
    const supabase = await createServerActionSupabaseClient()

    logger.info('🔧 [AUTH-CONFIRM] Calling verifyOtp...')

    // ✅ VÉRIFIER OTP avec Supabase (essai principal)
    let { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any, // Type casting car TypeScript peut être strict
    })

    // 🔁 Fallback: certains tokens générés via admin.generateLink({ type: 'signup' })
    // peuvent nécessiter verifyOtp avec type='signup'.
    if ((error || !data?.user) && type === 'email') {
      logger.warn('🔁 [AUTH-CONFIRM] Primary verifyOtp failed with type=email, retrying with type=signup...')
      const retry = await supabase.auth.verifyOtp({
        token_hash,
        type: 'signup' as any,
      })
      if (!retry.error && retry.data?.user) {
        data = retry.data
        error = null as any
        logger.info('✅ [AUTH-CONFIRM] Fallback verifyOtp(type=signup) succeeded')
      }
    }

    if (error || !data?.user) {
      logger.error('❌ [AUTH-CONFIRM] OTP verification failed:', {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        errorDetails: error,
        hasData: !!data,
        hasUser: !!data?.user,
        attemptedType: type,
      })

      // Messages d'erreur spécifiques
      const errorMessages: Record<string, string> = {
        'Token has expired or is invalid': 'expired_token',
        'Email link is invalid or has expired': 'expired_token',
        'Invalid token': 'invalid_token',
      }

      const errorCode = error?.message
        ? errorMessages[error.message] || 'confirmation_failed'
        : 'confirmation_failed'

      return NextResponse.redirect(
        new URL(`/auth/login?error=${errorCode}`, request.url)
      )
    }

    const user = data.user
    logger.info('✅ [AUTH-CONFIRM] OTP verified for:', user.email)

    // ✅ IMPORTANT: Le profil est créé automatiquement par le trigger PostgreSQL
    // (handle_new_user_confirmed se déclenche quand email_confirmed_at est mis à jour)

    // ============================================================================
    // GESTION PAR TYPE
    // ============================================================================

    if (type === 'email') {
      // 📧 CONFIRMATION SIGNUP PUBLIC
      logger.info('📧 [AUTH-CONFIRM] Email confirmation (signup) for:', user.email)

      // ✅ NOUVEAU FLOW (2025-10-10): Le trigger PostgreSQL gère la création de profil + équipe
      // Pas besoin de création manuelle - tout est fait automatiquement par handle_new_user_confirmed()

      // Déterminer le rôle pour la redirection (depuis métadonnées auth)
      const userRole = (user.raw_user_meta_data?.role ||
                       user.user_metadata?.role ||
                       'gestionnaire') as 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'

      // Envoyer email de bienvenue via Resend (non-bloquant)
      try {
        const firstName = user.raw_user_meta_data?.first_name || user.email?.split('@')[0] || 'Utilisateur'
        const dashboardUrl = `${EMAIL_CONFIG.appUrl}/${userRole}/dashboard`

        const emailResult = await emailService.sendWelcomeEmail(user.email!, {
          firstName,
          dashboardUrl,
          role: userRole,
        })

        if (emailResult.success) {
          logger.info('✅ [AUTH-CONFIRM] Welcome email sent:', emailResult.emailId)
        } else {
          logger.warn('⚠️ [AUTH-CONFIRM] Welcome email failed (non-blocking):', emailResult.error)
        }
      } catch (emailError) {
        logger.error('❌ [AUTH-CONFIRM] Welcome email error (non-blocking):', emailError)
      }

      // ✅ REDIRECTION DIRECTE VERS DASHBOARD
      // L'utilisateur est déjà connecté après verifyOtp() → pas besoin de login
      const dashboardPath = `/${userRole}/dashboard`
      logger.info(`✅ [AUTH-CONFIRM] User authenticated (profile created by trigger), redirecting to: ${dashboardPath}`)

      return NextResponse.redirect(
        new URL(dashboardPath, request.url)
      )
    }

    if (type === 'invite') {
      // 👥 CONFIRMATION INVITATION
      logger.info('👥 [AUTH-CONFIRM] Invitation confirmation for:', user.email)

      // Vérifier si mot de passe déjà défini
      const skipPassword = user.raw_user_meta_data?.skip_password === 'true'

      if (skipPassword) {
        // Rediriger vers page définition mot de passe
        return NextResponse.redirect(
          new URL('/auth/set-password', request.url)
        )
      } else {
        // Mot de passe déjà défini, rediriger vers dashboard
        const role = user.raw_user_meta_data?.role || 'gestionnaire'
        return NextResponse.redirect(
          new URL(`/${role}/dashboard?welcome=true`, request.url)
        )
      }
    }

    if (type === 'recovery') {
      // 🔑 RÉINITIALISATION MOT DE PASSE
      logger.info('🔑 [AUTH-CONFIRM] Password recovery for:', user.email)

      // Rediriger vers page mise à jour mot de passe
      return NextResponse.redirect(
        new URL('/auth/update-password', request.url)
      )
    }

    // Type non reconnu
    logger.error('❌ [AUTH-CONFIRM] Unknown type:', type)
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_confirmation_type', request.url)
    )

  } catch (error) {
    logger.error('❌ [AUTH-CONFIRM] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=confirmation_failed', request.url)
    )
  }
}
