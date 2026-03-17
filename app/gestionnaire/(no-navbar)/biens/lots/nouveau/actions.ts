'use server'

import { createServerActionContactService, createServerActionLotService, createContactInvitationService, createServerActionSupabaseClient, createServerActionBuildingService } from '@/lib/services'
import { createAddressService, type GooglePlaceAddress } from '@/lib/services/domain/address.service'
import { createServiceRoleSubscriptionService } from '@/lib/services/domain/subscription-helpers'
import type { LotInsert, ContactInvitationData, Building } from '@/lib/services'
import { logger } from '@/lib/logger'
import { revalidateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

    // ✅ Revalidate lot page cache
    revalidatePath(`/gestionnaire/biens/lots/${lotId}`)
    revalidateTag('lots')
    revalidateTag(`lot-${lotId}`)

    // ✅ Revalidate building page if lot belongs to a building
    try {
      const supabase = await createServerActionSupabaseClient()
      const { data: lotData } = await supabase
        .from('lots')
        .select('building_id')
        .eq('id', lotId)
        .single()

      if (lotData?.building_id) {
        revalidatePath(`/gestionnaire/biens/immeubles/${lotData.building_id}`)
        revalidateTag(`building-${lotData.building_id}`)
        revalidateTag('buildings')
        logger.info(`[SERVER-ACTION] Revalidated building cache: ${lotData.building_id}`)
      }
    } catch (error) {
      logger.warn('[SERVER-ACTION] Could not revalidate building cache:', error)
      // Don't fail the action if revalidation fails
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
 * Server Action pour créer un lot
 * Utilise le contexte de requête serveur pour accéder aux cookies (auth session)
 *
 * @param lotData - Données du lot à créer
 * @param options - Options optionnelles incluant redirectTo pour redirection server-side
 */
export async function createLotAction(
  lotData: LotInsert,
  options?: { redirectTo?: string }
) {
  try {
    // ── Subscription limit check (defense-in-depth) ────────────────────
    if (lotData.team_id) {
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

    // ✅ Revalidate cache tags and paths after successful creation
    const createdLot = result.data
    const teamId = lotData.team_id

    // Always revalidate lots cache
    revalidateTag('lots')

    // Revalidate team-specific cache if team_id is available
    if (teamId) {
      revalidateTag(`lots-team-${teamId}`)
    }

    // If lot is linked to a building, revalidate building caches
    const buildingId = createdLot?.building_id || lotData.building_id
    if (buildingId) {
      revalidateTag('buildings')
      revalidateTag(`building-${buildingId}`)

      // Get building team_id to invalidate team-specific caches
      try {
        const supabase = await createServerActionSupabaseClient()
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('team_id')
          .eq('id', buildingId)
          .single()

        if (buildingData?.team_id) {
          revalidateTag(`buildings-team-${buildingData.team_id}`)
          // Also revalidate lots cache for the building's team
          if (buildingData.team_id !== teamId) {
            revalidateTag(`lots-team-${buildingData.team_id}`)
          }
        }
        revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
      } catch (error) {
        logger.warn('[SERVER-ACTION] Could not fetch building data for cache invalidation:', error)
      }
    }

    // Revalidate main patrimoine pages
    revalidatePath('/gestionnaire/biens')
    revalidatePath('/gestionnaire/biens/lots')

    // Revalidate lot detail page if lot ID is available
    if (createdLot?.id) {
      revalidatePath(`/gestionnaire/biens/lots/${createdLot.id}`)
    }

    logger.info('[SERVER-ACTION] Cache invalidated for lot creation')

    // ✅ Redirection server-side si demandée (pattern Next.js 15)
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }

    return { success: true, data: result.data }
  } catch (error) {
    // ✅ redirect() throws NEXT_REDIRECT - propager normalement
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

    logger.info('✅ [SERVER-ACTION] Building loaded with relations:', {
      buildingId: result.data.id,
      buildingName: result.data.name,
      contactsCount: (result.data as any).building_contacts?.length || 0,
      buildingContacts: (result.data as any).building_contacts
    })

    return {
      success: true,
      building: result.data as Building & {
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
