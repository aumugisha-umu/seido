import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: Authentification requise
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const { userId, subscription } = await request.json()

    // Vérifier que l'utilisateur modifie son propre abonnement
    if (userId !== userProfile!.id) {
      logger.warn({ userId, profileId: userProfile!.id }, '⚠️ [PUSH-SUBSCRIBE] Unauthorized attempt')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Valider les données de l'abonnement
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      logger.warn({ subscription }, '⚠️ [PUSH-SUBSCRIBE] Invalid subscription data')
      return NextResponse.json(
        { error: 'Données d\'abonnement invalides' },
        { status: 400 }
      )
    }

    logger.info({ userProfileId: userProfile!.id, endpoint: subscription.endpoint }, '🔔 [PUSH-SUBSCRIBE] Creating push subscription')

    // ✅ FIX: Delete-then-insert instead of upsert
    // Upsert with onConflict:'endpoint' fails when the existing endpoint belongs to
    // a different user (RLS blocks the UPDATE on another user's row).
    // This happens when users share a device or re-register after account changes.
    const serviceClient = createServiceRoleSupabaseClient()
    await serviceClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)

    // Insert new subscription (authenticated client for RLS validation)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userProfile!.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single()

    if (error) {
      logger.error({ error, userProfileId: userProfile!.id, code: error.code, details: error.details }, '❌ [PUSH-SUBSCRIBE] Database error')
      return NextResponse.json(
        { error: 'Impossible d\'enregistrer l\'abonnement. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    // ✅ Check for null data - RLS may silently block inserts without throwing an error
    if (!data) {
      logger.error({ userProfileId: userProfile!.id }, '❌ [PUSH-SUBSCRIBE] Insert blocked (RLS or constraint)')
      return NextResponse.json(
        { error: 'Abonnement non créé — permission refusée' },
        { status: 500 }
      )
    }

    logger.info({ userProfileId: userProfile!.id, subscriptionId: data.id }, '✅ [PUSH-SUBSCRIBE] Subscription saved')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error({ error }, '❌ [PUSH-SUBSCRIBE] Internal server error')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
