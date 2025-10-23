import { defineConfig, devices } from '@playwright/test'
import { TEST_CONFIG } from './test-config'

/**
 * 🎭 CONFIGURATION PLAYWRIGHT - Tests E2E Auto-Healing
 *
 * Configuration optimisée pour tests E2E avec auto-healing et logging avancé
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '../',
  testMatch: '**/*.spec.ts',
  timeout: TEST_CONFIG.timeout.test,

  /* Mode parallèle désactivé pour auto-healing */
  fullyParallel: false,

  /* Pas de retry automatique - l'auto-healing gère les retries */
  retries: 0,

  /* Un test à la fois pour logs clairs */
  workers: 1,

  /* Reporter personnalisé avec logs détaillés */
  reporter: [
    ['list'], // Liste en console
    ['html', { outputFolder: 'tests-new/logs/playwright-report' }],
    ['json', { outputFile: 'tests-new/logs/test-results.json' }],
  ],

  /* Configuration globale */
  use: {
    baseURL: TEST_CONFIG.baseURL,

    /* Traces pour tous les tests (nécessaire pour auto-healing) */
    trace: 'on',

    /* Screenshots selon config */
    screenshot: TEST_CONFIG.screenshots.onFailure ? 'only-on-failure' : 'off',

    /* Video pour debug */
    video: 'retain-on-failure',

    /* Timeout des actions */
    actionTimeout: TEST_CONFIG.timeout.action,
    navigationTimeout: TEST_CONFIG.timeout.navigation,

    /* Locale et timezone */
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },

  /* Projets de test */
  projects: [
    {
      name: 'chromium-headed',
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // Mode headed
      },
    },
    {
      name: 'chromium-headless',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Mode headless
      },
    },
  ],

  /* Serveur de dev local */
  webServer: {
    command: 'npm run dev',
    url: TEST_CONFIG.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe', // Capturer stdout pour logs
    stderr: 'pipe', // Capturer stderr pour logs
  },

  /* Global setup/teardown */
  globalSetup: require.resolve('../helpers/global-setup.ts'),
  globalTeardown: require.resolve('../helpers/global-teardown.ts'),
})
