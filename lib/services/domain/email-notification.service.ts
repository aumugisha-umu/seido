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
import { EmailReplyService } from './email-reply.service'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '@/lib/services/domain/email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'
import type { Database } from '@/lib/database.types'
import { determineInterventionRecipients, type RecipientFilterOptions } from './notification-helpers'
import { generateMagicLinksBatch } from './magic-link.service'
import type { UserRole } from '@/lib/auth'

// React Email templates
import InterventionCreatedEmail from '@/emails/templates/interventions/intervention-created'
import InterventionAssignedPrestataireEmail from '@/emails/templates/interventions/intervention-assigned-prestataire'
import InterventionAssignedLocataireEmail from '@/emails/templates/interventions/intervention-assigned-locataire'
import InterventionApprovedEmail from '@/emails/templates/interventions/intervention-approved'
import InterventionRejectedEmail from '@/emails/templates/interventions/intervention-rejected'
import InterventionScheduledEmail from '@/emails/templates/interventions/intervention-scheduled'
import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import TimeSlotsProposedEmail from '@/emails/templates/interventions/time-slots-proposed'
import QuoteRequestEmail from '@/emails/templates/quotes/quote-request'

import type {
  InterventionCreatedEmailProps,
  InterventionAssignedPrestataireEmailProps,
  InterventionAssignedLocataireEmailProps,
  InterventionApprovedEmailProps,
  InterventionRejectedEmailProps,
  InterventionScheduledEmailProps,
  InterventionCompletedEmailProps,
  TimeSlotsProposedEmailProps,
  QuoteRequestEmailProps,
  EmailTimeSlot,
  EmailQuoteInfo,
  EmailAttachment
} from '@/emails/utils/types'

import type { Intervention, User } from '../core/service-types'

type NotificationType = Database['public']['Enums']['notification_type']
type InterventionStatus = Database['public']['Enums']['intervention_status']

// ══════════════════════════════════════════════════════════════
// Constants for rate limiting
// ══════════════════════════════════════════════════════════════

/** Délai entre chaque email pour éviter le rate limiting Resend (500ms = 2 req/s max) */
const RESEND_RATE_LIMIT_DELAY_MS = 500

/** Nombre max de retries pour erreurs 429 (rate limit) */
const MAX_RETRIES = 3

/** Délai de base pour retry exponentiel (ms) */
const RETRY_DELAY_MS = 1000

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * Formate l'adresse d'une propriété au format "code postal, ville, pays"
 *
 * Gère deux cas:
 * 1. Lot indépendant (sans building_id): utilise les champs du lot
 * 2. Lot lié à un building ou building direct: utilise les champs du building
 *
 * @param building - Données du building (peut être null)
 * @param lot - Données du lot (peut être null)
 * @returns Adresse formatée ou "Adresse non disponible"
 */
