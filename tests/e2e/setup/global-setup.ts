/**
 * Global setup for E2E tests — runs ONCE before all test files.
 *
 * Strategy: API-based login with correct Supabase SSR cookie encoding.
 *
 * 1. Check for fresh cookies (< 30 min) → reuse if available
 * 2. Call Supabase GoTrue REST API to get session tokens
 * 3. Encode the session in the exact format @supabase/ssr expects:
 *    - JSON.stringify(session) → base64url encode → prepend "base64-" prefix
 *    - Chunk at 3180 bytes (encodeURIComponent-aware)
 * 4. Save cookies for test files to restore via page.setCookie()
 *
 * Cookie format (from @supabase/ssr v0.7.0 with default cookieEncoding: "base64url"):
 * - GoTrue JS: storage.setItem(key, JSON.stringify(session))
 * - SSR setItem: "base64-" + stringToBase64URL(JSON.stringify(session))
 * - SSR createChunks: split at 3180-byte boundaries → sb-<ref>-auth-token.0, .1, ...
 */

import fs from 'fs/promises'
import path from 'path'
import { TEST_ACCOUNTS } from '../../fixtures/test-accounts'

/** Path where auth cookies are persisted between setup and tests */
export const AUTH_COOKIES_PATH = path.resolve(__dirname, '../.auth-cookies.json')

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

export default async function globalSetup() {
  const account = TEST_ACCOUNTS.gestionnaire

  // Check if existing cookies are still fresh (< 10 min old).
  // JWT lifetime is 1 hour — 10-min threshold ensures at least 50 min remaining.
  // A higher threshold (e.g. 30 min) risks expired JWTs for client-side API calls.
  try {
    const stat = await fs.stat(AUTH_COOKIES_PATH)
    const ageMs = Date.now() - stat.mtimeMs
    if (ageMs < 10 * 60 * 1000) {
      console.log(`[E2E Setup] Reusing existing cookies (${Math.round(ageMs / 1000)}s old). Skipping login.`)
      return
    }
  } catch {
    // No cookies file — need to login
  }

  console.log(`[E2E Setup] Authenticating ${account.displayName} via Supabase API...`)

  // Step 1: Call Supabase GoTrue API
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`[E2E Setup] Supabase auth failed (${response.status}): ${errorBody}`)
  }

  const session = await response.json()
  if (!session.access_token) {
    throw new Error(`[E2E Setup] No access_token in response`)
  }
  console.log(`[E2E Setup] Authenticated! User: ${session.user?.email}`)

  // Step 2: Build cookies in the exact @supabase/ssr format
  //
  // Chain: GoTrue JS _saveSession() → setItemAsync(storage, key, sessionObj)
  //   → storage.setItem(key, JSON.stringify(sessionObj))
  //     → SSR: encoded = "base64-" + stringToBase64URL(value)
  //       → createChunks(key, encoded) at 3180 bytes
  const projectRef = getProjectRef()
  const cookieBaseName = `sb-${projectRef}-auth-token`

  // GoTrue JS calls JSON.stringify on the session object
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  })

  // SSR applies: "base64-" + base64url(sessionJson)
  // For ASCII JSON, Node's base64url encoding matches Supabase's stringToBase64URL
  const base64urlValue = Buffer.from(sessionJson, 'utf8').toString('base64url')
  const encodedValue = `base64-${base64urlValue}`

  // Chunk using the same algorithm as @supabase/ssr
  const chunks = createChunks(cookieBaseName, encodedValue)

  // Build Puppeteer cookie objects
  // Cookie maxAge from @supabase/ssr: 400 days (DEFAULT_COOKIE_OPTIONS)
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

  // Add middleware-check cookie (SEIDO middleware sets this on successful auth)
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

  // Step 3: Save cookies
  await fs.writeFile(AUTH_COOKIES_PATH, JSON.stringify(cookies, null, 2))

  console.log(`[E2E Setup] Success! ${cookies.length} cookies saved (${chunks.length} auth chunks).`)
  chunks.forEach(c => console.log(`  - ${c.name} (${c.value.length} bytes)`))
}
