'use server'

/**
 * Notification Helper Functions (shared across notification action files)
 *
 * Internal helpers for push notification delivery and URL routing.
 * Not exported from the index — used only by sibling notification action files.
 */

import { logger } from '@/lib/logger'
import { sendPushNotificationToUsers } from '@/lib/send-push-notification'

/**
 * Extract personal user IDs from notifications and send push notifications
 * Only sends to users who have is_personal=true (directly assigned/concerned)
 */
export async function sendPushToNotificationRecipients(
  notifications: Array<{ user_id: string; is_personal: boolean }>,
  payload: { title: string; message: string; url?: string; type?: string }
) {
  const personalUserIds = Array.from(new Set(
    notifications
      .filter(n => n.is_personal)
      .map(n => n.user_id)
  ))

  if (personalUserIds.length === 0) {
    logger.debug({ notificationCount: notifications.length }, '[PUSH] No personal recipients for push')
    return { success: 0, failed: 0 }
  }

  try {
    const result = await sendPushNotificationToUsers(personalUserIds, payload)
    logger.info({
      userCount: personalUserIds.length,
      success: result.success,
      failed: result.failed,
      title: payload.title
    }, '[PUSH] Push notifications sent from Server Action')
    return result
  } catch (error) {
    logger.error({ error, payload }, '[PUSH] Failed to send push notifications')
    return { success: 0, failed: 0 }
  }
}

/**
 * Get the correct intervention URL path based on user role
 */
export function getInterventionUrlForRole(role: string | null, interventionId: string): string {
  switch (role) {
    case 'locataire':
      return `/locataire/interventions/${interventionId}`
    case 'prestataire':
      return `/prestataire/interventions/${interventionId}`
    case 'gestionnaire':
    default:
      return `/gestionnaire/operations/interventions/${interventionId}`
  }
}

/**
 * Get a role-aware URL for a related entity (document context)
 */
export function getDocumentEntityUrl(role: string | null, entityType: string, entityId: string): string {
  const prefix = role === 'locataire' ? 'locataire' : role === 'prestataire' ? 'prestataire' : 'gestionnaire'
  if (entityType === 'intervention') {
    if (prefix === 'gestionnaire') return `/gestionnaire/operations/interventions/${entityId}`
    return `/${prefix}/interventions/${entityId}`
  }
  return `/gestionnaire/${entityType}s/${entityId}`
}

/**
 * Send push notifications with role-aware URLs
 * Groups notifications by role and sends appropriate URL for each group
 */
export async function sendRoleAwarePushNotifications(
  notifications: Array<{
    data?: {
      user_id: string
      is_personal: boolean
      metadata?: { assigned_role?: string | null }
    } | null
  }>,
  payload: { title: string; message: string; type?: string },
  interventionId: string
) {
  logger.info({
    totalNotifications: notifications.length,
    notificationsWithData: notifications.filter(n => n.data).length,
    notificationsPersonal: notifications.filter(n => n.data?.is_personal).length,
    rawNotifications: notifications.map(n => ({
      hasData: !!n.data,
      userId: n.data?.user_id,
      isPersonal: n.data?.is_personal,
      assignedRole: n.data?.metadata?.assigned_role
    })),
    payload,
    interventionId
  }, '[PUSH] DEBUG - sendRoleAwarePushNotifications called')

  // Extract valid notifications with personal flag and role
  const validNotifications = notifications
    .filter(n => n.data?.is_personal)
    .map(n => {
      let metadata = n.data!.metadata as Record<string, unknown> | string | undefined
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
          logger.debug({ userId: n.data!.user_id }, '[PUSH] Parsed stringified metadata')
        } catch {
          logger.warn({ userId: n.data!.user_id, metadata }, '[PUSH] Failed to parse metadata string')
          metadata = {}
        }
      }

      const role = (metadata as Record<string, unknown>)?.assigned_role as string | null || null
      logger.info({
        userId: n.data!.user_id,
        metadataType: typeof n.data!.metadata,
        metadataWasString: typeof n.data!.metadata === 'string',
        extractedRole: role
      }, '[PUSH] DEBUG - Extracted role from notification')

      return { userId: n.data!.user_id, role }
    })

  logger.info({
    validCount: validNotifications.length,
    validNotifications
  }, '[PUSH] DEBUG - Valid personal notifications after filter')

  if (validNotifications.length === 0) {
    logger.warn({
      notificationCount: notifications.length,
      reason: 'No notifications with is_personal=true'
    }, '[PUSH] No personal recipients for role-aware push - DEBUG')
    return { success: 0, failed: 0 }
  }

  // Group by role for sending with appropriate URLs
  const byRole = new Map<string | null, string[]>()
  for (const notif of validNotifications) {
    const existing = byRole.get(notif.role) || []
    existing.push(notif.userId)
    byRole.set(notif.role, existing)
  }

  let totalSuccess = 0
  let totalFailed = 0

  for (const [role, userIds] of byRole) {
    const uniqueUserIds = Array.from(new Set(userIds))
    const url = getInterventionUrlForRole(role, interventionId)

    try {
      const result = await sendPushNotificationToUsers(uniqueUserIds, { ...payload, url })
      totalSuccess += result.success
      totalFailed += result.failed

      logger.info({
        role: role || 'unknown',
        userCount: uniqueUserIds.length,
        url,
        success: result.success
      }, '[PUSH] Role-aware push notifications sent')
    } catch (error) {
      totalFailed += uniqueUserIds.length
      logger.error({ error, role }, '[PUSH] Failed to send role-aware push')
    }
  }

  return { success: totalSuccess, failed: totalFailed }
}