function formatPropertyAddress(
  building: { postal_code?: string; city?: string; country?: string } | null,
  lot: { building_id?: string | null; postal_code?: string | null; city?: string | null; country?: string | null } | null
): string {
  // Cas 1: Lot indépendant (pas de building_id)
  if (lot && !lot.building_id) {
    const parts = [lot.postal_code, lot.city, lot.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible'
  }

  // Cas 2: Building (lot lié ou intervention directe sur building)
  if (building) {
    const parts = [building.postal_code, building.city, building.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible'
  }

  return 'Adresse non disponible'
}

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
  eventType: 'created' | 'approved' | 'rejected' | 'scheduled' | 'time_slots_proposed' | 'status_changed' | 'completed'

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

  /** Contexte pour créneaux proposés (time_slots_proposed) */
  schedulingContext?: {
    planningType: 'direct' | 'propose' | 'organize'
    managerName: string
    proposedSlots?: Array<{ date: string; startTime: string; endTime: string }>
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
      schedulingContext
      // statusChange - reserved for future status change email implementations
    } = options

    logger.info(
      { interventionId, eventType, excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal },
      `📧 [EMAIL-NOTIFICATION] Starting intervention ${eventType} email batch`
    )

    const filterOptions = { excludeUserId, excludeRoles, onlyRoles, excludeNonPersonal }

    // Déléguer au batch approprié selon le type d'événement
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
        // TODO: Implémenter ces eventTypes
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

  /**
   * Envoie les emails pour une intervention planifiée (créneau confirmé)
   *
   * Destinataires: Locataires + Prestataires assignés (pas les gestionnaires)
   *
   * @param interventionId - ID de l'intervention
   * @param filterOptions - Options de filtrage des destinataires
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionScheduledBatch(
    interventionId: string,
    filterOptions?: {
      excludeUserId?: string | null
      excludeRoles?: UserRole[]
      onlyRoles?: UserRole[]
      excludeNonPersonal?: boolean
    }
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, filterOptions },
      '📧 [EMAIL-NOTIFICATION] Starting intervention scheduled email batch'
    )

    try {
      // 1. Vérifier que Resend est configuré
      if (!this.emailService.isConfigured()) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 2. Récupérer l'intervention avec le créneau confirmé
      const interventionResult = await this.interventionRepository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const intervention = interventionResult.data

      // 3. Récupérer le créneau confirmé (is_selected = true)
      const serviceClient = createServiceRoleSupabaseClient()
      const { data: confirmedSlot } = await serviceClient
        .from('intervention_time_slots')
        .select('*')
        .eq('intervention_id', interventionId)
        .eq('is_selected', true)
        .single()

      if (!confirmedSlot) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] No confirmed slot found - skipping email')
        return { success: true, sentCount: 0, failedCount: 0, results: [] }
      }

      // 4. Récupérer les données enrichies pour les destinataires
      const enrichedIntervention = await this.notificationRepository.getInterventionWithManagers(interventionId)
      if (!enrichedIntervention) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Could not enrich intervention')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 5. Déterminer les destinataires avec filtrage
      const allRecipients = determineInterventionRecipients(enrichedIntervention, filterOptions || {})

      // 6. Récupérer les détails utilisateurs pour les emails (auth-only)
      // ✅ NOTIFICATION FIX (Jan 2026): N'envoyer des emails qu'aux users qui peuvent se connecter
      const userIds = allRecipients.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)
      if (!usersResult.success || !usersResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const recipients = usersResult.data.filter(user => user.email)

      if (recipients.length === 0) {
        logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] No recipients for scheduled email')
        return { success: true, sentCount: 0, failedCount: 0, results: [] }
      }

      // 7. Récupérer infos prestataire (premier assigné)
      let providerInfo = { name: 'Prestataire', company: '', phone: '' }
      const primaryProvider = enrichedIntervention.interventionAssignedProviders[0]
      if (primaryProvider) {
        const providerResult = await this.userRepository.findById(primaryProvider)
        if (providerResult.success && providerResult.data) {
          providerInfo = {
            name: `${providerResult.data.first_name || ''} ${providerResult.data.last_name || ''}`.trim() || 'Prestataire',
            company: providerResult.data.company_name || '',
            phone: providerResult.data.phone || ''
          }
        }
      }

      // 8. Récupérer adresse du bien
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined
      if (intervention.lot_id) {
        const lotResult = await this.lotRepository.findById(intervention.lot_id)
        if (lotResult.success && lotResult.data) {
          lotReference = lotResult.data.reference || undefined
          if (lotResult.data.building_id) {
            const buildingResult = await this.buildingRepository.findById(lotResult.data.building_id)
            if (buildingResult.success && buildingResult.data) {
              propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
            }
          }
        }
      } else if (intervention.building_id) {
        const buildingResult = await this.buildingRepository.findById(intervention.building_id)
        if (buildingResult.success && buildingResult.data) {
          propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
        }
      }

      // 9. Construire la date du RDV
      const scheduledDate = new Date(`${confirmedSlot.slot_date}T${confirmedSlot.start_time}`)

      // 9bis. Générer les magic links pour tous les destinataires
      const magicLinkRecipients = recipients.map(r => {
        const recipientMeta = allRecipients.find(rec => rec.userId === r.id)
        const role = recipientMeta?.role === 'prestataire' ? 'prestataire' : 'locataire'
        return {
          email: r.email,
          redirectTo: `/${role}/interventions/${intervention.id}`
        }
      })
      const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)

      // 10. Préparer et envoyer les emails
      const results: EmailRecipientResult[] = []

      for (const [index, recipient] of recipients.entries()) {
        // Délai entre les envois pour éviter rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS))
        }

        // Déterminer le rôle du destinataire
        const recipientMeta = allRecipients.find(r => r.userId === recipient.id)
        const recipientRole = recipientMeta?.role === 'prestataire' ? 'prestataire' : 'locataire'

        // Utiliser le magic link si disponible, sinon fallback sur l'URL directe
        const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipientRole}/interventions/${intervention.id}`
        const interventionUrl = magicLinksMap.get(recipient.email) || fallbackUrl

        const emailProps: InterventionScheduledEmailProps = {
          firstName: recipient.first_name || 'Bonjour',
          interventionRef: intervention.reference || 'INT-???',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || '',
          propertyAddress,
          lotReference,
          interventionUrl,
          providerName: providerInfo.name,
          providerCompany: providerInfo.company || undefined,
          providerPhone: providerInfo.phone || undefined,
          scheduledDate,
          estimatedDuration: intervention.estimated_duration_minutes || undefined,
          recipientRole
        }

        logger.info({
          interventionId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole,
          scheduledDate: scheduledDate.toISOString()
        }, '📧 [EMAIL-NOTIFICATION] Sending scheduled email')

        // Générer l'adresse reply-to pour les réponses directes
        const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

        const emailResult = await this.emailService.send({
          to: recipient.email,
          subject: `📅 RDV confirmé - ${intervention.reference || intervention.title}`,
          react: InterventionScheduledEmail(emailProps),
          replyTo, // ← Permet aux destinataires de répondre directement
          tags: [
            { name: 'type', value: 'intervention_scheduled' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipientRole },
            { name: 'reply_enabled', value: 'true' }
          ]
        })

        results.push({
          userId: recipient.id,
          email: recipient.email,
          success: emailResult.success,
          emailId: emailResult.emailId,
          error: emailResult.error
        })

        if (emailResult.success) {
          logger.info({ recipientId: recipient.id }, '✅ [EMAIL-NOTIFICATION] Scheduled email sent')
        } else {
          logger.error({ recipientId: recipient.id, error: emailResult.error }, '❌ [EMAIL-NOTIFICATION] Failed to send scheduled email')
        }
      }

      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing },
        '✅ [EMAIL-NOTIFICATION] Scheduled email batch completed'
      )

      return { success: failedCount === 0, sentCount, failedCount, results }

    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        { interventionId, timing, error: error instanceof Error ? error.message : 'Unknown' },
        '❌ [EMAIL-NOTIFICATION] Failed to send scheduled email batch'
      )
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }
  }

  /**
   * Envoie les emails pour des créneaux proposés (pas encore confirmés)
   *
   * Destinataires: Locataires + Prestataires assignés
   *
   * @param interventionId - ID de l'intervention
   * @param schedulingContext - Contexte de planification
   * @param filterOptions - Options de filtrage des destinataires
   * @returns Résultat de l'envoi batch
   */
  async sendTimeSlotsProposedBatch(
    interventionId: string,
    schedulingContext: {
      planningType: 'direct' | 'propose' | 'organize'
      managerName: string
      proposedSlots?: Array<{ date: string; startTime: string; endTime: string }>
    },
    filterOptions?: {
      excludeUserId?: string | null
      excludeRoles?: UserRole[]
      onlyRoles?: UserRole[]
      excludeNonPersonal?: boolean
    }
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, schedulingContext, filterOptions },
      '📧 [EMAIL-NOTIFICATION] Starting time slots proposed email batch'
    )

    try {
      // 1. Vérifier que Resend est configuré
      if (!this.emailService.isConfigured()) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 2. Récupérer l'intervention
      const interventionResult = await this.interventionRepository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const intervention = interventionResult.data

      // 3. Récupérer les données enrichies pour les destinataires
      const enrichedIntervention = await this.notificationRepository.getInterventionWithManagers(interventionId)
      if (!enrichedIntervention) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Could not enrich intervention')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 4. Déterminer les destinataires avec filtrage
      const allRecipients = determineInterventionRecipients(enrichedIntervention, filterOptions || {})

      // 5. Récupérer les détails utilisateurs pour les emails (auth-only)
      // ✅ NOTIFICATION FIX (Jan 2026): N'envoyer des emails qu'aux users qui peuvent se connecter
      const userIds = allRecipients.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)
      if (!usersResult.success || !usersResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const recipients = usersResult.data.filter(user => user.email)

      if (recipients.length === 0) {
        logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] No recipients for time slots email')
        return { success: true, sentCount: 0, failedCount: 0, results: [] }
      }

      // 6. Récupérer adresse du bien
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined
      if (intervention.lot_id) {
        const lotResult = await this.lotRepository.findById(intervention.lot_id)
        if (lotResult.success && lotResult.data) {
          lotReference = lotResult.data.reference || undefined
          if (lotResult.data.building_id) {
            const buildingResult = await this.buildingRepository.findById(lotResult.data.building_id)
            if (buildingResult.success && buildingResult.data) {
              propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
            }
          }
        }
      } else if (intervention.building_id) {
        const buildingResult = await this.buildingRepository.findById(intervention.building_id)
        if (buildingResult.success && buildingResult.data) {
          propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
        }
      }

      // 7. Convertir les créneaux en format Date
      const proposedSlots = (schedulingContext.proposedSlots || []).map(slot => ({
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime
      }))

      // 7bis. Générer les magic links pour tous les destinataires
      const magicLinkRecipients = recipients.map(r => {
        const recipientMeta = allRecipients.find(rec => rec.userId === r.id)
        const role = recipientMeta?.role === 'prestataire' ? 'prestataire' : 'locataire'
        return {
          email: r.email,
          redirectTo: `/${role}/interventions/${intervention.id}`
        }
      })
      const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)

      // 8. Préparer et envoyer les emails
      const results: EmailRecipientResult[] = []

      for (const [index, recipient] of recipients.entries()) {
        // Délai entre les envois pour éviter rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS))
        }

        // Déterminer le rôle du destinataire
        const recipientMeta = allRecipients.find(r => r.userId === recipient.id)
        const recipientRole = recipientMeta?.role === 'prestataire' ? 'prestataire' : 'locataire'

        // Utiliser le magic link si disponible, sinon fallback sur l'URL directe
        const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipientRole}/interventions/${intervention.id}`
        const interventionUrl = magicLinksMap.get(recipient.email) || fallbackUrl

        const emailProps: TimeSlotsProposedEmailProps = {
          firstName: recipient.first_name || 'Bonjour',
          interventionRef: intervention.reference || 'INT-???',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || '',
          propertyAddress,
          lotReference,
          interventionUrl,
          managerName: schedulingContext.managerName,
          planningType: schedulingContext.planningType,
          proposedSlots,
          recipientRole
        }

        const subjectPrefix = schedulingContext.planningType === 'organize'
          ? '🤝 Planification autonome'
          : '📅 Créneaux proposés'

        logger.info({
          interventionId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole,
          planningType: schedulingContext.planningType
        }, '📧 [EMAIL-NOTIFICATION] Sending time slots email')

        // Générer l'adresse reply-to pour les réponses directes
        const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

        const emailResult = await this.emailService.send({
          to: recipient.email,
          subject: `${subjectPrefix} - ${intervention.reference || intervention.title}`,
          react: TimeSlotsProposedEmail(emailProps),
          replyTo, // ← Permet aux destinataires de répondre directement
          tags: [
            { name: 'type', value: 'time_slots_proposed' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipientRole },
            { name: 'planning_type', value: schedulingContext.planningType },
            { name: 'reply_enabled', value: 'true' }
          ]
        })

        results.push({
          userId: recipient.id,
          email: recipient.email,
          success: emailResult.success,
          emailId: emailResult.emailId,
          error: emailResult.error
        })

        if (emailResult.success) {
          logger.info({ recipientId: recipient.id }, '✅ [EMAIL-NOTIFICATION] Time slots email sent')
        } else {
          logger.error({ recipientId: recipient.id, error: emailResult.error }, '❌ [EMAIL-NOTIFICATION] Failed to send time slots email')
        }
      }

      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing },
        '✅ [EMAIL-NOTIFICATION] Time slots proposed email batch completed'
      )

      return { success: failedCount === 0, sentCount, failedCount, results }

    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        { interventionId, timing, error: error instanceof Error ? error.message : 'Unknown' },
        '❌ [EMAIL-NOTIFICATION] Failed to send time slots proposed email batch'
      )
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }
  }

  /**
   * Envoie les emails pour une intervention terminée (cloturee_par_prestataire)
   *
   * Destinataires: Locataires (validation requise) + Gestionnaires (info)
   *
   * @param interventionId - ID de l'intervention
   * @param filterOptions - Options de filtrage des destinataires
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionCompletedBatch(
    interventionId: string,
    filterOptions?: {
      excludeUserId?: string | null
      excludeRoles?: UserRole[]
      onlyRoles?: UserRole[]
      excludeNonPersonal?: boolean
    }
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, filterOptions },
      '📧 [EMAIL-NOTIFICATION] Starting intervention completed email batch'
    )

    try {
      // 1. Vérifier que Resend est configuré
      if (!this.emailService.isConfigured()) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 2. Récupérer l'intervention
      const interventionResult = await this.interventionRepository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const intervention = interventionResult.data

      // 3. Récupérer les données enrichies pour les destinataires
      const enrichedIntervention = await this.notificationRepository.getInterventionWithManagers(interventionId)
      if (!enrichedIntervention) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Could not enrich intervention')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 4. Déterminer les destinataires avec filtrage
      const allRecipients = determineInterventionRecipients(enrichedIntervention, filterOptions || {})

      // 5. Récupérer les détails utilisateurs pour les emails (auth-only)
      // ✅ NOTIFICATION FIX (Jan 2026): N'envoyer des emails qu'aux users qui peuvent se connecter
      const userIds = allRecipients.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)
      if (!usersResult.success || !usersResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const recipients = usersResult.data.filter(user => user.email)

      if (recipients.length === 0) {
        logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] No recipients for completed email')
        return { success: true, sentCount: 0, failedCount: 0, results: [] }
      }

      // 6. Récupérer infos prestataire (celui qui a terminé)
      let providerName = 'Prestataire'
      const primaryProvider = enrichedIntervention.interventionAssignedProviders[0]
      if (primaryProvider) {
        const providerResult = await this.userRepository.findById(primaryProvider)
        if (providerResult.success && providerResult.data) {
          providerName = `${providerResult.data.first_name || ''} ${providerResult.data.last_name || ''}`.trim() || 'Prestataire'
        }
      }

      // 7. Récupérer adresse du bien
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined
      if (intervention.lot_id) {
        const lotResult = await this.lotRepository.findById(intervention.lot_id)
        if (lotResult.success && lotResult.data) {
          lotReference = lotResult.data.reference || undefined
          if (lotResult.data.building_id) {
            const buildingResult = await this.buildingRepository.findById(lotResult.data.building_id)
            if (buildingResult.success && buildingResult.data) {
              propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
            }
          }
        }
      } else if (intervention.building_id) {
        const buildingResult = await this.buildingRepository.findById(intervention.building_id)
        if (buildingResult.success && buildingResult.data) {
          propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
        }
      }

      // 8. Vérifier si des documents existent pour cette intervention
      let hasDocuments = false
      try {
        const supabase = createServiceRoleSupabaseClient()
        const { count: documentsCount } = await supabase
          .from('intervention_documents')
          .select('*', { count: 'exact', head: true })
          .eq('intervention_id', interventionId)
          .is('deleted_at', null)

        hasDocuments = (documentsCount ?? 0) > 0
        logger.info({ interventionId, documentsCount }, '📎 [EMAIL-NOTIFICATION] Documents count for intervention')
      } catch (error) {
        logger.warn({ interventionId, error }, '⚠️ [EMAIL-NOTIFICATION] Could not check documents, defaulting to false')
      }

      // 8bis. Générer les magic links pour tous les destinataires
      const magicLinkRecipients = recipients.map(r => {
        const recipientMeta = allRecipients.find(rec => rec.userId === r.id)
        const role = recipientMeta?.role || 'locataire'
        return {
          email: r.email,
          redirectTo: `/${role}/interventions/${intervention.id}`
        }
      })
      const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)

      // 9. Préparer et envoyer les emails
      const results: EmailRecipientResult[] = []

      for (const [index, recipient] of recipients.entries()) {
        // Délai entre les envois pour éviter rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS))
        }

        // Déterminer le rôle du destinataire
        const recipientMeta = allRecipients.find(r => r.userId === recipient.id)
        const recipientRole = recipientMeta?.role || 'locataire'

        // Utiliser le magic link si disponible, sinon fallback sur l'URL directe
        const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipientRole}/interventions/${intervention.id}`
        const interventionUrl = magicLinksMap.get(recipient.email) || fallbackUrl

        const emailProps: InterventionCompletedEmailProps = {
          firstName: recipient.first_name || 'Bonjour',
          interventionRef: intervention.reference || 'INT-???',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || '',
          propertyAddress,
          lotReference,
          interventionUrl,
          providerName,
          completedAt: new Date(),
          hasDocuments,
          recipientRole: recipientRole as 'locataire' | 'gestionnaire'
        }

        const subject = recipientRole === 'locataire'
          ? `✅ Intervention terminée - Validation requise - ${intervention.reference || intervention.title}`
          : `✅ Intervention terminée par le prestataire - ${intervention.reference || intervention.title}`

        logger.info({
          interventionId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole
        }, '📧 [EMAIL-NOTIFICATION] Sending completed email')

        // Générer l'adresse reply-to pour les réponses directes
        const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

        const emailResult = await this.emailService.send({
          to: recipient.email,
          subject,
          react: InterventionCompletedEmail(emailProps),
          replyTo, // ← Permet aux destinataires de répondre directement
          tags: [
            { name: 'type', value: 'intervention_completed' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipientRole },
            { name: 'reply_enabled', value: 'true' }
          ]
        })

        results.push({
          userId: recipient.id,
          email: recipient.email,
          success: emailResult.success,
          emailId: emailResult.emailId,
          error: emailResult.error
        })

        if (emailResult.success) {
          logger.info({ recipientId: recipient.id }, '✅ [EMAIL-NOTIFICATION] Completed email sent')
        } else {
          logger.error({ recipientId: recipient.id, error: emailResult.error }, '❌ [EMAIL-NOTIFICATION] Failed to send completed email')
        }
      }

      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing },
        '✅ [EMAIL-NOTIFICATION] Completed email batch finished'
      )

      return { success: failedCount === 0, sentCount, failedCount, results }

    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        { interventionId, timing, error: error instanceof Error ? error.message : 'Unknown' },
        '❌ [EMAIL-NOTIFICATION] Failed to send completed email batch'
      )
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
    }
  }

  /**
   * Envoie les emails pour un changement de statut d'intervention
   *
   * Pour l'instant, utilisé principalement pour la finalisation gestionnaire
   * et la validation locataire (contestée ou approuvée)
   *
   * @param interventionId - ID de l'intervention
   * @param statusChange - Contexte du changement de statut
   * @param filterOptions - Options de filtrage des destinataires
   * @returns Résultat de l'envoi batch
   */
  async sendInterventionStatusChangedBatch(
    interventionId: string,
    statusChange?: {
      oldStatus: string
      newStatus: string
      reason?: string
    },
    filterOptions?: {
      excludeUserId?: string | null
      excludeRoles?: UserRole[]
      onlyRoles?: UserRole[]
      excludeNonPersonal?: boolean
    }
  ): Promise<EmailBatchResult> {
    const startTime = Date.now()
    logger.info(
      { interventionId, statusChange, filterOptions },
      '📧 [EMAIL-NOTIFICATION] Starting status changed email batch'
    )

    // Pour l'instant, log seulement - les templates spécifiques seront ajoutés au besoin
    // Les changements de statut majeurs utilisent des eventTypes dédiés (completed, scheduled, etc.)
    // Ce batch est un fallback pour les autres cas

    if (!statusChange) {
      logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] No statusChange context provided')
      return { success: true, sentCount: 0, failedCount: 0, results: [] }
    }

    try {
      // 1. Vérifier que Resend est configuré
      if (!this.emailService.isConfigured()) {
        logger.warn({ interventionId }, '⚠️ [EMAIL-NOTIFICATION] Resend not configured - skipping')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 2. Récupérer l'intervention
      const interventionResult = await this.interventionRepository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const intervention = interventionResult.data

      // 3. Récupérer les données enrichies pour les destinataires
      const enrichedIntervention = await this.notificationRepository.getInterventionWithManagers(interventionId)
      if (!enrichedIntervention) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Could not enrich intervention')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }

      // 4. Déterminer les destinataires avec filtrage
      const allRecipients = determineInterventionRecipients(enrichedIntervention, filterOptions || {})

      // 5. Récupérer les détails utilisateurs pour les emails (auth-only)
      // ✅ NOTIFICATION FIX (Jan 2026): N'envoyer des emails qu'aux users qui peuvent se connecter
      const userIds = allRecipients.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)
      if (!usersResult.success || !usersResult.data) {
        logger.error({ interventionId }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        return { success: false, sentCount: 0, failedCount: 0, results: [] }
      }
      const recipients = usersResult.data.filter(user => user.email)

      if (recipients.length === 0) {
        logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] No recipients for status changed email')
        return { success: true, sentCount: 0, failedCount: 0, results: [] }
      }

      // 6. Récupérer adresse du bien
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined
      if (intervention.lot_id) {
        const lotResult = await this.lotRepository.findById(intervention.lot_id)
        if (lotResult.success && lotResult.data) {
          lotReference = lotResult.data.reference || undefined
          if (lotResult.data.building_id) {
            const buildingResult = await this.buildingRepository.findById(lotResult.data.building_id)
            if (buildingResult.success && buildingResult.data) {
              propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
            }
          }
        }
      } else if (intervention.building_id) {
        const buildingResult = await this.buildingRepository.findById(intervention.building_id)
        if (buildingResult.success && buildingResult.data) {
          propertyAddress = `${buildingResult.data.address}, ${buildingResult.data.city}`
        }
      }

      // 7. Mapper les statuts pour l'affichage
      const statusLabels: Record<string, string> = {
        'demande': 'Demande',
        'rejetee': 'Rejetée',
        'approuvee': 'Approuvée',
        'demande_de_devis': 'Devis demandé',
        'planification': 'En planification',
        'planifiee': 'Planifiée',
        'cloturee_par_prestataire': 'Terminée (prestataire)',
        'cloturee_par_locataire': 'Validée (locataire)',
        'cloturee_par_gestionnaire': 'Finalisée',
        'annulee': 'Annulée'
      }

      // 7bis. Générer les magic links pour tous les destinataires
      const magicLinkRecipients = recipients.map(r => {
        const recipientMeta = allRecipients.find(rec => rec.userId === r.id)
        const role = recipientMeta?.role || 'locataire'
        return {
          email: r.email,
          redirectTo: `/${role}/interventions/${intervention.id}`
        }
      })
      const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)

      // 8. Préparer et envoyer les emails
      const results: EmailRecipientResult[] = []

      for (const [index, recipient] of recipients.entries()) {
        // Délai entre les envois pour éviter rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS))
        }

        // Déterminer le rôle du destinataire
        const recipientMeta = allRecipients.find(r => r.userId === recipient.id)
        const recipientRole = recipientMeta?.role || 'locataire'

        // Utiliser le magic link si disponible, sinon fallback sur l'URL directe
        const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipientRole}/interventions/${intervention.id}`
        const interventionUrl = magicLinksMap.get(recipient.email) || fallbackUrl

        // Utiliser le template InterventionCompletedEmail comme base (il a les champs nécessaires)
        // Pour un vrai changement de statut, on personnalise le message
        const newStatusLabel = statusLabels[statusChange.newStatus] || statusChange.newStatus
        const oldStatusLabel = statusLabels[statusChange.oldStatus] || statusChange.oldStatus

        const emailProps: InterventionCompletedEmailProps = {
          firstName: recipient.first_name || 'Bonjour',
          interventionRef: intervention.reference || 'INT-???',
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || '',
          propertyAddress,
          lotReference,
          interventionUrl,
          providerName: '', // Non utilisé pour status change
          completedAt: new Date(),
          completionNotes: statusChange.reason
            ? `Changement de statut: ${oldStatusLabel} → ${newStatusLabel}\nMotif: ${statusChange.reason}`
            : `Changement de statut: ${oldStatusLabel} → ${newStatusLabel}`,
          hasDocuments: false,
          recipientRole: recipientRole as 'locataire' | 'gestionnaire'
        }

        const subject = `📋 Mise à jour - ${intervention.reference || intervention.title} (${newStatusLabel})`

        logger.info({
          interventionId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole,
          statusChange: `${statusChange.oldStatus} → ${statusChange.newStatus}`
        }, '📧 [EMAIL-NOTIFICATION] Sending status changed email')

        // Générer l'adresse reply-to pour les réponses directes
        const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

        const emailResult = await this.emailService.send({
          to: recipient.email,
          subject,
          react: InterventionCompletedEmail(emailProps), // Réutilisation du template completed
          replyTo, // ← Permet aux destinataires de répondre directement
          tags: [
            { name: 'type', value: 'intervention_status_changed' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipientRole },
            { name: 'new_status', value: statusChange.newStatus },
            { name: 'reply_enabled', value: 'true' }
          ]
        })

        results.push({
          userId: recipient.id,
          email: recipient.email,
          success: emailResult.success,
          emailId: emailResult.emailId,
          error: emailResult.error
        })

        if (emailResult.success) {
          logger.info({ recipientId: recipient.id }, '✅ [EMAIL-NOTIFICATION] Status changed email sent')
        } else {
          logger.error({ recipientId: recipient.id, error: emailResult.error }, '❌ [EMAIL-NOTIFICATION] Failed to send status changed email')
        }
      }

      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const timing = Date.now() - startTime

      logger.info(
        { interventionId, sentCount, failedCount, timing },
        '✅ [EMAIL-NOTIFICATION] Status changed email batch finished'
      )

      return { success: failedCount === 0, sentCount, failedCount, results }

    } catch (error) {
      const timing = Date.now() - startTime
      logger.error(
        { interventionId, timing, error: error instanceof Error ? error.message : 'Unknown' },
        '❌ [EMAIL-NOTIFICATION] Failed to send status changed email batch'
      )
      return { success: false, sentCount: 0, failedCount: 0, results: [] }
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
      // NOTE: On utilise le client service role pour bypasser RLS et éviter les timeouts
      // (les politiques RLS sur interventions font des JOINs coûteux)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 2: Fetching intervention details')
      const supabase = createServiceRoleSupabaseClient()

      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .select('*')
        .eq('id', interventionId)
        .is('deleted_at', null)
        .single()

      if (interventionError || !intervention) {
        logger.error({
          interventionId,
          error: interventionError?.message || 'Not found'
        }, '❌ [EMAIL-NOTIFICATION] Intervention not found')
        throw new Error(`Intervention ${interventionId} not found`)
      }

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
      
      // Récupérer le lot d'abord pour savoir s'il est lié à un building
      const lotResult = intervention.lot_id
        ? await this.lotRepository.findById(intervention.lot_id)
        : null

      const lot = lotResult?.success ? lotResult.data : null
      
      // Récupérer le building : soit directement depuis intervention.building_id, soit depuis lot.building_id si le lot est lié
      const buildingIdToFetch = intervention.building_id || lot?.building_id || null
      const buildingResult = buildingIdToFetch
        ? await this.buildingRepository.findById(buildingIdToFetch)
        : null

      const building = buildingResult?.success ? buildingResult.data : null

      logger.info({
        interventionId,
        hasBuilding: !!building,
        hasLot: !!lot
      }, '✅ [EMAIL-NOTIFICATION] Building and lot fetched')

      // 4bis. Récupérer les créneaux proposés
      // Note: Le client service role (créé plus haut) bypass RLS et voit TOUS les créneaux
      // (la RLS filtre par provider_id ce qui exclut les slots des autres prestataires)
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 4bis: Fetching time slots')
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

      // 4quater. Récupérer les pièces jointes de l'intervention
      logger.info({ interventionId }, '📧 [EMAIL-NOTIFICATION] Step 4quater: Fetching attachments')
      const { data: documentsData } = await supabase
        .from('intervention_documents')
        .select('id, filename, original_filename, mime_type, file_size, document_type, storage_path')
        .eq('intervention_id', interventionId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false })

      // Construire les EmailAttachment avec les URLs de téléchargement
      // Note: Utilise la route dynamique /api/download-intervention-document/[id] qui fait un redirect direct
      const attachments: EmailAttachment[] = (documentsData || []).map(doc => ({
        filename: doc.original_filename || doc.filename,
        mimeType: doc.mime_type,
        fileSize: doc.file_size,
        downloadUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download-intervention-document/${doc.id}`,
        documentType: doc.document_type || undefined
      }))

      logger.info({ interventionId, attachmentsCount: attachments.length }, '✅ [EMAIL-NOTIFICATION] Attachments fetched')

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

      // 7. Récupérer les détails des utilisateurs AVEC compte auth (email, first_name, role) en batch
      // ✅ NOTIFICATION FIX (Jan 2026): N'envoyer des emails qu'aux users qui peuvent se connecter
      logger.info({ interventionId, userIdCount: recipientList.length }, '📧 [EMAIL-NOTIFICATION] Step 7: Fetching user details (auth-only)')
      const userIds = recipientList.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)

      if (!usersResult.success || !usersResult.data) {
        logger.error({
          interventionId,
          error: usersResult.error || 'Unknown error'
        }, '❌ [EMAIL-NOTIFICATION] Failed to fetch user details')
        throw new Error('Failed to fetch user details for recipients')
      }

      // Log des users exclus car sans auth_user_id
      const usersWithAuthCount = usersResult.data.length
      const usersWithoutAuthCount = userIds.length - usersWithAuthCount
      if (usersWithoutAuthCount > 0) {
        logger.info({
          interventionId,
          usersWithAuth: usersWithAuthCount,
          usersWithoutAuth: usersWithoutAuthCount,
          usersRequested: userIds.length
        }, '⚠️ [EMAIL-NOTIFICATION] Some users excluded (no auth_user_id)')
      } else {
        logger.info({
          interventionId,
          usersFound: usersWithAuthCount,
          usersRequested: userIds.length
        }, '✅ [EMAIL-NOTIFICATION] User details fetched (all have auth)')
      }

      // Filtrer uniquement les utilisateurs avec email (double sécurité)
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

      // 7bis. Générer les magic links pour tous les destinataires
      logger.info({ interventionId, recipientCount: recipients.length }, '📧 [EMAIL-NOTIFICATION] Step 7bis: Generating magic links')
      const magicLinkRecipients = recipients.map(r => ({
        email: r.email,
        redirectTo: `/${r.role}/interventions/${interventionId}`
      }))
      const magicLinksMap = await generateMagicLinksBatch(magicLinkRecipients)
      logger.info({
        interventionId,
        requested: recipients.length,
        generated: magicLinksMap.size
      }, '✅ [EMAIL-NOTIFICATION] Magic links generated')

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
      let creatorName = 'Le gestionnaire'
      if (creator) {
        // Essayer d'abord first_name + last_name
        const fullName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim()
        if (fullName) {
          creatorName = fullName
        } else if (creator.name) {
          // Fallback sur le champ name si first_name/last_name sont vides
          creatorName = creator.name
        }
      }

      const emailsToSend = recipients.map((recipient) => {
        // Utiliser le magic link si disponible, sinon fallback sur l'URL directe
        const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${recipient.role}/interventions/${interventionId}`
        const interventionUrl = magicLinksMap.get(recipient.email) || fallbackUrl

        // Props communes à tous les templates
        const baseProps = {
          firstName: recipient.first_name || recipient.email.split('@')[0],
          interventionRef: intervention.reference || 'N/A',
          title: intervention.title || undefined,
          interventionType: intervention.type || 'Intervention',
          description: intervention.description || intervention.title || '',
          propertyAddress: formatPropertyAddress(building, lot),
          lotReference: lot?.reference,
          interventionUrl, // Magic link avec fallback
          urgency: urgencyMap[intervention.urgency || 'normale'] || 'moyenne',
          createdAt: new Date(intervention.created_at),
        }

        // Dispatcher le template et le subject selon le rôle
        let emailContent: React.ReactElement
        let subject: string

        switch (recipient.role) {
          case 'prestataire':
            // Template prestataire: "Vous avez été assigné à une intervention"
            // Inclut les créneaux, les infos devis ET les pièces jointes
            const prestataireProps: InterventionAssignedPrestataireEmailProps = {
              ...baseProps,
              managerName: creatorName,
              timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
              quoteInfo: quoteInfo,
              attachments: attachments.length > 0 ? attachments : undefined,
            }
            emailContent = InterventionAssignedPrestataireEmail(prestataireProps)
            subject = `🔧 Nouvelle mission ${baseProps.interventionRef} - ${baseProps.interventionType}`
            break

          case 'locataire':
            // Template locataire: "Une intervention est prévue pour votre logement"
            // Inclut les créneaux et les pièces jointes mais PAS les infos devis
            const locataireProps: InterventionAssignedLocataireEmailProps = {
              ...baseProps,
              managerName: creatorName,
              timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
              attachments: attachments.length > 0 ? attachments : undefined,
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
              attachments: attachments.length > 0 ? attachments : undefined,
            }
            emailContent = InterventionCreatedEmail(gestionnaireProps)
            subject = `📋 Nouvelle intervention ${baseProps.interventionRef} - ${baseProps.interventionType}`
            break
        }

        // Générer l'adresse reply-to pour les réponses directes
        const replyTo = EmailReplyService.generateInterventionReplyTo(interventionId)

        return {
          to: recipient.email,
          subject,
          react: emailContent,
          replyTo, // ← Permet aux destinataires de répondre directement
          tags: [
            { name: 'type', value: 'intervention_created' },
            { name: 'intervention_id', value: interventionId },
            { name: 'user_role', value: recipient.role },
            { name: 'reply_enabled', value: 'true' },
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
      // Using module-level constants: RESEND_RATE_LIMIT_DELAY_MS, MAX_RETRIES, RETRY_DELAY_MS

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
    quote: Pick<Database['public']['Tables']['intervention_quotes']['Row'], 'id'> & {
      reference?: string | null
    }
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
