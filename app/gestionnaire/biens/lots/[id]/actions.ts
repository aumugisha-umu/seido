'use server'

import { createServerActionLotService } from '@/lib/services'
import { revalidatePath } from 'next/cache'
import type { LotUpdate, RepositoryResponse } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Server Action: Update lot
 *
 * @param lotId - ID of the lot to update
 * @param updates - Partial lot data to update
 * @returns Repository response with success/error
 */
export async function updateLotAction(
  lotId: string,
  updates: LotUpdate
): Promise<RepositoryResponse> {
  try {
    logger.info('🔄 [UPDATE-LOT-ACTION] Starting lot update', {
      lotId,
      updates
    })

    const service = await createServerActionLotService()
    const result = await service.update(lotId, updates)

    if (result.success) {
      logger.info('✅ [UPDATE-LOT-ACTION] Lot updated successfully', {
        lotId
      })

      // Revalidate the lot details page and list pages
      revalidatePath(`/gestionnaire/biens/lots/${lotId}`)
      revalidatePath('/gestionnaire/biens')

      // If lot has a building, revalidate the building page too
      if (result.data?.building_id) {
        revalidatePath(`/gestionnaire/biens/immeubles/${result.data.building_id}`)
      }
    } else {
      logger.error('❌ [UPDATE-LOT-ACTION] Lot update failed', {
        lotId,
        error: result.error
      })
    }

    return result
  } catch (error) {
    logger.error('❌ [UPDATE-LOT-ACTION] Unexpected error', {
      lotId,
      error
    })

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur inattendue s\'est produite lors de la mise à jour du lot'
      }
    }
  }
}

/**
 * Server Action: Delete lot
 *
 * @param lotId - ID of the lot to delete
 * @returns Repository response with success/error
 */
export async function deleteLotAction(
  lotId: string
): Promise<RepositoryResponse> {
  try {
    logger.info('🗑️ [DELETE-LOT-ACTION] Starting lot deletion', {
      lotId
    })

    const service = await createServerActionLotService()

    // Get lot data before deletion to know which building to revalidate
    const lotData = await service.getById(lotId)
    const buildingId = lotData.success ? lotData.data?.building_id : null

    const result = await service.delete(lotId)

    if (result.success) {
      logger.info('✅ [DELETE-LOT-ACTION] Lot deleted successfully', {
        lotId
      })

      // Revalidate the list page (lot detail page will redirect)
      revalidatePath('/gestionnaire/biens')

      // If lot had a building, revalidate that building's page
      if (buildingId) {
        revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
      }
    } else {
      logger.error('❌ [DELETE-LOT-ACTION] Lot deletion failed', {
        lotId,
        error: result.error
      })
    }

    return result
  } catch (error) {
    logger.error('❌ [DELETE-LOT-ACTION] Unexpected error', {
      lotId,
      error
    })

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur inattendue s\'est produite lors de la suppression du lot'
      }
    }
  }
}
