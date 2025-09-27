/**
 * Configuration Playwright optimisée pour SEIDO
 * Tests multi-rôles avec projets spécialisés
 */

import { defineConfig, devices } from '@playwright/test'
import { TEST_ACCOUNTS_CONFIG } from './test/config/test-accounts.config'

export default defineConfig({
  testDir: './test/e2e',

  // Configuration optimisée pour tests parallèles
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,

  // Rapports détaillés
  reporter: [
    ['html', { outputFolder: 'test/reports/html', open: 'never' }],
    ['json', { outputFile: 'test/reports/test-results.json' }],
    ['junit', { outputFile: 'test/reports/junit.xml' }],
    ['list', { printSteps: true }]
  ],

  // Configuration globale
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Headers pour les tests
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR',
    }
  },

  // Projets de test par rôle et par type
  projects: [
    // Tests par rôle utilisateur
    {
      name: 'gestionnaire',
      testDir: './test/e2e',
      testMatch: ['**/gestionnaire/**/*.spec.ts', '**/baseline/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './test/.auth/gestionnaire.json',
        viewport: { width: 1920, height: 1080 },
        contextOptions: {
          permissions: ['notifications']
        }
      }
    },
    {
      name: 'prestataire',
      testDir: './test/e2e',
      testMatch: ['**/prestataire/**/*.spec.ts', '**/baseline/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './test/.auth/prestataire.json',
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'locataire',
      testDir: './test/e2e',
      testMatch: ['**/locataire/**/*.spec.ts', '**/baseline/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './test/.auth/locataire.json',
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'admin',
      testDir: './test/e2e',
      testMatch: ['**/admin/**/*.spec.ts', '**/baseline/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './test/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Tests cross-browser
    {
      name: 'chromium',
      testMatch: ['**/baseline/**/*.spec.ts', '**/critical/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      testMatch: ['**/baseline/**/*.spec.ts', '**/critical/**/*.spec.ts'],
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      testMatch: ['**/baseline/**/*.spec.ts', '**/critical/**/*.spec.ts'],
      use: { ...devices['Desktop Safari'] }
    },

    // Tests mobile
    {
      name: 'mobile',
      testMatch: ['**/responsive/**/*.spec.ts', '**/mobile/**/*.spec.ts'],
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      testMatch: ['**/responsive/**/*.spec.ts', '**/mobile/**/*.spec.ts'],
      use: { ...devices['iPhone 12'] }
    },
    {
      name: 'tablet',
      testMatch: ['**/responsive/**/*.spec.ts'],
      use: { ...devices['iPad Pro'] }
    },

    // Tests de performance
    {
      name: 'performance',
      testMatch: ['**/performance/**/*.spec.ts', '**/baseline/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        trace: 'on',
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox'
          ]
        }
      }
    },

    // Tests d'accessibilité
    {
      name: 'accessibility',
      testMatch: ['**/accessibility/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // Émulation de lecteur d'écran
        contextOptions: {
          // @ts-ignore - Playwright accessibility testing
          bypassCSP: true
        }
      }
    },

    // Tests de sécurité
    {
      name: 'security',
      testMatch: ['**/security/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ignoreHTTPSErrors: false,
        // Test avec différents user agents
        userAgent: 'Mozilla/5.0 (Security Test Bot)'
      }
    },

    // Tests API
    {
      name: 'api',
      testMatch: ['**/api/**/*.spec.ts'],
      use: {
        baseURL: process.env.API_URL || 'http://localhost:3000/api',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        }
      }
    },

    // Tests d'intégration complète
    {
      name: 'integration',
      testMatch: ['**/integration/**/*.spec.ts', '**/workflows/**/*.spec.ts'],
      timeout: 120000, // 2 minutes pour les tests d'intégration
      use: {
        ...devices['Desktop Chrome'],
        trace: 'on',
        video: 'on'
      }
    },

    // Tests Phase 2 - Server Components
    {
      name: 'phase2',
      testMatch: ['**/phase2/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        trace: 'on'
      }
    },

    // Tests Phase 3 - Database & Cache
    {
      name: 'phase3',
      testMatch: ['**/phase3/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome']
      }
    },

    // Tests finaux de production
    {
      name: 'production',
      testMatch: ['**/production/**/*.spec.ts', '**/smoke/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_URL || 'https://seido.app'
      }
    }
  ],

  // Configuration du serveur de développement
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: process.env.DEBUG ? 'pipe' : 'ignore',
    stderr: 'pipe'
  },

  // Configuration globale des timeouts
  timeout: 30000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2
    }
  },

  // Variables d'environnement pour les tests
  use: {
    ...TEST_ACCOUNTS_CONFIG.e2e
  }
})

// Types pour TypeScript
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeAccessible(): R
      toHavePerformanceMetric(metric: string, threshold: number): R
    }
  }
}