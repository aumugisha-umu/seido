/**
 * E2E test — Lot Creation Wizard (5-step flow)
 *
 * Tests both "existing building" and "independent" paths through all 5 wizard steps.
 *
 * Steps: Immeuble > Lot > Contacts & Documents > Interventions > Confirmation
 *
 * Architecture: Server Component (page.tsx) handles auth + data loading,
 * then passes props to Client Component (lot-creation-form.tsx).
 * No TeamCheckModal — radio switching is safe.
 *
 * Navigation tests validate step traversal without submission.
 * Submission tests actually click "Créer le lot" and verify creation in staging DB.
 * Tests run against a live dev server (localhost:3000) with real staging data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissCookieBanner } from './helpers/cookies'
import { LotWizardPage, LOT_WIZARD_SELECTORS } from './pages/lot-wizard.page'
import { getBaseUrl } from '../fixtures/test-accounts'

/** Absolute path to test PDF fixture (316 bytes, valid PDF 1.4) */
const TEST_PDF_PATH = path.resolve(__dirname, '../fixtures/test-document.pdf')

describe('Lot Creation Wizard', () => {
  let page: Page
  let wizard: LotWizardPage

  beforeAll(async () => {
    page = await newPage()
    wizard = new LotWizardPage(page)

    // Auth cookies pre-loaded by newPage() from globalSetup
    const baseUrl = getBaseUrl()
    await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
    await dismissCookieBanner(page)
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  // ═══════════════════════════════════════════════════════════════
  // Existing Building Mode (default)
  // ═══════════════════════════════════════════════════════════════

  describe('Existing Building Mode', () => {
    it('should load step 1: Immeuble', async () => {
      try {
        await wizard.navigate()

        // Verify step 1 content — lot wizard asks about building association
        const hasContent = await wizard.hasContent('lier à un immeuble')
        expect(hasContent).toBe(true)

        // Verify all 5 step indicators exist in the header
        for (let i = 1; i <= 5; i++) {
          const hasStep = await wizard.hasStepIndicator(i)
          expect(hasStep).toBe(true)
        }

        // Next button should show step 1 text: "Suivant : Lot"
        const nextText = await wizard.getNextButtonText()
        expect(nextText).not.toBeNull()
        expect(nextText!.toLowerCase()).toContain('lot')

        // Prev button should be present but disabled on step 1
        const prevDisabled = await wizard.isPrevButtonDisabled()
        expect(prevDisabled).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-step1')
        throw error
      }
    })

    it('should select a building and enable the Next button', async () => {
      try {
        await wizard.selectFirstBuilding()

        await wizard.waitForNextEnabled(10_000)
        const isEnabled = await wizard.isNextButtonEnabled()
        expect(isEnabled).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-building-select')
        throw error
      }
    })

    it('should navigate to step 2: Lot', async () => {
      try {
        await wizard.clickNext()
        await wizard.waitForStep(2)

        const nextText = await wizard.getNextButtonText()
        expect(nextText).not.toBeNull()
        expect(nextText!.toLowerCase()).toContain('contacts')

        const prevDisabled = await wizard.isPrevButtonDisabled()
        expect(prevDisabled).toBe(false)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-step2')
        throw error
      }
    })

    it('should navigate to step 3: Contacts & Documents', async () => {
      try {
        await wizard.clickNext()
        await wizard.waitForStep(3)

        const nextText = await wizard.getNextButtonText()
        expect(nextText).not.toBeNull()
        expect(nextText!.toLowerCase()).toContain('interventions')
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-step3')
        throw error
      }
    })

    it('should navigate to step 4: Interventions', async () => {
      try {
        await wizard.clickNext()
        await wizard.waitForStep(4)

        const nextText = await wizard.getNextButtonText()
        expect(nextText).not.toBeNull()
        expect(nextText!.toLowerCase()).toContain('confirmation')
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-step4')
        throw error
      }
    })

    it('should navigate to step 5: Confirmation', async () => {
      try {
        await wizard.clickNext()
        await wizard.waitForStep(5)

        const hasSubmit = await wizard.isSubmitButtonVisible()
        expect(hasSubmit).toBe(true)

        const nextBtn = await page.$(LOT_WIZARD_SELECTORS.nextButton)
        expect(nextBtn).toBeNull()
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-step5')
        throw error
      }
    })

    it('should navigate back through all steps to step 1', async () => {
      try {
        for (let targetStep = 4; targetStep >= 1; targetStep--) {
          await wizard.clickPrev()
          if (targetStep === 1) {
            const hasContent = await wizard.hasContent('lier à un immeuble')
            expect(hasContent).toBe(true)
          } else {
            await wizard.waitForStep(targetStep)
          }
        }

        const prevDisabled = await wizard.isPrevButtonDisabled()
        expect(prevDisabled).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-back-nav')
        throw error
      }
    })

    it('should submit and create the lot with document upload in DB', async () => {
      try {
        // Navigate to wizard fresh (avoid stale state from navigation tests)
        const baseUrl = getBaseUrl()
        await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        await wizard.navigate()

        // Step 1: Select first building (default radio is "existing")
        await wizard.selectFirstBuilding()
        await wizard.waitForNextEnabled(10_000)

        // Step 2: Lot info (defaults are sufficient —
        // category "appartement" pre-selected, reference auto-generated).
        // IMPORTANT: waitForNextEnabled before each clickNext ensures the
        // auto-init useEffect has created the first lot (lots.length > 0).
        await wizard.clickNext()
        await wizard.waitForStep(2)
        await wizard.waitForNextEnabled(15_000)

        // Step 3: Switch to Documents tab + upload a PDF to "Certificat PEB" slot
        await wizard.clickNext()
        await wizard.waitForStep(3)
        await wizard.switchToDocumentsTab()
        await wizard.uploadDocumentToSlot('certificat_peb', TEST_PDF_PATH)

        // Verify: staged file name should appear in the UI
        const hasFile = await wizard.hasStagedFile('test-document.pdf')
        expect(hasFile).toBe(true)

        await wizard.waitForNextEnabled(15_000)

        // Step 4: Interventions (skip through)
        await wizard.clickNext()
        await wizard.waitForStep(4)
        await wizard.waitForNextEnabled(15_000)
        await wizard.clickNext()
        await wizard.waitForStep(5)

        // Step 5: Submit the form (lot creation + document upload)
        await wizard.clickSubmit()

        // Verify: success toast appears
        const pageText = await wizard.waitForSuccessToast(45_000)
        expect(pageText.toLowerCase()).toContain('créé avec succès')

        // Verify: redirect to building detail page
        const url = await wizard.waitForRedirect('/gestionnaire/biens/immeubles/', 30_000)
        expect(url).toContain('/gestionnaire/biens/immeubles/')
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-submit-existing-with-doc')
        throw error
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Independent Mode (no building association)
  // ═══════════════════════════════════════════════════════════════

  describe('Independent Mode', () => {
    it('should select independent mode on step 1 — wizard stays visible, Next enabled', async () => {
      try {
        // Navigate to dashboard first to clear cached client-side page state,
        // then navigate to the lot wizard (forces fresh Server Component render)
        const baseUrl = getBaseUrl()
        await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        await wizard.navigate()

        // Select "Laisser le lot indépendant"
        await wizard.selectIndependentMode()

        // Wizard should still be visible (no TeamCheckModal unmount)
        const hasContent = await wizard.hasContent('lier à un immeuble')
        expect(hasContent).toBe(true)

        // Next button should be immediately enabled for independent mode
        await wizard.waitForNextEnabled(5_000)
        const isEnabled = await wizard.isNextButtonEnabled()
        expect(isEnabled).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-independent-step1')
        throw error
      }
    })

    it('should navigate through all 5 steps in independent mode', async () => {
      try {
        // Step 1 → Step 2: Lot
        await wizard.clickNext()
        await wizard.waitForStep(2)
        const step2Text = await wizard.getNextButtonText()
        expect(step2Text).not.toBeNull()
        expect(step2Text!.toLowerCase()).toContain('contacts')

        // Fill in the required address fields for the independent lot
        // (reference "Lot 1" and country "Belgique" are pre-filled)
        await wizard.fillIndependentLotAddress()

        // Step 2 → Step 3: Contacts & Documents
        await wizard.clickNext()
        await wizard.waitForStep(3)
        const step3Text = await wizard.getNextButtonText()
        expect(step3Text).not.toBeNull()
        expect(step3Text!.toLowerCase()).toContain('interventions')

        // Step 3 → Step 4: Interventions
        await wizard.clickNext()
        await wizard.waitForStep(4)
        const step4Text = await wizard.getNextButtonText()
        expect(step4Text).not.toBeNull()
        expect(step4Text!.toLowerCase()).toContain('confirmation')

        // Step 4 → Step 5: Confirmation
        await wizard.clickNext()
        await wizard.waitForStep(5)
        const hasSubmit = await wizard.isSubmitButtonVisible()
        expect(hasSubmit).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-independent-nav')
        throw error
      }
    })

    it('should navigate back to step 1 with independent mode preserved', async () => {
      try {
        for (let targetStep = 4; targetStep >= 1; targetStep--) {
          await wizard.clickPrev()
          if (targetStep === 1) {
            const hasContent = await wizard.hasContent('lier à un immeuble')
            expect(hasContent).toBe(true)
          } else {
            await wizard.waitForStep(targetStep)
          }
        }

        const prevDisabled = await wizard.isPrevButtonDisabled()
        expect(prevDisabled).toBe(true)

        // Independent mode should still be selected (Radix data-state="checked")
        const isIndependentSelected = await page.evaluate(() => {
          const radio = document.querySelector('#independent')
          return radio?.getAttribute('data-state') === 'checked'
        })
        expect(isIndependentSelected).toBe(true)
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-independent-back')
        throw error
      }
    })

    it('should submit and create an independent lot with document upload in DB', async () => {
      try {
        // Navigate to wizard fresh (clear cached client-side state)
        const baseUrl = getBaseUrl()
        await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        await wizard.navigate()

        // Step 1: Select independent mode
        await wizard.selectIndependentMode()
        await wizard.waitForNextEnabled(10_000)

        // Step 2: Fill required address fields
        await wizard.clickNext()
        await wizard.waitForStep(2)
        await wizard.fillIndependentLotAddress()

        // Step 3: Switch to Documents tab, expand lot accordion, upload PDF
        await wizard.waitForNextEnabled(15_000)
        await wizard.clickNext()
        await wizard.waitForStep(3)
        await wizard.switchToDocumentsTab()
        // Independent mode: lots are in an accordion, must expand first
        await wizard.expandFirstLotAccordion()
        await wizard.uploadDocumentToSlot('certificat_peb', TEST_PDF_PATH)

        // Verify: staged file name should appear in the UI
        const hasFile = await wizard.hasStagedFile('test-document.pdf')
        expect(hasFile).toBe(true)

        await wizard.waitForNextEnabled(15_000)

        // Step 4: Interventions (skip through)
        await wizard.clickNext()
        await wizard.waitForStep(4)
        await wizard.waitForNextEnabled(15_000)
        await wizard.clickNext()
        await wizard.waitForStep(5)

        // Step 5: Submit the form (lot creation + document upload)
        await wizard.clickSubmit()

        // Verify: success toast appears
        const pageText = await wizard.waitForSuccessToast(45_000)
        expect(pageText.toLowerCase()).toContain('créé avec succès')

        // Verify: redirect to patrimoine list
        const url = await wizard.waitForRedirect('/gestionnaire/biens', 30_000)
        expect(url).toContain('/gestionnaire/biens')
      } catch (error) {
        await screenshotOnFailure(page, 'lot-wizard-submit-independent-with-doc')
        throw error
      }
    })
  })
})
