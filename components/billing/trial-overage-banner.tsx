'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FREE_TIER_LIMIT } from '@/lib/stripe'

// =============================================================================
// Types
// =============================================================================

interface TrialOverageBannerProps {
  actualLots: number
  daysLeft: number | null
  className?: string
}

// =============================================================================
// Component
// =============================================================================

const DISMISS_KEY = 'trial-overage-banner-dismissed'

/**
 * Warning banner shown during trial when lot count exceeds FREE_TIER_LIMIT.
 * Warns the user that after trial ends, only the 2 oldest lots will remain accessible.
 * Dismissible per session — reappears on next page load / login.
 */
export function TrialOverageBanner({ actualLots, daysLeft, className }: TrialOverageBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISS_KEY) === 'true'
  })

  if (actualLots <= FREE_TIER_LIMIT || dismissed) return null

  const lockedCount = actualLots - FREE_TIER_LIMIT
  const daysText = daysLeft != null && daysLeft > 0
    ? `Dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
    : 'A la fin de votre essai'

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className={cn(
      'relative flex items-start gap-3 p-3 rounded-lg border',
      'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
      className,
    )}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {daysText}, {lockedCount} lot{lockedCount > 1 ? 's' : ''} sur {actualLots} sera{lockedCount > 1 ? 'ont' : ''} verrouill&eacute;{lockedCount > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Seuls vos {FREE_TIER_LIMIT} lots les plus anciens resteront accessibles. Souscrivez pour tout conserver.
        </p>
      </div>

      <Button
        size="sm"
        className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
        onClick={() => router.push('/gestionnaire/settings/billing')}
      >
        S&apos;abonner
      </Button>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/40 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
