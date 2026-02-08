/**
 * ⚡ Cached Queries - Next.js 15 unstable_cache wrappers
 *
 * Ce fichier centralise les requêtes cachées avec unstable_cache.
 * Les tags permettent l'invalidation granulaire via revalidateTag().
 *
 * Usage dans Server Components:
 * ```typescript
 * import { getCachedManagerStats, getCachedBuildings } from '@/lib/cache/cached-queries'
 *
 * // Dans un Server Component
 * const stats = await getCachedManagerStats(teamId)
 * ```
 *
 * @file lib/cache/cached-queries.ts
 * @created 2025-11-28
 */

import { unstable_cache } from 'next/cache'
import { createServerStatsService, createServerBuildingService, createServerTeamService } from '@/lib/services'
import { logger } from '@/lib/logger'

// ============================================================================
// Manager Stats Cache (5 minutes)
// ============================================================================

/**
 * Cache pour getManagerStats() - requête avec 3 sous-requêtes parallèles
 * TTL: 5 minutes
 * Tags: ['stats', 'manager-stats', `team-${teamId}-stats`]
 */
export const getCachedManagerStats = unstable_cache(
  async (teamId: string) => {
    logger.info(`📊 [CACHE] Fetching manager stats for team ${teamId}`)

    const statsService = await createServerStatsService()
    const result = await statsService.getManagerStats(teamId)

    if (!result.success) {
      logger.error(`❌ [CACHE] Failed to get manager stats:`, result.error)
      throw new Error(result.error || 'Failed to get manager stats')
    }

    logger.info(`✅ [CACHE] Manager stats fetched and cached for team ${teamId}`)
    return result.data
  },
  ['manager-stats'],
  {
    revalidate: 300, // 5 minutes
    tags: ['stats', 'manager-stats']
  }
)

/**
 * Version avec tag d'équipe spécifique (pour invalidation granulaire)
 */
export function getCachedManagerStatsForTeam(teamId: string) {
  return unstable_cache(
    async () => {
      logger.info(`📊 [CACHE] Fetching manager stats for team ${teamId}`)

      const statsService = await createServerStatsService()
      const result = await statsService.getManagerStats(teamId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to get manager stats')
      }

      return result.data
    },
    [`manager-stats-${teamId}`],
    {
      revalidate: 300,
      tags: ['stats', 'manager-stats', `team-${teamId}-stats`]
    }
  )()
}

// ============================================================================
// Buildings Cache (5 minutes)
// ============================================================================

/**
 * Cache pour liste des buildings avec relations
 * TTL: 5 minutes
 * Tags: ['buildings', `team-${teamId}-buildings`]
 */
export function getCachedBuildingsForTeam(teamId: string) {
  return unstable_cache(
    async () => {
      logger.info(`🏢 [CACHE] Fetching buildings for team ${teamId}`)

      const buildingService = await createServerBuildingService()
      const result = await buildingService.getAll()

      if (!result.success) {
        throw new Error(result.error || 'Failed to get buildings')
      }

      // Filter by team (RLS should handle this, but double-check)
      const teamBuildings = result.data?.filter(b => b.team_id === teamId) || []

      logger.info(`✅ [CACHE] ${teamBuildings.length} buildings cached for team ${teamId}`)
      return teamBuildings
    },
    [`buildings-${teamId}`],
    {
      revalidate: 300,
      tags: ['buildings', `team-${teamId}-buildings`]
    }
  )()
}

// ============================================================================
// Team Members Cache (10 minutes - données stables)
// ============================================================================

/**
 * Cache pour les membres d'une équipe
 * TTL: 10 minutes (données plus stables)
 * Tags: ['team-members', `team-${teamId}-members`]
 */
export function getCachedTeamMembers(teamId: string) {
  return unstable_cache(
    async () => {
      logger.info(`👥 [CACHE] Fetching team members for team ${teamId}`)

      const teamService = await createServerTeamService()
      const result = await teamService.getTeamMembers(teamId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to get team members')
      }

      logger.info(`✅ [CACHE] ${result.data?.length || 0} team members cached for team ${teamId}`)
      return result.data || []
    },
    [`team-members-${teamId}`],
    {
      revalidate: 600, // 10 minutes
      tags: ['team-members', `team-${teamId}-members`]
    }
  )()
}

// ============================================================================
// Intervention Types Cache (5 minutes - reference data)
// ============================================================================

/**
 * Cache pour intervention types - données de référence rarement modifiées
 * TTL: 5 minutes
 * Tags: ['intervention-types']
 *
 * Note: Ces données changent rarement (admin only), donc un cache long est approprié.
 */
export const getCachedInterventionTypes = unstable_cache(
  async () => {
    logger.info('📋 [CACHE] Fetching intervention types...')

    const { getInterventionTypesServer } = await import('@/lib/services/domain/intervention-types.server')
    const result = await getInterventionTypesServer()

    if (!result) {
      logger.error('❌ [CACHE] Failed to get intervention types')
      throw new Error('Failed to get intervention types')
    }

    logger.info(`✅ [CACHE] Intervention types cached (${result.types.length} types, ${result.categories.length} categories)`)
    return result
  },
  ['intervention-types'],
  {
    revalidate: 300, // 5 minutes
    tags: ['intervention-types']
  }
)

// ============================================================================
// Utility: Manual Cache Invalidation
// ============================================================================

/**
 * Liste des tags disponibles pour référence
 */
export const CACHE_TAGS = {
  // Stats
  STATS: 'stats',
  MANAGER_STATS: 'manager-stats',
  teamStats: (teamId: string) => `team-${teamId}-stats`,

  // Buildings
  BUILDINGS: 'buildings',
  teamBuildings: (teamId: string) => `team-${teamId}-buildings`,

  // Lots
  LOTS: 'lots',
  teamLots: (teamId: string) => `team-${teamId}-lots`,

  // Team Members
  TEAM_MEMBERS: 'team-members',
  teamMembers: (teamId: string) => `team-${teamId}-members`,

  // Interventions
  INTERVENTIONS: 'interventions',
  teamInterventions: (teamId: string) => `team-${teamId}-interventions`,

  // Intervention Types (reference data)
  INTERVENTION_TYPES: 'intervention-types',

  // Notifications
  NOTIFICATIONS: 'notifications',
  userNotifications: (userId: string) => `user-${userId}-notifications`
} as const
