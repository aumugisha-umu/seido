import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'

// ============================================================================
// T-002 + US-004: SubscriptionRepository — all CRUD methods
// ~20 test cases
// ============================================================================

// Chainable Supabase mock builder
const createChainMock = (resolvedValue: unknown = { data: null, error: null }) => {
  const terminal = vi.fn().mockResolvedValue(resolvedValue)
  // Chain is also thenable — PostgREST returns a promise after the last filter
  const chain: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve),
  } as any

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = terminal
  chain.single = terminal

  return { chain, terminal }
}

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom } as any

describe('SubscriptionRepository', () => {
  let repo: SubscriptionRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SubscriptionRepository(mockSupabase)
  })

  // ── findByTeamId ──────────────────────────────────────────────────────

  describe('findByTeamId', () => {
    it('returns subscription when found', async () => {
      const mockSub = { id: 'sub-1', team_id: 'team-1', status: 'active' }
      const { chain, terminal } = createChainMock({ data: mockSub, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('team-1')

      expect(mockFrom).toHaveBeenCalledWith('subscriptions')
      expect(chain.select).toHaveBeenCalledWith('*')
      expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-1')
      expect(chain.limit).toHaveBeenCalledWith(1)
      expect(terminal).toHaveBeenCalled() // maybeSingle
      expect(result.data).toEqual(mockSub)
      expect(result.error).toBeNull()
    })

    it('returns null when not found', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('nonexistent')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('uses .limit(1).maybeSingle() not .single()', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await repo.findByTeamId('team-1')

      expect(chain.limit).toHaveBeenCalledWith(1)
      // maybeSingle is the terminal call (confirmed by chain structure)
    })

    it('returns error on DB failure', async () => {
      const dbError = { message: 'Connection failed', code: 'PGRST301' }
      const { chain } = createChainMock({ data: null, error: dbError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByTeamId('team-1')

      expect(result.error).toEqual(dbError)
    })
  })

  // ── findByStripeSubscriptionId ────────────────────────────────────────

  describe('findByStripeSubscriptionId', () => {
    it('queries by stripe_subscription_id', async () => {
      const mockSub = { id: 'sub-1', stripe_subscription_id: 'sub_stripe_123' }
      const { chain } = createChainMock({ data: mockSub, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByStripeSubscriptionId('sub_stripe_123')

      expect(chain.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_stripe_123')
      expect(result.data).toEqual(mockSub)
    })

    it('returns null when not found', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.findByStripeSubscriptionId('sub_nonexistent')

      expect(result.data).toBeNull()
    })
  })

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('inserts with correct data and returns created record', async () => {
      const insertData = {
        team_id: 'team-1',
        status: 'trialing' as const,
        trial_start: '2026-02-21T00:00:00Z',
        trial_end: '2026-03-23T00:00:00Z',
      }
      const created = { id: 'sub-1', ...insertData }
      const { chain } = createChainMock({ data: created, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.create(insertData)

      expect(mockFrom).toHaveBeenCalledWith('subscriptions')
      expect(chain.insert).toHaveBeenCalledWith(insertData)
      expect(chain.select).toHaveBeenCalled()
      expect(result.data).toEqual(created)
    })

    it('returns error on unique constraint violation', async () => {
      const uniqueError = { message: 'duplicate key', code: '23505' }
      const { chain } = createChainMock({ data: null, error: uniqueError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.create({ team_id: 'team-1', status: 'trialing' as const })

      expect(result.error).toEqual(uniqueError)
    })
  })

  // ── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates by primary key id', async () => {
      const updateData = { status: 'active' as const }
      const updated = { id: 'sub-1', team_id: 'team-1', status: 'active' }
      const { chain } = createChainMock({ data: updated, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.update('sub-1', updateData)

      expect(chain.update).toHaveBeenCalledWith(updateData)
      expect(chain.eq).toHaveBeenCalledWith('id', 'sub-1')
      expect(result.data).toEqual(updated)
    })

    it('allows partial updates', async () => {
      const { chain } = createChainMock({ data: {}, error: null })
      mockFrom.mockReturnValue(chain)

      await repo.update('sub-1', { cancel_at_period_end: true })

      expect(chain.update).toHaveBeenCalledWith({ cancel_at_period_end: true })
    })
  })

  // ── updateByTeamId ────────────────────────────────────────────────────

  describe('updateByTeamId', () => {
    it('updates by team_id', async () => {
      const updateData = { status: 'read_only' as const }
      const updated = { id: 'sub-1', team_id: 'team-1', status: 'read_only' }
      const { chain } = createChainMock({ data: updated, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.updateByTeamId('team-1', updateData)

      expect(chain.update).toHaveBeenCalledWith(updateData)
      expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-1')
      expect(result.data).toEqual(updated)
    })

    it('returns null when team has no subscription', async () => {
      const { chain } = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.updateByTeamId('nonexistent', { status: 'canceled' as const })

      expect(result.data).toBeNull()
    })
  })

  // ── upsertByTeamId ────────────────────────────────────────────────────

  describe('upsertByTeamId', () => {
    it('upserts with onConflict team_id', async () => {
      const upsertData = {
        team_id: 'team-1',
        stripe_subscription_id: 'sub_stripe_new',
        status: 'active' as const,
      }
      const upserted = { id: 'sub-1', ...upsertData }
      const { chain } = createChainMock({ data: upserted, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.upsertByTeamId('team-1', upsertData)

      expect(chain.upsert).toHaveBeenCalledWith(
        { ...upsertData, team_id: 'team-1' },
        { onConflict: 'team_id' }
      )
      expect(result.data).toEqual(upserted)
    })

    it('replaces existing subscription on conflict', async () => {
      const { chain } = createChainMock({ data: { id: 'sub-1' }, error: null })
      mockFrom.mockReturnValue(chain)

      await repo.upsertByTeamId('team-1', {
        team_id: 'team-1',
        stripe_subscription_id: 'sub_updated',
        status: 'active' as const,
      })

      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_subscription_id: 'sub_updated' }),
        { onConflict: 'team_id' }
      )
    })
  })

  // ── getLotCount ────────────────────────────────────────────────────────

  describe('getLotCount', () => {
    it('returns live lot count from lots table', async () => {
      // getLotCount now queries lots table with count: exact, head: true
      const { chain } = createChainMock({ count: 12, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.getLotCount('team-1')

      expect(mockFrom).toHaveBeenCalledWith('lots')
      expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
      expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-1')
      expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(result.data).toBe(12)
    })

    it('returns 0 when no lots exist', async () => {
      const { chain } = createChainMock({ count: 0, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.getLotCount('nonexistent')

      expect(result.data).toBe(0)
    })

    it('returns 0 when count is null', async () => {
      const { chain } = createChainMock({ count: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.getLotCount('team-1')

      expect(result.data).toBe(0)
    })

    it('returns 0 with error on DB failure', async () => {
      const dbError = { message: 'Query timeout' }
      const { chain } = createChainMock({ count: null, error: dbError })
      mockFrom.mockReturnValue(chain)

      const result = await repo.getLotCount('team-1')

      expect(result.data).toBe(0)
      expect(result.error).toEqual(dbError)
    })
  })
})
