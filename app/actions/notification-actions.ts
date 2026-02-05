/**
 * Notification Server Actions
 *
 * Orchestration layer for notification creation.
 * Architecture: Server Actions → Domain Service → Repository → Supabase
 *
 * Usage:
 * ```typescript
 * import { createInterventionNotification } from '@/app/actions/notification-actions'
 *
 * // In API route or Server Component
 * await createInterventionNotification(interventionId)
 * ```
 */

'use server'

import {
  createServerNotificationRepository,
  createServerInterventionRepository,
  createServerUserRepository,
  createServerBuildingRepository,
  createServerLotRepository
} from '@/lib/services'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import { sendPushNotificationToUsers } from '@/lib/send-push-notification'

// ============================================================================
// PUSH NOTIFICATION HELPER
// ============================================================================

/**
 * Extract personal user IDs from notifications and send push notifications
 * Only sends to users who have is_personal=true (directly assigned/concerned)
 *
 * @param notifications - Array of created notifications
 * @param payload - Push notification payload (title, message, url, type)
 */
async function sendPushToNotificationRecipients(
  notifications: Array<{ user_id: string; is_personal: boolean }>,
  payload: { title: string; message: string; url?: string; type?: string }
) {
  // Only push to personal recipients (directly assigned/involved users)
  // Use Array.from for Set to avoid downlevelIteration requirement
  const personalUserIds = Array.from(new Set(
    notifications
      .filter(n => n.is_personal)
      .map(n => n.user_id)
  ))

  if (personalUserIds.length === 0) {
    logger.debug({ notificationCount: notifications.length }, '📭 [PUSH] No personal recipients for push')
    return { success: 0, failed: 0 }
  }

  try {
    const result = await sendPushNotificationToUsers(personalUserIds, payload)
    logger.info({
      userCount: personalUserIds.length,
      success: result.success,
      failed: result.failed,
      title: payload.title
    }, '📱 [PUSH] Push notifications sent from Server Action')
    return result
  } catch (error) {
    logger.error({ error, payload }, '⚠️ [PUSH] Failed to send push notifications')
    return { success: 0, failed: 0 }
  }
}

/**
 * Get the correct intervention URL path based on user role
 */
function getInterventionUrlForRole(role: string | null, interventionId: string): string {
  switch (role) {
    case 'locataire':
      return `/locataire/interventions/${interventionId}`
    case 'prestataire':
      return `/prestataire/interventions/${interventionId}`
    case 'gestionnaire':
    default:
      return `/gestionnaire/interventions/${interventionId}`
  }
}

/**
 * Get a role-aware URL for a related entity (document context)
 * Maps entity types to the correct role-prefixed route
 */
function getDocumentEntityUrl(role: string | null, entityType: string, entityId: string): string {
  const prefix = role === 'locataire' ? 'locataire' : role === 'prestataire' ? 'prestataire' : 'gestionnaire'
  if (entityType === 'intervention') return `/${prefix}/interventions/${entityId}`
  // Other entity types default to gestionnaire
  return `/gestionnaire/${entityType}s/${entityId}`
}

/**
 * Send push notifications with role-aware URLs
 * Groups notifications by role and sends appropriate URL for each group
 *
 * @param notifications - Array of created notifications with metadata.assigned_role
 * @param payload - Base push notification payload (url will be overridden per role)
 * @param interventionId - Intervention ID for URL construction
 */
async function sendRoleAwarePushNotifications(
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
  // 🔍 DEBUG: Log all incoming notifications
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
  }, '📤 [PUSH] DEBUG - sendRoleAwarePushNotifications called')

  // Extract valid notifications with personal flag and role
  // ✅ FIX: Handle both string and object metadata (RLS may return stringified metadata)
  const validNotifications = notifications
    .filter(n => n.data?.is_personal)
    .map(n => {
      // Parse metadata if it's a string (happens when RLS blocks SELECT after INSERT)
      let metadata = n.data!.metadata as Record<string, any> | string | undefined
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
          logger.debug({ userId: n.data!.user_id }, '📦 [PUSH] Parsed stringified metadata')
        } catch (e) {
          logger.warn({ userId: n.data!.user_id, metadata }, '⚠️ [PUSH] Failed to parse metadata string')
          metadata = {}
        }
      }

      const role = (metadata as Record<string, any>)?.assigned_role || null
      logger.info({
        userId: n.data!.user_id,
        metadataType: typeof n.data!.metadata,
        metadataWasString: typeof n.data!.metadata === 'string',
        extractedRole: role
      }, '📦 [PUSH] DEBUG - Extracted role from notification')

      return {
        userId: n.data!.user_id,
        role
      }
    })

  // 🔍 DEBUG: Log filtered notifications
  logger.info({
    validCount: validNotifications.length,
    validNotifications
  }, '📤 [PUSH] DEBUG - Valid personal notifications after filter')

  if (validNotifications.length === 0) {
    logger.warn({
      notificationCount: notifications.length,
      reason: 'No notifications with is_personal=true'
    }, '📭 [PUSH] No personal recipients for role-aware push - DEBUG')
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

  // Send push notifications grouped by role
  for (const [role, userIds] of byRole) {
    const uniqueUserIds = Array.from(new Set(userIds))
    const url = getInterventionUrlForRole(role, interventionId)

    try {
      const result = await sendPushNotificationToUsers(uniqueUserIds, {
        ...payload,
        url
      })
      totalSuccess += result.success
      totalFailed += result.failed

      logger.info({
        role: role || 'unknown',
        userCount: uniqueUserIds.length,
        url,
        success: result.success
      }, '📱 [PUSH] Role-aware push notifications sent')
    } catch (error) {
      totalFailed += uniqueUserIds.length
      logger.error({ error, role }, '⚠️ [PUSH] Failed to send role-aware push')
    }
  }

  return { success: totalSuccess, failed: totalFailed }
}

