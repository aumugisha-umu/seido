/**
 * Wrapper pour use-demo-notifications
 * Compatible avec l'interface de use-notifications (production)
 */

'use client'

import { useDemoNotifications } from './use-demo-notifications'
import type { Notification } from '@/hooks/use-notifications'
import { useDemoContext } from '@/lib/demo/demo-context'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/demo/mutations'

interface UseNotificationsOptions {
  teamId?: string
  scope?: 'personal' | 'team' | 'all'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useDemoNotificationsWrapper(options: UseNotificationsOptions) {
  const { store } = useDemoContext()
  const { notifications, unreadCount } = useDemoNotifications(options)

  // Convertir le format des notifications démo vers le format attendu
  const formattedNotifications: Notification[] = notifications.map((notif: any) => ({
    id: notif.id,
    user_id: notif.user_id,
    team_id: notif.team_id,
    type: notif.type,
    title: notif.title,
    message: notif.content || '',
    content: notif.content,
    read: notif.is_read || false,
    is_read: notif.is_read || false,
    created_at: notif.created_at,
    link_url: notif.link_url,
    related_entity_type: null,
    related_entity_id: null,
    created_by_user: null
  }))

  const refetch = async () => {
    // En mode démo, pas de refetch réel
    return Promise.resolve()
  }

  const markAsRead = async (id: string) => {
    markNotificationAsRead(id)
    return Promise.resolve()
  }

  const markAllAsRead = async () => {
    if (options.teamId) {
      markAllNotificationsAsRead(options.teamId)
    }
    return Promise.resolve()
  }

  return {
    notifications: formattedNotifications,
    loading: false,
    error: null,
    unreadCount,
    refetch,
    markAsRead,
    markAllAsRead
  }
}
