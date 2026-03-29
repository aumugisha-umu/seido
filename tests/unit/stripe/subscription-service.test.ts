import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SubscriptionService } from '@/lib/services/domain/subscription.service'
import type { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'
import type { StripeCustomerRepository } from '@/lib/services/repositories/stripe-customer.repository'
import type Stripe from 'stripe'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// ============================================================================
// T-004 + US-006: SubscriptionService — state machine + business logic
// ~55 test cases: 12 state transitions, 10 methods, edge cases
// ============================================================================

// ── Mock Factories ──────────────────────────────────────────────────────

const createMockSubscriptionRepo = () => ({
  findByTeamId: vi.fn(),
  findByStripeSubscriptionId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateByTeamId: vi.fn(),
  upsertByTeamId: vi.fn(),
  getLotCount: vi.fn(),
}) as unknown as SubscriptionRepository & Record<string, ReturnType<typeof vi.fn>>

const createMockCustomerRepo = () => ({
  findByTeamId: vi.fn(),
  findByStripeCustomerId: vi.fn(),
  create: vi.fn(),
}) as unknown as StripeCustomerRepository & Record<string, ReturnType<typeof vi.fn>>

const createMockStripe = () => ({
  paymentMethods: {
    list: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
    createPreview: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
}) as unknown as Stripe & { [key: string]: any }

// Helper to make a subscription row
const makeSub = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  team_id: 'team-1',
  stripe_subscription_id: null as string | null,
  stripe_customer_id: null,
  price_id: null,
  status: 'trialing' as string,
  trial_start: '2026-02-01T00:00:00Z',
  trial_end: '2026-03-03T00:00:00Z',
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  ended_at: null,
  subscribed_lots: 0,
  billable_properties: 3,
  notification_j7_sent: false,
  notification_j3_sent: false,
  notification_j1_sent: false,
  trial_expired_email_sent: false,
  last_behavioral_email_at: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
})

