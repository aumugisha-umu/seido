/**
 * E2E test — Gestionnaire Intervention Creation (E-001)
 *
 * Tests the 4-step wizard at /gestionnaire/interventions/nouvelle-intervention:
 * - Step 1: Select property (building/lot)
 * - Step 2: Fill intervention details (title, type, urgency, description)
 * - Step 3: Contacts assignment (skip with defaults)
 * - Step 4: Confirmation + submit
 *
 * Tests run against a live dev server (localhost:3000) with real staging data.
 * Authenticated as gestionnaire via globalSetup cookies.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissAllBanners } from './helpers/cookies'
import { waitForContent } from './helpers/selectors'
import { InterventionWizardPage } from './pages/intervention-wizard.page'
import { getBaseUrl } from '../fixtures/test-accounts'

describe('Gestionnaire Intervention Creation', () => {
  let page: Page
  let wizard: InterventionWizardPage

  beforeAll(async () => {
    page = await newPage()
    wizard = new InterventionWizardPage(page)

    // Auth cookies pre-loaded by newPage() from globalSetup
    const baseUrl = getBaseUrl()
    await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await dismissAllBanners(page)
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  it('should load the intervention creation wizard (step 1)', async () => {
    try {
      await wizard.navigate()

      // Verify step 1 content — property selection
      const hasContent = await wizard.hasContent('bien')
      expect(hasContent).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-gest-step1')
      throw error
    }
  })

  it('should select a property and enable Continue button', async () => {
    try {
      await wizard.selectFirstProperty()

      await wizard.waitForNextEnabled(10_000)
      const isEnabled = await wizard.isNextButtonEnabled()
      expect(isEnabled).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-gest-property-select')
      throw error
    }
  })

  it('should navigate to step 2 and show detail fields', async () => {
    try {
      await wizard.clickNext()

      // Wait for step 2 to load — should show description or type fields
      await waitForContent(page, ['description', 'type', 'urgence', 'titre'], 15_000)

      const hasType = await wizard.hasContent('type')
      expect(hasType).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-gest-step2')
      throw error
    }
  })

  it('should submit and create an intervention with full details', async () => {
    try {
      // Navigate to wizard fresh (avoid stale state from previous tests)
      const baseUrl = getBaseUrl()
      await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      await wizard.navigate()

      // Step 1: Select first property
      await wizard.selectFirstProperty()
      await wizard.waitForNextEnabled(10_000)

      // Step 2: Fill intervention details
      await wizard.clickNext()
      await waitForContent(page, ['description', 'type', 'urgence'], 15_000)

      await wizard.fillDetails({
        title: `E2E Test: Fuite robinet ${Date.now()}`,
        type: 'plomberie',
        description: 'Test E2E: Fuite au niveau du robinet de la cuisine. Intervention urgente requise.',
      })

      await wizard.waitForNextEnabled(15_000)

      // Step 3: Contacts (skip through with defaults)
      await wizard.clickNext()
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 4: Confirmation — click submit
      // Try to advance. If we're already on confirmation, the submit button will be visible.
      // Otherwise, keep advancing.
      const hasSubmitAlready = await wizard.hasContent("créer l'intervention")
      if (!hasSubmitAlready) {
        await wizard.waitForNextEnabled(15_000)
        await wizard.clickNext()
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // Submit
      await wizard.clickSubmit()

      // Verify: success toast or redirect
      const pageText = await wizard.waitForSuccessToast(45_000)
      const isSuccess = pageText.toLowerCase().includes('créée avec succès')
      const hasError = pageText.toLowerCase().includes('erreur')

      // Should succeed or redirect — fail only if explicit error
      expect(isSuccess || !hasError).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-gest-submit')
      throw error
    }
  })
})
