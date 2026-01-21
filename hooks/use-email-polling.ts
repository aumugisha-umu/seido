'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface EmailRefreshData {
  success: boolean
  counts: {
    inbox: number
    processed: number
    sent: number
    archive: number
    drafts: number
  }
  latestEmails: Array<{
    id: string
    created_at: string
    from_address: string
    subject: string
    status: string
  }>
  lastSyncAt: string | null
  timestamp: string
}

interface UseEmailPollingOptions {
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  interval?: number
  /** Enable or disable polling */
  enabled?: boolean
  /** Callback when new emails are detected */
  onNewEmails?: (newEmailIds: string[]) => void
  /** Callback when counts change */
  onCountsChange?: (counts: EmailRefreshData['counts']) => void
  /** Callback on each poll (for updating counts without full refresh) */
  onRefresh?: (data: EmailRefreshData) => void
}

/**
 * Hook for soft email polling every 60 seconds
 * Fetches counts + latest email IDs from DB without triggering IMAP sync
 * Used alongside Supabase Realtime for a responsive email experience
 */
export function useEmailPolling({
  interval = 60000, // 1 minute default
  enabled = true,
  onNewEmails,
  onCountsChange,
  onRefresh
}: UseEmailPollingOptions = {}) {
  const [isPolling, setIsPolling] = useState(false)
  const [lastPollAt, setLastPollAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Track known email IDs to detect new ones
  const knownEmailIds = useRef<Set<string>>(new Set())
  const lastCounts = useRef<EmailRefreshData['counts'] | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Track consecutive auth failures to stop polling
  const authFailures = useRef(0)
  const MAX_AUTH_FAILURES = 3

  const poll = useCallback(async () => {
    if (!enabled) return

    // Stop polling if we've had too many auth failures
    if (authFailures.current >= MAX_AUTH_FAILURES) {
      console.log('[EMAIL-POLLING] Stopped due to auth failures')
      return
    }

    try {
      setIsPolling(true)
      setError(null)

      const response = await fetch('/api/emails/refresh')

      // Handle auth failures - stop spamming the API
      if (response.status === 401 || response.status === 403) {
        authFailures.current++
        console.warn(`[EMAIL-POLLING] Auth failure (${authFailures.current}/${MAX_AUTH_FAILURES})`)
        if (authFailures.current >= MAX_AUTH_FAILURES) {
          setError('Session expirée - actualisation désactivée')
        }
        return
      }

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`)
      }

      // Reset auth failures on success
      authFailures.current = 0

      const data: EmailRefreshData = await response.json()
      if (!data.success) {
        throw new Error(data.success === false ? 'Poll returned error' : 'Unknown error')
      }

      setLastPollAt(data.timestamp)

      // Detect new emails by comparing IDs
      const currentIds = new Set(data.latestEmails.map(e => e.id))
      const newIds: string[] = []

      // First poll - just initialize known IDs
      if (knownEmailIds.current.size === 0) {
        knownEmailIds.current = currentIds
      } else {
        // Check for new emails
        for (const id of currentIds) {
          if (!knownEmailIds.current.has(id)) {
            newIds.push(id)
          }
        }
        // Update known IDs
        knownEmailIds.current = currentIds
      }

      // Notify if new emails found
      if (newIds.length > 0 && onNewEmails) {
        onNewEmails(newIds)
      }

      // Check if counts changed
      if (lastCounts.current && onCountsChange) {
        const changed =
          lastCounts.current.inbox !== data.counts.inbox ||
          lastCounts.current.processed !== data.counts.processed ||
          lastCounts.current.sent !== data.counts.sent ||
          lastCounts.current.archive !== data.counts.archive

        if (changed) {
          onCountsChange(data.counts)
        }
      }
      lastCounts.current = data.counts

      // General refresh callback
      if (onRefresh) {
        onRefresh(data)
      }

    } catch (err) {
      // Network errors (TypeError: Failed to fetch) - don't spam console
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.warn('[EMAIL-POLLING] Network error (offline or CORS)')
        authFailures.current++ // Treat network errors like auth failures
      } else {
        console.warn('[EMAIL-POLLING] Error:', err instanceof Error ? err.message : err)
      }
      setError(err instanceof Error ? err.message : 'Polling error')
    } finally {
      setIsPolling(false)
    }
  }, [enabled, onNewEmails, onCountsChange, onRefresh])

  // Setup polling interval
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Initial poll after a short delay (let page load first)
    const initialTimer = setTimeout(() => {
      poll()
    }, 2000) // 2 second delay before first poll

    // Setup interval
    timerRef.current = setInterval(poll, interval)

    return () => {
      clearTimeout(initialTimer)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, interval, poll])

  // Manual refresh function
  const refresh = useCallback(() => {
    return poll()
  }, [poll])

  // Reset known emails (e.g., when changing folders)
  const resetKnownEmails = useCallback(() => {
    knownEmailIds.current = new Set()
    lastCounts.current = null
  }, [])

  // Reset auth failures (e.g., when user re-authenticates)
  const resetAuthFailures = useCallback(() => {
    authFailures.current = 0
    setError(null)
  }, [])

  return {
    isPolling,
    lastPollAt,
    error,
    refresh,
    resetKnownEmails,
    resetAuthFailures
  }
}
