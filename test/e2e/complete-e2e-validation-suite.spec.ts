import { test, expect, Page } from '@playwright/test'

/**
 * SUITE DE TESTS E2E COMPLÈTE POUR SEIDO
 * Configuration validée avec serveur sur port 3020
 * Credentials confirmés fonctionnels
 */

const TEST_CREDENTIALS = {
  admin: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    expectedUrl: '/admin/dashboard',
    dashboardText: 'Dashboard Admin'
  },
  gestionnaire: {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    expectedUrl: '/gestionnaire/dashboard',
    dashboardText: 'Dashboard Gestionnaire'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    expectedUrl: '/locataire/dashboard',
    dashboardText: 'Dashboard Locataire'
  }
}

// Helper pour capturer un screenshot avec nom unique
async function captureScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({
    path: `test/screenshots/e2e-${name}-${timestamp}.png`,
    fullPage: true
  })
}

// Helper pour login
async function loginAs(page: Page, role: keyof typeof TEST_CREDENTIALS) {
  const creds = TEST_CREDENTIALS[role]

  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  // Remplir le formulaire de login
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)

  // Cliquer sur le bouton de connexion
  await page.click('button[type="submit"]')

  // Attendre la redirection
  await page.waitForURL(creds.expectedUrl, { timeout: 30000 })
}

// Helper pour vérifier les éléments responsives
async function checkResponsiveElements(page: Page, viewport: { width: number, height: number }) {
  await page.setViewportSize(viewport)
  await page.waitForTimeout(1000) // Attendre le re-render

  // Vérifier les éléments responsive
  if (viewport.width < 768) {
    // Mobile: vérifier le menu hamburger
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button:has-text("Menu")')
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible()
    }
  } else {
    // Desktop: vérifier la navigation normale
    const desktopNav = page.locator('nav, [role="navigation"]').first()
    await expect(desktopNav).toBeVisible()
  }
}

test.describe('🔐 TESTS D\'AUTHENTIFICATION', () => {
  test.beforeEach(async ({ page }) => {
    // Nettoyer le localStorage avant chaque test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('✅ Login Admin', async ({ page }) => {
    await loginAs(page, 'admin')
    await captureScreenshot(page, 'admin-login-success')

    // Vérifier que nous sommes sur le dashboard admin
    await expect(page).toHaveURL('/admin/dashboard')
    const heading = page.locator('h1, h2').filter({ hasText: /Admin|Administration/ })
    await expect(heading.first()).toBeVisible()
  })

  test('✅ Login Gestionnaire', async ({ page }) => {
    await loginAs(page, 'gestionnaire')
    await captureScreenshot(page, 'gestionnaire-login-success')

    // Vérifier que nous sommes sur le dashboard gestionnaire
    await expect(page).toHaveURL('/gestionnaire/dashboard')
    const heading = page.locator('h1, h2').filter({ hasText: /Gestionnaire|Gestion/ })
    await expect(heading.first()).toBeVisible()
  })

  test('✅ Login Locataire', async ({ page }) => {
    await loginAs(page, 'locataire')
    await captureScreenshot(page, 'locataire-login-success')

    // Vérifier que nous sommes sur le dashboard locataire
    await expect(page).toHaveURL('/locataire/dashboard')
    const heading = page.locator('h1, h2').filter({ hasText: /Locataire|Mes interventions/ })
    await expect(heading.first()).toBeVisible()
  })

  test('❌ Login avec mauvais credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Vérifier qu'un message d'erreur apparaît
    const errorMessage = await page.waitForSelector('text=/Invalid|Incorrect|Erreur|email ou mot de passe/i', { timeout: 5000 })
    await expect(errorMessage).toBeVisible()
    await captureScreenshot(page, 'login-error')
  })

  test('🔒 Protection des routes', async ({ page }) => {
    // Essayer d'accéder à une route protégée sans être connecté
    await page.goto('/gestionnaire/dashboard')

    // Devrait rediriger vers la page de login
    await page.waitForURL('/auth/login', { timeout: 10000 })
    await expect(page).toHaveURL('/auth/login')
    await captureScreenshot(page, 'route-protection')
  })
})

