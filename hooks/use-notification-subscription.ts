'use client'

/**
 * useNotificationSubscription Hook
 * Custom hook for real-time notification management with Supabase
 * Handles notifications, unread counts, and real-time updates
 */

import { useState, useEffect, useCallback, useRef, useOptimistic } from 'react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { toast } from 'sonner'
import type {
  Tables,
  Enums
} from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Type aliases
type Notification = Tables<'notifications'>
type NotificationType = Enums<'notification_type'>
type NotificationPriority = Enums<'notification_priority'>

// Extended notification type
interface NotificationWithMeta extends Notification {
  is_optimistic?: boolean
  temp_id?: string
}

// Hook return type
interface UseNotificationSubscriptionReturn {
  // Data
  notifications: NotificationWithMeta[]
  unreadCount: number
  loading: boolean

  // Actions
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archive: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>

  // Real-time
  isConnected: boolean
}

// Notification sound (optional - can be customized)
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(e => console.log('Could not play notification sound:', e))
  } catch (e) {
    // Silently fail if sound cannot be played
  }
}

export function useNotificationSubscription(): UseNotificationSubscriptionReturn {
  // State
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null)

  // Optimistic updates with React 19 useOptimistic
  const [optimisticNotifications, updateOptimisticNotifications] = useOptimistic(
    notifications,
    (state, action: { type: 'read' | 'archive' | 'delete' | 'read_all', id?: string }) => {
      switch (action.type) {
        case 'read':
          return state.map(notif =>
            notif.id === action.id
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        case 'archive':
          return state.map(notif =>
            notif.id === action.id
              ? { ...notif, archived: true }
              : notif
          )
        case 'delete':
          return state.filter(notif => notif.id !== action.id)
        case 'read_all':
          return state.map(notif =>
            !notif.read
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        default:
          return state
      }
    }
  )

  // Calculate unread count from optimistic notifications
  useEffect(() => {
    const count = optimisticNotifications.filter(n => !n.read && !n.archived).length
    setUnreadCount(count)
  }, [optimisticNotifications])

  // Initialize Supabase client once
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient()
    }
  }, [])

  // Get current user and fetch notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!supabaseRef.current) return

      try {
        setLoading(true)
        const supabase = supabaseRef.current

        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setNotifications([])
          setUnreadCount(0)
          return
        }

        // Get database user ID
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single()

        if (!userData) {
          setNotifications([])
          setUnreadCount(0)
          return
        }

        setUserId(userData.id)

        // Fetch notifications
        const { data: notificationsData, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          console.error('Error fetching notifications:', error)
          toast.error('Failed to load notifications')
          setNotifications([])
        } else {
          setNotifications(notificationsData || [])
        }
      } catch (err) {
        console.error('Error initializing notifications:', err)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    initializeNotifications()
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId || !supabaseRef.current) return

    const setupSubscription = async () => {
      const supabase = supabaseRef.current!

      // Clean up previous subscription
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      // Create channel for user notifications
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const newNotification = payload.new as Notification

          // Add new notification to the beginning
          setNotifications(prev => [newNotification, ...prev])

          // Show toast based on priority
          const message = newNotification.title || 'New notification'
          switch (newNotification.priority) {
            case 'urgent':
              toast.error(message, { duration: 10000 })
              playNotificationSound()
              break
            case 'high':
              toast.warning(message, { duration: 7000 })
              playNotificationSound()
              break
            case 'normal':
              toast.info(message, { duration: 5000 })
              break
            case 'low':
              // Don't show toast for low priority
              break
          }

          // Play sound for urgent/high priority or specific types
          if (
            newNotification.priority === 'urgent' ||
            newNotification.priority === 'high' ||
            newNotification.type === 'intervention' ||
            newNotification.type === 'chat'
          ) {
            playNotificationSound()
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const updatedNotification = payload.new as Notification

          // Update notification in our list
          setNotifications(prev => prev.map(notif =>
            notif.id === updatedNotification.id
              ? { ...notif, ...updatedNotification }
              : notif
          ))
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const deletedNotification = payload.old as { id: string }

          // Remove notification from our list
          setNotifications(prev => prev.filter(notif => notif.id !== deletedNotification.id))
        })
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to notifications for user ${userId}`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to notifications`)
            toast.error('Notification connection lost. Refreshing...')
            // Try to reconnect after a delay
            setTimeout(() => {
              setupSubscription()
            }, 5000)
          }
        })

      channelRef.current = channel
    }

    setupSubscription()

    // Cleanup on unmount or user change
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId])

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!id || !supabaseRef.current) return

    try {
      // Optimistic update
      updateOptimisticNotifications({ type: 'read', id })

      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        // Revert optimistic update by refetching
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })

        if (data) {
          setNotifications(data)
        }

        throw error
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
      toast.error('Failed to mark as read')
    }
  }, [userId, updateOptimisticNotifications])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId || !supabaseRef.current) return

    try {
      // Optimistic update
      updateOptimisticNotifications({ type: 'read_all' })

      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        // Revert optimistic update by refetching
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (data) {
          setNotifications(data)
        }

        throw error
      }

      toast.success('All notifications marked as read')
    } catch (err) {
      console.error('Error marking all as read:', err)
      toast.error('Failed to mark all as read')
    }
  }, [userId, updateOptimisticNotifications])

  // Archive notification
  const archive = useCallback(async (id: string) => {
    if (!id || !supabaseRef.current) return

    try {
      // Optimistic update
      updateOptimisticNotifications({ type: 'archive', id })

      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', id)

      if (error) {
        // Revert optimistic update by refetching
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })

        if (data) {
          setNotifications(data)
        }

        throw error
      }

      toast.success('Notification archived')
    } catch (err) {
      console.error('Error archiving notification:', err)
      toast.error('Failed to archive')
    }
  }, [userId, updateOptimisticNotifications])

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    if (!id || !supabaseRef.current) return

    try {
      // Optimistic update
      updateOptimisticNotifications({ type: 'delete', id })

      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) {
        // Revert optimistic update by refetching
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })

        if (data) {
          setNotifications(data)
        }

        throw error
      }

      toast.success('Notification deleted')
    } catch (err) {
      console.error('Error deleting notification:', err)
      toast.error('Failed to delete')
    }
  }, [userId, updateOptimisticNotifications])

  return {
    notifications: optimisticNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archive,
    deleteNotification,
    isConnected
  }
}