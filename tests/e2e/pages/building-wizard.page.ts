/**
 * Page Object Model — Building Creation Wizard (/gestionnaire/biens/immeubles/nouveau)
 *
 * 5-step wizard: Info > Lots > Contacts & Docs > Interventions > Confirmation
 *
 * Step detection strategy: Uses the Next button text to identify which step we're on,
 * since each step has a unique button label. This is more reliable than content markers
 * because the step header labels ("Confirmation", "Lots", etc.) are visible on ALL steps.
 *
 * NOTE: This POM navigates through steps WITHOUT submitting the form.
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'
import { KNOWN_ENTITIES } from '../../fixtures/known-entities'
import { waitForContent } from '../helpers/selectors'
import { dismissCookieBanner } from '../helpers/cookies'

/** data-testid selectors */
export const BUILDING_WIZARD_SELECTORS = {
  nextButton: '[data-testid="wizard-next-btn"]',
  prevButton: '[data-testid="wizard-prev-btn"]',
  submitButton: '[data-testid="wizard-submit-btn"]',
  stepItem: (n: number) => `[data-testid="step-item-${n}"]`,
  // Address fields
  addressStreet: '#address-street',
  addressPostalCode: '#address-postalCode',
  addressCity: '#address-city',
  // Google Maps autocomplete
  autocompleteInput: 'input[placeholder="Rechercher une adresse..."]',
  // Document upload (Step 3)
  documentsTab: 'button[value="documents"]',
  docUploadInput: (type: string) => `[data-testid="doc-upload-${type}"]`,
} as const

/**
 * Next button text per step (used for step detection).
 * Step 5 uses the submit button, not the next button.
 */
const NEXT_BUTTON_TEXT_BY_STEP: Record<number, string> = {
  1: 'Continuer vers les lots',
  2: 'Continuer vers les contacts',
  3: 'Planifier les interventions',
  4: 'Voir la confirmation',
}

export class BuildingWizardPage {
  constructor(private page: Page) {}

