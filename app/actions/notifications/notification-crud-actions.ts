'use server'

/**
 * Notification CRUD Actions
 *
 * Basic notification operations: mark as read, create custom, document notifications.
 */

import {
  createServerNotificationRepository,
} from '@/lib/services'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { EmailService } from '@/lib/services/domain/email.service'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import {
  sendPushToNotificationRecipients,
  getDocumentEntityUrl,
} from './notification-helpers'

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'markNotificationAsRead',
      notificationId,
      userId: profile.id
    }, '[NOTIFICATION-ACTION] Marking notification as read')

    const repository = await createServerNotificationRepository()

    await repository.update(notificationId, {
      read: true,
      read_at: new Date().toISOString()
    })

    logger.info({ notificationId }, '[NOTIFICATION-ACTION] Notification marked as read')

    return { success: true }
  } catch (error) {
    logger.error({ error, notificationId }, '[NOTIFICATION-ACTION] Failed to mark notification as read')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
  try {
    const { profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'markAllNotificationsAsRead',
      userId: profile.id
    }, '[NOTIFICATION-ACTION] Marking all notifications as read')

    const repository = await createServerNotificationRepository()

    const result = await repository.findByUserId(profile.id, { read: false })

    if (!result.success || !result.data) {
      return { success: false, error: 'Failed to fetch notifications' }
    }

    await Promise.all(
      result.data.map(notif =>
        repository.update(notif.id, {
          read: true,
          read_at: new Date().toISOString()
        })
      )
    )

    logger.info({ count: result.data.length }, '[NOTIFICATION-ACTION] All notifications marked as read')

    return { success: true, count: result.data.length }
  } catch (error) {
    logger.error({ error }, '[NOTIFICATION-ACTION] Failed to mark all notifications as read')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// CUSTOM NOTIFICATION
// ============================================================================

/**
 * Create custom notification (generic)
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
    const { profile } = await getServerAuthContext('authenticated')

    logger.info({
      action: 'createCustomNotification',
      userId: params.userId,
      teamId: params.teamId,
      type: params.type,
      createdBy: profile.id
    }, '[NOTIFICATION-ACTION] Creating custom notification')

    const repository = await createServerNotificationRepository()

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
      logger.error({ error: result.error }, '[NOTIFICATION-ACTION] Failed to create custom notification')
      return { success: false, error: result.error?.message || 'Failed to create notification' }
    }

    logger.info({
      notificationId: result.data.id,
      userId: params.userId
    }, '[NOTIFICATION-ACTION] Custom notification created')

    return { success: true, data: result.data }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to create custom notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// DOCUMENT NOTIFICATION
// ============================================================================

/**
 * Notify document uploaded
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
    logger.info({
      action: 'notifyDocumentUploaded',
      documentId: params.documentId,
      teamId: params.teamId,
      uploadedBy: params.uploadedBy
    }, '[NOTIFICATION-ACTION] Notifying document upload')

    const repository = await createServerNotificationRepository()
    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    // Notify assigned user if specified
    if (params.assignedTo && params.assignedTo !== params.uploadedBy) {
      const result = await repository.create({
        user_id: params.assignedTo,
        team_id: params.teamId,
        created_by: params.uploadedBy,
        type: 'system',
        title: 'Nouveau document disponible',
        message: `Le document "${params.documentName}" a ete ajoute`,
        is_personal: true,
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
        title: 'Nouveau document uploade',
        message: `Document "${params.documentName}" uploade`,
        is_personal: false,
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
    }, '[NOTIFICATION-ACTION] Document upload notifications created')

    // PUSH NOTIFICATIONS
    if (notifications.length > 0 && params.assignedTo) {
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
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyDocumentUploaded'))
    }

    // EMAIL NOTIFICATIONS
    if (params.assignedTo && params.assignedTo !== params.uploadedBy) {
      try {
        const emailService = new EmailService()
        if (emailService.isConfigured()) {
          const serviceRoleClient = createServiceRoleSupabaseClient()

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

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido-app.com'
            const entityUrl = `${baseUrl}${getDocumentEntityUrl(assignedUser.role, params.relatedEntityType, params.relatedEntityId)}`

            const result = await emailService.send({
              to: assignedUser.email,
              subject: `Nouveau document - ${params.documentName}`,
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
            }, '[NOTIFICATION-ACTION] Document upload email sent')
          }
        }
      } catch (emailError) {
        logger.warn({ emailError, documentId: params.documentId }, '[NOTIFICATION-ACTION] Could not send document upload email')
      }
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to notify document upload')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// PROPERTY ENTITY NOTIFICATIONS (building, lot, contact)
// ============================================================================

/**
 * Create notification for new building
 */
export async function createBuildingNotification(buildingId: string) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'createBuildingNotification', buildingId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating building notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingCreated({
      buildingId,
      teamId: team.id,
      createdBy: profile.id
    })

    logger.info({ buildingId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Building notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, buildingId }, '[NOTIFICATION-ACTION] Failed to create building notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update notification for building modification
 */
export async function notifyBuildingUpdated({ buildingId, changes }: { buildingId: string; changes: Record<string, unknown> }) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'notifyBuildingUpdated', buildingId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating building update notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingUpdated({
      buildingId,
      teamId: team.id,
      updatedBy: profile.id,
      changes
    })

    logger.info({ buildingId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Building update notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, buildingId }, '[NOTIFICATION-ACTION] Failed to create building update notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete notification for building deletion
 */
export async function notifyBuildingDeleted(building: { id: string; name: string; address: string; team_id: string }) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'notifyBuildingDeleted', buildingId: building.id, userId: profile.id }, '[NOTIFICATION-ACTION] Creating building deletion notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyBuildingDeleted({
      building,
      teamId: team.id,
      deletedBy: profile.id
    })

    logger.info({ buildingId: building.id, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Building deletion notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, buildingId: building.id }, '[NOTIFICATION-ACTION] Failed to create building deletion notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create notification for new lot
 */
export async function createLotNotification(lotId: string) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'createLotNotification', lotId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating lot notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotCreated({ lotId, teamId: team.id, createdBy: profile.id })

    logger.info({ lotId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Lot notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, lotId }, '[NOTIFICATION-ACTION] Failed to create lot notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update notification for lot modification
 */
export async function notifyLotUpdated({ lotId, changes }: { lotId: string; changes: Record<string, unknown> }) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'notifyLotUpdated', lotId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating lot update notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotUpdated({ lotId, teamId: team.id, updatedBy: profile.id, changes })

    logger.info({ lotId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Lot update notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, lotId }, '[NOTIFICATION-ACTION] Failed to create lot update notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete notification for lot deletion
 */
export async function notifyLotDeleted(lot: { id: string; reference: string; building_id: string; team_id: string }) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'notifyLotDeleted', lotId: lot.id, userId: profile.id }, '[NOTIFICATION-ACTION] Creating lot deletion notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyLotDeleted({ lot, teamId: team.id, deletedBy: profile.id })

    logger.info({ lotId: lot.id, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Lot deletion notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, lotId: lot.id }, '[NOTIFICATION-ACTION] Failed to create lot deletion notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create notification for new contact
 */
export async function createContactNotification(contactId: string) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'createContactNotification', contactId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating contact notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyContactCreated({ contactId, teamId: team.id, createdBy: profile.id })

    logger.info({ contactId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Contact notifications created')
    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, contactId }, '[NOTIFICATION-ACTION] Failed to create contact notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
