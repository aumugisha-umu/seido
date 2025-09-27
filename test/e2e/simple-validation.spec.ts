/**
 * Test E2E simple pour valider le fonctionnement de base
 */

import { test, expect } from '@playwright/test'

test.describe('Validation Simple', () => {
  test('Page de login accessible', async ({ page }) => {
    // Aller à la page de login
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })

    // Vérifier que la page se charge
    await expect(page).toHaveURL(/\/auth\/login/)

    // Vérifier la présence du formulaire
    const emailInput = page.locator('input[type="email"], input[name="email"], #email')
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password')
    const submitButton = page.locator('button[type="submit"]')

    // Attendre que les éléments soient visibles
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(passwordInput).toBeVisible({ timeout: 10000 })
    await expect(submitButton).toBeVisible({ timeout: 10000 })

    console.log('✓ Page de login accessible')
  })

  test('Connexion gestionnaire', async ({ page }) => {
    await page.goto('/auth/login')

    // Remplir le formulaire
    await page.fill('input[type="email"]', 'gestionnaire@seido.com')
    await page.fill('input[type="password"]', '123456')

    // Se connecter
    await page.click('button[type="submit"]')

    // Attendre la redirection (avec timeout plus long)
    await page.waitForURL('**/dashboard', { timeout: 30000 })

    // Vérifier qu'on est sur un dashboard
    expect(page.url()).toContain('/dashboard')

    console.log('✓ Connexion gestionnaire réussie')
  })
})