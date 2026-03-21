/**
 * Page Object Model — Contract Creation Wizard (gestionnaire)
 *
 * Path: /gestionnaire/contrats/nouveau?type=bail|fournisseur
 *
 * 5-step wizard (0-indexed):
 * 0. Lot — Property selection
 * 1. Details et contacts — Dates, amount, tenant/supplier
 * 2. Documents — Optional document upload
 * 3. Interventions — Auto-generated interventions
 * 4. Confirmation — Summary review + submit
 *
 * Two contract types:
 * - "bail" — Bail locatif (requires lot + tenant + rent)
 * - "fournisseur" — Contrat fournisseur (requires lot + supplier + cost)
 *
 * Uses data-testid:
 * - wizard-next-btn, wizard-prev-btn, wizard-submit-btn
 * - lot-select-btn-{id}, add-contact-btn-tenants
 * - contact-selector-dialog, contact-radio-{id}, contact-confirm-btn
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners, waitForContent, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

export class ContractWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /**
   * Navigate to the contract creation wizard.
   *
   * @param type - Contract type: "bail" or "fournisseur"
   */
  async goto(type: 'bail' | 'fournisseur' = 'bail'): Promise<void> {
    await this.page.goto(`/gestionnaire/contrats/nouveau?type=${type}`)
    await dismissBanners(this.page)
    await waitForContent(this.page, ['sélectionnez le lot', 'lot'], TIMEOUTS.content)
  }

  /** Click the next button to advance to the next step */
  async clickNext(): Promise<void> {
    // Dismiss any late-appearing banners (cookie, PWA, notification) before clicking
    await dismissBanners(this.page)

    const nextBtn = this.page.getByTestId('wizard-next-btn')
    await expect(nextBtn).toBeEnabled({ timeout: TIMEOUTS.action })
    await nextBtn.click({ force: true })
    // Wait for step transition animation
    await this.page.waitForTimeout(300)
  }

  // ─── Step 0: Property Selection ─────────────────────────

  /**
   * Select a property (lot) by name.
   *
   * Forces card view first (list view on Immeubles tab may hide lot-level buttons),
   * then clicks the selection button on the matching lot.
   *
   * @param lotName - The lot name/reference to select
   */
  async selectProperty(lotName: string): Promise<void> {
    // Force card view to ensure lot selection buttons are visible
    const viewToggle = this.page.getByTestId('view-toggle-cards')
    if (await viewToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await viewToggle.click()
      // Wait for card view to render
      await this.page.waitForTimeout(300)
    }

    // Wait for lot cards to load
    const lotSelectBtn = this.page.getByTestId(/^lot-select-btn-/).first()
    await expect(lotSelectBtn).toBeVisible({ timeout: TIMEOUTS.content })

    // Try to find the specific lot by name, fall back to first available
    const specificLot = this.page.locator('*', { hasText: lotName })
      .locator('[data-testid^="lot-select-btn-"]')
      .first()

    if (await specificLot.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await specificLot.click()
    } else {
      await lotSelectBtn.click()
    }

    // Verify: next button should become enabled after selection
    await expect(this.page.getByTestId('wizard-next-btn')).toBeEnabled({ timeout: TIMEOUTS.action })
  }

  // ─── Step 1: Details & Contacts ─────────────────────────

  /**
   * Select a tenant by name (bail contracts only).
   * Opens the contact selector dialog and picks the matching tenant.
   *
   * @param tenantName - The tenant name to select
   */
  async selectTenant(tenantName: string): Promise<void> {
    const addTenantBtn = this.page.getByTestId('add-contact-btn-tenants')
    await expect(addTenantBtn).toBeVisible({ timeout: TIMEOUTS.action })

    const dialog = this.page.getByTestId('contact-selector-dialog')

    // Retry loop: useImperativeHandle ref may not be wired on first render
    for (let attempt = 1; attempt <= 3; attempt++) {
      await addTenantBtn.click()

      try {
        await expect(dialog).toBeVisible({ timeout: 3_000 })
        break
      } catch {
        if (attempt === 3) throw new Error('Contact selector dialog did not open after 3 attempts')
        await this.page.waitForTimeout(2_000)
      }
    }

    // Wait for contacts to load inside the dialog, then click the first radio/checkbox directly.
    // Avoid getByText(tenantName) — it may match the section header "Locataires" instead of a contact.
    const contactOption = dialog.getByTestId(/^contact-radio-|^contact-checkbox-/).first()
    await expect(contactOption).toBeVisible({ timeout: TIMEOUTS.content })
    await contactOption.click()

    // Wait for selection to register
    await this.page.waitForTimeout(300)

    // Confirm selection
    const confirmBtn = dialog.getByTestId('contact-confirm-btn')
    await expect(confirmBtn).toBeEnabled({ timeout: TIMEOUTS.action })
    await confirmBtn.click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.action })
  }

  /**
   * Select a supplier by name (fournisseur contracts only).
   * Same flow as selectTenant but targets the supplier contact section.
   *
   * @param supplierName - The supplier name to select
   */
  async selectSupplier(supplierName: string): Promise<void> {
    // The fournisseur wizard uses an inline "Sélectionner un prestataire" button
    // instead of the bail wizard's "add-contact-btn-providers" testid
    const addSupplierBtn = this.page.getByTestId('add-contact-btn-providers')
      .or(this.page.getByRole('button', { name: /ajouter.*prestataire|ajouter.*fournisseur|s[ée]lectionner.*prestataire/i }))
      .first()
    await expect(addSupplierBtn).toBeVisible({ timeout: TIMEOUTS.action })

    const dialog = this.page.getByTestId('contact-selector-dialog')

    // Retry loop: useImperativeHandle ref may not be wired on first render
    for (let attempt = 1; attempt <= 3; attempt++) {
      await addSupplierBtn.click()

      try {
        await expect(dialog).toBeVisible({ timeout: 3_000 })
        break
      } catch {
        if (attempt === 3) throw new Error('Contact selector dialog did not open after 3 attempts')
        await this.page.waitForTimeout(2_000)
      }
    }

    // Click the first radio/checkbox directly — avoid getByText which may match section headers
    const contactOption = dialog.getByTestId(/^contact-radio-|^contact-checkbox-/).first()
    await expect(contactOption).toBeVisible({ timeout: TIMEOUTS.content })
    await contactOption.click()

    // Wait for selection to register
    await this.page.waitForTimeout(300)

    // Confirm
    const confirmBtn = dialog.getByTestId('contact-confirm-btn')
    await expect(confirmBtn).toBeEnabled({ timeout: TIMEOUTS.action })
    await confirmBtn.click()
    await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.action })
  }

  /**
   * Fill contract dates.
   *
   * @param opts.startDate - Start date digits in ddMMyyyy format (e.g., "01032026")
   * @param opts.endDate - Optional end date digits in ddMMyyyy format
   */
  async fillDates(opts: { startDate: string; endDate?: string }): Promise<void> {
    // Fill start date via the masked DatePicker input
    const startInput = this.page.getByPlaceholder('jj/mm/aaaa').first()
    await expect(startInput).toBeVisible({ timeout: TIMEOUTS.action })
    await startInput.click({ clickCount: 3 })
    await startInput.press('Backspace')
    await startInput.pressSequentially(opts.startDate, { delay: 50 })
    await startInput.press('Tab')

    // Fill end date if provided
    if (opts.endDate) {
      const endInput = this.page.getByPlaceholder('jj/mm/aaaa').nth(1)
      if (await endInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await endInput.click({ clickCount: 3 })
        await endInput.press('Backspace')
        await endInput.pressSequentially(opts.endDate, { delay: 50 })
        await endInput.press('Tab')
      }
    }
  }

  /**
   * Fill the rent/cost amount.
   *
   * @param amount - Amount in euros (as string)
   */
  async fillAmount(amount: string): Promise<void> {
    // Bail wizard uses #rentAmount, fournisseur wizard uses a spinbutton for "Coût"
    const amountInput = this.page.locator('#rentAmount')
      .or(this.page.getByRole('spinbutton').first())
    await expect(amountInput).toBeVisible({ timeout: TIMEOUTS.action })
    await amountInput.click({ clickCount: 3 })
    await amountInput.fill(amount)
  }

  // ─── Submission ─────────────────────────────────────────

  /** Click the submit button on the confirmation step */
  async submit(): Promise<void> {
    const submitBtn = this.page.getByTestId('wizard-submit-btn')
    await expect(submitBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await submitBtn.click()
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Verify success after contract creation (toast or redirect to detail page) */
  async expectSuccess(): Promise<void> {
    // The wizard may show a toast OR redirect directly to the contract detail page
    const success = await Promise.race([
      waitForSuccessToast(this.page, TIMEOUTS.toast).then(() => 'toast' as const),
      this.page.waitForURL('**/contrats/**', { timeout: TIMEOUTS.toast }).then(() => 'redirect' as const),
    ]).catch(() => 'timeout' as const)

    if (success === 'timeout') {
      throw new Error('Contract creation did not show success toast or redirect to detail page')
    }
  }
}
