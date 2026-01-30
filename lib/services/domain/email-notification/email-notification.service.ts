/**
 * 📧 EmailNotificationService - Multi-Channel Notifications (Email Channel)
 *
 * Slim orchestrator that delegates to specialized components:
 * - InterventionDataEnricher: Data fetching
 * - BatchEmailSender: Rate-limited sending
 * - Builders: Template-specific email construction
 *
 * @module email-notification/email-notification.service
 *
 * @example
 * ```typescript
 * const service = new EmailNotificationService(...)
 * await service.sendInterventionEmails({
 *   interventionId,
 *   eventType: 'created',
 *   excludeUserId: creatorId
 * })
 * ```
 */

import { logger } from '@/lib/logger'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '../email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'

import { InterventionDataEnricher, createDataEnricher } from './data-enricher'
import { BatchEmailSender, createBatchEmailSender } from './email-sender'
import { formatUserName } from './helpers'

import { buildInterventionCreatedEmail } from './builders/intervention-created.builder'
import { buildInterventionScheduledEmail } from './builders/intervention-scheduled.builder'
import { buildTimeSlotsProposedEmail } from './builders/time-slots-proposed.builder'
import { buildInterventionCompletedEmail } from './builders/intervention-completed.builder'
import { buildInterventionStatusChangedEmail } from './builders/intervention-status-changed.builder'
import {
  buildQuoteRequestEmail,
  buildQuoteSubmittedEmail,
  buildQuoteApprovedEmail,
  buildQuoteRejectedEmail
} from './builders/quote-emails.builder'

import type {
  InterventionEmailOptions,
  EmailBatchResult,
  RecipientFilterOptions,
  NotificationType
} from './types'
import type { Intervention, User } from '../../core/service-types'
import type { UserRole } from '@/lib/auth'

// ══════════════════════════════════════════════════════════════
// EmailNotificationService
// ══════════════════════════════════════════════════════════════

/**
 * Service for sending intervention-related email notifications.
 * Orchestrates data enrichment, email building, and batch sending.
 */
