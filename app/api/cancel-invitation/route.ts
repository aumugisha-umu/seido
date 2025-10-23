import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { cancelInvitationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

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
    // ✅ AUTH: 40 lignes → 3 lignes! (ancien pattern getServerSession → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUserProfile, authUser: session } = authResult.data

    // Vérifier si le service est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(cancelInvitationSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CANCEL-INVITATION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { invitationId, reason } = validatedData

    logger.info({ invitationId: invitationId }, '🚫 [CANCEL-INVITATION-API] Processing cancellation for invitation:')
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
    // ÉTAPE 4: Délier l'auth du profil (SANS supprimer l'auth user)
    // ============================================================================
    // ✅ RÈGLE CRITIQUE: Ne JAMAIS supprimer l'auth user de Supabase Auth
    // Raisons:
    // 1. L'auth peut être partagé entre plusieurs équipes (multi-équipe)
    // 2. Supprimer l'auth empêche toute réutilisation future
    // 3. Pattern correct: délier (auth_user_id = NULL), pas supprimer
    // ============================================================================

    if (invitation.user_id) {
      logger.info({ userId: invitation.user_id }, '🔄 [STEP-4] Unlinking auth from user profile (auth user will be preserved)...')

      const { error: unlinkError } = await supabaseAdmin
        .from('users')
        .update({
          auth_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.user_id)

      if (unlinkError) {
        logger.warn({ error: unlinkError }, '⚠️ [STEP-4] Failed to unlink auth from profile')
        // Non bloquant - on continue quand même avec la suppression de l'invitation
      } else {
        logger.info({}, '✅ [STEP-4] Auth unlinked from user profile successfully (auth user preserved in Supabase Auth)')
      }
    } else {
      logger.info({}, 'ℹ️ [STEP-4] No user_id associated with this invitation, skipping unlink...')
    }

    // ============================================================================
    // ÉTAPE 5: Supprimer l'invitation de la base de données
    // ============================================================================
    logger.info({}, '🗑️ [STEP-5] Deleting invitation from database...')

    const { data: deletedInvitation, error: deleteError } = await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('invited_by', currentUserProfile.id)
      .select()
      .single()

    if (deleteError) {
      logger.error({ deleteError: deleteError }, '❌ [STEP-5] Failed to delete invitation:')
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'invitation: ' + deleteError.message },
        { status: 500 }
      )
    }

    if (!deletedInvitation) {
      logger.error({}, '❌ [STEP-5] No invitation deleted')
      return NextResponse.json(
        { error: 'Invitation non trouvée ou déjà supprimée' },
        { status: 404 }
      )
    }

    logger.info({
      id: deletedInvitation.id,
      email: deletedInvitation.email
    }, '✅ [STEP-5] Invitation deleted successfully:')

    // ============================================================================
    // ÉTAPE 6: Retourner le succès
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: `Invitation pour ${deletedInvitation.email} annulée et supprimée avec succès`,
      deletedInvitation: {
        email: deletedInvitation.email,
        role: deletedInvitation.role
      },
      authUnlinked: !!invitation.user_id
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [CANCEL-INVITATION-API] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
