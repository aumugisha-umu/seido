/**
 * Configuration des suites de tests pour le Master Test Runner
 */

export interface TestSuiteConfig {
  name: string
  description: string
  command: string
  config?: string
  timeout: number
  critical: boolean
  enabled: boolean
  tags: string[]
}

/**
 * Configuration complète de toutes les suites de tests
 */
export const TEST_SUITES: Record<string, TestSuiteConfig> = {
  // Phase 1: Tests d'authentification
  'auth-tests': {
    name: 'Authentication Tests',
    description: 'Tests de connexion, déconnexion, session management',
    command: 'npx playwright test',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 120000, // 2 minutes
    critical: true,
    enabled: true,
    tags: ['auth', 'phase1', 'critical']
  },

  // Phase 2: Tests de gestion des contacts
  'contacts-tests': {
    name: 'Contacts Management Tests',
    description: 'Tests CRUD contacts, invitations, gestion statuts',
    command: 'npx playwright test docs/refacto/Tests/tests/phase2-contacts',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 180000, // 3 minutes
    critical: true,
    enabled: true,
    tags: ['contacts', 'phase2', 'crud']
  },

  // Tests de workflow gestionnaire
  'gestionnaire-workflow': {
    name: 'Gestionnaire Workflow Tests',
    description: 'Dashboard, biens, lots, interventions (gestionnaire)',
    command: 'npx playwright test test/e2e/gestionnaire',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 240000, // 4 minutes
    critical: false,
    enabled: false, // À activer après migration
    tags: ['gestionnaire', 'workflow', 'dashboard']
  },

  // Tests de workflow locataire
  'locataire-workflow': {
    name: 'Locataire Workflow Tests',
    description: 'Dashboard, interventions (locataire)',
    command: 'npx playwright test test/e2e/locataire',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 180000, // 3 minutes
    critical: false,
    enabled: false, // À activer après migration
    tags: ['locataire', 'workflow', 'dashboard']
  },

  // Tests de workflow prestataire
  'prestataire-workflow': {
    name: 'Prestataire Workflow Tests',
    description: 'Dashboard, devis, interventions (prestataire)',
    command: 'npx playwright test test/e2e/prestataire',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 180000, // 3 minutes
    critical: false,
    enabled: false, // À activer après migration
    tags: ['prestataire', 'workflow', 'dashboard']
  },

  // Tests de performance
  'performance-baseline': {
    name: 'Performance Baseline Tests',
    description: 'Tests de performance des pages critiques',
    command: 'npx playwright test test/e2e/baseline',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 120000, // 2 minutes
    critical: false,
    enabled: false, // À activer après stabilisation
    tags: ['performance', 'baseline', 'metrics']
  },

  // Tests d'intervention complète (multi-rôle)
  'intervention-complete': {
    name: 'Complete Intervention Workflow',
    description: 'Workflow complet intervention (locataire → gestionnaire → prestataire)',
    command: 'npx playwright test test/e2e/workflows/intervention-complete.spec.ts',
    config: 'docs/refacto/Tests/config/playwright.e2e.config.ts',
    timeout: 300000, // 5 minutes
    critical: false,
    enabled: false, // À activer après migration
    tags: ['workflow', 'multi-role', 'integration', 'intervention']
  }
}

/**
 * Obtenir les suites enabled seulement
 */
export function getEnabledSuites(): TestSuiteConfig[] {
  return Object.values(TEST_SUITES).filter(suite => suite.enabled)
}

/**
 * Obtenir les suites critical seulement
 */
export function getCriticalSuites(): TestSuiteConfig[] {
  return Object.values(TEST_SUITES).filter(suite => suite.critical && suite.enabled)
}

/**
 * Obtenir les suites par tag
 */
export function getSuitesByTag(tag: string): TestSuiteConfig[] {
  return Object.values(TEST_SUITES).filter(
    suite => suite.enabled && suite.tags.includes(tag)
  )
}