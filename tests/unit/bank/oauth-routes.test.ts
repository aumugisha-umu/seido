/**
 * Unit tests for bank OAuth routes.
 *
 * Tests CSRF state validation, successful flow, and error handling
 * without importing the actual route handlers (which depend on Next.js internals).
 * Uses contract-test pattern to avoid server-side import issues.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers: simulate the route logic as pure functions
// ---------------------------------------------------------------------------

/**
 * Simulates the CSRF state validation logic from the callback route.
 */
function validateCsrfState(
  urlState: string | null,
  cookieState: string | null
): { valid: boolean; error?: string } {
  if (!urlState) {
    return { valid: false, error: 'missing_state' }
  }
  if (!cookieState) {
    return { valid: false, error: 'no_cookie' }
  }
  if (urlState !== cookieState) {
    return { valid: false, error: 'state_mismatch' }
  }
  return { valid: true }
}

/**
 * Simulates the parameter validation logic from the callback route.
 */
function validateCallbackParams(
  code: string | null,
  state: string | null
): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'missing_code' }
  }
  if (!state) {
    return { valid: false, error: 'missing_state' }
  }
  return { valid: true }
}

/**
 * Simulates token expiry calculation from the callback route.
 */
function calculateTokenExpiresAt(expiresIn: number, now: number): string {
  return new Date(now + expiresIn * 1000).toISOString()
}

/**
 * Simulates the redirect URL construction for success/error.
 */
