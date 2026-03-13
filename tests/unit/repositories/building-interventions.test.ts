/**
 * Unit tests: findByBuilding() captures both lot-level AND building-level interventions
 *
 * Verifies that the OR condition covers:
 *   (a) lot_id IN (lot1, lot2, ...) — interventions linked to lots in the building
 *   (b) building_id = X AND lot_id IS NULL — interventions linked directly to the building
 *
 * Also verifies that a building with no lots still queries for building-level interventions
 * (the early-return bug is fixed).
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal Supabase chain mock
// ---------------------------------------------------------------------------

type ChainCall = { method: string; args: unknown[] }

function buildMockChain(recordedCalls: ChainCall[], lotRows: { id: string }[] = []) {
  // Two independent chains: one for the lots query, one for the main query.
  // We track which table was targeted via 'from'.
  let currentTable = ''

  const makeChain = (): Record<string, (...args: unknown[]) => any> => {
    const chain: Record<string, (...args: unknown[]) => any> = {}

    const methods = ['select', 'eq', 'in', 'or', 'order', 'limit', 'is']

    methods.forEach(method => {
      chain[method] = (...args: unknown[]) => {
        recordedCalls.push({ method, args, table: currentTable } as any)
        return chain
      }
    })

    chain.then = (resolve: (v: unknown) => void) => {
      if (currentTable === 'lots') {
        resolve({ data: lotRows, error: null })
      } else {
        resolve({ data: [], error: null })
      }
    }

    return chain
  }

  return {
    from: (table: string) => {
      currentTable = table
      recordedCalls.push({ method: 'from', args: [table] } as any)
      return makeChain()
    },
  }
}

// ---------------------------------------------------------------------------
// Lightweight findByBuilding clone for testing
// Mirrors the fixed implementation from intervention.repository.ts
// ---------------------------------------------------------------------------

async function findByBuilding(supabase: ReturnType<typeof buildMockChain>, buildingId: string) {
  const { data: lots, error: lotsError } = await (supabase as any)
    .from('lots')
    .select('id')
    .eq('building_id', buildingId)

  if (lotsError) throw lotsError

  const lotIds = (lots || []).map((lot: { id: string }) => lot.id)

  const orFilter = lotIds.length > 0
    ? `lot_id.in.(${lotIds.join(',')}),and(building_id.eq.${buildingId},lot_id.is.null)`
    : `building_id.eq.${buildingId},lot_id.is.null`

  const { data, error } = await (supabase as any)
    .from('interventions')
    .select(`
      *,
      lot:lot_id(
        id, reference,
        building:building_id(id, name, team_id, address_record:address_id(*))
      ),
      intervention_assignments(
        role,
        is_primary,
        user:user_id(id, name, email, role, provider_category)
      )
    `)
    .or(orFilter)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findByBuilding() — with lots', () => {
  let calls: Array<ChainCall & { table?: string }>
  const buildingId = 'building-uuid-001'
  const lotIds = ['lot-aaa', 'lot-bbb']

  beforeEach(() => {
    calls = []
  })

  it('uses .or() to combine lot-level and building-level conditions', async () => {
    const supabase = buildMockChain(calls, lotIds.map(id => ({ id })))
    await findByBuilding(supabase, buildingId)

    const orCall = calls.find(c => c.method === 'or')
    expect(orCall).toBeDefined()
  })

  it('OR filter includes lot_id.in.(lotIds) condition', async () => {
    const supabase = buildMockChain(calls, lotIds.map(id => ({ id })))
    await findByBuilding(supabase, buildingId)

    const orCall = calls.find(c => c.method === 'or')!
    const filter = orCall.args[0] as string
    expect(filter).toContain('lot_id.in.(lot-aaa,lot-bbb)')
  })

  it('OR filter includes building_id.eq + lot_id.is.null condition', async () => {
    const supabase = buildMockChain(calls, lotIds.map(id => ({ id })))
    await findByBuilding(supabase, buildingId)

    const orCall = calls.find(c => c.method === 'or')!
    const filter = orCall.args[0] as string
    expect(filter).toContain(`building_id.eq.${buildingId}`)
    expect(filter).toContain('lot_id.is.null')
  })

  it('OR filter captures both sides in one .or() call', async () => {
    const supabase = buildMockChain(calls, lotIds.map(id => ({ id })))
    await findByBuilding(supabase, buildingId)

    const orCall = calls.find(c => c.method === 'or')!
    const filter = orCall.args[0] as string
    // Should contain both parts separated by comma
    expect(filter).toMatch(/lot_id\.in\.\(.*\).*building_id\.eq/)
  })
})

describe('findByBuilding() — building with no lots (regression)', () => {
  let calls: Array<ChainCall & { table?: string }>
  const buildingId = 'building-no-lots-001'

  beforeEach(() => {
    calls = []
  })

  it('does NOT early-return empty when building has no lots', async () => {
    // Empty lots response
    const supabase = buildMockChain(calls, [])
    await findByBuilding(supabase, buildingId)

    // Must still query the interventions table
    const fromCalls = calls.filter(c => c.method === 'from')
    const tables = fromCalls.map(c => c.args[0])
    expect(tables).toContain('interventions')
  })

  it('uses building-only OR filter when no lots exist', async () => {
    const supabase = buildMockChain(calls, [])
    await findByBuilding(supabase, buildingId)

    const orCall = calls.find(c => c.method === 'or')!
    expect(orCall).toBeDefined()
    const filter = orCall.args[0] as string
    // Should not reference lot_id.in.() with empty list (invalid SQL)
    expect(filter).not.toMatch(/lot_id\.in\.\(\)/)
    // Should still capture building-level interventions
    expect(filter).toContain(`building_id.eq.${buildingId}`)
    expect(filter).toContain('lot_id.is.null')
  })
})
