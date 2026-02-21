/**
 * Page Object Model — Contract Creation Wizard (/gestionnaire/contrats/nouveau)
 *
 * 5-step wizard (0-indexed internally):
 * 0. Lot (select a lot from PropertySelector)
 * 1. Détails et contacts (start date, rent, tenant selection)
 * 2. Documents (optional — upload files)
 * 3. Interventions (optional — auto-generated)
 * 4. Confirmation (review + submit)
 *
 * All interactions use DOM-level .click() via page.evaluate() to bypass
 * position:fixed overlays (PWA banner). CDP coordinate-based clicks are
 * unreliable when overlays exist.
 *
 * Selectors use data-testid attributes for resilience across view modes
 * (card vs list) and i18n changes.
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'

/** data-testid and CSS selectors */
export const CONTRACT_WIZARD_SELECTORS = {
  nextButton: '[data-testid="wizard-next-btn"]',
  prevButton: '[data-testid="wizard-prev-btn"]',
  submitButton: '[data-testid="wizard-submit-btn"]',
  stepItem: (n: number) => `[data-testid="step-item-${n}"]`,
  // Step 0: Lot selection (data-testid="lot-select-btn-{id}")
  lotSelectBtn: '[data-testid^="lot-select-btn-"]',
  // Step 1 fields
  rentAmountInput: '#rentAmount',
  addTenantBtn: '[data-testid="add-contact-btn-tenants"]',
  contactDialog: '[data-testid="contact-selector-dialog"]',
  contactRadio: '[data-testid^="contact-radio-"]',
  contactCheckbox: '[data-testid^="contact-checkbox-"]',
  contactConfirmBtn: '[data-testid="contact-confirm-btn"]',
  // Document upload (Step 2)
  docUploadInput: (type: string) => `[data-testid="doc-upload-${type}"]`,
} as const

export class ContractWizardPage {
  constructor(private page: Page) {}

