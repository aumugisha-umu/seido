/**
 * Page Object Model — Locataire Intervention Request Wizard
 *
 * Path: /locataire/interventions/nouvelle-demande
 *
 * 2-3 step wizard: [Logement] > Demande > Confirmation
 *
 * Step 1 (Logement) is auto-skipped if the tenant has only 1 lot.
 * Step 2: Type de probleme, description, urgence
 * Step 3: Confirmation summary + submit
 *
 * NOTE: No data-testid attributes — uses text-based and role-based selectors.
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners, waitForContent, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

export class InterventionRequestPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the locataire request page and wait for content */
  async goto(): Promise<void> {
    await this.page.goto('/locataire/interventions/nouvelle-demande')
    await dismissBanners(this.page)
    // Wait for the page to render (title or form fields)
    await waitForContent(
      this.page,
      ['déclarer un sinistre', 'demande', 'type de problème', 'logement'],
      TIMEOUTS.content,
    )
  }

  /** Click the "Continuer" or "Sélectionner ce logement" next button */
  async clickNext(): Promise<void> {
    await dismissBanners(this.page)
    const nextBtn = this.page.getByRole('button', { name: /continuer|sélectionner ce logement|sélectionner/i }).first()
    await expect(nextBtn).toBeEnabled({ timeout: TIMEOUTS.action })
    await nextBtn.click()
    // Wait for step transition
    await this.page.waitForTimeout(500)
  }

  /** Click the "Confirmer la création" or "Confirmer" submit button */
  async submit(): Promise<void> {
    await dismissBanners(this.page)
    const submitBtn = this.page.getByRole('button', { name: /confirmer/i })
      .filter({ hasNot: this.page.getByText(/annuler/i) })
      .first()
    await expect(submitBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await submitBtn.click()
  }

  /** Wait for the next button to be enabled */
  async waitForNextEnabled(timeout = 15_000): Promise<void> {
    const nextBtn = this.page.getByRole('button', { name: /continuer|sélectionner/i }).first()
    await expect(nextBtn).toBeEnabled({ timeout })
  }

  // ─── Step 1: Logement Selection ─────────────────────────

  /** Select the first lot card (if step 1 is shown) */
  async selectFirstLot(): Promise<void> {
    const selectBtn = this.page.getByRole('button', { name: /^sélectionner$/i }).first()
    if (await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await selectBtn.click()
      await this.page.waitForTimeout(500)
    }
  }

  // ─── Step 2: Request Details ────────────────────────────

  /** Select the intervention type from the combobox */
  async selectType(typeLabel: string): Promise<void> {
    // Click the combobox trigger
    const combobox = this.page.getByRole('combobox').first()
    await expect(combobox).toBeVisible({ timeout: TIMEOUTS.action })
    await combobox.click()

    // Wait for dropdown to open and select the option
    const option = this.page.getByRole('option', { name: new RegExp(typeLabel, 'i') })
    await expect(option).toBeVisible({ timeout: TIMEOUTS.action })
    await option.click()
  }

  /** Fill the description textarea */
  async fillDescription(description: string): Promise<void> {
    // Try by id first, then by placeholder
    const textarea = this.page.locator('#description')
      .or(this.page.getByPlaceholder(/décrivez|problème/i).first())
    await expect(textarea.first()).toBeVisible({ timeout: TIMEOUTS.action })
    await textarea.first().fill(description)
  }

  /** Fill all step 2 fields at once */
  async fillDetails(opts: {
    type: string
    description: string
    urgency?: string
  }): Promise<void> {
    await this.selectType(opts.type)
    await this.fillDescription(opts.description)

    // Select urgency if provided
    if (opts.urgency) {
      const urgencyTrigger = this.page.getByLabel(/urgence/i)
      if (await urgencyTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await urgencyTrigger.click()
        await this.page.getByRole('option', { name: new RegExp(opts.urgency, 'i') }).click()
      }
    }
  }

  // ─── Verification ───────────────────────────────────────

  /** Check if page contains given text (case-insensitive) */
  async hasContent(text: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').innerText()
    return bodyText.toLowerCase().includes(text.toLowerCase())
  }

  /** Wait for the success toast after submission */
  async expectSuccess(): Promise<string> {
    return await waitForSuccessToast(this.page, TIMEOUTS.toast)
  }

  /** Wait for redirect to intervention detail page */
  async expectRedirect(): Promise<string> {
    await this.page.waitForURL('**/locataire/interventions/**', {
      timeout: TIMEOUTS.navigation,
    })
    return this.page.url()
  }
}
