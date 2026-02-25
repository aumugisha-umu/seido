/**
 * Global setup for E2E tests — runs ONCE before all test files.
 *
 * Strategy: API-based login with correct Supabase SSR cookie encoding.
 *
 * 1. Check for fresh cookies (< 10 min) → reuse if available
 * 2. Call Supabase GoTrue REST API to get session tokens
 * 3. Encode the session in the exact format @supabase/ssr expects:
 *    - JSON.stringify(session) → base64url encode → prepend "base64-" prefix
 *    - Chunk at 3180 bytes (encodeURIComponent-aware)
 * 4. Save cookies for test files to restore via page.setCookie()
 *
 * Multi-role: Authenticates ALL roles in TEST_ACCOUNTS (gestionnaire, locataire, prestataire).
 * Saves separate cookie files per role: .auth-cookies-{role}.json
 * Backward compat: gestionnaire cookies also saved to .auth-cookies.json
 *
 * Cookie format (from @supabase/ssr v0.7.0 with default cookieEncoding: "base64url"):
 * - GoTrue JS: storage.setItem(key, JSON.stringify(session))
 * - SSR setItem: "base64-" + stringToBase64URL(JSON.stringify(session))
 * - SSR createChunks: split at 3180-byte boundaries → sb-<ref>-auth-token.0, .1, ...
 */

import fs from 'fs/promises'
import path from 'path'
import { TEST_ACCOUNTS } from '../../fixtures/test-accounts'

/** Path where auth cookies are persisted between setup and tests (legacy, gestionnaire) */
export const AUTH_COOKIES_PATH = path.resolve(__dirname, '../.auth-cookies.json')

/** Get cookie path for a specific role */
export function getAuthCookiesPath(role: string): string {
  return path.resolve(__dirname, `../.auth-cookies-${role}.json`)
}

/** Supabase project config */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yfmybfmflghwvylqjfbc.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk'

/** Max chunk size from @supabase/ssr chunker.js */
const MAX_CHUNK_SIZE = 3180

/** Extract project ref from Supabase URL */
function getProjectRef(): string {
  const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/)
  if (!match) throw new Error(`Cannot extract project ref from SUPABASE_URL: ${SUPABASE_URL}`)
  return match[1]
}

/**
 * Chunk a cookie value using the same algorithm as @supabase/ssr createChunks().
 * Works on encodeURIComponent(value) to ensure chunks don't split multi-byte sequences.
 */
function createChunks(key: string, value: string): Array<{ name: string; value: string }> {
  let encodedValue = encodeURIComponent(value)

  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }]
  }

  const chunks: string[] = []
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, MAX_CHUNK_SIZE)

    // Don't split in the middle of a percent-encoded sequence
    const lastEscapePos = encodedChunkHead.lastIndexOf('%')
    if (lastEscapePos > MAX_CHUNK_SIZE - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos)
    }

    // Decode back to the original string for this chunk
    let valueHead = ''
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead)
        break
      } catch {
        if (encodedChunkHead.length > 3 && encodedChunkHead.at(-3) === '%') {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3)
        } else {
          throw new Error('Failed to decode chunk')
        }
      }
    }

    chunks.push(valueHead)
    encodedValue = encodedValue.slice(encodedChunkHead.length)
  }

  return chunks.map((value, i) => ({ name: `${key}.${i}`, value }))
}

/**
 * Authenticate a single account and return Puppeteer cookie objects.
 */
async function authenticateAccount(email: string, password: string, displayName: string) {
  console.log(`[E2E Setup] Authenticating ${displayName} via Supabase API...`)

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`[E2E Setup] Supabase auth failed for ${displayName} (${response.status}): ${errorBody}`)
  }

  const session = await response.json()
  if (!session.access_token) {
    throw new Error(`[E2E Setup] No access_token in response for ${displayName}`)
  }
  console.log(`[E2E Setup] Authenticated ${displayName}! User: ${session.user?.email}`)

  // Build cookies in the exact @supabase/ssr format
  const projectRef = getProjectRef()
  const cookieBaseName = `sb-${projectRef}-auth-token`

  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  })

  const base64urlValue = Buffer.from(sessionJson, 'utf8').toString('base64url')
  const encodedValue = `base64-${base64urlValue}`
  const chunks = createChunks(cookieBaseName, encodedValue)

  const maxAgeSeconds = 400 * 24 * 60 * 60
  const expiresTimestamp = Math.floor(Date.now() / 1000) + maxAgeSeconds

  const cookies = chunks.map(chunk => ({
    name: chunk.name,
    value: chunk.value,
    domain: 'localhost',
    path: '/',
    expires: expiresTimestamp,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }))

  // Add middleware-check cookie
  cookies.push({
    name: 'middleware-check',
    value: 'true',
    domain: 'localhost',
    path: '/',
    expires: expiresTimestamp,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  })

  console.log(`[E2E Setup] ${displayName}: ${cookies.length} cookies (${chunks.length} auth chunks)`)
  return cookies
}

/**
 * Check if cookies for a role are still fresh (< 10 min old).
 */
async function areCookiesFresh(cookiePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(cookiePath)
    const ageMs = Date.now() - stat.mtimeMs
    return ageMs < 10 * 60 * 1000
  } catch {
    return false
  }
}

export default async function globalSetup() {
  const roles = Object.entries(TEST_ACCOUNTS)

  // Check if ALL role cookies are fresh — only skip if every role has fresh cookies
  const freshnessChecks = await Promise.all(
    roles.map(async ([role]) => ({
      role,
      fresh: await areCookiesFresh(getAuthCookiesPath(role)),
    }))
  )

  const allFresh = freshnessChecks.every(c => c.fresh)
  if (allFresh) {
    console.log(`[E2E Setup] All ${roles.length} role cookies are fresh. Skipping login.`)
    return
  }

  const staleRoles = freshnessChecks.filter(c => !c.fresh).map(c => c.role)
  console.log(`[E2E Setup] Authenticating ${staleRoles.length} role(s): ${staleRoles.join(', ')}`)

  // Authenticate only stale roles (skip fresh ones)
  for (const [role, account] of roles) {
    const cookiePath = getAuthCookiesPath(role)

    if (!staleRoles.includes(role)) {
      console.log(`[E2E Setup] ${role}: cookies still fresh, skipping.`)
      continue
    }

    const cookies = await authenticateAccount(account.email, account.password, account.displayName)
    await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2))

    // Backward compat: also save gestionnaire to the legacy path
    if (role === 'gestionnaire') {
      await fs.writeFile(AUTH_COOKIES_PATH, JSON.stringify(cookies, null, 2))
    }
  }

  console.log(`[E2E Setup] All roles authenticated successfully.`)
}
