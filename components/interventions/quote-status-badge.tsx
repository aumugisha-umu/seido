'use client'

import { Badge } from '@/components/ui/badge'
import { Euro } from 'lucide-react'
import {
  getQuoteBadgeStatus,
  getQuoteBadgeLabel,
  getQuoteBadgeColor,
  type QuoteStatusInfo
} from '@/lib/utils/quote-status'

// ============================================================================
// TYPES
// ============================================================================

interface QuoteStatusBadgeProps {
  /**
   * Array of quotes from the intervention
   */
  quotes: QuoteStatusInfo[] | undefined | null
  /**
   * Whether the intervention requires a quote
   * If false, the badge will not be displayed
   */
  requiresQuote?: boolean
  /**
   * Optional additional CSS classes
   */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * QuoteStatusBadge displays the current quote status for an intervention.
 *
 * This component replaces the need for a `demande_de_devis` workflow status by
 * showing the quote state as a separate visual indicator that can be displayed
 * at any point in the intervention lifecycle.
 *
 * Badge states (with € icon):
 * - **€ Demandé** (yellow): Quote requested, waiting for provider
 * - **€ Reçu** (blue): Provider submitted a quote, awaiting review
 * - **€ Validé** (green): Quote has been approved
 * - **€ Refusé** (red): All quotes have been rejected
 *
 * @example
 * ```tsx
 * <QuoteStatusBadge
 *   quotes={intervention.quotes}
 *   requiresQuote={intervention.requires_quote}
 * />
 * ```
 */
export const QuoteStatusBadge = ({
  quotes,
  requiresQuote,
  className = ''
}: QuoteStatusBadgeProps) => {
  // Don't show if quotes are not required
  if (!requiresQuote) return null

  // Get the derived status from quotes
  const status = getQuoteBadgeStatus(quotes)

  // Don't show if no relevant quote status
  if (!status) return null

  const label = getQuoteBadgeLabel(status)
  const colorClass = getQuoteBadgeColor(status)

  return (
    <Badge
      variant="outline"
      className={`${colorClass} flex items-center gap-1 ${className}`}
    >
      <Euro className="w-3 h-3" />
      {label}
    </Badge>
  )
}

export default QuoteStatusBadge
