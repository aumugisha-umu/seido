/**
 * Page Object Model — Building Creation Wizard (gestionnaire)
 *
 * Path: /gestionnaire/biens/immeubles/nouveau
 *
 * 5-step wizard:
 * 1. Informations générales — Reference name + Address (street, city, zip, country) + Comment
 * 2. Lots — Lot configuration (optional)
 * 3. Contacts & Documents — Contact assignment + document upload
 * 4. Interventions — Auto-generated interventions (optional)
 * 5. Confirmation — Summary review + submit
 *
 * Uses data-testid attributes:
 * - wizard-next-btn, wizard-prev-btn, wizard-submit-btn
 * - step-item-{n}
 * - doc-upload-{type}
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners, waitForContent, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

export class BuildingWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the building creation wizard */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/biens/immeubles/nouveau')
    await dismissBanners(this.page)
    await waitForContent(this.page, ['immeuble', 'référence', 'adresse'], TIMEOUTS.content)
  }

  /** Click the next button to advance to the next step */
  async clickNext(): Promise<void> {
    // The next button may use data-testid OR be a "Continuer" button
    const nextBtn = this.page.getByTestId('wizard-next-btn')
    const fallbackBtn = this.page.getByRole('button', { name: /continuer/i }).first()

    const target = await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false) ? nextBtn : fallbackBtn
    await expect(target).toBeEnabled({ timeout: TIMEOUTS.action })
    await target.click({ force: true })
    // Wait for step transition animation
    await this.page.waitForTimeout(500)
  }

  // ─── Step 1: Informations générales ──────────────────────

  /**
   * Fill the building reference name on step 1.
   * The field label is "Référence de l'immeuble".
   */
  async fillReference(name: string): Promise<void> {
    const refInput = this.page.getByRole('textbox', { name: /référence/i }).first()
    await expect(refInput).toBeVisible({ timeout: TIMEOUTS.action })
    await refInput.fill(name)
  }

  /**
   * Fill address fields manually (all on step 1).
   *
   * @param opts.street - Street address
   * @param opts.city - City name
   * @param opts.zipCode - Postal code
   * @param opts.country - Country (default: not changed)
   */
  async fillAddress(opts: {
    street: string
    city: string
    zipCode: string
    country?: string
  }): Promise<void> {
    // Fill street — try by id first, then by label
    const streetInput = this.page.locator('#address-street')
      .or(this.page.getByRole('textbox', { name: /rue/i }).first())
    await expect(streetInput.first()).toBeVisible({ timeout: TIMEOUTS.action })
    await streetInput.first().fill(opts.street)

    // Fill postal code
    const postalInput = this.page.locator('#address-postalCode')
      .or(this.page.getByRole('textbox', { name: /code postal/i }).first())
    await postalInput.first().fill(opts.zipCode)

    // Fill city
    const cityInput = this.page.locator('#address-city')
      .or(this.page.getByRole('textbox', { name: /ville/i }).first())
    await cityInput.first().fill(opts.city)

    // Select country if provided (Radix Select)
    if (opts.country) {
      const countryTrigger = this.page.getByLabel(/pays/i).first()
      if (await countryTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await countryTrigger.click()
        await this.page.getByRole('option', { name: opts.country }).click()
      }
    }
  }

  // ─── Submission ─────────────────────────────────────────

  /** Click the submit button on the confirmation step */
  async submit(): Promise<void> {
    // The submit button may use data-testid OR be a "Créer" button
    const submitBtn = this.page.getByTestId('wizard-submit-btn')
    const fallbackBtn = this.page.getByRole('button', { name: /créer l'immeuble|créer/i }).last()

    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click()
    } else {
      await expect(fallbackBtn).toBeVisible({ timeout: TIMEOUTS.action })
      await fallbackBtn.click()
    }
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Verify success toast after building creation (may take long with auto-interventions) */
  async expectSuccess(): Promise<void> {
    // Building creation with auto-interventions can take 30-60s on Vercel preview
    const toastText = await waitForSuccessToast(this.page, 60_000)
    expect(toastText.toLowerCase()).toContain('créé')
  }
}

export default BuildingWizardPage
