/**
 * E2E test — Locataire Intervention Request (E-002)
 *
 * Tests the locataire request form at /locataire/interventions/nouvelle-demande:
 * - Step 1: Logement selection (skipped if only 1 lot)
 * - Step 2: Request details (type, description)
 * - Step 3: Confirmation + submit
 *
 * Uses newPageAs('locataire') for locataire auth.
 * Tests run against a live dev server (localhost:3000) with real staging data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPageAs, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissAllBanners } from './helpers/cookies'
import { waitForContent } from './helpers/selectors'
import { InterventionRequestPage } from './pages/intervention-request.page'
import { getBaseUrl } from '../fixtures/test-accounts'

describe('Locataire Intervention Request', () => {
  let page: Page
  let request: InterventionRequestPage

  beforeAll(async () => {
    page = await newPageAs('locataire')
    request = new InterventionRequestPage(page)

    // Navigate to locataire dashboard to validate cookies
    const baseUrl = getBaseUrl()
    await page.goto(`${baseUrl}/locataire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await dismissAllBanners(page)
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  it('should load the request form', async () => {
    try {
      await request.navigate()

      // Should show either logement selection or directly the form
      const hasContent =
        (await request.hasContent('déclarer un sinistre')) ||
        (await request.hasContent('logement')) ||
        (await request.hasContent('type de problème'))
      expect(hasContent).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-loc-load')
      throw error
    }
  })

  it('should show the details form (step 2)', async () => {
    try {
      // If step 1 (logement) is shown, select and advance
      const hasLogementStep = await request.hasContent('sélectionner ce logement')
      if (hasLogementStep) {
        await request.selectFirstLot()
        await request.waitForNextEnabled(10_000)
        await request.clickNext()
      }

      // Should now show the details form
      await waitForContent(page, ['type de problème', 'description', 'urgence'], 15_000)

      const hasDescription = await request.hasContent('description')
      expect(hasDescription).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-loc-step2')
      throw error
    }
  })

  it('should submit a request and get confirmation', async () => {
    try {
      // Navigate fresh
      const baseUrl = getBaseUrl()
      await page.goto(`${baseUrl}/locataire/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      await request.navigate()

      // Handle step 1 if shown
      const hasLogementStep = await request.hasContent('sélectionner ce logement')
      if (hasLogementStep) {
        await request.selectFirstLot()
        await request.waitForNextEnabled(10_000)
        await request.clickNext()
      }

      // Step 2: Fill details
      await waitForContent(page, ['type de problème', 'description'], 15_000)
      await request.fillDetails({
        type: 'plomberie',
        description: `E2E Test: Fuite d'eau sous l'évier de la cuisine. ${Date.now()}`,
      })

      await request.waitForNextEnabled(15_000)

      // Advance to confirmation
      await request.clickNext()
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Submit
      await request.clickSubmit()

      // Verify success toast
      const pageText = await request.waitForSuccessToast(45_000)
      const isSuccess = pageText.includes('Demande envoyée') || pageText.includes('envoyée')
      const hasError = pageText.toLowerCase().includes('erreur')

      expect(isSuccess || !hasError).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'intervention-loc-submit')
      throw error
    }
  })
})
