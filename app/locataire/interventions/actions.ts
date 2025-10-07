'use server'

import { createServerTenantService } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Server Action: Get all lots for a tenant user
 *
 * This function runs on the server and has access to cookies(),
 * making it safe to call from Client Components.
 *
 * @param userId - The tenant user ID
 * @returns Array of lots with building information
 */
export async function getTenantLots(userId: string) {
  try {
    logger.info('🏠 [SERVER-ACTION] getTenantLots called for user:', userId)

    const tenantService = await createServerTenantService()
    const lots = await tenantService.getSimpleTenantLots(userId)

    logger.info('✅ [SERVER-ACTION] getTenantLots success:', {
      userId,
      lotsCount: lots?.length || 0
    })

    return lots || []
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] getTenantLots failed:', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Return empty array on error instead of throwing
    // This allows the client to handle gracefully
    return []
  }
}
