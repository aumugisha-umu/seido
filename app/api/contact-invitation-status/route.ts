import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"

/**
 * GET /api/contact-invitation-status
 * Récupère le statut d'invitation d'un contact spécifique
 */
export async function GET(request: NextRequest) {
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

    // Récupérer l'utilisateur depuis la base pour vérifier le rôle
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser || dbUser.role !== "gestionnaire") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    // Récupération du paramètre contactId
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get("contactId")

    if (!contactId) {
      return NextResponse.json({ error: "ID du contact requis" }, { status: 400 })
    }

    console.log("🔍 Checking invitation status for contact:", contactId)

    // D'abord, vérifier que le contact existe et appartient au gestionnaire
    const { data: contact, error: contactError } = await supabase
      .from("users")
      .select("id, email, role, auth_user_id, team_id")
      .eq("id", contactId)
      .single()

    if (contactError || !contact) {
      console.log("❌ Contact not found:", contactError)
      return NextResponse.json({ error: "Contact non trouvé" }, { status: 404 })
    }

    // Vérifier que le contact appartient à la même équipe que le gestionnaire
    const { data: managerTeam } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", dbUser.id)
      .single()

    if (!managerTeam || contact.team_id !== managerTeam.team_id) {
      console.log("❌ Contact not in same team as manager")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    console.log("🔍 Contact details:", {
      email: contact.email,
      hasAuthUserId: !!contact.auth_user_id,
      authUserId: contact.auth_user_id
    })

    // ✅ LOGIQUE CORRIGÉE : Vérifier d'ABORD les invitations (priorité sur auth_user_id)
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("id, status, created_at, expires_at, invitation_code")
      .eq("email", contact.email)
      .eq("team_id", contact.team_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (invitationError && invitationError.code !== 'PGRST116') {
      console.error("❌ Error fetching invitation:", invitationError)
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    }

    // Si une invitation existe, vérifier son statut
    if (invitation) {
      let status = invitation.status
      
      // Vérifier si l'invitation a expiré
      if (status === "pending" && invitation.expires_at) {
        const now = new Date()
        const expiresAt = new Date(invitation.expires_at)
        if (now > expiresAt) {
          status = "expired"
          
          // Mettre à jour le statut dans la base de données
          await supabase
            .from("user_invitations")
            .update({ status: "expired" })
            .eq("id", invitation.id)
        }
      }

      console.log("✅ Invitation found with status:", status)

    return NextResponse.json({
      status,
      invitationId: invitation.id, // ✅ Ajouté pour l'API resend-invitation
      invitation: {
        id: invitation.id,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        invitation_code: invitation.invitation_code
      }
    })
    }

    // ✅ LOGIQUE SIMPLIFIÉE : Si pas d'invitation trouvée, toujours "pas de compte"
    // Seules les invitations avec status="accepted" indiquent un compte réellement actif
    console.log("ℹ️ No invitation found for contact, treating as no account:", contact.email)
    return NextResponse.json({ status: null }, { status: 200 })

  } catch (error) {
    console.error("❌ Error in contact-invitation-status API:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
