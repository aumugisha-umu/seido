/**
 * 📧 EmailNotificationService - Multi-Channel Notifications (Email Channel)
 *
 * Phase 2 of multi-channel notification system
 *
 * Architecture:
 * - Integrates with NotificationDispatcher from Phase 1
 * - Uses Resend Batch API (max 100 emails/request)
 * - Leverages existing React Email templates
 * - Graceful degradation if Resend is not configured
 *
 * Dependencies:
 * - NotificationRepository (to get recipients)
 * - InterventionRepository (to get intervention details)
 * - EmailService (to send emails via Resend)
 * - React Email templates (intervention-created.tsx, etc.)
 *
 * @see lib/services/domain/notification-dispatcher.service.ts
 * @see lib/services/domain/email.service.ts
 */

import { logger } from '@/lib/logger'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '@/lib/services/domain/email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'
import type { Database } from '@/lib/database.types'
import { determineInterventionRecipients } from './notification-helpers'

// React Email templates
import InterventionCreatedEmail from '@/emails/templates/interventions/intervention-created'
import InterventionApprovedEmail from '@/emails/templates/interventions/intervention-approved'
import InterventionRejectedEmail from '@/emails/templates/interventions/intervention-rejected'
import InterventionScheduledEmail from '@/emails/templates/interventions/intervention-scheduled'
import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import QuoteRequestEmail from '@/emails/templates/quotes/quote-request'

import type {
  InterventionCreatedEmailProps,
  InterventionApprovedEmailProps,
  InterventionRejectedEmailProps,
  InterventionScheduledEmailProps,
  InterventionCompletedEmailProps,
  QuoteRequestEmailProps
} from '@/emails/utils/types'

import type { Intervention, User } from '../core/service-types'

type NotificationType = Database['public']['Enums']['notification_type']
type InterventionStatus = Database['public']['Enums']['intervention_status']

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/**
 * Résultat de l'envoi d'un email pour un utilisateur
 */
export interface EmailRecipientResult {
  userId: string
  email: string
  success: boolean
  emailId?: string
  error?: string
}

/**
 * Résultat de l'envoi d'emails par batch
 */
export interface EmailBatchResult {
  success: boolean
  sentCount: number
  failedCount: number
  results: EmailRecipientResult[]
}

// ══════════════════════════════════════════════════════════════
// EmailNotificationService
// ══════════════════════════════════════════════════════════════

/**
 * Service d'envoi de notifications par email
 *
 * Utilise Resend Batch API pour optimiser les envois multiples
 * S'intègre avec le NotificationDispatcher pour le système multi-canal
 */
