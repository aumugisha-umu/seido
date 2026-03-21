/**
 * E2E — Lot Creation Wizard (Playwright)
 *
 * Tests both "existing building" and "independent" paths through all 5 steps.
 * Steps: Immeuble > Lot > Contacts & Documents > Interventions > Confirmation
 */

import { test, expect } from '@playwright/test'
import { LotWizardPage } from '../../pages/lot-wizard.page.pw'

test.describe('Lot Creation Wizard', () => {
  let wizard: LotWizardPage

  test.beforeEach(async ({ page }) => {
    wizard = new LotWizardPage(page)
  })

  // ═══════════════════════════════════════════════════════════
  // Existing Building Mode
  // ═══════════════════════════════════════════════════════════

  test.describe('Existing Building Mode', () => {
    test('should load step 1 with building selection', async () => {
      await wizard.navigate()

      expect(await wizard.hasContent('lier à un immeuble')).toBe(true)

      for (let i = 1; i <= 5; i++) {
        expect(await wizard.hasStepIndicator(i)).toBe(true)
      }

      const nextText = await wizard.getNextButtonText()
      expect(nextText?.toLowerCase()).toContain('lot')
      expect(await wizard.isPrevButtonDisabled()).toBe(true)
    })

    test('should select building and navigate through all steps', async () => {
      await wizard.navigate()
      await wizard.selectFirstBuilding()
      await wizard.waitForNextEnabled(10_000)

      // Step 2
      await wizard.clickNext()
      await wizard.waitForStep(2)
      expect((await wizard.getNextButtonText())?.toLowerCase()).toContain('contacts')
      expect(await wizard.isPrevButtonDisabled()).toBe(false)

      // Step 3
      await wizard.clickNext()
      await wizard.waitForStep(3)
      expect((await wizard.getNextButtonText())?.toLowerCase()).toContain('interventions')

      // Step 4
      await wizard.clickNext()
      await wizard.waitForStep(4)
      expect((await wizard.getNextButtonText())?.toLowerCase()).toContain('confirmation')

      // Step 5
      await wizard.clickNext()
      await wizard.waitForStep(5)
      expect(await wizard.isSubmitButtonVisible()).toBe(true)
    })

    test('should navigate back to step 1', async () => {
      await wizard.navigate()
      await wizard.selectFirstBuilding()
      await wizard.waitForNextEnabled(10_000)

      // Navigate to step 5
      for (let step = 2; step <= 5; step++) {
        await wizard.clickNext()
        await wizard.waitForStep(step)
      }

      // Navigate back
      for (let targetStep = 4; targetStep >= 1; targetStep--) {
        await wizard.clickPrev()
        if (targetStep === 1) {
          expect(await wizard.hasContent('lier à un immeuble')).toBe(true)
        } else {
          await wizard.waitForStep(targetStep)
        }
      }
      expect(await wizard.isPrevButtonDisabled()).toBe(true)
    })

    test('should submit lot with document upload', async ({ page }) => {
      await page.goto('/gestionnaire/dashboard')
      await page.waitForTimeout(1000)
      await wizard.navigate()

      // Step 1: Select building
      await wizard.selectFirstBuilding()
      await wizard.waitForNextEnabled(10_000)

      // Step 2: Lot info (defaults sufficient)
      await wizard.clickNext()
      await wizard.waitForStep(2)
      await wizard.waitForNextEnabled(15_000)

      // Step 3: Upload document
      await wizard.clickNext()
      await wizard.waitForStep(3)
      await wizard.switchToDocumentsTab()
      await wizard.uploadDocumentToSlot('certificat_peb')
      expect(await wizard.hasStagedFile('test-document.pdf')).toBe(true)
      await wizard.waitForNextEnabled(15_000)

      // Step 4: Skip
      await wizard.clickNext()
      await wizard.waitForStep(4)
      await wizard.waitForNextEnabled(15_000)

      // Step 5: Submit
      await wizard.clickNext()
      await wizard.waitForStep(5)
      await wizard.clickSubmit()
      await wizard.waitForSuccessToast(45_000)
      await wizard.waitForRedirect('/gestionnaire/biens/immeubles/')
    })
  })

  // ═══════════════════════════════════════════════════════════
  // Independent Mode
  // ═══════════════════════════════════════════════════════════

  test.describe('Independent Mode', () => {
    test('should select independent mode and enable Next', async ({ page }) => {
      await page.goto('/gestionnaire/dashboard')
      await page.waitForTimeout(1000)
      await wizard.navigate()

      await wizard.selectIndependentMode()

      expect(await wizard.hasContent('lier à un immeuble')).toBe(true)
      await wizard.waitForNextEnabled(5_000)
      expect(await wizard.isNextButtonEnabled()).toBe(true)
    })

    test('should navigate through all steps in independent mode', async ({ page }) => {
      await page.goto('/gestionnaire/dashboard')
      await page.waitForTimeout(1000)
      await wizard.navigate()
      await wizard.selectIndependentMode()
      await wizard.waitForNextEnabled(5_000)

      // Step 2: Fill address
      await wizard.clickNext()
      await wizard.waitForStep(2)
      await wizard.fillIndependentLotAddress()

      // Step 3
      await wizard.clickNext()
      await wizard.waitForStep(3)

      // Step 4
      await wizard.clickNext()
      await wizard.waitForStep(4)

      // Step 5
      await wizard.clickNext()
      await wizard.waitForStep(5)
      expect(await wizard.isSubmitButtonVisible()).toBe(true)
    })

    test('should submit independent lot with document upload', async ({ page }) => {
      await page.goto('/gestionnaire/dashboard')
      await page.waitForTimeout(1000)
      await wizard.navigate()

      // Step 1: Independent mode
      await wizard.selectIndependentMode()
      await wizard.waitForNextEnabled(10_000)

      // Step 2: Address
      await wizard.clickNext()
      await wizard.waitForStep(2)
      await wizard.fillIndependentLotAddress()

      // Step 3: Documents
      await wizard.waitForNextEnabled(15_000)
      await wizard.clickNext()
      await wizard.waitForStep(3)
      await wizard.switchToDocumentsTab()
      await wizard.expandFirstLotAccordion()
      await wizard.uploadDocumentToSlot('certificat_peb')
      expect(await wizard.hasStagedFile('test-document.pdf')).toBe(true)
      await wizard.waitForNextEnabled(15_000)

      // Step 4
      await wizard.clickNext()
      await wizard.waitForStep(4)
      await wizard.waitForNextEnabled(15_000)

      // Step 5: Submit
      await wizard.clickNext()
      await wizard.waitForStep(5)
      await wizard.clickSubmit()
      await wizard.waitForSuccessToast(45_000)
      await wizard.waitForRedirect('/gestionnaire/biens')
    })
  })
})
