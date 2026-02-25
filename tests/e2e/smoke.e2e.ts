/**
 * Smoke test — validates the E2E test infrastructure works
 *
 * Tests:
 * 1. Auth cookies from globalSetup work (no login needed)
 * 2. Dashboard loads with authenticated session
 * 3. Building creation page loads (wizard form renders)
 * 4. Lot creation page loads (wizard form renders)
 *
 * Note: globalSetup handles login. Cookies are restored by newPage().
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { isAuthenticated } from './helpers/auth'
import { dismissCookieBanner } from './helpers/cookies'
import { waitForContent } from './helpers/selectors'
import { getBaseUrl } from '../fixtures/test-accounts'
import { KNOWN_ENTITIES } from '../fixtures/known-entities'
import { DashboardPage } from './pages/dashboard.page'

describe('E2E Smoke Test', () => {
  let page: Page
  let dashboardPage: DashboardPage

  beforeAll(async () => {
    page = await newPage()
    dashboardPage = new DashboardPage(page)
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  it('should be authenticated via globalSetup cookies', async () => {
    try {
      const baseUrl = getBaseUrl()
      // Navigate to dashboard — cookies should authenticate automatically
      await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })

      // Wait for page to settle (possible redirect)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify we're authenticated (not redirected to login)
      const authenticated = await isAuthenticated(page)
      expect(authenticated).toBe(true)

      const url = page.url()
      expect(url).toContain('gestionnaire')

      // Dismiss cookie banner
      await dismissCookieBanner(page)
    } catch (error) {
      await screenshotOnFailure(page, 'auth-cookies')
      throw error
    }
  })

  it('should display the dashboard after auth', async () => {
    try {
      const loaded = await dashboardPage.isLoaded()
      expect(loaded).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'dashboard-load')
      throw error
    }
  })

  it('should navigate to building creation page', async () => {
    try {
      const baseUrl = getBaseUrl()

      await dismissCookieBanner(page)

      await page.goto(`${baseUrl}${KNOWN_ENTITIES.routes.newBuilding}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })

      await waitForContent(page, KNOWN_ENTITIES.contentMarkers.buildingWizard, 30_000)
    } catch (error) {
      await screenshotOnFailure(page, 'building-creation-page')
      throw error
    }
  })

  it('should navigate to lot creation page', async () => {
    try {
      const baseUrl = getBaseUrl()
      await page.goto(`${baseUrl}${KNOWN_ENTITIES.routes.newLot}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })

      await waitForContent(page, KNOWN_ENTITIES.contentMarkers.lotWizard, 30_000)
    } catch (error) {
      await screenshotOnFailure(page, 'lot-creation-page')
      throw error
    }
  })
})
