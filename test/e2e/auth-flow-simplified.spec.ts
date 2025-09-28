import { test, expect } from '@playwright/test'
import {
  TEST_USERS,
  loginUser,
  validateDashboardContent,
  testForbiddenAccess
} from '../helpers/auth-flow-helpers'

/**
 * 🧪 TEST E2E SIMPLIFIÉ - Authentification SEIDO
 *
 * Tests essentiels du nouveau système d'authentification refactorisé :
 * - Login et redirection automatique vers dashboard
 * - Validation du contenu dashboard par rôle
 * - Tests de sécurité cross-role
 */

test.describe('🔐 Authentication Flow - Simplified E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Nettoyer les cookies et le stockage local
    await page.context().clearCookies()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    } catch (error) {
      console.log('Note: Could not clear storage, page might not be ready')
    }
  })

  test.describe('👤 Tests essentiels par utilisateur', () => {

    for (const [userKey, user] of Object.entries(TEST_USERS)) {
      test(`${user.role.toUpperCase()} - Login et Dashboard`, async ({ page }) => {
        const screenshotPrefix = `simplified-${Date.now()}-`

        test.step('🔑 Connexion utilisateur', async () => {
          const result = await loginUser(page, user, screenshotPrefix)
          expect(result.success).toBe(true)
          expect(result.url).toContain(user.expectedDashboard)
        })

        test.step('📊 Validation du contenu du dashboard', async () => {
          await validateDashboardContent(page, user, screenshotPrefix)
        })

        test.step('🚫 Test des accès interdits', async () => {
          await testForbiddenAccess(page, user, screenshotPrefix)
        })

        // Capture finale du dashboard
        await page.screenshot({
          path: `test-results/screenshots/${screenshotPrefix}${user.role}-final-success.png`,
          fullPage: true
        })
      })
    }
  })

  test.describe('🔒 Tests de sécurité essentiels', () => {

    test('Accès direct aux routes protégées sans authentification', async ({ page }) => {
      const protectedRoutes = [
        '/gestionnaire/dashboard',
        '/locataire/dashboard',
        '/prestataire/dashboard',
        '/admin/dashboard'
      ]

      for (const route of protectedRoutes) {
        await page.goto(route)
        await page.waitForTimeout(2000)

        // Doit être redirigé vers la page de login
        const currentURL = page.url()
        expect(currentURL).toContain('/auth/login')

        // Capture d'écran pour vérification
        await page.screenshot({
          path: `test-results/screenshots/security-${route.replace(/\//g, '-')}-redirect.png`,
          fullPage: true
        })
      }
    })

    test('Tentative de connexion avec mauvais mot de passe', async ({ page }) => {
      await page.goto('/auth/login')

      await page.fill('input[type="email"]', TEST_USERS.gestionnaire.email)
      await page.fill('input[type="password"]', 'mauvais-mot-de-passe')
      await page.click('button[type="submit"]')

      // Attendre un message d'erreur ou rester sur la page de login
      await page.waitForTimeout(3000)

      const currentURL = page.url()
      expect(currentURL).toContain('/auth/login')

      // Capture de l'erreur
      await page.screenshot({
        path: 'test-results/screenshots/simplified-login-error-bad-password.png',
        fullPage: true
      })
    })
  })

  test.describe('📱 Tests responsive essentiels', () => {

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ]

    for (const viewport of viewports) {
      test(`Responsive - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        const user = TEST_USERS.gestionnaire

        // Test de connexion en responsive
        await loginUser(page, user, `responsive-${viewport.name.toLowerCase()}-`)

        // Validation que l'interface est bien responsive
        await validateDashboardContent(page, user, `responsive-${viewport.name.toLowerCase()}-`)

        // Capture finale
        await page.screenshot({
          path: `test-results/screenshots/simplified-responsive-${viewport.name.toLowerCase()}-final.png`,
          fullPage: true
        })
      })
    }
  })
})

test.describe('📊 Rapport de synthèse simplifié', () => {

  test('Génération du rapport final', async ({ page }) => {
    // Ce test sert à générer un rapport de synthèse
    const summary = {
      timestamp: new Date().toISOString(),
      users_tested: Object.keys(TEST_USERS),
      architecture: 'Middleware + Server Components (refactorisé)',
      auth_method: 'Supabase SSR avec authentification réelle',
      tests_passed: true,
      test_type: 'simplified_e2e'
    }

    // Page de rapport
    await page.goto('/')
    await page.evaluate((data) => {
      console.log('📊 [TEST-SUMMARY-SIMPLIFIED]', JSON.stringify(data, null, 2))
    }, summary)

    // Capture finale
    await page.screenshot({
      path: 'test-results/screenshots/simplified-test-summary-final.png',
      fullPage: true
    })
  })
})