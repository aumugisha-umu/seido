/**
 * Page Object Model — Building Creation Wizard (Playwright version)
 *
 * 5-step wizard: Info > Lots > Contacts & Docs > Interventions > Confirmation
 *
 * Uses Playwright locators and auto-waiting instead of Puppeteer selectors.
 */

import { type Page, type Locator, expect } from '@playwright/test'
import path from 'path'

const TEST_PDF_PATH = path.resolve(__dirname, '../../fixtures/test-document.pdf')

/** Next button text per step (used for step detection) */
const NEXT_BUTTON_TEXT_BY_STEP: Record<number, string> = {
  1: 'Continuer vers les lots',
  2: 'Continuer vers les contacts',
  3: 'Planifier les interventions',
  4: 'Voir la confirmation',
}

export class BuildingWizardPage {
  readonly nextButton: Locator
  readonly prevButton: Locator
  readonly submitButton: Locator

  constructor(private page: Page) {
    this.nextButton = page.locator('[data-testid="wizard-next-btn"]')
    this.prevButton = page.locator('[data-testid="wizard-prev-btn"]')
    this.submitButton = page.locator('[data-testid="wizard-submit-btn"]')
  }

  /** Navigate to building creation and wait for step 1 */
  async navigate(): Promise<void> {
    await this.page.goto('/gestionnaire/biens/immeubles/nouveau')
    await expect(this.page.getByText(/ajouter un immeuble/i)).toBeVisible({ timeout: 45_000 })
  }

  // ─── Address ──────────────────────────────────────────────

  /** Fill address fields manually via native value setter (React controlled inputs) */
  async fillAddressManually(street: string, postalCode: string, city: string): Promise<void> {
    const streetInput = this.page.locator('#address-street')
    const postalCodeInput = this.page.locator('#address-postalCode')
    const cityInput = this.page.locator('#address-city')

    await streetInput.waitFor({ timeout: 10_000 })

    // Use evaluate for React controlled inputs that need native value setter
    for (const [selector, value] of [
      ['#address-street', street],
      ['#address-postalCode', postalCode],
      ['#address-city', city],
    ]) {
      await this.page.evaluate(([sel, val]) => {
        const input = document.querySelector(sel as string) as HTMLInputElement
        if (!input) throw new Error(`Input ${sel} not found`)
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )?.set
        nativeInputValueSetter?.call(input, val)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, [selector, value])
    }
  }

  /** Try Google Maps autocomplete. Returns true if it worked. */
  async fillAddressViaAutocomplete(query: string): Promise<boolean> {
    const autocomplete = this.page.locator('input[placeholder="Rechercher une adresse..."]')
    if (!(await autocomplete.isVisible({ timeout: 3_000 }).catch(() => false))) return false

    await autocomplete.click()
    await autocomplete.fill(query)

    try {
      const suggestion = this.page.locator('[cmdk-item]').first()
      await suggestion.waitFor({ timeout: 10_000 })
      await suggestion.click()
      await this.page.waitForTimeout(1500)
      return true
    } catch {
      return false
    }
  }

  /** Get value of an address field */
  async getAddressFieldValue(selector: string): Promise<string> {
    return await this.page.locator(selector).inputValue()
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
    await this.prevButton.click()
    await this.page.waitForTimeout(800)
  }

  /** Wait for a specific step by Next button text */
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

  async isPrevButtonVisible(): Promise<boolean> {
    return await this.prevButton.isVisible().catch(() => false)
  }

  // ─── Documents (Step 3) ───────────────────────────────────

  async switchToDocumentsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: /documents/i }).click()
    await this.page.waitForTimeout(500)
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