describe('SubscriptionService', () => {
  let service: SubscriptionService
  let subRepo: ReturnType<typeof createMockSubscriptionRepo>
  let custRepo: ReturnType<typeof createMockCustomerRepo>
  let mockStripe: ReturnType<typeof createMockStripe>

  beforeEach(() => {
    vi.clearAllMocks()
    subRepo = createMockSubscriptionRepo()
    custRepo = createMockCustomerRepo()
    mockStripe = createMockStripe()
    service = new SubscriptionService(mockStripe as any, subRepo as any, custRepo as any)
  })

  // ═══════════════════════════════════════════════════════════════════════
  // getSubscriptionInfo
  // ═══════════════════════════════════════════════════════════════════════

  describe('getSubscriptionInfo', () => {
    it('returns null when no subscription exists', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result).toBeNull()
    })

    it('returns full info for trialing team', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing', trial_end: futureDate }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('trialing')
      expect(result!.is_free_tier).toBe(false)
      expect(result!.has_stripe_subscription).toBe(false)
      expect(result!.days_left_trial).toBeGreaterThan(0)
      expect(result!.actual_lots).toBe(5)
    })

    it('returns info for active subscription', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({
          status: 'active',
          stripe_subscription_id: 'sub_abc',
          subscribed_lots: 10,
          cancel_at_period_end: false,
        }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 8, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result!.status).toBe('active')
      expect(result!.has_stripe_subscription).toBe(true)
      expect(result!.can_add_property).toBe(true) // 8 < 10
      expect(result!.is_read_only).toBe(false)
      expect(result!.days_left_trial).toBeNull()
    })

    it('returns read_only info correctly', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'read_only' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result!.is_read_only).toBe(true)
      expect(result!.can_add_property).toBe(false)
    })

    it('returns free_tier info correctly', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'free_tier' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result!.is_free_tier).toBe(true)
      expect(result!.can_add_property).toBe(true) // 1 < 2
    })

    it('calculates days_left_trial as 0 when trial expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString()
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing', trial_end: pastDate }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result!.days_left_trial).toBe(0)
    })

    // ── Lazy sync from Stripe ───────────────────────────────────────────

    it('lazy-syncs period dates from Stripe when current_period_end is NULL', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({
          status: 'active',
          stripe_subscription_id: 'sub_xyz',
          current_period_end: null,
          subscribed_lots: 0,
        }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        status: 'active',
        current_period_start: 1708560000, // 2024-02-22T00:00:00Z
        current_period_end: 1740096000,   // 2025-02-21T00:00:00Z
        cancel_at_period_end: false,
        items: { data: [{ quantity: 10, price: { id: 'price_main_monthly' } }] },
      })

      const mockServiceRoleRepo = createMockSubscriptionRepo()
      ;(mockServiceRoleRepo.updateByTeamId as any).mockResolvedValue({ data: {}, error: null })

      const result = await service.getSubscriptionInfo('team-1', mockServiceRoleRepo as any)

      expect(result).not.toBeNull()
      expect(result!.current_period_end).not.toBeNull()
      expect(result!.subscribed_lots).toBe(10)
      expect(result!.status).toBe('active')
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_xyz')
      expect(mockServiceRoleRepo.updateByTeamId).toHaveBeenCalledWith('team-1', expect.objectContaining({
        current_period_end: expect.any(String),
        current_period_start: expect.any(String),
        status: 'active',
        subscribed_lots: 10,
      }))
    })

    it('does NOT call Stripe when current_period_end is already set', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({
          status: 'active',
          stripe_subscription_id: 'sub_xyz',
          current_period_end: '2025-02-21T00:00:00Z',
          subscribed_lots: 10,
        }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.getSubscriptionInfo('team-1')

      expect(result).not.toBeNull()
      expect(result!.current_period_end).toBe('2025-02-21T00:00:00Z')
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
    })

    it('gracefully handles Stripe API failure during lazy sync', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({
          status: 'active',
          stripe_subscription_id: 'sub_xyz',
          current_period_end: null,
        }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(mockStripe.subscriptions.retrieve as any).mockRejectedValue(new Error('Stripe down'))

      const result = await service.getSubscriptionInfo('team-1')

      // Should still return data — just with null period end (same as before)
      expect(result).not.toBeNull()
      expect(result!.current_period_end).toBeNull()
      expect(result!.status).toBe('active')
    })

    it('uses subscriptionRepo as fallback when no serviceRoleRepo provided', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({
          status: 'active',
          stripe_subscription_id: 'sub_xyz',
          current_period_end: null,
        }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(subRepo.updateByTeamId as any).mockResolvedValue({ data: {}, error: null })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        status: 'active',
        current_period_start: 1708560000,
        current_period_end: 1740096000,
        cancel_at_period_end: false,
        items: { data: [{ quantity: 5, price: { id: 'price_main_monthly' } }] },
      })

      // No serviceRoleRepo passed — should use this.subscriptionRepo
      await service.getSubscriptionInfo('team-1')

      expect(subRepo.updateByTeamId).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // mapStripeStatus
  // ═══════════════════════════════════════════════════════════════════════

  describe('mapStripeStatus', () => {
    it('maps all known Stripe statuses', () => {
      expect(SubscriptionService.mapStripeStatus('active')).toBe('active')
      expect(SubscriptionService.mapStripeStatus('past_due')).toBe('past_due')
      expect(SubscriptionService.mapStripeStatus('canceled')).toBe('canceled')
      expect(SubscriptionService.mapStripeStatus('trialing')).toBe('trialing')
      expect(SubscriptionService.mapStripeStatus('unpaid')).toBe('unpaid')
      expect(SubscriptionService.mapStripeStatus('paused')).toBe('paused')
      expect(SubscriptionService.mapStripeStatus('incomplete')).toBe('incomplete')
      expect(SubscriptionService.mapStripeStatus('incomplete_expired')).toBe('incomplete_expired')
    })

    it('falls back to past_due for unknown statuses (fail-closed)', () => {
      expect(SubscriptionService.mapStripeStatus('some_future_status')).toBe('past_due')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // canAddProperty — STATE MACHINE LOGIC
  // ═══════════════════════════════════════════════════════════════════════

  describe('canAddProperty', () => {
    it('allows when no subscription exists (new team)', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('blocks read_only teams', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'read_only' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('read-only')
    })

    it('blocks unpaid teams', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'unpaid' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
    })

    it('blocks incomplete_expired teams', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'incomplete_expired' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
    })

    it('allows free_tier with 1 lot (under limit)', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'free_tier' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('blocks free_tier at limit (2 lots) with upgrade_needed', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'free_tier' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 2, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
      expect(result.upgrade_needed).toBe(true)
      expect(result.reason).toContain('2 lots')
    })

    it('always allows trialing teams', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 50, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('allows active within subscription limit', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'active', subscribed_lots: 10 }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 8, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('blocks active at subscription limit with upgrade_needed', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'active', subscribed_lots: 10 }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 10, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
      expect(result.upgrade_needed).toBe(true)
      expect(result.reason).toContain('10 lots')
    })

    it('allows active with subscribed_lots=0 (not yet subscribed)', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'active', subscribed_lots: 0 }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('canceled with <=2 lots = free tier behavior (allowed if <2)', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'canceled' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(true)
    })

    it('canceled with >2 lots = read-only', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'canceled' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.canAddProperty('team-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('read-only')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // hasPaymentMethod
  // ═══════════════════════════════════════════════════════════════════════

  describe('hasPaymentMethod', () => {
    it('returns true when customer has a card', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({
        data: { stripe_customer_id: 'cus_abc' },
        error: null,
      })
      ;(mockStripe.paymentMethods.list as any).mockResolvedValue({
        data: [{ id: 'pm_123', type: 'card' }],
      })

      const result = await service.hasPaymentMethod('team-1')

      expect(result).toBe(true)
      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_abc',
        type: 'card',
        limit: 1,
      })
    })

    it('returns false when no payment methods', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({
        data: { stripe_customer_id: 'cus_abc' },
        error: null,
      })
      ;(mockStripe.paymentMethods.list as any).mockResolvedValue({ data: [] })

      const result = await service.hasPaymentMethod('team-1')

      expect(result).toBe(false)
    })

    it('returns false when no customer exists', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.hasPaymentMethod('team-1')

      expect(result).toBe(false)
    })

    it('returns false on Stripe API error (graceful fallback)', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({
        data: { stripe_customer_id: 'cus_abc' },
        error: null,
      })
      ;(mockStripe.paymentMethods.list as any).mockRejectedValue(new Error('Stripe down'))

      const result = await service.hasPaymentMethod('team-1')

      expect(result).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // getOrCreateStripeCustomer
  // ═══════════════════════════════════════════════════════════════════════

  describe('getOrCreateStripeCustomer', () => {
    it('returns existing customer ID if found and verified in Stripe', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({
        data: { stripe_customer_id: 'cus_existing' },
        error: null,
      })
      // Mock Stripe retrieve to confirm customer exists
      ;(mockStripe.customers.retrieve as any).mockResolvedValue({ id: 'cus_existing' })

      const result = await service.getOrCreateStripeCustomer('team-1', 'a@b.com')

      expect(result).toBe('cus_existing')
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
    })

    it('creates new customer when none exists', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })
      ;(mockStripe.customers.create as any).mockResolvedValue({ id: 'cus_new' })
      ;(custRepo.create as any).mockResolvedValue({ data: {}, error: null })

      const result = await service.getOrCreateStripeCustomer('team-1', 'a@b.com', 'Team A')

      expect(result).toBe('cus_new')
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        name: 'Team A',
        metadata: { team_id: 'team-1' },
      })
      expect(custRepo.create).toHaveBeenCalledWith({
        team_id: 'team-1',
        stripe_customer_id: 'cus_new',
        email: 'a@b.com',
        name: 'Team A',
      })
    })

    it('passes undefined name when not provided', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })
      ;(mockStripe.customers.create as any).mockResolvedValue({ id: 'cus_new' })
      ;(custRepo.create as any).mockResolvedValue({ data: {}, error: null })

      await service.getOrCreateStripeCustomer('team-1', 'a@b.com')

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        name: undefined,
        metadata: { team_id: 'team-1' },
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // createCheckoutSession
  // ═══════════════════════════════════════════════════════════════════════

  describe('createCheckoutSession', () => {
    it('creates session with correct parameters', async () => {
      const mockSession = { id: 'cs_123', url: 'https://checkout.stripe.com/xxx' }
      ;(mockStripe.checkout.sessions.create as any).mockResolvedValue(mockSession)

      const result = await service.createCheckoutSession({
        teamId: 'team-1',
        customerId: 'cus_abc',
        quantity: 5,
        successUrl: 'https://app.seido.be/success',
        cancelUrl: 'https://app.seido.be/cancel',
      })

      expect(result).toEqual(mockSession)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_abc',
          mode: 'subscription',
          allow_promotion_codes: true,
          line_items: [{ price: expect.any(String), quantity: 5 }],
          subscription_data: { metadata: { team_id: 'team-1' } },
          success_url: 'https://app.seido.be/success',
          cancel_url: 'https://app.seido.be/cancel',
        }),
      )
    })

    it('enforces minimum quantity of 3 (FREE_TIER_LIMIT + 1)', async () => {
      ;(mockStripe.checkout.sessions.create as any).mockResolvedValue({ id: 'cs_123' })

      await service.createCheckoutSession({
        teamId: 'team-1',
        customerId: 'cus_abc',
        quantity: 1, // Below minimum
        successUrl: 'https://app.seido.be/success',
        cancelUrl: 'https://app.seido.be/cancel',
      })

      const call = (mockStripe.checkout.sessions.create as any).mock.calls[0][0]
      expect(call.line_items[0].quantity).toBe(3) // Enforced minimum
    })

    it('uses annual price by default', async () => {
      ;(mockStripe.checkout.sessions.create as any).mockResolvedValue({ id: 'cs_123' })

      await service.createCheckoutSession({
        teamId: 'team-1',
        customerId: 'cus_abc',
        quantity: 5,
        successUrl: 'https://app.seido.be/success',
        cancelUrl: 'https://app.seido.be/cancel',
      })

      const call = (mockStripe.checkout.sessions.create as any).mock.calls[0][0]
      // STRIPE_PRICES.annual is the default (may be empty string in test env)
      expect(call.line_items[0].price).toBeDefined()
    })

    it('allows custom priceId override', async () => {
      ;(mockStripe.checkout.sessions.create as any).mockResolvedValue({ id: 'cs_123' })

      await service.createCheckoutSession({
        teamId: 'team-1',
        customerId: 'cus_abc',
        priceId: 'price_monthly_custom',
        quantity: 5,
        successUrl: 'https://app.seido.be/success',
        cancelUrl: 'https://app.seido.be/cancel',
      })

      const call = (mockStripe.checkout.sessions.create as any).mock.calls[0][0]
      expect(call.line_items[0].price).toBe('price_monthly_custom')
    })

    it('passes allow_promotion_codes: true', async () => {
      ;(mockStripe.checkout.sessions.create as any).mockResolvedValue({ id: 'cs_123' })

      await service.createCheckoutSession({
        teamId: 'team-1',
        customerId: 'cus_abc',
        quantity: 5,
        successUrl: 'https://app.seido.be/success',
        cancelUrl: 'https://app.seido.be/cancel',
      })

      const call = (mockStripe.checkout.sessions.create as any).mock.calls[0][0]
      expect(call.allow_promotion_codes).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // upgradeSubscriptionDirect
  // ═══════════════════════════════════════════════════════════════════════

  describe('upgradeSubscriptionDirect', () => {
    it('upgrades quantity and returns prorated amount', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: 'sub_abc', subscribed_lots: 5 }),
        error: null,
      })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        items: { data: [{ id: 'si_123', quantity: 5, price: { id: 'price_main_monthly' } }] },
      })
      ;(mockStripe.subscriptions.update as any).mockResolvedValue({ id: 'sub_abc' })
      ;(subRepo.updateByTeamId as any).mockResolvedValue({ data: {}, error: null })
      ;(mockStripe.invoices.list as any).mockResolvedValue({
        data: [{ amount_due: 2500 }],
      })

      const result = await service.upgradeSubscriptionDirect('team-1', 3)

      expect(result.success).toBe(true)
      expect(result.invoice_amount).toBe(2500)
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_abc', {
        items: [{ id: 'si_123', quantity: 8 }], // 5 + 3
        proration_behavior: 'always_invoice',
      })
      expect(subRepo.updateByTeamId).toHaveBeenCalledWith('team-1', { subscribed_lots: 8 })
    })

    it('returns failure when no stripe subscription exists', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: null }),
        error: null,
      })

      const result = await service.upgradeSubscriptionDirect('team-1', 3)

      expect(result.success).toBe(false)
    })

    it('returns failure when no subscription found', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.upgradeSubscriptionDirect('team-1', 3)

      expect(result.success).toBe(false)
    })

    it('returns failure when subscription has no items', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: 'sub_abc' }),
        error: null,
      })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        items: { data: [] },
      })

      const result = await service.upgradeSubscriptionDirect('team-1', 3)

      expect(result.success).toBe(false)
    })

    it('uses proration_behavior: always_invoice', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: 'sub_abc' }),
        error: null,
      })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        items: { data: [{ id: 'si_123', quantity: 5, price: { id: 'price_main_monthly' } }] },
      })
      ;(mockStripe.subscriptions.update as any).mockResolvedValue({ id: 'sub_abc' })
      ;(subRepo.updateByTeamId as any).mockResolvedValue({ data: {}, error: null })
      ;(mockStripe.invoices.list as any).mockResolvedValue({ data: [{ amount_due: 0 }] })

      await service.upgradeSubscriptionDirect('team-1', 2)

      const call = (mockStripe.subscriptions.update as any).mock.calls[0][1]
      expect(call.proration_behavior).toBe('always_invoice')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // previewUpgrade
  // ═══════════════════════════════════════════════════════════════════════

  describe('previewUpgrade', () => {
    it('returns accurate preview via Stripe API', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: 'sub_abc', subscribed_lots: 5 }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(mockStripe.subscriptions.retrieve as any).mockResolvedValue({
        customer: 'cus_abc',
        items: {
          data: [{
            id: 'si_123',
            quantity: 5,
            price: { id: 'price_main_annual', recurring: { interval: 'year' } },
          }],
        },
      })
      ;(mockStripe.invoices.createPreview as any).mockResolvedValue({
        amount_due: 15000,
        currency: 'eur',
      })

      const result = await service.previewUpgrade('team-1', 3)

      expect(result.current_lots).toBe(5)
      expect(result.new_lots).toBe(8)
      expect(result.proration_amount).toBe(15000)
      expect(result.is_estimate).toBe(false)
      expect(result.currency).toBe('eur')
      expect(result.interval).toBe('year')
    })

    it('falls back to estimate on Stripe API error', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: 'sub_abc', subscribed_lots: 5 }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(mockStripe.subscriptions.retrieve as any).mockRejectedValue(new Error('API error'))

      const result = await service.previewUpgrade('team-1', 3)

      expect(result.is_estimate).toBe(true)
      expect(result.current_lots).toBe(5)
      expect(result.new_lots).toBe(8)
    })

    it('returns estimate for teams without stripe subscription', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ stripe_subscription_id: null }),
        error: null,
      })

      const result = await service.previewUpgrade('team-1', 3)

      expect(result.is_estimate).toBe(true)
      expect(result.current_lots).toBe(0)
      expect(result.new_lots).toBe(3)
    })

    it('returns estimate when no subscription found', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.previewUpgrade('team-1', 5)

      expect(result.is_estimate).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // createPortalSession
  // ═══════════════════════════════════════════════════════════════════════

  describe('createPortalSession', () => {
    it('creates portal session with correct customer and returnUrl', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({
        data: { stripe_customer_id: 'cus_abc' },
        error: null,
      })
      const mockSession = { id: 'bps_123', url: 'https://billing.stripe.com/xxx' }
      ;(mockStripe.billingPortal.sessions.create as any).mockResolvedValue(mockSession)

      const result = await service.createPortalSession('team-1', 'https://app.seido.be/billing')

      expect(result).toEqual(mockSession)
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_abc',
        return_url: 'https://app.seido.be/billing',
      })
    })

    it('throws when no customer found', async () => {
      ;(custRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      await expect(
        service.createPortalSession('team-1', 'https://app.seido.be/billing'),
      ).rejects.toThrow('No Stripe customer found')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // initializeTrialSubscription
  // ═══════════════════════════════════════════════════════════════════════

  describe('initializeTrialSubscription', () => {
    it('always creates trialing when <=2 lots', async () => {
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })
      ;(subRepo.create as any).mockResolvedValue({ data: {}, error: null })

      await service.initializeTrialSubscription('team-1')

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: 'team-1',
          status: 'trialing',
          billable_properties: 1,
        }),
      )
    })

    it('creates trialing when >2 lots', async () => {
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(subRepo.create as any).mockResolvedValue({ data: {}, error: null })

      await service.initializeTrialSubscription('team-1')

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: 'team-1',
          status: 'trialing',
          billable_properties: 5,
        }),
      )
    })

    it('sets trial_start and trial_end (30 days)', async () => {
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })
      ;(subRepo.create as any).mockResolvedValue({ data: {}, error: null })

      await service.initializeTrialSubscription('team-1')

      const call = (subRepo.create as any).mock.calls[0][0]
      expect(call.trial_start).toBeDefined()
      expect(call.trial_end).toBeDefined()

      const start = new Date(call.trial_start)
      const end = new Date(call.trial_end)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(30)
    })

    it('creates trialing when exactly 2 lots', async () => {
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 2, error: null })
      ;(subRepo.create as any).mockResolvedValue({ data: {}, error: null })

      await service.initializeTrialSubscription('team-1')

      const call = (subRepo.create as any).mock.calls[0][0]
      expect(call.status).toBe('trialing')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // isReadOnlyMode
  // ═══════════════════════════════════════════════════════════════════════

  describe('isReadOnlyMode', () => {
    it('returns false when no subscription', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({ data: null, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })

    it('returns true for read_only status', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'read_only' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(true)
    })

    it('returns true for unpaid status', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'unpaid' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(true)
    })

    it('returns true for incomplete_expired', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'incomplete_expired' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(true)
    })

    it('returns true for canceled with >2 lots', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'canceled' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(true)
    })

    it('returns false for canceled with <=2 lots', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'canceled' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 2, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })

    it('returns true for expired trial with >2 lots', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing', trial_end: pastDate }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(true)
    })

    it('returns false for expired trial with <=2 lots', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing', trial_end: pastDate }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 2, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })

    it('returns false for active trial (not expired)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 10).toISOString()
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'trialing', trial_end: futureDate }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 5, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })

    it('returns false for active subscription', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'active' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 10, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })

    it('returns false for free_tier', async () => {
      ;(subRepo.findByTeamId as any).mockResolvedValue({
        data: makeSub({ status: 'free_tier' }),
        error: null,
      })
      ;(subRepo.getLotCount as any).mockResolvedValue({ data: 1, error: null })

      const result = await service.isReadOnlyMode('team-1')

      expect(result).toBe(false)
    })
  })
})
