/**
 * Wrapper pour use-demo-activity-logs
 * Compatible avec l'interface de use-activity-logs (production)
 */

'use client'

import { useDemoRecentTeamActivityLogs } from './use-demo-activity-logs'

interface UseActivityLogsOptions {
  teamId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  limit?: number
}

export function useDemoActivityLogsWrapper(options: UseActivityLogsOptions) {
  const { activityLogs } = useDemoRecentTeamActivityLogs(options.limit || 100)

  const refetch = async () => {
    // En mode démo, pas de refetch réel
    return Promise.resolve()
  }

  return {
    activities: activityLogs,
    loading: false,
    error: null,
    refetch
  }
}
