"use client"

import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContractExpiryInfo } from '@/lib/types/contract.types'
import { ALERT_TIER_LABELS, LEASE_CATEGORY_LABELS } from '@/lib/types/contract.types'

interface ContractExpiryBannerProps {
  expiryInfo: ContractExpiryInfo
  compact?: boolean
  className?: string
}

const TIER_STYLES = {
  critical: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-800',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800',
    Icon: Clock
  },
  warning: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-800',
    Icon: AlertTriangle
  },
  deadline: {
    bg: 'bg-red-100 border-red-300',
    text: 'text-red-900',
    icon: 'text-red-700',
    badge: 'bg-red-200 text-red-900',
    Icon: ShieldAlert
  }
} as const

/**
 * Format a date string (YYYY-MM-DD) to French locale display.
 */
function formatDateFR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Compute days until the notice deadline (not end_date).
 */
function daysUntilNoticeDeadline(expiryInfo: ContractExpiryInfo): number {
  return expiryInfo.daysRemaining - expiryInfo.noticeDeadlineDays
}

export function ContractExpiryBanner({ expiryInfo, compact = false, className }: ContractExpiryBannerProps) {
  const { alertTier, noticeDeadlinePassed, leaseCategory } = expiryInfo

  if (!alertTier) return null

  const style = TIER_STYLES[alertTier]
  const TierIcon = style.Icon
  const tierLabel = ALERT_TIER_LABELS[alertTier]
  const categoryLabel = LEASE_CATEGORY_LABELS[leaseCategory]
  const daysToDeadline = daysUntilNoticeDeadline(expiryInfo)

  return (
    <div className={cn(
      'rounded-lg border p-3',
      style.bg,
      className
    )}>
      <div className={cn(
        'flex items-start gap-3',
        compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row'
      )}>
        {/* Icon + badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <TierIcon className={cn('h-5 w-5', style.icon)} />
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', style.badge)}>
            {tierLabel}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn('text-sm font-medium', style.text)}>
            {categoryLabel} — {noticeDeadlinePassed ? (
              'Délai de préavis dépassé'
            ) : (
              <>Préavis à envoyer avant le {formatDateFR(expiryInfo.noticeDeadlineDate)}{' '}
                <span className="font-normal">
                  ({daysToDeadline > 0 ? `dans ${daysToDeadline} jours` : "aujourd'hui"})
                </span>
              </>
            )}
          </p>
          {!compact && (
            <p className={cn('text-xs', style.text, 'opacity-80')}>
              {expiryInfo.tacitRenewalRisk}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
