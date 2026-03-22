/**
 * Unit tests for BankTransactionRepository
 * Tests mapping logic, filter application, and status update behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Mock parseTinkAmount
vi.mock('@/lib/types/bank.types', () => ({
  parseTinkAmount: vi.fn((value: { unscaledValue: string | number; scale: string | number }) => {
    return Number(value.unscaledValue) / Math.pow(10, Number(value.scale))
  }),
}))

import { BankTransactionRepository, mapTinkTransactionToRow } from '@/lib/services/repositories/bank-transaction.repository'
import type { TinkTransaction } from '@/lib/types/bank.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockTinkTransaction(overrides: Partial<TinkTransaction> = {}): TinkTransaction {
  return {
    id: 'tink-tx-001',
    accountId: 'acc-001',
    amount: {
      currencyCode: 'EUR',
      value: { unscaledValue: '15000', scale: '2' },
    },
    dates: { booked: '2026-03-15', value: '2026-03-14' },
    descriptions: {
      original: 'LOYER MARS 2026',
      display: 'Loyer Mars',
      detailed: { unstructured: 'Loyer appartement 3B Mars 2026' },
    },
    status: 'BOOKED',
    reference: 'REF-123',
    counterparties: {
      payer: {
        name: 'Jean Dupont',
        identifiers: { financialInstitution: { accountNumber: 'BE68539007547034' } },
      },
      payee: {
        name: 'SCI Immo',
        identifiers: { financialInstitution: { accountNumber: 'BE71096123456769' } },
      },
    },
    merchantInformation: {
      merchantName: 'Virement',
      merchantCategoryCode: '6513',
    },
    identifiers: { providerTransactionId: 'prov-tx-001' },
    ...overrides,
  }
}

/**
 * Creates a chainable mock Supabase query builder.
 * Each chained method returns `this` so filters can be composed.
 */
function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}

  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'or', 'order', 'range', 'limit', 'single',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnThis()
  }

  // Terminal methods resolve the query
  builder.single = vi.fn().mockResolvedValue(resolvedValue)

  // For queries that don't end with .single()
  builder.range = vi.fn().mockImplementation(function () {
    return { ...resolvedValue, then: (cb: (v: unknown) => void) => cb(resolvedValue) }
  })

  // Make select return the builder but also be thenable for terminal queries
  const originalSelect = builder.select
  builder.select = vi.fn().mockImplementation((...args: unknown[]) => {
    originalSelect(...args)
    // If called with count option, the final resolution includes count
    return builder
  })

  return builder
}

function createMockSupabase(queryBuilder: ReturnType<typeof createMockQueryBuilder>) {
  return {
    from: vi.fn().mockReturnValue(queryBuilder),
  }
}

// ---------------------------------------------------------------------------
// Tests: mapTinkTransactionToRow
// ---------------------------------------------------------------------------

