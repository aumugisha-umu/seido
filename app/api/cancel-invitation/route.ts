import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getServerSession } from '@/lib/services'
import { createServerUserService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'

// Client admin Supabase pour les opérations privilégiées
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient<Database>(
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

    logger.info({ invitationId: invitationId }, '🚫 [CANCEL-INVITATION-API] Processing cancellation for invitation:')

    // Récupérer le profil utilisateur courant
    const currentUserProfileResult = await userService.getByAuthUserId(session.user.id)
    const currentUserProfile = currentUserProfileResult.success ? currentUserProfileResult.data : null
    if (!currentUserProfile) {
      logger.error({ user: session.user.id }, '❌ [CANCEL-INVITATION-API] User profile not found for auth user:')
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    logger.info({
      id: currentUserProfile.id,
      email: currentUserProfile.email
    }, '✅ [CANCEL-INVITATION-API] Current user profile:')

    // ÉTAPE 1: Vérifier d'abord si l'invitation existe (sans conditions)
    const { data: invitationCheck, error: checkError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()
    
    if (checkError || !invitationCheck) {
      logger.error({
        invitationId,
        error: checkError
      }, '❌ [CANCEL-INVITATION-API] Invitation does not exist:')
      return NextResponse.json(
        { error: 'Invitation non trouvée dans la base de données' },
        { status: 404 }
      )
    }

    logger.info({
      id: invitationCheck.id,
      email: invitationCheck.email,
      status: invitationCheck.status,
      invited_by: invitationCheck.invited_by,
      invited_by_type: typeof invitationCheck.invited_by,
      current_user: currentUserProfile.id,
      current_user_type: typeof currentUserProfile.id,
      auth_user_id: session.user.id,
      ids_match: invitationCheck.invited_by === currentUserProfile.id
    }, '✅ [CANCEL-INVITATION-API] Found invitation:')

    // ÉTAPE 2: Vérifier le statut de l'invitation
    if (invitationCheck.status !== 'pending') {
      logger.error({
        current_status: invitationCheck.status,
        expected_status: 'pending'
      }, '❌ [CANCEL-INVITATION-API] Invitation not in pending status:')
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

      logger.error({
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
      }, '❌ [CANCEL-INVITATION-API] Permission denied - detailed comparison:')

      return NextResponse.json(
        { error: 'Permission refusée: vous ne pouvez annuler que vos propres invitations' },
        { status: 403 }
      )
    }

    // Si on arrive ici, l'invitation peut être annulée
    const invitation = invitationCheck

    logger.info({}, '✅ [CANCEL-INVITATION-API] Invitation validation passed, proceeding with deletion...')

    // ============================================================================
    // ÉTAPE 4: Récupérer auth_user_id si l'invitation a un user associé
    // ============================================================================
    let authUserIdToDelete: string | null = null

    if (invitation.user_id) {
      logger.info({ user: invitation.user_id }, '🔍 [STEP-4] Fetching auth_user_id for user:')

      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', invitation.user_id)
        .single()

      if (userError) {
        logger.warn({ user: userError }, '⚠️ [STEP-4] Failed to fetch user auth_id:')
      } else if (user?.auth_user_id) {
        authUserIdToDelete = user.auth_user_id
        logger.info({ user: authUserIdToDelete }, '✅ [STEP-4] Found auth_user_id to delete:')
      } else {
        logger.info({}, 'ℹ️ [STEP-4] No auth_user_id found for this invitation')
      }
    } else {
      logger.info({}, 'ℹ️ [STEP-4] No user_id associated with this invitation')
    }

    // ============================================================================
    // ÉTAPE 5: Supprimer l'auth user de Supabase Auth
    // ============================================================================
    if (authUserIdToDelete) {
      logger.info({ user: authUserIdToDelete }, '🗑️ [STEP-5] Deleting auth user from Supabase Auth...')

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserIdToDelete)

      if (deleteAuthError) {
        logger.warn({ user: deleteAuthError }, '⚠️ [STEP-5] Failed to delete auth user:')
        // ✅ Non bloquant - on continue quand même avec la suppression de l'invitation
      } else {
        logger.info({}, '✅ [STEP-5] Auth user deleted successfully from Supabase Auth')

        // ============================================================================
        // ÉTAPE 5b: Mettre à jour le profil utilisateur pour supprimer la référence auth
        // ============================================================================
        if (invitation.user_id) {
          logger.info({}, '🔄 [STEP-5b] Unlinking auth from user profile...')

          const { error: unlinkError } = await supabaseAdmin
            .from('users')
            .update({ auth_user_id: null })
            .eq('id', invitation.user_id)

          if (unlinkError) {
            logger.warn({ unlinkError: unlinkError }, '⚠️ [STEP-5b] Failed to unlink auth from profile:')
          } else {
            logger.info({}, '✅ [STEP-5b] Auth unlinked from user profile successfully')
          }
        }
      }
    } else {
      logger.info({}, '⏭️ [STEP-5] No auth user to delete, skipping...')
    }

    // ============================================================================
    // ÉTAPE 6: Supprimer l'invitation de la base de données
    // ============================================================================
    logger.info({}, '🗑️ [STEP-6] Deleting invitation from database...')

    const { data: deletedInvitation, error: deleteError } = await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('invited_by', currentUserProfile.id)
      .select()
      .single()

    if (deleteError) {
      logger.error({ deleteError: deleteError }, '❌ [STEP-6] Failed to delete invitation:')
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'invitation: ' + deleteError.message },
        { status: 500 }
      )
    }

    if (!deletedInvitation) {
      logger.error({}, '❌ [STEP-6] No invitation deleted')
      return NextResponse.json(
        { error: 'Invitation non trouvée ou déjà supprimée' },
        { status: 404 }
      )
    }

    logger.info({
      id: deletedInvitation.id,
      email: deletedInvitation.email
    }, '✅ [STEP-6] Invitation deleted successfully:')

    // ============================================================================
    // ÉTAPE 7: Retourner le succès
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: `Invitation pour ${deletedInvitation.email} annulée et supprimée avec succès`,
      deletedInvitation: {
        email: deletedInvitation.email,
        role: deletedInvitation.role
      },
      authDeleted: !!authUserIdToDelete
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [CANCEL-INVITATION-API] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
