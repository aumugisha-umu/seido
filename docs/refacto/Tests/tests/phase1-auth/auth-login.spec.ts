/**
 * Tests d'Authentification - Connexion
 * Tests E2E complets pour la connexion avec tous les rôles utilisateur
 */

import { test, expect, Page } from '@playwright/test'
import { E2ETestLogger, TestExecutionSummary } from '../../helpers/e2e-test-logger'
import { SeidoDebuggerAgent } from '../../helpers/seido-debugger-agent'
import { TEST_USERS, TestUser, SECURITY_CONFIG, TestUserManager } from '../../fixtures/users.fixture'

// Configuration globale pour cette suite de tests
test.describe.configure({ mode: 'serial' }) // Exécution séquentielle pour éviter les conflits

test.describe('🔐 Phase 1 - Authentication Login Tests', () => {
  let testSummaries: TestExecutionSummary[] = []
  let debuggerAgent: SeidoDebuggerAgent

  test.beforeAll(async () => {
    // Initialiser l'agent debugger
    debuggerAgent = new SeidoDebuggerAgent()

    // Valider les données de test
    const validation = require('../../fixtures/users.fixture').validateTestUsers()
    if (!validation.valid) {
      throw new Error(`Invalid test data: ${validation.errors.join(', ')}`)
    }

    console.log('🚀 Starting authentication login tests suite')
  })

  test.afterAll(async () => {
    // Analyser tous les résultats avec l'agent debugger
    if (testSummaries.length > 0) {
      console.log('🧠 Running debugger analysis...')
      const analysis = await debuggerAgent.analyzeTestRun(testSummaries)

      console.log(`📊 Analysis complete: ${analysis.recommendations.length} recommendations generated`)
      console.log(`📁 Reports saved to: ${analysis.reportPaths.html}`)

      // Afficher les recommandations critiques
      const criticalRecommendations = analysis.recommendations.filter(r => r.priority === 'critical')
      if (criticalRecommendations.length > 0) {
        console.log('🚨 Critical recommendations:')
        criticalRecommendations.forEach(rec => {
          console.log(`  - ${rec.description}`)
        })
      }
    }
  })

  // Helper function pour nettoyer les sessions entre les tests
  async function cleanupSession(page: Page): Promise<void> {
    try {
      await page.goto('/auth/logout')
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    } catch (error) {
      // Si la déconnexion échoue, nettoyer manuellement
      await page.context().clearCookies()
      await page.goto('/auth/login')
    }
  }

  // Test pour chaque rôle utilisateur
  for (const [roleName, user] of Object.entries(TEST_USERS)) {
    test(`✅ Login successful - ${roleName} (${user.name})`, async ({ page }) => {
      const testLogger = new E2ETestLogger(`login-${roleName}`, user.role)

      try {
        // Étape 1: Navigation vers la page de login
        await testLogger.logStep('Navigate to login page', page)
        await page.goto('/auth/login')
        await page.waitForLoadState('networkidle')

        // Vérifier que nous sommes sur la bonne page
        await expect(page).toHaveURL(/.*\/auth\/login/)
        await testLogger.logStep('Login page loaded', page)

        // Étape 2: Remplir le formulaire de connexion
        await testLogger.logStep('Fill login form', page, {
          email: user.email,
          role: user.role
        })

        // Saisir l'email
        const emailInput = page.locator('input[type="email"], input[name="email"]')
        await expect(emailInput).toBeVisible({ timeout: 10000 })
        await emailInput.fill(user.email)

        // Saisir le mot de passe
        const passwordInput = page.locator('input[type="password"], input[name="password"]')
        await expect(passwordInput).toBeVisible()
        await passwordInput.fill(user.password)

        await testLogger.logStep('Form filled successfully', page)

        // Étape 3: Soumettre le formulaire
        const submitButton = page.locator('button[type="submit"], button:has-text("Se connecter"), button:has-text("Login")')
        await expect(submitButton).toBeVisible()
        await expect(submitButton).toBeEnabled()

        await testLogger.logStep('Submit login form', page)
        await submitButton.click()

        // Étape 4: Attendre la redirection vers le dashboard
        await testLogger.logStep('Wait for redirect to dashboard', page, {
          expectedDashboard: user.expectedDashboard
        })

        // Attendre avec un timeout généreux pour les redirections
        await page.waitForURL(`**${user.expectedDashboard}**`, {
          timeout: SECURITY_CONFIG.authTimeout
        })

        // Vérifier que nous sommes sur le bon dashboard
        await expect(page).toHaveURL(new RegExp(user.expectedDashboard.replace('/', '\\/')))
        await testLogger.logStep('Redirected to correct dashboard', page, {
          actualUrl: page.url(),
          expectedDashboard: user.expectedDashboard
        })

        // Étape 5: Vérifier que le contenu du dashboard est chargé
        await testLogger.logStep('Verify dashboard content', page)

        // Attendre qu'au moins un élément principal soit chargé (titre h1)
        const mainTitle = page.locator('h1').first()
        await expect(mainTitle).toBeVisible({ timeout: 15000 })

        // Vérifier la présence du menu utilisateur (signe de bonne auth)
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("' + user.name + '")')
        await expect(userMenu.first()).toBeVisible({ timeout: 10000 })

        await testLogger.logStep('Dashboard fully loaded', page, {
          titleText: await mainTitle.textContent(),
          userMenuVisible: await userMenu.first().isVisible()
        })

        // Étape 6: Vérifier les éléments spécifiques au rôle
        await testLogger.logStep('Verify role-specific content', page)

        // Vérifications spécifiques par rôle
        switch (user.role) {
          case 'admin':
            // Les admins devraient voir des statistiques système
            await expect(page.locator('text=Utilisateurs Total, text=système')).toBeVisible({ timeout: 5000 })
            break

          case 'gestionnaire':
            // Les gestionnaires devraient voir la gestion d'équipe
            await expect(page.locator('text=équipe, text=bâtiment, text=intervention')).toBeVisible({ timeout: 5000 })
            break

          case 'locataire':
            // Les locataires devraient voir leurs informations de logement
            await expect(page.locator('text=logement, text=intervention, text=locataire')).toBeVisible({ timeout: 5000 })
            break

          case 'prestataire':
            // Les prestataires devraient voir leurs interventions assignées
            await expect(page.locator('text=intervention, text=assigné, text=prestataire')).toBeVisible({ timeout: 5000 })
            break
        }

        await testLogger.logStep('Role-specific content verified', page, {
          role: user.role,
          contentValidated: true
        })

        // Test réussi
        const summary = await testLogger.finalize()
        testSummaries.push(summary)

        console.log(`✅ Login test passed for ${roleName}: ${summary.successfulSteps}/${summary.totalSteps} steps`)

      } catch (error) {
        await testLogger.logError(error as Error, 'Login test execution', page)
        const summary = await testLogger.finalize()
        testSummaries.push(summary)

        console.error(`❌ Login test failed for ${roleName}:`, error)
        throw error

      } finally {
        // Nettoyer la session après chaque test
        await cleanupSession(page)
      }
    })
  }

  // Test d'authentification échouée
  test('❌ Login failed - Invalid credentials', async ({ page }) => {
    const testLogger = new E2ETestLogger('login-failed', 'unknown')

    try {
      await testLogger.logStep('Navigate to login page', page)
      await page.goto('/auth/login')

      await testLogger.logStep('Fill invalid credentials', page, {
        email: 'invalid@example.com',
        password: 'WrongPassword123'
      })

      // Remplir avec de mauvaises données
      await page.fill('input[type="email"]', 'invalid@example.com')
      await page.fill('input[type="password"]', 'WrongPassword123')

      await testLogger.logStep('Submit invalid login', page)
      await page.click('button[type="submit"]')

      // Vérifier qu'une erreur est affichée
      await testLogger.logStep('Verify error message displayed', page)

      // Attendre l'affichage d'un message d'erreur
      const errorMessage = page.locator('.error, [role="alert"], .text-red-500, .text-destructive')
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })

      // Vérifier qu'on reste sur la page de login
      await expect(page).toHaveURL(/.*\/auth\/login/)

      await testLogger.logStep('Invalid login properly rejected', page, {
        errorDisplayed: true,
        remainedOnLoginPage: true
      })

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

      console.log('✅ Invalid login test passed: Error properly displayed')

    } catch (error) {
      await testLogger.logError(error as Error, 'Invalid login test', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)

      console.error('❌ Invalid login test failed:', error)
      throw error
    }
  })

  // Test de champs vides
  test('❌ Login failed - Empty fields', async ({ page }) => {
    const testLogger = new E2ETestLogger('login-empty-fields', 'unknown')

    try {
      await testLogger.logStep('Navigate to login page', page)
      await page.goto('/auth/login')

      await testLogger.logStep('Try to submit empty form', page)

      // Cliquer sur submit sans remplir
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      await testLogger.logStep('Verify validation errors', page)

      // Vérifier la validation côté client
      const emailInput = page.locator('input[type="email"]')
      const emailValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
      expect(emailValid).toBe(false)

      // Vérifier qu'on reste sur la page de login
      await expect(page).toHaveURL(/.*\/auth\/login/)

      await testLogger.logStep('Empty form validation working', page, {
        formValidationActive: true,
        remainedOnLoginPage: true
      })

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

      console.log('✅ Empty fields test passed: Validation working correctly')

    } catch (error) {
      await testLogger.logError(error as Error, 'Empty fields test', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)

      console.error('❌ Empty fields test failed:', error)
      throw error
    }
  })

  // Test de performance de login
  test('⚡ Login performance benchmark', async ({ page }) => {
    const testLogger = new E2ETestLogger('login-performance', 'gestionnaire')
    const user = TEST_USERS.gestionnaire

    try {
      // Mesurer le temps total de login
      const startTime = Date.now()

      await testLogger.logStep('Start performance test', page)
      await page.goto('/auth/login')

      const pageLoadTime = Date.now()
      testLogger.logPerformance('Page load', {
        stepDuration: pageLoadTime - startTime
      })

      await page.fill('input[type="email"]', user.email)
      await page.fill('input[type="password"]', user.password)

      const formFillTime = Date.now()
      testLogger.logPerformance('Form fill', {
        stepDuration: formFillTime - pageLoadTime
      })

      await testLogger.logStep('Submit and measure redirect', page)
      await page.click('button[type="submit"]')

      await page.waitForURL(`**${user.expectedDashboard}**`, { timeout: 15000 })
      const redirectTime = Date.now()

      testLogger.logPerformance('Auth and redirect', {
        stepDuration: redirectTime - formFillTime
      })

      await page.waitForSelector('h1', { timeout: 10000 })
      const dashboardLoadTime = Date.now()

      testLogger.logPerformance('Dashboard load', {
        stepDuration: dashboardLoadTime - redirectTime
      })

      const totalTime = dashboardLoadTime - startTime

      await testLogger.logStep('Performance test complete', page, {
        totalLoginTime: totalTime,
        pageLoad: pageLoadTime - startTime,
        authRedirect: redirectTime - formFillTime,
        dashboardLoad: dashboardLoadTime - redirectTime
      })

      // Vérifier les seuils de performance
      expect(totalTime).toBeLessThan(10000) // Moins de 10 secondes total
      console.log(`⚡ Login performance: ${totalTime}ms total`)

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Performance test', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)

      throw error

    } finally {
      await cleanupSession(page)
    }
  })
})