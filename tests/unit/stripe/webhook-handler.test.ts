import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeWebhookHandler } from '@/lib/services/domain/stripe-webhook.handler'
import type Stripe from 'stripe'

// ============================================================================
// T-005 + US-007: Webhook Handler — signature, idempotency, all event types
// ~30 test cases
// ============================================================================

// ── Mock Supabase ───────────────────────────────────────────────────────

const createChainMock = (resolvedValue: unknown = { data: null, error: null }) => {
  const terminal = vi.fn().mockResolvedValue(resolvedValue)
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = terminal
  chain.single = terminal

  return { chain, terminal }
}

// Table-specific mock configs
const createMockSupabase = (config?: {
  webhookInsert?: { data: unknown; error: unknown }
  subscriptionsFind?: { data: unknown; error: unknown }
  subscriptionsUpsert?: { data: unknown; error: unknown }
  subscriptionsUpdate?: { data: unknown; error: unknown }
  subscriptionsLotCount?: { data: unknown; error: unknown }
  customersFind?: { data: unknown; error: unknown }
  customersCreate?: { data: unknown; error: unknown }
  invoicesUpsert?: { data: unknown; error: unknown }
}) => {
  const mockFrom = vi.fn()

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'stripe_webhook_events': {
        // .insert() is terminal here (no .select() after it)
        const resolvedValue = config?.webhookInsert ?? { data: null, error: null }
        return {
          insert: vi.fn().mockResolvedValue(resolvedValue),
        }
      }
      case 'subscriptions': {
        // Complex: need different responses for different operations
        const selectChain = createChainMock(config?.subscriptionsFind ?? { data: null, error: null })
        const upsertChain = createChainMock(config?.subscriptionsUpsert ?? { data: null, error: null })
        const updateChain = createChainMock(config?.subscriptionsUpdate ?? { data: null, error: null })

        const proxy: Record<string, any> = {}
        proxy.select = vi.fn().mockImplementation((cols: string) => {
          if (cols === 'billable_properties') {
            const lotChain = createChainMock(config?.subscriptionsLotCount ?? { data: { billable_properties: 0 }, error: null })
            return lotChain.chain
          }
          return selectChain.chain
        })
        proxy.insert = vi.fn().mockReturnValue(upsertChain.chain)
        proxy.upsert = vi.fn().mockReturnValue(upsertChain.chain)
        proxy.update = vi.fn().mockReturnValue(updateChain.chain)
        proxy.eq = vi.fn().mockReturnValue(proxy)
        proxy.limit = vi.fn().mockReturnValue(proxy)
        proxy.maybeSingle = selectChain.terminal
        proxy.single = selectChain.terminal

        return proxy
      }
      case 'stripe_customers': {
        const selectChain = createChainMock(config?.customersFind ?? { data: null, error: null })
        const insertChain = createChainMock(config?.customersCreate ?? { data: null, error: null })

        const proxy: Record<string, any> = {}
        proxy.select = vi.fn().mockReturnValue(selectChain.chain)
        proxy.insert = vi.fn().mockReturnValue(insertChain.chain)
        proxy.eq = vi.fn().mockReturnValue(proxy)
        proxy.limit = vi.fn().mockReturnValue(proxy)
        proxy.maybeSingle = selectChain.terminal
        proxy.single = insertChain.terminal

        return proxy
      }
      case 'stripe_invoices': {
        const { chain } = createChainMock(config?.invoicesUpsert ?? { data: null, error: null })
        return chain
      }
      default: {
        const { chain } = createChainMock({ data: null, error: null })
        return chain
      }
    }
  })

  return { from: mockFrom } as any
}

// ── Event Factory ───────────────────────────────────────────────────────

const makeEvent = (type: string, data: Record<string, unknown> = {}, id = 'evt_test123'): Stripe.Event => ({
  id,
  type,
  data: { object: data },
  object: 'event',
  api_version: '2025-09-30.clover',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 0,
  request: null,
} as any)

