/**
 * Unified Playwright E2E config for SEIDO.
 *
 * Projects:
 * - auth-setup: Authenticates 3 roles via Supabase API, saves storageState
 * - smoke: Quick auth + navigation checks (< 2 min, every push)
 * - gestionnaire/prestataire/locataire/multi-role: Business flow tests (every PR)
 * - firefox/webkit/mobile/tablet: Cross-browser + mobile (nightly)
 *
 * Modes:
 * - Local: starts dev server, html reporter, unlimited workers
 * - CI: no webServer (uses preview URL), blob reporter, 1 worker
 */

import * as path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// Load .env.local from project root
const PROJECT_ROOT = path.resolve(__dirname, '../..')
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') })

const IS_CI = !!process.env.CI
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

/** Resolve auth file path for a role */
function authPath(role: string): string {
  return path.join(__dirname, '.auth', `${role}.json`)
}

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 1 : undefined,

  reporter: IS_CI
    ? [['blob'], ['github']]
    : [['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── Auth Setup ──────────────────────────────────────
    {
      name: 'auth-setup',
      testMatch: /setup\/auth\.setup\.ts/,
    },

    // ── Couche 1: Smoke Tests ───────────────────────────
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authPath('gestionnaire'),
      },
    },

    // ── Couche 2: E2E by Role ───────────────────────────
    {
      name: 'gestionnaire',
      testMatch: /flows\/(property|contract|billing|supplier-contract|intervention)\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authPath('gestionnaire'),
      },
    },
    {
      name: 'prestataire',
      testMatch: /flows\/.*\.prestataire\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authPath('prestataire'),
      },
    },
    {
      name: 'locataire',
      testMatch: /flows\/.*\.locataire\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authPath('locataire'),
      },
    },
    {
      name: 'multi-role',
      testMatch: /flows\/.*\.multi-role\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authPath('gestionnaire'),
      },
    },

    // ── Couche 3: Cross-Browser (nightly) ───────────────
    {
      name: 'firefox',
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: authPath('gestionnaire'),
      },
    },
    {
      name: 'webkit',
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: authPath('gestionnaire'),
      },
    },
    {
      name: 'mobile-chrome',
      testMatch: /flows\/intervention\/.*\.(prestataire|locataire)\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Pixel 7'],
        storageState: authPath('prestataire'),
      },
    },
    {
      name: 'mobile-safari',
      testMatch: /flows\/intervention\/.*\.(prestataire|locataire)\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['iPhone 14'],
        storageState: authPath('locataire'),
      },
    },
    {
      name: 'tablet',
      testMatch: /flows\/(property|contract)\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['iPad Pro 11'],
        storageState: authPath('gestionnaire'),
      },
    },
  ],

  // Start dev server locally (in CI, tests run against preview URL)
  webServer: IS_CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
