/**
 * Quote Status Badge Utilities
 *
 * Provides helper functions to derive quote status badges from intervention_quotes data.
 * This approach replaces the demande_de_devis status by showing quote state as a separate badge
 * that can be visible throughout the intervention lifecycle.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Visual badge status for quotes
 * - requested: Quote has been requested, awaiting provider response
 * - received: Provider has submitted a quote, awaiting approval
 * - validated: Quote has been approved
 * - rejected: Quote has been rejected
 */
export type QuoteBadgeStatus = 'requested' | 'received' | 'validated' | 'rejected' | null

/**
 * Quote object shape from the database
 */
export interface QuoteStatusInfo {
  status: string
}

// ============================================================================
// STATUS DERIVATION
// ============================================================================

/**
 * Derives the visual badge status from an array of quotes.
 *
 * Priority order (highest to lowest):
 * 1. validated (accepted) - If any quote is approved, show as validated
 * 2. received (sent) - If provider has submitted a quote
 * 3. requested (pending) - If quote request is pending
 *
 * @param quotes - Array of quotes with status field
 * @returns The derived badge status or null if no relevant quotes
 *
 * @example
 * ```ts
 * const status = getQuoteBadgeStatus(intervention.quotes)
 * // returns 'received' if any quote has status 'sent'
 * ```
 */
export const getQuoteBadgeStatus = (quotes: QuoteStatusInfo[] | undefined | null): QuoteBadgeStatus => {
  if (!quotes || quotes.length === 0) return null

  // Check status priority: validated > received > requested > rejected
  // Show the "best" status (accepted beats sent, sent beats pending, etc.)
  if (quotes.some(q => q.status === 'accepted')) return 'validated'
  if (quotes.some(q => q.status === 'sent')) return 'received'
  if (quotes.some(q => q.status === 'pending')) return 'requested'
  // Only show rejected if ALL quotes are rejected (no pending or sent)
  if (quotes.every(q => q.status === 'rejected')) return 'rejected'

  return null
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Returns the French label for a quote badge status
 * Short labels with € icon for compact display
 *
 * @param status - The badge status
 * @returns French label string
 */
export const getQuoteBadgeLabel = (status: QuoteBadgeStatus): string => {
  switch (status) {
    case 'requested':
      return 'Demandé'
    case 'received':
      return 'Reçu'
    case 'validated':
      return 'Validé'
    case 'rejected':
      return 'Refusé'
    default:
      return ''
  }
}

/**
 * Returns Tailwind CSS classes for the quote badge based on status
 *
 * Color semantics:
 * - Yellow (requested): Waiting state, action needed from provider
 * - Blue (received): Information state, quote ready for review
 * - Green (validated): Success state, quote approved
 * - Red (rejected): Error state, quote was rejected
 *
 * @param status - The badge status
 * @returns Tailwind CSS class string
 */
export const getQuoteBadgeColor = (status: QuoteBadgeStatus): string => {
  switch (status) {
    case 'requested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'received':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'validated':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return ''
  }
}

/**
 * Returns count information for quotes by status
 *
 * @param quotes - Array of quotes with status field
 * @returns Object with counts by status
 */
export const getQuoteCounts = (quotes: QuoteStatusInfo[] | undefined | null): {
  pending: number
  sent: number
  accepted: number
  rejected: number
  total: number
} => {
  if (!quotes || quotes.length === 0) {
    return { pending: 0, sent: 0, accepted: 0, rejected: 0, total: 0 }
  }

  return {
    pending: quotes.filter(q => q.status === 'pending').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    total: quotes.length
  }
}

/**
 * Checks if an intervention has any active quote process
 *
 * @param quotes - Array of quotes
 * @param requiresQuote - Whether the intervention requires a quote
 * @returns true if there are any pending, sent, or accepted quotes
 */
export const hasActiveQuoteProcess = (
  quotes: QuoteStatusInfo[] | undefined | null,
  requiresQuote?: boolean
): boolean => {
  if (!requiresQuote) return false
  if (!quotes || quotes.length === 0) return false

  return quotes.some(q =>
    q.status === 'pending' ||
    q.status === 'sent' ||
    q.status === 'accepted'
  )
}
