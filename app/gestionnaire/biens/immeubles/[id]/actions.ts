'use server'

import { createServerActionBuildingService, createServerActionSupabaseClient } from '@/lib/services'
import { revalidatePath } from 'next/cache'
import type { BuildingUpdate, RepositoryResponse } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Server Action: Update building
 *
 * @param buildingId - ID of the building to update
 * @param updates - Partial building data to update
 * @returns Repository response with success/error
 */
export async function updateBuildingAction(
  buildingId: string,
  updates: BuildingUpdate
): Promise<RepositoryResponse> {
  try {
    logger.info('🔄 [UPDATE-BUILDING-ACTION] Starting building update', {
      buildingId,
      updates
    })

    const service = await createServerActionBuildingService()
    const result = await service.update(buildingId, updates)

    if (result.success) {
      logger.info('✅ [UPDATE-BUILDING-ACTION] Building updated successfully', {
        buildingId
      })

      // Revalidate the building details page and list page
      revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
      revalidatePath('/gestionnaire/biens')
    } else {
      logger.error('❌ [UPDATE-BUILDING-ACTION] Building update failed', {
        buildingId,
        error: result.error
      })
    }

    return result
  } catch (error) {
    logger.error('❌ [UPDATE-BUILDING-ACTION] Unexpected error', {
      buildingId,
      error
    })

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur inattendue s\'est produite lors de la mise à jour de l\'immeuble'
      }
    }
  }
}

/**
 * Server Action: Delete building
 *
 * @param buildingId - ID of the building to delete
 * @returns Repository response with success/error
 */
export async function deleteBuildingAction(
  buildingId: string
): Promise<RepositoryResponse> {
  try {
    logger.info('🗑️ [DELETE-BUILDING-ACTION] Starting building deletion', {
      buildingId
    })

    const service = await createServerActionBuildingService()
    const result = await service.delete(buildingId)

    if (result.success) {
      logger.info('✅ [DELETE-BUILDING-ACTION] Building deleted successfully', {
        buildingId
      })

      // Revalidate the list page (building detail page will redirect)
      revalidatePath('/gestionnaire/biens')
    } else {
      logger.error('❌ [DELETE-BUILDING-ACTION] Building deletion failed', {
        buildingId,
        error: result.error
      })
    }

    return result
  } catch (error) {
    logger.error('❌ [DELETE-BUILDING-ACTION] Unexpected error', {
      buildingId,
      error
    })

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur inattendue s\'est produite lors de la suppression de l\'immeuble'
      }
    }
  }
}

/**
 * Server Action pour assigner un contact à un immeuble
 *
 * @param buildingId - ID de l'immeuble
 * @param userId - ID de l'utilisateur (contact) à assigner
 * @param isPrimary - Si ce contact est le contact principal (default: false)
 * @returns Promise<{ success: boolean; data?: any; error?: string }>
 */
export async function assignContactToBuildingAction(
  buildingId: string,
  userId: string,
  isPrimary = false
) {
  try {
    logger.info(`👥 [ASSIGN-CONTACT-TO-BUILDING] Assigning contact ${userId} to building ${buildingId} (isPrimary: ${isPrimary})`)

    const supabase = await createServerActionSupabaseClient()

    // Vérifier si le contact n'est pas déjà assigné
    const { data: existing } = await supabase
      .from('building_contacts')
      .select('id')
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      logger.warn(`⚠️ [ASSIGN-CONTACT-TO-BUILDING] Contact already assigned to building`)
      return {
        success: false,
        error: 'Ce contact est déjà assigné à cet immeuble'
      }
    }

    // Insérer le nouveau contact
    const { data, error } = await supabase
      .from('building_contacts')
      .insert({
        building_id: buildingId,
        user_id: userId,
        is_primary: isPrimary,
        role: null,
        notes: null
      })
      .select(`
        id,
        user_id,
        building_id,
        is_primary,
        user:user_id(
          id,
          name,
          email,
          phone,
          role,
          provider_category
        )
      `)
      .single()

    if (error) {
      logger.error(`❌ [ASSIGN-CONTACT-TO-BUILDING] Failed to assign contact:`, error)
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'assignation du contact'
      }
    }

    logger.info(`✅ [ASSIGN-CONTACT-TO-BUILDING] Contact assigned successfully:`, data.id)

    // Revalidate pages
    revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
    revalidatePath('/gestionnaire/biens')

    return { success: true, data }

  } catch (error) {
    logger.error(`❌ [ASSIGN-CONTACT-TO-BUILDING] Exception:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
    }
  }
}

/**
 * Server Action pour retirer un contact d'un immeuble
 *
 * @param buildingContactId - ID de la relation building_contacts à supprimer
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function removeContactFromBuildingAction(
  buildingContactId: string
) {
  try {
    logger.info(`🗑️ [REMOVE-CONTACT-FROM-BUILDING] Removing building contact ${buildingContactId}`)

    const supabase = await createServerActionSupabaseClient()

    // Get building_id before deleting for revalidation
    const { data: contactData } = await supabase
      .from('building_contacts')
      .select('building_id')
      .eq('id', buildingContactId)
      .single()

    const { error } = await supabase
      .from('building_contacts')
      .delete()
      .eq('id', buildingContactId)

    if (error) {
      logger.error(`❌ [REMOVE-CONTACT-FROM-BUILDING] Failed to remove contact:`, error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du contact'
      }
    }

    logger.info(`✅ [REMOVE-CONTACT-FROM-BUILDING] Contact removed successfully`)

    // Revalidate pages
    if (contactData?.building_id) {
      revalidatePath(`/gestionnaire/biens/immeubles/${contactData.building_id}`)
    }
    revalidatePath('/gestionnaire/biens')

    return { success: true }

  } catch (error) {
    logger.error(`❌ [REMOVE-CONTACT-FROM-BUILDING] Exception:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
    }
  }
}

/**
 * Server Action pour retirer un contact d'un lot
 *
 * @param lotContactId - ID de la relation lot_contacts à supprimer
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function removeContactFromLotAction(
  lotContactId: string
) {
  try {
    logger.info(`🗑️ [REMOVE-CONTACT-FROM-LOT] Removing lot contact ${lotContactId}`)

    const supabase = await createServerActionSupabaseClient()

    // Get lot_id and building_id before deleting for revalidation
    const { data: lotData } = await supabase
      .from('lot_contacts')
      .select('lot_id, lots(building_id)')
      .eq('id', lotContactId)
      .single()

    const { error } = await supabase
      .from('lot_contacts')
      .delete()
      .eq('id', lotContactId)

    if (error) {
      logger.error(`❌ [REMOVE-CONTACT-FROM-LOT] Failed to remove lot contact:`, error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du contact'
      }
    }

    logger.info(`✅ [REMOVE-CONTACT-FROM-LOT] Lot contact removed successfully`)

    // Revalidate pages
    if (lotData) {
      revalidatePath(`/gestionnaire/biens/lots/${lotData.lot_id}`)
      if ((lotData.lots as any)?.building_id) {
        revalidatePath(`/gestionnaire/biens/immeubles/${(lotData.lots as any).building_id}`)
      }
    }
    revalidatePath('/gestionnaire/biens')

    return { success: true }

  } catch (error) {
    logger.error(`❌ [REMOVE-CONTACT-FROM-LOT] Exception:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
    }
  }
}
