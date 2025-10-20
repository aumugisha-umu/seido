import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright simple pour tests rapides
 */
export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test/test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30 * 1000,

  reporter: [
    ['list', { printSteps: true }],
    ['html', {
      outputFolder: './test/reports/html',
      open: 'never'
    }]
  ],

  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    navigationTimeout: 15 * 1000,
    actionTimeout: 10 * 1000,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Pas de webServer - utilise le serveur existant
})
