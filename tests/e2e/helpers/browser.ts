/**
 * Puppeteer browser management for E2E tests
 *
 * Provides a shared browser instance with:
 * - Auth cookie restoration from globalSetup (no per-file login needed)
 * - Multi-role support via newPageAs(role)
 *
 * The browser persists across all test files in a single run.
 * globalSetup logs in once per role; each test file restores cookies.
 *
 * NOTE: userDataDir was removed — it caused DOM events to silently fail
 * in headless mode (clicks, addEventListener all broken). Cold starts are
 * slower (~15-30s) but reliable. See hydration-test investigation notes.
 */

import puppeteer, { type Browser, type Page, type Protocol } from 'puppeteer'
import fs from 'fs/promises'
import { AUTH_COOKIES_PATH, getAuthCookiesPath } from '../setup/global-setup'

let browser: Browser | null = null

/**
 * Launch or reuse the shared browser instance.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: process.env.E2E_HEADLESS !== 'false',
      slowMo: process.env.E2E_SLOWMO ? parseInt(process.env.E2E_SLOWMO) : 0,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1440,900',
      ],
      defaultViewport: { width: 1440, height: 900 },
    })
  }
  return browser
}

/**
 * Create a fresh page with gestionnaire auth cookies pre-loaded.
 * No login needed — cookies were saved by globalSetup.
 * Backward compatible with existing tests.
 */
export async function newPage(): Promise<Page> {
  return newPageAs('gestionnaire')
}

/**
 * Create a fresh page authenticated as a specific role.
 *
 * @param role - Role key from TEST_ACCOUNTS ('gestionnaire', 'locataire', 'prestataire')
 * @returns Page with role-specific auth cookies pre-loaded
 */
export async function newPageAs(role: string): Promise<Page> {
  const b = await getBrowser()
  const page = await b.newPage()

  // Default timeouts — Server Components in dev mode can take 15-30s on cold start
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(45_000)

  // Restore auth cookies for the specified role
  await restoreAuthCookies(page, role)

  return page
}

/**
 * Load auth cookies for a specific role into this page.
 * After this, navigating to any SEIDO page will be authenticated as that role.
 *
 * @param page - Puppeteer page
 * @param role - Role key ('gestionnaire', 'locataire', 'prestataire'). Defaults to 'gestionnaire'.
 */
async function restoreAuthCookies(page: Page, role: string = 'gestionnaire'): Promise<void> {
  // Try role-specific path first, then legacy path for gestionnaire
  const rolePath = getAuthCookiesPath(role)
  const paths = role === 'gestionnaire' ? [rolePath, AUTH_COOKIES_PATH] : [rolePath]

  for (const cookiePath of paths) {
    try {
      const data = await fs.readFile(cookiePath, 'utf-8')
      const cookies: Protocol.Network.CookieParam[] = JSON.parse(data)
      if (cookies.length > 0) {
        await page.setCookie(...cookies)
        return
      }
    } catch {
      // Try next path
    }
  }

  console.warn(`[Browser] Auth cookies not found for role '${role}' — tests may need manual login`)
}

/**
 * Close the shared browser (call in final test file's afterAll)
 */
export async function closeBrowser(): Promise<void> {
  if (browser && browser.connected) {
    await browser.close()
    browser = null
  }
}

/**
 * Take a screenshot on failure (for debugging)
 */
export async function screenshotOnFailure(page: Page, testName: string): Promise<void> {
  try {
    const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, '_')
    await page.screenshot({
      path: `tests/e2e/screenshots/${safeName}-${Date.now()}.png`,
      fullPage: true,
    })
  } catch {
    // Ignore screenshot errors
  }
}