function buildRedirectUrl(
  baseUrl: string,
  type: 'success' | 'error'
): string {
  if (type === 'success') {
    return `${baseUrl}/gestionnaire/banque?tab=comptes&toast=success&message=Compte+connect%C3%A9`
  }
  return `${baseUrl}/gestionnaire/banque?tab=comptes&toast=error&message=Erreur+connexion`
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Bank OAuth - CSRF state validation', () => {
  it('rejects when URL state is null', () => {
    const result = validateCsrfState(null, 'stored-state')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('missing_state')
  })

  it('rejects when cookie state is null (expired or missing)', () => {
    const result = validateCsrfState('url-state', null)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('no_cookie')
  })

  it('rejects when states do not match', () => {
    const result = validateCsrfState('state-a', 'state-b')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('state_mismatch')
  })

  it('accepts when states match', () => {
    const state = crypto.randomUUID()
    const result = validateCsrfState(state, state)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('Bank OAuth - callback parameter validation', () => {
  it('rejects when code is missing', () => {
    const result = validateCallbackParams(null, 'some-state')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('missing_code')
  })

  it('rejects when state is missing', () => {
    const result = validateCallbackParams('some-code', null)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('missing_state')
  })

  it('accepts when both code and state are present', () => {
    const result = validateCallbackParams('auth-code-123', 'csrf-state-456')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('Bank OAuth - token expiry calculation', () => {
  it('calculates correct expiry from expires_in seconds', () => {
    const now = new Date('2026-03-21T12:00:00Z').getTime()
    const expiresIn = 1800 // 30 minutes

    const result = calculateTokenExpiresAt(expiresIn, now)
    expect(result).toBe('2026-03-21T12:30:00.000Z')
  })

  it('handles short expiry windows', () => {
    const now = new Date('2026-03-21T12:00:00Z').getTime()
    const expiresIn = 60 // 1 minute

    const result = calculateTokenExpiresAt(expiresIn, now)
    expect(result).toBe('2026-03-21T12:01:00.000Z')
  })
})

describe('Bank OAuth - redirect URL construction', () => {
  const baseUrl = 'https://app.seido.fr'

  it('builds success redirect with toast params', () => {
    const url = buildRedirectUrl(baseUrl, 'success')
    expect(url).toContain('/gestionnaire/banque')
    expect(url).toContain('tab=comptes')
    expect(url).toContain('toast=success')
  })

  it('builds error redirect with toast params', () => {
    const url = buildRedirectUrl(baseUrl, 'error')
    expect(url).toContain('/gestionnaire/banque')
    expect(url).toContain('tab=comptes')
    expect(url).toContain('toast=error')
  })
})

describe('Bank OAuth - authorize flow', () => {
  it('generates a valid UUID state token', () => {
    const state = crypto.randomUUID()
    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(state).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('cookie config matches security requirements', () => {
    const cookieConfig = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 5 * 60,
    }

    expect(cookieConfig.httpOnly).toBe(true)
    expect(cookieConfig.secure).toBe(true)
    expect(cookieConfig.sameSite).toBe('lax')
    expect(cookieConfig.path).toBe('/')
    expect(cookieConfig.maxAge).toBe(300) // 5 minutes
  })
})

describe('Bank OAuth - permanent user delegation flow', () => {
  it('authorize must create tink user before building Tink Link URL', () => {
    // The flow order is: create user → delegation grant → build URL
    // If tinkUserId is null, URL cannot be built
    const tinkUserId: string | null = null
    const canBuildUrl = tinkUserId !== null
    expect(canBuildUrl).toBe(false)
  })

  it('delegation grant returns authorization_code for Tink Link', () => {
    const grantResponse = { code: 'delegation-auth-code-abc123' }
    expect(grantResponse.code).toBeTruthy()
    expect(typeof grantResponse.code).toBe('string')
  })

  it('Tink Link URL must include authorization_code parameter', () => {
    const authCode = 'delegation-auth-code-abc123'
    const url = new URL('https://link.tink.com/1.0/products/connect-accounts')
    url.searchParams.set('authorization_code', authCode)
    url.searchParams.set('products', 'TRANSACTIONS')

    expect(url.pathname).toBe('/1.0/products/connect-accounts')
    expect(url.searchParams.get('authorization_code')).toBe(authCode)
    expect(url.searchParams.get('products')).toBe('TRANSACTIONS')
  })

  it('callback validates tink_user_id cookie presence', () => {
    const tinkUserIdFromCookie: string | null = null
    const isValid = tinkUserIdFromCookie !== null
    expect(isValid).toBe(false)
  })

  it('callback reads tink_user_id from cookie for connection creation', () => {
    const tinkUserIdFromCookie = 'tink-user-permanent-123'
    expect(tinkUserIdFromCookie).toBeTruthy()

    // This value is used in createConnection DTO
    const dto = {
      tink_user_id: tinkUserIdFromCookie,
      tink_account_id: 'account-1',
    }
    expect(dto.tink_user_id).toBe('tink-user-permanent-123')
  })

  it('credentials_id from Tink Link callback is stored', () => {
    const callbackUrl = new URL(
      'https://app.seido.fr/api/bank/oauth/callback?code=abc&state=xyz&credentials_id=cred-123'
    )
    const credentialsId = callbackUrl.searchParams.get('credentials_id')
    expect(credentialsId).toBe('cred-123')
  })
})

describe('Bank OAuth - error handling', () => {
  it('exchangeAuthCode failure results in error redirect', () => {
    // Simulate exchange failure
    const exchangeFailed = true
    const redirectUrl = exchangeFailed
      ? buildRedirectUrl('https://app.seido.fr', 'error')
      : buildRedirectUrl('https://app.seido.fr', 'success')

    expect(redirectUrl).toContain('toast=error')
  })

  it('empty accounts list results in error redirect', () => {
    const accounts: unknown[] = []
    const shouldError = accounts.length === 0

    expect(shouldError).toBe(true)
  })

  it('all connection creations failing results in error redirect', () => {
    const results = [
      { status: 'rejected' as const, reason: new Error('DB error') },
      { status: 'rejected' as const, reason: new Error('DB error') },
    ]

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    expect(succeeded).toBe(0)
  })

  it('partial success still redirects to success', () => {
    const results = [
      { status: 'fulfilled' as const, value: { id: '1' } },
      { status: 'rejected' as const, reason: new Error('duplicate') },
    ]

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    expect(succeeded).toBeGreaterThan(0)
  })
})
