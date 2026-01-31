import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createNotificationRepository } from '@/lib/services/repositories/notification-repository'
import { useRealtimeNotificationsV2 } from './use-realtime-notifications-v2'

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

interface UseNotificationPopoverOptions {
  teamId?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseNotificationPopoverReturn {
  notifications: Notification[]
  loading: boolean
  error: string | null
  unreadCount: number
  refetch: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAsUnread: (id: string) => Promise<void>
  archive: (id: string) => Promise<void>
}

export const useNotificationPopover = (
  options: UseNotificationPopoverOptions = {}
): UseNotificationPopoverReturn => {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create repository instance (browser client)
  const repository = createNotificationRepository()

  const {
    teamId,
    limit = 10,
    autoRefresh = false, // DISABLED: Use Supabase Realtime instead of polling
    refreshInterval = 60000 // 60 seconds (if manually enabled)
  } = options

  const fetchNotifications = useCallback(async () => {
    // Attendre que l'auth soit prête avant de fetch
    if (authLoading) return

    // RLS filtre par user_id automatiquement
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      const result = await repository.findByUser(user.id, {
        archived: false,
        read: undefined
      })

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch notifications')
      }

      // Pas de filtrage par team_id : cross-team notifications pour prestataires/locataires
      const notifications = (result.data || []).slice(0, limit)
      setNotifications(notifications)
    } catch (err) {
      console.error('[USE-NOTIFICATION-POPOVER] Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit, authLoading])

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ✅ Stocker limit dans une ref pour éviter les re-renders inutiles
  const limitRef = useRef(limit)
  useEffect(() => {
    limitRef.current = limit
  })

  // Realtime subscription for instant updates
  useRealtimeNotificationsV2({
    enabled: !!user?.id,
    onInsert: (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, limitRef.current))
    },
    onUpdate: (notification) => {
      setNotifications(prev => prev.map(n => n.id === notification.id ? notification : n))
    },
    onDelete: (notification) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }
  })

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || authLoading) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchNotifications, authLoading])

  // Mark notification as read (optimistic update)
  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(notif => notif.id === id
          ? { ...notif, read: true, read_at: new Date().toISOString() }
          : notif
        )
      )

      const result = await repository.markAsRead(id)
      if (!result.success) throw new Error(result.error?.message || 'Failed to mark as read')
    } catch (err) {
      await fetchNotifications() // Revert on error
      throw err
    }
  }, [fetchNotifications])

  // Mark notification as unread (optimistic update)
  const markAsUnread = useCallback(async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(notif => notif.id === id
          ? { ...notif, read: false, read_at: undefined }
          : notif
        )
      )

      const result = await repository.update(id, { read: false, read_at: null })
      if (!result.success) throw new Error(result.error?.message || 'Failed to mark as unread')
    } catch (err) {
      await fetchNotifications() // Revert on error
      throw err
    }
  }, [fetchNotifications])

  // Archive notification (optimistic update)
  const archive = useCallback(async (id: string) => {
    try {
      setNotifications(prev => prev.filter(notif => notif.id !== id))

      const result = await repository.archive(id)
      if (!result.success) throw new Error(result.error?.message || 'Failed to archive notification')
    } catch (err) {
      await fetchNotifications() // Revert on error
      throw err
    }
  }, [fetchNotifications])

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAsUnread,
    archive
  }
}
