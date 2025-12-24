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

import * as React from 'react'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '@/lib/services/domain/email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'
import type { Database } from '@/lib/database.types'
import { determineInterventionRecipients, type RecipientFilterOptions } from './notification-helpers'
import type { UserRole } from '@/lib/auth'

// React Email templates
import InterventionCreatedEmail from '@/emails/templates/interventions/intervention-created'
import InterventionAssignedPrestataireEmail from '@/emails/templates/interventions/intervention-assigned-prestataire'
import InterventionAssignedLocataireEmail from '@/emails/templates/interventions/intervention-assigned-locataire'
import InterventionApprovedEmail from '@/emails/templates/interventions/intervention-approved'
import InterventionRejectedEmail from '@/emails/templates/interventions/intervention-rejected'
import InterventionScheduledEmail from '@/emails/templates/interventions/intervention-scheduled'
import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import QuoteRequestEmail from '@/emails/templates/quotes/quote-request'

import type {
  InterventionCreatedEmailProps,
  InterventionAssignedPrestataireEmailProps,
  InterventionAssignedLocataireEmailProps,
  InterventionApprovedEmailProps,
  InterventionRejectedEmailProps,
  InterventionScheduledEmailProps,
  InterventionCompletedEmailProps,
  QuoteRequestEmailProps,
  EmailTimeSlot,
  EmailQuoteInfo
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

/**
 * Options pour sendInterventionEmails - fonction unifiée
 *
 * Permet de contrôler quels utilisateurs reçoivent des emails selon le contexte.
 *
 * @example
 * ```typescript
 * // Création: tout le monde sauf le créateur
 * await emailService.sendInterventionEmails({
 *   interventionId,
 *   eventType: 'created',
 *   excludeUserId: creatorId
 * })
 *
 * // Approbation: seulement locataire + prestataires assignés
 * await emailService.sendInterventionEmails({
 *   interventionId,
 *   eventType: 'approved',
 *   excludeUserId: managerId,
 *   excludeRoles: ['gestionnaire'],
 *   excludeNonPersonal: true
 * })
 * ```
 */
export interface InterventionEmailOptions {
  /** ID de l'intervention */
  interventionId: string

  /** Type d'événement déclencheur */
  eventType: 'created' | 'approved' | 'rejected' | 'scheduled' | 'status_changed' | 'completed'

  /** ID de l'utilisateur à exclure (généralement le créateur/acteur) */
  excludeUserId?: string | null

  /** Rôles à exclure complètement des destinataires */
  excludeRoles?: UserRole[]

  /** Si défini, SEULEMENT ces rôles recevront des notifications */
  onlyRoles?: UserRole[]

  /** Si true, exclut les membres d'équipe non directement assignés */
  excludeNonPersonal?: boolean

  /** Contexte pour changement de statut */
  statusChange?: {
    oldStatus: string
    newStatus: string
    reason?: string
  }
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

  // ══════════════════════════════════════════════════════════════
  // FONCTION UNIFIÉE - Réutilisable pour tous les événements
  // ══════════════════════════════════════════════════════════════

  /**
   * Fonction unifiée pour envoyer des emails de notification d'intervention
   *
   * Permet de filtrer les destinataires par rôle selon le contexte.
   *
   * @param options - Options de configuration (interventionId, eventType, filtres)
   * @returns Résultat de l'envoi batch
   *
   * @example
   * ```typescript
   * // Création: notifier tout le monde sauf le créateur
   * await service.sendInterventionEmails({
   *   interventionId,
   *   eventType: 'created',
   *   excludeUserId: creatorId
   * })
   *
   * // Approbation: notifier seulement le locataire
   * await service.sendInterventionEmails({
   *   interventionId,
   *   eventType: 'approved',
   *   excludeUserId: managerId,
   *   onlyRoles: ['locataire']
   * })
   *
   * // Clôture par prestataire: notifier seulement les gestionnaires
   * await service.sendInterventionEmails({
   *   interventionId,
   *   eventType: 'completed',
   *   excludeUserId: providerId,
   *   onlyRoles: ['gestionnaire']
   * })
   * ```
   */
  async sendInterventionEmails(options: InterventionEmailOptions): Promise<EmailBatchResult> {
    const {
      interventionId,
      eventType,
      excludeUserId,
      excludeRoles,
      onlyRoles,
      excludeNonPersonal,
      statusChange
    } = options

    const startTime = Date.now()
    logger.info(
      { interventionId, eventType, excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal },
      `📧 [EMAIL-NOTIFICATION] Starting intervention ${eventType} email batch`
    )

    // Pour l'instant, déléguer au batch existant pour 'created'
    // Les autres eventTypes seront implémentés progressivement
    if (eventType === 'created') {
      return this.sendInterventionCreatedBatch(
        interventionId,
        'intervention',
        { excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal }
      )
    }

    // TODO: Implémenter les autres eventTypes (approved, rejected, scheduled, completed)
    logger.warn(
      { interventionId, eventType },
      `⚠️ [EMAIL-NOTIFICATION] Event type '${eventType}' not yet implemented in unified method`
    )

    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      results: []
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MÉTHODES LEGACY (backward compatible)
  // ══════════════════════════════════════════════════════════════

  /**
   * Envoie les emails pour une intervention créée
   *
   * @param interventionId - ID de l'intervention
   * @param notificationType - Type de notification (doit être 'intervention')
   * @param filterOptions - Options de filtrage des destinataires (optionnel)
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionCreatedBatch(
    interventionId: string,
    notificationType: NotificationType,
    filterOptions?: {
      excludeUserId?: string | null
      excludeRoles?: UserRole[]
      onlyRoles?: UserRole[]
      excludeNonPersonal?: boolean
    }
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

      // 4bis. Récupérer les créneaux proposés
      // Note: On utilise le client service role pour bypasser RLS et voir TOUS les créneaux
      // (la RLS filtre par provider_id ce qui exclut les slots des autres prestataires)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 4bis: Fetching time slots')
      const supabase = createServiceRoleSupabaseClient()
      const { data: timeSlotsData } = await supabase
        .from('intervention_time_slots')
        .select('slot_date, start_time, end_time')
        .eq('intervention_id', interventionId)
        .order('slot_date', { ascending: true })

      const timeSlots: EmailTimeSlot[] = (timeSlotsData || []).map(slot => ({
        date: new Date(slot.slot_date),
        startTime: slot.start_time,
        endTime: slot.end_time,
      }))

      logger.info({ interventionId, timeSlotsCount: timeSlots.length }, '✅ [EMAIL-NOTIFICATION] Time slots fetched')

      // 4ter. Récupérer les infos devis (si applicable)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 4ter: Fetching quote info')
      const { data: quotesData } = await supabase
        .from('intervention_quotes')
        .select('amount, valid_until')
        .eq('intervention_id', interventionId)
        .limit(1)
        .maybeSingle()

      // Construire quoteInfo seulement si requires_quote est true ou si un devis existe
      const quoteInfo: EmailQuoteInfo | undefined = (intervention.requires_quote || quotesData) ? {
        isRequired: intervention.requires_quote === true,
        estimatedAmount: intervention.estimated_cost || quotesData?.amount || undefined,
        deadline: quotesData?.valid_until ? new Date(quotesData.valid_until) : undefined,
      } : undefined

      logger.info({ interventionId, hasQuote: !!quoteInfo, requiresQuote: intervention.requires_quote }, '✅ [EMAIL-NOTIFICATION] Quote info fetched')

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

      // 6. Déterminer les destinataires avec le helper partagé et options de filtrage
      logger.info({ interventionId, filterOptions }, '📧 [EMAIL-NOTIFICATION] Step 6: Determining recipients with filters')

      // Construire les options de filtrage
      const recipientFilterOptions: RecipientFilterOptions = {
        excludeUserId: filterOptions?.excludeUserId ?? interventionWithManagers.created_by,
        excludeRoles: filterOptions?.excludeRoles,
        onlyRoles: filterOptions?.onlyRoles,
        excludeNonPersonal: filterOptions?.excludeNonPersonal
      }

      const recipientList = determineInterventionRecipients(
        interventionWithManagers,
        recipientFilterOptions
      )

      logger.info({
        interventionId,
        recipientCount: recipientList.length,
        recipients: recipientList.map(r => ({ userId: r.userId, isPersonal: r.isPersonal, role: r.role })),
        filtersApplied: recipientFilterOptions,
        assignedManagers: interventionWithManagers.interventionAssignedManagers?.length || 0,
        assignedProviders: interventionWithManagers.interventionAssignedProviders?.length || 0,
        assignedTenants: interventionWithManagers.interventionAssignedTenants?.length || 0,
        assignedTenantIds: interventionWithManagers.interventionAssignedTenants || []
      }, '✅ [EMAIL-NOTIFICATION] Recipients determined with filters')

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
        recipientsWithoutEmail: usersResult.data.length - recipients.length,
        recipientsByRole: recipients.reduce((acc, r) => {
          acc[r.role] = (acc[r.role] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        recipientsWithoutEmailDetails: usersResult.data
          .filter(user => !user.email)
          .map(user => ({ userId: user.id, role: user.role, name: user.name }))
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

      // Nom du créateur (gestionnaire) pour les templates prestataire/locataire
      const creatorName = creator
        ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Le gestionnaire'
        : 'Le gestionnaire'

      const emailsToSend = recipients.map((recipient) => {
        // Props communes à tous les templates
        const baseProps = {
          firstName: recipient.first_name || recipient.email.split('@')[0],
          interventionRef: intervention.reference || 'N/A',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || intervention.title || '',
          propertyAddress: building?.address || 'Adresse non disponible',
          lotReference: lot?.reference,
          interventionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${recipient.role}/interventions/${interventionId}`,
          urgency: urgencyMap[intervention.urgency || 'normale'] || 'moyenne',
          createdAt: new Date(intervention.created_at),
        }

        // Dispatcher le template et le subject selon le rôle
        let emailContent: React.ReactElement
        let subject: string

        switch (recipient.role) {
          case 'prestataire':
            // Template prestataire: "Vous avez été assigné à une intervention"
            // Inclut les créneaux ET les infos devis
            const prestataireProps: InterventionAssignedPrestataireEmailProps = {
              ...baseProps,
              managerName: creatorName,
              timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
              quoteInfo: quoteInfo,
            }
            emailContent = InterventionAssignedPrestataireEmail(prestataireProps)
            subject = `🔧 Nouvelle mission ${baseProps.interventionRef} - ${baseProps.interventionType}`
            break

          case 'locataire':
            // Template locataire: "Une intervention est prévue pour votre logement"
            // Inclut les créneaux mais PAS les infos devis
            const locataireProps: InterventionAssignedLocataireEmailProps = {
              ...baseProps,
              managerName: creatorName,
              timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
              // Note: Pas de quoteInfo pour le locataire
            }
            emailContent = InterventionAssignedLocataireEmail(locataireProps)
            subject = `🏠 Intervention prévue ${baseProps.interventionRef} - ${baseProps.interventionType}`
            break

          case 'gestionnaire':
          default:
            // Template gestionnaire: "Nouvelle demande d'intervention" (existant)
            const gestionnaireProps: InterventionCreatedEmailProps = {
              ...baseProps,
              tenantName: creatorName, // Dans ce cas, c'est le gestionnaire qui a créé
            }
            emailContent = InterventionCreatedEmail(gestionnaireProps)
            subject = `📋 Nouvelle intervention ${baseProps.interventionRef} - ${baseProps.interventionType}`
            break
        }

        return {
          to: recipient.email,
          subject,
          react: emailContent,
          tags: [
            { name: 'type', value: 'intervention_created' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipient.role },
          ],
        }
      })

      // 9. Envoyer les emails avec throttling pour respecter le rate limit Resend (2 req/s)
      // Note: On utilise send() au lieu de sendBatch() car l'API Resend Batch
      // a des problèmes avec les pièces jointes CID (Content-ID) pour le logo.
      // L'API send() individuelle fonctionne correctement avec les CID attachments.
      // ⚠️ IMPORTANT: Resend limite à 2 requêtes par seconde, donc on envoie séquentiellement
      // avec un délai de 500ms entre chaque email pour respecter la limite.
      logger.info({ 
        interventionId, 
        emailCount: emailsToSend.length,
        rateLimit: '2 req/s (Resend)',
        strategy: 'sequential with 500ms delay + retry on 429'
      }, '📧 [EMAIL-NOTIFICATION] Step 9: Sending emails with throttling')

      const individualResults = []
      const RESEND_RATE_LIMIT_DELAY_MS = 500 // 500ms = 2 req/s max
      const MAX_RETRIES = 3
      const RETRY_DELAY_MS = 1000 // 1 seconde entre les retries

      for (let index = 0; index < emailsToSend.length; index++) {
        const email = emailsToSend[index]
        const recipient = recipients[index]

        // Ajouter un délai entre les emails (sauf le premier) pour respecter le rate limit
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS))
        }

        logger.info({
          interventionId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          subject: email.subject,
          emailIndex: index + 1,
          totalEmails: emailsToSend.length
        }, '📧 [EMAIL-NOTIFICATION] Sending email to recipient')

        // Envoyer avec retry automatique pour les erreurs 429 (rate limit)
        let result = await this.emailService.send(email)
        let retryCount = 0

        // Retry automatique pour les erreurs 429 (rate limit)
        while (!result.success && retryCount < MAX_RETRIES) {
          const isRateLimit = result.error?.includes('429') || 
                             result.error?.includes('rate_limit') || 
                             result.error?.includes('Too many requests')

          if (!isRateLimit) {
            // Pas une erreur de rate limit, ne pas retry
            break
          }

          retryCount++
          const retryDelay = RETRY_DELAY_MS * retryCount // Backoff exponentiel
          
          logger.warn({
            interventionId,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            retryCount,
            maxRetries: MAX_RETRIES,
            retryDelay,
            error: result.error
          }, '⚠️ [EMAIL-NOTIFICATION] Rate limit hit, retrying...')

          await new Promise(resolve => setTimeout(resolve, retryDelay))
          result = await this.emailService.send(email)
        }

        if (!result.success) {
          logger.error({
            interventionId,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
            error: result.error,
            retryCount
          }, '❌ [EMAIL-NOTIFICATION] Error sending email to recipient (after retries)')
        } else {
          logger.info({
            interventionId,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
            emailId: result.emailId,
            retryCount
          }, '✅ [EMAIL-NOTIFICATION] Email sent successfully to recipient')
        }

        individualResults.push({
          index,
          emailId: result.emailId,
          error: result.success ? undefined : result.error,
        })
      }

      const batchResult = {
        success: individualResults.every(r => !r.error),
        results: individualResults,
        sentCount: individualResults.filter(r => !r.error).length,
        failedCount: individualResults.filter(r => r.error).length,
      }

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
        '✅ [EMAIL-NOTIFICATION] Email sending completed via individual send() calls'
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
