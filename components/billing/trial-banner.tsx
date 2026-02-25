'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, AlertTriangle, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface TrialBannerProps {
  daysLeft: number | null
  activeTeamsCount?: number
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const DISMISS_KEY = 'seido_trial_banner_dismissed_at'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

// =============================================================================
// Helpers
// =============================================================================

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  return Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS
}

function getColorScheme(daysLeft: number) {
  if (daysLeft <= 1) {
    return {
      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      subtext: 'text-red-700 dark:text-red-400',
      bar: 'bg-red-500',
      barTrack: 'bg-red-200 dark:bg-red-900/50',
      icon: AlertTriangle,
    }
  }
  if (daysLeft <= 7) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
      text: 'text-orange-800 dark:text-orange-300',
      subtext: 'text-orange-700 dark:text-orange-400',
      bar: 'bg-orange-500',
      barTrack: 'bg-orange-200 dark:bg-orange-900/50',
      icon: Clock,
    }
  }
  return {
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    subtext: 'text-blue-700 dark:text-blue-400',
    bar: 'bg-blue-500',
    barTrack: 'bg-blue-200 dark:bg-blue-900/50',
    icon: Zap,
  }
}

function getMessage(daysLeft: number): string {
  if (daysLeft <= 0) return 'Votre essai gratuit est termin\u00e9. Souscrivez pour conserver vos donn\u00e9es.'
  if (daysLeft === 1) return 'Dernier jour d\u2019essai ! Vos donn\u00e9es passeront en lecture seule demain.'
  if (daysLeft <= 3) return `Plus que ${daysLeft} jours. Ne perdez pas l\u2019acc\u00e8s \u00e0 vos ${daysLeft > 1 ? 'donn\u00e9es' : 'interventions'}.`
  if (daysLeft <= 7) return `${daysLeft} jours restants dans votre essai gratuit.`
  return `${daysLeft} jours restants dans votre essai gratuit.`
}

// =============================================================================
// Component
// =============================================================================

export function TrialBanner({ daysLeft, activeTeamsCount, className }: TrialBannerProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show during last 7 days (or less)
    if (daysLeft == null || daysLeft > 7) return
    if (isDismissed()) return
    setVisible(true)
  }, [daysLeft])

  if (!visible || daysLeft == null) return null

  const colors = getColorScheme(daysLeft)
  const Icon = colors.icon
  const progressPercent = Math.max(0, Math.min(100, ((30 - daysLeft) / 30) * 100))

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div className={cn(
      'relative flex items-center gap-3 p-3 rounded-lg border',
      colors.bg,
      className,
    )}>
      <Icon className={cn('h-5 w-5 flex-shrink-0', colors.text)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', colors.text)}>
          {getMessage(daysLeft)}
        </p>

        {/* Social proof — desktop only */}
        {activeTeamsCount != null && activeTeamsCount > 0 && (
          <p className={cn('hidden md:flex items-center gap-1 text-xs mt-0.5', colors.subtext)}>
            <Users className="h-3 w-3" />
            Rejoint par {activeTeamsCount}+ gestionnaires ce mois
          </p>
        )}

        {/* Progress bar */}
        <div className={cn('mt-2 h-1.5 rounded-full overflow-hidden', colors.barTrack)}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={cn('text-xs mt-1', colors.subtext)}>
          {daysLeft > 0 ? `${daysLeft}/30 jours` : 'Essai expir\u00e9'}
        </p>
      </div>

      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        onClick={() => router.push('/gestionnaire/settings/billing')}
      >
        S&apos;abonner
      </Button>

      {/* Dismiss button (not shown on last day) */}
      {daysLeft > 1 && (
        <button
          onClick={handleDismiss}
          className={cn('absolute top-1 right-1 p-1 rounded-full hover:bg-black/5', colors.subtext)}
          aria-label="Fermer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
