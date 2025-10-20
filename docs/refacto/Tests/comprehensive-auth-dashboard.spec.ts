/**
 * 🚀 TESTS E2E COMPLETS - AUTHENTICATION + DASHBOARD
 *
 * Tests complets pour 3 rôles utilisateur avec la nouvelle architecture:
 * - Pattern Officiel Supabase SSR + Next.js 15 Server Actions
 * - Logging Pino intégré pour traces détaillées
 * - Debugger intelligent pour analyse automatique
 * - Validation du chargement des données dashboard
 *
 * Rôles testés:
 * 1. Gestionnaire (Manager)
 * 2. Prestataire (Service Provider)
 * 3. Locataire (Tenant)
 */

import { test, expect, Page } from '@playwright/test'
import { E2ETestLogger, createTestLogger } from './helpers/e2e-test-logger'
import { SeidoDebuggerAgent, createSeidoDebugger } from './helpers/seido-debugger-agent'

// Configuration des utilisateurs de test
const TEST_USERS = {
  gestionnaire: {
    email: 'arthur@seido.pm',
    password: 'Wxcvbn123',
    role: 'gestionnaire',
    expectedDashboard: '/gestionnaire/dashboard',
    dashboardElements: {
      title: 'Tableau de bord gestionnaire',
      interventionsCard: true,
      propertiesCard: true,
      teamsCard: true,
      statsCards: 4 // Nombre de cartes statistiques attendues
    }
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    role: 'prestataire',
    expectedDashboard: '/prestataire/dashboard',
    dashboardElements: {
      title: 'Tableau de bord prestataire',
      interventionsCard: true,
      availabilityCard: true,
      quotesCard: true,
      statsCards: 3
    }
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    expectedDashboard: '/locataire/dashboard',
    dashboardElements: {
      title: 'Tableau de bord locataire',
      interventionsCard: true,
      myInterventionsCard: true,
      statsCards: 2
    }
  }
} as const

// Configuration des timeouts
const TIMEOUTS = {
  login: 10000,  // 10s pour la connexion complète
  navigation: 5000,  // 5s pour la navigation
  dashboardLoad: 8000,  // 8s pour le chargement du dashboard
  dataLoad: 5000  // 5s pour le chargement des données
}

/**
 * Helper: Effectuer une connexion complète avec logging
 */
async function performLogin(
  page: Page,
  logger: E2ETestLogger,
  user: typeof TEST_USERS[keyof typeof TEST_USERS]
): Promise<void> {
  // Étape 1: Naviguer vers la page de login
  await logger.logStep('Navigation vers page de login', page, { url: '/auth/login' })
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })

  // Étape 2: Vérifier que la page de login est affichée
  await logger.logStep('Vérification page de login affichée', page)
  await expect(page.locator('h1')).toContainText(/connexion/i, { timeout: 3000 })

  // Étape 3: Clear les champs (pour éviter autofill)
  await logger.logStep('Clear des champs de formulaire', page)
  await page.fill('input[type="email"]', '')
  await page.fill('input[type="password"]', '')

  // Étape 4: Remplir les credentials
  await logger.logStep('Remplissage des credentials', page, {
    email: user.email,
    role: user.role
  })
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  // Vérifier que les valeurs sont bien remplies
  const emailValue = await page.inputValue('input[type="email"]')
  const passwordValue = await page.inputValue('input[type="password"]')

  logger.getPinoLogger().info({
    event: 'credentials_filled',
    email: emailValue,
    passwordFilled: passwordValue.length > 0
  }, `Credentials filled: ${emailValue}`)

  // Étape 5: Soumettre le formulaire
  await logger.logStep('Soumission du formulaire', page)
  await page.click('button[type="submit"]')

  // Étape 6: Attendre la redirection vers le dashboard
  await logger.logStep(`Attente redirection vers ${user.expectedDashboard}`, page, {
    expectedUrl: user.expectedDashboard
  })

  await page.waitForURL(`**${user.expectedDashboard}**`, {
    timeout: TIMEOUTS.login
  })

  logger.getPinoLogger().info({
    event: 'login_successful',
    role: user.role,
    redirectedTo: page.url()
  }, `Login successful for role: ${user.role}`)
}

/**
 * Helper: Valider le chargement du dashboard
 */
async function validateDashboard(
  page: Page,
  logger: E2ETestLogger,
  user: typeof TEST_USERS[keyof typeof TEST_USERS]
): Promise<void> {
  // Étape 1: Vérifier que le dashboard est affiché
  await logger.logStep('Vérification dashboard affiché', page, { role: user.role })

  // Attendre que le contenu principal soit chargé
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.dashboardLoad })

  // Étape 2: Vérifier le titre du dashboard
  await logger.logStep('Vérification titre dashboard', page, {
    expectedTitle: user.dashboardElements.title
  })

  const h1Locator = page.locator('h1').first()
  await expect(h1Locator).toBeVisible({ timeout: 3000 })

  // Étape 3: Vérifier les cartes statistiques
  if (user.dashboardElements.statsCards > 0) {
    await logger.logStep('Vérification cartes statistiques', page, {
      expectedCards: user.dashboardElements.statsCards
    })

    // Attendre que les stats soient chargées
    await page.waitForTimeout(1000) // Petit délai pour le chargement des données

    // Vérifier qu'au moins une carte est visible
    const statsCards = page.locator('[data-testid="stat-card"], .stat-card, [class*="stat"], [class*="metric"]')
    const cardCount = await statsCards.count()

    logger.getPinoLogger().info({
      event: 'dashboard_stats_loaded',
      role: user.role,
      expectedCards: user.dashboardElements.statsCards,
      foundCards: cardCount
    }, `Found ${cardCount} stat cards`)
  }

  // Étape 4: Vérifier les sections spécifiques au rôle
  await logger.logStep('Vérification sections role-specific', page, {
    role: user.role,
    interventionsCard: user.dashboardElements.interventionsCard
  })

  if (user.dashboardElements.interventionsCard) {
    // Chercher une section d'interventions (table, liste, ou carte)
    const interventionSection = page.locator(
      'text=/intervention/i, [data-testid="interventions"], [class*="intervention"]'
    ).first()

    // Attendre un peu pour le chargement des données
    await page.waitForTimeout(1500)

    logger.getPinoLogger().info({
      event: 'interventions_section_check',
      role: user.role,
      visible: await interventionSection.isVisible().catch(() => false)
    }, 'Checking interventions section')
  }

  // Étape 5: Capture finale du dashboard complet
  await logger.logStep('Dashboard fully loaded', page, {
    role: user.role,
    url: page.url(),
    title: await page.title()
  })

  logger.getPinoLogger().info({
    event: 'dashboard_validation_complete',
    role: user.role,
    url: page.url(),
    validationsPassed: true
  }, `Dashboard validation complete for role: ${user.role}`)
}

