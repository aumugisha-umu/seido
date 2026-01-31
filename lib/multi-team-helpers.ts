/**
 * 🏢 Multi-Team Helpers - Utilitaires pour vue consolidée multi-équipes
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Helpers pour charger et fusionner des données
 * de plusieurs équipes en parallèle.
 *
 * Pattern utilisé:
 * 1. Requêtes parallèles Promise.all pour chaque équipe
 * 2. Merge des résultats avec info équipe sur chaque item
 * 3. RLS de Supabase garantit l'isolation des données
 */

import { logger } from '@/lib/logger'

/**
 * Type générique pour un résultat de service
 */
interface ServiceResult<T> {
  success: boolean
  data?: T[]
  error?: { code: string; message: string }
}

/**
 * Options pour le chargement multi-équipes
 */
interface MultiTeamLoadOptions {
  /** IDs des équipes à charger */
  teamIds: string[]
  /** Dictionnaire des noms d'équipes pour enrichir les résultats */
  teamNames?: Record<string, string>
  /** Limiter les résultats par équipe (optionnel) */
  limitPerTeam?: number
}

/**
 * Résultat enrichi avec info équipe
 */
export type WithTeamInfo<T> = T & {
  _teamId: string
  _teamName?: string
}

/**
 * Charge des données de plusieurs équipes en parallèle et les fusionne
 *
 * @param loadFn - Fonction qui charge les données pour une équipe donnée
 * @param options - Options de chargement (teamIds, teamNames, etc.)
 * @returns Tableau fusionné de tous les résultats avec info équipe
 *
 * @example
 * const allBuildings = await loadMultiTeamData(
 *   (teamId) => buildingService.getBuildingsByTeam(teamId),
 *   { teamIds: activeTeamIds, teamNames: { [team1.id]: team1.name, ... } }
 * )
 */
export async function loadMultiTeamData<T extends { id: string }>(
  loadFn: (teamId: string) => Promise<ServiceResult<T>>,
  options: MultiTeamLoadOptions
): Promise<WithTeamInfo<T>[]> {
  const { teamIds, teamNames = {}, limitPerTeam } = options

  if (!teamIds.length) {
    logger.warn('⚠️ [MULTI-TEAM] loadMultiTeamData called with empty teamIds')
    return []
  }

  logger.info('🔄 [MULTI-TEAM] Loading data from teams:', teamIds)

  // Charger en parallèle
  const promises = teamIds.map(teamId => loadFn(teamId))
  const results = await Promise.allSettled(promises)

  // Fusionner les résultats
  const mergedData: WithTeamInfo<T>[] = []

  results.forEach((result, index) => {
    const teamId = teamIds[index]

    if (result.status === 'fulfilled' && result.value.success && result.value.data) {
      let items = result.value.data

      // Limiter si demandé
      if (limitPerTeam && items.length > limitPerTeam) {
        items = items.slice(0, limitPerTeam)
      }

      // Enrichir chaque item avec info équipe
      const enrichedItems = items.map(item => ({
        ...item,
        _teamId: teamId,
        _teamName: teamNames[teamId]
      }))

      mergedData.push(...enrichedItems)
      logger.info(`✅ [MULTI-TEAM] Loaded ${items.length} items from team ${teamNames[teamId] || teamId}`)
    } else {
      const error = result.status === 'rejected'
        ? result.reason
        : result.value.error
      logger.warn(`⚠️ [MULTI-TEAM] Failed to load from team ${teamId}:`, error)
    }
  })

  logger.info(`✅ [MULTI-TEAM] Total items merged: ${mergedData.length}`)
  return mergedData
}

/**
 * Charge des compteurs de plusieurs équipes et les somme
 *
 * @param countFn - Fonction qui retourne un compteur pour une équipe
 * @param teamIds - IDs des équipes
 * @returns Somme des compteurs
 *
 * @example
 * const totalInterventions = await sumMultiTeamCounts(
 *   (teamId) => interventionService.countByTeam(teamId),
 *   activeTeamIds
 * )
 */
export async function sumMultiTeamCounts(
  countFn: (teamId: string) => Promise<number>,
  teamIds: string[]
): Promise<number> {
  if (!teamIds.length) return 0

  const promises = teamIds.map(teamId => countFn(teamId))
  const results = await Promise.allSettled(promises)

  return results.reduce((sum, result) => {
    if (result.status === 'fulfilled') {
      return sum + result.value
    }
    return sum
  }, 0)
}

/**
 * Charge des statistiques de plusieurs équipes et les agrège
 *
 * @param statsFn - Fonction qui retourne les stats pour une équipe
 * @param teamIds - IDs des équipes
 * @param aggregator - Fonction pour combiner les stats
 * @returns Stats agrégées
 *
 * @example
 * const totalStats = await aggregateMultiTeamStats(
 *   (teamId) => statsService.getByTeam(teamId),
 *   activeTeamIds,
 *   (accumulated, current) => ({
 *     total: accumulated.total + current.total,
 *     ...
 *   })
 * )
 */
export async function aggregateMultiTeamStats<T>(
  statsFn: (teamId: string) => Promise<T>,
  teamIds: string[],
  aggregator: (accumulated: T, current: T) => T,
  initialValue: T
): Promise<T> {
  if (!teamIds.length) return initialValue

  const promises = teamIds.map(teamId => statsFn(teamId))
  const results = await Promise.allSettled(promises)

  return results.reduce((acc, result) => {
    if (result.status === 'fulfilled') {
      return aggregator(acc, result.value)
    }
    return acc
  }, initialValue)
}

/**
 * Crée un dictionnaire teamId → teamName depuis un tableau d'équipes
 */
export function createTeamNameMap(teams: { id: string; name: string }[]): Record<string, string> {
  return teams.reduce((map, team) => {
    map[team.id] = team.name
    return map
  }, {} as Record<string, string>)
}

/**
 * Déduplique des items par ID (utile si un item apparaît dans plusieurs équipes)
 * Garde la première occurrence
 */
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
