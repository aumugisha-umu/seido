/**
 * Tests E2E pour le dashboard prestataire
 * Les captures seront automatiquement organisées dans test/screenshots/prestataire/
 */

import { test, expect, loginAsRole } from '../../utils/test-helpers'
import { createScreenshotHelper } from '../../helpers/screenshot-helper'

test.describe('Dashboard Prestataire', () => {
  test('affichage du dashboard prestataire', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    // Login en tant que prestataire
    await loginAsRole(page, 'prestataire')

    // Capture du dashboard (automatiquement dans screenshots/prestataire/)
    await screenshot.capture({ name: 'dashboard-prestataire' })

    // Vérifier les éléments spécifiques au prestataire
    await expect(page.locator('h1')).toContainText('Tableau de bord')

    // Vérifier les interventions assignées
    await expect(page.locator('[data-testid="assigned-interventions"]')).toBeVisible()

    // Capture des interventions assignées
    await screenshot.captureElement('[data-testid="assigned-interventions"]', 'interventions-assignees')

    // Vérifier l'accès aux devis
    await page.click('[data-testid="nav-quotes"]')
    await page.waitForURL('**/quotes')

    // Capture de la page devis
    await screenshot.capture({ name: 'page-devis' })
  })

  test('création d\'un devis', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    await loginAsRole(page, 'prestataire')

    // Aller aux interventions assignées
    await page.goto('/prestataire/interventions')

    // Sélectionner une intervention nécessitant un devis
    await page.click('[data-needs-quote="true"]').first()

    // Capture du formulaire de devis
    await screenshot.capture({ name: 'formulaire-devis' })

    // Remplir le devis avec captures
    await screenshot.captureSequence([
      {
        name: 'ajout-ligne-devis',
        action: async () => {
          await page.click('[data-testid="add-quote-line"]')
          await page.fill('[name="description"]', 'Main d\'œuvre')
          await page.fill('[name="amount"]', '500')
        },
        waitAfter: 500
      },
      {
        name: 'ajout-materiel',
        action: async () => {
          await page.click('[data-testid="add-quote-line"]')
          await page.fill('[name="description"]', 'Matériel')
          await page.fill('[name="amount"]', '300')
        },
        waitAfter: 500
      }
    ])

    // Soumettre le devis
    await page.click('[data-testid="submit-quote"]')

    // Capture de confirmation
    await screenshot.capture({ name: 'devis-soumis' })

    await expect(page.locator('.notification-success')).toContainText('soumis')
  })
})