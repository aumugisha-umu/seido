/**
 * Transaction Link Repository - Unit Tests
 * Tests FK mapping logic and soft unlink behavior with mocked Supabase.
 */

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import type { CreateTransactionLinkDTO } from '@/lib/types/bank.types'
import { TransactionLinkRepository } from '@/lib/services/repositories/transaction-link.repository'

// ============================================================================
// MOCK SUPABASE
// ============================================================================

function createMockSupabase(response: { data?: unknown; error?: unknown }) {
  const chainable = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
  }

  return {
    from: vi.fn().mockReturnValue(chainable),
    _chain: chainable,
  }
}

// ============================================================================
// createLink — FK mapping
// ============================================================================

describe('TransactionLinkRepository', () => {
  describe('createLink', () => {
    const baseDTO: CreateTransactionLinkDTO = {
      team_id: 'team-001',
      bank_transaction_id: 'tx-001',
      entity_type: 'rent_call',
      rent_call_id: 'rc-001',
      match_method: 'manual',
      linked_by: 'user-001',
    }

    it('sets rent_call_id FK when entity_type is rent_call', async () => {
      const mockResponse = { data: { id: 'link-001', ...baseDTO }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(baseDTO)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.rent_call_id).toBe('rc-001')
      expect(insertCall.intervention_id).toBeNull()
      expect(insertCall.supplier_contract_id).toBeNull()
      expect(insertCall.property_expense_id).toBeNull()
      expect(insertCall.security_deposit_id).toBeNull()
    })

    it('sets intervention_id FK when entity_type is intervention', async () => {
      const dto: CreateTransactionLinkDTO = {
        ...baseDTO,
        entity_type: 'intervention',
        rent_call_id: undefined,
        intervention_id: 'int-001',
      }
      const mockResponse = { data: { id: 'link-002', ...dto }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(dto)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.intervention_id).toBe('int-001')
      expect(insertCall.rent_call_id).toBeNull()
      expect(insertCall.supplier_contract_id).toBeNull()
    })

    it('sets supplier_contract_id FK when entity_type is supplier_contract', async () => {
      const dto: CreateTransactionLinkDTO = {
        ...baseDTO,
        entity_type: 'supplier_contract',
        rent_call_id: undefined,
        supplier_contract_id: 'sc-001',
      }
      const mockResponse = { data: { id: 'link-003', ...dto }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(dto)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.supplier_contract_id).toBe('sc-001')
      expect(insertCall.rent_call_id).toBeNull()
      expect(insertCall.intervention_id).toBeNull()
    })

    it('sets property_expense_id FK when entity_type is property_expense', async () => {
      const dto: CreateTransactionLinkDTO = {
        ...baseDTO,
        entity_type: 'property_expense',
        rent_call_id: undefined,
        property_expense_id: 'pe-001',
      }
      const mockResponse = { data: { id: 'link-004', ...dto }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(dto)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.property_expense_id).toBe('pe-001')
      expect(insertCall.rent_call_id).toBeNull()
    })

    it('sets security_deposit_id FK when entity_type is security_deposit', async () => {
      const dto: CreateTransactionLinkDTO = {
        ...baseDTO,
        entity_type: 'security_deposit',
        rent_call_id: undefined,
        security_deposit_id: 'sd-001',
      }
      const mockResponse = { data: { id: 'link-005', ...dto }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(dto)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.security_deposit_id).toBe('sd-001')
      expect(insertCall.rent_call_id).toBeNull()
    })

    it('nullifies unrelated FKs even if provided in DTO', async () => {
      const dto: CreateTransactionLinkDTO = {
        ...baseDTO,
        entity_type: 'rent_call',
        rent_call_id: 'rc-001',
        intervention_id: 'SHOULD-BE-NULLIFIED',
        supplier_contract_id: 'SHOULD-BE-NULLIFIED',
      }
      const mockResponse = { data: { id: 'link-006', ...dto }, error: null }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      await repo.createLink(dto)

      const insertCall = supabase._chain.insert.mock.calls[0][0]
      expect(insertCall.rent_call_id).toBe('rc-001')
      expect(insertCall.intervention_id).toBeNull()
      expect(insertCall.supplier_contract_id).toBeNull()
    })

    it('throws on Supabase error', async () => {
      const supabase = createMockSupabase({ data: null, error: { message: 'DB error' } })
      const repo = new TransactionLinkRepository(supabase as never)

      await expect(repo.createLink(baseDTO)).rejects.toEqual({ message: 'DB error' })
    })
  })

  // ============================================================================
  // unlinkTransaction
  // ============================================================================

  describe('unlinkTransaction', () => {
    it('calls update with unlinked_at and unlinked_by', async () => {
      const mockResponse = {
        data: { id: 'link-001', unlinked_at: '2026-03-21T00:00:00Z', unlinked_by: 'user-001' },
        error: null,
      }
      const supabase = createMockSupabase(mockResponse)
      const repo = new TransactionLinkRepository(supabase as never)

      const result = await repo.unlinkTransaction('link-001', 'user-001')

      expect(supabase._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          unlinked_by: 'user-001',
          unlinked_at: expect.any(String),
        })
      )
      expect(result.unlinked_by).toBe('user-001')
      expect(result.unlinked_at).toBeTruthy()
    })

    it('throws on Supabase error', async () => {
      const supabase = createMockSupabase({ data: null, error: { message: 'Not found' } })
      const repo = new TransactionLinkRepository(supabase as never)

      await expect(repo.unlinkTransaction('bad-id', 'user-001')).rejects.toEqual({ message: 'Not found' })
    })
  })
})
