/**
 * Tests for Subscription Server Actions
 * Verifies auth guards, return shapes, and business logic delegation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock fns (declared BEFORE vi.mock) ─────────────────────────────────

const mockGetAuthContext = vi.fn()
const mockGetSubscriptionInfo = vi.fn()
const mockCanAddProperty = vi.fn()
const mockHasPaymentMethod = vi.fn()
const mockIsReadOnlyMode = vi.fn()
const mockCreateCheckoutSession = vi.fn()
const mockUpgradeSubscriptionDirect = vi.fn()
const mockPreviewUpgrade = vi.fn()
const mockCreatePortalSession = vi.fn()
const mockGetOrCreateStripeCustomer = vi.fn()
const mockSessionsRetrieve = vi.fn()

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/server-context', () => ({
  getServerActionAuthContextOrNull: (...args: unknown[]) => mockGetAuthContext(...args),
}))

vi.mock('@/lib/services/domain/subscription.service', () => {
  // Regular function — can be called with `new`
  function MockSubscriptionService() {
    return {
      getSubscriptionInfo: mockGetSubscriptionInfo,
      canAddProperty: mockCanAddProperty,
      hasPaymentMethod: mockHasPaymentMethod,
      isReadOnlyMode: mockIsReadOnlyMode,
      createCheckoutSession: mockCreateCheckoutSession,
      upgradeSubscriptionDirect: mockUpgradeSubscriptionDirect,
      previewUpgrade: mockPreviewUpgrade,
      createPortalSession: mockCreatePortalSession,
      getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
    }
  }
  return { SubscriptionService: MockSubscriptionService }
})

vi.mock('@/lib/services/domain/subscription-helpers', () => {
  function MockServiceRoleSubscriptionService() {
    return {
      getSubscriptionInfo: mockGetSubscriptionInfo,
      canAddProperty: mockCanAddProperty,
      hasPaymentMethod: mockHasPaymentMethod,
      isReadOnlyMode: mockIsReadOnlyMode,
      createCheckoutSession: mockCreateCheckoutSession,
      upgradeSubscriptionDirect: mockUpgradeSubscriptionDirect,
      previewUpgrade: mockPreviewUpgrade,
      createPortalSession: mockCreatePortalSession,
      getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
    }
  }
  function MockSubscriptionService() {
    return {
      getSubscriptionInfo: mockGetSubscriptionInfo,
      canAddProperty: mockCanAddProperty,
      hasPaymentMethod: mockHasPaymentMethod,
      isReadOnlyMode: mockIsReadOnlyMode,
      createCheckoutSession: mockCreateCheckoutSession,
      upgradeSubscriptionDirect: mockUpgradeSubscriptionDirect,
      previewUpgrade: mockPreviewUpgrade,
      createPortalSession: mockCreatePortalSession,
      getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
    }
  }
  return {
    createServiceRoleSubscriptionService: () => new (MockServiceRoleSubscriptionService as any)(),
    createSubscriptionService: () => new (MockSubscriptionService as any)(),
  }
})

const mockFindByTeamId = vi.fn().mockResolvedValue({ data: null, error: null })
vi.mock('@/lib/services/repositories/subscription.repository', () => {
  function MockSubscriptionRepository() {
    return { findByTeamId: mockFindByTeamId }
  }
  return { SubscriptionRepository: MockSubscriptionRepository }
})
vi.mock('@/lib/services/repositories/stripe-customer.repository', () => ({
  StripeCustomerRepository: vi.fn(),
}))

// getStripe must return a Stripe-like object with checkout.sessions.retrieve
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { retrieve: (...args: unknown[]) => mockSessionsRetrieve(...args) } },
  })),
  STRIPE_PRICES: { annual: 'price_annual_test', monthly: 'price_monthly_test' },
  FREE_TIER_LIMIT: 2,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/lib/services/core/supabase-client', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: vi.fn() })),
  createServiceRoleSupabaseClient: vi.fn(() => ({ from: vi.fn() })),
}))

// ── Helpers ────────────────────────────────────────────────────────────

const TEAM_ID = 'team-001'
const USER_ID = 'user-001'

function makeAuthContext(overrides?: Record<string, unknown>) {
  return {
    user: { id: USER_ID, email: 'admin@test.com', name: 'Admin', role: 'admin' },
    profile: { id: USER_ID, email: 'admin@test.com', name: 'Admin', role: 'admin', team_id: TEAM_ID },
    team: { id: TEAM_ID, name: 'Test Team' },
    teams: [{ id: TEAM_ID, name: 'Test Team' }],
    sameRoleTeams: [{ id: TEAM_ID, name: 'Test Team' }],
    activeTeamIds: [TEAM_ID],
    isConsolidatedView: false,
    supabase: {},
    ...overrides,
  }
}

// ── Import actions (static — vi.mock hoisting handles the rest) ────────

import {
  getSubscriptionStatus,
  checkCanAddProperty,
  checkHasPaymentMethod,
  isReadOnlyMode,
  createCheckoutSessionAction,
  upgradeSubscription,
  getUpgradePreview,
  createPortalSessionAction,
  verifyCheckoutSession,
} from '@/app/actions/subscription-actions'

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// AUTH GUARD TESTS
// =============================================================================

describe('Subscription Actions — Auth Guards', () => {
  it('getSubscriptionStatus rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await getSubscriptionStatus()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('checkCanAddProperty rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await checkCanAddProperty()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('checkHasPaymentMethod rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await checkHasPaymentMethod()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('isReadOnlyMode rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await isReadOnlyMode()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('createCheckoutSessionAction rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await createCheckoutSessionAction({ interval: 'annual', quantity: 3 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('upgradeSubscription rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await upgradeSubscription(1)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('getUpgradePreview rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await getUpgradePreview(1)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('createPortalSessionAction rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await createPortalSessionAction()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('verifyCheckoutSession rejects when not authenticated', async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const result = await verifyCheckoutSession('cs_test_123')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/auth/i)
  })

  it('getSubscriptionStatus works for authenticated gestionnaire', async () => {
    mockGetAuthContext.mockResolvedValue(makeAuthContext())
    mockGetSubscriptionInfo.mockResolvedValue({
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
    })

    const result = await getSubscriptionStatus()

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockGetAuthContext).toHaveBeenCalledWith('gestionnaire')
  })
})

// =============================================================================
// ACTION RETURN SHAPE TESTS
// =============================================================================

describe('Subscription Actions — Return Shapes', () => {
  beforeEach(() => {
    mockGetAuthContext.mockResolvedValue(makeAuthContext())
  })

  it('getSubscriptionStatus returns SubscriptionInfo shape', async () => {
    const info = {
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
    }
    mockGetSubscriptionInfo.mockResolvedValue(info)

    const result = await getSubscriptionStatus()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(info)
  })

  it('getSubscriptionStatus returns null data when no subscription', async () => {
    mockGetSubscriptionInfo.mockResolvedValue(null)

    const result = await getSubscriptionStatus()

    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })

  it('checkCanAddProperty returns { allowed, reason, upgrade_needed }', async () => {
    mockCanAddProperty.mockResolvedValue({
      allowed: false,
      reason: 'Limite gratuite atteinte (2 lots)',
      upgrade_needed: true,
    })

    const result = await checkCanAddProperty()

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      allowed: false,
      reason: 'Limite gratuite atteinte (2 lots)',
      upgrade_needed: true,
    })
  })

  it('checkHasPaymentMethod returns boolean', async () => {
    mockHasPaymentMethod.mockResolvedValue(true)

    const result = await checkHasPaymentMethod()

    expect(result.success).toBe(true)
    expect(result.data).toBe(true)
  })

  it('isReadOnlyMode returns boolean', async () => {
    mockIsReadOnlyMode.mockResolvedValue(false)

    const result = await isReadOnlyMode()

    expect(result.success).toBe(true)
    expect(result.data).toBe(false)
  })

  it('createCheckoutSessionAction (annual) returns { url }', async () => {
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test_123')
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session_annual' })

    const result = await createCheckoutSessionAction({ interval: 'annual', quantity: 5 })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ url: 'https://checkout.stripe.com/session_annual' })
  })

  it('createCheckoutSessionAction (monthly) returns { url } with different price', async () => {
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test_123')
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session_monthly' })

    const result = await createCheckoutSessionAction({ interval: 'monthly', quantity: 5 })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ url: 'https://checkout.stripe.com/session_monthly' })
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: 'price_monthly_test' }),
    )
  })

  it('upgradeSubscription returns { success, invoice_amount }', async () => {
    mockUpgradeSubscriptionDirect.mockResolvedValue({ success: true, invoice_amount: 2500 })

    const result = await upgradeSubscription(1)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ success: true, invoice_amount: 2500 })
  })

  it('getUpgradePreview returns UpgradePreview shape', async () => {
    const preview = {
      current_lots: 3,
      new_lots: 4,
      proration_amount: 4167,
      recurring_change: 5000,
      currency: 'eur',
      interval: 'year',
      is_estimate: false,
    }
    mockPreviewUpgrade.mockResolvedValue(preview)

    const result = await getUpgradePreview(1)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(preview)
  })

  it('createPortalSessionAction returns { url }', async () => {
    mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/portal_123' })

    const result = await createPortalSessionAction()

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ url: 'https://billing.stripe.com/portal_123' })
  })

  it('verifyCheckoutSession returns verified shape', async () => {
    mockSessionsRetrieve.mockResolvedValue({
      payment_status: 'paid',
      metadata: { team_id: TEAM_ID },
      subscription: 'sub_test_123',
    })

    const result = await verifyCheckoutSession('cs_test_123')

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      verified: true,
      subscription_status: 'paid',
    })
  })
})

// =============================================================================
// BUSINESS LOGIC TESTS
// =============================================================================

describe('Subscription Actions — Business Logic', () => {
  beforeEach(() => {
    mockGetAuthContext.mockResolvedValue(makeAuthContext())
  })

  it('createCheckoutSessionAction defaults to annual interval', async () => {
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test_123')
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    await createCheckoutSessionAction({ quantity: 5 })

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: 'price_annual_test' }),
    )
  })

  it('createCheckoutSessionAction uses correct successUrl and cancelUrl', async () => {
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test_123')
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    await createCheckoutSessionAction({ quantity: 5 })

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: TEAM_ID,
        customerId: 'cus_test_123',
        successUrl: expect.stringContaining('/gestionnaire/settings/billing'),
        cancelUrl: expect.stringContaining('/gestionnaire/settings/billing'),
      }),
    )
  })

  it('verifyCheckoutSession rejects mismatched team_id', async () => {
    mockSessionsRetrieve.mockResolvedValue({
      payment_status: 'paid',
      metadata: { team_id: 'different-team' },
      subscription: 'sub_test_123',
    })

    const result = await verifyCheckoutSession('cs_test_123')

    expect(result.success).toBe(true)
    expect(result.data?.verified).toBe(false)
  })

  it('verifyCheckoutSession rejects unpaid payment_status', async () => {
    mockSessionsRetrieve.mockResolvedValue({
      payment_status: 'unpaid',
      metadata: { team_id: TEAM_ID },
      subscription: 'sub_test_123',
    })

    const result = await verifyCheckoutSession('cs_test_123')

    expect(result.success).toBe(true)
    expect(result.data?.verified).toBe(false)
  })

  it('actions catch and return errors gracefully', async () => {
    mockGetSubscriptionInfo.mockRejectedValue(new Error('DB connection lost'))

    const result = await getSubscriptionStatus()

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/DB connection lost/)
  })
})
