import * as path from 'node:path'
import dotenv from 'dotenv'

import { defineConfig, devices } from '@playwright/test'

// Load .env.local from project root (Playwright doesn't read it natively like Next.js)
const PROJECT_ROOT = path.resolve(__dirname, '../..')
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') })

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000'
const IS_CI = !!process.env.CI

/** Resolve storageState paths to project root (where auth.setup.ts writes them) */
function authPath(role: string): string {
  return path.join(PROJECT_ROOT, 'playwright', '.auth', `${role}.json`)
}

export default defineConfig({
  testDir: './guided',
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: IS_CI ? 'blob' : 'html',

  use: {
    baseURL: TARGET_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    ...devices['Desktop Chrome'],
  },

  projects: [
    // Auth setup — runs first, saves storageState per role
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: './setup',
    },

    // Gestionnaire tests (default — all specs without a role suffix)
    {
      name: 'gestionnaire',
      use: {
        storageState: authPath('gestionnaire'),
      },
      dependencies: ['setup'],
    },

    // Locataire tests — only specs ending in .locataire.spec.ts
    {
      name: 'locataire',
      testMatch: /.*\.locataire\.spec\.ts/,
      use: {
        storageState: authPath('locataire'),
      },
      dependencies: ['setup'],
    },

    // Prestataire tests — only specs ending in .prestataire.spec.ts
    {
      name: 'prestataire',
      testMatch: /.*\.prestataire\.spec\.ts/,
      use: {
        storageState: authPath('prestataire'),
      },
      dependencies: ['setup'],
    },

    // Multi-role tests — only specs ending in .multi-role.spec.ts
    {
      name: 'multi-role',
      testMatch: /.*\.multi-role\.spec\.ts/,
      use: {
        storageState: authPath('gestionnaire'),
      },
      dependencies: ['setup'],
    },
  ],
})