  /** Navigate to the contract creation page and wait for step 0 to load */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await this.page.goto(`${baseUrl}/gestionnaire/contrats/nouveau`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    // Wait for heading to appear (Server Component streams data)
    await this.page.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('sélectionnez le lot'),
      { timeout: 30_000, polling: 500 },
    )
  }

  // ─── Step 0: Lot selection ─────────────────────────────────────

  /**
   * Select the first available lot from the PropertySelector.
   *
   * Uses data-testid="lot-select-btn-{id}" which is present on ALL lot
   * selection buttons in card view and in the Lots tab list view.
   *
   * In list view on the Immeubles tab, lot-level buttons don't render
   * (only building rows are shown). Since showViewToggle={true} in the
   * contract wizard, localStorage may persist "list" mode from a previous
   * visit. We force card view first to guarantee lot buttons are visible.
   */
  async selectFirstLot(): Promise<void> {
    const sel = CONTRACT_WIZARD_SELECTORS.lotSelectBtn
    const viewToggle = '[data-testid="view-toggle-cards"]'

    // Force card view: in list mode on the Immeubles tab, lot-level buttons
    // don't render. Card view always shows lot preview with select buttons.
    // The toggle only renders after React hydration (mounted state), so wait.
    try {
      await this.page.waitForFunction(
        (s: string) => document.querySelector(s) !== null,
        { timeout: 10_000, polling: 500 },
        viewToggle,
      )
      await this.page.evaluate((s) => {
        const btn = document.querySelector(s) as HTMLButtonElement
        if (btn) btn.click()
      }, viewToggle)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch {
      // View toggle not present (showViewToggle=false) — card view is default
    }

    // Wait for at least one lot select button to appear
    await this.page.waitForFunction(
      (selector: string) => document.querySelector(selector) !== null,
      { timeout: 30_000, polling: 500 },
      sel,
    )

    // Small delay for React hydration (event handlers need to be attached)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Click the first lot select button via DOM .click()
    await this.page.evaluate((selector) => {
      const btn = document.querySelector(selector) as HTMLButtonElement
      if (btn) btn.click()
    }, sel)

    // Verify: wait for Next button to become enabled (lot selected → form valid)
    await this.waitForNextEnabled(10_000)
  }

  // ─── Step 1: Details & Contacts ────────────────────────────────

  /**
   * Fill in the start date via the DatePicker's masked input.
   *
   * The DatePicker has an applyDateMask() that strips non-digits and
   * auto-inserts slashes. We must type ONLY digits (e.g., '01032026')
   * and let the mask produce '01/03/2026'.
   *
   * @param digits - 8 digits in ddMMyyyy format (default: '01032026' → 01/03/2026)
   */
  async fillStartDate(digits: string = '01032026'): Promise<void> {
    await this.page.waitForFunction(
      () => document.querySelector('input[placeholder="jj/mm/aaaa"]') !== null,
      { timeout: 10_000, polling: 500 },
    )
    const input = await this.page.$('input[placeholder="jj/mm/aaaa"]')
    if (!input) throw new Error('DatePicker input not found')

    await input.click({ clickCount: 3 })
    await this.page.keyboard.press('Backspace')
    await input.type(digits, { delay: 50 })
    await this.page.keyboard.press('Tab')
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /**
   * Fill in the rent amount field.
   */
  async fillRentAmount(amount: string = '800'): Promise<void> {
    await this.page.waitForSelector(CONTRACT_WIZARD_SELECTORS.rentAmountInput, {
      timeout: 10_000,
    })
    const input = await this.page.$(CONTRACT_WIZARD_SELECTORS.rentAmountInput)
    if (!input) throw new Error('Rent amount input not found')
    await input.click({ clickCount: 3 })
    await input.type(amount, { delay: 30 })
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /**
   * Add a tenant by opening the contact modal and selecting the first available contact.
   *
   * Uses data-testid selectors for all interactions:
   * - add-contact-btn-tenants: opens the ContactSelector modal
   * - contact-radio-{id} / contact-checkbox-{id}: select a contact
   * - contact-confirm-btn: confirm selection
   *
   * The button's onClick chain goes through a useImperativeHandle ref that
   * may not be wired on first render. We retry up to 3 times.
   */
  async addFirstTenant(): Promise<void> {
    const addBtnSel = CONTRACT_WIZARD_SELECTORS.addTenantBtn
    const dialogSel = CONTRACT_WIZARD_SELECTORS.contactDialog

    // Wait for the "Ajouter locataire" button to appear
    await this.page.waitForFunction(
      (sel: string) => document.querySelector(sel) !== null,
      { timeout: 15_000, polling: 500 },
      addBtnSel,
    )

    // Wait for form hydration (ContactSelector ref needs mount + useImperativeHandle effect)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Retry loop: click → check dialog → retry if ref wasn't ready yet
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Click the add tenant button via DOM .click()
      await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel) as HTMLButtonElement
        if (btn) btn.click()
      }, addBtnSel)

      // Wait for dialog to appear
      try {
        await this.page.waitForFunction(
          (sel: string) => document.querySelector(sel) !== null,
          { timeout: 3_000, polling: 300 },
          dialogSel,
        )
        break // Dialog opened
      } catch {
        if (attempt === 3) {
          throw new Error('Contact dialog did not open after 3 attempts (contactSelectorRef likely null)')
        }
        // Wait before retry — give React time to wire the ref
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Wait for contacts to load inside the dialog (radio or checkbox with data-testid)
    const radioSel = CONTRACT_WIZARD_SELECTORS.contactRadio
    const checkboxSel = CONTRACT_WIZARD_SELECTORS.contactCheckbox
    await this.page.waitForFunction(
      (rSel: string, cSel: string) => {
        return document.querySelector(rSel) !== null || document.querySelector(cSel) !== null
      },
      { timeout: 30_000, polling: 300 },
      radioSel,
      checkboxSel,
    )
    await new Promise(resolve => setTimeout(resolve, 500))

    // Click the first contact radio/checkbox via DOM .click()
    await this.page.evaluate((rSel, cSel) => {
      const el = (document.querySelector(rSel) || document.querySelector(cSel)) as HTMLElement
      if (el) el.click()
    }, radioSel, checkboxSel)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Click "Confirmer" via data-testid
    const confirmSel = CONTRACT_WIZARD_SELECTORS.contactConfirmBtn
    await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement
      if (btn) btn.click()
    }, confirmSel)

    // Wait for modal to close
    await this.page.waitForFunction(
      (sel: string) => document.querySelector(sel) === null,
      { timeout: 10_000, polling: 300 },
      dialogSel,
    )
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // ─── Step 2: Document upload ───────────────────────────────────

  /**
   * Upload a file to a specific document slot by type (e.g., 'bail').
   */
  async uploadDocumentToSlot(slotType: string, filePath: string): Promise<void> {
    const selector = CONTRACT_WIZARD_SELECTORS.docUploadInput(slotType)
    await this.page.waitForFunction(
      (sel: string) => document.querySelector(sel) !== null,
      { timeout: 10_000, polling: 500 },
      selector,
    )
    const input = await this.page.$(selector)
    if (!input) throw new Error(`Document upload input not found: ${selector}`)
    await input.uploadFile(filePath)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /** Check if a staged file name is visible on the page */
  async hasStagedFile(filename: string): Promise<boolean> {
    return await this.page.evaluate((name) => {
      return document.body.innerText.includes(name)
    }, filename)
  }

  // ─── Navigation methods ────────────────────────────────────────

  async isNextButtonEnabled(): Promise<boolean> {
    const btn = await this.page.$(CONTRACT_WIZARD_SELECTORS.nextButton)
    if (!btn) return false
    return await this.page.evaluate(el => !el.disabled, btn)
  }

  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await this.page.waitForFunction(
      (selector: string) => {
        const btn = document.querySelector(selector) as HTMLButtonElement | null
        return btn !== null && !btn.disabled
      },
      { timeout, polling: 500 },
      CONTRACT_WIZARD_SELECTORS.nextButton,
    )
  }

  async clickNext(): Promise<void> {
    await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement
      if (btn) btn.click()
    }, CONTRACT_WIZARD_SELECTORS.nextButton)
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  async clickPrev(): Promise<void> {
    await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement
      if (btn) btn.click()
    }, CONTRACT_WIZARD_SELECTORS.prevButton)
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  async waitForStep(step: number, timeout: number = 15_000): Promise<void> {
    if (step === 4) {
      await this.page.waitForSelector(CONTRACT_WIZARD_SELECTORS.submitButton, { timeout })
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

    await this.page.waitForFunction(
      (text: string) => document.body.innerText.toLowerCase().includes(text),
      { timeout, polling: 300 },
      expected,
    )
  }

  // ─── Verification methods ──────────────────────────────────────

  async hasContent(text: string): Promise<boolean> {
    return await this.page.evaluate((t) => {
      return document.body.innerText.toLowerCase().includes(t.toLowerCase())
    }, text)
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    const btn = await this.page.$(CONTRACT_WIZARD_SELECTORS.submitButton)
    return btn !== null
  }

  // ─── Submission methods ────────────────────────────────────────

  async clickSubmit(): Promise<void> {
    await this.page.waitForSelector(CONTRACT_WIZARD_SELECTORS.submitButton, { timeout: 10_000 })
    await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement
      if (btn) btn.click()
    }, CONTRACT_WIZARD_SELECTORS.submitButton)
  }

  /**
   * Wait for either success or error toast after contract submission.
   * Returns page text. Throws with toast details on timeout.
   */
  async waitForSuccessToast(timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText
        return text.includes('Bail créé avec succès') || text.includes('Erreur')
      },
      { timeout, polling: 500 },
    )
    return await this.page.evaluate(() => document.body.innerText)
  }

  async waitForRedirect(urlPart: string, timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      (part: string) => window.location.href.includes(part),
      { timeout, polling: 500 },
      urlPart,
    )
    return this.page.url()
  }
}
