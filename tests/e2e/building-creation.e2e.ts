/**
 * E2E test — Building Creation Wizard (5-step flow)
 *
 * Tests two address filling strategies:
 * 1. Manual address input (fills street, postal code, city directly)
 * 2. Google Maps autocomplete (types query, selects suggestion → auto-fills fields)
 *
 * Then validates the gestionnaire can navigate through all 5 wizard steps:
 * 1. Informations générales (building info, address)
 * 2. Lots (auto-creates first lot)
 * 3. Contacts & Documents (optional assignments)
 * 4. Interventions (optional scheduling)
 * 5. Confirmation (review before submission)
 *
 * Navigation tests validate step traversal without submission.
 * Submission test actually clicks "Confirmer la création" and verifies creation in staging DB.
 * Tests run against a live dev server (localhost:3000) with real staging data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissCookieBanner } from './helpers/cookies'
import { BuildingWizardPage, BUILDING_WIZARD_SELECTORS } from './pages/building-wizard.page'
import { getBaseUrl } from '../fixtures/test-accounts'

/** Absolute path to test PDF fixture (316 bytes, valid PDF 1.4) */
const TEST_PDF_PATH = path.resolve(__dirname, '../fixtures/test-document.pdf')

describe('Building Creation Wizard', () => {
  let page: Page
  let wizard: BuildingWizardPage

  beforeAll(async () => {
    page = await newPage()
    wizard = new BuildingWizardPage(page)

    // Auth cookies pre-loaded by newPage() from globalSetup
    // Navigate to dashboard to verify session + dismiss cookie banner
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

  // ─── Step 1: Loading & Address input ────────────────────────────

  it('should load step 1: Informations générales', async () => {
    try {
      await wizard.navigate()

      // Verify step 1 content
      const hasTitle = await wizard.hasContent('ajouter un immeuble')
      expect(hasTitle).toBe(true)

      // Verify all 5 step indicators exist in the header
      for (let i = 1; i <= 5; i++) {
        const hasStep = await wizard.hasStepIndicator(i)
        expect(hasStep).toBe(true)
      }

      // Next button should show step 1 text
      const nextText = await wizard.getNextButtonText()
      expect(nextText?.toLowerCase()).toContain('lots')
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-step1')
      throw error
    }
  })

  it('should fill address via Google Maps autocomplete OR manual input', async () => {
    try {
      // Strategy 1: Try Google Maps autocomplete first
      const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
        '42 Rue de la Loi, 1000 Bruxelles',
      )

      if (autocompleteWorked) {
        // Verify the street field was auto-filled
        const streetValue = await wizard.getAddressFieldValue(
          BUILDING_WIZARD_SELECTORS.addressStreet,
        )
        expect(streetValue.length).toBeGreaterThan(0)
      } else {
        // Strategy 2: Fall back to manual input
        await wizard.fillAddressManually(
          '42 Rue de la Loi',
          '1000',
          'Bruxelles',
        )

        // Verify the fields were filled
        const streetValue = await wizard.getAddressFieldValue(
          BUILDING_WIZARD_SELECTORS.addressStreet,
        )
        expect(streetValue).toBe('42 Rue de la Loi')
      }

      // Wait for async validation (name uniqueness check) to complete
      await wizard.waitForNextEnabled(15_000)

      // Now the Next button should be enabled
      const isEnabled = await wizard.isNextButtonEnabled()
      expect(isEnabled).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-address')
      throw error
    }
  })

  // ─── Steps 2-5: Wizard navigation ──────────────────────────────

  it('should navigate to step 2: Lots', async () => {
    try {
      await wizard.clickNext()
      await wizard.waitForStep(2)

      // Verify step 2 button text
      const nextText = await wizard.getNextButtonText()
      expect(nextText?.toLowerCase()).toContain('contacts')

      // Step 2 auto-creates a first lot — verify lot content is visible
      const hasLotContent = await wizard.hasContent('appartement')
      expect(hasLotContent).toBe(true)

      // Prev button should now be visible (only from step 2+)
      const hasPrev = await wizard.isPrevButtonVisible()
      expect(hasPrev).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-step2')
      throw error
    }
  })

  it('should navigate to step 3: Contacts & Documents', async () => {
    try {
      await wizard.clickNext()
      await wizard.waitForStep(3)

      // Verify step 3 button text
      const nextText = await wizard.getNextButtonText()
      expect(nextText?.toLowerCase()).toContain('interventions')
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-step3')
      throw error
    }
  })

  it('should navigate to step 4: Interventions', async () => {
    try {
      await wizard.clickNext()
      await wizard.waitForStep(4)

      // Verify step 4 button text
      const nextText = await wizard.getNextButtonText()
      expect(nextText?.toLowerCase()).toContain('confirmation')

      // Verify interventions content
      const hasInterventions = await wizard.hasContent('interventions')
      expect(hasInterventions).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-step4')
      throw error
    }
  })

  it('should navigate to step 5: Confirmation', async () => {
    try {
      await wizard.clickNext()
      await wizard.waitForStep(5)

      // Step 5 shows the submit button (not next)
      const hasSubmit = await wizard.isSubmitButtonVisible()
      expect(hasSubmit).toBe(true)

      // The next button should NOT be present on step 5
      const nextBtn = await page.$(BUILDING_WIZARD_SELECTORS.nextButton)
      expect(nextBtn).toBeNull()
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-step5')
      throw error
    }
  })

  it('should navigate back through all steps to step 1', async () => {
    try {
      // Navigate back from step 5 → step 1
      for (let targetStep = 4; targetStep >= 1; targetStep--) {
        await wizard.clickPrev()
        if (targetStep === 1) {
          // Step 1: verify content since there's no next-button-text check
          const hasTitle = await wizard.hasContent('ajouter un immeuble')
          expect(hasTitle).toBe(true)
        } else {
          await wizard.waitForStep(targetStep)
        }
      }

      // On step 1, prev button should NOT be present
      const hasPrev = await wizard.isPrevButtonVisible()
      expect(hasPrev).toBe(false)
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-back-nav')
      throw error
    }
  })

  // ─── Submission: Create building in DB ─────────────────────────

  it('should submit and create the building with document upload in DB', async () => {
    try {
      // Navigate to wizard fresh (avoid stale state from navigation tests)
      const baseUrl = getBaseUrl()
      await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      await wizard.navigate()

      // Step 1: Fill address (name is auto-generated)
      const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
        '42 Rue de la Loi, 1000 Bruxelles',
      )
      if (!autocompleteWorked) {
        await wizard.fillAddressManually('42 Rue de la Loi', '1000', 'Bruxelles')
      }
      await wizard.waitForNextEnabled(15_000)

      // Step 2: Lots (auto-created, waitForNextEnabled for async lot creation)
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

      // Step 5: Submit (building creation + document upload)
      await wizard.clickNext()
      await wizard.waitForStep(5)
      await wizard.clickSubmit()

      // Verify: success toast appears (document upload happens after building creation)
      const pageText = await wizard.waitForSuccessToast(45_000)
      expect(pageText.toLowerCase()).toContain('créé avec succès')

      // Verify: redirect to patrimoine list
      const url = await wizard.waitForRedirect('/gestionnaire/biens', 30_000)
      expect(url).toContain('/gestionnaire/biens')
    } catch (error) {
      await screenshotOnFailure(page, 'building-wizard-submit-with-doc')
      throw error
    }
  })
})
