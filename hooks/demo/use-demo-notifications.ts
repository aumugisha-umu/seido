/**
 * Hook pour récupérer les notifications en mode démo
 * Filtre par scope : personal (user_id) ou team (team_id)
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface NotificationFilters {
  scope?: 'personal' | 'team' | 'all'
  is_read?: boolean
  type?: string
}

export function useDemoNotifications(filters?: NotificationFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const notifications = useMemo(() => {
    if (!user) return []

    let results: any[] = []

    // Filtrage par scope
    if (filters?.scope === 'personal' || filters?.scope === undefined) {
      // Notifications personnelles (user_id)
      const personalNotifs = store.query('notifications', {
        filters: { user_id: user.id },
        sort: { field: 'created_at', order: 'desc' }
      })
      results = [...personalNotifs]
    }

    if (filters?.scope === 'team' || filters?.scope === 'all') {
      // Notifications d'équipe (team_id)
      const teamNotifs = store.query('notifications', {
        filters: { team_id: user.team_id, user_id: null },
        sort: { field: 'created_at', order: 'desc' }
      })
      results = [...results, ...teamNotifs]
    }

    // Filtrer par statut de lecture
    if (filters?.is_read !== undefined) {
      results = results.filter((n: any) => n.is_read === filters.is_read)
    }

    // Filtrer par type
    if (filters?.type) {
      results = results.filter((n: any) => n.type === filters.type)
    }

    // Dédupliquer (au cas où)
    const uniqueResults = Array.from(new Set(results.map((n: any) => n.id)))
      .map(id => results.find((n: any) => n.id === id))
      .filter(Boolean)

    // Trier par date
    uniqueResults.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return uniqueResults
  }, [store, user, filters?.scope, filters?.is_read, filters?.type])

  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => !n.is_read).length
  }, [notifications])

  return {
    notifications,
    unreadCount,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer une notification spécifique
 */
export function useDemoNotification(notificationId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const notification = useMemo(() => {
    if (!notificationId || !user) return null

    const result = store.get('notifications', notificationId)
    if (!result) return null

    // Vérifier l'accès : notification personnelle ou d'équipe
    if (result.user_id && result.user_id !== user.id) {
      return null
    }

    if (result.team_id && result.team_id !== user.team_id) {
      return null
    }

    return result
  }, [store, notificationId, user])

  return {
    notification,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les notifications par type
 */
export function useDemoNotificationsByType() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const notificationsByType = useMemo(() => {
    if (!user) {
      return {
        intervention: [],
        system: [],
        team: [],
        message: [],
        document: []
      }
    }

    // Récupérer toutes les notifications (personnelles + équipe)
    const personalNotifs = store.query('notifications', {
      filters: { user_id: user.id }
    })

    const teamNotifs = store.query('notifications', {
      filters: { team_id: user.team_id, user_id: null }
    })

    const allNotifs = [...personalNotifs, ...teamNotifs]

    return {
      intervention: allNotifs.filter((n: any) => n.type === 'intervention'),
      system: allNotifs.filter((n: any) => n.type === 'system'),
      team: allNotifs.filter((n: any) => n.type === 'team'),
      message: allNotifs.filter((n: any) => n.type === 'message'),
      document: allNotifs.filter((n: any) => n.type === 'document')
    }
  }, [store, user])

  return {
    ...notificationsByType,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques des notifications
 */
export function useDemoNotificationStats() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!user) {
      return {
        total: 0,
        unread: 0,
        today: 0,
        thisWeek: 0
      }
    }

    // Récupérer toutes les notifications (personnelles + équipe)
    const personalNotifs = store.query('notifications', {
      filters: { user_id: user.id }
    })

    const teamNotifs = store.query('notifications', {
      filters: { team_id: user.team_id, user_id: null }
    })

    const allNotifs = [...personalNotifs, ...teamNotifs]

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    return {
      total: allNotifs.length,
      unread: allNotifs.filter((n: any) => !n.is_read).length,
      today: allNotifs.filter((n: any) =>
        new Date(n.created_at) >= todayStart
      ).length,
      thisWeek: allNotifs.filter((n: any) =>
        new Date(n.created_at) >= weekStart
      ).length
    }
  }, [store, user])

  return {
    stats,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les notifications récentes (non lues + 5 dernières lues)
 */
export function useDemoRecentNotifications(limit: number = 10) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const notifications = useMemo(() => {
    if (!user) return []

    // Récupérer toutes les notifications (personnelles + équipe)
    const personalNotifs = store.query('notifications', {
      filters: { user_id: user.id }
    })

    const teamNotifs = store.query('notifications', {
      filters: { team_id: user.team_id, user_id: null }
    })

    const allNotifs = [...personalNotifs, ...teamNotifs]

    // Trier par date
    allNotifs.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Prendre les non lues + les X dernières lues
    const unread = allNotifs.filter((n: any) => !n.is_read)
    const read = allNotifs.filter((n: any) => n.is_read).slice(0, Math.max(0, limit - unread.length))

    return [...unread, ...read].slice(0, limit)
  }, [store, user, limit])

  return {
    notifications,
    isLoading: false,
    error: null
  }
}
