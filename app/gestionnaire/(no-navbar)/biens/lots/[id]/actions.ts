'use server'

import { createServerActionLotService, createServerActionSupabaseClient } from '@/lib/services'
import { revalidatePath, revalidateTag } from 'next/cache'
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

      // ✅ Revalidate using both tags and paths
      revalidateTag('lots')
      const buildingId = result.data?.building_id
      if (buildingId) {
        revalidateTag('buildings')
        revalidateTag(`building-${buildingId}`)
        const supabase = await createServerActionSupabaseClient()
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('team_id')
          .eq('id', buildingId)
          .single()
        
        if (buildingData?.team_id) {
          revalidateTag(`buildings-team-${buildingData.team_id}`)
          revalidateTag(`lots-team-${buildingData.team_id}`)
        }
        revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
      }
      revalidatePath(`/gestionnaire/biens/lots/${lotId}`)
      revalidatePath('/gestionnaire/biens')
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

    // Get lot data before soft delete to know which building to revalidate
    const lotData = await service.getById(lotId)
    const buildingId = lotData.success ? lotData.data?.building_id : null

    const result = await service.softDelete(lotId)

    if (result.success) {
      logger.info('✅ [DELETE-LOT-ACTION] Lot deleted successfully', {
        lotId
      })

      // ✅ Revalidate using both tags and paths
      revalidateTag('lots')
      if (buildingId) {
        revalidateTag('buildings')
        revalidateTag(`building-${buildingId}`)
        const supabase = await createServerActionSupabaseClient()
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('team_id')
          .eq('id', buildingId)
          .single()
        
        if (buildingData?.team_id) {
          revalidateTag(`buildings-team-${buildingData.team_id}`)
          revalidateTag(`lots-team-${buildingData.team_id}`)
        }
        revalidatePath(`/gestionnaire/biens/immeubles/${buildingId}`)
      }
      revalidatePath('/gestionnaire/biens')
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
