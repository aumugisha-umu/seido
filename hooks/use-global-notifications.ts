import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTeamStatus } from '@/hooks/use-team-status'
import { logger, logError } from '@/lib/logger'
interface UseGlobalNotificationsReturn {
  unreadCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useGlobalNotifications = (): UseGlobalNotificationsReturn => {
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTeamId, setUserTeamId] = useState<string | null>(null)

  // Récupérer l'ID de l'équipe de l'utilisateur
  const fetchUserTeam = async () => {
    if (!user?.id || teamStatus !== 'verified') return

    try {
      const { createTeamService } = await import('@/lib/services')
      const teamService = await createTeamService()
      const teams = await teamService.getUserTeams(user.id)
      if (teams && teams.length > 0) {
        setUserTeamId(teams[0].id)
      }
    } catch (error) {
      logger.error('Error fetching user team:', error)
    }
  }

  const fetchUnreadCount = async () => {
    logger.info('🔍 [GLOBAL-NOTIFICATIONS] fetchUnreadCount called with:', {
      userId: user?.id,
      teamStatus,
      hasTeam,
      userTeamId
    })
    
    if (!user?.id || teamStatus !== 'verified' || !hasTeam || !userTeamId) {
      logger.info('❌ [GLOBAL-NOTIFICATIONS] Conditions not met, skipping fetch')
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Récupérer les notifications personnelles non lues
      const personalParams = new URLSearchParams({
        limit: '50',
        team_id: userTeamId,
        scope: 'personal',
        read: 'false'
      })

      // Récupérer les notifications d'équipe non lues
      const teamParams = new URLSearchParams({
        limit: '50',
        team_id: userTeamId,
        scope: 'team',
        read: 'false'
      })

      logger.info('📡 [GLOBAL-NOTIFICATIONS] Fetching notifications with params:', {
        personalUrl: `/api/notifications?${personalParams}`,
        teamUrl: `/api/notifications?${teamParams}`
      })

      const [personalResponse, teamResponse] = await Promise.all([
        fetch(`/api/notifications?${personalParams}`),
        fetch(`/api/notifications?${teamParams}`)
      ])

      if (!personalResponse.ok || !teamResponse.ok) {
        throw new Error('Failed to fetch notifications count')
      }

      const [personalResult, teamResult] = await Promise.all([
        personalResponse.json(),
        teamResponse.json()
      ])

      logger.info('📬 [GLOBAL-NOTIFICATIONS] API responses:', {
        personalResult,
        teamResult,
        personalStatus: personalResponse.status,
        teamStatus: teamResponse.status
      })

      const personalCount = personalResult.success ? (personalResult.data || []).length : 0
      const teamCount = teamResult.success ? (teamResult.data || []).length : 0
      
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
  }

  // Fetch user team when user is available and team status is verified
  useEffect(() => {
    if (user?.id && teamStatus === 'verified' && hasTeam) {
      fetchUserTeam()
    }
  }, [user?.id, teamStatus, hasTeam])

  // Fetch unread count when all conditions are met
  useEffect(() => {
    if (user?.id && teamStatus === 'verified' && hasTeam && userTeamId) {
      fetchUnreadCount()
    }
  }, [user?.id, teamStatus, hasTeam, userTeamId])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (teamStatus !== 'verified' || !hasTeam || !userTeamId) return

    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user?.id, teamStatus, hasTeam, userTeamId])

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