/**
 * Create notification for new intervention
 *
 * Uses service role to work regardless of who creates the intervention
 * (gestionnaire, locataire, or system)
 *
 * @param interventionId - ID of the intervention
 * @returns Array of created notifications
 */
export async function createInterventionNotification(interventionId: string) {
  try {
    // 1. Use service role client (works for any user role)
    const supabase = createServiceRoleSupabaseClient()

    // 2. Fetch intervention data to get team_id and created_by
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, team_id, created_by, title, status')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error({
        error: interventionError,
        interventionId
      }, '❌ [NOTIFICATION-ACTION] Intervention not found')
      return {
        success: false,
        error: interventionError?.message || 'Intervention not found'
      }
    }

    logger.info({
      action: 'createInterventionNotification',
      interventionId,
      teamId: intervention.team_id,
      createdBy: intervention.created_by
    }, '📬 [NOTIFICATION-ACTION] Creating intervention notification (service role)')

    // 3. Create repository and service with service role client
    const repository = new NotificationRepository(supabase)
    const service = new NotificationService(repository)

    // 4. Business logic (via Domain Service)
    const notifications = await service.notifyInterventionCreated({
      interventionId,
      teamId: intervention.team_id,
      createdBy: intervention.created_by
    })

    logger.info({
      interventionId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Intervention notifications created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Send to personal recipients with role-aware URLs
    // ═══════════════════════════════════════════════════════════════════════════
    sendRoleAwarePushNotifications(notifications, {
      title: 'Nouvelle intervention',
      message: intervention.title || 'Une nouvelle intervention a été créée',
      type: 'intervention'
    }, interventionId).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in createInterventionNotification'))

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      interventionId
    }, '❌ [NOTIFICATION-ACTION] Failed to create intervention notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create notification for intervention status change
 *
 * @param interventionId - ID of the intervention
 * @param oldStatus - Previous status
 * @param newStatus - New status
 * @param reason - Optional reason for the change
 */
export async function notifyInterventionStatusChange({
  interventionId,
  oldStatus,
  newStatus,
  reason
}: {
  interventionId: string
  oldStatus: string
  newStatus: string
  reason?: string
}) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyInterventionStatusChange',
      interventionId,
      oldStatus,
      newStatus,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating status change notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyInterventionStatusChange({
      interventionId,
      oldStatus,
      newStatus,
      teamId: team.id,
      changedBy: profile.id,
      reason
    })

    // 🔍 DEBUG: Log full notification structure to understand what's being returned
    logger.info({
      interventionId,
      notificationCount: notifications.length,
      notificationDetails: notifications.map((n, i) => {
        let parsedMetadata = n.data?.metadata
        if (typeof parsedMetadata === 'string') {
          try {
            parsedMetadata = JSON.parse(parsedMetadata)
          } catch (e) {
            parsedMetadata = { parseError: 'Failed to parse metadata string' }
          }
        }
        return {
          index: i,
          hasData: !!n.data,
          userId: n.data?.user_id,
          isPersonal: n.data?.is_personal,
          metadataType: typeof n.data?.metadata,
          metadataRaw: n.data?.metadata,
          metadataParsed: parsedMetadata,
          assignedRoleFromRaw: n.data?.metadata?.assigned_role,
          assignedRoleFromParsed: (parsedMetadata as Record<string, any>)?.assigned_role
        }
      })
    }, '✅ [NOTIFICATION-ACTION] Status change notifications created - DEBUG full structure')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Send to personal recipients
    // ═══════════════════════════════════════════════════════════════════════════
    // Note: demande_de_devis removed - quote status tracked via QuoteStatusBadge
    const statusMessages: Record<string, string> = {
      approuvee: '✅ Intervention approuvée',
      rejetee: '❌ Demande refusée',
      planification: 'Planification en cours',
      planifiee: 'Intervention planifiée',
      en_cours: 'Intervention en cours',
      cloturee_par_prestataire: 'Intervention terminée par le prestataire',
      cloturee_par_locataire: 'Intervention validée',
      cloturee_par_gestionnaire: 'Intervention clôturée',
      annulee: 'Intervention annulée'
    }

    // Custom messages for approval/rejection
    const getPushMessage = (): string => {
      if (newStatus === 'approuvee') {
        return 'Votre demande a été approuvée. La planification peut commencer.'
      }
      if (newStatus === 'rejetee' && reason) {
        return `Motif : ${reason}`
      }
      return reason || `Statut changé de ${oldStatus} vers ${newStatus}`
    }

    sendRoleAwarePushNotifications(notifications, {
      title: statusMessages[newStatus] || 'Mise à jour intervention',
      message: getPushMessage(),
      type: 'status_change'
    }, interventionId).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyInterventionStatusChange'))

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Status change emails
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const notificationRepository = await createServerNotificationRepository()
      const interventionRepository = await createServerInterventionRepository()
      const userRepository = await createServerUserRepository()
      const buildingRepository = await createServerBuildingRepository()
      const lotRepository = await createServerLotRepository()
      const emailService = new EmailService()

      const emailNotificationService = new EmailNotificationService(
        notificationRepository,
        emailService,
        interventionRepository,
        userRepository,
        buildingRepository,
        lotRepository
      )

      const emailResult = await emailNotificationService.sendInterventionEmails({
        interventionId,
        eventType: 'status_changed',
        excludeUserId: profile.id,  // Don't notify the person who made the change
        excludeNonPersonal: true,
        statusChange: {
          oldStatus,
          newStatus,
          reason,
          actorName: profile.name || 'Votre gestionnaire'  // Pass manager name for email templates
        }
      })

      logger.info({
        interventionId,
        emailsSent: emailResult.sentCount,
        emailsFailed: emailResult.failedCount
      }, '📧 [NOTIFICATION-ACTION] Status change emails sent')
    } catch (emailError) {
      // Don't fail the action for email errors
      logger.warn({ emailError, interventionId }, '⚠️ [NOTIFICATION-ACTION] Could not send status change emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      interventionId,
      oldStatus,
      newStatus
    }, '❌ [NOTIFICATION-ACTION] Failed to create status change notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create notification for new building
 *
 * @param buildingId - ID of the building
 */
export async function createBuildingNotification(buildingId: string) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'createBuildingNotification',
      buildingId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating building notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingCreated({
      buildingId,
      teamId: team.id,
      createdBy: profile.id
    })

    logger.info({
      buildingId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Building notifications created')

    // Push notification for new building (team notification, not personal - skip push)
    // Buildings are team-wide events, push would be too noisy

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      buildingId
    }, '❌ [NOTIFICATION-ACTION] Failed to create building notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update notification for building modification
 *
 * @param buildingId - ID of the building
 * @param changes - Changes made to the building
 */
export async function notifyBuildingUpdated({
  buildingId,
  changes
}: {
  buildingId: string
  changes: Record<string, any>
}) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyBuildingUpdated',
      buildingId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating building update notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingUpdated({
      buildingId,
      teamId: team.id,
      updatedBy: profile.id,
      changes
    })

    logger.info({
      buildingId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Building update notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      buildingId
    }, '❌ [NOTIFICATION-ACTION] Failed to create building update notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete notification for building deletion
 *
 * @param building - Building data (before deletion)
 */
export async function notifyBuildingDeleted(building: {
  id: string
  name: string
  address: string
  team_id: string
}) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyBuildingDeleted',
      buildingId: building.id,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating building deletion notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingDeleted({
      building,
      teamId: team.id,
      deletedBy: profile.id
    })

    logger.info({
      buildingId: building.id,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Building deletion notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      buildingId: building.id
    }, '❌ [NOTIFICATION-ACTION] Failed to create building deletion notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create notification for new lot
 *
 * @param lotId - ID of the lot
 */
export async function createLotNotification(lotId: string) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'createLotNotification',
      lotId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating lot notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotCreated({
      lotId,
      teamId: team.id,
      createdBy: profile.id
    })

    logger.info({
      lotId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Lot notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      lotId
    }, '❌ [NOTIFICATION-ACTION] Failed to create lot notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update notification for lot modification
 *
 * @param lotId - ID of the lot
 * @param changes - Changes made to the lot
 */
export async function notifyLotUpdated({
  lotId,
  changes
}: {
  lotId: string
  changes: Record<string, any>
}) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyLotUpdated',
      lotId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating lot update notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotUpdated({
      lotId,
      teamId: team.id,
      updatedBy: profile.id,
      changes
    })

    logger.info({
      lotId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Lot update notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      lotId
    }, '❌ [NOTIFICATION-ACTION] Failed to create lot update notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete notification for lot deletion
 *
 * @param lot - Lot data (before deletion)
 */
export async function notifyLotDeleted(lot: {
  id: string
  reference: string
  building_id: string
  team_id: string
}) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyLotDeleted',
      lotId: lot.id,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating lot deletion notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotDeleted({
      lot,
      teamId: team.id,
      deletedBy: profile.id
    })

    logger.info({
      lotId: lot.id,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Lot deletion notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      lotId: lot.id
    }, '❌ [NOTIFICATION-ACTION] Failed to create lot deletion notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create notification for new contact
 *
 * @param contactId - ID of the contact
 */
export async function createContactNotification(contactId: string) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'createContactNotification',
      contactId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating contact notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyContactCreated({
      contactId,
      teamId: team.id,
      createdBy: profile.id
    })

    logger.info({
      contactId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Contact notifications created')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      contactId
    }, '❌ [NOTIFICATION-ACTION] Failed to create contact notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Mark notification as read
 *
 * @param notificationId - ID of the notification
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { user, profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'markNotificationAsRead',
      notificationId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Marking notification as read')

    const repository = await createServerNotificationRepository()

    await repository.update(notificationId, {
      read: true,
      read_at: new Date().toISOString()
    })

    logger.info({
      notificationId
    }, '✅ [NOTIFICATION-ACTION] Notification marked as read')

    return { success: true }
  } catch (error) {
    logger.error({
      error,
      notificationId
    }, '❌ [NOTIFICATION-ACTION] Failed to mark notification as read')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
  try {
    const { user, profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'markAllNotificationsAsRead',
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Marking all notifications as read')

    const repository = await createServerNotificationRepository()

    // Get all unread notifications
    const result = await repository.findByUserId(profile.id, {
      read: false
    })

    if (!result.success || !result.data) {
      return { success: false, error: 'Failed to fetch notifications' }
    }

    // Mark all as read
    await Promise.all(
      result.data.map(notif =>
        repository.update(notif.id, {
          read: true,
          read_at: new Date().toISOString()
        })
      )
    )

    logger.info({
      count: result.data.length
    }, '✅ [NOTIFICATION-ACTION] All notifications marked as read')

    return { success: true, count: result.data.length }
  } catch (error) {
    logger.error({
      error
    }, '❌ [NOTIFICATION-ACTION] Failed to mark all notifications as read')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create custom notification (generic)
 *
 * For use cases requiring highly customized notifications (workflow steps, etc.)
 *
 * @param params - Custom notification parameters
 */
export async function createCustomNotification(params: {
  userId: string
  teamId: string
  type: 'intervention' | 'chat' | 'system' | 'alert'
  title: string
  message: string
  isPersonal?: boolean
  metadata?: Record<string, unknown>
  relatedEntityType?: string
  relatedEntityId?: string
}) {
  try {
    // 1. Authentication & context
    const { user, profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'createCustomNotification',
      userId: params.userId,
      teamId: params.teamId,
      type: params.type,
      createdBy: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating custom notification')

    // 2. Dependency injection
    const repository = await createServerNotificationRepository()

    // 3. Direct repository call (no domain service for custom notifications)
    const result = await repository.create({
      user_id: params.userId,
      team_id: params.teamId,
      created_by: profile.id,
      type: params.type,
      title: params.title,
      message: params.message,
      is_personal: params.isPersonal ?? false,
      metadata: params.metadata || {},
      related_entity_type: params.relatedEntityType || null,
      related_entity_id: params.relatedEntityId || null,
      read: false
    })

    if (!result.success || !result.data) {
      logger.error({ error: result.error }, '❌ [NOTIFICATION-ACTION] Failed to create custom notification')
      return {
        success: false,
        error: result.error?.message || 'Failed to create notification'
      }
    }

    logger.info({
      notificationId: result.data.id,
      userId: params.userId
    }, '✅ [NOTIFICATION-ACTION] Custom notification created')

    return { success: true, data: result.data }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to create custom notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Notify document uploaded
 *
 * @param params - Document upload parameters
 */
export async function notifyDocumentUploaded(params: {
  documentId: string
  documentName: string
  teamId: string
  uploadedBy: string
  relatedEntityType: string
  relatedEntityId: string
  assignedTo?: string
}) {
  try {
    const { user, profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'notifyDocumentUploaded',
      documentId: params.documentId,
      teamId: params.teamId,
      uploadedBy: params.uploadedBy
    }, '📬 [NOTIFICATION-ACTION] Notifying document upload')

    const repository = await createServerNotificationRepository()
    const notifications = []

    // Notify assigned user if specified
    if (params.assignedTo && params.assignedTo !== params.uploadedBy) {
      const result = await repository.create({
        user_id: params.assignedTo,
        team_id: params.teamId,
        created_by: params.uploadedBy,
        type: 'system',
        title: 'Nouveau document disponible',
        message: `Le document "${params.documentName}" a été ajouté`,
        is_personal: true, // Assigned directly
        metadata: {
          document_id: params.documentId,
          document_name: params.documentName,
          related_entity_type: params.relatedEntityType,
          related_entity_id: params.relatedEntityId
        },
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    // Notify team managers (except uploader)
    const { data: teamManagers } = await repository.supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', params.teamId)
      .eq('role', 'gestionnaire')
      .neq('user_id', params.uploadedBy)

    for (const manager of teamManagers || []) {
      const result = await repository.create({
        user_id: manager.user_id,
        team_id: params.teamId,
        created_by: params.uploadedBy,
        type: 'system',
        title: 'Nouveau document uploadé',
        message: `Document "${params.documentName}" uploadé`,
        is_personal: false, // Team notification
        metadata: {
          document_id: params.documentId,
          document_name: params.documentName,
          related_entity_type: params.relatedEntityType,
          related_entity_id: params.relatedEntityId
        },
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    logger.info({
      documentId: params.documentId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Document upload notifications created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Send to assigned user (personal notification)
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0 && params.assignedTo) {
      // Fetch the assigned user's role for correct URL routing
      const { data: assignedUserForPush } = await repository.supabase
        .from('users')
        .select('role')
        .eq('id', params.assignedTo)
        .single()

      const pushUrl = getDocumentEntityUrl(
        assignedUserForPush?.role || null,
        params.relatedEntityType,
        params.relatedEntityId
      )

      sendPushToNotificationRecipients(notifications, {
        title: 'Nouveau document',
        message: `Document "${params.documentName}" disponible`,
        url: pushUrl,
        type: 'document'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyDocumentUploaded'))
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Send to assigned user only (not managers — too noisy)
    // ═══════════════════════════════════════════════════════════════════════════
    if (params.assignedTo && params.assignedTo !== params.uploadedBy) {
      try {
        const emailService = new EmailService()
        if (emailService.isConfigured()) {
          const serviceRoleClient = createServiceRoleSupabaseClient()

          // Fetch assigned user email + role + uploader name
          const [assignedUserResult, uploaderResult] = await Promise.all([
            serviceRoleClient
              .from('users')
              .select('email, first_name, last_name, role')
              .eq('id', params.assignedTo)
              .single(),
            serviceRoleClient
              .from('users')
              .select('first_name, last_name')
              .eq('id', params.uploadedBy)
              .single()
          ])

          const assignedUser = assignedUserResult.data
          const uploader = uploaderResult.data

          if (assignedUser?.email) {
            const { DocumentUploadedEmail } = await import('@/emails/templates/documents/document-uploaded')

            const uploaderName = uploader
              ? `${uploader.first_name || ''} ${uploader.last_name || ''}`.trim() || 'Un utilisateur'
              : 'Un utilisateur'

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido.app'
            const entityUrl = `${baseUrl}${getDocumentEntityUrl(assignedUser.role, params.relatedEntityType, params.relatedEntityId)}`

            const result = await emailService.send({
              to: assignedUser.email,
              subject: `📄 Nouveau document - ${params.documentName}`,
              react: DocumentUploadedEmail({
                firstName: assignedUser.first_name || 'Utilisateur',
                documentName: params.documentName,
                uploadedByName: uploaderName,
                entityUrl,
              }),
              tags: [{ name: 'type', value: 'document_uploaded' }]
            })

            logger.info({
              documentId: params.documentId,
              emailSent: result.success,
              to: assignedUser.email
            }, '📧 [NOTIFICATION-ACTION] Document upload email sent')
          }
        }
      } catch (emailError) {
        logger.warn({ emailError, documentId: params.documentId }, '⚠️ [NOTIFICATION-ACTION] Could not send document upload email')
      }
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to notify document upload')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================================================
// CONTRACT NOTIFICATIONS
// ============================================================================

/**
 * Notify team managers about an expiring contract
 *
 * @param contractId - ID of the contract
 * @param daysUntilExpiry - Number of days until contract expires
 */
export async function notifyContractExpiring({
  contractId,
  daysUntilExpiry
}: {
  contractId: string
  daysUntilExpiry: number
}) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyContractExpiring',
      contractId,
      daysUntilExpiry,
      teamId: team.id
    }, '📬 [NOTIFICATION-ACTION] Creating contract expiration notification')

    const repository = await createServerNotificationRepository()

    // Get contract details
    const { data: contract } = await repository.supabase
      .from('contracts')
      .select(`
        id,
        title,
        end_date,
        lot_id,
        lots(reference, address_record:address_id(*))
      `)
      .eq('id', contractId)
      .single()

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    const notifications = []

    // Get team managers (with email info for email notifications)
    const { data: teamManagers } = await repository.supabase
      .from('team_members')
      .select('user_id, users(email, first_name, last_name)')
      .eq('team_id', team.id)
      .eq('role', 'gestionnaire')

    const urgencyLevel = daysUntilExpiry <= 7 ? 'urgent' : 'warning'
    const urgencyEmoji = daysUntilExpiry <= 7 ? '🔴' : '🟠'

    for (const manager of teamManagers || []) {
      const result = await repository.create({
        user_id: manager.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'alert',
        title: `${urgencyEmoji} Contrat expire bientot`,
        message: `Le contrat "${contract.title}" expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
        is_personal: false,
        metadata: {
          contract_id: contractId,
          days_until_expiry: daysUntilExpiry,
          urgency_level: urgencyLevel,
          end_date: contract.end_date,
          lot_reference: (contract.lots as any)?.reference
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    logger.info({
      contractId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Contract expiration notifications created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Urgent contract expiration (7 days or less) sends push to all managers
    // ═══════════════════════════════════════════════════════════════════════════
    if (daysUntilExpiry <= 7 && notifications.length > 0) {
      const managerIds = notifications.map(n => n.user_id)
      sendPushNotificationToUsers(managerIds, {
        title: `🔴 Contrat expire dans ${daysUntilExpiry}j`,
        message: `Le contrat "${contract.title}" expire bientôt`,
        url: `/gestionnaire/contrats/${contractId}`,
        type: 'deadline'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyContractExpiring'))
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Send to all gestionnaires
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const emailService = new EmailService()
      if (emailService.isConfigured() && teamManagers && teamManagers.length > 0) {
        const { ContractExpiringEmail } = await import('@/emails/templates/contracts/contract-expiring')

        const lotReference = (contract.lots as any)?.reference || 'N/A'
        const endDateFormatted = contract.end_date
          ? new Date(contract.end_date).toLocaleDateString('fr-FR')
          : 'N/A'
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido.app'
        const contractUrl = `${baseUrl}/gestionnaire/contrats/${contractId}`
        const urgencyIcon = daysUntilExpiry <= 7 ? '🔴' : '🟠'

        for (const manager of teamManagers) {
          const managerUser = manager.users as any
          if (!managerUser?.email) continue

          const result = await emailService.send({
            to: managerUser.email,
            subject: `${urgencyIcon} Contrat expire dans ${daysUntilExpiry}j - ${contract.title}`,
            react: ContractExpiringEmail({
              firstName: managerUser.first_name || 'Gestionnaire',
              contractTitle: contract.title || 'Contrat',
              lotReference,
              daysUntilExpiry,
              endDate: endDateFormatted,
              contractUrl,
            }),
            tags: [{ name: 'type', value: 'contract_expiring' }]
          })

          logger.info({
            contractId,
            emailSent: result.success,
            to: managerUser.email
          }, '📧 [NOTIFICATION-ACTION] Contract expiring email sent')
        }
      }
    } catch (emailError) {
      logger.warn({ emailError, contractId }, '⚠️ [NOTIFICATION-ACTION] Could not send contract expiring emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      contractId
    }, '❌ [NOTIFICATION-ACTION] Failed to notify contract expiration')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check all expiring contracts for a team and send notifications
 * This should be called periodically (e.g., by a cron job or on dashboard load)
 *
 * Sends notifications for:
 * - Contracts expiring in 30 days (if not already notified)
 * - Contracts expiring in 7 days (if not already notified at 7 days)
 */
export async function checkExpiringContracts() {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'checkExpiringContracts',
      teamId: team.id
    }, '📬 [NOTIFICATION-ACTION] Checking for expiring contracts')

    const repository = await createServerNotificationRepository()

    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Get active contracts expiring in the next 30 days
    const { data: expiringContracts } = await repository.supabase
      .from('contracts')
      .select(`
        id,
        title,
        end_date,
        lot_id,
        metadata
      `)
      .eq('team_id', team.id)
      .eq('status', 'actif')
      .is('deleted_at', null)
      .gte('end_date', now.toISOString().split('T')[0])
      .lte('end_date', in30Days.toISOString().split('T')[0])

    if (!expiringContracts || expiringContracts.length === 0) {
      return { success: true, data: [], message: 'No expiring contracts found' }
    }

    const notifications = []

    for (const contract of expiringContracts) {
      const endDate = new Date(contract.end_date)
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      // Check if we've already sent a notification for this milestone
      const metadata = (contract.metadata as Record<string, any>) || {}
      const notified30Days = metadata.notified_30_days
      const notified7Days = metadata.notified_7_days

      // Send 30-day notification if not sent yet and within range
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 7 && !notified30Days) {
        const result = await notifyContractExpiring({
          contractId: contract.id,
          daysUntilExpiry
        })

        if (result.success) {
          // Update contract metadata to mark notification sent
          await repository.supabase
            .from('contracts')
            .update({
              metadata: {
                ...metadata,
                notified_30_days: new Date().toISOString()
              }
            })
            .eq('id', contract.id)

          notifications.push(...(result.data || []))
        }
      }

      // Send 7-day notification if not sent yet
      if (daysUntilExpiry <= 7 && !notified7Days) {
        const result = await notifyContractExpiring({
          contractId: contract.id,
          daysUntilExpiry
        })

        if (result.success) {
          // Update contract metadata to mark notification sent
          await repository.supabase
            .from('contracts')
            .update({
              metadata: {
                ...metadata,
                notified_7_days: new Date().toISOString()
              }
            })
            .eq('id', contract.id)

          notifications.push(...(result.data || []))
        }
      }
    }

    logger.info({
      teamId: team.id,
      expiringCount: expiringContracts.length,
      notificationsSent: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Expiring contracts check complete')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error
    }, '❌ [NOTIFICATION-ACTION] Failed to check expiring contracts')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create notification for new contract
 *
 * @param contractId - ID of the contract
 */
export async function createContractNotification(contractId: string) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'createContractNotification',
      contractId,
      userId: profile.id
    }, '📬 [NOTIFICATION-ACTION] Creating contract notification')

    const repository = await createServerNotificationRepository()

    // Get contract details
    const { data: contract } = await repository.supabase
      .from('contracts')
      .select(`
        id,
        title,
        start_date,
        end_date,
        rent_amount,
        lot_id,
        lots(reference, address_record:address_id(*))
      `)
      .eq('id', contractId)
      .single()

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    const notifications = []

    // Get team managers
    const { data: teamManagers } = await repository.supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team.id)
      .eq('role', 'gestionnaire')
      .neq('user_id', profile.id)

    for (const manager of teamManagers || []) {
      const result = await repository.create({
        user_id: manager.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'system',
        title: 'Nouveau contrat cree',
        message: `Le contrat "${contract.title}" a ete cree pour le lot ${(contract.lots as any)?.reference || 'N/A'}`,
        is_personal: false,
        metadata: {
          contract_id: contractId,
          start_date: contract.start_date,
          end_date: contract.end_date,
          rent_amount: contract.rent_amount
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    // Notify tenants linked to this contract (with email info for email notifications)
    const { data: contractContacts } = await repository.supabase
      .from('contract_contacts')
      .select('user_id, role, users(email, first_name, last_name)')
      .eq('contract_id', contractId)
      .eq('role', 'locataire')

    for (const contact of contractContacts || []) {
      const result = await repository.create({
        user_id: contact.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'system',
        title: 'Votre contrat de bail',
        message: `Un contrat de bail "${contract.title}" a ete cree pour vous`,
        is_personal: true,
        metadata: {
          contract_id: contractId,
          start_date: contract.start_date,
          end_date: contract.end_date
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    logger.info({
      contractId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Contract notifications created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS: Send to tenants (personal notifications)
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Nouveau contrat de bail',
        message: `Contrat "${contract.title}" créé`,
        url: `/locataire/contrats/${contractId}`,
        type: 'contract'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in createContractNotification'))
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Send to tenant contacts (personal)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const emailService = new EmailService()
      if (emailService.isConfigured() && contractContacts && contractContacts.length > 0) {
        const { ContractCreatedEmail } = await import('@/emails/templates/contracts/contract-created')

        const lot = contract.lots as any
        const lotReference = lot?.reference || 'N/A'
        const addressRecord = lot?.address_record
        const propertyAddress = addressRecord
          ? `${addressRecord.street || ''}, ${addressRecord.postal_code || ''} ${addressRecord.city || ''}`.trim().replace(/^,\s*/, '')
          : 'Adresse non renseignée'
        const startDateFormatted = contract.start_date
          ? new Date(contract.start_date).toLocaleDateString('fr-FR')
          : 'Non définie'
        const endDateFormatted = contract.end_date
          ? new Date(contract.end_date).toLocaleDateString('fr-FR')
          : undefined
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido.app'
        const contractUrl = `${baseUrl}/locataire/contrats/${contractId}`

        for (const contact of contractContacts) {
          const contactUser = contact.users as any
          if (!contactUser?.email) continue

          const result = await emailService.send({
            to: contactUser.email,
            subject: `📜 Nouveau contrat - ${contract.title}`,
            react: ContractCreatedEmail({
              firstName: contactUser.first_name || 'Locataire',
              contractTitle: contract.title || 'Contrat',
              lotReference,
              propertyAddress,
              startDate: startDateFormatted,
              endDate: endDateFormatted,
              contractUrl,
            }),
            tags: [{ name: 'type', value: 'contract_created' }]
          })

          logger.info({
            contractId,
            emailSent: result.success,
            to: contactUser.email
          }, '📧 [NOTIFICATION-ACTION] Contract created email sent')
        }
      }
    } catch (emailError) {
      logger.warn({ emailError, contractId }, '⚠️ [NOTIFICATION-ACTION] Could not send contract created emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      contractId
    }, '❌ [NOTIFICATION-ACTION] Failed to create contract notification')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================================================
// QUOTE NOTIFICATIONS
// ============================================================================

/**
 * Notify provider about a new quote request
 *
 * @param params - Quote request notification parameters
 */
export async function notifyQuoteRequested(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  requestedBy: string
  requestedByName: string
  deadline?: string | null
}) {
  try {
    logger.info({
      action: 'notifyQuoteRequested',
      quoteId: params.quoteId,
      providerId: params.providerId,
      interventionId: params.interventionId
    }, '📬 [NOTIFICATION-ACTION] Creating quote request notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications = []

    // Create in-app notification for provider
    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.requestedBy,
      type: 'intervention',
      title: '📋 Nouvelle demande d\'estimation',
      message: `${params.requestedByName} vous demande une estimation pour "${params.interventionTitle}"${params.deadline ? ` (avant le ${new Date(params.deadline).toLocaleDateString('fr-FR')})` : ''}`,
      is_personal: true, // Direct notification to provider
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        deadline: params.deadline,
        action_required: 'quote_submission'
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({
      quoteId: params.quoteId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Quote request notification created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATION: Alert provider immediately
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: '📋 Demande d\'estimation',
        message: `Nouvelle demande pour "${params.interventionTitle}"`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_request'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyQuoteRequested'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to notify quote request')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Notify provider about quote approval
 *
 * @param params - Quote approval notification parameters
 */
export async function notifyQuoteApproved(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  approvedBy: string
  approvedByName: string
  amount: number
  notes?: string
}) {
  try {
    logger.info({
      action: 'notifyQuoteApproved',
      quoteId: params.quoteId,
      providerId: params.providerId
    }, '📬 [NOTIFICATION-ACTION] Creating quote approval notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications = []

    // Create in-app notification for provider
    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.approvedBy,
      type: 'intervention',
      title: '✅ Estimation approuvée !',
      message: `Votre estimation de ${params.amount.toFixed(2)}€ pour "${params.interventionTitle}" a été approuvée${params.notes ? `. Note: ${params.notes}` : ''}`,
      is_personal: true,
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        amount: params.amount,
        approved_by: params.approvedByName,
        action_required: 'planning'
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({
      quoteId: params.quoteId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Quote approval notification created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATION: This is important news for the provider!
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: '✅ Estimation approuvée',
        message: `Votre estimation de ${params.amount.toFixed(2)}€ a été acceptée`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_approved'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyQuoteApproved'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to notify quote approval')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Notify provider about quote rejection
 *
 * @param params - Quote rejection notification parameters
 */
export async function notifyQuoteRejected(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  rejectedBy: string
  rejectedByName: string
  reason: string
  canResubmit?: boolean
}) {
  try {
    logger.info({
      action: 'notifyQuoteRejected',
      quoteId: params.quoteId,
      providerId: params.providerId
    }, '📬 [NOTIFICATION-ACTION] Creating quote rejection notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications = []

    // Create in-app notification for provider
    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.rejectedBy,
      type: 'intervention',
      title: '❌ Estimation refusée',
      message: `Votre estimation pour "${params.interventionTitle}" a été refusée. Motif: ${params.reason}`,
      is_personal: true,
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        rejection_reason: params.reason,
        can_resubmit: params.canResubmit ?? false
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({
      quoteId: params.quoteId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Quote rejection notification created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATION: Provider should know about rejection
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: '❌ Estimation refusée',
        message: `Motif: ${params.reason.substring(0, 50)}${params.reason.length > 50 ? '...' : ''}`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_rejected'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyQuoteRejected'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to notify quote rejection')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Notify managers about a quote submission (add push to existing in-app)
 *
 * @param params - Quote submission notification parameters
 */
export async function notifyQuoteSubmittedWithPush(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  teamId: string
  providerId: string
  providerName: string
  amount: number
  managerIds: string[]
  primaryManagerId?: string
}) {
  try {
    logger.info({
      action: 'notifyQuoteSubmittedWithPush',
      quoteId: params.quoteId,
      managerCount: params.managerIds.length
    }, '📬 [NOTIFICATION-ACTION] Creating quote submission notifications with push')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications = []

    // Create in-app notifications for all managers
    for (const managerId of params.managerIds) {
      const isPrimary = managerId === params.primaryManagerId
      const result = await repository.create({
        user_id: managerId,
        team_id: params.teamId,
        created_by: params.providerId,
        type: 'intervention',
        title: '📋 Nouvelle estimation reçue',
        message: `${params.providerName} a soumis une estimation de ${params.amount.toFixed(2)}€ pour "${params.interventionTitle}"`,
        is_personal: isPrimary, // Only primary manager gets push
        metadata: {
          quote_id: params.quoteId,
          intervention_id: params.interventionId,
          intervention_title: params.interventionTitle,
          amount: params.amount,
          provider_name: params.providerName,
          action_required: 'quote_review'
        },
        related_entity_type: 'intervention',
        related_entity_id: params.interventionId,
        read: false
      })

      if (result.success && result.data) {
        notifications.push(result.data)
      }
    }

    logger.info({
      quoteId: params.quoteId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Quote submission notifications created')

    // ═══════════════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATION: Alert primary manager about new quote
    // ═══════════════════════════════════════════════════════════════════════════
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: '📋 Nouvelle estimation',
        message: `${params.providerName}: ${params.amount.toFixed(2)}€`,
        url: `/gestionnaire/interventions/${params.interventionId}`,
        type: 'quote_submitted'
      }).catch(err => logger.error({ err }, '⚠️ [PUSH] Failed in notifyQuoteSubmittedWithPush'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({
      error,
      params
    }, '❌ [NOTIFICATION-ACTION] Failed to notify quote submission')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
