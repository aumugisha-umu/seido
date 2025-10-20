'use server'

import { createServerActionBuildingService } from '@/lib/services'
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
