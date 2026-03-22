import { describe, it, expect, vi } from 'vitest'

// Mock server-side logger dependency
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
}))

import { calculateRentCallStatus } from '@/lib/services/repositories/rent-call.repository'

describe('RentCallRepository — calculateRentCallStatus', () => {
  it('returns "paid" when total_received >= total_expected', () => {
    expect(calculateRentCallStatus(1000, 1000, '2099-12-31')).toBe('paid')
    expect(calculateRentCallStatus(1500, 1000, '2099-12-31')).toBe('paid')
  })

  it('returns "partial" when total_received > 0 but < total_expected', () => {
    expect(calculateRentCallStatus(500, 1000, '2099-12-31')).toBe('partial')
    expect(calculateRentCallStatus(1, 1000, '2099-12-31')).toBe('partial')
  })

  it('returns "overdue" when total_received is 0 and due_date is in the past', () => {
    expect(calculateRentCallStatus(0, 1000, '2020-01-01')).toBe('overdue')
  })

  it('returns "pending" when total_received is 0 and due_date is in the future', () => {
    expect(calculateRentCallStatus(0, 1000, '2099-12-31')).toBe('pending')
  })

  it('returns "paid" even when due_date is in the past if fully paid', () => {
    expect(calculateRentCallStatus(1000, 1000, '2020-01-01')).toBe('paid')
  })

  it('returns "partial" even when due_date is in the past if partially paid', () => {
    expect(calculateRentCallStatus(500, 1000, '2020-01-01')).toBe('partial')
  })
})

describe('RentCallRepository — batchCreateRentCalls deduplication', () => {
  it('returns inserted count of 0 for empty array', async () => {
    // Import the actual class to test the empty array guard
    const { RentCallRepository } = await import('@/lib/services/repositories/rent-call.repository')

    // Minimal mock — the method returns early before touching supabase
    const mockSupabase = {} as Parameters<typeof RentCallRepository.prototype.batchCreateRentCalls>[0]
    const repo = new RentCallRepository(mockSupabase as never)

    const result = await repo.batchCreateRentCalls([])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.inserted).toBe(0)
    }
  })
})
