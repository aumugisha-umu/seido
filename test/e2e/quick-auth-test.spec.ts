/**
 * Test rapide pour vérifier l'authentification avec les vraies credentials
 */

import { test, expect } from '@playwright/test'

test('Test rapide: Connexion avec les vraies credentials', async ({ page }) => {
  console.log('Test de connexion avec les vraies credentials...')

  // Aller à la page de login
  await page.goto('/auth/login', { waitUntil: 'networkidle' })

  // Screenshot avant connexion
  await page.screenshot({ path: 'test/test-results/quick-auth-before.png' })

  // Vérifier qu'on est sur la page de login
  await expect(page).toHaveURL(/\/auth\/login/)

  // Remplir le formulaire avec les vraies credentials
  await page.fill('input[type="email"]', 'arthur+gest@seido.pm')
  await page.fill('input[type="password"]', 'Wxcvbn123')

  // Screenshot après remplissage
  await page.screenshot({ path: 'test/test-results/quick-auth-filled.png' })

  // Cliquer sur le bouton de connexion
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()

  // Attendre un peu pour voir ce qui se passe
  await page.waitForTimeout(5000)

  // Screenshot après tentative de connexion
  await page.screenshot({ path: 'test/test-results/quick-auth-after.png' })

  // Vérifier où on est maintenant
  const currentUrl = page.url()
  console.log(`URL actuelle après connexion: ${currentUrl}`)

  // On devrait être redirigé vers le dashboard gestionnaire
  if (currentUrl.includes('/gestionnaire/dashboard')) {
    console.log('✅ Connexion réussie - Redirigé vers le dashboard gestionnaire')
  } else if (currentUrl.includes('/auth/login')) {
    console.log('❌ Toujours sur la page de login - Connexion échouée')

    // Chercher un message d'erreur
    const errorMessage = await page.locator('text=/erreur|invalid|incorrect|échec/i').textContent().catch(() => null)
    if (errorMessage) {
      console.log(`Message d'erreur: ${errorMessage}`)
    }
  } else {
    console.log(`⚠️ Redirigé vers une page inattendue: ${currentUrl}`)
  }
})