  /** Navigate to the building creation page and wait for step 1 to load */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await dismissCookieBanner(this.page)
    await this.page.goto(`${baseUrl}${KNOWN_ENTITIES.routes.newBuilding}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    // Wait for step 1 form content
    await waitForContent(
      this.page,
      KNOWN_ENTITIES.contentMarkers.buildingWizard,
      45_000,
    )
  }

  // ─── Address filling methods ──────────────────────────────────────

  /**
   * Set a value on a React controlled input using the native value setter.
   * This bypasses keyboard events and directly triggers React's onChange.
   *
   * Required because Puppeteer's type() doesn't reliably work on React
   * controlled inputs inside GoogleMapsProvider.
   */
  private async setReactInputValue(selector: string, value: string): Promise<void> {
    await this.page.evaluate((sel: string, val: string) => {
      const input = document.querySelector(sel) as HTMLInputElement
      if (!input) throw new Error(`Input ${sel} not found in DOM`)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set
      nativeInputValueSetter?.call(input, val)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, selector, value)
  }

  /**
   * Fill address fields manually (street, postal code, city).
   * Uses native value setter for React controlled input compatibility.
   */
  async fillAddressManually(street: string, postalCode: string, city: string): Promise<void> {
    await this.page.waitForSelector(BUILDING_WIZARD_SELECTORS.addressStreet, {
      timeout: 10_000,
    })
    await this.setReactInputValue(BUILDING_WIZARD_SELECTORS.addressStreet, street)
    await this.setReactInputValue(BUILDING_WIZARD_SELECTORS.addressPostalCode, postalCode)
    await this.setReactInputValue(BUILDING_WIZARD_SELECTORS.addressCity, city)
  }

  /**
   * Fill address via Google Maps autocomplete search.
   * Types in the autocomplete input, waits for suggestions, clicks the first one.
   * Requires a working Google Maps API key and network access.
   *
   * @returns true if autocomplete worked, false if it timed out (no suggestions)
   */
  async fillAddressViaAutocomplete(query: string): Promise<boolean> {
    const autocomplete = await this.page.$(BUILDING_WIZARD_SELECTORS.autocompleteInput)
    if (!autocomplete) return false

    // Type the search query
    await autocomplete.click({ clickCount: 3 })
    await autocomplete.type(query, { delay: 50 })

    // Wait for suggestions to appear (Google Places API)
    try {
      await this.page.waitForSelector('[cmdk-item]', { timeout: 10_000 })
      // Click the first suggestion
      const firstSuggestion = await this.page.$('[cmdk-item]')
      if (firstSuggestion) {
        await firstSuggestion.click()
        // Wait for the fields to be populated by the autocomplete callback
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      }
    } catch {
      // Google Maps API might not be available — fall back to manual
      return false
    }
    return false
  }

  // ─── Navigation methods ───────────────────────────────────────────

  /** Get the text content of the Next button (null if not present) */
  async getNextButtonText(): Promise<string | null> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.nextButton)
    if (!btn) return null
    return await this.page.evaluate(el => el.textContent?.trim() || '', btn)
  }

  /** Check if the next button is visible and enabled */
  async isNextButtonEnabled(): Promise<boolean> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.nextButton)
    if (!btn) return false
    return await this.page.evaluate(el => !el.disabled, btn)
  }

  /**
   * Wait for the Next button to become enabled.
   * Useful after filling form fields, because validation may be async
   * (e.g., name uniqueness check runs against the DB).
   */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await this.page.waitForFunction(
      (selector: string) => {
        const btn = document.querySelector(selector) as HTMLButtonElement | null
        return btn !== null && !btn.disabled
      },
      { timeout, polling: 500 },
      BUILDING_WIZARD_SELECTORS.nextButton,
    )
  }

  /** Click the next button to advance to the next step */
  async clickNext(): Promise<void> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.nextButton)
    if (!btn) throw new Error('Next button not found (data-testid="wizard-next-btn")')
    await btn.click()
    // Wait for React state transition + re-render
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Click the previous button to go back */
  async clickPrev(): Promise<void> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.prevButton)
    if (!btn) throw new Error('Previous button not found (data-testid="wizard-prev-btn")')
    await btn.click()
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /**
   * Wait until the Next button shows the expected text for a given step.
   * For step 5, waits for the submit button instead.
   */
  async waitForStep(step: number, timeout: number = 15_000): Promise<void> {
    if (step === 5) {
      // Step 5: wait for submit button to appear
      await this.page.waitForSelector(BUILDING_WIZARD_SELECTORS.submitButton, { timeout })
      return
    }

    const expectedText = NEXT_BUTTON_TEXT_BY_STEP[step]
    if (!expectedText) throw new Error(`No button text defined for step ${step}`)

    // Poll until the next button contains the expected text
    await this.page.waitForFunction(
      (selector: string, text: string) => {
        const btn = document.querySelector(selector)
        return btn?.textContent?.trim().toLowerCase().includes(text.toLowerCase()) || false
      },
      { timeout, polling: 300 },
      BUILDING_WIZARD_SELECTORS.nextButton,
      expectedText,
    )
  }

  // ─── Verification methods ─────────────────────────────────────────

  /** Check if the step header shows a specific step number */
  async hasStepIndicator(stepNumber: number): Promise<boolean> {
    const el = await this.page.$(BUILDING_WIZARD_SELECTORS.stepItem(stepNumber))
    return el !== null
  }

  /** Check if the page body has specific text content */
  async hasContent(text: string): Promise<boolean> {
    return await this.page.evaluate((t) => {
      return document.body.innerText.toLowerCase().includes(t.toLowerCase())
    }, text)
  }

  /** Check if the submit button is visible (only on step 5) */
  async isSubmitButtonVisible(): Promise<boolean> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.submitButton)
    return btn !== null
  }

  /** Check if the prev button is visible */
  async isPrevButtonVisible(): Promise<boolean> {
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.prevButton)
    return btn !== null
  }

  /** Get the current value of an address field */
  async getAddressFieldValue(selector: string): Promise<string> {
    return await this.page.evaluate((sel: string) => {
      const input = document.querySelector(sel) as HTMLInputElement
      return input?.value || ''
    }, selector)
  }

  // ─── Document upload methods (Step 3) ─────────────────────────────

  /**
   * Switch to the "Documents" sub-tab on Step 3.
   * Step 3 has two sub-tabs: "Contacts" (default) and "Documents".
   * Must use Puppeteer native click (not page.evaluate click) because
   * Radix UI TabsTrigger requires real browser events for state change.
   */
  async switchToDocumentsTab(): Promise<void> {
    // Find the tab button that contains "Documents" text using XPath-like approach
    const tabs = await this.page.$$('button[role="tab"]')
    let docsTab = null
    for (const tab of tabs) {
      const text = await this.page.evaluate(el => el.textContent || '', tab)
      if (text.includes('Documents')) {
        docsTab = tab
        break
      }
    }
    if (!docsTab) throw new Error('Documents tab not found (button[role="tab"] with "Documents" text)')
    // Use Puppeteer's native click (dispatches real mouse events)
    await docsTab.click()
    // Wait for Radix tab state transition
    await this.page.waitForFunction(
      () => {
        const panels = document.querySelectorAll('[role="tabpanel"]')
        return Array.from(panels).some(
          p => p.id.includes('documents') && (p as HTMLElement).dataset.state === 'active'
        )
      },
      { timeout: 5_000, polling: 300 },
    )
  }

  /**
   * Upload a file to a specific document slot by type (e.g., 'certificat_peb').
   * Uses Puppeteer's uploadFile on the hidden input, which is the most reliable
   * approach for file inputs hidden behind drag-drop zones.
   *
   * @param slotType - The document slot type (matches data-testid="doc-upload-{type}")
   * @param filePath - Absolute path to the file to upload
   */
  async uploadDocumentToSlot(slotType: string, filePath: string): Promise<void> {
    const selector = BUILDING_WIZARD_SELECTORS.docUploadInput(slotType)
    // Wait for the input to appear in DOM (tab must be active for Radix to render content)
    await this.page.waitForFunction(
      (sel: string) => document.querySelector(sel) !== null,
      { timeout: 10_000, polling: 500 },
      selector,
    )
    const input = await this.page.$(selector)
    if (!input) throw new Error(`Document upload input not found: ${selector}`)
    await input.uploadFile(filePath)
    // Wait for the file to be staged in React state
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Check if a staged file name is visible on the page.
   * After uploadFile, the file name should appear in the slot's file list.
   */
  async hasStagedFile(filename: string): Promise<boolean> {
    return await this.page.evaluate((name) => {
      return document.body.innerText.includes(name)
    }, filename)
  }

  // ─── Submission methods ─────────────────────────────────────────

  /** Click the submit button on step 5 ("Confirmer la création") */
  async clickSubmit(): Promise<void> {
    await this.page.waitForSelector(BUILDING_WIZARD_SELECTORS.submitButton, { timeout: 10_000 })
    const btn = await this.page.$(BUILDING_WIZARD_SELECTORS.submitButton)
    if (!btn) throw new Error('Submit button not found')
    await btn.click()
  }

  /**
   * Wait for the success toast to appear after form submission.
   * Polls the DOM for "créé avec succès" text (Radix toast renders in body).
   */
  async waitForSuccessToast(timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      () => document.body.innerText.includes('créé avec succès'),
      { timeout, polling: 500 },
    )
    return await this.page.evaluate(() => document.body.innerText)
  }

  /**
   * Wait for URL to change to the expected path after form submission.
   * Uses polling because Next.js router.push() does client-side navigation.
   */
  async waitForRedirect(urlPart: string, timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      (part: string) => window.location.href.includes(part),
      { timeout, polling: 500 },
      urlPart,
    )
    return this.page.url()
  }
}
