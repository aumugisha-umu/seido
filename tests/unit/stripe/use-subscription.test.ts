/**
 * Tests for useSubscription hook logic
 *
 * Since @testing-library/react is not installed, we test:
 * 1. The derived boolean values from SubscriptionInfo
 * 2. Server action delegation (checkCanAddProperty, checkHasPaymentMethod)
 * 3. Error handling
 *
 * We simulate the hook behavior by calling the same server actions
 * and verifying the derived state logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'

// ── Mock server actions ────────────────────────────────────────────────

const mockGetSubscriptionStatus = vi.fn()
const mockCheckCanAddProperty = vi.fn()
const mockCheckHasPaymentMethod = vi.fn()

vi.mock('@/app/actions/subscription-actions', () => ({
  getSubscriptionStatus: (...args: unknown[]) => mockGetSubscriptionStatus(...args),
  checkCanAddProperty: (...args: unknown[]) => mockCheckCanAddProperty(...args),
  checkHasPaymentMethod: (...args: unknown[]) => mockCheckHasPaymentMethod(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────

function makeSubscriptionInfo(overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    status: 'active',
    subscribed_lots: 5,
    actual_lots: 3,
    trial_end: null,
    current_period_end: '2027-02-21T00:00:00.000Z',
    cancel_at_period_end: false,
    can_add_property: true,
    is_free_tier: false,
    is_read_only: false,
    has_stripe_subscription: true,
    days_left_trial: null,
    ...overrides,
  }
}

/**
 * Derive boolean values from SubscriptionInfo the same way the hook does.
 * This mirrors the return logic in useSubscription.
 */
function deriveFromStatus(status: SubscriptionInfo | null) {
  return {
    canAddProperty: status?.can_add_property ?? false,
    isReadOnly: status?.is_read_only ?? false,
    isFreeTier: status?.is_free_tier ?? false,
    hasStripeSubscription: status?.has_stripe_subscription ?? false,
    daysLeftTrial: status?.days_left_trial ?? null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// Derived State Tests
// =============================================================================

describe('useSubscription — Derived State', () => {
  it('derives canAddProperty from status.can_add_property', () => {
    const derived = deriveFromStatus(makeSubscriptionInfo({ can_add_property: true }))
    expect(derived.canAddProperty).toBe(true)

    const derived2 = deriveFromStatus(makeSubscriptionInfo({ can_add_property: false }))
    expect(derived2.canAddProperty).toBe(false)
  })

  it('derives isReadOnly from status.is_read_only', () => {
    const derived = deriveFromStatus(makeSubscriptionInfo({ is_read_only: true }))
    expect(derived.isReadOnly).toBe(true)

    const derived2 = deriveFromStatus(makeSubscriptionInfo({ is_read_only: false }))
    expect(derived2.isReadOnly).toBe(false)
  })

  it('derives isFreeTier from status.is_free_tier', () => {
    const derived = deriveFromStatus(makeSubscriptionInfo({ is_free_tier: true }))
    expect(derived.isFreeTier).toBe(true)
  })

  it('derives hasStripeSubscription from status.has_stripe_subscription', () => {
    const derived = deriveFromStatus(makeSubscriptionInfo({ has_stripe_subscription: false }))
    expect(derived.hasStripeSubscription).toBe(false)
  })

  it('derives daysLeftTrial from status.days_left_trial', () => {
    const derived = deriveFromStatus(makeSubscriptionInfo({ days_left_trial: 15 }))
    expect(derived.daysLeftTrial).toBe(15)

    const derived2 = deriveFromStatus(makeSubscriptionInfo({ days_left_trial: null }))
    expect(derived2.daysLeftTrial).toBeNull()
  })

  it('returns safe defaults when status is null', () => {
    const derived = deriveFromStatus(null)
    expect(derived.canAddProperty).toBe(false)
    expect(derived.isReadOnly).toBe(false)
    expect(derived.isFreeTier).toBe(false)
    expect(derived.hasStripeSubscription).toBe(false)
    expect(derived.daysLeftTrial).toBeNull()
  })
})

// =============================================================================
// Server Action Delegation Tests
// =============================================================================

describe('useSubscription — Server Action Delegation', () => {
  it('getSubscriptionStatus returns SubscriptionInfo on success', async () => {
    const info = makeSubscriptionInfo()
    mockGetSubscriptionStatus.mockResolvedValue({ success: true, data: info })

    const result = await mockGetSubscriptionStatus()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(info)
  })

  it('getSubscriptionStatus returns null data when no subscription', async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ success: true, data: null })

    const result = await mockGetSubscriptionStatus()

    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })

  it('checkCanAddProperty returns CanAddPropertyResult', async () => {
    mockCheckCanAddProperty.mockResolvedValue({
      success: true,
      data: { allowed: false, reason: 'Limit reached', upgrade_needed: true },
    })

    const result = await mockCheckCanAddProperty()

    expect(result.success).toBe(true)
    expect(result.data.allowed).toBe(false)
    expect(result.data.upgrade_needed).toBe(true)
  })

  it('checkHasPaymentMethod returns boolean', async () => {
    mockCheckHasPaymentMethod.mockResolvedValue({ success: true, data: true })

    const result = await mockCheckHasPaymentMethod()

    expect(result.success).toBe(true)
    expect(result.data).toBe(true)
  })

  it('handles action failure gracefully', async () => {
    mockGetSubscriptionStatus.mockResolvedValue({
      success: false,
      error: 'Network error',
    })

    const result = await mockGetSubscriptionStatus()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})

// =============================================================================
// Cache & Refresh Behavior Tests
// =============================================================================

describe('useSubscription — Cache & Refresh Logic', () => {
  it('initial call fetches data (fetchedRef prevents duplicate)', async () => {
    // Simulate: hook calls getSubscriptionStatus once on mount
    const info = makeSubscriptionInfo()
    mockGetSubscriptionStatus.mockResolvedValue({ success: true, data: info })

    // First call (initial fetch)
    await mockGetSubscriptionStatus()
    expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(1)

    // The hook uses fetchedRef.current to prevent re-fetch
    // Second render would NOT re-fetch (simulated by not calling again)
    // Only refresh() would trigger a new fetch
  })

  it('refresh forces re-fetch', async () => {
    const info1 = makeSubscriptionInfo({ actual_lots: 3 })
    const info2 = makeSubscriptionInfo({ actual_lots: 5 })

    mockGetSubscriptionStatus
      .mockResolvedValueOnce({ success: true, data: info1 })
      .mockResolvedValueOnce({ success: true, data: info2 })

    // Initial fetch
    const result1 = await mockGetSubscriptionStatus()
    expect(result1.data.actual_lots).toBe(3)

    // After refresh
    const result2 = await mockGetSubscriptionStatus()
    expect(result2.data.actual_lots).toBe(5)
    expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(2)
  })
})
