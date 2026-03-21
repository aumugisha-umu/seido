/**
 * Page Object Model — Contract Creation Wizard (Playwright version)
 *
 * 5-step wizard (0-indexed internally):
 * 0. Lot (select a lot from PropertySelector)
 * 1. Details et contacts (start date, rent, tenant selection)
 * 2. Documents (optional — upload files)
 * 3. Interventions (optional — auto-generated)
 * 4. Confirmation (review + submit)
 *
 * Uses Playwright locators and auto-waiting instead of Puppeteer selectors.
 * Selectors use data-testid attributes for resilience across view modes.
 */

import { type Page, type Locator, expect } from '@playwright/test'

/** data-testid and CSS selectors */
export const CONTRACT_WIZARD_SELECTORS = {
  nextButton: '[data-testid="wizard-next-btn"]',
  prevButton: '[data-testid="wizard-prev-btn"]',
  submitButton: '[data-testid="wizard-submit-btn"]',
  stepItem: (n: number) => `[data-testid="step-item-${n}"]`,
  lotSelectBtn: '[data-testid^="lot-select-btn-"]',
  rentAmountInput: '#rentAmount',
  addTenantBtn: '[data-testid="add-contact-btn-tenants"]',
  contactDialog: '[data-testid="contact-selector-dialog"]',
  contactRadio: '[data-testid^="contact-radio-"]',
  contactCheckbox: '[data-testid^="contact-checkbox-"]',
  contactConfirmBtn: '[data-testid="contact-confirm-btn"]',
  docUploadInput: (type: string) => `[data-testid="doc-upload-${type}"]`,
} as const

export class ContractWizardPage {
  readonly nextButton: Locator
  readonly prevButton: Locator
  readonly submitButton: Locator

  constructor(private page: Page) {
    this.nextButton = page.locator(CONTRACT_WIZARD_SELECTORS.nextButton)
    this.prevButton = page.locator(CONTRACT_WIZARD_SELECTORS.prevButton)
    this.submitButton = page.locator(CONTRACT_WIZARD_SELECTORS.submitButton)
  }

  /** Navigate to the contract creation page and wait for step 0 to load */
  async navigate(): Promise<void> {
    await this.page.goto('/gestionnaire/contrats/nouveau')
    await expect(
      this.page.getByText(/sélectionnez le lot/i),
    ).toBeVisible({ timeout: 30_000 })
  }

  // --- Step 0: Lot selection ---

  /**
   * Select the first available lot from the PropertySelector.
   *
   * Forces card view first (list view on Immeubles tab hides lot buttons),
   * then clicks the first lot-select button.
   */
  async selectFirstLot(): Promise<void> {
    const viewToggle = this.page.locator('[data-testid="view-toggle-cards"]')

    // Force card view if toggle is present
    try {
      await viewToggle.waitFor({ timeout: 10_000 })
      await viewToggle.click()
      await this.page.waitForTimeout(500)
    } catch {
      // View toggle not present (showViewToggle=false) — card view is default
    }

    // Wait for at least one lot select button
    const lotButton = this.page.locator(CONTRACT_WIZARD_SELECTORS.lotSelectBtn).first()
    await lotButton.waitFor({ timeout: 30_000 })

    // Small delay for React hydration (event handlers need to be attached)
    await this.page.waitForTimeout(1000)

    // Click the first lot select button
    await lotButton.click()

    // Verify: wait for Next button to become enabled (lot selected)
    await this.waitForNextEnabled(10_000)
  }

  // --- Step 1: Details & Contacts ---

  /**
   * Fill in the start date via the DatePicker's masked input.
   *
   * The DatePicker has an applyDateMask() that strips non-digits and
   * auto-inserts slashes. We type ONLY digits (e.g., '01032026')
   * and let the mask produce '01/03/2026'.
   *
   * @param digits - 8 digits in ddMMyyyy format (default: '01032026')
   */
  async fillStartDate(digits: string = '01032026'): Promise<void> {
    const input = this.page.locator('input[placeholder="jj/mm/aaaa"]')
    await input.waitFor({ timeout: 10_000 })

    await input.click({ clickCount: 3 })
    await this.page.keyboard.press('Backspace')
    await input.pressSequentially(digits, { delay: 50 })
    await this.page.keyboard.press('Tab')
    await this.page.waitForTimeout(500)
  }

  /** Fill in the rent amount field. */
  async fillRentAmount(amount: string = '800'): Promise<void> {
    const input = this.page.locator(CONTRACT_WIZARD_SELECTORS.rentAmountInput)
    await input.waitFor({ timeout: 10_000 })

    await input.click({ clickCount: 3 })
    await input.pressSequentially(amount, { delay: 30 })
    await this.page.waitForTimeout(300)
  }