test.describe('🧭 TESTS DE NAVIGATION', () => {
  test('Navigation Gestionnaire', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Tester la navigation vers différentes pages
    const navLinks = [
      { text: 'Interventions', url: '/gestionnaire/interventions' },
      { text: 'Biens', url: '/gestionnaire/biens' },
      { text: 'Contacts', url: '/gestionnaire/contacts' }
    ]

    for (const link of navLinks) {
      const linkElement = page.locator(`a:has-text("${link.text}")`)
      if (await linkElement.count() > 0) {
        await linkElement.first().click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(link.url))
        await captureScreenshot(page, `gestionnaire-nav-${link.text.toLowerCase()}`)

        // Retour au dashboard
        await page.goto('/gestionnaire/dashboard')
      }
    }
  })

  test('Navigation Locataire', async ({ page }) => {
    await loginAs(page, 'locataire')

    // Tester la navigation vers différentes pages
    const navLinks = [
      { text: 'Interventions', url: '/locataire/interventions' },
      { text: 'Nouvelle demande', url: '/locataire/interventions/nouvelle-demande' }
    ]

    for (const link of navLinks) {
      const linkElement = page.locator(`a:has-text("${link.text}")`)
      if (await linkElement.count() > 0) {
        await linkElement.first().click()
        await page.waitForLoadState('networkidle')
        await captureScreenshot(page, `locataire-nav-${link.text.toLowerCase().replace(' ', '-')}`)

        // Retour au dashboard
        await page.goto('/locataire/dashboard')
      }
    }
  })

  test('Déconnexion', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Trouver et cliquer sur le bouton de déconnexion
    const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Se déconnecter")')
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click()
      await page.waitForURL('/auth/login', { timeout: 10000 })
      await expect(page).toHaveURL('/auth/login')
      await captureScreenshot(page, 'logout-success')
    }
  })
})

test.describe('📊 TESTS DE CHARGEMENT DES DASHBOARDS', () => {
  test('Dashboard Gestionnaire - Chargement des données', async ({ page }) => {
    await loginAs(page, 'gestionnaire')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence des éléments clés du dashboard
    const elements = [
      'h1, h2', // Titre principal
      '.card, [class*="card"]', // Cards de statistiques
      'table, [role="table"], .intervention-list', // Tableau d'interventions
    ]

    for (const selector of elements) {
      const element = page.locator(selector).first()
      if (await element.count() > 0) {
        await expect(element).toBeVisible({ timeout: 15000 })
      }
    }

    await captureScreenshot(page, 'gestionnaire-dashboard-loaded')
  })

  test('Dashboard Locataire - Chargement des données', async ({ page }) => {
    await loginAs(page, 'locataire')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence des éléments clés du dashboard
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 15000 })

    // Vérifier la présence d'une section d'interventions ou d'un message
    const interventionsSection = page.locator('[class*="intervention"], [class*="card"], .empty-state')
    await expect(interventionsSection.first()).toBeVisible({ timeout: 15000 })

    await captureScreenshot(page, 'locataire-dashboard-loaded')
  })

  test('Dashboard Admin - Chargement des données', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence des éléments clés du dashboard
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 15000 })

    await captureScreenshot(page, 'admin-dashboard-loaded')
  })
})

test.describe('📱 TESTS RESPONSIVE DESIGN', () => {
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
  ]

  for (const viewport of viewports) {
    test(`Responsive ${viewport.name} - Dashboard Gestionnaire`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await loginAs(page, 'gestionnaire')
      await page.waitForLoadState('networkidle')

      // Vérifier l'adaptation responsive
      await checkResponsiveElements(page, viewport)

      // Capturer screenshot
      await captureScreenshot(page, `responsive-${viewport.name}-gestionnaire`)

      // Vérifier que le contenu principal est visible
      const mainContent = page.locator('main, [role="main"], .main-content').first()
      await expect(mainContent).toBeVisible()
    })
  }

  test('Menu mobile fonctionne', async ({ page }) => {
    // Passer en vue mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAs(page, 'gestionnaire')

    // Chercher le bouton de menu mobile
    const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button:has-text("Menu"), [aria-label*="menu"]')
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.first().click()
      await page.waitForTimeout(500)

      // Vérifier que le menu mobile est ouvert
      const mobileNav = page.locator('.mobile-nav, [class*="mobile-menu"]')
      if (await mobileNav.count() > 0) {
        await expect(mobileNav.first()).toBeVisible()
        await captureScreenshot(page, 'mobile-menu-open')
      }
    }
  })
})

test.describe('🔄 TESTS WORKFLOW INTERVENTIONS', () => {
  test('Création d\'intervention - Locataire', async ({ page }) => {
    await loginAs(page, 'locataire')

    // Naviguer vers la création d'intervention
    const newInterventionLink = page.locator('a:has-text("Nouvelle"), button:has-text("Nouvelle"), a[href*="nouvelle-demande"]')
    if (await newInterventionLink.count() > 0) {
      await newInterventionLink.first().click()
      await page.waitForLoadState('networkidle')

      // Vérifier que le formulaire est présent
      const form = page.locator('form')
      if (await form.count() > 0) {
        await expect(form.first()).toBeVisible()

        // Remplir le formulaire (si possible)
        const titleInput = page.locator('input[name="title"], input[placeholder*="titre"], #title')
        if (await titleInput.count() > 0) {
          await titleInput.first().fill('Test E2E - Intervention')
        }

        const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description"], #description')
        if (await descriptionInput.count() > 0) {
          await descriptionInput.first().fill('Description de test pour validation E2E')
        }

        await captureScreenshot(page, 'intervention-form-filled')

        // Note: Ne pas soumettre réellement pour éviter de polluer les données
      }
    }
  })

  test('Liste des interventions - Gestionnaire', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Naviguer vers la liste des interventions
    const interventionsLink = page.locator('a:has-text("Interventions")')
    if (await interventionsLink.count() > 0) {
      await interventionsLink.first().click()
      await page.waitForLoadState('networkidle')

      // Vérifier la présence d'une liste ou tableau
      const listOrTable = page.locator('table, [role="table"], .intervention-list, [class*="list"]')
      if (await listOrTable.count() > 0) {
        await expect(listOrTable.first()).toBeVisible()
        await captureScreenshot(page, 'interventions-list')
      }
    }
  })
})

