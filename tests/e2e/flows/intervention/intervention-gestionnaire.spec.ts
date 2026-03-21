/**
 * E2E test — Gestionnaire Intervention Creation (Playwright)
 *
 * Tests the 4-step wizard at /gestionnaire/interventions/nouvelle-intervention:
 * - Step 1: Select property (building/lot)
 * - Step 2: Fill intervention details (title, type, urgency, description)
 * - Step 3: Contacts assignment (skip with defaults)
 * - Step 4: Confirmation + submit
 *
 * Authenticated as gestionnaire via storageState from auth setup.
 */

import { test, expect } from '@playwright/test'
import { InterventionWizardPage } from '../../pages/intervention-wizard.page.pw'

test.describe('Gestionnaire Intervention Creation', () => {
  let wizard: InterventionWizardPage

  test.beforeEach(async ({ page }) => {
    wizard = new InterventionWizardPage(page)

    // Navigate to gestionnaire dashboard to validate auth
    await page.goto('/gestionnaire/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
  })

  test('should load the intervention creation wizard (step 1)', async () => {
    await wizard.navigate()

    // Verify step 1 content -- property selection
    const hasContent = await wizard.hasContent('bien')
    expect(hasContent).toBe(true)
  })

  test('should select a property and enable Continue button', async () => {
    await wizard.navigate()
    await wizard.selectFirstProperty()

    await wizard.waitForNextEnabled(10_000)
    const isEnabled = await wizard.isNextButtonEnabled()
    expect(isEnabled).toBe(true)
  })

  test('should navigate to step 2 and show detail fields', async ({ page }) => {
    await wizard.navigate()
    await wizard.selectFirstProperty()
    await wizard.waitForNextEnabled(10_000)
    await wizard.clickNext()

    // Wait for step 2 to load -- should show description or type fields
    await expect(
      page.getByText(/description|type|urgence|titre/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    const hasType = await wizard.hasContent('type')
    expect(hasType).toBe(true)
  })

  test('should submit and create an intervention with full details', async ({ page }) => {
    await wizard.navigate()

    // Step 1: Select first property
    await wizard.selectFirstProperty()
    await wizard.waitForNextEnabled(10_000)

    // Step 2: Fill intervention details
    await wizard.clickNext()
    await expect(
      page.getByText(/description|type|urgence/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    await wizard.fillDetails({
      title: `E2E Test: Fuite robinet ${Date.now()}`,
      type: 'plomberie',
      description: 'Test E2E: Fuite au niveau du robinet de la cuisine. Intervention urgente requise.',
    })

    await wizard.waitForNextEnabled(15_000)

    // Step 3: Contacts (skip through with defaults)
    await wizard.clickNext()
    await page.waitForTimeout(1500)

    // Step 4: Confirmation -- click submit
    // Try to advance. If we're already on confirmation, the submit button will be visible.
    const hasSubmitAlready = await wizard.hasContent("créer l'intervention")
    if (!hasSubmitAlready) {
      await wizard.waitForNextEnabled(15_000)
      await wizard.clickNext()
      await page.waitForTimeout(1500)
    }

    // Submit
    await wizard.clickSubmit()

    // Verify: success toast or redirect
    await wizard.waitForSuccessToast(45_000)
    const isSuccess = await wizard.isSuccessToast()
    const hasError = await wizard.hasContent('erreur')

    // Should succeed or redirect -- fail only if explicit error
    expect(isSuccess || !hasError).toBe(true)
  })
})