export class EmailNotificationService {
  private enricher: InterventionDataEnricher
  private sender: BatchEmailSender

  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService,
    private interventionRepository: InterventionRepository,
    private userRepository: UserRepository,
    private buildingRepository: BuildingRepository,
    private lotRepository: LotRepository
  ) {
    this.enricher = createDataEnricher(
      interventionRepository,
      notificationRepository,
      userRepository,
      buildingRepository,
      lotRepository
    )
    this.sender = createBatchEmailSender(emailService)
  }

  // ══════════════════════════════════════════════════════════════
  // UNIFIED FUNCTION
  // ══════════════════════════════════════════════════════════════

  /**
   * Unified function to send intervention notification emails
   *
   * @param options - Configuration options
   * @returns Batch result
   */
  async sendInterventionEmails(options: InterventionEmailOptions): Promise<EmailBatchResult> {
    const {
      interventionId,
      eventType,
      excludeUserId,
      excludeRoles,
      onlyRoles,
      excludeNonPersonal,
      schedulingContext
    } = options

    logger.info(
      { interventionId, eventType, excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal },
      `📧 [EMAIL-NOTIFICATION] Starting intervention ${eventType} email batch`
    )

    const filterOptions: RecipientFilterOptions = {
      excludeUserId,
      excludeRoles,
      onlyRoles,
      excludeNonPersonal
    }

    // Delegate to appropriate batch method
    switch (eventType) {
      case 'created':
        return this.sendInterventionCreatedBatch(interventionId, 'intervention', filterOptions)

      case 'scheduled':
        return this.sendInterventionScheduledBatch(interventionId, filterOptions)

      case 'time_slots_proposed':
        if (!schedulingContext) {
          logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Missing schedulingContext for time_slots_proposed')
          return { success: false, sentCount: 0, failedCount: 0, results: [] }
        }
        return this.sendTimeSlotsProposedBatch(interventionId, schedulingContext, filterOptions)

      case 'completed':
        return this.sendInterventionCompletedBatch(interventionId, filterOptions)

      case 'status_changed':
        return this.sendInterventionStatusChangedBatch(interventionId, options.statusChange, filterOptions)

      case 'approved':
      case 'rejected':
        logger.warn(
          { interventionId, eventType },
          `⚠️ [EMAIL-NOTIFICATION] Event type '${eventType}' not yet implemented`
        )
        return { success: true, sentCount: 0, failedCount: 0, results: [] }

      default:
        logger.warn(
          { interventionId, eventType },
          `⚠️ [EMAIL-NOTIFICATION] Unknown event type '${eventType}'`
        )
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BATCH METHODS
  // ══════════════════════════════════════════════════════════════

  /**
   * Send emails for a created intervention
   */
  async sendInterventionCreatedBatch(
    interventionId: string,
    notificationType: NotificationType,
    filterOptions?: RecipientFilterOptions
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()

    // Check if configured
    if (!this.sender.isConfigured()) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping')
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    // Enrich data
    const enrichedData = await this.enricher.enrich(interventionId, {
      includeTimeSlots: true,
      includeQuoteInfo: true,
      includeAttachments: true,
      includeCreator: true
    })

    if (!enrichedData) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    // Get recipients
    const recipients = await this.enricher.getRecipients(interventionId, {
      excludeUserId: filterOptions?.excludeUserId ?? enrichedData.creator?.id,
      excludeRoles: filterOptions?.excludeRoles,
      onlyRoles: filterOptions?.onlyRoles,
      excludeNonPersonal: filterOptions?.excludeNonPersonal
    })

    if (recipients.length === 0) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] No recipients found')
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    // Get creator name
    const creatorName = formatUserName(enrichedData.creator, 'Le gestionnaire')

    // Send batch
    const result = await this.sender.sendBatch({
      recipients,
      buildEmail: async (recipient, magicLinkUrl) => {
        return buildInterventionCreatedEmail({
          enrichedData,
          recipient,
          magicLinkUrl,
          creatorName
        })
      },
      interventionId,
      eventType: 'created',
      redirectBasePath: ''
    })

    const timing = Date.now() - startTime
    logger.info({ interventionId, ...result, timing }, '✅ [EMAIL-NOTIFICATION] Created batch completed')

    return result
  }

  /**
   * Send emails for a scheduled intervention (confirmed slot)
   */
  async sendInterventionScheduledBatch(
    interventionId: string,
    filterOptions?: RecipientFilterOptions
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()

    if (!this.sender.isConfigured()) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const enrichedData = await this.enricher.enrich(interventionId, {
      confirmedSlotOnly: true,
      includeProviderInfo: true
    })

    if (!enrichedData || !enrichedData.confirmedSlot) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] No confirmed slot found')
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    const recipients = await this.enricher.getRecipients(interventionId, filterOptions)

    if (recipients.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    const result = await this.sender.sendBatch({
      recipients,
      buildEmail: async (recipient, magicLinkUrl) => {
        const recipientRole = recipient.role === 'prestataire' ? 'prestataire' : 'locataire'
        return buildInterventionScheduledEmail({
          enrichedData,
          recipient,
          magicLinkUrl,
          recipientRole
        })
      },
      interventionId,
      eventType: 'scheduled',
      redirectBasePath: ''
    })

    const timing = Date.now() - startTime
    logger.info({ interventionId, ...result, timing }, '✅ [EMAIL-NOTIFICATION] Scheduled batch completed')

    return result
  }

  /**
   * Send emails for proposed time slots
   */
  async sendTimeSlotsProposedBatch(
    interventionId: string,
    schedulingContext: {
      planningType: 'direct' | 'propose' | 'organize'
      managerName: string
      proposedSlots?: Array<{ id?: string; date: string; startTime: string; endTime: string }>
    },
    filterOptions?: RecipientFilterOptions
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()

    if (!this.sender.isConfigured()) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const enrichedData = await this.enricher.enrich(interventionId, {
      includeTimeSlots: true
    })

    if (!enrichedData) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const recipients = await this.enricher.getRecipients(interventionId, filterOptions)

    if (recipients.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    const result = await this.sender.sendBatch({
      recipients,
      buildEmail: async (recipient, magicLinkUrl) => {
        const recipientRole = recipient.role === 'prestataire' ? 'prestataire' : 'locataire'
        return buildTimeSlotsProposedEmail({
          enrichedData,
          recipient,
          magicLinkUrl,
          recipientRole,
          schedulingContext: {
            planningType: schedulingContext.planningType,
            managerName: schedulingContext.managerName
          }
        })
      },
      interventionId,
      eventType: 'time_slots_proposed',
      redirectBasePath: ''
    })

    const timing = Date.now() - startTime
    logger.info({ interventionId, ...result, timing }, '✅ [EMAIL-NOTIFICATION] Time slots batch completed')

    return result
  }

  /**
   * Send emails for a completed intervention
   */
  async sendInterventionCompletedBatch(
    interventionId: string,
    filterOptions?: RecipientFilterOptions
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()

    if (!this.sender.isConfigured()) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const enrichedData = await this.enricher.enrich(interventionId, {
      includeAttachments: true,
      includeProviderInfo: true
    })

    if (!enrichedData) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const recipients = await this.enricher.getRecipients(interventionId, filterOptions)

    if (recipients.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    const result = await this.sender.sendBatch({
      recipients,
      buildEmail: async (recipient, magicLinkUrl) => {
        const recipientRole = recipient.role === 'locataire' ? 'locataire' : 'gestionnaire'
        return buildInterventionCompletedEmail({
          enrichedData,
          recipient,
          magicLinkUrl,
          recipientRole
        })
      },
      interventionId,
      eventType: 'completed',
      redirectBasePath: ''
    })

    const timing = Date.now() - startTime
    logger.info({ interventionId, ...result, timing }, '✅ [EMAIL-NOTIFICATION] Completed batch finished')

    return result
  }

  /**
   * Send emails for a status change
   */
  async sendInterventionStatusChangedBatch(
    interventionId: string,
    statusChange?: { oldStatus: string; newStatus: string; reason?: string; actorName?: string },
    filterOptions?: RecipientFilterOptions
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()

    if (!statusChange) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] No statusChange context provided')
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    if (!this.sender.isConfigured()) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const enrichedData = await this.enricher.enrich(interventionId)

    if (!enrichedData) {
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }

    const recipients = await this.enricher.getRecipients(interventionId, filterOptions)

    if (recipients.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    const result = await this.sender.sendBatch({
      recipients,
      buildEmail: async (recipient, magicLinkUrl) => {
        return buildInterventionStatusChangedEmail({
          enrichedData,
          recipient,
          magicLinkUrl,
          recipientRole: recipient.role as 'locataire' | 'gestionnaire' | 'prestataire',
          statusChange
        })
      },
      interventionId,
      eventType: 'status_changed',
      redirectBasePath: ''
    })

    const timing = Date.now() - startTime
    logger.info({ interventionId, ...result, timing }, '✅ [EMAIL-NOTIFICATION] Status changed batch finished')

    return result
  }

  /**
   * @deprecated Use sendInterventionEmails with statusChange context
   */
  async sendInterventionStatusChangeBatch(
    interventionId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<EmailBatchResult> {
    logger.warn(
      { interventionId, oldStatus, newStatus },
      '⚠️ [EMAIL-NOTIFICATION] sendInterventionStatusChangeBatch is deprecated'
    )
    return { success: true, sentCount: 0, failedCount: 0, results: [] }
  }

  // ══════════════════════════════════════════════════════════════
  // DIRECT SEND METHODS (for single emails)
  // ══════════════════════════════════════════════════════════════

  /**
   * Send a quote request email to a provider
   */
  async sendQuoteRequest(params: {
    quote: { id: string; reference?: string | null }
    intervention: Intervention
    property: { address: string }
    manager: User
    provider: User & { email: string }
  }) {
    const email = await buildQuoteRequestEmail(params)
    return this.sender.sendDirect(email)
  }

  /**
   * Send a quote submitted email to a manager
   */
  async sendQuoteSubmitted(params: {
    quote: { id: string; reference?: string | null; amount?: number | null }
    intervention: Intervention
    property: { address: string }
    manager: User & { email: string }
    provider: User
  }) {
    const email = await buildQuoteSubmittedEmail(params)
    return this.sender.sendDirect(email)
  }

  /**
   * Send a quote approved email to a provider
   */
  async sendQuoteApproved(params: {
    quote: { id: string; reference?: string | null; amount?: number | null }
    intervention: Intervention
    property: { address: string }
    manager: User
    provider: User & { email: string }
    approvalNotes?: string
  }) {
    const email = await buildQuoteApprovedEmail(params)
    return this.sender.sendDirect(email)
  }

  /**
   * Send a quote rejected email to a provider
   */
  async sendQuoteRejected(params: {
    quote: { id: string; reference?: string | null }
    intervention: Intervention
    property: { address: string }
    manager: User
    provider: User & { email: string }
    rejectionReason?: string
    canResubmit?: boolean
  }) {
    const email = await buildQuoteRejectedEmail(params)
    return this.sender.sendDirect(email)
  }

  /**
   * Check if the email service is configured
   */
  isConfigured(): boolean {
    return this.emailService.isConfigured()
  }
}

// ══════════════════════════════════════════════════════════════
// Factory
// ══════════════════════════════════════════════════════════════

/**
 * Create an EmailNotificationService with dependencies
 */
export const createEmailNotificationServiceWithDeps = (
  notificationRepository: NotificationRepository,
  emailService: EmailService,
  interventionRepository: InterventionRepository,
  userRepository: UserRepository,
  buildingRepository: BuildingRepository,
  lotRepository: LotRepository
): EmailNotificationService => {
  return new EmailNotificationService(
    notificationRepository,
    emailService,
    interventionRepository,
    userRepository,
    buildingRepository,
    lotRepository
  )
}
