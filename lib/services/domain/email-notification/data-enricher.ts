/**
 * 📧 Intervention Data Enricher
 *
 * Consolidates all data fetching logic for email notifications.
 * Eliminates code duplication across batch methods.
 *
 * @module email-notification/data-enricher
 */

import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'
import type { EmailTimeSlot, EmailQuoteInfo, EmailAttachment } from '@/emails/utils/types'
import type { EnrichedInterventionData, RecipientWithEmail, RecipientFilterOptions } from './types'
import { formatPropertyAddress, formatFullPropertyAddress, formatProviderInfo, formatTimeWithoutSeconds } from './helpers'
import { determineInterventionRecipients } from '../notification-helpers'

// ══════════════════════════════════════════════════════════════
// Options
// ══════════════════════════════════════════════════════════════

export interface EnrichOptions {
  /** Include time slots (default: true) */
  includeTimeSlots?: boolean
  /** Include quote info (default: true) */
  includeQuoteInfo?: boolean
  /** Include attachments (default: true) */
  includeAttachments?: boolean
  /** Include confirmed slot only (default: false) */
  confirmedSlotOnly?: boolean
  /** Include creator details (default: true) */
  includeCreator?: boolean
  /** Include provider info (default: false) */
  includeProviderInfo?: boolean
}

// ══════════════════════════════════════════════════════════════
// InterventionDataEnricher
// ══════════════════════════════════════════════════════════════

/**
 * Service for enriching intervention data with all related entities.
 * Used to prepare data for email templates.
 */
export class InterventionDataEnricher {
  constructor(
    private interventionRepository: InterventionRepository,
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository,
    private buildingRepository: BuildingRepository,
    private lotRepository: LotRepository
  ) {}

