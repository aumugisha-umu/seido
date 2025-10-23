import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/contact-invitation-status
 * Récupère le statut d'invitation d'un contact spécifique
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK: 38 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: dbUser } = authResult.data

    // Récupération du paramètre contactId
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get("contactId")

    if (!contactId) {
      return NextResponse.json({ error: "ID du contact requis" }, { status: 400 })
    }

    logger.info({ contactId: contactId }, "🔍 Checking invitation status for contact:")

    // D'abord, vérifier que le contact existe et appartient au gestionnaire
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

    logger.info({
      email: contact.email,
      hasAuthUserId: !!contact.auth_user_id,
      authUserId: contact.auth_user_id
    }, "🔍 Contact details:")

    // ✅ LOGIQUE CORRIGÉE : Vérifier d'ABORD les invitations (priorité sur auth_user_id)
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("id, status, created_at, expires_at, invitation_token")
      .eq("email", contact.email)
      .eq("team_id", contact.team_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (invitationError && invitationError.code !== 'PGRST116') {
      logger.error({ error: invitationError }, "❌ Error fetching invitation:")
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

      logger.info({ status: status }, "✅ Invitation found with status:")

    return NextResponse.json({
      status,
      invitationId: invitation.id, // ✅ Ajouté pour l'API resend-invitation
      invitation: {
        id: invitation.id,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        invitation_token: invitation.invitation_token
      }
    })
    }

    // ✅ LOGIQUE SIMPLIFIÉE : Si pas d'invitation trouvée, toujours "pas de compte"
    // Seules les invitations avec status="accepted" indiquent un compte réellement actif
    logger.info({ contact: contact.email }, "ℹ️ No invitation found for contact, treating as no account:")
    return NextResponse.json({ status: null }, { status: 200 })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in contact-invitation-status API:")
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
