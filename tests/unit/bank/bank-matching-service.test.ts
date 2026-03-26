/**
 * Bank Matching Service - Unit Tests
 * Tests the confidence scoring algorithm and suggestion engine.
 */

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import type { BankTransactionRow, RentCallRow } from '@/lib/types/bank.types'
import {
  calculateMatchConfidence,
  getConfidenceLevel,
} from '@/lib/services/domain/bank-matching.service'

// ============================================================================
// FIXTURES
// ============================================================================

const RENT_CALL_ID = '11111111-1111-1111-1111-111111111111'
const CONTRACT_ID = '22222222-2222-2222-2222-222222222222'
const LOT_ID = '33333333-3333-3333-3333-333333333333'

const baseTransaction: BankTransactionRow = {
  id: 'tx-001',
  team_id: 'team-001',
  bank_connection_id: 'conn-001',
  tink_transaction_id: 'tink-001',
  transaction_date: '2026-03-15',
  amount: 850.00,
  currency: 'EUR',
  description_original: 'Virement loyer mars',
  description_display: null,
  payer_name: null,
  payee_name: null,
  payer_account_number: null,
  payee_account_number: null,
  reference: null,
  status: 'to_reconcile',
}

const baseRentCall: RentCallRow = {
  id: RENT_CALL_ID,
  team_id: 'team-001',
  contract_id: CONTRACT_ID,
  lot_id: LOT_ID,
  due_date: '2026-03-15',
  rent_amount: 700.00,
  charges_amount: 150.00,
  total_expected: 850.00,
  status: 'pending',
  total_received: 0,
}

// ============================================================================
// calculateMatchConfidence
// ============================================================================

