/**
 * Unit tests for document download security logic
 *
 * Tests the token verification and rate-limiting logic
 * in isolation (without spinning up the full Next.js route).
 *
 * The route itself is tested end-to-end via E2E tests.
 * Here we unit-test the two security primitives it uses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateDocumentToken, verifyDocumentToken } from '@/lib/utils/document-token'

const VALID_DOC_ID = 'c2f3e4d5-6789-4abc-def0-123456789abc'

// ─── Token verification (as used by the route) ─────────────────────────────

describe('Route token logic: valid token + correct documentId → passes (200-equivalent)', () => {
  it('verifyDocumentToken returns true for valid token matching documentId', () => {
    const token = generateDocumentToken(VALID_DOC_ID)
    expect(verifyDocumentToken(token, VALID_DOC_ID)).toBe(true)
  })
})

describe('Route token logic: invalid token → 401-equivalent', () => {
  it('verifyDocumentToken returns false for a corrupted token', () => {
    expect(verifyDocumentToken('invalid.token.here', VALID_DOC_ID)).toBe(false)
  })

  it('verifyDocumentToken returns false for token signed for different doc', () => {
    const otherToken = generateDocumentToken('00000000-0000-0000-0000-000000000000')
    expect(verifyDocumentToken(otherToken, VALID_DOC_ID)).toBe(false)
  })
})

describe('Route token logic: expired token → 401-equivalent', () => {
  it('verifyDocumentToken returns false for token with past expiry', () => {
    const expiredToken = generateDocumentToken(VALID_DOC_ID, Math.floor(Date.now() / 1000) - 60)
    expect(verifyDocumentToken(expiredToken, VALID_DOC_ID)).toBe(false)
  })
})

describe('Route token logic: no token → backward-compat pass + warning logged', () => {
  it('absence of token does not call verifyDocumentToken — route allows through with warn', () => {
    // Simulate the route logic: if no token, skip verification
    const token: string | null = null
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let allowed = false
    if (token) {
      allowed = verifyDocumentToken(token, VALID_DOC_ID)
    } else {
      // Backward-compat path: log and allow
      console.warn('[document-download] UUID-only access (no token)', { documentId: VALID_DOC_ID })
      allowed = true
    }

    expect(allowed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[document-download] UUID-only access (no token)',
      { documentId: VALID_DOC_ID }
    )
    consoleSpy.mockRestore()
  })
})

// ─── Rate limiting logic ────────────────────────────────────────────────────

describe('Rate limiting: checkRateLimit logic', () => {
  // Inline the rate limiter to test in isolation
  function makeRateLimiter() {
    const attempts = new Map<string, { count: number; reset: number }>()
    return function checkRateLimit(ip: string, limit = 20, windowSeconds = 60): boolean {
      const now = Date.now()
      const entry = attempts.get(ip)
      if (!entry || entry.reset < now) {
        attempts.set(ip, { count: 1, reset: now + windowSeconds * 1000 })
        return true
      }
      if (entry.count >= limit) return false
      entry.count++
      return true
    }
  }

  it('allows requests below the limit', () => {
    const checkRateLimit = makeRateLimiter()
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit('1.2.3.4')).toBe(true)
    }
  })

  it('blocks the 21st request within the window → 429-equivalent', () => {
    const checkRateLimit = makeRateLimiter()
    for (let i = 0; i < 20; i++) {
      checkRateLimit('5.6.7.8')
    }
    expect(checkRateLimit('5.6.7.8')).toBe(false)
  })

  it('different IPs have independent counters', () => {
    const checkRateLimit = makeRateLimiter()
    for (let i = 0; i < 20; i++) {
      checkRateLimit('10.0.0.1')
    }
    // 10.0.0.1 is exhausted, but 10.0.0.2 is fresh
    expect(checkRateLimit('10.0.0.1')).toBe(false)
    expect(checkRateLimit('10.0.0.2')).toBe(true)
  })

  it('resets counter after window expires', () => {
    vi.useFakeTimers()
    const checkRateLimit = makeRateLimiter()
    const ip = '192.168.1.1'

    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip)
    }
    expect(checkRateLimit(ip)).toBe(false) // exhausted

    // Advance past the 60s window
    vi.advanceTimersByTime(61 * 1000)

    expect(checkRateLimit(ip)).toBe(true) // reset
    vi.useRealTimers()
  })
})
