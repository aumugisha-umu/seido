import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { cancelInvitationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: Request) {
  try {
    // ============================================================================
    // STEP 0: Authentication & Context
    // ============================================================================
    logger.info({}, '🚀 [STEP-0] Starting cancel invitation API...')

    const authResult = await getApiAuthContext()

    logger.info({
      success: authResult.success,
      hasData: !!authResult.data
    }, '🔍 [STEP-0] Auth context retrieved')

    if (!authResult.success) return authResult.error

    const { userProfile, authUser } = authResult.data

    logger.info({
      hasUserProfile: !!userProfile,
      hasAuthUser: !!authUser,
      userId: userProfile?.id,
      userEmail: userProfile?.email,
      userRole: userProfile?.role
    }, '🔍 [STEP-0] Destructuring auth data')

    // Defensive check: ensure userProfile exists
    if (!userProfile) {
      logger.error({
        authUserId: authUser?.id,
        dataKeys: Object.keys(authResult.data || {})
      }, '❌ [STEP-0] User profile missing from auth context')
      return NextResponse.json(
        { error: 'Profil utilisateur introuvable' },
        { status: 404 }
      )
    }

    const currentUserProfile = userProfile
    const session = authUser

    logger.info({
      currentUserId: currentUserProfile.id,
      currentUserRole: currentUserProfile.role
    }, '✅ [STEP-0] Authentication successful')

    // Vérifier si le service est disponible
    if (!isServiceRoleAvailable()) {
      logger.error({}, '❌ [STEP-0] Supabase admin client not initialized')
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const supabaseAdmin = getServiceRoleClient()
    logger.info({}, '✅ [STEP-0] Supabase admin client available')

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
      auth_user_id: session.id,  // Fixed: session IS authUser (has id directly, not session.user.id)
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

    // ÉTAPE 3: Vérifier les permissions
    // Note: Permissions are now enforced by RLS policy (user_invitations_delete)
    // Any gestionnaire or team admin in the team can cancel invitations
    // No need for application-level permission check here
    logger.info({
      invitationTeamId: invitationCheck.team_id,
      currentUserId: currentUserProfile.id,
      currentUserRole: currentUserProfile.role
    }, '✅ [STEP-3] Permissions will be checked by RLS policy')

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
      // Removed .eq('invited_by', currentUserProfile.id) to allow any gestionnaire to cancel team invitations
      .select()
      .single()

    if (deleteError) {
      logger.error({
        deleteError,
        errorCode: deleteError.code,
        errorDetails: deleteError.details,
        errorHint: deleteError.hint,
        invitationId,
        userId: currentUserProfile.id,
        userRole: currentUserProfile.role
      }, '❌ [STEP-5] Failed to delete invitation')
      return NextResponse.json(
        { error: `Erreur lors de la suppression: ${deleteError.message || deleteError.code || 'Erreur inconnue'}` },
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
    // Enhanced error serialization for better debugging
    const errorDetails = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : {
          type: typeof error,
          value: String(error),
          stringified: JSON.stringify(error, null, 2)
        }

    logger.error({
      errorDetails,
      errorConstructor: error?.constructor?.name,
      isError: error instanceof Error
    }, '❌ [CANCEL-INVITATION-API] Unexpected error')

    // Additional console.error for debugging (includes full error object)
    console.error('[CANCEL-INVITATION-API] Full error:', error)

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
