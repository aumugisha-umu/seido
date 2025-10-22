import { NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email/email-service"
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * POST /api/change-password
 * Permet à un utilisateur authentifié de changer son mot de passe
 * Requiert le mot de passe actuel pour validation de sécurité
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: 29 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, authUser } = authResult.data

    // Récupérer les données du body
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validation des champs requis
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: "Le mot de passe actuel et le nouveau mot de passe sont requis" 
      }, { status: 400 })
    }

    // Validation de la complexité du nouveau mot de passe
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères" 
      }, { status: 400 })
    }

    // Vérifier que le nouveau mot de passe est différent de l'actuel
    if (currentPassword === newPassword) {
      return NextResponse.json({ 
        error: "Le nouveau mot de passe doit être différent du mot de passe actuel" 
      }, { status: 400 })
    }

    logger.info({ user: authUser.email }, "🔒 [CHANGE-PASSWORD] Validating current password for user:")

    // Étape 1: Vérifier le mot de passe actuel en tentant une connexion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword
    })

    if (signInError) {
      logger.info({ signInError: signInError.message }, "❌ [CHANGE-PASSWORD] Current password validation failed:")
      return NextResponse.json({ 
        error: "Le mot de passe actuel est incorrect" 
      }, { status: 400 })
    }

    logger.info({}, "✅ [CHANGE-PASSWORD] Current password validated successfully")

    // Étape 2: Mettre à jour le mot de passe avec Supabase Auth
    logger.info({}, "🔄 [CHANGE-PASSWORD] Updating password...")
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      logger.error({ error: updateError.message }, "❌ [CHANGE-PASSWORD] Error updating password:")
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour du mot de passe: " + updateError.message 
      }, { status: 500 })
    }

    logger.info({}, "✅ [CHANGE-PASSWORD] Password updated successfully")

    // ✅ NOUVEAU: Envoyer email de confirmation via Resend
    try {
      const firstName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'Utilisateur'
      const emailResult = await emailService.sendPasswordChangedEmail(authUser.email!, {
        firstName,
        changeDate: new Date(),
      })

      if (emailResult.success) {
        logger.info({ emailResult: emailResult.emailId }, '✅ [CHANGE-PASSWORD] Confirmation email sent via Resend:')
      } else {
        logger.warn({ emailResult: emailResult.error }, '⚠️ [CHANGE-PASSWORD] Failed to send confirmation email:')
      }
    } catch (emailError) {
      // Ne pas bloquer le changement de mot de passe si l'email échoue
      logger.error({ error: emailError }, '❌ [CHANGE-PASSWORD] Email sending error:')
    }

    // Retourner le succès
    return NextResponse.json({
      message: "Mot de passe modifié avec succès"
    }, { status: 200 })

  } catch (error) {
    logger.error({ error: error }, "❌ [CHANGE-PASSWORD] Unexpected error:")
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
