/**
 * Unit tests for lib/utils/document-token.ts
 *
 * Covers: generate, verify, tamper detection, expiry, wrong documentId,
 * and timing-safe comparison (via length guard and crypto.timingSafeEqual).
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateDocumentToken, verifyDocumentToken } from '@/lib/utils/document-token'

const TEST_DOC_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('generateDocumentToken', () => {
  it('returns a non-empty base64url string', () => {
    const token = generateDocumentToken(TEST_DOC_ID)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
    // base64url: no +, /, = characters
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('encodes the documentId and expiry in the payload', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = generateDocumentToken(TEST_DOC_ID)
    const decoded = Buffer.from(token, 'base64url').toString()
    const [docId, exp] = decoded.split(':')
    expect(docId).toBe(TEST_DOC_ID)
    expect(parseInt(exp, 10)).toBeGreaterThanOrEqual(before + 86000) // ~24h
  })

  it('accepts a custom expiresAt timestamp', () => {
    const customExp = Math.floor(Date.now() / 1000) + 3600 // 1h
    const token = generateDocumentToken(TEST_DOC_ID, customExp)
    const decoded = Buffer.from(token, 'base64url').toString()
    const [, exp] = decoded.split(':')
    expect(parseInt(exp, 10)).toBe(customExp)
  })
})

describe('verifyDocumentToken', () => {
  it('returns true for a freshly generated valid token', () => {
    const token = generateDocumentToken(TEST_DOC_ID)
    expect(verifyDocumentToken(token, TEST_DOC_ID)).toBe(true)
  })

  it('returns false for a tampered signature', () => {
    const token = generateDocumentToken(TEST_DOC_ID)
    // Decode, mangle last char of signature, re-encode
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a')
    const tampered = Buffer.from(parts.join(':')).toString('base64url')
    expect(verifyDocumentToken(tampered, TEST_DOC_ID)).toBe(false)
  })

  it('returns false for a token with the wrong documentId', () => {
    const token = generateDocumentToken(TEST_DOC_ID)
    const otherId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(verifyDocumentToken(token, otherId)).toBe(false)
  })

  it('returns false for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 1 // 1 second in the past
    const token = generateDocumentToken(TEST_DOC_ID, pastExp)
    expect(verifyDocumentToken(token, TEST_DOC_ID)).toBe(false)
  })

  it('returns false for a completely random/garbage token', () => {
    expect(verifyDocumentToken('not-a-real-token', TEST_DOC_ID)).toBe(false)
    expect(verifyDocumentToken('', TEST_DOC_ID)).toBe(false)
    expect(verifyDocumentToken('aGVsbG8=', TEST_DOC_ID)).toBe(false) // "hello" base64
  })

  it('returns false when token has too few parts (malformed)', () => {
    const malformed = Buffer.from('onlytwoparts:12345').toString('base64url')
    expect(verifyDocumentToken(malformed, TEST_DOC_ID)).toBe(false)
  })

  it('uses timing-safe comparison: different-length signatures return false without throwing', () => {
    // Construct a token where signature length differs from expected
    const exp = Math.floor(Date.now() / 1000) + 3600
    const shortSig = 'abc' // much shorter than 64-char hex signature
    const fakePayload = `${TEST_DOC_ID}:${exp}:${shortSig}`
    const fakeToken = Buffer.from(fakePayload).toString('base64url')
    // Should return false gracefully (length guard before timingSafeEqual)
    expect(verifyDocumentToken(fakeToken, TEST_DOC_ID)).toBe(false)
  })
})
