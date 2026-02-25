/**
 * E2E test — Contract Creation Wizard (5-step flow)
 *
 * Steps:
 * 0. Lot selection (PropertySelector — "Lots" tab)
 * 1. Détails et contacts (start date, rent, tenant selection via modal)
 * 2. Documents (optional — upload test PDF)
 * 3. Interventions (optional — auto-generated)
 * 4. Confirmation (review + submit "Créer le bail")
 *
 * Submission test creates a real contract in the staging DB with document upload.
 * Tests run against a live dev server (localhost:3000) with real staging data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissAllBanners } from './helpers/cookies'
import { ContractWizardPage } from './pages/contract-wizard.page'
import { getBaseUrl } from '../fixtures/test-accounts'

/** Absolute path to test PDF fixture (316 bytes, valid PDF 1.4) */
const TEST_PDF_PATH = path.resolve(__dirname, '../fixtures/test-document.pdf')

/**
 * Generate a unique future start date (ddMMyyyy digits) to avoid overlap conflicts.
 * Each run offsets by a random number of months (2040–2060 range) so
 * successive runs on the same lot don't trigger the contract overlap check.
 */
function generateUniqueStartDate(): string {
  const year = 2040 + Math.floor(Math.random() * 20)
  const month = 1 + Math.floor(Math.random() * 12)
  const dd = '01'
  const mm = String(month).padStart(2, '0')
  const yyyy = String(year)
  return `${dd}${mm}${yyyy}`
}

describe('Contract Creation Wizard', () => {
  let page: Page
  let wizard: ContractWizardPage

  beforeAll(async () => {
    page = await newPage()

    // Forward browser console + network failures to Node for debugging
    page.on('console', async msg => {
      const type = msg.type()
      if (['error', 'warning'].includes(type)) {
        // Serialize all args to capture Error objects (msg.text() shows JSHandle@error)
        const args = await Promise.all(
          msg.args().map(arg => arg.jsonValue().catch(() => arg.toString()))
        )
        console.log(`[BROWSER ${type}]`, ...args)
      }
    })
    page.on('requestfailed', request => {
      const url = request.url()
      // Skip noisy failures: analytics, HMR, RSC prefetches, ORB-blocked images
      if (url.includes('contentsquare.net') || url.includes('127.0.0.1:7242') ||
          url.includes('googleusercontent.com') || request.failure()?.errorText === 'net::ERR_ABORTED') {
        return
      }
      console.log(`[NETWORK FAIL] ${request.method()} ${url} → ${request.failure()?.errorText}`)
    })
    page.on('response', async response => {
      if (response.status() >= 400) {
        let body = ''
        try {
          body = await response.text()
          if (body.length > 500) body = body.substring(0, 500) + '...'
        } catch { /* response may already be consumed */ }
        console.log(`[HTTP ${response.status()}] ${response.url()}${body ? ' | ' + body : ''}`)
      }
    })

    // Dashboard bounce: navigate to dashboard first to trigger middleware
    // token refresh. Without this, Server Component data fetches may return
    // empty if the JWT is stale (middleware refreshes token on navigation).
    const baseUrl = getBaseUrl()
    await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    // Wait for sidebar to render (present on every authenticated page)
    await page.waitForFunction(
      () => document.body.innerText.includes('Patrimoine'),
      { timeout: 30_000, polling: 500 },
    )

    // Wait for client-side data fetches to complete (team_members, notifications).
    // If we navigate away while SWR requests are in-flight, they get ERR_ABORTED
    // and the team context breaks on the next page.
    await page.waitForNetworkIdle({ timeout: 15_000, idleTime: 2000 }).catch(() => {
      // HMR WebSocket keeps connection alive in dev mode — ignore timeout
    })

    // Dismiss all overlays (cookie consent + PWA install banner)
    await dismissAllBanners(page)

    wizard = new ContractWizardPage(page)
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  it('should submit and create a contract with document upload', { timeout: 180_000 }, async () => {
    try {
      // Navigate to wizard
      await wizard.navigate()

      // Dismiss banners again (cookie consent reappears on new page navigation)
      await dismissAllBanners(page)

      // Step 0: Select a lot
      await wizard.selectFirstLot()
      await wizard.waitForNextEnabled(15_000)

      // Step 1: Fill details + add tenant
      await wizard.clickNext()
      await wizard.waitForStep(1)

      // Fill start date with unique future date to avoid overlap conflicts
      const startDate = generateUniqueStartDate()
      await wizard.fillStartDate(startDate)

      // Fill rent amount (required, must be > 0)
      await wizard.fillRentAmount('800')

      // Add first tenant via contact modal
      await wizard.addFirstTenant()

      // Duration defaults to 12 months, charges default to 0 — good enough
      await wizard.waitForNextEnabled(15_000)

      // Step 2: Documents — upload a PDF to "Bail signé" slot
      await wizard.clickNext()
      await wizard.waitForStep(2)
      await wizard.uploadDocumentToSlot('bail', TEST_PDF_PATH)

      // Verify: staged file name should appear in the UI
      const hasFile = await wizard.hasStagedFile('test-document.pdf')
      expect(hasFile).toBe(true)

      // Step 3: Interventions (skip through)
      await wizard.clickNext()
      await wizard.waitForStep(3)

      // Step 4: Confirmation + Submit
      await wizard.clickNext()
      await wizard.waitForStep(4)
      await wizard.clickSubmit()

      // Verify: success toast appears (waits for either success or error toast)
      const pageText = await wizard.waitForSuccessToast(45_000)
      expect(pageText).toContain('Bail créé avec succès')

      // Verify: redirect to contract detail page
      const url = await wizard.waitForRedirect('/gestionnaire/contrats/', 30_000)
      expect(url).toContain('/gestionnaire/contrats/')
    } catch (error) {
      await screenshotOnFailure(page, 'contract-wizard-submit-with-doc')
      throw error
    }
  })
})
