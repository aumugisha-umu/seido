import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: Authentification requise
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const { userId } = await request.json()

    // Vérifier que l'utilisateur modifie son propre abonnement
    if (userId !== userProfile.id) {
      logger.warn({ userId, profileId: userProfile.id }, '⚠️ [PUSH-UNSUBSCRIBE] Unauthorized attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    logger.info({ userId }, '🔕 [PUSH-UNSUBSCRIBE] Removing push subscriptions')

    // Supprimer tous les abonnements de l'utilisateur
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      logger.error({ error }, '❌ [PUSH-UNSUBSCRIBE] Database error')
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      )
    }

    logger.info({ userId }, '✅ [PUSH-UNSUBSCRIBE] Subscriptions removed')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, '❌ [PUSH-UNSUBSCRIBE] Internal server error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
