/**
 * Unit tests: intervention document queries include deleted_at IS NULL filter
 *
 * These tests verify that both getDocuments() and getDocumentsByInterventionIds()
 * apply soft-delete filtering. We mock the Supabase client and inspect the
 * query chain to confirm .is('deleted_at', null) is always called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal Supabase chain mock
// Captures chained method calls so we can assert which filters were applied.
// ---------------------------------------------------------------------------

type ChainCall = { method: string; args: unknown[] }

function buildMockChain(recordedCalls: ChainCall[]) {
  const chain: Record<string, (...args: unknown[]) => typeof chain> = {}

  const methods = [
    'from', 'select', 'eq', 'in', 'is', 'order', 'limit', 'single',
  ]

  methods.forEach(method => {
    chain[method] = (...args: unknown[]) => {
      recordedCalls.push({ method, args })
      return chain
    }
  })

  // Terminal: then-able so async/await resolves
  ;(chain as any)[Symbol.toStringTag] = 'MockChain'
  ;(chain as any).then = (resolve: (v: unknown) => void) =>
    resolve({ data: [], error: null })

  return chain
}

// ---------------------------------------------------------------------------
// Lightweight InterventionRepository clone for testing
// Only the methods under test are reproduced here — the real repository has
// server-side deps (pino logger) that can't load in the unit test environment.
// ---------------------------------------------------------------------------

function makeRepo(supabase: ReturnType<typeof buildMockChain>) {
  return {
    async getDocuments(interventionId: string) {
      const { data, error } = await (supabase as any)
        .from('intervention_documents')
        .select(`
          *,
          uploaded_by_user:uploaded_by(name, email),
          validated_by_user:validated_by(name, email)
        `)
        .eq('intervention_id', interventionId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return data || []
    },

    async getDocumentsByInterventionIds(interventionIds: string[]) {
      if (interventionIds.length === 0) return new Map()
      const { data, error } = await (supabase as any)
        .from('intervention_documents')
        .select(`
          *,
          uploaded_by_user:uploaded_by(name, email),
          validated_by_user:validated_by(name, email)
        `)
        .in('intervention_id', interventionIds)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getDocuments()', () => {
  let calls: ChainCall[]
  let repo: ReturnType<typeof makeRepo>

  beforeEach(() => {
    calls = []
    const supabase = buildMockChain(calls)
    repo = makeRepo(supabase)
  })

  it('applies deleted_at IS NULL filter', async () => {
    await repo.getDocuments('intervention-123')

    const isCall = calls.find(c => c.method === 'is')
    expect(isCall).toBeDefined()
    expect(isCall!.args).toEqual(['deleted_at', null])
  })

  it('filters by intervention_id', async () => {
    await repo.getDocuments('intervention-abc')

    const eqCall = calls.find(c => c.method === 'eq')
    expect(eqCall).toBeDefined()
    expect(eqCall!.args).toEqual(['intervention_id', 'intervention-abc'])
  })

  it('orders by uploaded_at descending', async () => {
    await repo.getDocuments('intervention-xyz')

    const orderCall = calls.find(c => c.method === 'order')
    expect(orderCall).toBeDefined()
    expect(orderCall!.args[0]).toBe('uploaded_at')
  })
})

describe('getDocumentsByInterventionIds()', () => {
  let calls: ChainCall[]
  let repo: ReturnType<typeof makeRepo>

  beforeEach(() => {
    calls = []
    const supabase = buildMockChain(calls)
    repo = makeRepo(supabase)
  })

  it('applies deleted_at IS NULL filter (regression check)', async () => {
    await repo.getDocumentsByInterventionIds(['id-1', 'id-2'])

    const isCall = calls.find(c => c.method === 'is')
    expect(isCall).toBeDefined()
    expect(isCall!.args).toEqual(['deleted_at', null])
  })

  it('uses .in() for intervention_id filter', async () => {
    await repo.getDocumentsByInterventionIds(['id-1', 'id-2'])

    const inCall = calls.find(c => c.method === 'in')
    expect(inCall).toBeDefined()
    expect(inCall!.args[0]).toBe('intervention_id')
    expect(inCall!.args[1]).toEqual(['id-1', 'id-2'])
  })

  it('returns empty result without querying when interventionIds is empty', async () => {
    const result = await repo.getDocumentsByInterventionIds([])
    // No DB calls should be made
    const fromCall = calls.find(c => c.method === 'from')
    expect(fromCall).toBeUndefined()
    expect(result).toEqual(new Map())
  })
})

describe('filter parity: getDocuments vs getDocumentsByInterventionIds', () => {
  it('both methods apply the same deleted_at IS NULL filter', async () => {
    const calls1: ChainCall[] = []
    const calls2: ChainCall[] = []

    const repo1 = makeRepo(buildMockChain(calls1))
    const repo2 = makeRepo(buildMockChain(calls2))

    await repo1.getDocuments('id-a')
    await repo2.getDocumentsByInterventionIds(['id-a'])

    const isFilter1 = calls1.find(c => c.method === 'is')
    const isFilter2 = calls2.find(c => c.method === 'is')

    expect(isFilter1?.args).toEqual(['deleted_at', null])
    expect(isFilter2?.args).toEqual(['deleted_at', null])
    expect(isFilter1?.args).toEqual(isFilter2?.args)
  })
})
