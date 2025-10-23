import { NextRequest, NextResponse } from "next/server"
import { createServerUserService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { changeEmailSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

/**
 * POST /api/change-email
 * Permet à un utilisateur authentifié de changer son email
 * Requiert le mot de passe actuel pour validation de sécurité
 * Met à jour l'email dans Supabase Auth ET dans la table users
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: 42 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, authUser } = authResult.data

    // Initialize services
    const userService = await createServerUserService()

    // Récupérer les données du body
    const body = await request.json()

    // ✅ ZOD VALIDATION: Type-safe input validation avec sécurité renforcée
    const validation = validateRequest(changeEmailSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CHANGE-EMAIL] Validation failed')
      return NextResponse.json({
        error: "Données invalides",
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { password: currentPassword, newEmail } = validation.data

    // Vérifier que le nouvel email est différent de l'actuel
    if (authUser.email === newEmail) {
      return NextResponse.json({
        error: "Le nouvel email doit être différent de l'email actuel"
      }, { status: 400 })
    }

    logger.info({ user: authUser.email }, "📧 [CHANGE-EMAIL] Validating current password for user:")

    // Étape 1: Vérifier le mot de passe actuel en tentant une connexion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword
    })

    if (signInError) {
      logger.info({ signInError: signInError.message }, "❌ [CHANGE-EMAIL] Current password validation failed:")
      return NextResponse.json({ 
        error: "Le mot de passe actuel est incorrect" 
      }, { status: 400 })
    }

    logger.info({}, "✅ [CHANGE-EMAIL] Current password validated successfully")

    // Étape 2: Vérifier que le nouvel email n'est pas déjà utilisé
    logger.info({}, "🔍 [CHANGE-EMAIL] Checking if new email already exists...")
    const existingUserResult = await userService.getByEmail(newEmail)
    const existingUser = existingUserResult.success ? existingUserResult.data : null

    if (existingUser) {
      logger.info({}, "❌ [CHANGE-EMAIL] Email already in use by another user")
      return NextResponse.json({ 
        error: "Cet email est déjà utilisé par un autre compte" 
      }, { status: 400 })
    }

    logger.info({}, "✅ [CHANGE-EMAIL] New email is available")

    // Étape 3: Récupérer l'utilisateur dans notre base de données
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser) {
      logger.error({ user: userError }, "❌ [CHANGE-EMAIL] User not found in database:")
      return NextResponse.json({ 
        error: "Utilisateur non trouvé dans la base de données" 
      }, { status: 404 })
    }

    // Étape 4: Mettre à jour l'email avec Supabase Auth
    logger.info({}, "🔄 [CHANGE-EMAIL] Updating email in Supabase Auth...")
    const { error: updateAuthError } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (updateAuthError) {
      logger.error({ error: updateAuthError.message }, "❌ [CHANGE-EMAIL] Error updating email in Supabase Auth:")
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour de l'email: " + updateAuthError.message 
      }, { status: 500 })
    }

    logger.info({}, "✅ [CHANGE-EMAIL] Email updated in Supabase Auth")

    // Étape 5: Mettre à jour l'email dans notre table users
    logger.info({}, "🔄 [CHANGE-EMAIL] Updating email in users table...")
    const updateResult = await userService.update(dbUser.id, {
      email: newEmail
    })

    if (!updateResult.success) {
      logger.error({ error: updateResult.error }, "❌ [CHANGE-EMAIL] Error updating email in users table:")

      // Si la mise à jour de la DB échoue, essayer de rétablir l'ancien email dans Supabase Auth
      try {
        await supabase.auth.updateUser({
          email: authUser.email!
        })
        logger.info({}, "🔄 [CHANGE-EMAIL] Rolled back email in Supabase Auth")
      } catch (rollbackError) {
        logger.error({ rollbackError: rollbackError }, "❌ [CHANGE-EMAIL] Failed to rollback email in Supabase Auth:")
      }

      return NextResponse.json({
        error: "Erreur lors de la mise à jour de l'email dans la base de données"
      }, { status: 500 })
    }

    logger.info({}, "✅ [CHANGE-EMAIL] Email updated in users table")

    logger.info({}, "✅ [CHANGE-EMAIL] Email change completed successfully")

    // Retourner le succès
    return NextResponse.json({ 
      message: "Email modifié avec succès. Un email de confirmation a été envoyé à votre nouvelle adresse.",
      newEmail: newEmail
    }, { status: 200 })

  } catch (error) {
    logger.error({ error: error }, "❌ [CHANGE-EMAIL] Unexpected error:")
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
