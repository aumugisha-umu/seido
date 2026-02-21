/**
 * Page Object Model — Lot Creation Wizard (/gestionnaire/biens/lots/nouveau)
 *
 * 5-step wizard: Immeuble > Lot > Contacts & Docs > Interventions > Confirmation
 *
 * Step 1 has 3 building association modes:
 * - "existing": Select an existing building (requires PropertySelector interaction)
 * - "new": Redirects to building creation wizard
 * - "independent": No building association (simplest for testing navigation)
 *
 * Step detection: Uses Next button text `"Suivant : {stepLabel}"` which is unique per step.
 * Step 5 uses the submit button "Créer le lot".
 *
 * NOTE: The Prev button is ALWAYS rendered but disabled on step 1 (unlike building wizard).
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'
import { KNOWN_ENTITIES } from '../../fixtures/known-entities'
import { waitForContent } from '../helpers/selectors'
import { dismissCookieBanner } from '../helpers/cookies'

/** data-testid and CSS selectors */
export const LOT_WIZARD_SELECTORS = {
  nextButton: '[data-testid="wizard-next-btn"]',
  prevButton: '[data-testid="wizard-prev-btn"]',
  submitButton: '[data-testid="wizard-submit-btn"]',
  stepItem: (n: number) => `[data-testid="step-item-${n}"]`,
  // Step 1: building association radio buttons (data-testid)
  radioExisting: '[data-testid="radio-existing"]',
  radioNew: '[data-testid="radio-new"]',
  radioIndependent: '[data-testid="radio-independent"]',
  // Document upload (Step 3)
  docUploadInput: (type: string) => `[data-testid="doc-upload-${type}"]`,
} as const

/**
 * Next button text per step.
 * Format: "Suivant : {lotSteps[currentStep].label}"
 * lotSteps = [Immeuble, Lot, Contacts & Documents, Interventions, Confirmation]
 * So step N shows lotSteps[N].label (0-indexed from currentStep).
 */
const NEXT_BUTTON_TEXT_BY_STEP: Record<number, string> = {
  1: 'Suivant : Lot',
  2: 'Suivant : Contacts',
  3: 'Suivant : Interventions',
  4: 'Suivant : Confirmation',
}

export class LotWizardPage {
  constructor(private page: Page) {}

