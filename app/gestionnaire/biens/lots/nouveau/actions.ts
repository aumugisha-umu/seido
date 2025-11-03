'use server'

import { createServerActionContactService, createServerActionLotService, createContactInvitationService, createServerActionSupabaseClient, createServerActionBuildingService } from '@/lib/services'
import type { LotInsert, ContactInvitationData, Building } from '@/lib/services'
import { logger } from '@/lib/logger'
import { revalidateTag, revalidatePath } from 'next/cache'

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
      contactsCount: (result.data as any).building_contacts?.length || 0
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
