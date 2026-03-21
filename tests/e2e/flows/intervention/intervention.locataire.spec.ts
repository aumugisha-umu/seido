/**
 * E2E test — Locataire Intervention Request (Playwright)
 *
 * Tests the locataire request form at /locataire/interventions/nouvelle-demande:
 * - Step 1: Logement selection (skipped if only 1 lot)
 * - Step 2: Request details (type, description)
 * - Step 3: Confirmation + submit
 *
 * Authenticated as locataire via storageState.
 */

import { test, expect } from '@playwright/test'
import { AUTH_FILES } from '../../setup/auth.setup'
import { InterventionRequestPage } from '../../pages/intervention-request.page.pw'

test.use({ storageState: AUTH_FILES.locataire })

test.describe('Locataire Intervention Request', () => {
  let request: InterventionRequestPage

  test.beforeEach(async ({ page }) => {
    request = new InterventionRequestPage(page)

    // Navigate to locataire dashboard to validate auth
    await page.goto('/locataire/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
  })

  test('should load the request form', async () => {
    await request.navigate()

    // Should show either logement selection or directly the form
    const hasContent =
      (await request.hasContent('déclarer un sinistre')) ||
      (await request.hasContent('logement')) ||
      (await request.hasContent('type de problème'))
    expect(hasContent).toBe(true)
  })

  test('should show the details form (step 2)', async ({ page }) => {
    await request.navigate()

    // If step 1 (logement) is shown, select and advance
    const hasLogementStep = await request.hasContent('sélectionner ce logement')
    if (hasLogementStep) {
      await request.selectFirstLot()
      await request.waitForNextEnabled(10_000)
      await request.clickNext()
    }

    // Should now show the details form
    await expect(
      page.getByText(/type de problème|description|urgence/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    const hasDescription = await request.hasContent('description')
    expect(hasDescription).toBe(true)
  })

  test('should submit a request and get confirmation', async ({ page }) => {
    // Navigate fresh
    await page.goto('/locataire/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForTimeout(1000)
    await request.navigate()

    // Handle step 1 if shown
    const hasLogementStep = await request.hasContent('sélectionner ce logement')
    if (hasLogementStep) {
      await request.selectFirstLot()
      await request.waitForNextEnabled(10_000)
      await request.clickNext()
    }

    // Step 2: Fill details
    await expect(
      page.getByText(/type de problème|description/i).first(),
    ).toBeVisible({ timeout: 15_000 })
    await request.fillDetails({
      type: 'plomberie',
      description: `E2E Test: Fuite d'eau sous l'évier de la cuisine. ${Date.now()}`,
    })

    await request.waitForNextEnabled(15_000)

    // Advance to confirmation
    await request.clickNext()
    await page.waitForTimeout(1500)

    // Submit
    await request.clickSubmit()

    // Verify success toast
    await request.waitForSuccessToast(45_000)
    const isSuccess = await request.isSuccessToast()
    const hasError = await request.hasContent('erreur')

    expect(isSuccess || !hasError).toBe(true)
  })
})
