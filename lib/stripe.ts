import Stripe from 'stripe'

// =============================================================================
// Stripe SDK Instance (lazy — only initialized when accessed)
// =============================================================================

let _stripe: Stripe | null = null

/**
 * Get the Stripe SDK instance. Lazy-initialized so that importing this module
 * for constants/utility functions doesn't require STRIPE_SECRET_KEY.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  }
  return _stripe
}

// =============================================================================
// Constants
// =============================================================================

// Price IDs from Stripe Dashboard (set in .env.local)
export const STRIPE_PRICES = {
  annual: process.env.STRIPE_PRICE_ANNUAL ?? '',
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? '',
} as const

// Free tier: 1-2 lots = free forever
export const FREE_TIER_LIMIT = 2

// Trial period: 30 days, app-managed (no Stripe subscription during trial)
export const TRIAL_DAYS = 30

// =============================================================================
// Pricing Utilities
// =============================================================================

// Price per lot in cents (HT, excluding VAT)
const PRICE_PER_LOT_MONTHLY = 500   // 5.00 EUR
const PRICE_PER_LOT_ANNUAL = 5000   // 50.00 EUR

/**
 * Calculate the total price for a given number of lots and billing interval.
 * Returns price in cents (EUR). Free tier (<=2 lots) returns 0.
 */
export function calculatePrice(lotCount: number, interval: 'month' | 'year'): number {
  if (lotCount <= 0) return 0
  if (lotCount <= FREE_TIER_LIMIT) return 0
  const pricePerLot = interval === 'year' ? PRICE_PER_LOT_ANNUAL : PRICE_PER_LOT_MONTHLY
  return lotCount * pricePerLot
}

/**
 * Calculate the annual savings when choosing annual over monthly billing.
 * Returns savings in cents (EUR) per year.
 */
export function calculateAnnualSavings(lotCount: number): number {
  if (lotCount <= 0) return 0
  const monthlyTotal = lotCount * PRICE_PER_LOT_MONTHLY * 12
  const annualTotal = lotCount * PRICE_PER_LOT_ANNUAL
  return monthlyTotal - annualTotal
}
