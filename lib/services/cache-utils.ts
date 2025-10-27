/**
 * Cache Utilities
 * Manual cache management for debugging and maintenance
 */

import { cache } from '@/lib/cache/cache-manager'
import { logger } from '@/lib/logger'

/**
 * Clear all cache entries for a specific intervention
 * Useful when cache gets corrupted or after data updates
 *
 * @param interventionId - The intervention UUID
 */
export async function clearInterventionCache(interventionId: string) {
  const patterns = [
    `intervention:${interventionId}:complete-details`,
    `intervention:${interventionId}:timeslot-responses`,
    `intervention:${interventionId}:` // Catch-all for this intervention
  ]

  logger.info('🗑️ [CACHE-UTILS] Clearing intervention cache', { interventionId, patterns })

  for (const pattern of patterns) {
    await cache.invalidate(pattern)
  }

  logger.info('✅ [CACHE-UTILS] Intervention cache cleared', { interventionId })
}

/**
 * Clear all intervention caches
 * ⚠️ Use sparingly - clears cache for ALL interventions
 */
export async function clearAllInterventionCaches() {
  logger.warn('⚠️ [CACHE-UTILS] Clearing ALL intervention caches')

  await cache.invalidate('intervention:')

  logger.info('✅ [CACHE-UTILS] All intervention caches cleared')
}

/**
 * Clear building cache
 */
export async function clearBuildingCache(buildingId: string) {
  const patterns = [
    `buildings:team:`,
    `building:${buildingId}:`
  ]

  logger.info('🗑️ [CACHE-UTILS] Clearing building cache', { buildingId, patterns })

  for (const pattern of patterns) {
    await cache.invalidate(pattern)
  }

  logger.info('✅ [CACHE-UTILS] Building cache cleared', { buildingId })
}

/**
 * Clear lot cache
 */
export async function clearLotCache(lotId: string) {
  const patterns = [
    `lots:team:`,
    `lot:${lotId}:`
  ]

  logger.info('🗑️ [CACHE-UTILS] Clearing lot cache', { lotId, patterns })

  for (const pattern of patterns) {
    await cache.invalidate(pattern)
  }

  logger.info('✅ [CACHE-UTILS] Lot cache cleared', { lotId })
}

/**
 * Clear ALL caches (nuclear option)
 * ⚠️ Use only in development or emergencies
 */
export async function clearAllCaches() {
  logger.warn('☢️ [CACHE-UTILS] CLEARING ALL CACHES (nuclear option)')

  // Clear all known cache patterns
  const patterns = [
    'intervention:',
    'buildings:',
    'lots:',
    'users:',
    'teams:'
  ]

  for (const pattern of patterns) {
    await cache.invalidate(pattern)
  }

  logger.info('✅ [CACHE-UTILS] All caches cleared')
}

/**
 * Get cache statistics
 * Useful for debugging cache issues
 */
export async function getCacheStats() {
  // Note: This requires CacheManager to expose stats
  // For now, return basic info
  return {
    message: 'Cache stats not implemented yet',
    // TODO: Implement stats tracking in CacheManager
  }
}
