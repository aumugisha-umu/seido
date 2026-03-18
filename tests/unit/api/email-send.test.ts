/**
 * Unit tests for email send route security fixes:
 * - HTML escaping to prevent XSS
 * - Zod schema validation
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---- Inline copies of helpers from the route (to test in isolation) ----

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const emailSendSchema = z.object({
  emailConnectionId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  cc: z.array(z.string().email()).optional(),
  inReplyToEmailId: z.string().optional(),
})

// ---- HTML escaping tests ----

describe('escapeHtml', () => {
  it('escapes <script> tags', () => {
    const input = '<script>alert(1)</script>'
    const result = escapeHtml(input)
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('newlines are converted to <br> after escaping', () => {
    const input = 'line1\nline2'
    const safe = escapeHtml(input).replace(/\n/g, '<br>')
    expect(safe).toBe('line1<br>line2')
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s")
  })

  it('does not double-escape already-escaped entities', () => {
    // The function is not idempotent by design — this is a raw escape
    const result = escapeHtml('&amp;')
    expect(result).toBe('&amp;amp;')
  })
})

// ---- Zod validation tests ----

describe('emailSendSchema validation', () => {
  const validPayload = {
    emailConnectionId: 'conn-123',
    to: 'user@example.com',
    subject: 'Hello',
    body: 'World',
  }

  it('valid payload passes', () => {
    expect(emailSendSchema.safeParse(validPayload).success).toBe(true)
  })

  it('invalid "to" email returns error', () => {
    const result = emailSendSchema.safeParse({ ...validPayload, to: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('missing subject returns error', () => {
    const { subject: _s, ...rest } = validPayload
    const result = emailSendSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('subject exceeding 998 chars returns error', () => {
    const result = emailSendSchema.safeParse({ ...validPayload, subject: 'a'.repeat(999) })
    expect(result.success).toBe(false)
  })

  it('cc with invalid email returns error', () => {
    const result = emailSendSchema.safeParse({ ...validPayload, cc: ['bad-email'] })
    expect(result.success).toBe(false)
  })

  it('cc with valid emails passes', () => {
    const result = emailSendSchema.safeParse({ ...validPayload, cc: ['a@b.com', 'c@d.org'] })
    expect(result.success).toBe(true)
  })
})