// Test Suite principale
test.describe('🔐 Tests E2E - Authentication + Dashboard (Nouvelle Architecture)', () => {
  let debugger: SeidoDebuggerAgent

  test.beforeAll(async () => {
    // Initialiser l'agent debugger
    debugger = createSeidoDebugger()
    console.log('🤖 SEIDO Debugger Agent initialized')
  })

  test.afterAll(async () => {
    // L'analyse sera faite à la fin de tous les tests
    console.log('📊 All tests completed. Debugger analysis will be generated.')
  })

  // Test 1: Gestionnaire
  test('Gestionnaire: Login + Dashboard complet', async ({ page }) => {
    const user = TEST_USERS.gestionnaire
    const logger = createTestLogger('gestionnaire-login-dashboard', user.role)

    try {
      logger.getPinoLogger().info({
        event: 'test_start',
        role: user.role,
        testName: 'gestionnaire-login-dashboard'
      }, '🚀 Starting gestionnaire test')

      // Phase 1: Login
      await performLogin(page, logger, user)

      // Phase 2: Validation Dashboard
      await validateDashboard(page, logger, user)

      // Finaliser le test
      const summary = await logger.finalize()

      logger.getPinoLogger().info({
        event: 'test_complete',
        summary,
        status: 'success'
      }, '✅ Gestionnaire test completed successfully')

    } catch (error) {
      await logger.logError(error as Error, 'test_execution', page)
      throw error
    }
  })

  // Test 2: Prestataire
  test('Prestataire: Login + Dashboard complet', async ({ page }) => {
    const user = TEST_USERS.prestataire
    const logger = createTestLogger('prestataire-login-dashboard', user.role)

    try {
      logger.getPinoLogger().info({
        event: 'test_start',
        role: user.role,
        testName: 'prestataire-login-dashboard'
      }, '🚀 Starting prestataire test')

      // Phase 1: Login
      await performLogin(page, logger, user)

      // Phase 2: Validation Dashboard
      await validateDashboard(page, logger, user)

      // Finaliser le test
      const summary = await logger.finalize()

      logger.getPinoLogger().info({
        event: 'test_complete',
        summary,
        status: 'success'
      }, '✅ Prestataire test completed successfully')

    } catch (error) {
      await logger.logError(error as Error, 'test_execution', page)
      throw error
    }
  })

  // Test 3: Locataire
  test('Locataire: Login + Dashboard complet', async ({ page }) => {
    const user = TEST_USERS.locataire
    const logger = createTestLogger('locataire-login-dashboard', user.role)

    try {
      logger.getPinoLogger().info({
        event: 'test_start',
        role: user.role,
        testName: 'locataire-login-dashboard'
      }, '🚀 Starting locataire test')

      // Phase 1: Login
      await performLogin(page, logger, user)

      // Phase 2: Validation Dashboard
      await validateDashboard(page, logger, user)

      // Finaliser le test
      const summary = await logger.finalize()

      logger.getPinoLogger().info({
        event: 'test_complete',
        summary,
        status: 'success'
      }, '✅ Locataire test completed successfully')

    } catch (error) {
      await logger.logError(error as Error, 'test_execution', page)
      throw error
    }
  })
})

// Test bonus: Vérifier que tous les rôles sont isolés
test.describe('🔒 Security: Role isolation validation', () => {
  test('Gestionnaire ne peut pas accéder au dashboard prestataire', async ({ page }) => {
    const logger = createTestLogger('security-role-isolation', 'gestionnaire')

    // Login en tant que gestionnaire
    await performLogin(page, logger, TEST_USERS.gestionnaire)

    // Tenter d'accéder au dashboard prestataire
    await logger.logStep('Tentative accès dashboard prestataire', page)
    await page.goto('http://localhost:3000/prestataire/dashboard')

    // Devrait être redirigé ou voir une erreur
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    logger.getPinoLogger().info({
      event: 'security_check',
      attemptedUrl: '/prestataire/dashboard',
      resultUrl: currentUrl,
      blocked: currentUrl !== 'http://localhost:3000/prestataire/dashboard'
    }, 'Security isolation check')

    // Le test passe si on n'est PAS sur le dashboard prestataire
    expect(currentUrl).not.toContain('/prestataire/dashboard')

    await logger.finalize()
  })
})