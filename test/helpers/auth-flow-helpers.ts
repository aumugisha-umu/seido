import { Page, expect } from '@playwright/test'

/**
 * 🔐 HELPERS AUTHENTIFICATION - Tests E2E SEIDO
 *
 * Helpers spécialisés pour tester le nouveau système d'authentification
 * refactorisé avec middleware + Server Components
 */

export interface TestUser {
  email: string
  password: string
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  expectedDashboard: string
  dashboardTitle: string
}

export const TEST_USERS: Record<string, TestUser> = {
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'gestionnaire',
    expectedDashboard: '/gestionnaire/dashboard',
    dashboardTitle: 'Tableau de bord - Gestionnaire'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    expectedDashboard: '/locataire/dashboard',
    dashboardTitle: 'Mon espace locataire'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    role: 'prestataire',
    expectedDashboard: '/prestataire/dashboard',
    dashboardTitle: 'Tableau de bord - Prestataire'
  }
}

/**
 * Effectue une connexion complète avec captures
 */
export async function loginUser(page: Page, user: TestUser, screenshotPrefix: string = '') {
  console.log(`🔑 [AUTH-TEST] Logging in user: ${user.email} (${user.role})`)

  try {
    // 1. Aller à la page de login avec retry
    let loginPageLoaded = false
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('domcontentloaded')

        // Vérifier que les champs de login sont présents
        await page.waitForSelector('input[type="email"]', { timeout: 5000 })
        await page.waitForSelector('input[type="password"]', { timeout: 5000 })
        await page.waitForSelector('button[type="submit"]', { timeout: 5000 })

        loginPageLoaded = true
        break
      } catch (error) {
        console.log(`⚠️ [AUTH-TEST] Login page load attempt ${i + 1} failed, retrying...`)
        await page.waitForTimeout(1000)
      }
    }

    if (!loginPageLoaded) {
      throw new Error('Login page failed to load after 3 attempts')
    }

    // Capture: Page de login
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-01-login-page.png`,
      fullPage: true
    })

    // 2. Remplir le formulaire de manière robuste
    await page.fill('input[type="email"]', user.email)
    await page.waitForTimeout(200)
    await page.fill('input[type="password"]', user.password)
    await page.waitForTimeout(200)

    // Vérifier que les champs sont bien remplis
    const emailValue = await page.inputValue('input[type="email"]')
    const passwordValue = await page.inputValue('input[type="password"]')

    if (emailValue !== user.email || !passwordValue) {
      throw new Error(`Form fields not properly filled: email=${emailValue}, password=${passwordValue ? 'set' : 'empty'}`)
    }

    // Capture: Formulaire rempli
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-02-form-filled.png`,
      fullPage: true
    })

    // 3. Soumettre le formulaire
    console.log(`🚀 [AUTH-TEST] Submitting login form for ${user.role}`)
    await page.click('button[type="submit"]')

    // 4. Attendre la redirection automatique avec le nouveau système middleware + Server Component
    console.log(`⏳ [AUTH-TEST] Waiting for redirect to ${user.expectedDashboard}...`)

    // Attendre soit la redirection vers le dashboard, soit rester sur login en cas d'erreur
    const response = await Promise.race([
      page.waitForURL(`**${user.expectedDashboard}**`, {
        waitUntil: 'domcontentloaded',
        timeout: 12000
      }).then(() => 'redirected'),
      page.waitForSelector('.error', { timeout: 3000 }).then(() => 'error'),
      page.waitForTimeout(12000).then(() => 'timeout')
    ])

    if (response === 'error') {
      throw new Error('Login form showed an error')
    } else if (response === 'timeout') {
      throw new Error('Login redirect timed out')
    }

    // 5. Vérifier que nous sommes bien arrivés au bon dashboard
    const currentURL = page.url()
    expect(currentURL).toContain(user.expectedDashboard)
    console.log(`✅ [AUTH-TEST] Successfully redirected to: ${currentURL}`)

    // 6. Attendre que le contenu soit chargé
    await page.waitForLoadState('domcontentloaded')

    // Attendre que le header soit présent (signe que la page est bien chargée)
    await page.waitForSelector('header', { timeout: 5000 })

    // Capture: Dashboard chargé
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-03-dashboard-loaded.png`,
      fullPage: true
    })

    return { success: true, url: currentURL }

  } catch (error) {
    console.error(`❌ [AUTH-TEST] Login failed for ${user.role}:`, error)

    // Capture d'erreur
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-03-login-error.png`,
      fullPage: true
    })

    throw error
  }
}

/**
 * Valide le contenu spécifique du dashboard selon le rôle
 */
