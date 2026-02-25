/**
 * Unit tests for quote status badge utilities
 * @see lib/utils/quote-status.ts
 */

import { describe, it, expect } from 'vitest'
import {
  getQuoteBadgeStatus,
  getQuoteBadgeLabel,
  getQuoteBadgeColor,
  getQuoteCounts,
  hasActiveQuoteProcess,
} from '@/lib/utils/quote-status'

describe('getQuoteBadgeStatus', () => {
  it('returns null for undefined quotes', () => {
    expect(getQuoteBadgeStatus(undefined)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(getQuoteBadgeStatus([])).toBeNull()
  })

  it('returns "validated" when any quote is accepted', () => {
    const quotes = [
      { status: 'pending' },
      { status: 'accepted' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('validated')
  })

  it('returns "received" when quote is sent but none accepted', () => {
    const quotes = [
      { status: 'pending' },
      { status: 'sent' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('received')
  })

  it('returns "requested" when only pending quotes', () => {
    const quotes = [{ status: 'pending' }]
    expect(getQuoteBadgeStatus(quotes)).toBe('requested')
  })

  it('returns "rejected" only when ALL quotes are rejected', () => {
    const quotes = [
      { status: 'rejected' },
      { status: 'rejected' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('rejected')
  })

  it('does not return "rejected" if mixed with pending', () => {
    const quotes = [
      { status: 'rejected' },
      { status: 'pending' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('requested')
  })

  it('prioritizes accepted over sent', () => {
    const quotes = [
      { status: 'sent' },
      { status: 'accepted' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('validated')
  })
})

describe('getQuoteBadgeLabel', () => {
  it('returns "Demandé" for requested', () => {
    expect(getQuoteBadgeLabel('requested')).toBe('Demandé')
  })

  it('returns "Reçu" for received', () => {
    expect(getQuoteBadgeLabel('received')).toBe('Reçu')
  })

  it('returns "Validé" for validated', () => {
    expect(getQuoteBadgeLabel('validated')).toBe('Validé')
  })

  it('returns "Refusé" for rejected', () => {
    expect(getQuoteBadgeLabel('rejected')).toBe('Refusé')
  })

  it('returns empty string for null', () => {
    expect(getQuoteBadgeLabel(null)).toBe('')
  })
})

describe('getQuoteBadgeColor', () => {
  it('returns yellow classes for requested', () => {
    expect(getQuoteBadgeColor('requested')).toContain('yellow')
  })

  it('returns blue classes for received', () => {
    expect(getQuoteBadgeColor('received')).toContain('blue')
  })

  it('returns green classes for validated', () => {
    expect(getQuoteBadgeColor('validated')).toContain('green')
  })

  it('returns red classes for rejected', () => {
    expect(getQuoteBadgeColor('rejected')).toContain('red')
  })
})

describe('getQuoteCounts', () => {
  it('returns zeros for null', () => {
    expect(getQuoteCounts(null)).toEqual({
      pending: 0, sent: 0, accepted: 0, rejected: 0, total: 0,
    })
  })

  it('counts correctly', () => {
    const quotes = [
      { status: 'pending' },
      { status: 'sent' },
      { status: 'sent' },
      { status: 'accepted' },
      { status: 'rejected' },
    ]
    expect(getQuoteCounts(quotes)).toEqual({
      pending: 1, sent: 2, accepted: 1, rejected: 1, total: 5,
    })
  })
})

describe('hasActiveQuoteProcess', () => {
  it('returns false when requiresQuote is false', () => {
    expect(hasActiveQuoteProcess([{ status: 'pending' }], false)).toBe(false)
  })

  it('returns false for empty quotes', () => {
    expect(hasActiveQuoteProcess([], true)).toBe(false)
  })

  it('returns true for pending quotes when requiresQuote', () => {
    expect(hasActiveQuoteProcess([{ status: 'pending' }], true)).toBe(true)
  })

  it('returns true for sent quotes when requiresQuote', () => {
    expect(hasActiveQuoteProcess([{ status: 'sent' }], true)).toBe(true)
  })

  it('returns false when only rejected quotes', () => {
    expect(hasActiveQuoteProcess([{ status: 'rejected' }], true)).toBe(false)
  })

  it('returns false when only expired quotes', () => {
    expect(hasActiveQuoteProcess([{ status: 'expired' }], true)).toBe(false)
  })

  it('returns false when only cancelled quotes', () => {
    expect(hasActiveQuoteProcess([{ status: 'cancelled' }], true)).toBe(false)
  })

  it('returns true with mixed statuses including pending', () => {
    expect(hasActiveQuoteProcess([
      { status: 'rejected' },
      { status: 'pending' },
      { status: 'cancelled' },
    ], true)).toBe(true)
  })

  it('returns true with mixed statuses including sent', () => {
    expect(hasActiveQuoteProcess([
      { status: 'rejected' },
      { status: 'sent' },
    ], true)).toBe(true)
  })

  it('returns false when all quotes are terminal (rejected/expired/cancelled)', () => {
    expect(hasActiveQuoteProcess([
      { status: 'rejected' },
      { status: 'expired' },
      { status: 'cancelled' },
    ], true)).toBe(false)
  })
})

describe('getQuoteBadgeStatus — edge cases', () => {
  it('returns "requested" when mixed with expired quotes', () => {
    const quotes = [
      { status: 'pending' },
      { status: 'expired' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('requested')
  })

  it('returns "validated" when accepted mixed with cancelled', () => {
    const quotes = [
      { status: 'accepted' },
      { status: 'cancelled' },
    ]
    expect(getQuoteBadgeStatus(quotes)).toBe('validated')
  })

  it('handles single accepted quote', () => {
    expect(getQuoteBadgeStatus([{ status: 'accepted' }])).toBe('validated')
  })
})
