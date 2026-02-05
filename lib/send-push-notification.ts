import webpush from 'web-push'
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

// Configuration VAPID
const vapidSubject = process.env.VAPID_SUBJECT
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  logger.info('✅ [PUSH] VAPID keys configured')
} else {
  logger.warn('⚠️ [PUSH] VAPID keys not configured - push notifications disabled')
}

export interface PushPayload {
  title: string
  message: string
  url?: string
  notificationId?: string
  type?: string
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn({ userId }, '⚠️ [PUSH] VAPID not configured, skipping push notification')
    return { success: 0, failed: 0 }
  }

  // ✅ Service role client to bypass RLS - we need to read subscriptions for ANY user
  const supabase = createServiceRoleSupabaseClient()
  logger.info('🔑 [PUSH] Using service role client (RLS BYPASS)')

  // Récupérer les abonnements de l'utilisateur
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', userId)

  if (error) {
    logger.error({ error, userId }, '❌ [PUSH] Error fetching subscriptions')
    return { success: 0, failed: 0 }
  }

  if (!subscriptions || subscriptions.length === 0) {
    logger.info({ userId }, '📭 [PUSH] No subscriptions found for user')
    return { success: 0, failed: 0 }
  }

  // 🔍 DEBUG: Log full payload and subscription details
  logger.info({
    userId,
    count: subscriptions.length,
    title: payload.title,
    payloadKeys: Object.keys(payload),
    payloadFull: JSON.stringify(payload),
    subscriptionEndpoints: subscriptions.map(s => s.endpoint.substring(0, 60))
  }, '📤 [PUSH] Sending to devices - DEBUG payload details')

  let successCount = 0
  let failedCount = 0

  // Envoyer à tous les appareils de l'utilisateur
  const promises = subscriptions.map(async (sub) => {
    const payloadString = JSON.stringify(payload)

    // 🔍 DEBUG: Log each send attempt
    logger.info({
      userId,
      endpoint: sub.endpoint.substring(0, 60),
      endpointFull: sub.endpoint,
      keysPresent: !!sub.keys,
      keysP256dh: !!(sub.keys as any)?.p256dh,
      keysAuth: !!(sub.keys as any)?.auth,
      payloadSize: payloadString.length,
      urgency: payload.type === 'intervention' || payload.type === 'assignment' ? 'high' : 'normal'
    }, '📤 [PUSH] DEBUG - About to send notification')

    try {
      const result = await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as any
        },
        payloadString,
        {
          TTL: 86400, // 24h
          urgency: payload.type === 'intervention' || payload.type === 'assignment' ? 'high' : 'normal'
        }
      )

      // 🔍 DEBUG: Log successful response details
      logger.info({
        endpoint: sub.endpoint.substring(0, 50),
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body
      }, '✅ [PUSH] Sent successfully - DEBUG response')
      successCount++
    } catch (error: any) {
      // 🔍 DEBUG: Log full error details
      logger.error({
        error,
        errorMessage: error?.message,
        errorStatusCode: error?.statusCode,
        errorBody: error?.body,
        errorHeaders: error?.headers,
        endpoint: sub.endpoint.substring(0, 50),
        endpointFull: sub.endpoint
      }, '❌ [PUSH] Send failed - DEBUG error details')
      failedCount++

      // Si l'abonnement n'est plus valide (410 Gone), le supprimer
      if (error.statusCode === 410) {
        logger.warn({ subscriptionId: sub.id }, '🗑️ [PUSH] Removing expired subscription')
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id)
      }
    }
  })

  await Promise.allSettled(promises)

  logger.info(
    { userId, success: successCount, failed: failedCount },
    '📊 [PUSH] Send summary'
  )

  return { success: successCount, failed: failedCount }
}

/**
 * Envoie une notification push à plusieurs utilisateurs
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  logger.info({ userCount: userIds.length, title: payload.title }, '📤 [PUSH] Sending to multiple users')

  const results = await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, payload))
  )

  const summary = results.reduce(
    (acc, result) => ({
      success: acc.success + result.success,
      failed: acc.failed + result.failed
    }),
    { success: 0, failed: 0 }
  )

  logger.info(summary, '📊 [PUSH] Multi-user send summary')

  return summary
}