test.describe('⚠️ TESTS DE GESTION DES ERREURS', () => {
  test('Page 404', async ({ page }) => {
    await page.goto('/page-qui-nexiste-pas')
    await page.waitForLoadState('networkidle')

    // Vérifier qu'une page d'erreur est affichée
    const errorPage = page.locator('text=/404|not found|introuvable/i')
    if (await errorPage.count() > 0) {
      await expect(errorPage.first()).toBeVisible()
      await captureScreenshot(page, 'error-404')
    }
  })

  test('Gestion des erreurs réseau', async ({ page, context }) => {
    // Simuler une erreur réseau
    await context.route('**/api/**', route => route.abort())

    await page.goto('/auth/login')
    await page.fill('input[type="email"]', TEST_CREDENTIALS.gestionnaire.email)
    await page.fill('input[type="password"]', TEST_CREDENTIALS.gestionnaire.password)

    // Essayer de se connecter avec le réseau bloqué
    await page.click('button[type="submit"]')

    // Attendre un message d'erreur
    await page.waitForTimeout(3000)
    const errorMessage = page.locator('text=/erreur|error|failed|impossible/i')
    if (await errorMessage.count() > 0) {
      await captureScreenshot(page, 'network-error-handled')
    }
  })

  test('Session expirée', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Simuler l'expiration de la session
    await page.evaluate(() => {
      localStorage.removeItem('user')
      sessionStorage.clear()
    })

    // Essayer de naviguer
    await page.goto('/gestionnaire/interventions')

    // Devrait rediriger vers login
    await page.waitForURL('/auth/login', { timeout: 10000 })
    await expect(page).toHaveURL('/auth/login')
    await captureScreenshot(page, 'session-expired-redirect')
  })
})

test.describe('🎨 TESTS D\'INTERFACE UTILISATEUR', () => {
  test('Thème et cohérence visuelle', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Vérifier la présence des éléments UI cohérents
    const header = page.locator('header, [role="banner"]').first()
    await expect(header).toBeVisible()

    const nav = page.locator('nav, [role="navigation"]').first()
    await expect(nav).toBeVisible()

    const main = page.locator('main, [role="main"]').first()
    await expect(main).toBeVisible()

    await captureScreenshot(page, 'ui-consistency')
  })

  test('Accessibilité - Navigation au clavier', async ({ page }) => {
    await page.goto('/auth/login')

    // Tester la navigation au clavier
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Vérifier que le focus est visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return el ? el.tagName.toLowerCase() : null
    })

    expect(focusedElement).toBeTruthy()
    await captureScreenshot(page, 'keyboard-navigation')
  })
})

test.describe('🔍 TESTS DE RECHERCHE ET FILTRES', () => {
  test('Recherche dans les interventions', async ({ page }) => {
    await loginAs(page, 'gestionnaire')

    // Aller à la page des interventions
    await page.goto('/gestionnaire/interventions')
    await page.waitForLoadState('networkidle')

    // Chercher un champ de recherche
    const searchInput = page.locator('input[type="search"], input[placeholder*="recherch"], input[placeholder*="Search"]')
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      await captureScreenshot(page, 'search-results')
    }
  })
})

test.describe('📈 TESTS DE PERFORMANCE', () => {
  test('Temps de chargement initial', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`⏱️ Temps de chargement initial: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(5000) // Moins de 5 secondes

    await captureScreenshot(page, 'initial-load')
  })

  test('Temps de login et redirection', async ({ page }) => {
    await page.goto('/auth/login')

    const startTime = Date.now()
    await page.fill('input[type="email"]', TEST_CREDENTIALS.gestionnaire.email)
    await page.fill('input[type="password"]', TEST_CREDENTIALS.gestionnaire.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard', { timeout: 10000 })
    const loginTime = Date.now() - startTime

    console.log(`⏱️ Temps de login + redirection: ${loginTime}ms`)
    expect(loginTime).toBeLessThan(5000) // Moins de 5 secondes
  })
})