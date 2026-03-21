/**
 * Playwright auth setup — authenticates 3 roles via Supabase GoTrue REST API.
 *
 * Saves storageState per role to tests/e2e/.auth/{role}.json.
 * Reuses the chunked cookie encoding from @supabase/ssr (base64url + 3180-byte chunks).
 *
 * Credential sources:
 * 1. E2E_* env vars (E2E_GESTIONNAIRE_EMAIL, E2E_GESTIONNAIRE_PASSWORD, etc.)
 * 2. QA_TEST_CREDENTIALS env (JSON) — used in GitHub Actions
 */

import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yfmybfmflghwvylqjfbc.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk'
const MAX_CHUNK_SIZE = 3180

interface Credentials {
  email: string
  password: string
}

/** Auth file paths used by playwright.config.ts projects */
export const AUTH_DIR = path.resolve(__dirname, '../.auth')
export const AUTH_FILES = {
  gestionnaire: path.join(AUTH_DIR, 'gestionnaire.json'),
  locataire: path.join(AUTH_DIR, 'locataire.json'),
  prestataire: path.join(AUTH_DIR, 'prestataire.json'),
} as const

function getCredentials(): Record<string, Credentials> {
  if (process.env.QA_TEST_CREDENTIALS) {
    return JSON.parse(process.env.QA_TEST_CREDENTIALS)
  }

  const missing: string[] = []
  const roles = ['GESTIONNAIRE', 'LOCATAIRE', 'PRESTATAIRE'] as const
  for (const role of roles) {
    if (!process.env[`E2E_${role}_EMAIL`]) missing.push(`E2E_${role}_EMAIL`)
    if (!process.env[`E2E_${role}_PASSWORD`]) missing.push(`E2E_${role}_PASSWORD`)
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return {
    gestionnaire: {
      email: process.env.E2E_GESTIONNAIRE_EMAIL!,
      password: process.env.E2E_GESTIONNAIRE_PASSWORD!,
    },
    locataire: {
      email: process.env.E2E_LOCATAIRE_EMAIL!,
      password: process.env.E2E_LOCATAIRE_PASSWORD!,
    },
    prestataire: {
      email: process.env.E2E_PRESTATAIRE_EMAIL!,
      password: process.env.E2E_PRESTATAIRE_PASSWORD!,
    },
  }
}

function getProjectRef(): string {
  const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/)
  if (!match) throw new Error(`Cannot extract project ref from SUPABASE_URL: ${SUPABASE_URL}`)
  return match[1]
}

function createChunks(key: string, value: string): Array<{ name: string; value: string }> {
  let encodedValue = encodeURIComponent(value)

  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }]
  }

  const chunks: string[] = []
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, MAX_CHUNK_SIZE)
    const lastEscapePos = encodedChunkHead.lastIndexOf('%')
    if (lastEscapePos > MAX_CHUNK_SIZE - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos)
    }

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

async function authenticateRole(
  email: string,
  password: string,
): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Supabase auth failed for ${email} (${response.status}): ${errorBody}`)
  }

  const session = await response.json()
  if (!session.access_token) {
    throw new Error(`No access_token in response for ${email}`)
  }

  const projectRef = getProjectRef()
  const cookieBaseName = `sb-${projectRef}-auth-token`
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
  const domain = new URL(baseURL).hostname

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

  return chunks.map(chunk => ({
    name: chunk.name,
    value: chunk.value,
    domain,
    path: '/',
  }))
}

// Ensure auth directory exists
fs.mkdirSync(AUTH_DIR, { recursive: true })

// One setup test per role
const roles = ['gestionnaire', 'locataire', 'prestataire'] as const

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const credentials = getCredentials()
    const creds = credentials[role]
    if (!creds) throw new Error(`No credentials found for role: ${role}`)

    // eslint-disable-next-line no-console
    console.log(`[E2E Auth] Authenticating ${role} (${creds.email})...`)

    const cookies = await authenticateRole(creds.email, creds.password)
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
    const isSecure = baseURL.startsWith('https')

    // Set cookies in the browser context
    await page.context().addCookies(
      cookies.map(c => ({
        ...c,
        sameSite: 'Lax' as const,
        httpOnly: false,
        secure: isSecure,
        expires: -1,
      })),
    )

    // Navigate to verify auth works
    await page.goto(`${baseURL}/${role}/dashboard`, { waitUntil: 'domcontentloaded' })

    // Save storage state for this role's project
    const authFile = AUTH_FILES[role]
    await page.context().storageState({ path: authFile })

    // eslint-disable-next-line no-console
    console.log(`[E2E Auth] ${role} authenticated and storageState saved.`)
  })
}