  /**
   * Enrich an intervention with all related data needed for emails
   *
   * @param interventionId - The intervention ID
   * @param options - Options for which data to include
   * @returns Enriched intervention data
   */
  async enrich(
    interventionId: string,
    options: EnrichOptions = {}
  ): Promise<EnrichedInterventionData | null> {
    const {
      includeTimeSlots = true,
      includeQuoteInfo = true,
      includeAttachments = true,
      confirmedSlotOnly = false,
      includeCreator = true,
      includeProviderInfo = false
    } = options

    logger.info({ interventionId, options }, '📧 [DATA-ENRICHER] Starting enrichment')

    try {
      const supabase = createServiceRoleSupabaseClient()

      // 1. Fetch intervention
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
        }, '❌ [DATA-ENRICHER] Intervention not found')
        return null
      }

      // 2. Fetch lot (if applicable)
      const lot = intervention.lot_id
        ? (await this.lotRepository.findById(intervention.lot_id)).data
        : null

      // 3. Fetch building (from intervention or lot)
      const buildingIdToFetch = intervention.building_id || lot?.building_id || null
      const building = buildingIdToFetch
        ? (await this.buildingRepository.findById(buildingIdToFetch)).data
        : null

      // 4. Format addresses (building.address_record contains the centralized address)
      const propertyAddress = formatFullPropertyAddress(building?.address_record)
      const lotReference = lot?.reference || undefined

      // 5. Fetch creator (if requested)
      let creator = null
      if (includeCreator && intervention.created_by) {
        const creatorResult = await this.userRepository.findById(intervention.created_by)
        creator = creatorResult.success ? creatorResult.data : null
      }

      // 6. Fetch time slots (if requested)
      let timeSlots: EmailTimeSlot[] = []
      let timeSlotsWithIds: Array<{ id: string; date: Date; startTime: string; endTime: string }> = []
      let confirmedSlot: { date: Date; startTime: string; endTime: string } | undefined

      if (includeTimeSlots) {
        if (confirmedSlotOnly) {
          // Only fetch confirmed slot (modern status pattern)
          const { data: confirmed } = await supabase
            .from('intervention_time_slots')
            .select('id, slot_date, start_time, end_time')
            .eq('intervention_id', interventionId)
            .eq('status', 'selected')
            .single()

          if (confirmed) {
            confirmedSlot = {
              date: new Date(`${confirmed.slot_date}T${confirmed.start_time}`),
              startTime: formatTimeWithoutSeconds(confirmed.start_time),
              endTime: formatTimeWithoutSeconds(confirmed.end_time)
            }
          }
        } else {
          // Fetch all slots
          const { data: slotsData } = await supabase
            .from('intervention_time_slots')
            .select('id, slot_date, start_time, end_time')
            .eq('intervention_id', interventionId)
            .order('slot_date', { ascending: true })

          timeSlots = (slotsData || []).map(slot => ({
            date: new Date(slot.slot_date),
            startTime: formatTimeWithoutSeconds(slot.start_time),
            endTime: formatTimeWithoutSeconds(slot.end_time)
          }))

          timeSlotsWithIds = (slotsData || []).map(slot => ({
            id: slot.id,
            date: new Date(slot.slot_date),
            startTime: formatTimeWithoutSeconds(slot.start_time),
            endTime: formatTimeWithoutSeconds(slot.end_time)
          }))
        }
      }

      // 7. Fetch quote info (if requested)
      let quoteInfo: EmailQuoteInfo | undefined

      if (includeQuoteInfo) {
        const { data: quotesData } = await supabase
          .from('intervention_quotes')
          .select('amount, valid_until')
          .eq('intervention_id', interventionId)
          .limit(1)
          .maybeSingle()

        if (intervention.requires_quote || quotesData) {
          quoteInfo = {
            isRequired: intervention.requires_quote === true,
            estimatedAmount: intervention.estimated_cost || quotesData?.amount || undefined,
            deadline: quotesData?.valid_until ? new Date(quotesData.valid_until) : undefined
          }
        }
      }

      // 8. Fetch attachments (if requested)
      let attachments: EmailAttachment[] = []
      let hasDocuments = false

      if (includeAttachments) {
        const { data: documentsData, count } = await supabase
          .from('intervention_documents')
          .select('id, filename, original_filename, mime_type, file_size, document_type, storage_path', { count: 'exact' })
          .eq('intervention_id', interventionId)
          .is('deleted_at', null)
          .order('uploaded_at', { ascending: false })

        hasDocuments = (count ?? 0) > 0

        attachments = (documentsData || []).map(doc => ({
          filename: doc.original_filename || doc.filename,
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          downloadUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download-intervention-document/${doc.id}`,
          documentType: doc.document_type || undefined
        }))
      }

      // 9. Fetch provider info (if requested)
      let providerInfo: { name: string; company: string; phone: string } | undefined

      if (includeProviderInfo) {
        const enriched = await this.notificationRepository.getInterventionWithManagers(interventionId)
        if (enriched && enriched.interventionAssignedProviders.length > 0) {
          const providerId = enriched.interventionAssignedProviders[0]
          const providerResult = await this.userRepository.findById(providerId)
          if (providerResult.success && providerResult.data) {
            providerInfo = formatProviderInfo(providerResult.data)
          }
        }
      }

      logger.info({
        interventionId,
        hasBuilding: !!building,
        hasLot: !!lot,
        hasCreator: !!creator,
        timeSlotsCount: timeSlots.length,
        hasQuoteInfo: !!quoteInfo,
        attachmentsCount: attachments.length,
        hasProviderInfo: !!providerInfo
      }, '✅ [DATA-ENRICHER] Enrichment complete')

      return {
        intervention,
        building,
        lot,
        propertyAddress,
        lotReference,
        creator,
        timeSlots,
        timeSlotsWithIds,
        quoteInfo,
        attachments,
        hasDocuments,
        confirmedSlot,
        providerInfo
      }

    } catch (error) {
      logger.error({
        interventionId,
        error: error instanceof Error ? error.message : 'Unknown'
      }, '❌ [DATA-ENRICHER] Enrichment failed')
      return null
    }
  }

  /**
   * Get recipients for an intervention with filtering
   *
   * @param interventionId - The intervention ID
   * @param filterOptions - Filtering options
   * @returns Array of recipients with email details
   */
  async getRecipients(
    interventionId: string,
    filterOptions: RecipientFilterOptions = {}
  ): Promise<RecipientWithEmail[]> {
    logger.info({ interventionId, filterOptions }, '📧 [DATA-ENRICHER] Getting recipients')

    try {
      // Get enriched intervention with managers
      const enrichedIntervention = await this.notificationRepository.getInterventionWithManagers(interventionId)
      if (!enrichedIntervention) {
        logger.error({ interventionId }, '❌ [DATA-ENRICHER] Could not get intervention with managers')
        return []
      }

      // Determine recipients with filtering
      const recipientList = determineInterventionRecipients(enrichedIntervention, filterOptions)

      if (recipientList.length === 0) {
        logger.warn({ interventionId }, '⚠️ [DATA-ENRICHER] No recipients found')
        return []
      }

      // Fetch user details (auth-only users)
      const userIds = recipientList.map(r => r.userId)
      const usersResult = await this.userRepository.findByIdsWithAuth(userIds)

      if (!usersResult.success || !usersResult.data) {
        logger.error({ interventionId }, '❌ [DATA-ENRICHER] Failed to fetch user details')
        return []
      }

      // Filter users with email and map to RecipientWithEmail
      const recipients: RecipientWithEmail[] = usersResult.data
        .filter(user => user.email)
        .map(user => {
          const meta = recipientList.find(r => r.userId === user.id)
          return {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            name: user.name,
            role: meta?.role || user.role,
            company_name: user.company_name,
            phone: user.phone
          }
        })

      logger.info({
        interventionId,
        recipientsCount: recipients.length,
        byRole: recipients.reduce((acc, r) => {
          acc[r.role] = (acc[r.role] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }, '✅ [DATA-ENRICHER] Recipients fetched')

      return recipients

    } catch (error) {
      logger.error({
        interventionId,
        error: error instanceof Error ? error.message : 'Unknown'
      }, '❌ [DATA-ENRICHER] Failed to get recipients')
      return []
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Factory
// ══════════════════════════════════════════════════════════════

/**
 * Create an InterventionDataEnricher with dependencies
 */
export function createDataEnricher(
  interventionRepository: InterventionRepository,
  notificationRepository: NotificationRepository,
  userRepository: UserRepository,
  buildingRepository: BuildingRepository,
  lotRepository: LotRepository
): InterventionDataEnricher {
  return new InterventionDataEnricher(
    interventionRepository,
    notificationRepository,
    userRepository,
    buildingRepository,
    lotRepository
  )
}
