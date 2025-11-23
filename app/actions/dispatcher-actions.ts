/**
 * Multi-Channel Notification Dispatcher Actions
 *
 * Server Actions that orchestrate notifications across DB, Email, and Push channels.
 * These actions are the public API for triggering multi-channel notifications.
 *
 * @module dispatcher-actions
 */

'use server'

import {
  createNotificationDispatcher,
  type DispatchResult
} from '@/lib/services/domain/notification-dispatcher.service'
import { createServerNotificationRepository } from '@/lib/services/repositories/notification-repository'
import { createEmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { createEmailService } from '@/lib/services/domain/email.service'
import { createServerInterventionRepository } from '@/lib/services/repositories/intervention-repository'
import { createServerUserRepository } from '@/lib/services/repositories/user-repository'
import { createServerBuildingRepository } from '@/lib/services/repositories/building-repository'
import { createServerLotRepository } from '@/lib/services/repositories/lot-repository'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'

// ============================================================================
// Intervention Notifications
// ============================================================================

/**
 * Dispatch intervention created notifications to all channels
 *
 * Sends notifications to:
 * - Database (in-app notifications)
 * - Email (if Phase 2 implemented)
 * - Push (if Phase 3 implemented)
 *
 * @param interventionId - UUID of the intervention
 * @returns DispatchResult with success status per channel
 *
 * @example
 * const result = await dispatchInterventionCreated('intervention-uuid')
 * if (!result.success) {
 *   console.error('Failed channels:', result.data?.failedChannels)
 * }
 */
export async function dispatchInterventionCreated(interventionId: string): Promise<{
  success: boolean
  data?: DispatchResult
  error?: string
}> {
  try {
    // Auth check
    await getServerAuthContext('authenticated')

    logger.info(
      { interventionId },
      '📬 [DISPATCHER-ACTION] dispatchInterventionCreated called'
    )

    // Create dispatcher with dependencies (Phase 2: Email enabled)
    const notificationRepository = await createServerNotificationRepository()
    const interventionRepository = await createServerInterventionRepository()
    const userRepository = await createServerUserRepository()
    const buildingRepository = await createServerBuildingRepository()
    const lotRepository = await createServerLotRepository()

    // Create email notification service with all dependencies
    const emailService = createEmailService()
    const emailNotificationService = createEmailNotificationService(
      notificationRepository,
      emailService,
      interventionRepository,
      userRepository,
      buildingRepository,
      lotRepository
    )

    const dispatcher = createNotificationDispatcher(
      notificationRepository,
      emailNotificationService, // Phase 2: Email service enabled
      null  // Phase 3: Push service
    )

    // Dispatch to all channels
    const result = await dispatcher.dispatchInterventionCreated(interventionId)

    // Log summary
    if (!result.overallSuccess) {
      logger.warn(
        {
          interventionId,
          failedChannels: result.failedChannels,
          timings: result.timings
        },
        '⚠️ [DISPATCHER-ACTION] Some channels failed'
      )
    } else {
      logger.info(
        {
          interventionId,
          timings: result.timings
        },
        '✅ [DISPATCHER-ACTION] All channels succeeded'
      )
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error(
      { error, interventionId },
      '❌ [DISPATCHER-ACTION] dispatchInterventionCreated failed'
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Dispatch intervention status change notifications to all channels
 *
 * @param params - Status change parameters
 * @returns DispatchResult with success status per channel
 *
 * @example
 * const result = await dispatchInterventionStatusChange({
 *   interventionId: 'uuid',
 *   oldStatus: 'demande',
 *   newStatus: 'approuvee',
 *   teamId: 'team-uuid',
 *   changedBy: 'user-uuid'
 * })
 */
export async function dispatchInterventionStatusChange(params: {
  interventionId: string
  oldStatus: string
  newStatus: string
  teamId: string
  changedBy: string
  reason?: string
}): Promise<{
  success: boolean
  data?: DispatchResult
  error?: string
}> {
  try {
    // Auth check
    await getServerAuthContext('authenticated')

    logger.info(
      {
        interventionId: params.interventionId,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus
      },
      '📬 [DISPATCHER-ACTION] dispatchInterventionStatusChange called'
    )

    // Create dispatcher with dependencies (Phase 2: Email enabled)
    const notificationRepository = await createServerNotificationRepository()
    const interventionRepository = await createServerInterventionRepository()
    const userRepository = await createServerUserRepository()
    const buildingRepository = await createServerBuildingRepository()
    const lotRepository = await createServerLotRepository()

    // Create email notification service with all dependencies
    const emailService = createEmailService()
    const emailNotificationService = createEmailNotificationService(
      notificationRepository,
      emailService,
      interventionRepository,
      userRepository,
      buildingRepository,
      lotRepository
    )

    const dispatcher = createNotificationDispatcher(
      notificationRepository,
      emailNotificationService, // Phase 2: Email service enabled
      null  // Phase 3: Push service
    )

    // Dispatch to all channels
    const result = await dispatcher.dispatchInterventionStatusChange(params)

    // Log summary
    if (!result.overallSuccess) {
      logger.warn(
        {
          interventionId: params.interventionId,
          failedChannels: result.failedChannels
        },
        '⚠️ [DISPATCHER-ACTION] Some channels failed'
      )
    } else {
      logger.info(
        {
          interventionId: params.interventionId,
          timings: result.timings
        },
        '✅ [DISPATCHER-ACTION] All channels succeeded'
      )
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error(
      { error, interventionId: params.interventionId },
      '❌ [DISPATCHER-ACTION] dispatchInterventionStatusChange failed'
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================================================
// Future Dispatcher Actions (Stubs for Phase 4)
// ============================================================================

/**
 * Dispatch intervention approved notification
 * @stub Phase 4 - To be implemented
 */
export async function dispatchInterventionApproved(interventionId: string) {
  // Will call dispatchInterventionStatusChange with specific params
  throw new Error('Not implemented - Phase 4')
}

/**
 * Dispatch intervention rejected notification
 * @stub Phase 4 - To be implemented
 */
export async function dispatchInterventionRejected(interventionId: string) {
  throw new Error('Not implemented - Phase 4')
}

/**
 * Dispatch intervention completed notification
 * @stub Phase 4 - To be implemented
 */
export async function dispatchInterventionCompleted(interventionId: string) {
  throw new Error('Not implemented - Phase 4')
}

/**
 * Dispatch intervention scheduled notification
 * @stub Phase 4 - To be implemented
 */
export async function dispatchInterventionScheduled(interventionId: string) {
  throw new Error('Not implemented - Phase 4')
}

/**
 * Dispatch intervention cancelled notification
 * @stub Phase 4 - To be implemented
 */
export async function dispatchInterventionCancelled(interventionId: string) {
  throw new Error('Not implemented - Phase 4')
}
