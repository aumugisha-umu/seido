/**
 * 🎯 CONFIGURATION GLOBALE - Tests E2E Auto-Healing
 *
 * Configuration centralisée pour tous les tests E2E avec auto-healing
 */

export const TEST_CONFIG = {
  // URLs de base
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

  // Configuration Playwright
  timeout: {
    test: 60000,        // 60s par test (augmenté pour compilation Next.js)
    action: 10000,      // 10s par action (augmenté)
    navigation: 30000,  // 30s pour navigation (augmenté pour première compilation)
  },

  // Configuration Auto-Healing
  autoHealing: {
    maxIterations: 5,           // Max 5 tentatives avant d'arrêter
    enabled: true,              // Activer auto-healing
    pauseBetweenRuns: 2000,     // 2s pause entre tentatives
  },

  // Configuration Logs
  logging: {
    enabled: true,
    logDir: 'tests-new/logs',
    captureConsole: true,
    captureServer: true,
    captureSupabase: true,
    capturePino: true,
  },

  // Configuration Screenshots
  screenshots: {
    onFailure: true,
    onSuccess: false,
    directory: 'tests-new/logs/screenshots',
  },

  // Utilisateurs de test
  testUsers: {
    gestionnaire: {
      email: 'test-gestionnaire@seido-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Gestionnaire',
      role: 'gestionnaire' as const,
    },
    prestataire: {
      email: 'test-prestataire@seido-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Prestataire',
      role: 'prestataire' as const,
    },
    locataire: {
      email: 'test-locataire@seido-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Locataire',
      role: 'locataire' as const,
    },
    admin: {
      email: 'test-admin@seido-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin' as const,
    },
  },

  // Configuration Email (Resend)
  email: {
    mockEnabled: true,
    captureEmails: true,
    emailsDir: 'tests-new/logs/emails',
  },

  // Configuration Agents
  agents: {
    coordinator: {
      enabled: true,
      analysisTimeout: 30000, // 30s pour analyser un bug
    },
    frontend: {
      enabled: true,
      debugTimeout: 60000,    // 60s pour debug frontend
    },
    backend: {
      enabled: true,
      debugTimeout: 60000,    // 60s pour debug backend
    },
    api: {
      enabled: true,
      debugTimeout: 60000,    // 60s pour debug API
    },
  },
} as const

/**
 * Types pour TypeScript
 */
export type TestRole = keyof typeof TEST_CONFIG.testUsers
export type TestUser = typeof TEST_CONFIG.testUsers[TestRole]

/**
 * Helper pour récupérer un utilisateur de test
 */
export const getTestUser = (role: TestRole): TestUser => {
  return TEST_CONFIG.testUsers[role]
}

/**
 * Helper pour générer un email de test unique
 */
export const generateTestEmail = (role: TestRole, timestamp?: number): string => {
  const ts = timestamp || Date.now()
  return `test-${role}-${ts}@seido-test.com`
}

/**
 * Helper pour vérifier si auto-healing est activé
 */
export const isAutoHealingEnabled = (): boolean => {
  return TEST_CONFIG.autoHealing.enabled && process.env.DISABLE_AUTO_HEALING !== 'true'
}

/**
 * Configuration des chemins de logs
 */
export const getLogPaths = (testName: string) => {
  const sanitizedName = testName.replace(/[^a-zA-Z0-9-]/g, '-')
  const baseDir = `${TEST_CONFIG.logging.logDir}/${sanitizedName}`

  return {
    baseDir,
    console: `${baseDir}/console.log`,
    server: `${baseDir}/server.log`,
    supabase: `${baseDir}/supabase.log`,
    pino: `${baseDir}/pino.log`,
    report: `${baseDir}/report.md`,
    screenshots: `${baseDir}/screenshots`,
    emails: `${baseDir}/emails`,
  }
}

export default TEST_CONFIG