describe('mapTinkTransactionToRow', () => {
  it('should map all Tink fields to database columns', () => {
    const tx = createMockTinkTransaction()
    const row = mapTinkTransactionToRow(tx, 'team-001', 'conn-001')

    expect(row.team_id).toBe('team-001')
    expect(row.bank_connection_id).toBe('conn-001')
    expect(row.tink_transaction_id).toBe('tink-tx-001')
    expect(row.transaction_date).toBe('2026-03-15')
    expect(row.value_date).toBe('2026-03-14')
    expect(row.amount).toBe(150) // 15000 / 10^2
    expect(row.currency).toBe('EUR')
    expect(row.description_original).toBe('LOYER MARS 2026')
    expect(row.description_display).toBe('Loyer Mars')
    expect(row.description_detailed).toBe('Loyer appartement 3B Mars 2026')
    expect(row.payer_name).toBe('Jean Dupont')
    expect(row.payer_account_number).toBe('BE68539007547034')
    expect(row.payee_name).toBe('SCI Immo')
    expect(row.payee_account_number).toBe('BE71096123456769')
    expect(row.reference).toBe('REF-123')
    expect(row.tink_status).toBe('BOOKED')
    expect(row.merchant_name).toBe('Virement')
    expect(row.merchant_category_code).toBe('6513')
    expect(row.provider_transaction_id).toBe('prov-tx-001')
    expect(row.status).toBe('to_reconcile')
  })

  it('should handle missing optional fields with null', () => {
    const tx = createMockTinkTransaction({
      dates: { booked: '2026-03-15' }, // no value date
      descriptions: { original: 'Test' }, // no display/detailed
      reference: undefined,
      counterparties: undefined,
      merchantInformation: undefined,
      identifiers: undefined,
    })
    const row = mapTinkTransactionToRow(tx, 'team-001', 'conn-001')

    expect(row.value_date).toBeNull()
    expect(row.description_display).toBeNull()
    expect(row.description_detailed).toBeNull()
    expect(row.payer_name).toBeNull()
    expect(row.payer_account_number).toBeNull()
    expect(row.payee_name).toBeNull()
    expect(row.payee_account_number).toBeNull()
    expect(row.reference).toBeNull()
    expect(row.merchant_name).toBeNull()
    expect(row.merchant_category_code).toBeNull()
    expect(row.provider_transaction_id).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: getTransactionsByTeam filter application
// ---------------------------------------------------------------------------

describe('BankTransactionRepository.getTransactionsByTeam', () => {
  let queryBuilder: ReturnType<typeof createMockQueryBuilder>
  let repo: BankTransactionRepository

  beforeEach(() => {
    queryBuilder = createMockQueryBuilder({ data: [], error: null, count: 0 })

    // Override range to return a proper thenable with count
    queryBuilder.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })

    const mockSupabase = createMockSupabase(queryBuilder)
    repo = new BankTransactionRepository(mockSupabase as unknown as import('@supabase/supabase-js').SupabaseClient)
  })

  it('should apply status filter when provided', async () => {
    await repo.getTransactionsByTeam('team-001', { status: 'reconciled' })

    // eq called for team_id and status
    expect(queryBuilder.eq).toHaveBeenCalledWith('team_id', 'team-001')
    expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'reconciled')
  })

  it('should apply bankConnectionId filter when provided', async () => {
    await repo.getTransactionsByTeam('team-001', { bankConnectionId: 'conn-001' })

    expect(queryBuilder.eq).toHaveBeenCalledWith('bank_connection_id', 'conn-001')
  })

  it('should apply date range filters when provided', async () => {
    await repo.getTransactionsByTeam('team-001', {
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
    })

    expect(queryBuilder.gte).toHaveBeenCalledWith('transaction_date', '2026-01-01')
    expect(queryBuilder.lte).toHaveBeenCalledWith('transaction_date', '2026-03-31')
  })

  it('should apply amount range filters when provided', async () => {
    await repo.getTransactionsByTeam('team-001', {
      amountMin: 100,
      amountMax: 500,
    })

    expect(queryBuilder.gte).toHaveBeenCalledWith('amount', 100)
    expect(queryBuilder.lte).toHaveBeenCalledWith('amount', 500)
  })

  it('should apply search filter with OR across relevant columns', async () => {
    await repo.getTransactionsByTeam('team-001', { search: 'loyer' })

    expect(queryBuilder.or).toHaveBeenCalledWith(
      'description_original.ilike.%loyer%,payer_name.ilike.%loyer%,payee_name.ilike.%loyer%,reference.ilike.%loyer%'
    )
  })

  it('should not apply search filter for empty search string', async () => {
    await repo.getTransactionsByTeam('team-001', { search: '' })

    expect(queryBuilder.or).not.toHaveBeenCalled()
  })

  it('should apply pagination with correct range', async () => {
    await repo.getTransactionsByTeam('team-001', { page: 3, pageSize: 20 })

    // page 3 with pageSize 20: offset = 40, range = [40, 59]
    expect(queryBuilder.range).toHaveBeenCalledWith(40, 59)
  })

  it('should use default pagination when not specified', async () => {
    await repo.getTransactionsByTeam('team-001', {})

    // Default: page 1, pageSize 50 → range [0, 49]
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 49)
  })
})

// ---------------------------------------------------------------------------
// Tests: updateStatus
// ---------------------------------------------------------------------------

describe('BankTransactionRepository.updateStatus', () => {
  let queryBuilder: ReturnType<typeof createMockQueryBuilder>
  let repo: BankTransactionRepository

  beforeEach(() => {
    queryBuilder = createMockQueryBuilder({
      data: { id: 'tx-001', status: 'reconciled' },
      error: null,
    })
    const mockSupabase = createMockSupabase(queryBuilder)
    repo = new BankTransactionRepository(mockSupabase as unknown as import('@supabase/supabase-js').SupabaseClient)
  })

  it('should set reconciled_at and reconciled_by when status is reconciled', async () => {
    await repo.updateStatus('tx-001', 'reconciled', 'user-001')

    expect(queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reconciled',
        reconciled_by: 'user-001',
        ignored_at: null,
        ignored_by: null,
      })
    )
    // reconciled_at should be an ISO date string
    const updateArg = queryBuilder.update.mock.calls[0][0]
    expect(updateArg.reconciled_at).toBeTruthy()
    expect(typeof updateArg.reconciled_at).toBe('string')
  })

  it('should set ignored_at and ignored_by when status is ignored', async () => {
    await repo.updateStatus('tx-001', 'ignored', 'user-001')

    expect(queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ignored',
        ignored_by: 'user-001',
        reconciled_at: null,
        reconciled_by: null,
      })
    )
    const updateArg = queryBuilder.update.mock.calls[0][0]
    expect(updateArg.ignored_at).toBeTruthy()
  })

  it('should clear both reconciled and ignored fields when status is to_reconcile', async () => {
    await repo.updateStatus('tx-001', 'to_reconcile', 'user-001')

    expect(queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'to_reconcile',
        reconciled_at: null,
        reconciled_by: null,
        ignored_at: null,
        ignored_by: null,
      })
    )
  })
})
