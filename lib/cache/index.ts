/**
 * Cache Module Exports
 *
 * Ce module centralise toutes les fonctions de cache de l'application.
 *
 * @module lib/cache
 */

export {
  // Cached query functions
  getCachedManagerStats,
  getCachedManagerStatsForTeam,
  getCachedBuildingsForTeam,
  getCachedTeamMembers,

  // Cache tags reference
  CACHE_TAGS
} from './cached-queries'
