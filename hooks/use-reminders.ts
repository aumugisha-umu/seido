'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeOptional } from '@/contexts/realtime-context'

interface UseRemindersReturn {
  /** Increments on each invalidation — use as a dependency to trigger re-fetch */
  refreshKey: number
  /** Manually trigger a refresh */
  refresh: () => void
}

/**
 * Hook that subscribes to 'reminders' invalidation broadcasts.
 * Returns a refreshKey counter that increments on each invalidation,
 * allowing consuming components to re-fetch reminder data.
 */
export function useReminders(): UseRemindersReturn {
  const [refreshKey, setRefreshKey] = useState(0)
  const realtime = useRealtimeOptional()

  useEffect(() => {
    if (!realtime?.onInvalidation) return
    return realtime.onInvalidation(['reminders'], () => {
      setRefreshKey((prev) => prev + 1)
    })
  }, [realtime])

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return { refreshKey, refresh }
}
