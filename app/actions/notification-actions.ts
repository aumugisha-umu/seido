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

import { createServerNotificationRepository } from '@/lib/services/repositories/notification-repository'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'

/**
 * Create notification for new intervention
 *
 * @param interventionId - ID of the intervention
 * @returns Array of created notifications
 */
export async function createInterventionNotification(interventionId: string) {
  try {
    // 1. Authentication & context
    const { user, profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'createInterventionNotification',
      interventionId,
      userId: profile.id,
      teamId: team.id
    }, '📬 [NOTIFICATION-ACTION] Creating intervention notification')

    // 2. Dependency injection
    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    // 3. Business logic (via Domain Service)
    logger.info({
      interventionId,
      teamId: team.id,
      createdBy: profile.id
    }, '🔍 [DEBUG] Before notifyInterventionCreated')

    const notifications = await service.notifyInterventionCreated({
      interventionId,
      teamId: team.id,
      createdBy: profile.id
    })

    logger.info({
      interventionId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Intervention notifications created')

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

    logger.info({
      interventionId,
      notificationCount: notifications.length
    }, '✅ [NOTIFICATION-ACTION] Status change notifications created')

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
        lots(reference, address, city)
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
        lots(reference, address, city)
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

    // Notify tenants linked to this contract
    const { data: contractContacts } = await repository.supabase
      .from('contract_contacts')
      .select('user_id, role')
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
