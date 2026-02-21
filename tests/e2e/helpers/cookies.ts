/**
 * Cookie consent banner helpers for E2E tests
 *
 * SEIDO shows a "Nous utilisons des cookies" banner with Accepter/Refuser buttons.
 * This must be dismissed before interacting with page content, as the banner
 * overlays the UI and can intercept clicks.
 */

import type { Page } from 'puppeteer'

/**
 * Dismiss the cookie consent banner if present.
 *
 * Finds and clicks the "Accepter" button. Silently succeeds if the banner
 * is not present (e.g., cookies already accepted from a previous page visit).
 *
 * @param page - Puppeteer page instance
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const acceptBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.find(b =>
        b.textContent?.trim().toLowerCase().includes('accepter')
      ) || null
    })
    const el = acceptBtn.asElement()
    if (el) {
      await el.click()
      // Wait for banner to disappear
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch {
    // Banner not present or already dismissed — ignore
  }
}

/**
 * Dismiss the PWA install banner if present.
 *
 * The banner uses role="banner" and has a close button with
 * aria-label="Fermer le banner". It's position:fixed at the top
 * and intercepts CDP coordinate-based clicks on elements behind it.
 */
export async function dismissPWABanner(page: Page): Promise<void> {
  try {
    const closeBtn = await page.$('[role="banner"] button[aria-label="Fermer le banner"]')
    if (closeBtn) {
      await closeBtn.click()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch {
    // Banner not present — ignore
  }
}

/**
 * Dismiss all overlays: cookie consent banner + PWA install banner.
 * Call after the first page navigation in each test suite.
 */
export async function dismissAllBanners(page: Page): Promise<void> {
  await dismissCookieBanner(page)
  await dismissPWABanner(page)
}
