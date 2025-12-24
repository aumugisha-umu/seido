import { useState, useEffect, useCallback } from 'react'
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
  const { user } = useAuth()
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
    console.log('🔍 [USE-NOTIFICATION-POPOVER] fetchNotifications called with:', {
      userId: user?.id,
      teamId,
      limit,
      hasUserId: !!user?.id
    })

    // Note: On ne requiert plus teamId car les prestataires/locataires peuvent recevoir
    // des notifications d'équipes auxquelles ils ne font pas partie (via intervention assignments)
    // La sécurité est assurée par RLS (user_id = get_current_user_id())
    if (!user?.id) {
      console.log('❌ [USE-NOTIFICATION-POPOVER] Missing user ID, skipping fetch')
      setLoading(false)
      return
    }

    try {
      setError(null)

      console.log('📡 [USE-NOTIFICATION-POPOVER] Fetching notifications from repository...')
      // Fetch notifications using repository - RLS filters by user_id automatically
      const result = await repository.findByUser(user.id, {
        archived: false,
        read: undefined // Get both read and unread
      })

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch notifications')
      }

      console.log('📦 [USE-NOTIFICATION-POPOVER] Repository returned:', result.data?.length, 'notifications')

      // Note: On ne filtre plus par team_id côté client car:
      // 1. La RLS assure déjà que l'utilisateur ne voit que SES notifications (user_id)
      // 2. Les prestataires/locataires reçoivent des notifications d'autres équipes (cross-team)
      // 3. Filtrer par team_id exclurait ces notifications légitimes
      let notifications = result.data || []
      notifications = notifications.slice(0, limit)

      console.log('✅ [USE-NOTIFICATION-POPOVER] Final notifications count:', notifications.length)
      setNotifications(notifications)
    } catch (err) {
      console.error('❌ [USE-NOTIFICATION-POPOVER] Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit])

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription for instant updates (v2 - uses RealtimeProvider context)
  // Note: On ne filtre plus par team_id - toutes les notifications de l'utilisateur sont affichées
  useRealtimeNotificationsV2({
    enabled: !!user?.id,
    onInsert: useCallback((notification) => {
      console.log('[NOTIFICATION-POPOVER] New notification received via Realtime v2')
      // Add to top of list - no team_id filtering (RLS ensures security via user_id)
      setNotifications(prev => [notification, ...prev].slice(0, limit))
    }, [limit]),
    onUpdate: useCallback((notification) => {
      console.log('[NOTIFICATION-POPOVER] Notification updated via Realtime v2')
      // Update in list
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? notification : n)
      )
    }, []),
    onDelete: useCallback((notification) => {
      console.log('[NOTIFICATION-POPOVER] Notification deleted via Realtime v2')
      // Remove from list
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, [])
  })

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchNotifications])

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      console.log('📖 [USE-NOTIFICATION-POPOVER] Marking notification as read:', id)

      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      )

      const result = await repository.markAsRead(id)

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to mark as read')
      }

      console.log('✅ [USE-NOTIFICATION-POPOVER] Notification marked as read successfully')
    } catch (err) {
      console.error('❌ [USE-NOTIFICATION-POPOVER] Error marking notification as read:', err)
      // Revert optimistic update on error
      await fetchNotifications()
      throw err
    }
  }, [fetchNotifications])

  // Mark notification as unread
  const markAsUnread = useCallback(async (id: string) => {
    try {
      console.log('📖 [USE-NOTIFICATION-POPOVER] Marking notification as unread:', id)

      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id
            ? { ...notif, read: false, read_at: undefined }
            : notif
        )
      )

      // markAsUnread: Update manually since repository doesn't have this method yet
      const result = await repository.update(id, {
        read: false,
        read_at: null
      })

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to mark as unread')
      }

      console.log('✅ [USE-NOTIFICATION-POPOVER] Notification marked as unread successfully')
    } catch (err) {
      console.error('❌ [USE-NOTIFICATION-POPOVER] Error marking notification as unread:', err)
      // Revert optimistic update on error
      await fetchNotifications()
      throw err
    }
  }, [fetchNotifications])

  // Archive notification
  const archive = useCallback(async (id: string) => {
    try {
      console.log('📦 [USE-NOTIFICATION-POPOVER] Archiving notification:', id)

      // Optimistic update - remove from list
      setNotifications(prev => prev.filter(notif => notif.id !== id))

      const result = await repository.archive(id)

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to archive notification')
      }

      console.log('✅ [USE-NOTIFICATION-POPOVER] Notification archived successfully')
    } catch (err) {
      console.error('❌ [USE-NOTIFICATION-POPOVER] Error archiving notification:', err)
      // Revert optimistic update on error
      await fetchNotifications()
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
