/**
 * Exemple de test E2E avec capture d'écran automatique
 * Démontre l'utilisation du helper de screenshot pour SEIDO
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, ScreenshotHelper } from '../helpers/screenshot-helper'

test.describe('SEIDO Dashboard Visual Tests', () => {
  let screenshotHelper: ScreenshotHelper

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialiser le helper de screenshot
    screenshotHelper = createScreenshotHelper(page, testInfo)
  })

  test('Capture complète du flow de connexion', async ({ page }) => {
    // 1. Page de connexion
    await page.goto('/auth/signin')
    await screenshotHelper.capture({
      name: 'login-page',
      waitForSelector: '[data-testid="signin-form"]'
    })

    // 2. Remplir le formulaire
    await page.fill('[data-testid="email-input"]', 'manager@seido.fr')
    await page.fill('[data-testid="password-input"]', 'manager123')
    await screenshotHelper.capture({
      name: 'login-filled',
      maskSelectors: ['[data-testid="password-input"]'] // Masquer le mot de passe
    })

    // 3. Soumettre et attendre le dashboard
    await page.click('[data-testid="submit-button"]')
    await page.waitForURL('/dashboard/**')
    await screenshotHelper.capture({
      name: 'dashboard-loaded',
      waitForSelector: '[data-testid="dashboard-content"]'
    })
  })

  test('Comparaison des dashboards par rôle', async ({ page }) => {
    const roles = [
      {
        name: 'gestionnaire',
        email: 'manager@seido.fr',
        password: 'manager123'
      },
      {
        name: 'prestataire',
        email: 'provider@seido.fr',
        password: 'provider123'
      },
      {
        name: 'locataire',
        email: 'tenant@seido.fr',
        password: 'tenant123'
      }
    ]

    const screenshots = await screenshotHelper.captureAllRoles(
      roles.map(role => ({
        name: role.name,
        loginFn: async () => {
          await page.goto('/auth/signin')
          await page.fill('[data-testid="email-input"]', role.email)
          await page.fill('[data-testid="password-input"]', role.password)
          await page.click('[data-testid="submit-button"]')
          await page.waitForURL('/dashboard/**')
        }
      }))
    )

    // Vérifier que tous les dashboards ont été capturés
    expect(screenshots.size).toBe(3)
  })

  test.afterEach(async () => {
    // Générer le rapport de screenshots pour ce test
    await screenshotHelper.generateReport()
  })
})

test.describe('SEIDO Visual Regression Tests', () => {
  test('Regression visuelle - Page de connexion', async ({ page }, testInfo) => {
    const screenshotHelper = createScreenshotHelper(page, testInfo)

    await page.goto('/auth/signin')

    const screenshotPath = await screenshotHelper.capture({
      name: 'signin-page-regression',
      waitForSelector: '[data-testid="signin-form"]'
    })

    // Comparer avec la baseline
    await expect(page).toHaveScreenshot('signin-baseline.png', {
      fullPage: true,
      maxDiffPixels: 100
    })
  })

  test('Regression visuelle - Dashboard gestionnaire', async ({ page }, testInfo) => {
    const screenshotHelper = createScreenshotHelper(page, testInfo)

    // Se connecter
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email-input"]', 'manager@seido.fr')
    await page.fill('[data-testid="password-input"]', 'manager123')
    await page.click('[data-testid="submit-button"]')
    await page.waitForURL('/dashboard/**')

    const screenshotPath = await screenshotHelper.capture({
      name: 'dashboard-regression',
      waitForSelector: '[data-testid="dashboard-content"]'
    })

    // Comparer avec la baseline
    await expect(page).toHaveScreenshot('dashboard-baseline.png', {
      fullPage: true,
      maxDiffPixels: 100
    })
  })
})
