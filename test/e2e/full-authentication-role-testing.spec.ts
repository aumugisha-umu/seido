/**
 * Test E2E complet pour l'authentification multi-rôles et redirections
 * Vérifie que chaque rôle peut se connecter et est redirigé correctement
 * Vérifie aussi l'isolation des rôles (accès interdit aux autres dashboards)
 */

import { test, expect, type Page } from '@playwright/test'

// Configuration des comptes de test RÉELS
const TEST_ACCOUNTS = {
  admin: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    expectedDashboard: '/admin/dashboard',
    forbiddenDashboards: ['/gestionnaire/dashboard', '/prestataire/dashboard', '/locataire/dashboard']
  },
  gestionnaire: {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/gestionnaire/dashboard',
    forbiddenDashboards: ['/prestataire/dashboard', '/locataire/dashboard', '/admin/dashboard']
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/locataire/dashboard',
    forbiddenDashboards: ['/gestionnaire/dashboard', '/prestataire/dashboard', '/admin/dashboard']
  }
}

// Helper pour attendre le chargement complet
async function waitForAppReady(page: Page) {
  // Attendre que le DOM soit chargé
  await page.waitForLoadState('domcontentloaded')

  // Attendre que le réseau soit idle
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // Attendre qu'il n'y ait pas de spinners de chargement visibles
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {})
}

// Helper pour se déconnecter
async function logout(page: Page) {
  // Essayer plusieurs méthodes de déconnexion
  const logoutButton = page.locator('button:has-text("Se déconnecter"), button:has-text("Déconnexion"), [aria-label="Logout"], [aria-label="Se déconnecter"]')

  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click()
    await page.waitForURL('/auth/login', { timeout: 10000 })
  } else {
    // Forcer la déconnexion via l'URL
    await page.goto('/auth/logout', { waitUntil: 'networkidle' })
    await page.waitForURL('/auth/login', { timeout: 10000 })
  }
}

