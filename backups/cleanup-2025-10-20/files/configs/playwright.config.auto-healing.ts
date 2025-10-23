/**
 * Playwright Configuration for Auto-Healing Demo Tests
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './docs/refacto/Tests/auto-healing',
  testMatch: '**/*.spec.ts',

  timeout: 120000, // 2 minutes par test
  expect: { timeout: 15000 },

  fullyParallel: false,
  workers: 1,

  retries: 0, // Auto-healing gère ses propres retries

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    actionTimeout: 15000,
    navigationTimeout: 30000,

    // 🔍 Mode headed : afficher le navigateur pendant les tests
    headless: false,
    // Ralentir légèrement pour mieux voir les actions
    slowMo: 500
  },

  projects: [
    {
      name: 'auto-healing-demo',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      }
    }
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'docs/refacto/Tests/auto-healing-artifacts/reports/html' }]
  ]
})