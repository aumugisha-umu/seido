/**
 * Playwright E2E Configuration - Next.js 15 App Router
 * Configuration suivant les recommandations officielles Next.js
 * @see https://nextjs.org/docs/app/building-your-application/testing/playwright
 * @see https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from '@playwright/test'

/**
 * Lecture des variables d'environnement pour les tests
 */
const isCI = !!process.env.CI
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  // Répertoire des tests E2E
  testDir: './e2e',

  // Timeout par test (60s pour les tests E2E complexes)
  timeout: 60 * 1000,

  // Parallélisation (désactivée sur CI pour stabilité)
  fullyParallel: !isCI,

  // Fail la build si test.only laissé par erreur
  forbidOnly: isCI,

  // Retries sur CI uniquement (2 tentatives)
  retries: isCI ? 2 : 0,

  // Workers (1 sur CI pour éviter race conditions, 4 en local)
  workers: isCI ? 1 : 4,

  // Reporters
  reporter: [
    ['list'], // Console output
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
  ],

  // Configuration globale pour tous les tests
  use: {
    // URL de base
    baseURL,

    // Traces (on-first-retry = sauve uniquement si échec et retry)
    trace: 'on-first-retry',

    // Screenshots sur échec uniquement
    screenshot: 'only-on-failure',

    // Vidéos sur échec uniquement
    video: 'retain-on-failure',

    // Timeout des actions (10s)
    actionTimeout: 10 * 1000,

    // Locale française
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',

    // Headers custom si nécessaire
    // extraHTTPHeaders: {},
  },

  // Projets de test (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox et WebKit disponibles mais non activés par défaut
    // Décommenter pour les activer
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Tests mobile (optionnels)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Serveur web local (démarre automatiquement avant les tests)
  webServer: {
    // Sur CI: build + start (production)
    // En local: dev (développement avec HMR)
    command: isCI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutes pour le build initial
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
