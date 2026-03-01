'use client'

/**
 * Hook useStrategicNotification — Shows upgrade prompts at positive moments.
 *
 * Triggers: intervention closed, 10+ interventions, 90% quota usage.
 * Constraint: Only during last 7 days of trial, max 1 per session.
 */

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'

// =============================================================================
// Types
// =============================================================================

interface StrategicNotificationConfig {
  /** Days left in trial (null = not trialing) */
  daysLeftTrial: number | null
  /** Current lot count */
  lotCount: number
  /** Free tier limit */
  freeTierLimit: number
}

type MilestoneType = 'intervention_closed' | 'ten_interventions' | 'quota_90'

// =============================================================================
// Constants
// =============================================================================

const SESSION_KEY = 'seido_strategic_notif_shown'

const MESSAGES: Record<MilestoneType, { title: string; description: string }> = {
  intervention_closed: {
    title: 'Intervention terminee avec succes !',
    description: 'Passez au plan Pro pour gerer toutes vos interventions sans limite.',
  },
  ten_interventions: {
    title: 'Deja 10 interventions gerees !',
    description: 'SEIDO vous fait gagner du temps. Continuez avec le plan Pro.',
  },
  quota_90: {
    title: 'Votre portfolio grandit !',
    description: 'Vous approchez de la limite gratuite. Passez au Pro pour ajouter plus de biens.',
  },
}

// =============================================================================
// Hook
// =============================================================================

export function useStrategicNotification(config: StrategicNotificationConfig) {
  const shownRef = useRef(false)

  const canShow = useCallback((): boolean => {
    // Only during last 7 days of trial
    if (config.daysLeftTrial == null || config.daysLeftTrial > 7) return false

    // Max 1 per session
    if (shownRef.current) return false
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return false

    return true
  }, [config.daysLeftTrial])

  const showNotification = useCallback((type: MilestoneType) => {
    if (!canShow()) return false

    const message = MESSAGES[type]
    shownRef.current = true
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, 'true')
    }

    toast(message.title, {
      description: message.description,
      duration: 8000,
    })

    return true
  }, [canShow])

  /**
   * Call after an intervention is closed successfully.
   */
  const onInterventionClosed = useCallback((totalClosedCount?: number) => {
    if (totalClosedCount && totalClosedCount === 10) {
      showNotification('ten_interventions')
    } else {
      showNotification('intervention_closed')
    }
  }, [showNotification])

  /**
   * Call when lot count changes to check 90% quota.
   */
  const checkQuotaWarning = useCallback(() => {
    if (config.freeTierLimit <= 0) return
    const usagePercent = (config.lotCount / config.freeTierLimit) * 100
    if (usagePercent >= 90) {
      showNotification('quota_90')
    }
  }, [config.lotCount, config.freeTierLimit, showNotification])

  return {
    onInterventionClosed,
    checkQuotaWarning,
    canShow: canShow(),
  }
}
