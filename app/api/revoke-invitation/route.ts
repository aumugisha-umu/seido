import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"
import { logger, logError } from '@/lib/logger'
/**
 * POST /api/revoke-invitation
 * Révoque l'accès d'un contact (annule l'invitation ou supprime l'auth)
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

    // Récupérer l'utilisateur depuis la base pour vérifier le rôle
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser || dbUser.role !== "gestionnaire") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    // Récupération des données de la requête
    const { contactEmail, contactId } = await request.json()

    if (!contactEmail || !contactId) {
      return NextResponse.json({ 
        error: "Email et ID du contact requis" 
      }, { status: 400 })
    }

    logger.info({ contactEmail, contactId }, "🚫 Revoking access for contact:")

    // Vérifier que le contact existe
    const { data: contact, error: contactError } = await supabase
      .from("users")
      .select("id, email, role, auth_user_id, team_id")
      .eq("id", contactId)
      .single()

    if (contactError || !contact) {
      logger.info({ contactError: contactError }, "❌ Contact not found:")
      return NextResponse.json({ error: "Contact non trouvé" }, { status: 404 })
    }

    // Vérifier que le contact appartient à la même équipe que le gestionnaire
    const { data: managerTeam } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", dbUser.id)
      .single()

    if (!managerTeam || contact.team_id !== managerTeam.team_id) {
      logger.info({}, "❌ Contact not in same team as manager")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    if (contact.email !== contactEmail) {
      return NextResponse.json({ error: "Email du contact incorrect" }, { status: 400 })
    }

    // Chercher l'invitation active pour cette équipe
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("id, status, invitation_code")
      .eq("email", contactEmail)
      .eq("team_id", contact.team_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (invitationError && invitationError.code !== 'PGRST116') {
      logger.error({ error: invitationError }, "❌ Error fetching invitation:")
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    }

    // Actions selon le statut d'invitation
    if (invitation) {
      // Marquer l'invitation comme annulée/révoquée
      const { error: updateError } = await supabase
        .from("user_invitations")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", invitation.id)

      if (updateError) {
        logger.error({ error: updateError }, "❌ Error updating invitation status:")
        return NextResponse.json({ 
          error: "Erreur lors de la mise à jour de l'invitation" 
        }, { status: 500 })
      }

      logger.info({}, "✅ Invitation status updated to cancelled")
    }

    // ✅ LOGIQUE CORRIGÉE : Déterminer le type d'action basée sur l'invitation
    let needsAuthDeletion = false
    let actionMessage = "Invitation annulée avec succès"
    
    // Si une invitation existe, prioriser son statut
    if (invitation) {
      if (invitation.status === "accepted") {
        logger.info({}, "🔍 Invitation accepted, revoking active access")
        needsAuthDeletion = true
        actionMessage = "Accès révoqué avec succès"
      } else if (invitation.status === "pending") {
        logger.info({}, "🔍 Invitation pending, cancelling invitation")
        needsAuthDeletion = false // Juste annuler, pas de suppression auth nécessaire
        actionMessage = "Invitation annulée avec succès"
      }
    } 
    // Si pas d'invitation mais auth_user_id existe (cas legacy)
    else if (contact.auth_user_id) {
      logger.info({}, "🔍 Legacy case: has auth account but no invitation, revoking access")
      needsAuthDeletion = true
      actionMessage = "Accès révoqué avec succès"
    }

    // Supprimer l'accès d'authentification si nécessaire
    if (needsAuthDeletion) {
      try {
        let authUserIdToDelete = contact.auth_user_id

        // Si pas d'auth_user_id direct, chercher via l'email
        if (!authUserIdToDelete) {
          const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
          
          if (!authListError && authUsers?.users) {
            const authUser = authUsers.users.find(u => u.email === contactEmail)
            if (authUser) {
              authUserIdToDelete = authUser.id
            }
          }
        }

        if (authUserIdToDelete) {
          // Supprimer l'utilisateur de Supabase Auth
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUserIdToDelete)

          if (deleteAuthError) {
            logger.warn({ user: deleteAuthError }, "⚠️ Could not delete auth user:")
          } else {
            logger.info({}, "✅ Auth user deleted successfully")
            
            // Mettre à jour le contact pour supprimer la référence auth
            await supabase
              .from("users")
              .update({ auth_user_id: null })
              .eq("id", contactId)
          }
        }

        logger.info({}, "ℹ️ Contact remains in users table but auth access removed")

      } catch (authError) {
        logger.warn({ error: authError }, "⚠️ Error during auth deletion:")
      }
    }

    return NextResponse.json({
      success: true,
      message: actionMessage
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in revoke-invitation API:")
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
