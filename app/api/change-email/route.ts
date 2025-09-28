import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"
import { createServerUserService } from '@/lib/services'

/**
 * POST /api/change-email
 * Permet à un utilisateur authentifié de changer son email
 * Requiert le mot de passe actuel pour validation de sécurité
 * Met à jour l'email dans Supabase Auth ET dans la table users
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize services
    const userService = await createServerUserService()

    // Initialiser le client Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorer les erreurs de cookies dans les API routes
            }
          },
        },
      }
    )

    // Vérification de l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Récupérer les données du body
    const body = await request.json()
    const { currentPassword, newEmail } = body

    // Validation des champs requis
    if (!currentPassword || !newEmail) {
      return NextResponse.json({ 
        error: "Le mot de passe actuel et le nouvel email sont requis" 
      }, { status: 400 })
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ 
        error: "Le format de l'email n'est pas valide" 
      }, { status: 400 })
    }

    // Vérifier que le nouvel email est différent de l'actuel
    if (authUser.email === newEmail) {
      return NextResponse.json({ 
        error: "Le nouvel email doit être différent de l'email actuel" 
      }, { status: 400 })
    }

    console.log("📧 [CHANGE-EMAIL] Validating current password for user:", authUser.email)

    // Étape 1: Vérifier le mot de passe actuel en tentant une connexion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword
    })

    if (signInError) {
      console.log("❌ [CHANGE-EMAIL] Current password validation failed:", signInError.message)
      return NextResponse.json({ 
        error: "Le mot de passe actuel est incorrect" 
      }, { status: 400 })
    }

    console.log("✅ [CHANGE-EMAIL] Current password validated successfully")

    // Étape 2: Vérifier que le nouvel email n'est pas déjà utilisé
    console.log("🔍 [CHANGE-EMAIL] Checking if new email already exists...")
    const existingUserResult = await userService.getByEmail(newEmail)
    const existingUser = existingUserResult.success ? existingUserResult.data : null

    if (existingUser) {
      console.log("❌ [CHANGE-EMAIL] Email already in use by another user")
      return NextResponse.json({ 
        error: "Cet email est déjà utilisé par un autre compte" 
      }, { status: 400 })
    }

    console.log("✅ [CHANGE-EMAIL] New email is available")

    // Étape 3: Récupérer l'utilisateur dans notre base de données
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ [CHANGE-EMAIL] User not found in database:", userError)
      return NextResponse.json({ 
        error: "Utilisateur non trouvé dans la base de données" 
      }, { status: 404 })
    }

    // Étape 4: Mettre à jour l'email avec Supabase Auth
    console.log("🔄 [CHANGE-EMAIL] Updating email in Supabase Auth...")
    const { error: updateAuthError } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (updateAuthError) {
      console.error("❌ [CHANGE-EMAIL] Error updating email in Supabase Auth:", updateAuthError.message)
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour de l'email: " + updateAuthError.message 
      }, { status: 500 })
    }

    console.log("✅ [CHANGE-EMAIL] Email updated in Supabase Auth")

    // Étape 5: Mettre à jour l'email dans notre table users
    console.log("🔄 [CHANGE-EMAIL] Updating email in users table...")
    const updateResult = await userService.update(dbUser.id, {
      email: newEmail
    })

    if (!updateResult.success) {
      console.error("❌ [CHANGE-EMAIL] Error updating email in users table:", updateResult.error)

      // Si la mise à jour de la DB échoue, essayer de rétablir l'ancien email dans Supabase Auth
      try {
        await supabase.auth.updateUser({
          email: authUser.email!
        })
        console.log("🔄 [CHANGE-EMAIL] Rolled back email in Supabase Auth")
      } catch (rollbackError) {
        console.error("❌ [CHANGE-EMAIL] Failed to rollback email in Supabase Auth:", rollbackError)
      }

      return NextResponse.json({
        error: "Erreur lors de la mise à jour de l'email dans la base de données"
      }, { status: 500 })
    }

    console.log("✅ [CHANGE-EMAIL] Email updated in users table")

    console.log("✅ [CHANGE-EMAIL] Email change completed successfully")

    // Retourner le succès
    return NextResponse.json({ 
      message: "Email modifié avec succès. Un email de confirmation a été envoyé à votre nouvelle adresse.",
      newEmail: newEmail
    }, { status: 200 })

  } catch (error) {
    console.error("❌ [CHANGE-EMAIL] Unexpected error:", error)
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
