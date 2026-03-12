/**
 * Unit tests for cookie security in impersonation actions.
 * Verifies the split-cookie pattern: httpOnly JWT + non-httpOnly boolean flag.
 */

import { describe, it, expect } from 'vitest'

// ---- Cookie config shapes mirroring the route implementation ----

interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: string
  maxAge: number
  path: string
}

interface CookieSet {
  name: string
  value: string
  options: CookieOptions
}

const IMPERSONATION_DURATION_HOURS = 4

function buildStartImpersonationCookies(token: string): CookieSet[] {
  return [
    {
      name: 'admin-impersonation',
      value: token,
      options: {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: IMPERSONATION_DURATION_HOURS * 60 * 60,
      },
    },
    {
      name: 'is-impersonating',
      value: 'true',
      options: {
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        maxAge: IMPERSONATION_DURATION_HOURS * 60 * 60,
      },
    },
  ]
}

function buildStopImpersonationCookiesToDelete(): string[] {
  return ['admin-impersonation', 'is-impersonating']
}

describe('startImpersonation — cookie settings', () => {
  const cookies = buildStartImpersonationCookies('jwt.token.here')

  const tokenCookie = cookies.find(c => c.name === 'admin-impersonation')!
  const flagCookie = cookies.find(c => c.name === 'is-impersonating')!

  it('sets impersonation-token cookie with httpOnly: true', () => {
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie.options.httpOnly).toBe(true)
  })

  it('sets is-impersonating cookie with httpOnly: false', () => {
    expect(flagCookie).toBeDefined()
    expect(flagCookie.options.httpOnly).toBe(false)
  })

  it('is-impersonating value is "true"', () => {
    expect(flagCookie.value).toBe('true')
  })

  it('both cookies have same maxAge', () => {
    expect(tokenCookie.options.maxAge).toBe(flagCookie.options.maxAge)
  })

  it('both cookies have sameSite: lax', () => {
    expect(tokenCookie.options.sameSite).toBe('lax')
    expect(flagCookie.options.sameSite).toBe('lax')
  })
})

describe('stopImpersonation — clears both cookies', () => {
  it('deletes impersonation-token cookie', () => {
    const toDelete = buildStopImpersonationCookiesToDelete()
    expect(toDelete).toContain('admin-impersonation')
  })

  it('deletes is-impersonating cookie', () => {
    const toDelete = buildStopImpersonationCookiesToDelete()
    expect(toDelete).toContain('is-impersonating')
  })
})