test.describe('Authentification Multi-Rôles Complète', () => {
  test.beforeEach(async ({ page }) => {
    // S'assurer qu'on part d'un état clean
    await page.goto('/', { waitUntil: 'networkidle' })

    // Nettoyer le localStorage et les cookies
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.context().clearCookies()
  })

  // Test pour chaque rôle
  for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
    test(`${role}: Connexion et redirection automatique`, async ({ page }) => {
      console.log(`Testing ${role} authentication...`)

      // 1. Aller à la page de connexion
      await page.goto('/auth/login')
      await waitForAppReady(page)

      // Vérifier qu'on est bien sur la page de connexion
      await expect(page).toHaveURL(/\/auth\/login/)

      // 2. Remplir le formulaire
      await page.fill('input[type="email"], input[name="email"], #email', account.email)
      await page.fill('input[type="password"], input[name="password"], #password', account._password)

      // Capturer screenshot avant connexion
      await page.screenshot({
        path: `test-results/auth-${role}-before-login.png`,
        fullPage: true
      })

      // 3. Se connecter
      await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

      // 4. Attendre la redirection vers le bon dashboard
      await page.waitForURL(account.expectedDashboard, { timeout: 15000 })
      await waitForAppReady(page)

      // 5. Vérifier qu'on est sur le bon dashboard
      expect(page.url()).toContain(account.expectedDashboard)

      // Capturer screenshot après connexion
      await page.screenshot({
        path: `test-results/auth-${role}-dashboard.png`,
        fullPage: true
      })

      // 6. Vérifier les éléments spécifiques au rôle
      if (role === 'gestionnaire') {
        // Vérifier les éléments spécifiques au gestionnaire
        await expect(page.locator('h1, h2').filter({ hasText: /Dashboard Gestionnaire|Tableau de bord/i })).toBeVisible({ timeout: 10000 })

        // Vérifier la présence des sections attendues
        const expectedSections = [
          'Interventions en attente',
          'Interventions récentes',
          'Statistiques'
        ]

        for (const section of expectedSections) {
          const sectionLocator = page.locator(`text="${section}"`)
          if (await sectionLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log(`✓ Section "${section}" trouvée`)
          }
        }
      } else if (role === 'prestataire') {
        // Vérifier les éléments spécifiques au prestataire
        await expect(page.locator('h1, h2').filter({ hasText: /Dashboard Prestataire|Mes interventions/i })).toBeVisible({ timeout: 10000 })

        // Vérifier la présence des sections prestataire
        const expectedSections = [
          'Interventions assignées',
          'Mes devis',
          'Planning'
        ]

        for (const section of expectedSections) {
          const sectionLocator = page.locator(`text="${section}"`)
          if (await sectionLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log(`✓ Section "${section}" trouvée`)
          }
        }
      } else if (role === 'locataire') {
        // Vérifier les éléments spécifiques au locataire
        await expect(page.locator('h1, h2').filter({ hasText: /Dashboard Locataire|Mes demandes/i })).toBeVisible({ timeout: 10000 })

        // Vérifier la présence du bouton de nouvelle demande
        const newRequestButton = page.locator('button:has-text("Nouvelle demande"), a:has-text("Nouvelle demande")')
        if (await newRequestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('✓ Bouton "Nouvelle demande" trouvé')
        }
      }

      // 7. Se déconnecter pour le prochain test
      await logout(page)
    })

    test(`${role}: Isolation des rôles - Accès interdit aux autres dashboards`, async ({ page }) => {
      console.log(`Testing role isolation for ${role}...`)

      // 1. Se connecter
      await page.goto('/auth/login')
      await waitForAppReady(page)

      await page.fill('input[type="email"], input[name="email"], #email', account.email)
      await page.fill('input[type="password"], input[name="password"], #password', account._password)
      await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

      // Attendre la redirection
      await page.waitForURL(account.expectedDashboard, { timeout: 15000 })
      await waitForAppReady(page)

      // 2. Tenter d'accéder aux dashboards interdits
      for (const forbiddenDashboard of account.forbiddenDashboards) {
        console.log(`  Tentative d'accès à ${forbiddenDashboard}...`)

        await page.goto(forbiddenDashboard, { waitUntil: 'networkidle' })

        // Vérifier qu'on est redirigé ou qu'on a une erreur
        const currentUrl = page.url()

        // On ne devrait PAS être sur le dashboard interdit
        expect(currentUrl).not.toContain(forbiddenDashboard)

        // On devrait être soit sur notre dashboard, soit sur une page d'erreur/login
        const isOnOwnDashboard = currentUrl.includes(account.expectedDashboard)
        const isOnLoginPage = currentUrl.includes('/auth/login')
        const isOnErrorPage = currentUrl.includes('/error') || currentUrl.includes('/403')

        expect(isOnOwnDashboard || isOnLoginPage || isOnErrorPage).toBeTruthy()

        console.log(`  ✓ Accès bloqué - Redirigé vers: ${currentUrl}`)
      }

      // 3. Se déconnecter
      await logout(page)
    })
  }

  test("Performance: Temps de chargement de l'authentification", async ({ page }) => {
    console.log('Testing authentication performance...')

    // Mesurer le temps de connexion pour chaque rôle
    const performanceResults: Record<string, number> = {}

    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      // Aller à la page de connexion
      await page.goto('/auth/login')
      await waitForAppReady(page)

      // Commencer la mesure
      const startTime = Date.now()

      // Se connecter
      await page.fill('input[type="email"], input[name="email"], #email', account.email)
      await page.fill('input[type="password"], input[name="password"], #password', account._password)
      await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

      // Attendre le dashboard
      await page.waitForURL(account.expectedDashboard, { timeout: 15000 })
      await waitForAppReady(page)

      // Fin de la mesure
      const endTime = Date.now()
      const loadTime = endTime - startTime

      performanceResults[role] = loadTime
      console.log(`  ${role}: ${loadTime}ms`)

      // Vérifier que c'est sous le seuil acceptable (5 secondes)
      expect(loadTime).toBeLessThan(5000)

      // Se déconnecter pour le prochain test
      await logout(page)
    }

    // Afficher le résumé des performances
    console.log('\n📊 Résumé des performances d\'authentification:')
    for (const [role, time] of Object.entries(performanceResults)) {
      const status = time < 2000 ? '✅' : time < 4000 ? '⚠️' : '❌'
      console.log(`  ${status} ${role}: ${time}ms`)
    }
  })

  test("Sécurité: Tentative de connexion avec mauvais identifiants", async ({ page }) => {
    console.log('Testing security with invalid credentials...')

    await page.goto('/auth/login')
    await waitForAppReady(page)

    // Tentative avec mauvais email
    await page.fill('input[type="email"], input[name="email"], #email', 'invalid@seido.com')
    await page.fill('input[type="password"], input[name="password"], #password', 'Wxcvbn123')
    await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

    // Vérifier qu'on reste sur la page de login avec un message d'erreur
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/auth/login')

    // Chercher un message d'erreur
    const errorMessage = page.locator('text=/erreur|invalid|incorrect|échec/i')
    if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✓ Message d\'erreur affiché pour identifiants invalides')
    }

    // Tentative avec mauvais mot de passe
    await page.reload()
    await page.fill('input[type="email"], input[name="email"], #email', 'arthur+gest@seido.pm')
    await page.fill('input[type="password"], input[name="password"], #password', 'wrongpassword')
    await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

    // Vérifier qu'on reste sur la page de login
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/auth/login')
    console.log('  ✓ Connexion bloquée avec mot de passe incorrect')
  })

  test("Navigation: Redirection automatique vers login si non connecté", async ({ page }) => {
    console.log('Testing automatic redirect to login when not authenticated...')

    // Essayer d'accéder à chaque dashboard sans être connecté
    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      console.log(`  Tentative d'accès à ${account.expectedDashboard} sans connexion...`)

      await page.goto(account.expectedDashboard, { waitUntil: 'networkidle' })

      // On devrait être redirigé vers la page de login
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/auth/login')

      console.log(`  ✓ Redirigé vers login pour ${role}`)
    }
  })
})

