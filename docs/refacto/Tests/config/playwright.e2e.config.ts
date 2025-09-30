/**
 * Configuration Playwright Avancée pour Tests E2E SEIDO
 * Intégration native avec Pino, agent debugger et captures automatiques
 */

import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Configuration des chemins relatifs au projet
const TESTS_DIR = path.resolve(__dirname, '../tests')
const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots')
const REPORTS_DIR = path.resolve(__dirname, '../reports')
const LOGS_DIR = path.resolve(__dirname, '../logs')

export default defineConfig({
  // Structure des tests
  testDir: TESTS_DIR,
  timeout: 60000, // 60s pour les workflows complets
  expect: { timeout: 10000 }, // 10s pour les assertions

  // Exécution parallèle optimisée
  fullyParallel: false, // Sequential pour éviter les conflits de données
  workers: process.env.CI ? 2 : 3, // Optimisé pour performance locale vs CI

  // Gestion des échecs
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // Plus de retries en CI

  // Configuration globale des tests
  use: {
    // URL de base
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Captures automatiques
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },

    // Vidéos pour debugging
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },

    // Traces complètes pour analyse
    trace: 'retain-on-failure',

    // ⚡ Navigation et timeouts (optimisés pour dashboards avec données)
    actionTimeout: 20000,        // 15s → 20s (actions complexes)
    navigationTimeout: 45000,    // 30s → 45s (auth + middleware + dashboard load)

    // Headers personnalisés pour identification
    extraHTTPHeaders: {
      'X-Test-Suite': 'SEIDO-E2E',
      'X-Test-Environment': process.env.NODE_ENV || 'test'
    }
  },

  // Organisation en projets par rôle utilisateur
  projects: [
    // Tests d'authentification (baseline pour tous)
    {
      name: 'auth-tests',
      testMatch: /phase1-auth\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      metadata: {
        description: 'Tests d\'authentification pour tous les rôles',
        priority: 'critical'
      }
    },

    // Phase 2: Tests Contacts
    {
      name: 'phase2-contacts',
      testMatch: /phase2-contacts\/.*\.spec\.ts/,
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      metadata: {
        description: 'Tests de gestion des contacts (invitations, recherche, filtres)',
        priority: 'high',
        role: 'gestionnaire'
      }
    },

    // Workflow Admin
    {
      name: 'admin-workflow',
      testMatch: /admin-workflow\.spec\.ts/,
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 } // Plus large pour dashboard admin
      },
      metadata: {
        description: 'Workflow complet administrateur',
        role: 'admin'
      }
    },

    // Workflow Gestionnaire
    {
      name: 'gestionnaire-workflow',
      testMatch: /gestionnaire-workflow\.spec\.ts/,
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      metadata: {
        description: 'Workflow complet gestionnaire',
        role: 'gestionnaire'
      }
    },

    // Workflow Locataire
    {
      name: 'locataire-workflow',
      testMatch: /locataire-workflow\.spec\.ts/,
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      metadata: {
        description: 'Workflow complet locataire',
        role: 'locataire'
      }
    },

    // Workflow Prestataire
    {
      name: 'prestataire-workflow',
      testMatch: /prestataire-workflow\.spec\.ts/,
      dependencies: ['auth-tests'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      metadata: {
        description: 'Workflow complet prestataire',
        role: 'prestataire'
      }
    },

    // Tests d'intégration cross-role
    {
      name: 'integration-tests',
      testMatch: /phase3-integration\/.*\.spec\.ts/,
      dependencies: ['admin-workflow', 'gestionnaire-workflow', 'locataire-workflow', 'prestataire-workflow'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      metadata: {
        description: 'Tests d\'intégration et performance',
        priority: 'high'
      }
    },

    // Tests sur mobile (workflow critique uniquement)
    {
      name: 'mobile-critical',
      testMatch: /auth-login\.spec\.ts|locataire-workflow\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
      },
      metadata: {
        description: 'Tests critiques sur mobile',
        priority: 'medium'
      }
    }
  ],

  // Reporters avancés avec intégration Pino
  reporter: [
    // Reporter HTML standard avec customisation
    ['html', {
      outputFolder: path.join(REPORTS_DIR, 'html'),
      open: process.env.CI ? 'never' : 'on-failure'
    }],

    // Reporter JSON pour analyse automatique
    ['json', {
      outputFile: path.join(REPORTS_DIR, 'json/playwright-results.json')
    }],

    // Reporter console avec informations enrichies
    ['list'],

    // Reporter personnalisé pour integration Pino et Agent Debugger
    [path.resolve(__dirname, '../helpers/custom-pino-reporter.ts')],

    // Reporter JUnit pour CI/CD
    ...(process.env.CI ? [
      ['junit', {
        outputFile: path.join(REPORTS_DIR, 'ci-artifacts/junit-results.xml')
      }]
    ] : [])
  ],

  // Configuration de sortie
  outputDir: path.join(SCREENSHOTS_DIR, 'test-results'),

  // Scripts de setup/teardown globaux
  globalSetup: path.resolve(__dirname, '../helpers/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, '../helpers/global-teardown.ts'),

  // Variables d'environnement spécifiques aux tests
  env: {
    // Configuration Pino pour tests
    PINO_LOG_LEVEL: process.env.CI ? 'info' : 'debug',
    PINO_TEST_DIR: LOGS_DIR,

    // Configuration agent debugger
    DEBUGGER_ENABLED: 'true',
    DEBUGGER_OUTPUT_DIR: path.join(REPORTS_DIR, 'debugger'),

    // Configuration captures
    SCREENSHOT_DIR: SCREENSHOTS_DIR,
    SCREENSHOT_QUALITY: '90',

    // Désactiver les animations pour plus de stabilité
    DISABLE_ANIMATIONS: 'true'
  },

  // Configuration serveur de développement (si nécessaire)
  webServer: process.env.CI ? {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000, // 2 minutes pour le build
    env: {
      NODE_ENV: 'test',
      PORT: '3000'
    }
  } : undefined,

  // Métadonnées pour reporting
  metadata: {
    testSuite: 'SEIDO E2E Complete',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString(),
    features: [
      'Multi-role authentication',
      'Cross-role workflows',
      'Performance benchmarks',
      'Security validation',
      'Pino logging integration',
      'Agent debugger analysis'
    ]
  }
})