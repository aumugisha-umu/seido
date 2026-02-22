import { describe, it, expect } from 'vitest'
import {
  calculatePrice,
  calculateAnnualSavings,
  FREE_TIER_LIMIT,
  TRIAL_DAYS,
  STRIPE_PRICES,
} from '@/lib/stripe'

// ============================================================================
// T-001: lib/stripe.ts — constants, calculatePrice, calculateAnnualSavings
// TDD target: ~15 test cases
// ============================================================================

describe('Stripe Constants', () => {
  it('FREE_TIER_LIMIT should be 2', () => {
    expect(FREE_TIER_LIMIT).toBe(2)
  })

  it('TRIAL_DAYS should be 30', () => {
    expect(TRIAL_DAYS).toBe(30)
  })

  it('STRIPE_PRICES should have annual and monthly keys', () => {
    expect(STRIPE_PRICES).toHaveProperty('annual')
    expect(STRIPE_PRICES).toHaveProperty('monthly')
  })
})

describe('calculatePrice', () => {
  // Free tier: 0-2 lots = 0 regardless of interval
  it('returns 0 for 0 lots (monthly)', () => {
    expect(calculatePrice(0, 'month')).toBe(0)
  })

  it('returns 0 for 0 lots (annual)', () => {
    expect(calculatePrice(0, 'year')).toBe(0)
  })

  it('returns 0 for 1 lot (free tier)', () => {
    expect(calculatePrice(1, 'month')).toBe(0)
    expect(calculatePrice(1, 'year')).toBe(0)
  })

  it('returns 0 for 2 lots (free tier boundary)', () => {
    expect(calculatePrice(2, 'month')).toBe(0)
    expect(calculatePrice(2, 'year')).toBe(0)
  })

  // Paid tier: 3+ lots — monthly = 500 cents/lot, annual = 5000 cents/lot
  it('calculates monthly price for 3 lots (first paid tier)', () => {
    // 3 lots x 500 cents = 1500 cents = 15.00 EUR
    expect(calculatePrice(3, 'month')).toBe(1500)
  })

  it('calculates annual price for 3 lots', () => {
    // 3 lots x 5000 cents = 15000 cents = 150.00 EUR
    expect(calculatePrice(3, 'year')).toBe(15000)
  })

  it('calculates monthly price for 10 lots', () => {
    // 10 lots x 500 cents = 5000 cents = 50.00 EUR
    expect(calculatePrice(10, 'month')).toBe(5000)
  })

  it('calculates annual price for 10 lots', () => {
    // 10 lots x 5000 cents = 50000 cents = 500.00 EUR
    expect(calculatePrice(10, 'year')).toBe(50000)
  })

  it('calculates price for large lot count (100 lots)', () => {
    expect(calculatePrice(100, 'month')).toBe(50000) // 500.00 EUR/month
    expect(calculatePrice(100, 'year')).toBe(500000)  // 5000.00 EUR/year
  })

  // Edge cases
  it('returns 0 for negative lot count', () => {
    expect(calculatePrice(-1, 'month')).toBe(0)
    expect(calculatePrice(-5, 'year')).toBe(0)
  })
})

describe('calculateAnnualSavings', () => {
  it('returns 0 for 0 lots', () => {
    expect(calculateAnnualSavings(0)).toBe(0)
  })

  it('calculates savings for 3 lots', () => {
    // Monthly: 3 x 500 x 12 = 18000 cents = 180.00 EUR/year
    // Annual: 3 x 5000 = 15000 cents = 150.00 EUR/year
    // Savings: 18000 - 15000 = 3000 cents = 30.00 EUR/year
    expect(calculateAnnualSavings(3)).toBe(3000)
  })

  it('calculates savings for 10 lots', () => {
    // Monthly: 10 x 500 x 12 = 60000 cents
    // Annual: 10 x 5000 = 50000 cents
    // Savings: 10000 cents = 100.00 EUR/year
    expect(calculateAnnualSavings(10)).toBe(10000)
  })

  it('savings represent ~17% discount for any lot count', () => {
    const lots = 5
    const monthly = lots * 500 * 12
    const savings = calculateAnnualSavings(lots)
    const discountPct = (savings / monthly) * 100
    // 10/60 = 16.67% — approximately 17%
    expect(discountPct).toBeCloseTo(16.67, 1)
  })

  it('returns 0 for negative lot count', () => {
    expect(calculateAnnualSavings(-1)).toBe(0)
  })
})
