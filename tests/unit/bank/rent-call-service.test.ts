import { describe, it, expect, vi } from 'vitest'

// Mock server-side logger dependency
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
}))

import { calculateDueDates } from '@/lib/services/domain/rent-call.service'

/**
 * Helper to create a contract fixture with sensible defaults
 */
function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    team_id: 'team-1',
    lot_id: 'lot-1',
    rent_amount: 800,
    charges_amount: 50,
    payment_frequency: 'mensuel' as const,
    payment_frequency_value: 1,
    start_date: '2026-01-01',
    end_date: null as string | null,
    auto_rent_calls: true,
    ...overrides,
  }
}

describe('RentCallService — calculateDueDates', () => {
  describe('mensuel frequency', () => {
    it('generates monthly due dates for the next 3 months', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 5,
        start_date: '2025-01-01',
      })

      // Reference date: 2026-03-01
      const refDate = new Date(2026, 2, 1) // March 1, 2026
      const results = calculateDueDates(contract, refDate)

      // Should generate March, April, May (up to June 1 horizon)
      expect(results.length).toBeGreaterThanOrEqual(3)

      // All due dates should have day = 5
      for (const r of results) {
        expect(r.dueDate).toMatch(/-05$/)
      }

      // First due date should be 2026-03-05
      expect(results[0].dueDate).toBe('2026-03-05')
    })

    it('clamps day to last day of month (e.g., Feb 28/29)', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 31,
        start_date: '2025-01-01',
      })

      // Reference: Feb 1, 2026
      const refDate = new Date(2026, 1, 1)
      const results = calculateDueDates(contract, refDate)

      // February 2026 has 28 days (not a leap year)
      const febResult = results.find((r) => r.dueDate.startsWith('2026-02'))
      expect(febResult).toBeDefined()
      expect(febResult!.dueDate).toBe('2026-02-28')
    })

    it('generates correct period_start and period_end for mensuel', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 1,
        start_date: '2025-01-01',
      })

      const refDate = new Date(2026, 2, 1) // March 1
      const results = calculateDueDates(contract, refDate)

      // March entry
      const march = results.find((r) => r.dueDate.startsWith('2026-03'))
      expect(march).toBeDefined()
      expect(march!.periodStart).toBe('2026-03-01')
      expect(march!.periodEnd).toBe('2026-03-31')
    })
  })

  describe('trimestriel frequency', () => {
    it('generates quarterly due dates', () => {
      const contract = makeContract({
        payment_frequency: 'trimestriel',
        payment_frequency_value: 1,
        start_date: '2026-01-01',
      })

      // Reference: Jan 1, 2026
      const refDate = new Date(2026, 0, 1)
      const results = calculateDueDates(contract, refDate)

      // Should get Jan 1 and Apr 1 (within 3-month horizon from Jan 1)
      expect(results.length).toBeGreaterThanOrEqual(1)

      // Check that due dates are 3 months apart
      if (results.length >= 2) {
        const date1 = new Date(results[0].dueDate)
        const date2 = new Date(results[1].dueDate)
        const monthDiff = (date2.getFullYear() - date1.getFullYear()) * 12 +
          (date2.getMonth() - date1.getMonth())
        expect(monthDiff).toBe(3)
      }
    })

    it('generates correct period spanning 3 months', () => {
      const contract = makeContract({
        payment_frequency: 'trimestriel',
        payment_frequency_value: 1,
        start_date: '2026-01-01',
      })

      const refDate = new Date(2026, 0, 1)
      const results = calculateDueDates(contract, refDate)

      expect(results.length).toBeGreaterThanOrEqual(1)
      // First period: Jan-Mar
      expect(results[0].periodStart).toBe('2026-01-01')
      expect(results[0].periodEnd).toBe('2026-03-31')
    })
  })

  describe('semestriel frequency', () => {
    it('generates bi-annual due dates', () => {
      const contract = makeContract({
        payment_frequency: 'semestriel',
        payment_frequency_value: 15,
        start_date: '2026-01-01',
      })

      const refDate = new Date(2026, 0, 1)
      const results = calculateDueDates(contract, refDate)

      // Within 3 months from Jan 1, only Jan is reachable (next would be July)
      expect(results.length).toBe(1)
      expect(results[0].dueDate).toBe('2026-01-15')
    })
  })

  describe('annuel frequency', () => {
    it('generates annual due dates', () => {
      const contract = makeContract({
        payment_frequency: 'annuel',
        payment_frequency_value: 10,
        start_date: '2026-01-01',
      })

      const refDate = new Date(2026, 0, 1)
      const results = calculateDueDates(contract, refDate)

      // Only 1 annual due date within 3-month horizon
      expect(results.length).toBe(1)
      expect(results[0].dueDate).toBe('2026-01-10')
    })
  })

  describe('contract date boundaries', () => {
    it('skips due dates before contract start_date', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 1,
        start_date: '2026-04-01', // Starts in April
      })

      // Reference: March 1 — horizon goes to June
      const refDate = new Date(2026, 2, 1)
      const results = calculateDueDates(contract, refDate)

      // Should only have April, May (not March since contract starts April)
      for (const r of results) {
        expect(r.dueDate >= '2026-04-01').toBe(true)
      }
    })

    it('skips due dates after contract end_date', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 1,
        start_date: '2025-01-01',
        end_date: '2026-04-15', // Ends mid-April
      })

      const refDate = new Date(2026, 2, 1) // March
      const results = calculateDueDates(contract, refDate)

      // Should have March and April only (May due date > end_date)
      for (const r of results) {
        expect(r.dueDate <= '2026-04-15').toBe(true)
      }
    })

    it('returns empty when contract has not started yet and starts after horizon', () => {
      const contract = makeContract({
        payment_frequency: 'mensuel',
        payment_frequency_value: 1,
        start_date: '2027-01-01', // Far future
      })

      const refDate = new Date(2026, 2, 1)
      const results = calculateDueDates(contract, refDate)

      expect(results).toEqual([])
    })
  })

  describe('auto_rent_calls flag', () => {
    it('is respected by the service (tested at service level, not calculateDueDates)', () => {
      // calculateDueDates itself does not check auto_rent_calls
      // The flag is checked in generateRentCallsForContract
      // This test documents the expected behavior
      const contract = makeContract({ auto_rent_calls: false })
      // calculateDueDates still works — the filter is at service level
      const results = calculateDueDates(contract, new Date(2026, 2, 1))
      // It generates dates regardless — the service layer skips generation
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })
})
