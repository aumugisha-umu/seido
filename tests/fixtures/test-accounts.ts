/**
 * Test account credentials for E2E and integration testing
 *
 * These credentials are used by Puppeteer to authenticate against
 * the running SEIDO instance (local or Vercel preview).
 *
 * IMPORTANT: Do NOT commit real credentials. Use environment variables
 * in CI, or override via E2E_* env vars.
 */

export interface TestAccount {
  email: string
  password: string
  role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin'
  displayName: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const TEST_ACCOUNTS: Record<string, TestAccount> = {
  gestionnaire: {
    email: requireEnv('E2E_GESTIONNAIRE_EMAIL'),
    password: requireEnv('E2E_GESTIONNAIRE_PASSWORD'),
    role: 'gestionnaire',
    displayName: 'Gestionnaire',
  },
  locataire: {
    email: requireEnv('E2E_LOCATAIRE_EMAIL'),
    password: requireEnv('E2E_LOCATAIRE_PASSWORD'),
    role: 'locataire',
    displayName: 'Locataire',
  },
  prestataire: {
    email: requireEnv('E2E_PRESTATAIRE_EMAIL'),
    password: requireEnv('E2E_PRESTATAIRE_PASSWORD'),
    role: 'prestataire',
    displayName: 'Prestataire',
  },
}

/**
 * Base URLs for different environments
 */
export const BASE_URLS = {
  local: 'http://localhost:3000',
  preview: 'https://seido-git-preview-seido-app.vercel.app',
} as const

/**
 * Get the base URL based on environment
 * - E2E_BASE_URL env var takes priority
 * - --mode preview flag uses Vercel preview
 * - Default: localhost:3000
 */
export function getBaseUrl(): string {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL
  if (process.env.VITEST_MODE === 'preview') return BASE_URLS.preview
  return BASE_URLS.local
}
