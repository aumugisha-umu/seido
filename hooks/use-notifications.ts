import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger, logError } from '@/lib/logger'
export interface Notification {
  id: string
  user_id: string
  team_id: string
  created_by: string
  type: 'intervention' | 'payment' | 'document' | 'system' | 'team_invite' | 'assignment' | 'status_change' | 'reminder'
  title: string
  message: string
  read: boolean
  archived: boolean
  is_personal: boolean
  metadata: Record<string, any>
  related_entity_type?: string
  related_entity_id?: string
  created_at: string
  read_at?: string
  created_by_user?: {
    id: string
    name: string
    email: string
  }
  team?: {
    id: string
    name: string
  }
}

interface UseNotificationsOptions {
  teamId?: string
  scope?: 'personal' | 'team' | null  // Nouveau paramètre pour différencier personnel/équipe
  read?: boolean
  type?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseNotificationsReturn {
  notifications: Notification[]
  loading: boolean
  error: string | null
  unreadCount: number
  refetch: () => Promise<void>
  markAsRead: (_id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archive: (_id: string) => Promise<void>
}

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    teamId,
    scope,
    read,
    type,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options

  const fetchNotifications = async () => {
    // Attendre que l'auth soit prête avant de fetch
    if (authLoading) return

    if (!user?.id || !teamId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const params = new URLSearchParams({
        limit: limit.toString(),
      })
      
      // Pour le scope 'personal' et 'team', pas besoin d'envoyer user_id car l'API utilise la session
      // Pour les autres cas (compatibilité), on envoie user_id
      if (!scope) {
        params.append('user_id', user.id)
      }
      
      if (teamId) params.append('team_id', teamId)
      if (scope) params.append('scope', scope)
      if (read !== undefined) params.append('read', read.toString())
      if (type) params.append('type', type)

      const url = `/api/notifications?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to fetch notifications: ${errorData.details || response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setNotifications(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (_id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark_read' }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      const result = await response.json()
      
      if (result.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === _id
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        )
      }
    } catch (err) {
      logger.error('Error marking notification as read:', err)
      throw err
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      
      // Marquer toutes les notifications non lues
      const promises = unreadNotifications.map(notif => markAsRead(notif.id))
      await Promise.all(promises)
    } catch (err) {
      logger.error('Error marking all notifications as read:', err)
      throw err
    }
  }

  const archive = async (_id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'archive' }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive notification')
      }

      const result = await response.json()
      
      if (result.success) {
        setNotifications(prev =>
          prev.filter(notif => notif.id !== _id)
        )
      }
    } catch (err) {
      logger.error('Error archiving notification:', err)
      throw err
    }
  }

  // Fetch initial data (authLoading dependency ensures re-fetch when auth completes)
  useEffect(() => {
    fetchNotifications()
  }, [user?.id, teamId, read, type, limit, authLoading, scope])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || authLoading) return

    const interval = setInterval(fetchNotifications, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, user?.id, teamId, read, type, limit, authLoading, scope])

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    archive,
  }
}