export class EmailNotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService,
    private interventionRepository: InterventionRepository,
    private userRepository: UserRepository,
    private buildingRepository: BuildingRepository,
    private lotRepository: LotRepository
  ) { }

  /**
   * Envoie les emails pour une intervention créée
   *
   * @param interventionId - ID de l'intervention
   * @param notificationType - Type de notification (doit être 'intervention')
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionCreatedBatch(
    interventionId: string,
    notificationType: NotificationType
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, notificationType },
      '📧 [EMAIL-NOTIFICATION] Starting intervention created email batch'
    )

    try {
      // 1. Vérifier que Resend est configuré
      if (!this.emailService.isConfigured()) {
        logger.warn(
          { interventionId },
          '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping email sending'
        )
        return {
          success: false,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      // 2. Récupérer l'intervention complète avec tous les détails
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 2: Fetching intervention details')
      const interventionResult = await this.interventionRepository.findById(interventionId)

      if (!interventionResult.success || !interventionResult.data) {
        logger.error({
          interventionId,
          error: interventionResult.error || 'Not found'
        }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        throw new Error(`Intervention ${interventionId} not found`)
      }

      const intervention = interventionResult.data

      logger.info({
        interventionId,
        hasBuilding: !!intervention.building_id,
        hasLot: !!intervention.lot_id,
        hasCreatedBy: !!intervention.created_by
      }, '✅ [EMAIL-NOTIFICATION] Intervention loaded')

      // 3. Récupérer l'intervention enrichie avec managers (pour destinataires)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 3: Fetching intervention with managers')
      const interventionWithManagers = await this.notificationRepository.getInterventionWithManagers(interventionId)

      if (!interventionWithManagers) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Intervention managers data not found')
        throw new Error(`Intervention ${interventionId} managers data not found`)
      }

      logger.info({
        interventionId,
        assignedManagers: interventionWithManagers.interventionAssignedManagers?.length || 0,
        assignedProviders: interventionWithManagers.interventionAssignedProviders?.length || 0,
        assignedTenants: interventionWithManagers.interventionAssignedTenants?.length || 0,
        teamMembers: interventionWithManagers.teamMembers?.length || 0
      }, '✅ [EMAIL-NOTIFICATION] Intervention with managers loaded')

      // 4. Récupérer les données additionnelles (building, lot)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 4: Fetching building and lot')
      const buildingResult = intervention.building_id
        ? await this.buildingRepository.findById(intervention.building_id)
        : null

      const lotResult = intervention.lot_id
        ? await this.lotRepository.findById(intervention.lot_id)
        : null

      const building = buildingResult?.success ? buildingResult.data : null
      const lot = lotResult?.success ? lotResult.data : null

      logger.info({
        interventionId,
        hasBuilding: !!building,
        hasLot: !!lot
      }, '✅ [EMAIL-NOTIFICATION] Building and lot fetched')

      // 5. Récupérer le créateur
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 5: Fetching creator')
      const creatorResult = intervention.created_by
        ? await this.userRepository.findById(intervention.created_by)
        : null

      const creator = creatorResult?.success ? creatorResult.data : null

      logger.info({
        interventionId,
        hasCreator: !!creator,
        creatorId: intervention.created_by
      }, '✅ [EMAIL-NOTIFICATION] Creator fetched')

      // 6. Déterminer les destinataires avec le helper partagé
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 6: Determining recipients')
      const recipientList = determineInterventionRecipients(
        interventionWithManagers,
        interventionWithManagers.created_by // Exclure le créateur
      )

      logger.info({
        interventionId,
        recipientCount: recipientList.length,
        recipients: recipientList.map(r => ({ userId: r.userId, isPersonal: r.isPersonal }))
      }, '✅ [EMAIL-NOTIFICATION] Recipients determined')

      if (recipientList.length === 0) {
        logger.warn(
          { interventionId },
          '⚠️ [EMAIL-NOTIFICATION] No recipients found for intervention'
        )
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      // 7. Récupérer les détails des utilisateurs (email, first_name, role) en batch
      logger.info({ interventionId, userIdCount: recipientList.length }, '📧 [EMAIL-NOTIFICATION] Step 7: Fetching user details')
      const userIds = recipientList.map(r => r.userId)
      const usersResult = await this.userRepository.findByIds(userIds)

      if (!usersResult.success || !usersResult.data) {
        logger.error({
          interventionId,
          error: usersResult.error || 'Unknown error'
        }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        throw new Error('Failed to fetch user details for recipients')
      }

      logger.info({
        interventionId,
        usersFound: usersResult.data.length,
        usersRequested: userIds.length
      }, '✅ [EMAIL-NOTIFICATION] User details fetched')

      // Filtrer uniquement les utilisateurs avec email
      const recipients = usersResult.data.filter(user => user.email)

      logger.info({
        interventionId,
        recipientsWithEmail: recipients.length,
        recipientsWithoutEmail: usersResult.data.length - recipients.length
      }, '✅ [EMAIL-NOTIFICATION] Recipients filtered by email')

      if (recipients.length === 0) {
        logger.warn(
          { interventionId, totalRecipients: userIds.length },
          '⚠️ [EMAIL-NOTIFICATION] No recipients with email found'
        )
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      logger.info(
        { interventionId, count: recipients.length, totalRecipients: userIds.length },
        '📧 [EMAIL-NOTIFICATION] Found recipients with email'
      )

      // 8. Préparer tous les emails pour le batch (1 seule requête HTTP)
      logger.info({ interventionId, recipientCount: recipients.length }, '📧 [EMAIL-NOTIFICATION] Step 8: Preparing batch emails')

      // Mapper urgency de la DB vers le template
      const urgencyMap: Record<string, 'faible' | 'moyenne' | 'haute' | 'critique'> = {
        'basse': 'faible',
        'normale': 'moyenne',
        'haute': 'haute',
        'urgente': 'critique'
      }

      const emailsToSend = recipients.map((recipient) => {
        // Construire les props pour le template React Email
        const emailProps: InterventionCreatedEmailProps = {
          firstName: recipient.first_name || recipient.email.split('@')[0],
          interventionRef: intervention.reference || 'N/A',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || intervention.title || '',
          propertyAddress: building?.address || 'Adresse non disponible',
          lotReference: lot?.reference,
          interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${recipient.role}/interventions/${interventionId}`,
          tenantName:
            creator
              ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim()
              : 'Créateur',
          urgency: urgencyMap[intervention.urgency || 'normale'] || 'moyenne',
          createdAt: new Date(intervention.created_at),
        }

        return {
          to: recipient.email,
          subject: `🏠 Nouvelle intervention ${emailProps.interventionRef} - ${emailProps.interventionType}`,
          react: InterventionCreatedEmail(emailProps),
          tags: [
            { name: 'type', value: 'intervention_created' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipient.role },
          ],
        }
      })

      // 9. Envoyer via Resend Batch API (1 seule requête pour tous les emails)
      logger.info({ interventionId, emailCount: emailsToSend.length }, '📧 [EMAIL-NOTIFICATION] Step 9: Sending batch via Resend')
      const batchResult = await this.emailService.sendBatch(emailsToSend)

      // 10. Mapper les résultats batch vers le format EmailRecipientResult
      const results: EmailRecipientResult[] = batchResult.results.map((result) => {
        const recipient = recipients[result.index]
        return {
          userId: recipient.id,
          email: recipient.email,
          success: !result.error,
          emailId: result.emailId,
          error: result.error,
        }
      })

      // 11. Calculer les statistiques
      const sentCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing, totalEmails: recipients.length },
        '✅ [EMAIL-NOTIFICATION] Batch email sending completed via Resend Batch API'
      )

      return {
        success: failedCount === 0,
        sentCount,
        failedCount,
        results,
      }
    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        {
          interventionId,
          timing,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          error: error
        },
        '❌ [EMAIL-NOTIFICATION] Failed to send intervention created batch'
      )
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        results: [],
      }
    }
  }

  /**
   * Envoie les emails pour un changement de statut d'intervention
   *
   * @param interventionId - ID de l'intervention
   * @param oldStatus - Ancien statut
   * @param newStatus - Nouveau statut
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionStatusChangeBatch(
    interventionId: string,
    oldStatus: InterventionStatus,
    newStatus: InterventionStatus
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, oldStatus, newStatus },
      '📧 [EMAIL-NOTIFICATION] Starting status change email batch'
    )

    // Pour Phase 2, on implémente seulement intervention_created
    // Les autres templates seront ajoutés dans les phases suivantes
    logger.warn(
      { interventionId, oldStatus, newStatus },
      '⚠️ [EMAIL-NOTIFICATION] Status change emails not implemented yet (Phase 2 WIP)'
    )

    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      results: [],
    }
  }

  /**
   * Envoie un email "Nouvelle intervention créée"
   */
  async sendInterventionCreated(params: {
    intervention: Intervention
    property: { address: string; lotReference?: string }
    manager: User & { email: string }
    tenant: User
  }) {
    const { intervention, property, manager, tenant } = params

    // Mapper urgency
    const urgencyMap: Record<string, 'faible' | 'moyenne' | 'haute' | 'critique'> = {
      'basse': 'faible',
      'normale': 'moyenne',
      'haute': 'haute',
      'urgente': 'critique'
    }

    const emailProps: InterventionCreatedEmailProps = {
      firstName: manager.first_name || 'Gestionnaire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/interventions/${intervention.id}`,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      urgency: urgencyMap[intervention.urgency || 'normale'] || 'moyenne',
      createdAt: new Date(intervention.created_at || new Date().toISOString())
    }

    return this.emailService.send({
      to: manager.email,
      subject: `Nouvelle demande d'intervention : ${intervention.title}`,
      react: InterventionCreatedEmail(emailProps),
      tags: [{ name: 'type', value: 'intervention_created' }]
    })
  }

  /**
   * Envoie un email "Intervention approuvée"
   */
  async sendInterventionApproved(params: {
    intervention: Intervention
    property: { address: string; lotReference?: string }
    manager: User
    tenant: User & { email: string }
    approvalNotes?: string
  }) {
    const { intervention, property, manager, tenant, approvalNotes } = params

    const emailProps: InterventionApprovedEmailProps = {
      firstName: tenant.first_name || 'Locataire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/locataire/interventions/${intervention.id}`,
      managerName: `${manager.first_name} ${manager.last_name}`,
      approvedAt: new Date(),
      nextSteps: approvalNotes
    }

    return this.emailService.send({
      to: tenant.email,
      subject: `Votre demande d'intervention a été approuvée`,
      react: InterventionApprovedEmail(emailProps),
      tags: [{ name: 'type', value: 'intervention_approved' }]
    })
  }

  /**
   * Envoie un email "Intervention rejetée"
   */
  async sendInterventionRejected(params: {
    intervention: Intervention
    property: { address: string; lotReference?: string }
    manager: User
    tenant: User & { email: string }
    rejectionReason: string
  }) {
    const { intervention, property, manager, tenant, rejectionReason } = params

    const emailProps: InterventionRejectedEmailProps = {
      firstName: tenant.first_name || 'Locataire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/locataire/interventions/${intervention.id}`,
      managerName: `${manager.first_name} ${manager.last_name}`,
      rejectionReason,
      rejectedAt: new Date()
    }

    return this.emailService.send({
      to: tenant.email,
      subject: `Votre demande d'intervention a été refusée`,
      react: InterventionRejectedEmail(emailProps),
      tags: [{ name: 'type', value: 'intervention_rejected' }]
    })
  }

  /**
   * Envoie un email "Intervention planifiée"
   */
  async sendInterventionScheduled(params: {
    intervention: Intervention
    property: { address: string; lotReference?: string }
    tenant: User & { email: string }
    provider: User & { email: string }
    scheduledDate: Date
    estimatedDuration?: number
  }) {
    const { intervention, property, tenant, provider, scheduledDate, estimatedDuration } = params

    // Email pour le locataire
    const tenantProps: InterventionScheduledEmailProps = {
      firstName: tenant.first_name || 'Locataire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/locataire/interventions/${intervention.id}`,
      providerName: `${provider.first_name} ${provider.last_name}`,
      providerCompany: (provider as any).company_name, // TODO: Check type
      scheduledDate,
      estimatedDuration,
      recipientRole: 'locataire'
    }

    await this.emailService.send({
      to: tenant.email,
      subject: `Rendez-vous confirmé pour votre intervention`,
      react: InterventionScheduledEmail(tenantProps),
      tags: [{ name: 'type', value: 'intervention_scheduled_tenant' }]
    })

    // Email pour le prestataire
    const providerProps: InterventionScheduledEmailProps = {
      firstName: provider.first_name || 'Prestataire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/interventions/${intervention.id}`,
      providerName: 'Vous-même',
      scheduledDate,
      estimatedDuration,
      recipientRole: 'prestataire'
    }

    await this.emailService.send({
      to: provider.email,
      subject: `Nouvelle intervention planifiée`,
      react: InterventionScheduledEmail(providerProps),
      tags: [{ name: 'type', value: 'intervention_scheduled_provider' }]
    })
  }

  /**
   * Envoie un email "Intervention terminée"
   */
  async sendInterventionCompleted(params: {
    intervention: Intervention
    property: { address: string; lotReference?: string }
    tenant: User & { email: string }
    manager: User & { email: string }
    provider: User
    completionNotes?: string
    hasDocuments: boolean
  }) {
    const { intervention, property, tenant, manager, provider, completionNotes, hasDocuments } = params

    // Email pour le locataire
    const tenantProps: InterventionCompletedEmailProps = {
      firstName: tenant.first_name || 'Locataire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/locataire/interventions/${intervention.id}`,
      providerName: `${provider.first_name} ${provider.last_name}`,
      completedAt: new Date(),
      completionNotes,
      hasDocuments,
      recipientRole: 'locataire'
    }

    await this.emailService.send({
      to: tenant.email,
      subject: `Intervention terminée - Validation requise`,
      react: InterventionCompletedEmail(tenantProps),
      tags: [{ name: 'type', value: 'intervention_completed_tenant' }]
    })

    // Email pour le gestionnaire
    const managerProps: InterventionCompletedEmailProps = {
      firstName: manager.first_name || 'Gestionnaire',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      lotReference: property.lotReference,
      interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/interventions/${intervention.id}`,
      providerName: `${provider.first_name} ${provider.last_name}`,
      completedAt: new Date(),
      completionNotes,
      hasDocuments,
      recipientRole: 'gestionnaire'
    }

    await this.emailService.send({
      to: manager.email,
      subject: `Intervention terminée par le prestataire`,
      react: InterventionCompletedEmail(managerProps),
      tags: [{ name: 'type', value: 'intervention_completed_manager' }]
    })
  }

  /**
   * Envoie une demande de devis
   */
  async sendQuoteRequest(params: {
    quote: any // TODO: Typed Quote
    intervention: Intervention
    property: { address: string }
    manager: User
    provider: User & { email: string }
  }) {
    const { quote, intervention, property, manager, provider } = params

    const emailProps: QuoteRequestEmailProps = {
      firstName: provider.first_name || 'Prestataire',
      quoteRef: quote.reference || 'DEV-???',
      interventionRef: intervention.reference ?? 'REF-???',
      interventionType: intervention.type || 'Intervention',
      description: intervention.description,
      propertyAddress: property.address,
      quoteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/interventions/${intervention.id}/devis/${quote.id}`,
      managerName: `${manager.first_name} ${manager.last_name}`
    }

    return this.emailService.send({
      to: provider.email,
      subject: `Demande de devis pour intervention ${intervention.reference || ''}`,
      react: QuoteRequestEmail(emailProps),
      tags: [{ name: 'type', value: 'quote_request' }]
    })
  }

  /**
   * Vérifie si le service email est configuré
   */
  isConfigured(): boolean {
    return this.emailService.isConfigured()
  }
}

// ══════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Crée une instance de EmailNotificationService
 *
 * @param notificationRepository - Repository des notifications
 * @param emailService - Service d'envoi d'emails
 * @param interventionRepository - Repository des interventions
 * @param userRepository - Repository des utilisateurs
 * @param buildingRepository - Repository des buildings
 * @param lotRepository - Repository des lots
 * @returns Instance configurée
 */
export const createEmailNotificationService = (
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
