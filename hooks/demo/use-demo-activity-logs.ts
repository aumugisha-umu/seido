/**
 * Hook pour récupérer les activity logs en mode démo
 * Filtre par team_id, entity_type, entity_id
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface ActivityLogFilters {
  team_id?: string
  entity_type?: 'intervention' | 'building' | 'lot' | 'user' | 'team'
  entity_id?: string
  action?: string
  user_id?: string
}

export function useDemoActivityLogs(filters?: ActivityLogFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!user) return []

    // Construire les filtres
    const queryFilters: Record<string, any> = {
      team_id: filters?.team_id || user.team_id
    }

    // Filtres optionnels
    if (filters?.entity_type) {
      queryFilters.entity_type = filters.entity_type
    }

    if (filters?.entity_id) {
      queryFilters.entity_id = filters.entity_id
    }

    if (filters?.action) {
      queryFilters.action = filters.action
    }

    if (filters?.user_id) {
      queryFilters.user_id = filters.user_id
    }

    // Récupérer les activity logs
    const logs = store.query('activity_logs', {
      filters: queryFilters,
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    return logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })
  }, [store, user, filters?.team_id, filters?.entity_type, filters?.entity_id, filters?.action, filters?.user_id])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs d'une intervention
 */
export function useDemoInterventionActivityLogs(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!interventionId || !user) return []

    const logs = store.query('activity_logs', {
      filters: {
        entity_type: 'intervention',
        entity_id: interventionId
      },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    return logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })
  }, [store, interventionId, user])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs d'un immeuble
 */
export function useDemoBuildingActivityLogs(buildingId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!buildingId || !user) return []

    const logs = store.query('activity_logs', {
      filters: {
        entity_type: 'building',
        entity_id: buildingId
      },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    return logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })
  }, [store, buildingId, user])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs d'un lot
 */
export function useDemoLotActivityLogs(lotId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!lotId || !user) return []

    const logs = store.query('activity_logs', {
      filters: {
        entity_type: 'lot',
        entity_id: lotId
      },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    return logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })
  }, [store, lotId, user])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs d'un utilisateur
 */
export function useDemoUserActivityLogs(userId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!userId || !user) return []

    const logs = store.query('activity_logs', {
      filters: {
        user_id: userId,
        team_id: user.team_id
      },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users (l'utilisateur lui-même dans ce cas)
    return logs.map((log: any) => {
      const logUser = store.get('users', userId)
      return {
        ...log,
        user: logUser
      }
    })
  }, [store, userId, user])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs récents de l'équipe
 */
export function useDemoRecentTeamActivityLogs(limit: number = 20) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const activityLogs = useMemo(() => {
    if (!user) return []

    const logs = store.query('activity_logs', {
      filters: { team_id: user.team_id },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    const enrichedLogs = logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })

    return enrichedLogs.slice(0, limit)
  }, [store, user, limit])

  return {
    activityLogs,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques des activity logs
 */
export function useDemoActivityLogStats(filters?: { entity_type?: string; entity_id?: string }) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!user) {
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        byAction: {}
      }
    }

    // Construire les filtres
    const queryFilters: Record<string, any> = {
      team_id: user.team_id
    }

    if (filters?.entity_type) {
      queryFilters.entity_type = filters.entity_type
    }

    if (filters?.entity_id) {
      queryFilters.entity_id = filters.entity_id
    }

    const logs = store.query('activity_logs', { filters: queryFilters })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Compter par action
    const byAction: Record<string, number> = {}
    logs.forEach((log: any) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1
    })

    return {
      total: logs.length,
      today: logs.filter((log: any) =>
        new Date(log.created_at) >= todayStart
      ).length,
      thisWeek: logs.filter((log: any) =>
        new Date(log.created_at) >= weekStart
      ).length,
      byAction
    }
  }, [store, user, filters?.entity_type, filters?.entity_id])

  return {
    stats,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les activity logs groupés par jour
 */
export function useDemoActivityLogsByDay(filters?: ActivityLogFilters, days: number = 7) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const logsByDay = useMemo(() => {
    if (!user) return []

    // Construire les filtres
    const queryFilters: Record<string, any> = {
      team_id: filters?.team_id || user.team_id
    }

    if (filters?.entity_type) queryFilters.entity_type = filters.entity_type
    if (filters?.entity_id) queryFilters.entity_id = filters.entity_id
    if (filters?.action) queryFilters.action = filters.action
    if (filters?.user_id) queryFilters.user_id = filters.user_id

    const logs = store.query('activity_logs', {
      filters: queryFilters,
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les users
    const enrichedLogs = logs.map((log: any) => {
      const logUser = log.user_id ? store.get('users', log.user_id) : null
      return {
        ...log,
        user: logUser
      }
    })

    // Filtrer par les X derniers jours
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentLogs = enrichedLogs.filter((log: any) =>
      new Date(log.created_at) >= cutoffDate
    )

    // Grouper par jour
    const grouped: Record<string, any[]> = {}

    recentLogs.forEach((log: any) => {
      const date = new Date(log.created_at)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }

      grouped[dateKey].push(log)
    })

    // Convertir en tableau et trier par date
    const result = Object.entries(grouped).map(([date, logs]) => ({
      date,
      logs,
      count: logs.length
    }))

    result.sort((a, b) => b.date.localeCompare(a.date))

    return result
  }, [store, user, filters?.team_id, filters?.entity_type, filters?.entity_id, filters?.action, filters?.user_id, days])

  return {
    logsByDay,
    isLoading: false,
    error: null
  }
}
