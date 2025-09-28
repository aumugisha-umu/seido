import { test, expect } from '@playwright/test'

/**
 * SUITE DE TESTS RAPIDE POUR VALIDATION
 * Tests essentiels avec timeouts optimisés
 */

const TEST_URL = 'http://localhost:3020'

test.describe('🚀 VALIDATION RAPIDE E2E', () => {
  test.setTimeout(30000) // Timeout global de 30s par test

  test('1. Serveur répond correctement', async ({ page }) => {
    const response = await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Capture screenshot
    await page.screenshot({
      path: 'test/screenshots/1-server-response.png',
      fullPage: true
    })
  })

  test('2. Page de login accessible', async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    // Vérifier les éléments essentiels
    const emailInput = await page.locator('input[type="email"]').count()
    const passwordInput = await page.locator('input[type="password"]').count()
    const submitButton = await page.locator('button[type="submit"]').count()

    expect(emailInput).toBeGreaterThan(0)
    expect(passwordInput).toBeGreaterThan(0)
    expect(submitButton).toBeGreaterThan(0)

    await page.screenshot({
      path: 'test/screenshots/2-login-page.png',
      fullPage: true
    })
  })

  test('3. Login Admin fonctionne', async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    // Remplir le formulaire
    await page.fill('input[type="email"]', 'arthur@umumentum.com')
    await page.fill('input[type="password"]', 'Wxcvbn123')

    // Screenshot avant soumission
    await page.screenshot({
      path: 'test/screenshots/3a-login-form-filled.png'
    })

    // Soumettre
    await page.click('button[type="submit"]')

    // Attendre la navigation (avec timeout court)
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
      await page.screenshot({
        path: 'test/screenshots/3b-admin-dashboard.png',
        fullPage: true
      })

      // Vérifier qu'on est bien sur le dashboard
      expect(page.url()).toContain('/admin/dashboard')
    } catch (error) {
      // Capturer l'état en cas d'erreur
      await page.screenshot({
        path: 'test/screenshots/3-error-admin-login.png',
        fullPage: true
      })

      // Afficher l'URL actuelle pour debug
      console.log('URL actuelle:', page.url())
      throw error
    }
  })

  test('4. Login Gestionnaire fonctionne', async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    await page.fill('input[type="email"]', 'arthur+gest@seido.pm')
    await page.fill('input[type="password"]', 'Wxcvbn123')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/gestionnaire/dashboard', { timeout: 10000 })
      await page.screenshot({
        path: 'test/screenshots/4-gestionnaire-dashboard.png',
        fullPage: true
      })

      expect(page.url()).toContain('/gestionnaire/dashboard')
    } catch (error) {
      await page.screenshot({
        path: 'test/screenshots/4-error-gestionnaire-login.png',
        fullPage: true
      })
      console.log('URL actuelle:', page.url())
      throw error
    }
  })

  test('5. Login Locataire fonctionne', async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    await page.fill('input[type="email"]', 'arthur+loc@seido.pm')
    await page.fill('input[type="password"]', 'Wxcvbn123')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/locataire/dashboard', { timeout: 10000 })
      await page.screenshot({
        path: 'test/screenshots/5-locataire-dashboard.png',
        fullPage: true
      })

      expect(page.url()).toContain('/locataire/dashboard')
    } catch (error) {
      await page.screenshot({
        path: 'test/screenshots/5-error-locataire-login.png',
        fullPage: true
      })
      console.log('URL actuelle:', page.url())
      throw error
    }
  })

  test('6. Protection des routes', async ({ page }) => {
    // Essayer d'accéder directement à un dashboard protégé
    await page.goto(`${TEST_URL}/gestionnaire/dashboard`, { waitUntil: 'domcontentloaded' })

    // Devrait rediriger vers login
    await page.waitForTimeout(2000)
    const currentUrl = page.url()

    await page.screenshot({
      path: 'test/screenshots/6-route-protection.png',
      fullPage: true
    })

    expect(currentUrl).toContain('/auth/login')
  })

  test('7. Navigation après login', async ({ page }) => {
    // Se connecter d'abord
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', 'arthur+gest@seido.pm')
    await page.fill('input[type="password"]', 'Wxcvbn123')
    await page.click('button[type="submit"]')

    // Attendre le dashboard
    await page.waitForURL('**/gestionnaire/dashboard', { timeout: 10000 })

    // Tester la navigation vers une autre page
    const interventionsLink = page.locator('a').filter({ hasText: /intervention/i }).first()
    if (await interventionsLink.count() > 0) {
      await interventionsLink.click()
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: 'test/screenshots/7-navigation.png',
        fullPage: true
      })

      // Vérifier qu'on a navigué
      const urlAfterNav = page.url()
      expect(urlAfterNav).not.toBe(`${TEST_URL}/gestionnaire/dashboard`)
    }
  })

  test('8. Responsive Mobile', async ({ page }) => {
    // Passer en vue mobile
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    await page.screenshot({
      path: 'test/screenshots/8a-mobile-login.png',
      fullPage: true
    })

    // Se connecter en mobile
    await page.fill('input[type="email"]', 'arthur+gest@seido.pm')
    await page.fill('input[type="password"]', 'Wxcvbn123')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/gestionnaire/dashboard', { timeout: 10000 })
      await page.screenshot({
        path: 'test/screenshots/8b-mobile-dashboard.png',
        fullPage: true
      })
    } catch (error) {
      await page.screenshot({
        path: 'test/screenshots/8-error-mobile.png',
        fullPage: true
      })
    }
  })

  test('9. Gestion erreur login', async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`, { waitUntil: 'domcontentloaded' })

    // Essayer avec de mauvais credentials
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    // Attendre un peu pour le message d'erreur
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: 'test/screenshots/9-login-error.png',
      fullPage: true
    })

    // Vérifier qu'on est toujours sur la page de login
    expect(page.url()).toContain('/auth/login')
  })

  test('10. Performance chargement initial', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(TEST_URL, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime
    console.log(`⏱️ Temps de chargement: ${loadTime}ms`)

    await page.screenshot({
      path: 'test/screenshots/10-performance.png',
      fullPage: true
    })

    // Le chargement devrait être inférieur à 10 secondes
    expect(loadTime).toBeLessThan(10000)
  })
})