  /** Navigate to the lot creation page and wait for step 1 to load.
   *  Server Component handles auth — no TeamCheckModal needed.
   *  We wait for specific wizard content AND the Next button to ensure
   *  the form has fully loaded.
   */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await dismissCookieBanner(this.page)
    await this.page.goto(`${baseUrl}${KNOWN_ENTITIES.routes.newLot}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    // Wait for wizard content (Server Component renders after auth)
    await waitForContent(this.page, KNOWN_ENTITIES.contentMarkers.lotWizard, 45_000)
    // Also wait for the Next button to appear (confirms wizard form is rendered)
    await this.page.waitForSelector(LOT_WIZARD_SELECTORS.nextButton, { timeout: 15_000 })
  }

  /**
   * Select the first building from the building list on step 1.
   * The default radio "Lier à un immeuble existant" is already selected,
   * so we just need to click one of the "Sélectionner" buttons.
   */
  async selectFirstBuilding(): Promise<void> {
    // Wait for building cards to load (PropertySelector fetches from API)
    await this.page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('button')
        return Array.from(buttons).some(b => b.textContent?.trim() === 'Sélectionner')
      },
      { timeout: 30_000, polling: 500 },
    )

    // Click the first "Sélectionner" button
    await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim() === 'Sélectionner') {
          btn.click()
          return
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Select "Laisser le lot indépendant" mode on step 1.
   * Clicks the independent radio button using data-testid.
   * After selection, the Next button should be immediately enabled
   * (canProceedToNextStep returns true for independent mode).
   */
  async selectIndependentMode(): Promise<void> {
    // Wait for hydration to complete — both the radio and Next button must exist
    await this.page.waitForSelector(LOT_WIZARD_SELECTORS.radioIndependent, { timeout: 10_000 })
    await this.page.waitForSelector(LOT_WIZARD_SELECTORS.nextButton, { timeout: 10_000 })
    // Extra wait for React hydration (Server Component → Client Component handoff)
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Use Puppeteer's native click on the Label which triggers the RadioGroupItem
    // The <Label htmlFor="independent"> is inside the wrapper div and is the
    // canonical trigger for the Radix RadioGroupItem
    await this.page.evaluate(() => {
      const label = document.querySelector('label[for="independent"]') as HTMLElement
      if (label) label.click()
    })

    // Wait for state change to propagate
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify: the RadioGroupItem data-state should be "checked"
    // If first click didn't work (race condition), retry with direct RadioGroupItem click
    const isChecked = await this.page.evaluate(() => {
      const radio = document.querySelector('#independent')
      return radio?.getAttribute('data-state') === 'checked'
    })

    if (!isChecked) {
      // Retry: click the RadioGroupItem directly
      await this.page.evaluate(() => {
        const radio = document.querySelector('#independent') as HTMLElement
        if (radio) radio.click()
      })
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  /**
   * Fill in the required address fields for the first independent lot on step 2.
   * The lot already has reference "Lot 1" and country "Belgique" by default.
   * We just need to fill street, postal code, and city to pass validation.
   */
  async fillIndependentLotAddress(
    street: string = 'Rue de la Loi 16',
    postalCode: string = '1000',
    city: string = 'Bruxelles',
  ): Promise<void> {
    // Wait for the address fields to appear
    await this.page.waitForSelector('#address-street', { timeout: 10_000 })

    // Clear and fill street
    await this.page.click('#address-street', { clickCount: 3 })
    await this.page.type('#address-street', street)

    // Clear and fill postal code
    await this.page.click('#address-postalCode', { clickCount: 3 })
    await this.page.type('#address-postalCode', postalCode)

    // Clear and fill city
    await this.page.click('#address-city', { clickCount: 3 })
    await this.page.type('#address-city', city)

    // Wait for React state to update
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // ─── Navigation methods ───────────────────────────────────────────

  /** Get the text content of the Next button */
  async getNextButtonText(): Promise<string | null> {
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.nextButton)
    if (!btn) return null
    return await this.page.evaluate(el => el.textContent?.trim() || '', btn)
  }

  /** Check if the next button is enabled */
  async isNextButtonEnabled(): Promise<boolean> {
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.nextButton)
    if (!btn) return false
    return await this.page.evaluate(el => !el.disabled, btn)
  }

  /** Wait for the Next button to become enabled */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await this.page.waitForFunction(
      (selector: string) => {
        const btn = document.querySelector(selector) as HTMLButtonElement | null
        return btn !== null && !btn.disabled
      },
      { timeout, polling: 500 },
      LOT_WIZARD_SELECTORS.nextButton,
    )
  }

  /** Click the next button */
  async clickNext(): Promise<void> {
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.nextButton)
    if (!btn) throw new Error('Next button not found')
    await btn.click()
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Click the previous button */
  async clickPrev(): Promise<void> {
    // Lot wizard always shows prev button (disabled on step 1)
    await this.page.waitForSelector(
      `${LOT_WIZARD_SELECTORS.prevButton}:not([disabled])`,
      { timeout: 5_000 },
    )
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.prevButton)
    if (!btn) throw new Error('Previous button not found')
    await btn.click()
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Wait for a specific step by checking the Next button text */
  async waitForStep(step: number, timeout: number = 15_000): Promise<void> {
    if (step === 5) {
      await this.page.waitForSelector(LOT_WIZARD_SELECTORS.submitButton, { timeout })
      return
    }

    const expectedText = NEXT_BUTTON_TEXT_BY_STEP[step]
    if (!expectedText) throw new Error(`No button text defined for step ${step}`)

    await this.page.waitForFunction(
      (selector: string, text: string) => {
        const btn = document.querySelector(selector)
        return btn?.textContent?.trim().toLowerCase().includes(text.toLowerCase()) || false
      },
      { timeout, polling: 300 },
      LOT_WIZARD_SELECTORS.nextButton,
      expectedText,
    )
  }

  // ─── Verification methods ─────────────────────────────────────────

  async hasStepIndicator(stepNumber: number): Promise<boolean> {
    const el = await this.page.$(LOT_WIZARD_SELECTORS.stepItem(stepNumber))
    return el !== null
  }

  async hasContent(text: string): Promise<boolean> {
    return await this.page.evaluate((t) => {
      return document.body.innerText.toLowerCase().includes(t.toLowerCase())
    }, text)
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.submitButton)
    return btn !== null
  }

  /** Check if the prev button is disabled (it's always visible, but disabled on step 1) */
  async isPrevButtonDisabled(): Promise<boolean> {
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.prevButton)
    if (!btn) return true
    return await this.page.evaluate(el => el.disabled, btn)
  }

  // ─── Document upload methods (Step 3) ─────────────────────────

  /**
   * Switch to the "Documents" sub-tab on Step 3.
   * Step 3 has two sub-tabs: "Contacts" (default) and "Documents".
   * Must use Puppeteer native click (not page.evaluate click) because
   * Radix UI TabsTrigger requires real browser events for state change.
   */
  async switchToDocumentsTab(): Promise<void> {
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
   * Expand the first lot accordion in the Documents tab (independent mode only).
   * In independent mode, step 3 Documents tab renders an accordion per lot.
   * Each lot's document slots are only in the DOM when its accordion is expanded.
   * Must be called AFTER switchToDocumentsTab() to ensure the tab content is active.
   */
  async expandFirstLotAccordion(): Promise<void> {
    // The accordion buttons are inside the documents tab panel.
    // Find the first button that contains a lot number badge (#N).
    await this.page.waitForFunction(
      () => {
        const panels = document.querySelectorAll('[role="tabpanel"]')
        const docsPanel = Array.from(panels).find(
          p => p.id.includes('documents') && (p as HTMLElement).dataset.state === 'active'
        )
        if (!docsPanel) return false
        // Look for accordion toggle buttons inside the documents panel
        const buttons = docsPanel.querySelectorAll('button[type="button"]')
        return buttons.length > 0
      },
      { timeout: 5_000, polling: 300 },
    )

    // Click the first accordion button (lot #1)
    await this.page.evaluate(() => {
      const panels = document.querySelectorAll('[role="tabpanel"]')
      const docsPanel = Array.from(panels).find(
        p => p.id.includes('documents') && (p as HTMLElement).dataset.state === 'active'
      )
      if (!docsPanel) return
      const btn = docsPanel.querySelector('button[type="button"]') as HTMLElement
      if (btn) btn.click()
    })
    // Wait for accordion content to render
    await new Promise(resolve => setTimeout(resolve, 800))
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
    const selector = LOT_WIZARD_SELECTORS.docUploadInput(slotType)
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

  /** Click the submit button on step 5 ("Créer le lot") */
  async clickSubmit(): Promise<void> {
    await this.page.waitForSelector(LOT_WIZARD_SELECTORS.submitButton, { timeout: 10_000 })
    const btn = await this.page.$(LOT_WIZARD_SELECTORS.submitButton)
    if (!btn) throw new Error('Submit button not found')
    await btn.click()
  }

  /**
   * Wait for the success toast to appear after form submission.
   * Polls the DOM for "créé avec succès" text (Radix toast renders in body).
   * Returns the full page text for assertion.
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
   * Uses polling because Next.js router.push() does client-side navigation
   * which doesn't trigger Puppeteer's waitForNavigation.
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
