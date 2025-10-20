/**
 * Test Simple - Authentification avec Pattern Officiel Supabase SSR
 */

import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'arthur@seido.pm',
  password: 'Wxcvbn123',
  expectedDashboard: '/gestionnaire/dashboard'
}

test.describe('🔐 Authentification Gestionnaire', () => {
  test('Connexion gestionnaire doit rediriger vers le dashboard', async ({ page }) => {
    console.log('🚀 Test: Connexion gestionnaire')

    // Aller à la page de login
    await page.goto('http://localhost:3000/auth/login')
    await page.waitForLoadState('networkidle')

    // Remplir le formulaire
    console.log(`📝 Remplissage avec: ${TEST_USER.email}`)

    // IMPORTANT: Effacer d'abord pour éviter l'autofill du navigateur
    await page.fill('input[type="email"]', '')
    await page.fill('input[type="password"]', '')

    // Maintenant remplir avec les bonnes credentials
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)

    // Vérifier les valeurs
    const email = await page.inputValue('input[type="email"]')
    const password = await page.inputValue('input[type="password"]')
    console.log(`✓ Email rempli: ${email}`)
    console.log(`✓ Password rempli: ${password.replace(/./g, '*')}`)

    // Soumettre le formulaire
    console.log('🔘 Soumission du formulaire...')
    await page.click('button[type="submit"]')

    // Attendre la redirection vers le dashboard
    console.log(`⏳ Attente de la redirection vers ${TEST_USER.expectedDashboard}...`)
    await page.waitForURL(`**${TEST_USER.expectedDashboard}**`, {
      timeout: 10000
    })

    console.log('✅ Redirection réussie!')
    console.log(`📍 URL actuelle: ${page.url()}`)

    // Vérifier que le dashboard est bien affiché
    await expect(page.locator('h1').first()).toBeVisible()

    console.log('✅ Test réussi!')
  })
})
