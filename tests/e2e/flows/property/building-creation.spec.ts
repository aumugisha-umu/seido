/**
 * E2E — Building Creation Wizard (Playwright)
 *
 * Tests address filling (Google Maps autocomplete OR manual), 5-step wizard
 * navigation, document upload, and full submission with DB creation.
 */

import { test, expect } from '@playwright/test'
import { BuildingWizardPage } from '../../pages/building-wizard.page.pw'

test.describe('Building Creation Wizard', () => {
  let wizard: BuildingWizardPage

  test.beforeEach(async ({ page }) => {
    wizard = new BuildingWizardPage(page)
  })

  test('should load step 1 with all step indicators', async ({ page }) => {
    await wizard.navigate()

    expect(await wizard.hasContent('ajouter un immeuble')).toBe(true)

    for (let i = 1; i <= 5; i++) {
      expect(await wizard.hasStepIndicator(i)).toBe(true)
    }

    const nextText = await wizard.getNextButtonText()
    expect(nextText?.toLowerCase()).toContain('lots')
  })

  test('should fill address via autocomplete or manual input', async () => {
    await wizard.navigate()

    const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
      '42 Rue de la Loi, 1000 Bruxelles',
    )

    if (autocompleteWorked) {
      const street = await wizard.getAddressFieldValue('#address-street')
      expect(street.length).toBeGreaterThan(0)
    } else {
      await wizard.fillAddressManually('42 Rue de la Loi', '1000', 'Bruxelles')
      const street = await wizard.getAddressFieldValue('#address-street')
      expect(street).toBe('42 Rue de la Loi')
    }

    await wizard.waitForNextEnabled(15_000)
    expect(await wizard.isNextButtonEnabled()).toBe(true)
  })

  test('should navigate through steps 2-5', async () => {
    await wizard.navigate()

    // Fill address first
    const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
      '42 Rue de la Loi, 1000 Bruxelles',
    )
    if (!autocompleteWorked) {
      await wizard.fillAddressManually('42 Rue de la Loi', '1000', 'Bruxelles')
    }
    await wizard.waitForNextEnabled(15_000)

    // Step 2: Lots
    await wizard.clickNext()
    await wizard.waitForStep(2)
    const step2Text = await wizard.getNextButtonText()
    expect(step2Text?.toLowerCase()).toContain('contacts')
    expect(await wizard.hasContent('appartement')).toBe(true)
    expect(await wizard.isPrevButtonVisible()).toBe(true)

    // Step 3: Contacts & Documents
    await wizard.clickNext()
    await wizard.waitForStep(3)
    const step3Text = await wizard.getNextButtonText()
    expect(step3Text?.toLowerCase()).toContain('interventions')

    // Step 4: Interventions
    await wizard.clickNext()
    await wizard.waitForStep(4)
    const step4Text = await wizard.getNextButtonText()
    expect(step4Text?.toLowerCase()).toContain('confirmation')

    // Step 5: Confirmation
    await wizard.clickNext()
    await wizard.waitForStep(5)
    expect(await wizard.isSubmitButtonVisible()).toBe(true)
    await expect(wizard.nextButton).not.toBeVisible()
  })

  test('should navigate back through all steps to step 1', async () => {
    await wizard.navigate()

    // Navigate forward first
    const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
      '42 Rue de la Loi, 1000 Bruxelles',
    )
    if (!autocompleteWorked) {
      await wizard.fillAddressManually('42 Rue de la Loi', '1000', 'Bruxelles')
    }
    await wizard.waitForNextEnabled(15_000)

    for (let i = 2; i <= 5; i++) {
      await wizard.clickNext()
      await wizard.waitForStep(i)
    }

    // Navigate back
    for (let targetStep = 4; targetStep >= 1; targetStep--) {
      await wizard.clickPrev()
      if (targetStep === 1) {
        expect(await wizard.hasContent('ajouter un immeuble')).toBe(true)
      } else {
        await wizard.waitForStep(targetStep)
      }
    }

    expect(await wizard.isPrevButtonVisible()).toBe(false)
  })

  test('should submit and create building with document upload', async ({ page }) => {
    // Navigate fresh
    await page.goto('/gestionnaire/dashboard')
    await page.waitForTimeout(1000)
    await wizard.navigate()

    // Step 1: Address
    const autocompleteWorked = await wizard.fillAddressViaAutocomplete(
      '42 Rue de la Loi, 1000 Bruxelles',
    )
    if (!autocompleteWorked) {
      await wizard.fillAddressManually('42 Rue de la Loi', '1000', 'Bruxelles')
    }
    await wizard.waitForNextEnabled(15_000)

    // Step 2: Lots
    await wizard.clickNext()
    await wizard.waitForStep(2)
    await wizard.waitForNextEnabled(15_000)

    // Step 3: Documents — upload PDF
    await wizard.clickNext()
    await wizard.waitForStep(3)
    await wizard.switchToDocumentsTab()
    await wizard.uploadDocumentToSlot('certificat_peb')
    expect(await wizard.hasStagedFile('test-document.pdf')).toBe(true)
    await wizard.waitForNextEnabled(15_000)

    // Step 4: Interventions
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
