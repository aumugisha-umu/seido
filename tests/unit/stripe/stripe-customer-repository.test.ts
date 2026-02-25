import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeCustomerRepository } from '@/lib/services/repositories/stripe-customer.repository'

// ============================================================================
// T-003 + US-005: StripeCustomerRepository — all methods
// ~10 test cases
// ============================================================================

const createChainMock = (resolvedValue: unknown = { data: null, error: null }) => {
  const terminal = vi.fn().mockResolvedValue(resolvedValue)
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = terminal
  chain.single = terminal

  return { chain, terminal }
}

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom } as any

describe('StripeCustomerRepository', () => {
  let repo: StripeCustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new StripeCustomerRepository(mockSupabase)
  })

  // ── findByTeamId ──────────────────────────────────────────────────────

  describe('findByTeamId', () => {
    it('returns customer when found', async () => {
      const mockCustomer = {
        id: 'cust-1',
        team_id: 'team-1',
        stripe_customer_id: 'cus_abc123',
        email: 'admin@example.com',
        name: 'Team Alpha',
      }
      const { chain } = createChainMock({ data: mockCustomer, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('team-1')

      expect(mockFrom).toHaveBeenCalledWith('stripe_customers')
      expect(chain.select).toHaveBeenCalledWith('*')
      expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-1')
      expect(chain.limit).toHaveBeenCalledWith(1)
      expect(result.data).toEqual(mockCustomer)
    })

    it('returns null when team has no Stripe customer', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('team-no-customer')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('uses .limit(1).maybeSingle() for multi-team safety', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await repo.findByTeamId('team-1')

      expect(chain.limit).toHaveBeenCalledWith(1)
      // terminal is maybeSingle (from createChainMock)
    })

    it('returns error on DB failure', async () => {
      const dbError = { message: 'Connection lost', code: 'PGRST301' }
      const { chain } = createChainMock({ data: null, error: dbError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('team-1')

      expect(result.error).toEqual(dbError)
    })
  })

  // ── findByStripeCustomerId ────────────────────────────────────────────

  describe('findByStripeCustomerId', () => {
    it('returns customer when Stripe ID exists', async () => {
      const mockCustomer = {
        id: 'cust-1',
        team_id: 'team-1',
        stripe_customer_id: 'cus_abc123',
      }
      const { chain } = createChainMock({ data: mockCustomer, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByStripeCustomerId('cus_abc123')

      expect(chain.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_abc123')
      expect(result.data).toEqual(mockCustomer)
    })

    it('returns null when Stripe ID not found', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByStripeCustomerId('cus_nonexistent')

      expect(result.data).toBeNull()
    })
  })

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('inserts new customer record', async () => {
      const insertData = {
        team_id: 'team-1',
        stripe_customer_id: 'cus_new123',
        email: 'admin@example.com',
        name: 'Team Alpha',
      }
      const created = { id: 'cust-1', ...insertData, created_at: '2026-02-21T00:00:00Z' }
      const { chain } = createChainMock({ data: created, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.create(insertData)

      expect(mockFrom).toHaveBeenCalledWith('stripe_customers')
      expect(chain.insert).toHaveBeenCalledWith(insertData)
      expect(chain.select).toHaveBeenCalled()
      expect(result.data).toEqual(created)
    })

    it('returns error on duplicate stripe_customer_id', async () => {
      const uniqueError = { message: 'duplicate key violation', code: '23505' }
      const { chain } = createChainMock({ data: null, error: uniqueError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.create({
        team_id: 'team-1',
        stripe_customer_id: 'cus_duplicate',
      })

      expect(result.error).toEqual(uniqueError)
      expect(result.data).toBeNull()
    })

    it('returns error on missing required fields', async () => {
      const notNullError = { message: 'not-null constraint', code: '23502' }
      const { chain } = createChainMock({ data: null, error: notNullError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.create({
        team_id: 'team-1',
        stripe_customer_id: undefined as any,
      })

      expect(result.error).toEqual(notNullError)
    })
  })
})
