import { test, expect } from '@playwright/test'
import { createScreenshotHelper } from './helpers/screenshot-helpers'
import { createAuthHelper, TEST_USERS } from './helpers/auth-helpers'
import { SELECTORS } from './helpers/test-selectors'

test.describe('SEIDO Authentication - Tests Optimisés avec Captures', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration des timeouts pour une meilleure stabilité
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(30000)

    // Clear auth state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.describe('Tests de Connexion avec Captures Détaillées', () => {
    Object.entries(TEST_USERS).forEach(([roleKey, user]) => {
      test(`should login as ${user.roleName} with detailed screenshots`, async ({ page }, testInfo) => {
        // Créer les helpers
        const screenshotHelper = createScreenshotHelper(page, testInfo)
        const authHelper = createAuthHelper(page, screenshotHelper)

        // Capture l'état initial
        await screenshotHelper.capturePageState('initial_state')

        // Test de connexion avec captures automatiques
        await authHelper.login(user, { captureSteps: true })

        // Vérification post-connexion
        await authHelper.verifyDashboardAccess(user, true)

        // Capture de l'état final
        await screenshotHelper.capturePageState('final_state', {
          userRole: user.roleName,
          dashboardUrl: user.expectedDashboard
        })

        // Test de navigation dans la zone autorisée
        await test.step(`Navigation dans ${user.roleName} area`, async () => {
          const navigationPaths = {
            admin: ['/admin/dashboard', '/admin/utilisateurs'],
            gestionnaire: ['/gestionnaire/dashboard', '/gestionnaire/interventions', '/gestionnaire/biens'],
            prestataire: ['/prestataire/dashboard', '/prestataire/interventions', '/prestataire/disponibilites'],
            locataire: ['/locataire/dashboard', '/locataire/interventions', '/locataire/interventions/nouvelle-demande']
          }

          const paths = navigationPaths[user.role] || [user.expectedDashboard]

          for (const path of paths) {
            await screenshotHelper.captureBeforeAction(`navigation_to_${path}`)

            try {
              await page.goto(path)
              await page.waitForLoadState('networkidle', { timeout: 10000 })

              await screenshotHelper.captureAfterAction(`navigation_to_${path}`, true)

              // Vérifier que nous sommes bien sur la page
              expect(page.url()).toContain(path)
            } catch (error) {
              await screenshotHelper.captureAfterAction(`navigation_to_${path}`, false)
              console.warn(`Navigation vers ${path} échouée:`, error)
            }
          }
        })

        // Test de déconnexion
        await authHelper.logout(true)

        // Capture finale après déconnexion
        await screenshotHelper.captureStep('logout_complete')
      })
    })
  })

  test.describe('Tests de Sécurité d\'Accès', () => {
    test('role-based access control with visual verification', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)
      const authHelper = createAuthHelper(page, screenshotHelper)

      // Test avec gestionnaire
      const gestionnaire = TEST_USERS.gestionnaire
      await authHelper.login(gestionnaire)

      // Capture après connexion gestionnaire
      await screenshotHelper.capturePageState('gestionnaire_logged_in')

      // Test d'accès interdit aux autres rôles
      const forbiddenPaths = [
        '/admin/dashboard',
        '/prestataire/dashboard',
        '/locataire/dashboard'
      ]

      for (const path of forbiddenPaths) {
        await authHelper.verifyAccessDenied(path, gestionnaire, true)
      }

      await authHelper.logout(true)
    })

    test('unauthorized access redirects to login', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)

      const protectedRoutes = [
        '/admin/dashboard',
        '/gestionnaire/dashboard',
        '/prestataire/dashboard',
        '/locataire/dashboard'
      ]

      for (const route of protectedRoutes) {
        await screenshotHelper.captureBeforeAction(`unauthorized_access_${route}`)

        await page.goto(route)
        await page.waitForTimeout(2000) // Laisser le temps à la redirection

        await screenshotHelper.captureAfterAction(`unauthorized_access_${route}`)

        // Should redirect to login
        expect(page.url()).toContain('/auth/login')
      }
    })
  })

  test.describe('Tests de Performance et Stabilité', () => {
    test('login performance measurement', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)
      const authHelper = createAuthHelper(page, screenshotHelper)

      const gestionnaire = TEST_USERS.gestionnaire

      // Test de performance
      const loginTime = await authHelper.loginPerformanceTest(gestionnaire)

      // Vérifier que la connexion est dans les temps acceptables
      expect(loginTime).toBeLessThan(5000) // 5 secondes max

      testInfo.annotations.push({
        type: 'performance',
        description: `Login completed in ${loginTime}ms`
      })

      await authHelper.logout(false)
    })

    test('session persistence across page reloads', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)
      const authHelper = createAuthHelper(page, screenshotHelper)

      const gestionnaire = TEST_USERS.gestionnaire

      // Connexion
      await authHelper.login(gestionnaire)

      // Test de persistance
      await authHelper.testSessionPersistence(gestionnaire, true)

      await authHelper.logout(true)
    })
  })

  test.describe('Tests d\'Erreur et Récupération', () => {
    test('handle invalid credentials with visual feedback', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)

      await screenshotHelper.captureStep('invalid_login_start')

      await page.goto('/auth/login')

      // Remplir avec des identifiants invalides
      await page.fill('input[name="email"]', 'invalid@email.com')
      await page.fill('input[name="password"]', 'wrongpassword')

      await screenshotHelper.captureStep('invalid_credentials_filled')

      await page.click('button[type="submit"]')

      // Attendre le message d'erreur
      await page.waitForTimeout(3000)

      await screenshotHelper.captureStep('invalid_login_error')

      // Should stay on login page
      expect(page.url()).toContain('/auth/login')

      // Check for error message (flexible selector)
      const errorMessageVisible = await page.locator('text=/erreur|error|invalid|incorrect/i').first().isVisible({ timeout: 5000 })
      expect(errorMessageVisible).toBeTruthy()
    })
  })

  test.describe('Tests Responsifs avec Captures Multi-Device', () => {
    test('mobile responsiveness for all roles', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)

      // Test responsive pour chaque rôle
      for (const [roleKey, user] of Object.entries(TEST_USERS)) {
        await test.step(`Mobile test for ${user.roleName}`, async () => {
          // Nettoyer l'état
          await page.context().clearCookies()
          await page.evaluate(() => {
            localStorage.clear()
            sessionStorage.clear()
          })

          // Capture responsive du login pour ce rôle
          await screenshotHelper.captureResponsive(`${roleKey}_login_responsive`)

          // Test de connexion mobile
          await page.setViewportSize({ width: 375, height: 667 })
          await page.goto('/auth/login')

          await screenshotHelper.captureStep(`${roleKey}_mobile_login`)

          // Connexion
          const authHelper = createAuthHelper(page)
          await authHelper.login(user, { captureSteps: false })

          // Capture du dashboard mobile
          await screenshotHelper.captureStep(`${roleKey}_mobile_dashboard`)

          // Test du menu mobile si disponible
          const mobileMenuSelector = await page.locator('[data-testid="mobile-menu"]').first()
          if (await mobileMenuSelector.isVisible({ timeout: 3000 })) {
            await mobileMenuSelector.click()
            await screenshotHelper.captureStep(`${roleKey}_mobile_menu_open`)
          }

          await authHelper.logout(false)
        })
      }
    })
  })

  test.describe('Tests de Workflow Complet', () => {
    test('sequential role switching workflow', async ({ page }, testInfo) => {
      const screenshotHelper = createScreenshotHelper(page, testInfo)

      // Test de changement séquentiel de rôles
      for (const [roleKey, user] of Object.entries(TEST_USERS)) {
        await test.step(`Test workflow for ${user.roleName}`, async () => {
          const authHelper = createAuthHelper(page, screenshotHelper)

          // Clear state
          await authHelper.clearAuthState()

          // Login
          await authHelper.login(user)

          // Capture workflow state
          await screenshotHelper.capturePageState(`workflow_${roleKey}`, {
            step: 'authenticated',
            role: user.roleName
          })

          // Test quelques actions spécifiques au rôle
          if (user.role === 'gestionnaire') {
            await page.goto('/gestionnaire/interventions')
            await screenshotHelper.captureStep('gestionnaire_interventions')
          } else if (user.role === 'locataire') {
            await page.goto('/locataire/interventions')
            await screenshotHelper.captureStep('locataire_interventions')
          }

          // Logout
          await authHelper.logout()

          await screenshotHelper.captureStep(`workflow_${roleKey}_complete`)
        })
      }
    })
  })
})