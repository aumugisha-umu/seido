'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface TrialBannerProps {
  daysLeft: number | null
  paymentMethodAdded: boolean
  trialEndDate: string | null // ISO string
  lotCount?: number
  interventionCount?: number
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const DISMISS_KEY_LS = 'seido_trial_banner_dismissed_at' // localStorage — 24h
const DISMISS_KEY_SS = 'seido_trial_banner_dismissed_session' // sessionStorage — once per session

// =============================================================================
// Helpers
// =============================================================================

function isDismissed(daysLeft: number): boolean {
  if (typeof window === 'undefined') return false

  // J-1: non-dismissible
  if (daysLeft <= 1) return false

  // J-3 to J-2: session-only dismiss
  if (daysLeft <= 3) {
    return sessionStorage.getItem(DISMISS_KEY_SS) === 'true'
  }

  // J-7 to J-4: 24h dismiss via localStorage
  const dismissedAt = localStorage.getItem(DISMISS_KEY_LS)
  if (!dismissedAt) return false
  return Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// =============================================================================
// Component
// =============================================================================

export function TrialBanner({
  daysLeft,
  paymentMethodAdded,
  trialEndDate,
  lotCount = 0,
  interventionCount = 0,
  className,
}: TrialBannerProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (daysLeft == null || daysLeft > 7) return
    if (isDismissed(daysLeft)) return
    setVisible(true)
  }, [daysLeft])

  if (!visible || daysLeft == null) return null

  // ── Payment method already added → green reassurance ──────────────
  if (paymentMethodAdded) {
    const endDateFormatted = trialEndDate ? formatDate(trialEndDate) : ''
    return (
      <div className={cn(
        'relative flex items-center gap-3 p-3 rounded-lg border',
        'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
        className,
      )}>
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex-1">
          Vous etes pret. Votre abonnement demarrera automatiquement le {endDateFormatted}. Aucun debit avant cette date.
        </p>
        <button
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY_SS, 'true')
            setVisible(false)
          }}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/5 text-emerald-600 dark:text-emerald-400"
          aria-label="Fermer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  // ── No payment method → urgency messaging ─────────────────────────
  const endDateFormatted = trialEndDate ? formatDate(trialEndDate) : ''

  let bgClass: string
  let textClass: string
  let subtextClass: string
  let Icon: typeof Zap
  let message: string
  let ctaLabel: string
  let canDismiss: boolean

  if (daysLeft <= 1) {
    // Red — last day
    bgClass = 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    textClass = 'text-red-800 dark:text-red-300'
    subtextClass = 'text-red-600 dark:text-red-400'
    Icon = AlertTriangle
    message = `Dernier jour. Sans moyen de paiement, vos biens seront bloques et vous ne recevrez plus aucune notification.`
    ctaLabel = 'Activer maintenant \u2014 0 EUR aujourd\u2019hui'
    canDismiss = false
  } else if (daysLeft <= 3) {
    // Amber — 2-3 days
    bgClass = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
    textClass = 'text-amber-800 dark:text-amber-300'
    subtextClass = 'text-amber-600 dark:text-amber-400'
    Icon = Clock
    message = `Plus que ${daysLeft} jours. Vos ${lotCount} lots et ${interventionCount} interventions seront bloques sans abonnement.`
    ctaLabel = 'Continuer avec SEIDO \u2014 0 EUR aujourd\u2019hui'
    canDismiss = true
  } else {
    // Blue — 4-7 days
    bgClass = 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
    textClass = 'text-blue-800 dark:text-blue-300'
    subtextClass = 'text-blue-600 dark:text-blue-400'
    Icon = Zap
    message = `Votre essai se termine le ${endDateFormatted}. Securisez votre acces \u2014 aucun debit avant la fin de l\u2019essai.`
    ctaLabel = 'Ajouter mon moyen de paiement'
    canDismiss = true
  }

  const handleDismiss = () => {
    if (daysLeft <= 3) {
      sessionStorage.setItem(DISMISS_KEY_SS, 'true')
    } else {
      localStorage.setItem(DISMISS_KEY_LS, String(Date.now()))
    }
    setVisible(false)
  }

  return (
    <div className={cn(
      'relative flex items-center gap-3 p-3 rounded-lg border',
      bgClass,
      className,
    )}>
      <Icon className={cn('h-5 w-5 flex-shrink-0', textClass)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', textClass)}>
          {message}
        </p>
        <p className={cn('text-xs mt-0.5', subtextClass)}>
          Annulation en 1 clic - Sans engagement
        </p>
      </div>

      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 whitespace-nowrap"
        onClick={() => router.push('/gestionnaire/settings/billing')}
      >
        {ctaLabel}
      </Button>

      {canDismiss && (
        <button
          onClick={handleDismiss}
          className={cn('absolute top-1 right-1 p-1 rounded-full hover:bg-black/5', subtextClass)}
          aria-label="Fermer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
