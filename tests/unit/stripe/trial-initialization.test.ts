/**
 * Tests for Trial Initialization Logic
 * Verifies the initializeTrialSubscription behavior during team creation.
 *
 * Note: The actual DB INSERT happens in a PostgreSQL trigger (SECURITY DEFINER).
 * These tests verify the SubscriptionService.initializeTrialSubscription() method
 * which is used for app-managed scenarios and as a fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SubscriptionService } from '@/lib/services/domain/subscription.service'

// ── Mock factories ─────────────────────────────────────────────────────

function createMockSubscriptionRepo() {
  return {
    findByTeamId: vi.fn(),
    findByStripeSubscriptionId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateByTeamId: vi.fn(),
    upsertByTeamId: vi.fn(),
    getLotCount: vi.fn(),
  }
}

function createMockCustomerRepo() {
  return {
    findByTeamId: vi.fn(),
    findByStripeCustomerId: vi.fn(),
    create: vi.fn(),
  }
}

function createMockStripe() {
  return {
    customers: {
      create: vi.fn(),
    },
    paymentMethods: {
      list: vi.fn(),
    },
    checkout: {
      sessions: { create: vi.fn() },
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
      sessions: { create: vi.fn() },
    },
  } as any
}

const TEAM_ID = 'team-trial-001'

// =============================================================================
// Tests
// =============================================================================

describe('Trial Initialization — initializeTrialSubscription', () => {
  let service: SubscriptionService
  let subRepo: ReturnType<typeof createMockSubscriptionRepo>
  let custRepo: ReturnType<typeof createMockCustomerRepo>
  let stripe: ReturnType<typeof createMockStripe>

  beforeEach(() => {
    vi.clearAllMocks()
    subRepo = createMockSubscriptionRepo()
    custRepo = createMockCustomerRepo()
    stripe = createMockStripe()
    service = new SubscriptionService(stripe, subRepo as any, custRepo as any)
  })

  it('creates trialing subscription when team has > 2 lots', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 5, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    expect(subRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: TEAM_ID,
        status: 'trialing',
      }),
    )
  })

  it('creates trialing subscription when team has <= 2 lots', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 1, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    expect(subRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: TEAM_ID,
        status: 'trialing',
      }),
    )
  })

  it('creates trialing when exactly 2 lots (boundary)', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 2, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    expect(subRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: TEAM_ID,
        status: 'trialing',
      }),
    )
  })

  it('creates trialing when 0 lots (new team)', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 0, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    expect(subRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: TEAM_ID,
        status: 'trialing',
      }),
    )
  })

  it('sets trial_start and trial_end with 30-day window', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 5, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    const before = Date.now()
    await service.initializeTrialSubscription(TEAM_ID)
    const after = Date.now()

    const createCall = subRepo.create.mock.calls[0][0]
    const trialStart = new Date(createCall.trial_start).getTime()
    const trialEnd = new Date(createCall.trial_end).getTime()

    // trial_start should be ~now
    expect(trialStart).toBeGreaterThanOrEqual(before)
    expect(trialStart).toBeLessThanOrEqual(after)

    // trial_end should be ~30 days from now
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect(trialEnd - trialStart).toBeGreaterThanOrEqual(thirtyDaysMs - 1000)
    expect(trialEnd - trialStart).toBeLessThanOrEqual(thirtyDaysMs + 1000)
  })

  it('does NOT create a Stripe subscription (app-managed trial)', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 5, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    // No Stripe API calls during trial initialization
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('sets billable_properties from getLotCount', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 7, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    expect(subRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billable_properties: 7,
      }),
    )
  })

  it('propagates DB errors from create', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 3, error: null })
    subRepo.create.mockRejectedValue(new Error('DB insert failed'))

    await expect(service.initializeTrialSubscription(TEAM_ID)).rejects.toThrow('DB insert failed')
  })

  it('stripe_subscription_id is NOT set (no Stripe sub during trial)', async () => {
    subRepo.getLotCount.mockResolvedValue({ data: 5, error: null })
    subRepo.create.mockResolvedValue({ data: { id: 'sub-1', team_id: TEAM_ID }, error: null })

    await service.initializeTrialSubscription(TEAM_ID)

    const createCall = subRepo.create.mock.calls[0][0]
    expect(createCall.stripe_subscription_id).toBeUndefined()
  })
})
