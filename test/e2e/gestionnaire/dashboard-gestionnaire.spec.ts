/**
 * Tests E2E pour le dashboard gestionnaire
 * Les captures seront automatiquement organisées dans test/screenshots/gestionnaire/
 */

import { test, expect, loginAsRole, captureOnError } from '../../utils/test-helpers'
import { createScreenshotHelper } from '../../helpers/screenshot-helper'

test.describe('Dashboard Gestionnaire', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Active la capture d'erreur automatique
    await captureOnError(page, testInfo)
  })

  test('affichage complet du dashboard gestionnaire', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    // Login en tant que gestionnaire
    await loginAsRole(page, 'gestionnaire')

    // Capture du dashboard initial (automatiquement dans screenshots/gestionnaire/)
    await screenshot.capture({ name: 'dashboard-initial' })

    // Vérifier les éléments principaux
    await expect(page.locator('h1')).toContainText('Tableau de bord')

    // Vérifier les cartes de statistiques
    const statsCards = page.locator('[data-testid="stats-card"]')
    await expect(statsCards).toHaveCount(4)

    // Capture des statistiques
    await screenshot.captureElement('[data-testid="stats-container"]', 'statistiques')

    // Vérifier la présence de la liste des interventions
    await expect(page.locator('[data-testid="interventions-list"]')).toBeVisible()

    // Capture de la liste des interventions
    await screenshot.captureElement('[data-testid="interventions-list"]', 'interventions')

    // Test de navigation vers la page interventions
    await page.click('[data-testid="nav-interventions"]')
    await page.waitForURL('**/interventions')

    // Capture de la page interventions
    await screenshot.capture({ name: 'page-interventions' })

    // Générer le rapport à la fin
    await screenshot.generateReport()
  })

  test('création d\'une nouvelle intervention', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    await loginAsRole(page, 'gestionnaire')

    // Naviguer vers les interventions
    await page.goto('/gestionnaire/interventions')
    await screenshot.capture({ name: 'page-interventions-initiale' })

    // Cliquer sur nouveau
    await page.click('[data-testid="new-intervention"]')
    await screenshot.capture({ name: 'formulaire-creation' })

    // Remplir le formulaire avec captures séquencées
    await screenshot.captureSequence([
      {
        name: 'remplir-titre',
        action: async () => {
          await page.fill('#title', 'Test intervention automatisée')
        },
        waitAfter: 500
      },
      {
        name: 'remplir-description',
        action: async () => {
          await page.fill('#description', 'Description de test créée automatiquement')
        },
        waitAfter: 500
      },
      {
        name: 'selectionner-urgence',
        action: async () => {
          await page.selectOption('#urgency', 'medium')
        },
        waitAfter: 500
      }
    ])

    // Soumettre le formulaire
    await page.click('button[type="submit"]')

    // Attendre la redirection ou confirmation
    await page.waitForURL('**/interventions/**', { timeout: 10000 })

    // Capture finale
    await screenshot.capture({ name: 'intervention-creee' })

    // Vérifier le message de succès
    await expect(page.locator('.notification-success')).toContainText('créée')
  })

  test('workflow de validation d\'intervention', async ({ page }, testInfo) => {
    const screenshot = createScreenshotHelper(page, testInfo)

    await loginAsRole(page, 'gestionnaire')

    // Aller directement à une intervention en attente
    await page.goto('/gestionnaire/interventions')

    // Capturer l'état initial
    await screenshot.capture({ name: 'liste-interventions-attente' })

    // Cliquer sur la première intervention en attente
    const firstIntervention = page.locator('[data-status="en-attente"]').first()
    await firstIntervention.click()

    // Capture de la page détail
    await screenshot.capture({ name: 'detail-intervention' })

    // Capturer la comparaison avant/après approbation
    await screenshot.captureComparison(
      async () => {
        // État avant
        await page.waitForSelector('[data-testid="intervention-status"]')
      },
      async () => {
        // Action d'approbation
        await page.click('[data-testid="approve-button"]')
        await page.fill('#internal-comment', 'Approuvé pour test')
        await page.click('[data-testid="confirm-approve"]')
        await page.waitForTimeout(1000)
      },
      'approbation-intervention'
    )

    // Vérifier le changement de statut
    await expect(page.locator('[data-testid="intervention-status"]')).toContainText('approuvée')
  })
})