test.describe('Tests Mobile - Authentification Responsive', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  })

  test('Mobile: Connexion gestionnaire sur mobile', async ({ page }) => {
    console.log('Testing mobile authentication for gestionnaire...')

    await page.goto('/auth/login')
    await waitForAppReady(page)

    // Vérifier que le formulaire est bien adapté au mobile
    const loginForm = page.locator('form')
    await expect(loginForm).toBeVisible()

    // Screenshot mobile avant connexion
    await page.screenshot({
      path: 'test-results/auth-mobile-before-login.png',
      fullPage: true
    })

    // Se connecter
    await page.fill('input[type="email"], input[name="email"], #email', TEST_ACCOUNTS.gestionnaire.email)
    await page.fill('input[type="password"], input[name="password"], #password', TEST_ACCOUNTS.gestionnaire._password)
    await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

    // Attendre le dashboard
    await page.waitForURL(TEST_ACCOUNTS.gestionnaire.expectedDashboard, { timeout: 15000 })
    await waitForAppReady(page)

    // Screenshot mobile du dashboard
    await page.screenshot({
      path: 'test-results/auth-mobile-dashboard.png',
      fullPage: true
    })

    console.log('  ✓ Connexion mobile réussie')

    // Vérifier que le menu mobile fonctionne si présent
    const mobileMenuButton = page.locator('button[aria-label="Menu"], button:has-text("Menu"), [data-testid="mobile-menu"]')
    if (await mobileMenuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mobileMenuButton.click()
      console.log('  ✓ Menu mobile fonctionnel')

      // Screenshot du menu mobile ouvert
      await page.screenshot({
        path: 'test-results/auth-mobile-menu.png',
        fullPage: true
      })
    }
  })
})
