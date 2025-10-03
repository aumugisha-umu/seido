import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"
import { emailService } from "@/lib/email/email-service"

/**
 * POST /api/change-password
 * Permet à un utilisateur authentifié de changer son mot de passe
 * Requiert le mot de passe actuel pour validation de sécurité
 */
export async function POST(request: NextRequest) {
  try {
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

    console.log("🔒 [CHANGE-PASSWORD] Validating current password for user:", authUser.email)

    // Étape 1: Vérifier le mot de passe actuel en tentant une connexion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword
    })

    if (signInError) {
      console.log("❌ [CHANGE-PASSWORD] Current password validation failed:", signInError.message)
      return NextResponse.json({ 
        error: "Le mot de passe actuel est incorrect" 
      }, { status: 400 })
    }

    console.log("✅ [CHANGE-PASSWORD] Current password validated successfully")

    // Étape 2: Mettre à jour le mot de passe avec Supabase Auth
    console.log("🔄 [CHANGE-PASSWORD] Updating password...")
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error("❌ [CHANGE-PASSWORD] Error updating password:", updateError.message)
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour du mot de passe: " + updateError.message 
      }, { status: 500 })
    }

    console.log("✅ [CHANGE-PASSWORD] Password updated successfully")

    // ✅ NOUVEAU: Envoyer email de confirmation via Resend
    try {
      const firstName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'Utilisateur'
      const emailResult = await emailService.sendPasswordChangedEmail(authUser.email!, {
        firstName,
        changeDate: new Date(),
      })

      if (emailResult.success) {
        console.log('✅ [CHANGE-PASSWORD] Confirmation email sent via Resend:', emailResult.emailId)
      } else {
        console.warn('⚠️ [CHANGE-PASSWORD] Failed to send confirmation email:', emailResult.error)
      }
    } catch (emailError) {
      // Ne pas bloquer le changement de mot de passe si l'email échoue
      console.error('❌ [CHANGE-PASSWORD] Email sending error:', emailError)
    }

    // Retourner le succès
    return NextResponse.json({
      message: "Mot de passe modifié avec succès"
    }, { status: 200 })

  } catch (error) {
    console.error("❌ [CHANGE-PASSWORD] Unexpected error:", error)
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
