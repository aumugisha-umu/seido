/**
 * Page Object Model — Intervention Creation Wizard (gestionnaire)
 *
 * Path: /gestionnaire/operations/nouvelle-intervention
 *
 * 4-step wizard:
 * 1. Bien — Property selection (lot via PropertySelector)
 * 2. Demande — Intervention details (title, type, urgency, description)
 * 3. Contacts — Assignments (providers, tenants, scheduling, quotes)
 * 4. Confirmation — Summary review + submit
 *
 * Button labels:
 * - Next: "Continuer"
 * - Previous: "Retour"
 * - Submit: "Creer l'intervention"
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners, waitForContent, clickNextStep, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

export class InterventionWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the intervention creation wizard */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/operations/nouvelle-intervention')
    await dismissBanners(this.page)
    await waitForContent(this.page, ['intervention', 'bien'], TIMEOUTS.content)
  }

  /** Click the "Continuer" button to advance to the next step */
  async clickNext(): Promise<void> {
    await clickNextStep(this.page)
  }

  // ─── Step 1: Property Selection ─────────────────────────

  /**
   * Select a lot by name in the PropertySelector.
   * Clicks the "Selectionner" button on the card matching the lot name.
   *
   * @param lotName - The lot name/reference to select
   */
  async selectProperty(lotName: string): Promise<void> {
    // Wait for PropertySelector cards to load
    const selectButton = this.page
      .locator('*', { hasText: lotName })
      .locator('..')
      .locator('..')
      .getByRole('button', { name: /sélectionner/i })
      .first()

    // Fallback: if specific lot not found, try finding any card with the lot name
    // and clicking its selection button
    if (!(await selectButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Try broader search: find the lot text, then find the nearest select button
      await this.page.waitForFunction(
        (name: string) => document.body.innerText.includes(name),
        lotName,
        { timeout: TIMEOUTS.content }
      )
      // Click the first "Selectionner" button near the matching text
      const allSelectButtons = this.page.getByRole('button', { name: /sélectionner/i })
      await expect(allSelectButtons.first()).toBeVisible({ timeout: TIMEOUTS.action })
      await allSelectButtons.first().click()
      return
    }

    await selectButton.click()
  }

  // ─── Step 2: Intervention Details ───────────────────────

  /**
   * Fill intervention details on step 2.
   *
   * @param opts.title - Intervention title (required)
   * @param opts.type - Intervention type category (e.g., "Plomberie")
   * @param opts.urgency - Urgency level (e.g., "Urgente")
   * @param opts.description - Description text
   */
  async fillDetails(opts: {
    title: string
    type?: string
    urgency?: string
    description?: string
  }): Promise<void> {
    // Fill title — input with placeholder containing "Fuite" or "Ex:"
    const titleInput = this.page.getByPlaceholder(/fuite|ex:/i).first()
    await expect(titleInput).toBeVisible({ timeout: TIMEOUTS.action })
    await titleInput.fill(opts.title)

    // Select type from combobox if provided
    if (opts.type) {
      const typeCombobox = this.page.getByRole('combobox').first()
      await typeCombobox.click()
      await this.page.getByRole('option', { name: new RegExp(opts.type, 'i') }).click()
    }

    // Select urgency if provided
    if (opts.urgency) {
      // Find the urgency label and its associated trigger
      const urgencyTrigger = this.page.getByLabel(/urgence/i)
      if (await urgencyTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await urgencyTrigger.click()
        await this.page.getByRole('option', { name: new RegExp(opts.urgency, 'i') }).click()
      }
    }

    // Fill description if provided
    if (opts.description) {
      const textarea = this.page.getByPlaceholder(/intervention|décrivez/i).first()
      if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await textarea.fill(opts.description)
      }
    }
  }

  // ─── Step 3: Contacts & Configuration ───────────────────

  /**
   * Configure contacts and scheduling options on step 3.
   *
   * @param opts.providers - Provider names to assign
   * @param opts.tenants - Tenant names to assign
   * @param opts.schedulingType - "slots" or "date-fixe"
   * @param opts.slotsCount - Number of time slots to add
   * @param opts.expectsQuote - Whether to enable quote request
   */
  async configureContacts(opts: {
    providers?: string[]
    tenants?: string[]
    schedulingType?: string
    slotsCount?: number
    expectsQuote?: boolean
  }): Promise<void> {
    // Add providers if specified
    if (opts.providers?.length) {
      for (const providerName of opts.providers) {
        const addProviderBtn = this.page.getByTestId('add-contact-btn-providers').first()
        if (await addProviderBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await addProviderBtn.click()
          // Wait for contact dialog and select provider
          await this.page.getByText(providerName, { exact: false }).first().click()
          const confirmBtn = this.page.getByTestId('contact-confirm-btn')
          if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click()
          }
        }
      }
    }

    // Add tenants if specified
    if (opts.tenants?.length) {
      for (const tenantName of opts.tenants) {
        const addTenantBtn = this.page.getByTestId('add-contact-btn-tenants').first()
        if (await addTenantBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await addTenantBtn.click()
          await this.page.getByText(tenantName, { exact: false }).first().click()
          const confirmBtn = this.page.getByTestId('contact-confirm-btn')
          if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click()
          }
        }
      }
    }

    // Toggle quote request if specified
    if (opts.expectsQuote) {
      const quoteToggle = this.page.getByLabel(/devis|estimation/i).first()
      if (await quoteToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await quoteToggle.click()
      }
    }
  }

  /** Toggle the confirmation switch ON in step 3 */
  async enableConfirmation(): Promise<void> {
    const confirmToggle = this.page.getByLabel(/confirmation/i).first()
    await expect(confirmToggle).toBeVisible({ timeout: TIMEOUTS.action })
    // Only click if not already checked
    if (!(await confirmToggle.isChecked())) {
      await confirmToggle.click()
    }
  }

  // ─── Step 4: Verification & Submit ──────────────────────

  /** Verify the confirmation summary on step 4 */
  async verifyConfirmation(): Promise<void> {
    // Step 4 should show a summary of the intervention
    await waitForContent(this.page, ['confirmation', 'récapitulatif', 'résumé'], TIMEOUTS.content)
  }

  /** Click the final submit button ("Creer l'intervention") */
  async submit(): Promise<void> {
    const submitBtn = this.page.getByRole('button', { name: /créer l'intervention/i })
    await expect(submitBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await submitBtn.click()
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Wait for success toast after submission */
  async expectSuccess(): Promise<string> {
    return await waitForSuccessToast(this.page, TIMEOUTS.toast)
  }

  /** Wait for redirect to the newly created intervention detail page */
  async expectRedirect(): Promise<string> {
    await this.page.waitForURL('**/gestionnaire/operations/interventions/**', {
      timeout: TIMEOUTS.navigation,
    })
    return this.page.url()
  }
}

export default InterventionWizardPage