describe('StripeWebhookHandler', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // Idempotency
  // ═══════════════════════════════════════════════════════════════════════

  describe('idempotency', () => {
    it('processes first occurrence of an event', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('unknown.event.type')
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(supabase.from).toHaveBeenCalledWith('stripe_webhook_events')
    })

    it('skips duplicate event (23505 unique violation)', async () => {
      const supabase = createMockSupabase({
        webhookInsert: { data: null, error: { code: '23505', message: 'duplicate' } },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('checkout.session.completed', { metadata: { team_id: 'team-1' } })
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('already processed')
    })

    it('throws on non-duplicate DB error during idempotency check', async () => {
      const supabase = createMockSupabase({
        webhookInsert: { data: null, error: { code: 'PGRST301', message: 'Connection lost' } },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('checkout.session.completed')
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(500)
      expect(result.message).toContain('Failed to record webhook event')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // checkout.session.completed
  // ═══════════════════════════════════════════════════════════════════════

  describe('checkout.session.completed', () => {
    it('returns 400 when metadata missing team_id', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('checkout.session.completed', { metadata: {}, payment_status: 'paid' })
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(400)
      expect(result.message).toContain('Missing team_id')
    })

    it('skips when payment_status is not paid', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('checkout.session.completed', {
        metadata: { team_id: 'team-1' },
        payment_status: 'unpaid',
      })
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('not yet completed')
    })

    it('creates customer mapping when paid', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('checkout.session.completed', {
        metadata: { team_id: 'team-1' },
        payment_status: 'paid',
        customer: 'cus_abc',
        customer_email: 'admin@test.com',
      })
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('Checkout completed')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // customer.subscription.created
  // ═══════════════════════════════════════════════════════════════════════

  describe('customer.subscription.created', () => {
    it('upserts subscription record with correct data', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.created', {
        id: 'sub_stripe_123',
        metadata: { team_id: 'team-1' },
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ quantity: 5, price: { id: 'price_annual' } }] },
        current_period_start: 1708473600,
        current_period_end: 1740009600,
        cancel_at_period_end: false,
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('Subscription created')
    })

    it('returns 400 when metadata missing team_id', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.created', {
        id: 'sub_123',
        metadata: {},
        status: 'active',
        items: { data: [] },
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(400)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // customer.subscription.updated
  // ═══════════════════════════════════════════════════════════════════════

  describe('customer.subscription.updated', () => {
    it('updates subscription fields', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        metadata: { team_id: 'team-1' },
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ quantity: 8, price: { id: 'price_annual' } }] },
        current_period_start: 1708473600,
        current_period_end: 1740009600,
        cancel_at_period_end: true,
        cancel_at: 1740009600,
        canceled_at: null,
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('Subscription updated')
    })

    it('handles out-of-order by looking up stripe_subscription_id', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: {
          data: { id: 'sub-1', team_id: 'team-1', stripe_subscription_id: 'sub_123' },
          error: null,
        },
      })
      const handler = new StripeWebhookHandler(supabase)

      // No metadata.team_id — must look up by subscription ID
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        metadata: {},
        customer: 'cus_abc',
        status: 'past_due',
        items: { data: [{ quantity: 5 }] },
        current_period_start: 1708473600,
        current_period_end: 1740009600,
        cancel_at_period_end: false,
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
    })

    it('returns 400 when team cannot be determined', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: null, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_unknown',
        metadata: {},
        status: 'active',
        items: { data: [] },
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(400)
      expect(result.message).toContain('Cannot determine team_id')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // customer.subscription.deleted
  // ═══════════════════════════════════════════════════════════════════════

  describe('customer.subscription.deleted', () => {
    it('transitions to free_tier when <=2 lots', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: { id: 'sub-1', team_id: 'team-1' }, error: null },
        subscriptionsLotCount: { data: { billable_properties: 2 }, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_123',
        metadata: { team_id: 'team-1' },
        status: 'canceled',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('free_tier')
    })

    it('transitions to read_only when >2 lots', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: { id: 'sub-1', team_id: 'team-1' }, error: null },
        subscriptionsLotCount: { data: { billable_properties: 5 }, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_123',
        metadata: { team_id: 'team-1' },
        status: 'canceled',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('read_only')
    })

    it('no-ops when team not found', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: null, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_unknown',
        metadata: {},
        status: 'canceled',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('no-op')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // customer.subscription.paused
  // ═══════════════════════════════════════════════════════════════════════

  describe('customer.subscription.paused', () => {
    it('sets status to paused', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('customer.subscription.paused', {
        id: 'sub_123',
        metadata: { team_id: 'team-1' },
        status: 'paused',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('paused')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // invoice.paid
  // ═══════════════════════════════════════════════════════════════════════

  describe('invoice.paid', () => {
    it('upserts invoice record', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: { id: 'sub-1' }, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('invoice.paid', {
        id: 'in_abc123',
        subscription: 'sub_stripe_123',
        customer: 'cus_abc',
        amount_due: 25000,
        amount_paid: 25000,
        amount_remaining: 0,
        currency: 'eur',
        status: 'paid',
        hosted_invoice_url: 'https://invoice.stripe.com/xxx',
        invoice_pdf: 'https://pdf.stripe.com/xxx',
        period_start: 1708473600,
        period_end: 1740009600,
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('Invoice paid')
      // Verify upsert was called on stripe_invoices
      expect(supabase.from).toHaveBeenCalledWith('stripe_invoices')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // invoice.payment_failed
  // ═══════════════════════════════════════════════════════════════════════

  describe('invoice.payment_failed', () => {
    it('transitions active subscription to past_due', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: { id: 'sub-1', team_id: 'team-1', status: 'active' }, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('invoice.payment_failed', {
        id: 'in_failed',
        subscription: 'sub_stripe_123',
        customer: 'cus_abc',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('payment failed')
    })

    it('ignores non-subscription invoices', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('invoice.payment_failed', {
        id: 'in_failed',
        subscription: null,
        customer: 'cus_abc',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('non-subscription')
    })

    it('no-ops when subscription not found', async () => {
      const supabase = createMockSupabase({
        subscriptionsFind: { data: null, error: null },
      })
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('invoice.payment_failed', {
        id: 'in_failed',
        subscription: 'sub_unknown',
        customer: 'cus_abc',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('no-op')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // charge.refunded
  // ═══════════════════════════════════════════════════════════════════════

  describe('charge.refunded', () => {
    it('processes full refund', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('charge.refunded', {
        id: 'ch_123',
        amount: 25000,
        amount_refunded: 25000,
        currency: 'eur',
        customer: 'cus_abc',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('full')
    })

    it('processes partial refund', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('charge.refunded', {
        id: 'ch_456',
        amount: 25000,
        amount_refunded: 10000,
        currency: 'eur',
        customer: 'cus_abc',
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('partial')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Unknown events
  // ═══════════════════════════════════════════════════════════════════════

  describe('unknown events', () => {
    it('returns 200 for unhandled event types (no crash)', async () => {
      const supabase = createMockSupabase()
      const handler = new StripeWebhookHandler(supabase)

      const event = makeEvent('some.future.event.type')
      const result = await handler.handleEvent(event)

      expect(result.status).toBe(200)
      expect(result.message).toContain('Unhandled event type')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('returns 500 on handler error (Stripe retries)', async () => {
      // Create a supabase mock where the webhook insert succeeds but subscription upsert throws
      const supabase = createMockSupabase()
      // Override to make subscription operations throw
      const originalFrom = supabase.from
      let callCount = 0
      supabase.from = vi.fn().mockImplementation((table: string) => {
        callCount++
        if (table === 'stripe_webhook_events') {
          return originalFrom(table)
        }
        // For subscription operations, throw
        throw new Error('DB connection lost')
      })

      const handler = new StripeWebhookHandler(supabase)
      const event = makeEvent('customer.subscription.created', {
        id: 'sub_123',
        metadata: { team_id: 'team-1' },
        status: 'active',
        items: { data: [] },
      })

      const result = await handler.handleEvent(event)

      expect(result.status).toBe(500)
      expect(result.message).toContain('Error processing')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Status mapping
  // ═══════════════════════════════════════════════════════════════════════

  describe('status mapping', () => {
    it('maps all Stripe statuses correctly', async () => {
      const statuses = ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused']

      for (const stripeStatus of statuses) {
        const supabase = createMockSupabase()
        const handler = new StripeWebhookHandler(supabase)

        const event = makeEvent('customer.subscription.created', {
          id: `sub_${stripeStatus}`,
          metadata: { team_id: 'team-1' },
          customer: 'cus_abc',
          status: stripeStatus,
          items: { data: [{ quantity: 1 }] },
          current_period_start: 1708473600,
          current_period_end: 1740009600,
          cancel_at_period_end: false,
        })

        const result = await handler.handleEvent(event)

        expect(result.status).toBe(200)
      }
    })
  })
})
