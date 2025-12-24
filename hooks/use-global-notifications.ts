import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTeamStatus } from '@/hooks/use-team-status'
import { logger, logError } from '@/lib/logger'
import { useRealtimeNotificationsV2 } from './use-realtime-notifications-v2'
interface UseGlobalNotificationsReturn {
  unreadCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseGlobalNotificationsOptions {
  teamId?: string
}

export const useGlobalNotifications = (options: UseGlobalNotificationsOptions = {}): UseGlobalNotificationsReturn => {
  const { teamId: propTeamId } = options
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use prop teamId if available
  const userTeamId = propTeamId

  // Removed: Client-side team fetching (now passed via props)

  const fetchUnreadCount = useCallback(async () => {
    logger.info('🔍 [GLOBAL-NOTIFICATIONS] fetchUnreadCount called with:', {
      userId: user?.id,
      teamStatus,
      hasTeam,
      userTeamId
    })

    // Note: On ne requiert plus userTeamId car les prestataires/locataires peuvent recevoir
    // des notifications d'équipes auxquelles ils ne font pas partie (via intervention assignments)
    // La sécurité est assurée par RLS (user_id = get_current_user_id())
    if (!user?.id || teamStatus !== 'verified') {
      logger.info('❌ [GLOBAL-NOTIFICATIONS] Conditions not met, skipping fetch')
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Récupérer les notifications personnelles non lues
      // Note: On ne filtre plus par team_id pour les notifications personnelles
      // car les prestataires/locataires reçoivent des notifs d'autres équipes
      const personalParams = new URLSearchParams({
        limit: '50',
        scope: 'personal',
        read: 'false'
      })

      logger.info('📡 [GLOBAL-NOTIFICATIONS] Fetching personal notifications:', {
        personalUrl: `/api/notifications?${personalParams}`
      })

      // Fetch personal notifications (toujours)
      const personalResponse = await fetch(`/api/notifications?${personalParams}`)

      if (!personalResponse.ok) {
        throw new Error('Failed to fetch personal notifications count')
      }

      const personalResult = await personalResponse.json()
      const personalCount = personalResult.success ? (personalResult.data || []).length : 0

      // Fetch team notifications seulement si l'utilisateur a une équipe
      let teamCount = 0
      if (hasTeam && userTeamId) {
        const teamParams = new URLSearchParams({
          limit: '50',
          team_id: userTeamId,
          scope: 'team',
          read: 'false'
        })

        logger.info('📡 [GLOBAL-NOTIFICATIONS] Fetching team notifications:', {
          teamUrl: `/api/notifications?${teamParams}`
        })

        const teamResponse = await fetch(`/api/notifications?${teamParams}`)
        if (teamResponse.ok) {
          const teamResult = await teamResponse.json()
          teamCount = teamResult.success ? (teamResult.data || []).length : 0
        }
      }

      logger.info('📊 [GLOBAL-NOTIFICATIONS] Notification counts:', {
        personalCount,
        teamCount,
        total: personalCount + teamCount
      })

      setUnreadCount(personalCount + teamCount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [user?.id, teamStatus, hasTeam, userTeamId])



  // Fetch unread count when all conditions are met
  // Note: On ne requiert plus userTeamId pour les prestataires/locataires
  useEffect(() => {
    if (user?.id && teamStatus === 'verified') {
      fetchUnreadCount()
    }
  }, [user?.id, teamStatus, fetchUnreadCount])

  // Realtime subscription via centralized RealtimeProvider
  // Note: On ne requiert plus userTeamId car les prestataires peuvent recevoir des notifs cross-team
  useRealtimeNotificationsV2({
    enabled: teamStatus === 'verified' && !!user?.id,
    onInsert: useCallback((notification) => {
      logger.info('[GLOBAL-NOTIFICATIONS] New notification received via Realtime v2')
      // Increment unread count if notification is unread
      if (!notification.read) {
        setUnreadCount(prev => prev + 1)
      }
    }, []),
    onUpdate: useCallback((notification) => {
      logger.info('[GLOBAL-NOTIFICATIONS] Notification updated via Realtime v2')
      // Refetch to get accurate count
      fetchUnreadCount()
    }, [fetchUnreadCount]),
    onDelete: useCallback(() => {
      logger.info('[GLOBAL-NOTIFICATIONS] Notification deleted via Realtime v2')
      // Refetch to get accurate count
      fetchUnreadCount()
    }, [fetchUnreadCount])
  })

  // Auto-refresh disabled - use Supabase Realtime instead
  // TODO: Implement Supabase Realtime subscriptions for instant notifications
  /*
  useEffect(() => {
    if (teamStatus !== 'verified' || !hasTeam || !userTeamId) return

    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user?.id, teamStatus, hasTeam, userTeamId])
  */

  // Écouter les événements de mise à jour des notifications
  useEffect(() => {
    const handleNotificationUpdate = () => {
      fetchUnreadCount()
    }

    window.addEventListener('notificationUpdated', handleNotificationUpdate)
    return () => {
      window.removeEventListener('notificationUpdated', handleNotificationUpdate)
    }
  }, [fetchUnreadCount])

  return {
    unreadCount,
    loading,
    error,
    refetch: fetchUnreadCount,
  }
}
