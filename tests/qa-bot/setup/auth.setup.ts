/**
 * Playwright auth setup — authenticates 3 QA roles via Supabase GoTrue REST API.
 *
 * Saves storageState per role to playwright/.auth/{role}.json.
 * Reuses the chunked cookie encoding from @supabase/ssr (base64url + 3180-byte chunks).
 *
 * Supports two credential sources:
 * 1. QA_TEST_CREDENTIALS env (JSON) — used in GitHub Actions
 * 2. E2E_* env vars or hardcoded defaults — used locally
 */

import { test as setup } from '@playwright/test'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yfmybfmflghwvylqjfbc.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk'
const MAX_CHUNK_SIZE = 3180

interface Credentials {
  email: string
  password: string
}

function getCredentials(): Record<string, Credentials> {
  // Priority 1: QA_TEST_CREDENTIALS JSON (GitHub Actions)
  if (process.env.QA_TEST_CREDENTIALS) {
    return JSON.parse(process.env.QA_TEST_CREDENTIALS)
  }

  // Priority 2: E2E env vars (no hardcoded defaults — credentials must come from env)
  const missing: string[] = []
  const roles = ['GESTIONNAIRE', 'LOCATAIRE', 'PRESTATAIRE'] as const
  for (const role of roles) {
    if (!process.env[`E2E_${role}_EMAIL`]) missing.push(`E2E_${role}_EMAIL`)
    if (!process.env[`E2E_${role}_PASSWORD`]) missing.push(`E2E_${role}_PASSWORD`)
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}. Set QA_TEST_CREDENTIALS JSON or individual E2E_* env vars.`)
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

async function authenticateRole(email: string, password: string): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
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
    throw new Error(`Supabase auth failed for ${email} (${response.status}): ${errorBody}`)
  }

  const session = await response.json()
  if (!session.access_token) {
    throw new Error(`No access_token in response for ${email}`)
  }

  const projectRef = getProjectRef()
  const cookieBaseName = `sb-${projectRef}-auth-token`
  const targetUrl = new URL(process.env.TARGET_URL || 'http://localhost:3000')
  const domain = targetUrl.hostname

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

// Auth file paths used by playwright.config.ts projects
export const AUTH_FILES = {
  gestionnaire: path.resolve(__dirname, '../../../playwright/.auth/gestionnaire.json'),
  locataire: path.resolve(__dirname, '../../../playwright/.auth/locataire.json'),
  prestataire: path.resolve(__dirname, '../../../playwright/.auth/prestataire.json'),
}

/** Get the storageState file path for a role (used by autonomous explorer) */
export function getStorageStatePath(role: 'gestionnaire' | 'locataire' | 'prestataire'): string {
  return AUTH_FILES[role]
}

/**
 * Standalone auth setup for autonomous explorer (outside Playwright test runner).
 * Authenticates all 3 roles and saves storageState files.
 */
export async function setupAuth(targetUrl: string): Promise<void> {
  const fs = await import('fs')
  const credentials = getCredentials()

  for (const role of ['gestionnaire', 'locataire', 'prestataire'] as const) {
    const creds = credentials[role]
    if (!creds) throw new Error(`No credentials for role: ${role}`)

    console.log(`[auth] Authenticating ${role} (${creds.email})...`)
    const cookies = await authenticateRole(creds.email, creds.password)

    // Save as a minimal storageState JSON (cookies only)
    const authFile = AUTH_FILES[role]
    const dir = path.dirname(authFile)
    fs.mkdirSync(dir, { recursive: true })

    const storageState = {
      cookies: cookies.map(c => ({
        ...c,
        sameSite: 'Lax' as const,
        httpOnly: false,
        secure: targetUrl.startsWith('https'),
        expires: -1,
      })),
      origins: [],
    }

    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2))
    console.log(`[auth] ${role} storageState saved.`)
  }
}

// One setup test per role — Playwright runs them before dependent projects
const roles = ['gestionnaire', 'locataire', 'prestataire'] as const

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const credentials = getCredentials()
    const creds = credentials[role]
    if (!creds) throw new Error(`No credentials found for role: ${role}`)

    console.log(`[QA Setup] Authenticating ${role} (${creds.email})...`)

    const cookies = await authenticateRole(creds.email, creds.password)

    // Set cookies in the browser context
    await page.context().addCookies(cookies)

    // Navigate to trigger middleware and verify auth works
    const targetUrl = process.env.TARGET_URL || 'http://localhost:3000'
    await page.goto(`${targetUrl}/${role}/dashboard`, { waitUntil: 'domcontentloaded' })

    // Save storage state for this role's project
    const authFile = AUTH_FILES[role]
    await page.context().storageState({ path: authFile })

    console.log(`[QA Setup] ${role} authenticated and storageState saved.`)
  })
}
