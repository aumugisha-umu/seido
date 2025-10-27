import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: Authentification requise
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const { userId, subscription } = await request.json()

    // Vérifier que l'utilisateur modifie son propre abonnement
    if (userId !== userProfile.id) {
      logger.warn({ userId, profileId: userProfile.id }, '⚠️ [PUSH-SUBSCRIBE] Unauthorized attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Valider les données de l'abonnement
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      logger.warn({ subscription }, '⚠️ [PUSH-SUBSCRIBE] Invalid subscription data')
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    logger.info({ userId, endpoint: subscription.endpoint }, '🔔 [PUSH-SUBSCRIBE] Creating push subscription')

    // Upsert l'abonnement (créer ou mettre à jour)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: request.headers.get('user-agent')
      }, {
        onConflict: 'endpoint',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      logger.error({ error }, '❌ [PUSH-SUBSCRIBE] Database error')
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    logger.info({ userId, subscriptionId: data.id }, '✅ [PUSH-SUBSCRIBE] Subscription saved')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error({ error }, '❌ [PUSH-SUBSCRIBE] Internal server error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
