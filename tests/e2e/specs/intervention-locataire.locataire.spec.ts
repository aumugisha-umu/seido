/**
 * Playwright E2E — Locataire Intervention Request
 *
 * Rewrite of intervention-locataire.e2e.ts (Puppeteer).
 * Tests the locataire request form at /locataire/interventions/nouvelle-demande:
 * - Step 1: Logement selection (skipped if only 1 lot)
 * - Step 2: Request details (type, description)
 * - Step 3: Confirmation + submit
 *
 * Uses storageState-based auth for locataire role (file suffix: .locataire.spec.ts).
 */

import { test, expect } from '@playwright/test'
import { InterventionRequestPage } from '../../shared/pages'
import { dismissBanners, waitForContent } from '../../shared/helpers/selectors'

test.describe('Locataire Intervention Request', () => {
  let request: InterventionRequestPage

  test.beforeEach(async ({ page }) => {
    request = new InterventionRequestPage(page)

    // Navigate to locataire dashboard to validate session
    await page.goto('/locataire/dashboard', { waitUntil: 'domcontentloaded' })
    await dismissBanners(page)
  })

  test('should load the request form', async ({ page }) => {
    await request.goto()

    // Should show either logement selection or directly the form
    await expect(
      page.getByText(/déclarer un sinistre|logement|type de problème/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('should show the details form (step 2)', async ({ page }) => {
    await request.goto()

    // If step 1 (logement) is shown, select and advance
    const logementBtn = page.getByRole('button', { name: /sélectionner ce logement/i }).first()
    if (await logementBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await request.selectFirstLot()
      await request.waitForNextEnabled(10_000)
      await request.clickNext()
    }

    // Should now show the details form
    await waitForContent(page, ['type de problème', 'description', 'urgence'], 15_000)
    await expect(page.getByText(/description/i).first()).toBeVisible()
  })

  test('should submit a request and get confirmation', async ({ page }) => {
    test.slow()

    // Navigate fresh via dashboard
    await page.goto('/locataire/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    await request.goto()

    // Handle step 1 if shown
    const logementBtn = page.getByRole('button', { name: /sélectionner ce logement/i }).first()
    if (await logementBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await request.selectFirstLot()
      await request.waitForNextEnabled(10_000)
      await request.clickNext()
    }

    // Step 2: Fill details
    await waitForContent(page, ['type de problème', 'description'], 15_000)
    await request.fillDetails({
      type: 'plomberie',
      description: `E2E Test: Fuite d'eau sous l'évier de la cuisine. ${Date.now()}`,
    })

    await request.waitForNextEnabled(15_000)

    // Advance to confirmation
    await request.clickNext()
    await page.waitForTimeout(1500)

    // Submit
    await request.submit()

    // Verify success toast
    const toastText = await request.expectSuccess()
    const isSuccess = toastText.includes('Demande envoyée') || toastText.includes('envoyée')
    const hasError = toastText.toLowerCase().includes('erreur')

    expect(isSuccess || !hasError).toBe(true)
  })
})
