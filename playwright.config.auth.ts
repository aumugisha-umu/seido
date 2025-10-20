import { defineConfig, devices } from '@playwright/test'

/**
 * 🧪 PLAYWRIGHT CONFIG - Tests d'Authentification SEIDO
 *
 * Configuration spécialisée pour tester le nouveau système d'authentification
 * refactorisé avec middleware + Server Components
 */

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/auth-flow-complete.spec.ts',

  /* Configuration globale */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 120000, // 120 secondes par test (doublé pour les tests E2E complets)

  /* Reporter avec captures détaillées */
  reporter: [
    ['html', {
      outputFolder: 'playwright-report-auth',
      open: 'never'
    }],
    ['json', {
      outputFile: 'test-results/auth-results.json'
    }],
    ['line']
  ],

  /* Configuration globale des captures */
  use: {
    /* Base URL sur port 3000 standard */
    baseURL: 'http://localhost:3000',

    /* Traces et captures pour debug */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Navigation robuste */
    navigationTimeout: 60000, // 60s pour navigation
    actionTimeout: 30000, // 30s pour actions

    /* Headers pour identifier les tests */
    extraHTTPHeaders: {
      'x-test-type': 'auth-flow-e2e'
    }
  },

  /* Configuration de l'application de test */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  /* Projets multi-navigateurs et responsive */
  projects: [
    /* Tests Desktop */
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on'
      },
    },

    /* Tests Mobile */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        screenshot: 'on',
        video: 'on'
      },
    },

    /* Tests Tablet */
    {
      name: 'tablet-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        screenshot: 'on',
        video: 'on'
      },
    }
  ],

  /* Dossiers de sortie */
  outputDir: 'test-results/auth-artifacts',
})
