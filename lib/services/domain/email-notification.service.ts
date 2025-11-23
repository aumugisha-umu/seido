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

// React Email templates
import InterventionCreatedEmail from '@/emails/templates/interventions/intervention-created'
import type {
  InterventionCreatedEmailProps,
} from '@/emails/utils/types'

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

/**
 * Données enrichies d'une intervention pour les templates
 */
interface EnrichedInterventionData {
  intervention: Database['public']['Tables']['interventions']['Row']
  building: Database['public']['Tables']['buildings']['Row'] | null
  lot: Database['public']['Tables']['lots']['Row'] | null
  tenant: Database['public']['Tables']['users']['Row'] | null
  manager: Database['public']['Tables']['users']['Row'] | null
  provider: Database['public']['Tables']['users']['Row'] | null
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
  ) {}

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

      // 2. Récupérer les données enrichies de l'intervention
      const enrichedData = await this.fetchEnrichedInterventionData(interventionId)

      if (!enrichedData) {
        throw new Error(`Intervention ${interventionId} not found or data incomplete`)
      }

      // 3. Récupérer les destinataires depuis le repository
      const recipients = await this.notificationRepository.getNotificationRecipients(
        interventionId,
        notificationType
      )

      if (recipients.length === 0) {
        logger.info(
          { interventionId },
          '📧 [EMAIL-NOTIFICATION] No recipients found for intervention'
        )
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      logger.info(
        { interventionId, count: recipients.length },
        '📧 [EMAIL-NOTIFICATION] Found recipients'
      )

      // 4. Préparer les emails pour chaque destinataire
      const emailPromises = recipients.map(async (recipient) => {
        try {
          // Construire les props pour le template React Email
          const emailProps: InterventionCreatedEmailProps = {
            firstName: recipient.first_name || recipient.email.split('@')[0],
            interventionRef: enrichedData.intervention.reference || 'N/A',
            interventionType: enrichedData.intervention.type || 'Intervention',
            description: enrichedData.intervention.description || '',
            propertyAddress: enrichedData.building?.address || 'Adresse non disponible',
            lotReference: enrichedData.lot?.reference,
            interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${recipient.role}/interventions/${interventionId}`,
            tenantName:
              enrichedData.tenant
                ? `${enrichedData.tenant.first_name || ''} ${enrichedData.tenant.last_name || ''}`.trim()
                : 'Locataire',
            urgency: (enrichedData.intervention.urgency as 'faible' | 'moyenne' | 'haute' | 'critique') || 'moyenne',
            createdAt: new Date(enrichedData.intervention.created_at),
          }

          // Envoyer l'email via EmailService
          const result = await this.emailService.send({
            to: recipient.email,
            subject: `🏠 Nouvelle intervention ${emailProps.interventionRef} - ${emailProps.interventionType}`,
            react: InterventionCreatedEmail(emailProps),
            tags: [
              { name: 'type', value: 'intervention_created' },
              { name: 'intervention_id', value: interventionId },
              { name: 'user_role', value: recipient.role },
            ],
          })

          return {
            userId: recipient.id,
            email: recipient.email,
            success: result.success,
            emailId: result.emailId,
            error: result.error,
          } satisfies EmailRecipientResult
        } catch (error) {
          logger.error(
            { error, userId: recipient.id, email: recipient.email },
            '❌ [EMAIL-NOTIFICATION] Failed to send email to recipient'
          )
          return {
            userId: recipient.id,
            email: recipient.email,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          } satisfies EmailRecipientResult
        }
      })

      // 5. Attendre tous les envois (Promise.allSettled pour graceful degradation)
      const results = await Promise.all(emailPromises)

      // 6. Calculer les statistiques
      const sentCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing },
        '✅ [EMAIL-NOTIFICATION] Batch email sending completed'
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
        { error, interventionId, timing },
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
   * Récupère les données enrichies d'une intervention
   * (intervention + building + lot + tenant + manager)
   *
   * @param interventionId - ID de l'intervention
   * @returns Données enrichies ou null si introuvable
   */
  private async fetchEnrichedInterventionData(
    interventionId: string
  ): Promise<EnrichedInterventionData | null> {
    try {
      // 1. Récupérer l'intervention
      const intervention = await this.interventionRepository.getById(interventionId)
      if (!intervention) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Intervention not found')
        return null
      }

      // 2. Récupérer le building
      const building = intervention.building_id
        ? await this.buildingRepository.getById(intervention.building_id)
        : null

      // 3. Récupérer le lot
      const lot = intervention.lot_id
        ? await this.lotRepository.getById(intervention.lot_id)
        : null

      // 4. Récupérer le tenant (locataire créateur)
      const tenant = intervention.tenant_id
        ? await this.userRepository.getById(intervention.tenant_id)
        : null

      // 5. Récupérer le manager (gestionnaire assigné)
      const manager = intervention.assigned_to
        ? await this.userRepository.getById(intervention.assigned_to)
        : null

      // 6. Récupérer le provider (prestataire assigné)
      const provider = intervention.provider_id
        ? await this.userRepository.getById(intervention.provider_id)
        : null

      return {
        intervention,
        building,
        lot,
        tenant,
        manager,
        provider,
      }
    } catch (error) {
      logger.error(
        { error, interventionId },
        '❌ [EMAIL-NOTIFICATION] Failed to fetch enriched intervention data'
      )
      return null
    }
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
