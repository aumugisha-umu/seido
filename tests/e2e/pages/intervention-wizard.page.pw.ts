/**
 * Page Object Model — Gestionnaire Intervention Creation Wizard (Playwright)
 * Path: /gestionnaire/interventions/nouvelle-intervention
 *
 * 4-step wizard: Bien > Demande > Contacts > Confirmation
 *
 * Step 1: Property selection (building or lot via PropertySelector)
 * Step 2: Intervention details (title, type, urgency, description)
 * Step 3: Contacts assignment (managers, providers, tenants)
 * Step 4: Confirmation summary + submit
 *
 * NOTE: No data-testid attributes on wizard buttons — uses text-based selectors.
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class InterventionWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the intervention creation wizard and wait for step 1 */
  async navigate(): Promise<void> {
    await this.page.goto('/gestionnaire/interventions/nouvelle-intervention', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    // Wait for wizard to load (PropertySelector or step header)
    await expect(
      this.page.getByText(/créer une intervention|bien/i).first(),
    ).toBeVisible({ timeout: 45_000 })
  }

  /** Click the "Continuer" button to advance to the next step */
  async clickNext(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /^continuer$/i })
    await btn.click()
    await this.page.waitForTimeout(1000)
  }

  /** Click the "Retour" button to go to the previous step */
  async clickPrev(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /retour/i })
    await btn.click()
    await this.page.waitForTimeout(800)
  }

  /** Click the "Créer l'intervention" submit button on step 4 */
  async clickSubmit(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /créer l'intervention/i })
    await btn.click()
  }

  /** Wait for the Next/Continue button to be enabled */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    const btn = this.page.getByRole('button', { name: /^continuer$/i })
    await expect(btn).toBeEnabled({ timeout })
  }

  /** Check if the Continue button is enabled */
  async isNextButtonEnabled(): Promise<boolean> {
    const btn = this.page.getByRole('button', { name: /^continuer$/i })
    return await btn.isEnabled()
  }

  // ─── Step 1: Property Selection ─────────────────────────

  /** Select the first available property (building or lot) on step 1 */
  async selectFirstProperty(): Promise<void> {
    // Wait for PropertySelector cards to load
    const selectBtn = this.page.getByRole('button', { name: /^sélectionner$/i }).first()
    await selectBtn.waitFor({ timeout: 30_000 })
    await selectBtn.click()
    await this.page.waitForTimeout(1000)
  }

  // ─── Step 2: Intervention Details ───────────────────────

  /** Fill the title field */
  async fillTitle(title: string): Promise<void> {
    const input = this.page.locator(
      'input[placeholder*="Fuite"], input[placeholder*="fuite"], input[placeholder*="Ex:"]',
    )
    if (await input.first().isVisible().catch(() => false)) {
      await input.first().click()
      await input.first().fill(title)
    } else {
      // Fallback: find the first text input that matches by placeholder
      await this.page.evaluate((t: string) => {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])')
        for (const inp of inputs) {
          const placeholder = (inp as HTMLInputElement).placeholder || ''
          if (placeholder.toLowerCase().includes('fuite') || placeholder.toLowerCase().includes('ex:')) {
            (inp as HTMLInputElement).focus()
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value',
            )?.set
            if (nativeSetter) {
              nativeSetter.call(inp, t)
            } else {
              (inp as HTMLInputElement).value = t
            }
            inp.dispatchEvent(new Event('input', { bubbles: true }))
            inp.dispatchEvent(new Event('change', { bubbles: true }))
            return
          }
        }
      }, title)
    }
    await this.page.waitForTimeout(300)
  }

  /** Select the intervention type from the combobox */
  async selectType(typeLabel: string): Promise<void> {
    // Click the combobox trigger
    const combobox = this.page.locator('button[role="combobox"]').first()
    await combobox.click()
    await this.page.waitForTimeout(500)

    // Select the option by text
    const option = this.page.locator('[role="option"], [cmdk-item]').filter({
      hasText: new RegExp(typeLabel, 'i'),
    }).first()
    await option.click()
    await this.page.waitForTimeout(300)
  }

  /** Select urgency level from dropdown */
  async selectUrgency(level: string): Promise<void> {
    // Click the urgency select trigger
    await this.page.evaluate(() => {
      const labels = document.querySelectorAll('label')
      for (const label of labels) {
        if (label.textContent?.toLowerCase().includes('urgence')) {
          const trigger = label.parentElement?.querySelector(
            'button[role="combobox"], select, [data-radix-select-trigger]',
          )
          if (trigger) (trigger as HTMLElement).click()
          return
        }
      }
    })
    await this.page.waitForTimeout(300)

    // Click the matching option
    const option = this.page.locator('[role="option"]').filter({
      hasText: new RegExp(level, 'i'),
    }).first()
    await option.click()
    await this.page.waitForTimeout(300)
  }

  /** Fill the description textarea */
  async fillDescription(description: string): Promise<void> {
    const textarea = this.page.locator(
      'textarea[placeholder*="intervention"], textarea[placeholder*="Décrivez"]',
    ).first()
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.click()
      await textarea.fill(description)
    }
    await this.page.waitForTimeout(300)
  }

  /** Fill all step 2 fields at once */
  async fillDetails(opts: {
    title?: string
    type?: string
    urgency?: string
    description?: string
  }): Promise<void> {
    if (opts.title) await this.fillTitle(opts.title)
    if (opts.type) await this.selectType(opts.type)
    if (opts.urgency) await this.selectUrgency(opts.urgency)
    if (opts.description) await this.fillDescription(opts.description)
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
      this.page.getByText(/créée avec succès|erreur/i).first(),
    ).toBeVisible({ timeout })
  }

  /** Check if the success toast indicates success (not error) */
  async isSuccessToast(): Promise<boolean> {
    return await this.page
      .getByText(/créée avec succès/i)
      .first()
      .isVisible()
      .catch(() => false)
  }

  /** Wait for redirect to intervention detail page */
  async waitForRedirect(timeout: number = 30_000): Promise<void> {
    await this.page.waitForURL('**/gestionnaire/interventions/**', { timeout })
  }
}
