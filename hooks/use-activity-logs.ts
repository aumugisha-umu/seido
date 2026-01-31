import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger, logError } from '@/lib/logger'
export interface ActivityLog {
  id: string
  team_id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id?: string
  entity_name?: string
  description: string
  status: 'success' | 'failed' | 'in_progress' | 'cancelled'
  metadata?: Record<string, any>
  error_message?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  user_name?: string
  user_email?: string
  user_avatar_url?: string
}

interface UseActivityLogsOptions {
  teamId?: string
  userId?: string
  entityType?: string
  entityId?: string  // Filter by specific entity (e.g., intervention ID)
  /** Include related entities in logs (building → lots → contracts → interventions) */
  includeRelated?: boolean
  actionType?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseActivityLogsReturn {
  activities: ActivityLog[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  stats?: {
    total: number
    byAction: Record<string, number>
    byEntity: Record<string, number>
    byStatus: Record<string, number>
    successRate: number
  }
}

export const useActivityLogs = (options: UseActivityLogsOptions = {}): UseActivityLogsReturn => {
  const { user, loading: authLoading } = useAuth()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const {
    teamId,
    userId,
    entityType,
    entityId,
    includeRelated = false,
    actionType,
    status,
    startDate,
    endDate,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 60000 // 1 minute
  } = options

  const fetchActivityLogs = async () => {
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

      if (teamId) params.append('teamId', teamId)
      if (userId) params.append('userId', userId)
      if (entityType) params.append('entityType', entityType)
      if (entityId) params.append('entityId', entityId)
      if (includeRelated) params.append('includeRelated', 'true')
      if (actionType) params.append('actionType', actionType)
      if (status) params.append('status', status)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/activity-logs?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to fetch activity logs: ${errorData.details || response.statusText}`)
      }

      const result = await response.json()

      if (result.data) {
        setActivities(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch activity logs')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Error fetching activity logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!teamId) return

    try {
      const response = await fetch(`/api/activity-stats?teamId=${teamId}&period=7d`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity stats')
      }

      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      logger.error('Error fetching activity stats:', err)
    }
  }

  // Fetch initial data (authLoading dependency ensures re-fetch when auth completes)
  useEffect(() => {
    fetchActivityLogs()
    if (teamId) {
      fetchStats()
    }
  }, [user?.id, teamId, userId, entityType, entityId, actionType, status, startDate, endDate, limit, authLoading])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || authLoading) return

    const interval = setInterval(() => {
      fetchActivityLogs()
      if (teamId) {
        fetchStats()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, user?.id, teamId, userId, entityType, entityId, actionType, status, startDate, endDate, limit, authLoading])

  return {
    activities,
    loading,
    error,
    refetch: fetchActivityLogs,
    stats,
  }
}
