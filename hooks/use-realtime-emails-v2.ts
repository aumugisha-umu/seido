'use client'

/**
 * 📧 USE REALTIME EMAILS V2 - Consumer Hook for Email Subscriptions
 *
 * This hook subscribes to email events via the centralized RealtimeProvider.
 * It replaces the deprecated use-realtime-emails.ts which created individual channels.
 *
 * @see contexts/realtime-context.tsx - Central RealtimeProvider
 * @see https://supabase.com/docs/guides/realtime/postgres-changes
 *
 * Usage:
 * ```tsx
 * useRealtimeEmailsV2({
 *   teamId: team.id,
 *   onNewEmail: (email) => {
 *     // Handle new email
 *     addEmailToList(email)
 *   }
 * })
 * ```
 *
 * @created 2025-11-29
 */

import { useEffect, useCallback } from 'react'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { Email } from '@/lib/types/email-integration'

// ============================================================================
// Types
// ============================================================================

interface UseRealtimeEmailsV2Options {
  /** Team ID to filter emails (required for proper filtering) */
  teamId?: string
  /** Callback when a new email is received */
  onNewEmail?: (email: Email) => void
  /** Whether to show toast notifications for new emails */
  showToast?: boolean
  /** Enable/disable the subscription */
  enabled?: boolean
}

// ============================================================================
// Hook
// ============================================================================

export function useRealtimeEmailsV2(options: UseRealtimeEmailsV2Options = {}) {
  const {
    teamId,
    onNewEmail,
    showToast = true,
    enabled = true
  } = options

  const realtime = useRealtimeOptional()

  // Memoized callback for new emails
  const handleNewEmail = useCallback((email: Email) => {
    logger.info('[REALTIME-EMAILS-V2] New email received', {
      id: email.id,
      from: email.from_address,
      subject: email.subject,
      direction: email.direction
    })

    // Only process emails for this team
    if (teamId && email.team_id !== teamId) {
      logger.info('[REALTIME-EMAILS-V2] Email filtered out (different team)')
      return
    }

    // Show toast for received emails
    if (showToast && email.direction === 'received') {
      toast.info(`Nouvel email de ${email.from_address}`, {
        description: email.subject
      })
    }

    // Call user callback
    onNewEmail?.(email)
  }, [teamId, onNewEmail, showToast])

  // Subscribe to email events via RealtimeProvider
  useEffect(() => {
    // Skip if provider not available or disabled
    if (!realtime || !enabled) {
      return
    }

    // Skip if no teamId (can't filter properly)
    if (!teamId) {
      logger.info('[REALTIME-EMAILS-V2] No teamId provided, skipping subscription')
      return
    }

    logger.info('[REALTIME-EMAILS-V2] Subscribing to email events', { teamId })

    // Subscribe to INSERT events on emails table
    const unsubscribe = realtime.subscribe<Email>({
      table: 'emails',
      event: 'INSERT',
      callback: (payload) => {
        const email = payload.new as Email | null
        if (email) {
          handleNewEmail(email)
        }
      }
    })

    return () => {
      logger.info('[REALTIME-EMAILS-V2] Unsubscribing from email events')
      unsubscribe()
    }
  }, [realtime, teamId, enabled, handleNewEmail])

  return {
    isConnected: realtime?.isConnected ?? false,
    connectionStatus: realtime?.connectionStatus ?? 'disconnected'
  }
}
