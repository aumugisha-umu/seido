/**
 * E2E — Contract Creation Wizard (Playwright)
 *
 * Steps:
 * 0. Lot selection (PropertySelector)
 * 1. Details et contacts (start date, rent, tenant selection via modal)
 * 2. Documents (optional — upload test PDF)
 * 3. Interventions (optional — auto-generated)
 * 4. Confirmation (review + submit "Creer le bail")
 *
 * Submission test creates a real contract in the staging DB with document upload.
 * Tests run against a live dev server with real staging data.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { ContractWizardPage } from '../../pages/contract-wizard.page.pw'

/** Absolute path to test PDF fixture (316 bytes, valid PDF 1.4) */
const TEST_PDF_PATH = path.resolve(__dirname, '../../../fixtures/test-document.pdf')

/**
 * Generate a unique future start date (ddMMyyyy digits) to avoid overlap conflicts.
 * Each run offsets by a random number of months (2040-2060 range) so
 * successive runs on the same lot don't trigger the contract overlap check.
 */
function generateUniqueStartDate(): string {
  const year = 2040 + Math.floor(Math.random() * 20)
  const month = 1 + Math.floor(Math.random() * 12)
  const dd = '01'
  const mm = String(month).padStart(2, '0')
  const yyyy = String(year)
  return `${dd}${mm}${yyyy}`
}

test.describe('Contract Creation Wizard', () => {
  let wizard: ContractWizardPage

  test.beforeEach(async ({ page }) => {
    wizard = new ContractWizardPage(page)
  })

  test('should submit and create a contract with document upload', async ({ page }) => {
    test.setTimeout(180_000)

    // Dashboard bounce: navigate to dashboard first to trigger middleware
    // token refresh. Without this, Server Component data fetches may return
    // empty if the JWT is stale.
    await page.goto('/gestionnaire/dashboard')
    await expect(page.getByText('Patrimoine')).toBeVisible({ timeout: 30_000 })

    // Wait for client-side data fetches to complete (team_members, notifications)
    await page.waitForLoadState('networkidle').catch(() => {
      // HMR WebSocket keeps connection alive in dev mode
    })

    // Navigate to wizard
    await wizard.navigate()

    // Step 0: Select a lot
    await wizard.selectFirstLot()
    await wizard.waitForNextEnabled(15_000)

    // Step 1: Fill details + add tenant
    await wizard.clickNext()
    await wizard.waitForStep(1)

    // Fill start date with unique future date to avoid overlap conflicts
    const startDate = generateUniqueStartDate()
    await wizard.fillStartDate(startDate)

    // Fill rent amount (required, must be > 0)
    await wizard.fillRentAmount('800')

    // Add first tenant via contact modal
    await wizard.addFirstTenant()

    // Duration defaults to 12 months, charges default to 0
    await wizard.waitForNextEnabled(15_000)

    // Step 2: Documents — upload a PDF to "Bail signe" slot
    await wizard.clickNext()
    await wizard.waitForStep(2)
    await wizard.uploadDocumentToSlot('bail', TEST_PDF_PATH)

    // Verify: staged file name should appear in the UI
    expect(await wizard.hasStagedFile('test-document.pdf')).toBe(true)

    // Step 3: Interventions (skip through)
    await wizard.clickNext()
    await wizard.waitForStep(3)

    // Step 4: Confirmation + Submit
    await wizard.clickNext()
    await wizard.waitForStep(4)
    await wizard.clickSubmit()

    // Verify: success toast appears
    await wizard.waitForSuccessToast(45_000)

    // Verify: redirect to contract detail page
    await wizard.waitForRedirect('/gestionnaire/contrats/')
    expect(page.url()).toContain('/gestionnaire/contrats/')
  })
})
