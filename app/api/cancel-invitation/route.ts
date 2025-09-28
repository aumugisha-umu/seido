import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/supabase-server'
import { createServerUserService } from '@/lib/services'

// Client admin Supabase pour les opérations privilégiées
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: Request) {
  try {
    // Initialize services
    const userService = await createServerUserService()

    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier si le service est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID d\'invitation manquant' },
        { status: 400 }
      )
    }

    console.log('🚫 [CANCEL-INVITATION-API] Processing cancellation for invitation:', invitationId)

    // Récupérer le profil utilisateur courant
    const currentUserProfileResult = await userService.getByAuthUserId(session.user.id)
    const currentUserProfile = currentUserProfileResult.success ? currentUserProfileResult.data : null
    if (!currentUserProfile) {
      console.error('❌ [CANCEL-INVITATION-API] User profile not found for auth user:', session.user.id)
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log('✅ [CANCEL-INVITATION-API] Current user profile:', {
      id: currentUserProfile.id,
      email: currentUserProfile.email
    })

    // ÉTAPE 1: Vérifier d'abord si l'invitation existe (sans conditions)
    const { data: invitationCheck, error: checkError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()
    
    if (checkError || !invitationCheck) {
      console.error('❌ [CANCEL-INVITATION-API] Invitation does not exist:', {
        invitationId,
        error: checkError
      })
      return NextResponse.json(
        { error: 'Invitation non trouvée dans la base de données' },
        { status: 404 }
      )
    }

    console.log('✅ [CANCEL-INVITATION-API] Found invitation:', {
      id: invitationCheck.id,
      email: invitationCheck.email,
      status: invitationCheck.status,
      invited_by: invitationCheck.invited_by,
      invited_by_type: typeof invitationCheck.invited_by,
      current_user: currentUserProfile.id,
      current_user_type: typeof currentUserProfile.id,
      auth_user_id: session.user.id,
      ids_match: invitationCheck.invited_by === currentUserProfile.id
    })

    // ÉTAPE 2: Vérifier le statut de l'invitation
    if (invitationCheck.status !== 'pending') {
      console.error('❌ [CANCEL-INVITATION-API] Invitation not in pending status:', {
        current_status: invitationCheck.status,
        expected_status: 'pending'
      })
      return NextResponse.json(
        { error: `Impossible d'annuler: invitation déjà ${invitationCheck.status}` },
        { status: 400 }
      )
    }

    // ÉTAPE 3: Vérifier les permissions (que l'utilisateur courant est bien l'inviteur)
    if (invitationCheck.invited_by !== currentUserProfile.id) {
      // ✅ DEBUG AVANCÉ - Récupérer les détails de l'inviteur original
      const { data: originalInviter, error: inviterError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, auth_user_id')
        .eq('id', invitationCheck.invited_by)
        .single()

      console.error('❌ [CANCEL-INVITATION-API] Permission denied - detailed comparison:', {
        invitation_invited_by: invitationCheck.invited_by,
        current_user_id: currentUserProfile.id,
        auth_user_id: session.user.id,
        current_user_details: {
          id: currentUserProfile.id,
          email: currentUserProfile.email,
          name: currentUserProfile.name,
          auth_user_id: currentUserProfile.auth_user_id
        },
        original_inviter_details: originalInviter || 'FAILED_TO_FETCH',
        inviter_error: inviterError || 'NO_ERROR'
      })

      return NextResponse.json(
        { error: 'Permission refusée: vous ne pouvez annuler que vos propres invitations' },
        { status: 403 }
      )
    }

    // Si on arrive ici, l'invitation peut être annulée
    const invitation = invitationCheck

    console.log('✅ [CANCEL-INVITATION-API] Found invitation:', {
      email: invitation.email,
      status: invitation.status,
      team_id: invitation.team_id
    })

    // ÉTAPE 2: Annuler l'invitation
    const { data, error } = await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'cancelled'
      })
      .eq('id', invitationId)
      .eq('invited_by', currentUserProfile.id)
      .eq('status', 'pending')
      .select()

    if (error) {
      console.error('❌ [CANCEL-INVITATION-API] Update error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation: ' + error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      console.error('❌ [CANCEL-INVITATION-API] No invitation updated')
      return NextResponse.json(
        { error: 'Invitation déjà annulée ou non trouvée' },
        { status: 404 }
      )
    }

    console.log(`✅ [CANCEL-INVITATION-API] Invitation cancelled:`, {
      id: data[0].id,
      email: data[0].email,
      status: data[0].status
    })

    return NextResponse.json({
      success: true,
      invitation: data[0],
      message: `Invitation pour ${data[0].email} annulée avec succès`
    })

  } catch (error) {
    console.error('❌ [CANCEL-INVITATION-API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
