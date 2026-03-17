'use server'

import { createServerActionContactService, createServerActionLotService, createContactInvitationService, createServerActionSupabaseClient, createServerActionBuildingService } from '@/lib/services'
import { createAddressService, type GooglePlaceAddress } from '@/lib/services/domain/address.service'
import { createServiceRoleSubscriptionService } from '@/lib/services/domain/subscription-helpers'
import type { LotInsert, ContactInvitationData, Building } from '@/lib/services'
import { logger } from '@/lib/logger'
import { redirect } from 'next/navigation'

/**
 * Server Action pour assigner un contact à un lot
 */
export async function assignContactToLotAction(
  lotId: string,
  userId: string,
  isPrimary = false
) {
  try {
    const contactService = await createServerActionContactService()
    const result = await contactService.addContactToLot(lotId, userId, isPrimary)

    if (!result.success) {
      logger.error(`[SERVER-ACTION] Failed to assign contact:`, result.error)
      return { success: false, error: result.error?.message || 'Assignment failed' }
    }

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
 * Server Action pour assigner plusieurs contacts à un lot en batch
 * Évite N round-trips serveur (1 seul appel au lieu de N)
 */
export async function batchAssignContactsToLotAction(
  assignments: Array<{ lotId: string; userId: string; isPrimary: boolean }>
) {
  if (assignments.length === 0) return { success: true, results: [] }

  try {
    const contactService = await createServerActionContactService()

    const results = await Promise.allSettled(
      assignments.map(({ lotId, userId, isPrimary }) =>
        contactService.addContactToLot(lotId, userId, isPrimary)
      )
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length
    logger.info(`[SERVER-ACTION] Batch assigned ${successCount}/${assignments.length} contacts`)

    return {
      success: true,
      results: results.map((r, i) => ({
        ...assignments[i],
        success: r.status === 'fulfilled' && r.value?.success,
        error: r.status === 'rejected' ? String(r.reason) : undefined,
      })),
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in batchAssignContactsToLotAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: [],
    }
  }
}

/**
 * Server Action pour créer un lot
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param lotData - Données du lot à créer
 * @param options - Options optionnelles incluant redirectTo pour redirection server-side
 */
export async function createLotAction(
  lotData: LotInsert,
  options?: { redirectTo?: string; skipSubscriptionCheck?: boolean }
) {
  try {
    // ── Subscription limit check (defense-in-depth, skippable for batch) ──
    if (lotData.team_id && !options?.skipSubscriptionCheck) {
      const subService = createServiceRoleSubscriptionService()
      const canAdd = await subService.canAddProperty(lotData.team_id)
      if (!canAdd.allowed) {
        logger.warn('[SERVER-ACTION] Lot creation blocked by subscription limit:', {
          teamId: lotData.team_id,
          reason: canAdd.reason,
        })
        return {
          success: false,
          error: {
            message: canAdd.reason ?? 'Limite d\'abonnement atteinte',
            code: 'SUBSCRIPTION_LIMIT',
          },
        }
      }
    }

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

    // Cache invalidation is handled client-side via realtime broadcastInvalidation

    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }

    return { success: true, data: result.data }
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

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

/**
 * Server Action pour récupérer un building avec ses relations (managers, contacts)
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param buildingId - ID du building
 */
export async function getBuildingWithRelations(buildingId: string): Promise<{
  success: boolean
  building?: Building & {
    building_contacts?: Array<{
      user: {
        id: string
        name?: string
        email: string
        role: string
        phone?: string
        speciality?: string
      }
    }>
  }
  error?: string
}> {
  try {
    logger.info('🏢 [SERVER-ACTION] Getting building with relations:', { buildingId })

    // Create server action building service
    const buildingService = await createServerActionBuildingService()

    // Get building with relations
    const result = await buildingService.getByIdWithRelations(buildingId)

    if (!result.success || !result.data) {
      logger.error('❌ [SERVER-ACTION] Building not found:', { buildingId, error: result.error })
      return {
        success: false,
        error: 'Building not found'
      }
    }

    const buildingWithContacts = result.data as Building & {
      building_contacts?: Array<{
        user: { id: string; name?: string; email: string; role: string; phone?: string; speciality?: string }
      }>
    }

    logger.info('✅ [SERVER-ACTION] Building loaded with relations:', {
      buildingId: buildingWithContacts.id,
      buildingName: buildingWithContacts.name,
      contactsCount: buildingWithContacts.building_contacts?.length || 0,
    })

    return {
      success: true,
      building: buildingWithContacts
    }

  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error getting building:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Server Action pour récupérer les documents existants d'un immeuble
 */
export async function getBuildingExistingDocuments(buildingId: string): Promise<{
  success: boolean
  documents?: Array<{
    id: string
    document_type: string
    original_filename: string
    uploaded_at: string
    storage_path: string
  }>
  error?: string
}> {
  try {
    const supabase = await createServerActionSupabaseClient()
    const { data, error } = await supabase
      .from('property_documents')
      .select('id, document_type, original_filename, uploaded_at, storage_path')
      .eq('building_id', buildingId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    if (error) {
      logger.error('❌ [SERVER-ACTION] Error fetching building documents:', error)
      return { success: false, error: error.message }
    }

    return { success: true, documents: data || [] }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error fetching building documents:', error)
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Server Action pour créer une adresse avec données de géocodage
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param addressData - Données de l'adresse avec géocodage Google
 * @param teamId - ID de l'équipe
 */
export async function createAddressAction(
  addressData: {
    street: string
    postalCode: string
    city: string
    country: string
    latitude?: number
    longitude?: number
    placeId?: string
    formattedAddress?: string
  },
  teamId: string
): Promise<{
  success: boolean
  data?: { id: string }
  error?: string
}> {
  try {
    logger.info('[SERVER-ACTION] Creating address with data:', {
      street: addressData.street,
      city: addressData.city,
      hasGeocode: !!addressData.latitude
    })

    // Get authenticated Supabase client
    const supabase = await createServerActionSupabaseClient()
    const addressService = createAddressService(supabase)

    let result

    // If we have geocode data, create with full Google Place data
    if (addressData.latitude && addressData.longitude && addressData.placeId) {
      const googlePlaceData: GooglePlaceAddress = {
        street: addressData.street,
        postalCode: addressData.postalCode,
        city: addressData.city,
        country: addressData.country,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        placeId: addressData.placeId,
        formattedAddress: addressData.formattedAddress || `${addressData.street}, ${addressData.postalCode} ${addressData.city}, ${addressData.country}`
      }

      result = await addressService.createFromGooglePlace(googlePlaceData, teamId)
    } else {
      // Create manual address without geocode data
      result = await addressService.createManual({
        street: addressData.street,
        postalCode: addressData.postalCode,
        city: addressData.city,
        country: addressData.country
      }, teamId)
    }

    if (!result.success || !result.data) {
      logger.error('[SERVER-ACTION] Failed to create address:', result.error)
      return {
        success: false,
        error: result.error?.message || 'Address creation failed'
      }
    }

    logger.info('[SERVER-ACTION] Address created successfully:', { addressId: result.data.id })

    return {
      success: true,
      data: { id: result.data.id }
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in createAddressAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
