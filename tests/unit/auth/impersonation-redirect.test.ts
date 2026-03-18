/**
 * Unit tests for open-redirect protection in impersonation callback route
 * Validates that only same-origin relative paths are allowed in the `next` param.
 */

import { describe, it, expect } from 'vitest'

/**
 * Extracted redirect-path sanitisation logic (mirrors route.ts implementation).
 * Keep in sync with app/auth/impersonate/callback/route.ts
 */
function sanitizeRedirectPath(rawNext: string | null): string {
  const fallback = '/gestionnaire/dashboard'
  const next = rawNext ?? fallback
  return (next.startsWith('/') && !next.startsWith('//')) ? next : fallback
}

describe('impersonation callback — redirect path sanitisation', () => {
  it('absolute external URL is rejected → fallback', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/gestionnaire/dashboard')
  })

  it('protocol-relative URL is rejected → fallback', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/gestionnaire/dashboard')
  })

  it('valid deep path is allowed', () => {
    expect(sanitizeRedirectPath('/locataire/dashboard')).toBe('/locataire/dashboard')
  })

  it('null → fallback to /gestionnaire/dashboard', () => {
    expect(sanitizeRedirectPath(null)).toBe('/gestionnaire/dashboard')
  })

  it('valid gestionnaire path is allowed', () => {
    expect(sanitizeRedirectPath('/gestionnaire/biens')).toBe('/gestionnaire/biens')
  })

  it('empty string is rejected → fallback', () => {
    expect(sanitizeRedirectPath('')).toBe('/gestionnaire/dashboard')
  })

  it('relative path without leading slash is rejected → fallback', () => {
    expect(sanitizeRedirectPath('gestionnaire/dashboard')).toBe('/gestionnaire/dashboard')
  })
})