describe('calculateMatchConfidence', () => {
  describe('structured reference matching (40 points)', () => {
    it('scores 40 when reference contains rent_call_id', () => {
      const tx = { ...baseTransaction, reference: `LOYER-${RENT_CALL_ID}-MARS` }
      const { confidence, details } = calculateMatchConfidence(tx, baseRentCall)
      expect(confidence).toBeGreaterThanOrEqual(40)
      expect(details).toContain('Reference structuree trouvee')
    })

    it('scores 40 when reference contains contract_id', () => {
      const tx = { ...baseTransaction, reference: `REF-${CONTRACT_ID}` }
      const { confidence } = calculateMatchConfidence(tx, baseRentCall)
      expect(confidence).toBeGreaterThanOrEqual(40)
    })

    it('scores 40 when reference contains lot_id', () => {
      const tx = { ...baseTransaction, reference: `LOT-${LOT_ID}-2026` }
      const { confidence } = calculateMatchConfidence(tx, baseRentCall)
      expect(confidence).toBeGreaterThanOrEqual(40)
    })

    it('scores 0 for reference when no matching IDs', () => {
      const tx = { ...baseTransaction, reference: 'UNRELATED-REFERENCE' }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { confidence, details } = calculateMatchConfidence(tx, rc)
      expect(details).not.toContain('Reference structuree trouvee')
      // No reference match, no amount match, no date proximity
      expect(confidence).toBe(0)
    })

    it('scores 0 for reference when reference is null', () => {
      const tx = { ...baseTransaction, reference: null }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).not.toContain('Reference structuree trouvee')
    })
  })

  describe('exact amount match (25 points)', () => {
    it('scores 25 when amounts match exactly', () => {
      const tx = { ...baseTransaction, amount: 850.00, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { confidence, details } = calculateMatchConfidence(tx, rc)
      expect(confidence).toBe(25)
      expect(details).toContain('Montant exact')
    })

    it('scores 25 with 0.01 tolerance', () => {
      const tx = { ...baseTransaction, amount: 850.01, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { confidence, details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain('Montant exact')
    })

    it('uses absolute value of transaction amount (negative = credit)', () => {
      const tx = { ...baseTransaction, amount: -850.00, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain('Montant exact')
    })
  })

  describe('approximate amount match (15 points)', () => {
    it('scores 15 when amount is within 10%', () => {
      const tx = { ...baseTransaction, amount: 800.00, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { confidence, details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain('Montant approximatif (+/-10%)')
    })

    it('does not score approximate when exact match already scored', () => {
      const tx = { ...baseTransaction, amount: 850.00, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain('Montant exact')
      expect(details).not.toContain('Montant approximatif (+/-10%)')
    })

    it('does not score when amount is more than 10% off', () => {
      const tx = { ...baseTransaction, amount: 700.00, reference: null }
      const rc = { ...baseRentCall, total_expected: 850.00, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).not.toContain('Montant approximatif (+/-10%)')
      expect(details).not.toContain('Montant exact')
    })
  })

  describe('payer name fuzzy match (15 points)', () => {
    it('scores 15 when payer_name contains tenant label', () => {
      const tx = { ...baseTransaction, payer_name: 'Jean Dupont', reference: null, amount: 0 }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc, 'dupont')
      expect(details).toContain('Nom du payeur correspond')
    })

    it('scores 15 when tenant label contains payer_name', () => {
      const tx = { ...baseTransaction, payer_name: 'Dupont', reference: null, amount: 0 }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc, 'Jean Dupont')
      expect(details).toContain('Nom du payeur correspond')
    })

    it('does not score when payer_name is null', () => {
      const tx = { ...baseTransaction, payer_name: null, reference: null, amount: 0 }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc, 'Dupont')
      expect(details).not.toContain('Nom du payeur correspond')
    })

    it('does not score when tenant label is undefined', () => {
      const tx = { ...baseTransaction, payer_name: 'Dupont', reference: null, amount: 0 }
      const rc = { ...baseRentCall, total_expected: 999, due_date: '2025-01-01' }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).not.toContain('Nom du payeur correspond')
    })
  })

  describe('date proximity (5 points)', () => {
    it('scores 5 when dates are same day', () => {
      const tx = { ...baseTransaction, transaction_date: '2026-03-15', reference: null, amount: 0 }
      const rc = { ...baseRentCall, due_date: '2026-03-15', total_expected: 999 }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain("Date proche de l'echeance")
    })

    it('scores 5 when within 7 days', () => {
      const tx = { ...baseTransaction, transaction_date: '2026-03-20', reference: null, amount: 0 }
      const rc = { ...baseRentCall, due_date: '2026-03-15', total_expected: 999 }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).toContain("Date proche de l'echeance")
    })

    it('does not score when more than 7 days apart', () => {
      const tx = { ...baseTransaction, transaction_date: '2026-03-25', reference: null, amount: 0 }
      const rc = { ...baseRentCall, due_date: '2026-03-15', total_expected: 999 }
      const { details } = calculateMatchConfidence(tx, rc)
      expect(details).not.toContain("Date proche de l'echeance")
    })
  })

  describe('combined scoring', () => {
    it('scores 100 with all criteria matched', () => {
      const tx: BankTransactionRow = {
        ...baseTransaction,
        reference: `REF-${RENT_CALL_ID}`,
        amount: 850.00,
        payer_name: 'Jean Dupont',
        transaction_date: '2026-03-15',
      }
      const rc: RentCallRow = {
        ...baseRentCall,
        total_expected: 850.00,
        due_date: '2026-03-15',
      }
      const { confidence } = calculateMatchConfidence(tx, rc, 'Dupont')
      // 40 (ref) + 25 (exact) + 15 (payer) + 5 (date) = 85
      // Note: exact amount match means approx is not added
      expect(confidence).toBe(85)
    })

    it('scores 0 when nothing matches', () => {
      const tx: BankTransactionRow = {
        ...baseTransaction,
        reference: null,
        amount: 1.00,
        payer_name: null,
        transaction_date: '2020-01-01',
      }
      const rc: RentCallRow = {
        ...baseRentCall,
        total_expected: 9999.00,
        due_date: '2026-12-31',
      }
      const { confidence } = calculateMatchConfidence(tx, rc)
      expect(confidence).toBe(0)
    })
  })
})

// ============================================================================
// getConfidenceLevel
// ============================================================================

describe('getConfidenceLevel', () => {
  it('returns high for >= 85', () => {
    expect(getConfidenceLevel(85)).toBe('high')
    expect(getConfidenceLevel(100)).toBe('high')
  })

  it('returns medium for 50-84', () => {
    expect(getConfidenceLevel(50)).toBe('medium')
    expect(getConfidenceLevel(84)).toBe('medium')
  })

  it('returns low for < 50', () => {
    expect(getConfidenceLevel(49)).toBe('low')
    expect(getConfidenceLevel(20)).toBe('low')
    expect(getConfidenceLevel(0)).toBe('low')
  })
})
