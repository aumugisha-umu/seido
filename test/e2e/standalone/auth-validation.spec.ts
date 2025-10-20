/**
 * 🔐 Authentication Validation - Standalone Test
 *
 * Test RAPIDE et SIMPLE pour valider que le login fonctionne pour tous les rôles.
 * Utilise les helpers modulaires créés (auth-helpers.ts).
 *
 * Durée attendue: < 15 secondes pour 3 tests
 * Taux de succès attendu: 100% (3/3)
 *
 * @purpose
 * - Validation baseline avant tests complexes
 * - Détection rapide de régressions auth
 * - Test des helpers modulaires
 *
 * @usage
 * ```bash
 * # Run standalone validation
 * npx playwright test test/e2e/standalone
 * ```
 */

import { test, expect } from '@playwright/test'
import {
  loginAsGestionnaire,
  loginAsLocataire,
  loginAsPrestataire
} from '../../../docs/refacto/Tests/helpers'

// Configuration
test.setTimeout(30000) // 30s per test (auth can take time)

test.describe('🔐 Auth Validation - Standalone', () => {

  test('✅ Login Gestionnaire should work', async ({ page }) => {
    console.log('🔐 Testing Gestionnaire login...')

    // Use modular helper
    await loginAsGestionnaire(page)

    // Verify we're on the dashboard
    expect(page.url()).toContain('/gestionnaire/dashboard')
    console.log('✅ Gestionnaire login successful!')

    // Verify page loaded correctly
    await expect(page.locator('h1, h2')).toContainText(/Tableau de bord|Dashboard/i, {
      timeout: 10000
    })
  })

  test('✅ Login Locataire should work', async ({ page }) => {
    console.log('🔐 Testing Locataire login...')

    // Use modular helper
    await loginAsLocataire(page)

    // Verify we're on the dashboard
    expect(page.url()).toContain('/locataire/dashboard')
    console.log('✅ Locataire login successful!')

    // Verify page loaded correctly
    await expect(page.locator('h1, h2')).toContainText(/Tableau de bord|Dashboard/i, {
      timeout: 10000
    })
  })

  test('✅ Login Prestataire should work', async ({ page }) => {
    console.log('🔐 Testing Prestataire login...')

    // Use modular helper
    await loginAsPrestataire(page)

    // Verify we're on the dashboard
    expect(page.url()).toContain('/prestataire/dashboard')
    console.log('✅ Prestataire login successful!')

    // Verify page loaded correctly
    await expect(page.locator('h1, h2')).toContainText(/Tableau de bord|Dashboard/i, {
      timeout: 10000
    })
  })
})
