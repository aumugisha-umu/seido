'use server'

import { createServerActionContactService, createServerActionLotService, createContactInvitationService } from '@/lib/services'
import type { LotInsert, ContactInvitationData } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Server Action pour assigner un contact à un lot
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param lotId - ID du lot
 * @param userId - ID de l'utilisateur/contact
 * @param isPrimary - Si ce contact est le contact principal (défaut: false)
 */
export async function assignContactToLotAction(
  lotId: string,
  userId: string,
  isPrimary = false
) {
  try {
    logger.info(`[SERVER-ACTION] Assigning contact ${userId} to lot ${lotId} (isPrimary: ${isPrimary})`)

    // Créer le service avec le client Supabase Server Action (accès aux cookies)
    const contactService = await createServerActionContactService()
    const result = await contactService.addContactToLot(lotId, userId, isPrimary)

    if (!result.success) {
      logger.error(`[SERVER-ACTION] Failed to assign contact:`, result.error)
      return { success: false, error: result.error?.message || 'Assignment failed' }
    }

    logger.info(`[SERVER-ACTION] Contact assigned successfully`)
    return { success: true, data: result.data }
  } catch (error) {
    logger.error(`[SERVER-ACTION] Exception in assignContactToLotAction:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server Action pour créer un lot
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param lotData - Données du lot à créer
 */
export async function createLotAction(lotData: LotInsert) {
  try {
    logger.info('[SERVER-ACTION] Creating lot with data:', lotData)

    // Créer le service avec le client Supabase Server Action (accès aux cookies)
    const lotService = await createServerActionLotService()
    const result = await lotService.create(lotData)

    if (!result.success) {
      logger.error('[SERVER-ACTION] Failed to create lot:', result.error)
      return {
        success: false,
        error: {
          message: result.error?.message || 'Lot creation failed',
          code: result.error?.code
        }
      }
    }

    logger.info('[SERVER-ACTION] Lot created successfully:', result.data)
    return { success: true, data: result.data }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in createLotAction:', error)
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

/**
 * Server Action pour créer un contact avec invitation optionnelle
 * Wrapper pour ContactInvitationService qui utilise fetch() vers API routes
 *
 * @param contactData - Données du contact à créer
 */
export async function createContactWithOptionalInviteAction(contactData: ContactInvitationData) {
  try {
    logger.info('[SERVER-ACTION] Creating contact with optional invite:', { email: contactData.email, type: contactData.type })

    // ContactInvitationService utilise fetch() vers API routes, peut être appelé côté serveur
    const contactInvitationService = createContactInvitationService()
    const result = await contactInvitationService.createContactWithOptionalInvite(contactData)

    if (!result.success) {
      logger.error('[SERVER-ACTION] Failed to create contact:', result.error)
      return {
        success: false,
        error: result.error || 'Contact creation failed'
      }
    }

    logger.info('[SERVER-ACTION] Contact created successfully')
    return { success: true, data: result.data }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in createContactWithOptionalInviteAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
