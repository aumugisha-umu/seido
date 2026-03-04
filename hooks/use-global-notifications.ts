import { useState, useEffect, useCallback, useRef } from 'react'
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
  userId?: string // ✅ NEW: Accept userId from server to bypass useAuth() delay
}

export const useGlobalNotifications = (options: UseGlobalNotificationsOptions = {}): UseGlobalNotificationsReturn => {
  const { teamId: propTeamId, userId: propUserId } = options
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ PERF: Use server-provided userId/teamId to bypass client auth delay
  const effectiveUserId = propUserId || user?.id
  const userTeamId = propTeamId
  // If server provided teamId, we can trust the user has team access
  const effectiveTeamStatus = propTeamId ? 'verified' : teamStatus
  const effectiveHasTeam = propTeamId ? true : hasTeam

  // ✅ Cooldown: after optimistic delta updates, block refetches for 2s to prevent stale API data overwrite
  const lastDeltaTimestampRef = useRef<number>(0)

  const fetchUnreadCount = useCallback(async () => {
    // Skip refetch during cooldown after optimistic delta — prevents stale data overwriting correct count
    const msSinceLastDelta = Date.now() - lastDeltaTimestampRef.current
    if (msSinceLastDelta < 2000) {
      logger.info('⏳ [GLOBAL-NOTIFICATIONS] Skipping refetch — optimistic delta cooldown active', { msSinceLastDelta })
      return
    }

    logger.info('🔍 [GLOBAL-NOTIFICATIONS] fetchUnreadCount called with:', {
      effectiveUserId,
      effectiveTeamStatus,
      effectiveHasTeam,
      userTeamId
    })

    // Note: On ne requiert plus userTeamId car les prestataires/locataires peuvent recevoir
    // des notifications d'équipes auxquelles ils ne font pas partie (via intervention assignments)
    // La sécurité est assurée par RLS (user_id = get_current_user_id())
    // ✅ PERF: Use effective values to avoid waiting for client auth
    if (!effectiveUserId || effectiveTeamStatus !== 'verified') {
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
      if (effectiveHasTeam && userTeamId) {
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
  }, [effectiveUserId, effectiveTeamStatus, effectiveHasTeam, userTeamId])



  // Fetch unread count when all conditions are met
  // ✅ PERF: Use effective values to start fetching immediately with server data
  useEffect(() => {
    if (effectiveUserId && effectiveTeamStatus === 'verified') {
      fetchUnreadCount()
    }
  }, [effectiveUserId, effectiveTeamStatus, fetchUnreadCount])

  // ✅ Stocker fetchUnreadCount dans une ref pour éviter les re-subscriptions
  const fetchUnreadCountRef = useRef(fetchUnreadCount)
  useEffect(() => {
    fetchUnreadCountRef.current = fetchUnreadCount
  })

  // Realtime subscription via centralized RealtimeProvider
  // ✅ PERF: Use effective values for immediate subscription
  // ✅ Les callbacks sont maintenant stables grâce aux refs dans useRealtimeNotificationsV2
  useRealtimeNotificationsV2({
    enabled: effectiveTeamStatus === 'verified' && !!effectiveUserId,
    onInsert: (notification) => {
      logger.info('[GLOBAL-NOTIFICATIONS] New notification received via Realtime v2')
      // Increment unread count if notification is unread
      if (!notification.read) {
        setUnreadCount(prev => prev + 1)
      }
    },
    onUpdate: () => {
      logger.info('[GLOBAL-NOTIFICATIONS] Notification updated via Realtime v2')
      // Refetch to get accurate count
      fetchUnreadCountRef.current()
    },
    onDelete: () => {
      logger.info('[GLOBAL-NOTIFICATIONS] Notification deleted via Realtime v2')
      // Refetch to get accurate count
      fetchUnreadCountRef.current()
    }
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

  // ✅ Debounce timer for batching multiple rapid notification events into one refetch
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Écouter les événements de mise à jour des notifications
  // ✅ PERF: Apply delta instantly, cooldown blocks stale refetches from ALL paths
  useEffect(() => {
    const handleNotificationUpdate = (event: Event) => {
      const delta = (event as CustomEvent)?.detail?.delta
      if (typeof delta === 'number' && delta !== 0) {
        // Optimistic instant update — delta is the source of truth
        setUnreadCount(prev => Math.max(0, prev + delta))
        // Activate cooldown to block refetches (from realtime, parent, etc.) for 2s
        lastDeltaTimestampRef.current = Date.now()
        return
      }
      // No delta: fall back to debounced refetch (legacy events)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchUnreadCountRef.current()
        debounceTimerRef.current = null
      }, 500)
    }

    window.addEventListener('notificationUpdated', handleNotificationUpdate)
    return () => {
      window.removeEventListener('notificationUpdated', handleNotificationUpdate)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    unreadCount,
    loading,
    error,
    refetch: fetchUnreadCount,
  }
}
