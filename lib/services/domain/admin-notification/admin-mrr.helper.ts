/**
 * Admin MRR/ARR Calculation Helper
 *
 * Calculates individual and platform-wide MRR/ARR from subscription data.
 * All amounts in cents (EUR), converted to EUR for display.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { STRIPE_PRICES, PRICE_PER_LOT_MONTHLY, PRICE_PER_LOT_ANNUAL } from '@/lib/stripe'
import { logger } from '@/lib/logger'

/**
 * Calculate individual MRR in cents for a subscription.
 * Annual plans: annual price / 12 to get monthly equivalent.
 */
export function calculateIndividualMrrCents(lots: number, priceId: string | null): number {
  if (lots <= 0) return 0
  const isAnnual = priceId === STRIPE_PRICES.annual
  if (isAnnual) {
    return Math.round((lots * PRICE_PER_LOT_ANNUAL) / 12)
  }
  return lots * PRICE_PER_LOT_MONTHLY
}

/**
 * Calculate platform-wide MRR in cents from all active subscriptions.
 * Uses service-role client to query across all teams.
 */
export async function calculatePlatformMrrCents(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('subscribed_lots, price_id')
      .in('status', ['active', 'trialing'])

    if (error) {
      logger.error({ error }, '[ADMIN-MRR] Failed to query subscriptions for platform MRR')
      return 0
    }

    if (!subs || subs.length === 0) return 0

    return subs.reduce((total, sub) => {
      return total + calculateIndividualMrrCents(sub.subscribed_lots ?? 0, sub.price_id)
    }, 0)
  } catch (error) {
    logger.error({ error }, '[ADMIN-MRR] Unexpected error calculating platform MRR')
    return 0
  }
}

/** Convert cents to formatted EUR string (e.g. "1,245.83") */
export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Get plan label from price ID */
export function getPlanLabel(priceId: string | null): string {
  if (priceId === STRIPE_PRICES.annual) return 'Annuel (50€/lot/an)'
  if (priceId === STRIPE_PRICES.monthly) return 'Mensuel (5€/lot/mois)'
  return 'Inconnu'
}
