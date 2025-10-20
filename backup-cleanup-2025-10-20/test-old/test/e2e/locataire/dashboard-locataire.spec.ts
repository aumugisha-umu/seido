/**
 * Tests E2E pour le dashboard locataire
 * Les captures seront automatiquement organisées dans test/screenshots/locataire/
 */

import { test, expect, loginAsRole } from '../../utils/test-helpers'
import { createScreenshotHelper } from '../../helpers/screenshot-helper'

test.describe('Dashboard Locataire', () => {
  test('création d\'une demande d\'intervention', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    // Login en tant que locataire
    await loginAsRole(page, 'locataire')

    // Capture du dashboard (automatiquement dans screenshots/locataire/)
    await screenshot.capture({ name: 'dashboard-locataire' })

    // Naviguer vers nouvelle demande
    await page.click('[data-testid="new-request"]')
    await page.waitForURL('**/nouvelle-demande')

    // Capture du formulaire
    await screenshot.capture({ name: 'formulaire-demande' })

    // Remplir la demande avec captures séquencées
    await screenshot.captureSequence([
      {
        name: 'selection-type',
        action: async () => {
          await page.selectOption('#type', 'plomberie')
        },
        waitAfter: 500
      },
      {
        name: 'description-probleme',
        action: async () => {
          await page.fill('#title', 'Fuite d\'eau dans la salle de bain')
          await page.fill('#description', 'Une fuite importante au niveau du lavabo')
        },
        waitAfter: 500
      },
      {
        name: 'selection-urgence',
        action: async () => {
          await page.click('[data-urgency="high"]')
        },
        waitAfter: 500
      },
      {
        name: 'ajout-photo',
        action: async () => {
          // Simuler l'ajout d'une photo
          const fileInput = page.locator('input[type="file"]')
          await fileInput.setInputFiles({
            name: 'fuite.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-content')
          })
        },
        waitAfter: 1000
      }
    ])

    // Soumettre la demande
    await page.click('[data-testid="submit-request"]')

    // Attendre la confirmation
    await page.waitForSelector('.notification-success')

    // Capture finale
    await screenshot.capture({ name: 'demande-creee' })

    await expect(page.locator('.notification-success')).toContainText('envoyée')
  })

  test('suivi des interventions', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    await loginAsRole(page, 'locataire')

    // Aller à mes interventions
    await page.goto('/locataire/interventions')

    // Capture de la liste
    await screenshot.capture({ name: 'mes-interventions' })

    // Filtrer par statut
    await page.click('[data-filter="en-cours"]')
    await screenshot.capture({ name: 'interventions-en-cours' })

    // Ouvrir le détail d'une intervention
    const firstIntervention = page.locator('[data-testid="intervention-card"]').first()
    await firstIntervention.click()

    // Capture du détail
    await screenshot.capture({ name: 'detail-intervention' })

    // Vérifier les informations affichées
    await expect(page.locator('[data-testid="intervention-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="intervention-timeline"]')).toBeVisible()

    // Capture de la timeline
    await screenshot.captureElement('[data-testid="intervention-timeline"]', 'timeline')
  })
})