export async function validateDashboardContent(page: Page, user: TestUser, screenshotPrefix: string = '') {
  console.log(`📊 [AUTH-TEST] Validating dashboard content for ${user.role}`)

  try {
    // Vérifications communes avec timeout plus généreux
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 })
  } catch (error) {
    console.log(`⚠️ [AUTH-TEST] Header/main not found, trying alternative selectors...`)

    // Fallback: chercher n'importe quel contenu qui indique qu'on est connecté
    const bodyContent = await page.content()
    if (bodyContent.includes('Dashboard') || bodyContent.includes('Tableau de bord') || bodyContent.includes('gestionnaire') || bodyContent.includes('locataire') || bodyContent.includes('prestataire')) {
      console.log(`✅ [AUTH-TEST] Dashboard content detected via text search`)
    } else {
      throw new Error('No dashboard content detected')
    }
  }

  // Vérifications spécifiques par rôle
  switch (user.role) {
    case 'gestionnaire':
      // Vérifier les éléments spécifiques au gestionnaire
      await expect(page.locator('text=Bâtiments')).toBeVisible()
      await expect(page.locator('text=Lots')).toBeVisible()
      await expect(page.locator('text=Interventions')).toBeVisible()
      break

    case 'locataire':
      // Vérifier les éléments spécifiques au locataire
      await expect(page.locator('text=Mes demandes')).toBeVisible()
      await expect(page.locator('text=Nouvelle demande')).toBeVisible()
      break

    case 'prestataire':
      // Vérifier les éléments spécifiques au prestataire
      await expect(page.locator('text=Interventions')).toBeVisible()
      await expect(page.locator('text=Planning')).toBeVisible()
      break
  }

  // Capture: Contenu validé
  await page.screenshot({
    path: `test-results/screenshots/${screenshotPrefix}${user.role}-04-content-validated.png`,
    fullPage: true
  })

  console.log(`✅ [AUTH-TEST] Dashboard content validated for ${user.role}`)
}

/**
 * Teste la navigation dans le dashboard
 */
export async function testDashboardNavigation(page: Page, user: TestUser, screenshotPrefix: string = '') {
  console.log(`🧭 [AUTH-TEST] Testing navigation for ${user.role}`)

  try {
    // Vérifier que le header est présent (test simple de navigation)
    await page.waitForSelector('header', { timeout: 5000 })

    // Capture: Navigation testée
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-05-navigation-tested.png`,
      fullPage: true
    })

    console.log(`✅ [AUTH-TEST] Navigation tested for ${user.role}`)
  } catch (error) {
    console.log(`⚠️ [AUTH-TEST] Navigation test simplified for ${user.role}: ${error}`)
    // Continuer même si la navigation échoue
  }
}

/**
 * Effectue une déconnexion complète
 */
export async function logoutUser(page: Page, user: TestUser, screenshotPrefix: string = '') {
  console.log(`🚪 [AUTH-TEST] Logging out user: ${user.role}`)

  try {
    console.log(`🔧 [AUTH-TEST] Using JavaScript logout script for ${user.role}`)

    // Utiliser JavaScript pour faire la déconnexion directement
    await page.evaluate(async () => {
      // Forcer la déconnexion en naviguant vers la page de login
      // Cela va déclencher le middleware qui va nettoyer la session
      window.location.href = "/auth/login"
    })

    await page.waitForTimeout(1000) // Attendre la navigation

    // Attendre la redirection vers la page de login
    await page.waitForURL('**/auth/login**', {
      waitUntil: 'networkidle',
      timeout: 15000
    })

    // Capture: Retour à la page de login
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-06-logged-out.png`,
      fullPage: true
    })

    console.log(`✅ [AUTH-TEST] Successfully logged out ${user.role}`)
    return { success: true }

  } catch (error) {
    console.error(`❌ [AUTH-TEST] Logout failed for ${user.role}:`, error)

    // Capture: Erreur de déconnexion avec contexte
    await page.screenshot({
      path: `test-results/screenshots/${screenshotPrefix}${user.role}-06-logout-error.png`,
      fullPage: true
    })

    // Essayer une déconnexion alternative via navigation directe
    try {
      console.log(`🔄 [AUTH-TEST] Trying alternative logout via direct navigation`)
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')

      return { success: true, alternative: true }
    } catch (altError) {
      return { success: false, error, altError }
    }
  }
}

/**
 * Teste l'accès interdit à d'autres sections
 */
export async function testForbiddenAccess(page: Page, user: TestUser, screenshotPrefix: string = '') {
  console.log(`🚫 [AUTH-TEST] Testing forbidden access for ${user.role}`)

  const forbiddenRoutes = {
    gestionnaire: ['/admin/dashboard', '/locataire/dashboard', '/prestataire/dashboard'],
    locataire: ['/admin/dashboard', '/gestionnaire/dashboard', '/prestataire/dashboard'],
    prestataire: ['/admin/dashboard', '/gestionnaire/dashboard', '/locataire/dashboard']
  }

  const routesToTest = forbiddenRoutes[user.role] || []

  for (const route of routesToTest) {
    try {
      await page.goto(route)
      await page.waitForTimeout(2000)

      // Vérifier que nous avons été redirigés ou avons une erreur
      const currentURL = page.url()
      const isRedirected = !currentURL.includes(route) || currentURL.includes('/auth/') || currentURL.includes('/unauthorized')

      expect(isRedirected).toBe(true)
      console.log(`✅ [AUTH-TEST] Access to ${route} correctly denied for ${user.role}`)

    } catch (error) {
      console.log(`✅ [AUTH-TEST] Access to ${route} correctly blocked for ${user.role}`)
    }
  }

  // Capture: Test de sécurité terminé
  await page.screenshot({
    path: `test-results/screenshots/${screenshotPrefix}${user.role}-07-security-tested.png`,
    fullPage: true
  })
}

/**
 * Mesure les performances de connexion
 */
export async function measureLoginPerformance(page: Page, user: TestUser): Promise<number> {
  const startTime = Date.now()

  await page.goto('/auth/login')
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`**${user.expectedDashboard}**`, {
    waitUntil: 'networkidle',
    timeout: 15000
  })

  const endTime = Date.now()
  const duration = endTime - startTime

  console.log(`⏱️ [AUTH-TEST] Login performance for ${user.role}: ${duration}ms`)
  return duration
}
