/**
 * Page Object Model — Lot Creation Wizard (Playwright version)
 *
 * 5-step wizard: Immeuble > Lot > Contacts & Docs > Interventions > Confirmation
 *
 * Step 1 modes: "existing" (select building), "independent" (no building).
 */

import { type Page, type Locator, expect } from '@playwright/test'
import path from 'path'

const TEST_PDF_PATH = path.resolve(__dirname, '../../fixtures/test-document.pdf')

const NEXT_BUTTON_TEXT_BY_STEP: Record<number, string> = {
  1: 'Suivant : Lot',
  2: 'Suivant : Contacts',
  3: 'Suivant : Interventions',
  4: 'Suivant : Confirmation',
}

export class LotWizardPage {
  readonly nextButton: Locator
  readonly prevButton: Locator
  readonly submitButton: Locator

  constructor(private page: Page) {
    this.nextButton = page.locator('[data-testid="wizard-next-btn"]')
    this.prevButton = page.locator('[data-testid="wizard-prev-btn"]')
    this.submitButton = page.locator('[data-testid="wizard-submit-btn"]')
  }

  /** Navigate to lot creation and wait for step 1 */
  async navigate(): Promise<void> {
    await this.page.goto('/gestionnaire/biens/lots/nouveau')
    await expect(this.page.getByText(/lier à un immeuble/i)).toBeVisible({ timeout: 45_000 })
    await this.nextButton.waitFor({ timeout: 15_000 })
  }

  // ─── Step 1: Building selection ───────────────────────────

  async selectFirstBuilding(): Promise<void> {
    const selectBtn = this.page.getByRole('button', { name: 'Sélectionner' }).first()
    await selectBtn.waitFor({ timeout: 30_000 })
    await selectBtn.click()
    await this.page.waitForTimeout(1000)
  }

  async selectIndependentMode(): Promise<void> {
    await this.page.locator('[data-testid="radio-independent"]').waitFor({ timeout: 10_000 })
    await this.nextButton.waitFor({ timeout: 10_000 })
    await this.page.waitForTimeout(1500) // React hydration

    // Click label to trigger Radix RadioGroupItem
    await this.page.locator('label[for="independent"]').click()
    await this.page.waitForTimeout(500)

    // Verify checked; retry if needed
    const isChecked = await this.page.locator('#independent').getAttribute('data-state')
    if (isChecked !== 'checked') {
      await this.page.locator('#independent').click()
      await this.page.waitForTimeout(500)
    }
  }

  // ─── Step 2: Lot address ──────────────────────────────────

  async fillIndependentLotAddress(
    street: string = 'Rue de la Loi 16',
    postalCode: string = '1000',
    city: string = 'Bruxelles',
  ): Promise<void> {
    const streetInput = this.page.locator('#address-street')
    await streetInput.waitFor({ timeout: 10_000 })

    await streetInput.click({ clickCount: 3 })
    await streetInput.fill(street)

    const postalCodeInput = this.page.locator('#address-postalCode')
    await postalCodeInput.click({ clickCount: 3 })
    await postalCodeInput.fill(postalCode)

    const cityInput = this.page.locator('#address-city')
    await cityInput.click({ clickCount: 3 })
    await cityInput.fill(city)

    await this.page.waitForTimeout(500)
  }

  // ─── Navigation ───────────────────────────────────────────

  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await expect(this.nextButton).toBeEnabled({ timeout })
  }

  async isNextButtonEnabled(): Promise<boolean> {
    return await this.nextButton.isEnabled()
  }

  async getNextButtonText(): Promise<string | null> {
    if (!(await this.nextButton.isVisible().catch(() => false))) return null
    return await this.nextButton.textContent()
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click()
    await this.page.waitForTimeout(800)
  }

  async clickPrev(): Promise<void> {
    await expect(this.prevButton).toBeEnabled({ timeout: 5_000 })
    await this.prevButton.click()
    await this.page.waitForTimeout(800)
  }

  async waitForStep(step: number, timeout: number = 15_000): Promise<void> {
    if (step === 5) {
      await this.submitButton.waitFor({ timeout })
      return
    }
    const expectedText = NEXT_BUTTON_TEXT_BY_STEP[step]
    if (!expectedText) throw new Error(`No button text defined for step ${step}`)
    await expect(this.nextButton).toContainText(expectedText, { ignoreCase: true, timeout })
  }

  // ─── Verification ─────────────────────────────────────────

  async hasStepIndicator(stepNumber: number): Promise<boolean> {
    return await this.page.locator(`[data-testid="step-item-${stepNumber}"]`).isVisible()
  }

  async hasContent(text: string): Promise<boolean> {
    return await this.page.getByText(text, { exact: false }).first().isVisible().catch(() => false)
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return await this.submitButton.isVisible()
  }

  async isPrevButtonDisabled(): Promise<boolean> {
    return !(await this.prevButton.isEnabled())
  }

  // ─── Documents (Step 3) ───────────────────────────────────

  async switchToDocumentsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: /documents/i }).click()
    await this.page.waitForTimeout(500)
  }

  async expandFirstLotAccordion(): Promise<void> {
    // Find accordion buttons in the active documents panel
    const docsPanel = this.page.locator('[role="tabpanel"][data-state="active"]')
    const accordionBtn = docsPanel.locator('button[type="button"]').first()
    await accordionBtn.waitFor({ timeout: 5_000 })
    await accordionBtn.click()
    await this.page.waitForTimeout(800)
  }

  async uploadDocumentToSlot(slotType: string, filePath: string = TEST_PDF_PATH): Promise<void> {
    const input = this.page.locator(`[data-testid="doc-upload-${slotType}"]`)
    await input.waitFor({ timeout: 10_000 })
    await input.setInputFiles(filePath)
    await this.page.waitForTimeout(1000)
  }

  async hasStagedFile(filename: string): Promise<boolean> {
    return await this.page.getByText(filename).isVisible().catch(() => false)
  }

  // ─── Submission ───────────────────────────────────────────

  async clickSubmit(): Promise<void> {
    await this.submitButton.click()
  }

  async waitForSuccessToast(timeout: number = 30_000): Promise<void> {
    await expect(this.page.getByText(/créé avec succès/i)).toBeVisible({ timeout })
  }

  async waitForRedirect(urlPart: string, timeout: number = 30_000): Promise<void> {
    await this.page.waitForURL(`**${urlPart}*`, { timeout })
  }
}
