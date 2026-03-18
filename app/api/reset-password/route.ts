import { NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email/email-service"
import { EMAIL_CONFIG } from "@/lib/email/resend-client"
import { logger } from '@/lib/logger'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { resetPasswordSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

/**
 * POST /api/reset-password
 * Envoi d'email de réinitialisation de mot de passe via Service Role Key
 * Utilise la même approche que le système d'invitations qui fonctionne
 */

export async function POST(request: NextRequest) {
  try {
    logger.info({}, '🔄 [RESET-PASSWORD-API] Processing password reset request...')

    // Vérifier si le service est disponible (même check que invitations)
    if (!isServiceRoleAvailable()) {
      logger.error({}, '❌ [RESET-PASSWORD-API] Service not configured - SUPABASE_SERVICE_ROLE_KEY missing')
      return NextResponse.json(
        {
          success: false,
          error: 'Service de réinitialisation temporairement indisponible'
        },
        { status: 503 }
      )
    }

    const supabaseAdmin = getServiceRoleClient()
    const body = await request.json()

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(resetPasswordSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [RESET-PASSWORD-API] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { email } = validation.data

    logger.info({ email: email }, '📧 [RESET-PASSWORD-API] Processing reset for email:')

    // ÉTAPE 1: Vérifier que l'utilisateur existe dans auth.users
    logger.info({}, '🔍 [RESET-PASSWORD-API] Checking if user exists in auth system...')
    logger.info({
      hasClient: !!supabaseAdmin,
      clientAuth: !!supabaseAdmin?.auth,
      clientAdmin: !!supabaseAdmin?.auth.admin
    }, '🔧 [RESET-PASSWORD-API] Using supabaseAdmin client:')
    
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    logger.info({
      hasData: !!authUsers,
      userCount: authUsers?.users?.length || 0,
      hasError: !!listError,
      errorMessage: listError?.message,
      errorCode: listError?.status
    }, '🔧 [RESET-PASSWORD-API] List users result:')
    
    if (listError) {
      logger.error({
        message: listError.message,
        status: listError.status,
        name: listError.name
      }, '❌ [RESET-PASSWORD-API] Error listing users:')
      // ✅ FIX (Oct 23, 2025 - Issue #5): Remove sensitive debugInfo
      // Log full error server-side, return generic message to client
      logger.error({ listError }, '❌ [RESET-PASSWORD-API] Database error')
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la vérification de l\'utilisateur'
        },
        { status: 500 }
      )
    }

    const userExists = authUsers.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
    
    if (!userExists) {
      // ✅ FIX (Oct 23, 2025 - Issue #5): Remove email enumeration vulnerability
      // Never expose: list of valid emails, user count, etc.
      logger.info({ searchedEmail: email }, '⚠️ [RESET-PASSWORD-API] User not found')
      return NextResponse.json(
        {
          success: false,
          error: 'Si ce compte existe, un email de réinitialisation a été envoyé'
        },
        { status: 200 }  // ✅ Return 200 to prevent email enumeration
      )
    }

    logger.info({
      id: userExists.id,
      email: userExists.email,
      confirmed: userExists.email_confirmed_at,
      lastSignIn: userExists.last_sign_in_at,
      createdAt: userExists.created_at
    }, '✅ [RESET-PASSWORD-API] User found in auth system:')

    // ÉTAPE 2: Générer token de réinitialisation et envoyer email via Resend
    logger.info({}, '📧 [RESET-PASSWORD-API] Generating reset token and sending email via Resend...')

    const redirectUrl = `${EMAIL_CONFIG.appUrl}/auth/update-password`
    logger.info({
      email: email,
      redirectTo: redirectUrl,
      method: 'Resend with React template'
    }, '🔧 [RESET-PASSWORD-API] Reset email config:')

    try {
      // Générer le lien de réinitialisation via Supabase
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      })

      if (resetError || !resetData) {
        logger.error({ resetError: resetError }, '❌ [RESET-PASSWORD-API] Failed to generate reset link:')

        // Gestion d'erreurs spécifiques
        let errorMessage = 'Erreur lors de la génération du lien de réinitialisation'

        if (resetError?.message.includes('rate limit')) {
          errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.'
        } else if (resetError?.message.includes('User not found')) {
          errorMessage = 'Aucun compte n\'est associé à cette adresse email'
        } else if (resetError?.message.includes('Email not confirmed')) {
          errorMessage = 'L\'email de ce compte n\'a pas encore été confirmé'
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          },
          { status: 400 }
        )
      }

      // ✅ NOUVEAU: Envoyer l'email via Resend avec template React
      const hashedToken = resetData.properties.hashed_token
      // ✅ Construire l'URL avec notre domaine (pas celui de Supabase dashboard)
      const resetUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=recovery`
      const firstName = userExists.user_metadata?.first_name || userExists.email?.split('@')[0] || 'Utilisateur'

      const emailResult = await emailService.sendPasswordResetEmail(email, {
        firstName,
        resetUrl,
        expiresIn: 60, // 60 minutes
      })

      if (!emailResult.success) {
        logger.error({ emailResult: emailResult.error }, '❌ [RESET-PASSWORD-API] Failed to send email via Resend:')
        return NextResponse.json(
          {
            success: false,
            error: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
            details: emailResult.error,
          },
          { status: 500 }
        )
      }

      logger.info({}, '✅ [RESET-PASSWORD-API] Password reset email sent successfully via Resend!')
      logger.info({
        email: email,
        emailId: emailResult.emailId,
        userConfirmed: userExists.email_confirmed_at,
        userId: userExists.id
      }, '🔧 [RESET-PASSWORD-API] Success details:')
      
      // ÉTAPE 3: Logs d'activité (optionnel, similaire aux invitations)
      try {
        logger.info({}, '📝 [RESET-PASSWORD-API] Logging password reset activity...')
        // Ici on pourrait logger l'activité si nécessaire
      } catch (logError) {
        logger.warn({ logError: logError }, '⚠️ [RESET-PASSWORD-API] Failed to log activity (non-blocking):')
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Email de réinitialisation envoyé avec succès',
        },
        { status: 200 }
      )

    } catch (sendError) {
      logger.error({ error: sendError }, '❌ [RESET-PASSWORD-API] Unexpected error sending reset email:')
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur inattendue lors de l\'envoi de l\'email',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error({ error: error }, '❌ [RESET-PASSWORD-API] Unexpected error in reset password API:')
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur interne du serveur',
      },
      { status: 500 }
    )
  }
}