  /**
   * Add a tenant by opening the contact modal and selecting the first available contact.
   *
   * Uses data-testid selectors for all interactions:
   * - add-contact-btn-tenants: opens the ContactSelector modal
   * - contact-radio-{id} / contact-checkbox-{id}: select a contact
   * - contact-confirm-btn: confirm selection
   *
   * Retries up to 3 times if dialog doesn't open (useImperativeHandle ref wiring).
   */
  async addFirstTenant(): Promise<void> {
    const addButton = this.page.locator(CONTRACT_WIZARD_SELECTORS.addTenantBtn)
    const dialog = this.page.locator(CONTRACT_WIZARD_SELECTORS.contactDialog)

    // Wait for the "Ajouter locataire" button to appear
    await addButton.waitFor({ timeout: 15_000 })

    // Wait for form hydration (ContactSelector ref needs mount + useImperativeHandle effect)
    await this.page.waitForTimeout(2000)

    // Retry loop: click -> check dialog -> retry if ref wasn't ready yet
    for (let attempt = 1; attempt <= 3; attempt++) {
      await addButton.click()

      try {
        await dialog.waitFor({ timeout: 3_000 })
        break // Dialog opened
      } catch {
        if (attempt === 3) {
          throw new Error('Contact dialog did not open after 3 attempts (contactSelectorRef likely null)')
        }
        // Wait before retry
        await this.page.waitForTimeout(2000)
      }
    }

    // Wait for contacts to load inside the dialog (radio or checkbox)
    const contactOption = this.page.locator(
      `${CONTRACT_WIZARD_SELECTORS.contactRadio}, ${CONTRACT_WIZARD_SELECTORS.contactCheckbox}`,
    ).first()
    await contactOption.waitFor({ timeout: 30_000 })
    await this.page.waitForTimeout(500)

    // Click the first contact radio/checkbox
    await contactOption.click()
    await this.page.waitForTimeout(500)

    // Click "Confirmer"
    await this.page.locator(CONTRACT_WIZARD_SELECTORS.contactConfirmBtn).click()

    // Wait for modal to close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await this.page.waitForTimeout(500)
  }

  // --- Step 2: Document upload ---

  /** Upload a file to a specific document slot by type (e.g., 'bail'). */
  async uploadDocumentToSlot(slotType: string, filePath: string): Promise<void> {
    const input = this.page.locator(CONTRACT_WIZARD_SELECTORS.docUploadInput(slotType))
    await input.waitFor({ timeout: 10_000 })
    await input.setInputFiles(filePath)
    await this.page.waitForTimeout(1000)
  }

  /** Check if a staged file name is visible on the page */
  async hasStagedFile(filename: string): Promise<boolean> {
    return await this.page.getByText(filename).isVisible().catch(() => false)
  }

  // --- Navigation methods ---

  async isNextButtonEnabled(): Promise<boolean> {
    return await this.nextButton.isEnabled()
  }

  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await expect(this.nextButton).toBeEnabled({ timeout })
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click()
    await this.page.waitForTimeout(800)
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.click()
    await this.page.waitForTimeout(800)
  }

  async waitForStep(step: number, timeout: number = 15_000): Promise<void> {
    if (step === 4) {
      await this.submitButton.waitFor({ timeout })
      return
    }

    const stepContent: Record<number, string> = {
      0: 'sélectionnez le lot',
      1: 'détails du bail',
      2: 'documents du bail',
      3: 'interventions',
    }
    const expected = stepContent[step]
    if (!expected) throw new Error(`No content defined for step ${step}`)

    await expect(
      this.page.getByText(new RegExp(expected, 'i')),
    ).toBeVisible({ timeout })
  }

  // --- Verification methods ---

  async hasContent(text: string): Promise<boolean> {
    return await this.page
      .getByText(text, { exact: false })
      .first()
      .isVisible()
      .catch(() => false)
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return await this.submitButton.isVisible()
  }

  // --- Submission methods ---

  async clickSubmit(): Promise<void> {
    await this.submitButton.waitFor({ timeout: 10_000 })
    await this.submitButton.click()
  }

  /**
   * Wait for success toast after contract submission.
   * Throws if error toast appears instead.
   */
  async waitForSuccessToast(timeout: number = 30_000): Promise<void> {
    await expect(
      this.page.getByText(/bail créé avec succès/i),
    ).toBeVisible({ timeout })
  }

  async waitForRedirect(urlPart: string, timeout: number = 30_000): Promise<void> {
    await this.page.waitForURL(`**${urlPart}*`, { timeout })
  }
}
