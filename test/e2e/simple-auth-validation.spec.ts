/**
 * Test de validation simple de l'authentification SEIDO
 * Utilise les vraies credentials et vérifie le bon fonctionnement
 */

import { test, expect } from '@playwright/test'

const REAL_ACCOUNTS = {
  admin: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    expectedDashboard: '/admin/dashboard'
  },
  gestionnaire: {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/gestionnaire/dashboard'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/locataire/dashboard'
  }
}

test.describe('Validation Authentification SEIDO', () => {
  test('Gestionnaire: Authentification réussie', async ({ page }) => {
    console.log('🔐 Test connexion Gestionnaire...')

    // Aller à la page de login
    await page.goto('http://localhost:3000/auth/login')

    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle')

    // Vérifier qu'on est sur la page de login
    const title = await page.title()
    console.log(`  Page title: ${title}`)

    // Remplir le formulaire
    await page.fill('input[type="email"]', REAL_ACCOUNTS.gestionnaire.email)
    await page.fill('input[type="password"]', REAL_ACCOUNTS.gestionnaire.password)

    // Screenshot avant connexion
    await page.screenshot({
      path: 'test/test-results/gestionnaire-before-login.png',
      fullPage: true
    })

    // Se connecter
    await page.click('button[type="submit"]')

    // Attendre la redirection
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Vérifier qu'on est sur le bon dashboard
    const currentUrl = page.url()
    console.log(`  ✅ Connecté - URL: ${currentUrl}`)

    expect(currentUrl).toContain('/gestionnaire/dashboard')

    // Screenshot du dashboard
    await page.screenshot({
      path: 'test/test-results/gestionnaire-dashboard.png',
      fullPage: true
    })

    // Vérifier la présence d'éléments du dashboard
    const dashboardTitle = page.locator('h1, h2').first()
    await expect(dashboardTitle).toBeVisible()

    const titleText = await dashboardTitle.textContent()
    console.log(`  Dashboard title: ${titleText}`)
  })

  test('Locataire: Authentification réussie', async ({ page }) => {
    console.log('🔐 Test connexion Locataire...')

    // Aller à la page de login
    await page.goto('http://localhost:3000/auth/login')
    await page.waitForLoadState('networkidle')

    // Remplir le formulaire
    await page.fill('input[type="email"]', REAL_ACCOUNTS.locataire.email)
    await page.fill('input[type="password"]', REAL_ACCOUNTS.locataire.password)

    // Se connecter
    await page.click('button[type="submit"]')

    // Attendre la redirection
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Vérifier qu'on est sur le bon dashboard
    const currentUrl = page.url()
    console.log(`  ✅ Connecté - URL: ${currentUrl}`)

    expect(currentUrl).toContain('/locataire/dashboard')

    // Screenshot du dashboard
    await page.screenshot({
      path: 'test/test-results/locataire-dashboard.png',
      fullPage: true
    })
  })

  test('Admin: Authentification réussie', async ({ page }) => {
    console.log('🔐 Test connexion Admin...')

    // Aller à la page de login
    await page.goto('http://localhost:3000/auth/login')
    await page.waitForLoadState('networkidle')

    // Remplir le formulaire
    await page.fill('input[type="email"]', REAL_ACCOUNTS.admin.email)
    await page.fill('input[type="password"]', REAL_ACCOUNTS.admin.password)

    // Se connecter
    await page.click('button[type="submit"]')

    // Attendre la redirection
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Vérifier qu'on est sur le bon dashboard
    const currentUrl = page.url()
    console.log(`  ✅ Connecté - URL: ${currentUrl}`)

    expect(currentUrl).toContain('/admin/dashboard')

    // Screenshot du dashboard
    await page.screenshot({
      path: 'test/test-results/admin-dashboard.png',
      fullPage: true
    })
  })
})
