/**
 * Page Object Model — Locataire Intervention Request (Playwright)
 * Path: /locataire/interventions/nouvelle-demande
 *
 * 2-3 step wizard: [Logement] > Demande > Confirmation
 *
 * Step 1 (Logement) is auto-skipped if the tenant has only 1 lot.
 * Step 2: Type, urgency, description (required: type + description)
 * Step 3: Confirmation summary + submit
 *
 * NOTE: No data-testid attributes -- uses text-based and ID-based selectors.
 */

import { type Page, expect } from '@playwright/test'

export class InterventionRequestPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the locataire request page and wait for content */
  async navigate(): Promise<void> {
    await this.page.goto('/locataire/interventions/nouvelle-demande', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    // Wait for the page to render (title or form fields)
    await expect(
      this.page.getByText(/déclarer un sinistre|demande|type de problème|logement/i).first(),
    ).toBeVisible({ timeout: 45_000 })
  }

  /** Click the "Continuer" or "Selectionner ce logement" next button */
  async clickNext(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: /^continuer$|sélectionner ce logement|^sélectionner$/i,
    })
    await btn.first().click()
    await this.page.waitForTimeout(1000)
  }

  /** Click the "Confirmer la creation" or "Confirmer" submit button */
  async clickSubmit(): Promise<void> {
    const btn = this.page
      .getByRole('button', { name: /confirmer/i })
      .filter({ hasNotText: /annuler/i })
      .first()
    await btn.click()
  }

  /** Wait for the next button to be enabled */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: /^continuer$|sélectionner/i,
    }).first()
    await expect(btn).toBeEnabled({ timeout })
  }

  // ─── Step 1: Logement Selection ─────────────────────────

  /** Select the first lot card (if step 1 is shown) */
  async selectFirstLot(): Promise<void> {
    const selectBtn = this.page.getByRole('button', { name: /^sélectionner$/i }).first()
    await selectBtn.click()
    await this.page.waitForTimeout(500)
  }

  // ─── Step 2: Request Details ────────────────────────────

  /** Select the intervention type from the combobox */
  async selectType(typeLabel: string): Promise<void> {
    // Click the combobox trigger
    const combobox = this.page.locator('button[role="combobox"]').first()
    await combobox.click()
    await this.page.waitForTimeout(500)

    // Select the option by text
    const option = this.page
      .locator('[role="option"], [cmdk-item]')
      .filter({ hasText: new RegExp(typeLabel, 'i') })
      .first()
    await option.click()
    await this.page.waitForTimeout(300)
  }

  /** Fill the description textarea (id="description") */
  async fillDescription(description: string): Promise<void> {
    const textarea = this.page.locator('#description')
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.click()
      await textarea.fill(description)
    } else {
      // Fallback: find textarea by placeholder
      const fallback = this.page.locator(
        'textarea[placeholder*="Décrivez"], textarea[placeholder*="problème"]',
      ).first()
      await fallback.click()
      await fallback.fill(description)
    }
    await this.page.waitForTimeout(300)
  }

  /** Fill all step 2 fields at once */
  async fillDetails(opts: {
    type: string
    description: string
    urgency?: string
  }): Promise<void> {
    await this.selectType(opts.type)
    await this.fillDescription(opts.description)
  }

  // ─── Verification ───────────────────────────────────────

  /** Check if page contains given text (case-insensitive) */
  async hasContent(text: string): Promise<boolean> {
    return await this.page
      .getByText(text, { exact: false })
      .first()
      .isVisible()
      .catch(() => false)
  }

  /** Wait for the success toast after submission */
  async waitForSuccessToast(timeout: number = 30_000): Promise<void> {
    await expect(
      this.page.getByText(/demande envoyée|envoyée|erreur/i).first(),
    ).toBeVisible({ timeout })
  }

  /** Check if the success toast indicates success (not error) */
  async isSuccessToast(): Promise<boolean> {
    return await this.page
      .getByText(/demande envoyée|envoyée/i)
      .first()
      .isVisible()
      .catch(() => false)
  }

  /** Wait for redirect to intervention detail page */
  async waitForRedirect(timeout: number = 30_000): Promise<void> {
    await this.page.waitForURL('**/locataire/interventions/**', { timeout })
  }
}
