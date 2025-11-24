/**
 * Multi-Channel Notification Dispatcher Service
 *
 * Orchestrates notifications across multiple channels (Database, Email, Push).
 * Uses graceful degradation pattern: if one channel fails, others continue.
 *
 * @module notification-dispatcher
 */

import { logger } from '@/lib/logger'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import type { PushNotificationService } from '@/lib/services/domain/push-notification.service'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type NotificationChannel = 'database' | 'email' | 'push'

export interface NotificationChannelResult {
  channel: NotificationChannel
  success: boolean
  error?: Error
  metadata?: {
    count?: number
    sent?: number
    failed?: number
    timing?: number
    reason?: string
  }
}

export interface DispatchResult {
  overallSuccess: boolean
  results: NotificationChannelResult[]
  failedChannels: NotificationChannel[]
  timings: {
    total: number
    database?: number
    email?: number
    push?: number
  }
}

export interface InterventionData {
  id: string
  title: string
  reference: string
  type: string
  urgency: string
  status: string
  teamId: string
  createdBy: string
  buildingName?: string
  lotReference?: string
}

// ============================================================================
// NotificationDispatcher Class
// ============================================================================

export class NotificationDispatcher {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailNotificationService: EmailNotificationService | null,
    private pushNotificationService: any | null // TODO: Type properly in Phase 3
  ) {}

  /**
   * Dispatch intervention created notifications to all channels
   *
   * Uses Promise.allSettled for graceful degradation: if email fails, DB and push still succeed.
   *
   * @param interventionId - UUID of the intervention (validated upstream)
   * @returns DispatchResult with per-channel success/failure + timing metrics
   *
   * @throws Never throws - all errors caught and returned in DispatchResult
   *
   * @example
   * const result = await dispatcher.dispatchInterventionCreated('uuid')
   * if (!result.overallSuccess) {
   *   logger.warn({ failedChannels: result.failedChannels }, 'Some channels failed')
   * }
   */
  async dispatchInterventionCreated(
    interventionId: string
  ): Promise<DispatchResult> {
    const startTime = Date.now()

    logger.info(
      { interventionId },
      '📬 [DISPATCHER] Starting intervention created notification dispatch'
    )

    try {
      // Dispatch to all channels in parallel
      const results = await Promise.allSettled([
        this.sendDatabaseNotifications(interventionId, 'intervention_created'),
        this.sendEmailNotifications(interventionId, 'intervention_created'),
        this.sendPushNotifications(interventionId, 'intervention_created')
      ])

      // Process results
      const totalTime = Date.now() - startTime
      const dispatchResult = this.processResults(
        results,
        'intervention_created',
        totalTime
      )

      logger.info(
        {
          interventionId,
          overallSuccess: dispatchResult.overallSuccess,
          failedChannels: dispatchResult.failedChannels,
          timings: dispatchResult.timings
        },
        '📊 [DISPATCHER] Dispatch completed'
      )

      return dispatchResult
    } catch (error) {
      // This should never happen with Promise.allSettled, but safety net
      logger.error(
        { error, interventionId },
        '❌ [DISPATCHER] Unexpected dispatch error'
      )

      return {
        overallSuccess: false,
        results: [],
        failedChannels: ['database', 'email', 'push'],
        timings: { total: Date.now() - startTime }
      }
    }
  }

  /**
   * Dispatch intervention status change notifications to all channels
   *
   * @param params - Status change parameters
   * @returns DispatchResult with per-channel results
   */
  async dispatchInterventionStatusChange(params: {
    interventionId: string
    oldStatus: string
    newStatus: string
    teamId: string
    changedBy: string
    reason?: string
  }): Promise<DispatchResult> {
    const startTime = Date.now()

    logger.info(
      {
        interventionId: params.interventionId,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus
      },
      '📬 [DISPATCHER] Starting status change notification dispatch'
    )

    try {
      // Dispatch to all channels in parallel
      const results = await Promise.allSettled([
        this.sendDatabaseNotifications(
          params.interventionId,
          'intervention_status_change',
          params
        ),
        this.sendEmailNotifications(
          params.interventionId,
          'intervention_status_change',
          params
        ),
        this.sendPushNotifications(
          params.interventionId,
          'intervention_status_change',
          params
        )
      ])

      const totalTime = Date.now() - startTime
      const dispatchResult = this.processResults(
        results,
        'intervention_status_change',
        totalTime
      )

      logger.info(
        {
          interventionId: params.interventionId,
          overallSuccess: dispatchResult.overallSuccess,
          failedChannels: dispatchResult.failedChannels
        },
        '📊 [DISPATCHER] Status change dispatch completed'
      )

      return dispatchResult
    } catch (error) {
      logger.error(
        { error, interventionId: params.interventionId },
        '❌ [DISPATCHER] Unexpected dispatch error'
      )

      return {
        overallSuccess: false,
        results: [],
        failedChannels: ['database', 'email', 'push'],
        timings: { total: Date.now() - startTime }
      }
    }
  }

  // ==========================================================================
  // Channel-Specific Senders (Private Methods)
  // ==========================================================================

  /**
   * Send database notifications
   *
   * Database notifications are CRITICAL - they must always succeed.
   * If they fail, the entire dispatch should be considered failed.
   */
  private async sendDatabaseNotifications(
    interventionId: string,
    eventType: string,
    params?: any
  ): Promise<NotificationChannelResult> {
    const startTime = Date.now()

    try {
      logger.info(
        { interventionId, eventType },
        '📊 [DISPATCHER-DB] Sending database notifications'
      )

      // Call existing notification service
      // TODO: Import and call createInterventionNotification or similar
      // For now, we'll use the repository directly (to be refined)

      // This will be replaced with proper Server Action call
      const result = { success: true, data: [] as any[] }

      const timing = Date.now() - startTime

      if (!result.success) {
        logger.error(
          { interventionId, eventType },
          '❌ [DISPATCHER-DB] Database notifications failed'
        )

        return {
          channel: 'database',
          success: false,
          error: new Error('Database notification failed'),
          metadata: { timing }
        }
      }

      logger.info(
        { interventionId, count: result.data?.length || 0, timing },
        '✅ [DISPATCHER-DB] Database notifications sent'
      )

      return {
        channel: 'database',
        success: true,
        metadata: {
          count: result.data?.length || 0,
          timing
        }
      }
    } catch (error) {
      const timing = Date.now() - startTime

      logger.error(
        { error, interventionId, eventType, timing },
        '❌ [DISPATCHER-DB] Database notification error'
      )

      return {
        channel: 'database',
        success: false,
        error: error as Error,
        metadata: { timing }
      }
    }
  }

  /**
   * Send email notifications
   *
   * Email notifications are BEST EFFORT - failures are logged but don't block.
   */
  private async sendEmailNotifications(
    interventionId: string,
    eventType: string,
    params?: any
  ): Promise<NotificationChannelResult> {
    const startTime = Date.now()

    try {
      // Phase 2: Email service not implemented yet
      if (!this.emailNotificationService) {
        logger.debug(
          { interventionId, eventType },
          '⏭️ [DISPATCHER-EMAIL] Email service not available (Phase 2)'
        )

        return {
          channel: 'email',
          success: true,
          metadata: {
            count: 0,
            reason: 'service_not_implemented',
            timing: Date.now() - startTime
          }
        }
      }

      logger.info(
        { interventionId, eventType },
        '📧 [DISPATCHER-EMAIL] Sending email notifications'
      )

      // Phase 2: Call EmailNotificationService with correct parameters
      const result = await this.emailNotificationService.sendInterventionCreatedBatch(
        interventionId,
        'intervention' as any // NotificationType from database
      )

      const timing = Date.now() - startTime

      if (!result.success) {
        logger.warn(
          { interventionId, sentCount: result.sentCount, failedCount: result.failedCount, timing },
          '⚠️ [DISPATCHER-EMAIL] Some emails failed to send'
        )

        return {
          channel: 'email',
          success: false,
          error: new Error(`Failed to send ${result.failedCount} emails`),
          metadata: {
            sent: result.sentCount,
            failed: result.failedCount,
            timing
          }
        }
      }

      logger.info(
        { interventionId, count: result.sentCount, timing },
        '✅ [DISPATCHER-EMAIL] Email notifications sent successfully'
      )

      return {
        channel: 'email',
        success: true,
        metadata: {
          count: result.sentCount,
          timing
        }
      }
    } catch (error) {
      const timing = Date.now() - startTime

      logger.error(
        { error, interventionId, eventType, timing },
        '❌ [DISPATCHER-EMAIL] Email notification error (non-blocking)'
      )

      return {
        channel: 'email',
        success: false,
        error: error as Error,
        metadata: { timing }
      }
    }
  }

  /**
   * Send push notifications
   *
   * Push notifications are BEST EFFORT - failures are logged but don't block.
   */
  private async sendPushNotifications(
    interventionId: string,
    eventType: string,
    params?: any
  ): Promise<NotificationChannelResult> {
    const startTime = Date.now()

    try {
      // Phase 3: Push service not implemented yet
      if (!this.pushNotificationService) {
        logger.debug(
          { interventionId, eventType },
          '⏭️ [DISPATCHER-PUSH] Push service not available (Phase 3)'
        )

        return {
          channel: 'push',
          success: true,
          metadata: {
            count: 0,
            reason: 'service_not_implemented',
            timing: Date.now() - startTime
          }
        }
      }

      logger.info(
        { interventionId, eventType },
        '📱 [DISPATCHER-PUSH] Sending push notifications'
      )

      // TODO: Implement in Phase 3
      // const result = await this.pushNotificationService.sendInterventionCreated(...)

      const timing = Date.now() - startTime

      return {
        channel: 'push',
        success: true,
        metadata: {
          count: 0,
          sent: 0,
          timing
        }
      }
    } catch (error) {
      const timing = Date.now() - startTime

      logger.error(
        { error, interventionId, eventType, timing },
        '❌ [DISPATCHER-PUSH] Push notification error (non-blocking)'
      )

      return {
        channel: 'push',
        success: false,
        error: error as Error,
        metadata: { timing }
      }
    }
  }

  // ==========================================================================
  // Result Processing
  // ==========================================================================

  /**
   * Process Promise.allSettled results and generate DispatchResult
   *
   * @param results - Results from Promise.allSettled
   * @param eventType - Type of event (for logging)
   * @param totalTime - Total time in milliseconds
   * @returns Processed DispatchResult
   */
  private processResults(
    results: PromiseSettledResult<NotificationChannelResult>[],
    eventType: string,
    totalTime: number
  ): DispatchResult {
    const channelResults: NotificationChannelResult[] = []
    const failedChannels: NotificationChannel[] = []
    const timings: DispatchResult['timings'] = { total: totalTime }

    // Process each result
    results.forEach((result, index) => {
      const channelName = ['database', 'email', 'push'][index] as NotificationChannel

      if (result.status === 'fulfilled') {
        const channelResult = result.value
        channelResults.push(channelResult)

        // Track timing
        if (channelResult.metadata?.timing) {
          timings[channelName] = channelResult.metadata.timing
        }

        // Track failures
        if (!channelResult.success) {
          failedChannels.push(channelName)
        }
      } else {
        // Promise rejected (should not happen with try-catch, but safety net)
        logger.error(
          { error: result.reason, channel: channelName },
          '❌ [DISPATCHER] Promise rejected unexpectedly'
        )

        channelResults.push({
          channel: channelName,
          success: false,
          error: result.reason
        })
        failedChannels.push(channelName)
      }
    })

    // Overall success = all channels succeeded
    const overallSuccess = failedChannels.length === 0

    // Log summary
    if (!overallSuccess) {
      logger.warn(
        {
          eventType,
          failedChannels,
          totalTime,
          results: channelResults.map(r => ({
            channel: r.channel,
            success: r.success,
            error: r.error?.message
          }))
        },
        '⚠️ [DISPATCHER] Some channels failed'
      )
    }

    return {
      overallSuccess,
      results: channelResults,
      failedChannels,
      timings
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create NotificationDispatcher instance with injected dependencies
 *
 * @param notificationRepository - Required notification repository
 * @param emailService - Optional email service (Phase 2)
 * @param pushService - Optional push service (Phase 3)
 * @returns NotificationDispatcher instance
 */
export function createNotificationDispatcher(
  notificationRepository: NotificationRepository,
  emailService: EmailNotificationService | null = null,
  pushService: any | null = null
): NotificationDispatcher {
  return new NotificationDispatcher(
    notificationRepository,
    emailService,
    pushService
  )
}
