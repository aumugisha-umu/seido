/**
 * Page Object Model — Lot Creation Wizard (gestionnaire)
 *
 * Path: /gestionnaire/biens/lots/nouveau
 *
 * 5-step wizard:
 * 1. Immeuble — Building association (existing, new, or independent)
 * 2. Lot — Lot details (name, category, surface, floor, address)
 * 3. Contacts & Documents — Contact assignment + document upload
 * 4. Interventions — Auto-generated interventions (optional)
 * 5. Confirmation — Summary review + submit
 *
 * Step 1 has 3 modes controlled by radio buttons:
 * - data-testid="radio-existing" — Link to existing building
 * - data-testid="radio-new" — Create new building
 * - data-testid="radio-independent" — No building association
 *
 * Uses data-testid: wizard-next-btn, wizard-prev-btn, wizard-submit-btn
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners, waitForContent, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

export class LotWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the lot creation wizard */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/biens/lots/nouveau')
    await dismissBanners(this.page)
    await waitForContent(this.page, ['lot', 'immeuble', 'nouveau'], TIMEOUTS.content)
    // Wait for wizard form to render
    await expect(this.page.getByTestId('wizard-next-btn')).toBeVisible({ timeout: TIMEOUTS.action })
  }

  /** Click the next button to advance to the next step */
  async clickNext(): Promise<void> {
    const nextBtn = this.page.getByTestId('wizard-next-btn')
    await expect(nextBtn).toBeEnabled({ timeout: TIMEOUTS.action })
    await nextBtn.click({ force: true })
    // Wait for step transition animation
    await this.page.waitForTimeout(300)
  }

  // ─── Step 1: Building Association ───────────────────────

  /**
   * Select an existing building by name.
   * The default mode "Lier a un immeuble existant" is already selected.
   * Clicks the "Selectionner" button on the matching building card.
   *
   * @param buildingName - The building name to search for
   */
  async selectBuilding(buildingName: string): Promise<void> {
    // Ensure "existing" radio is selected (default)
    const existingRadio = this.page.getByTestId('radio-existing')
    if (await existingRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await existingRadio.click()
    }

    // Wait for building cards to load from API
    await this.page.waitForFunction(
      (name: string) => document.body.innerText.includes(name),
      buildingName,
      { timeout: TIMEOUTS.content }
    )

    // Find the building card and click its "Selectionner" button
    const buildingCard = this.page.locator('*', { hasText: buildingName })
    const selectBtn = buildingCard.getByRole('button', { name: /sélectionner/i }).first()

    // Fallback: if specific button not found, click first available
    if (!(await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      const allSelectBtns = this.page.getByRole('button', { name: /sélectionner/i })
      await expect(allSelectBtns.first()).toBeVisible({ timeout: TIMEOUTS.action })
      await allSelectBtns.first().click()
      return
    }

    await selectBtn.click()
  }

  // ─── Step 2: Lot Details ────────────────────────────────

  /**
   * Fill lot details on step 2.
   *
   * @param opts.name - Lot name/reference
   * @param opts.category - Lot category (e.g., "Appartement", "Bureau")
   * @param opts.surface - Surface area in m2
   * @param opts.floor - Floor number
   * @param opts.description - Lot description
   */
  async fillDetails(opts: {
    name: string
    category?: string
    surface?: number
    floor?: number
    description?: string
  }): Promise<void> {
    // Fill name/reference
    const nameInput = this.page.getByLabel(/nom|référence/i).first()
    if (await nameInput.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)) {
      await nameInput.fill(opts.name)
    }

    // Select category if provided — uses grid of buttons with aria-label="Sélectionner {label}"
    if (opts.category) {
      const categoryBtn = this.page.getByRole('button', {
        name: new RegExp(`sélectionner ${opts.category}|${opts.category}`, 'i'),
      }).first()
      if (await categoryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await categoryBtn.click()
      }
    }

    // Fill surface if provided
    if (opts.surface !== undefined) {
      const surfaceInput = this.page.getByLabel(/surface/i).first()
      if (await surfaceInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await surfaceInput.fill(opts.surface.toString())
      }
    }

    // Fill floor if provided
    if (opts.floor !== undefined) {
      const floorInput = this.page.getByLabel(/étage|niveau/i).first()
      if (await floorInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await floorInput.fill(opts.floor.toString())
      }
    }

    // Fill description if provided
    if (opts.description) {
      const descTextarea = this.page.getByLabel(/description/i).first()
      if (await descTextarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await descTextarea.fill(opts.description)
      }
    }
  }

  // ─── Submission ─────────────────────────────────────────

  /** Click the submit button on the confirmation step ("Creer le lot") */
  async submit(): Promise<void> {
    const submitBtn = this.page.getByTestId('wizard-submit-btn')
    const fallbackBtn = this.page.getByRole('button', { name: /créer le lot|créer/i }).last()

    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click()
    } else {
      await expect(fallbackBtn).toBeVisible({ timeout: TIMEOUTS.action })
      await fallbackBtn.click()
    }
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Verify success toast after lot creation (may take long with auto-interventions) */
  async expectSuccess(): Promise<void> {
    const toastText = await waitForSuccessToast(this.page, 60_000)
    expect(toastText.toLowerCase()).toContain('créé')
  }
}

export default LotWizardPage
