/**
 * Puppeteer browser management for E2E tests
 *
 * Provides a shared browser instance with:
 * - Auth cookie restoration from globalSetup (no per-file login needed)
 *
 * The browser persists across all test files in a single run.
 * globalSetup logs in once; each test file restores cookies.
 *
 * NOTE: userDataDir was removed — it caused DOM events to silently fail
 * in headless mode (clicks, addEventListener all broken). Cold starts are
 * slower (~15-30s) but reliable. See hydration-test investigation notes.
 */

import puppeteer, { type Browser, type Page, type Protocol } from 'puppeteer'
import fs from 'fs/promises'
import path from 'path'

let browser: Browser | null = null

/** Path to auth cookies saved by globalSetup */
const AUTH_COOKIES_PATH = path.resolve(__dirname, '../.auth-cookies.json')

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
 * Create a fresh page with auth cookies pre-loaded.
 * No login needed — cookies were saved by globalSetup.
 */
export async function newPage(): Promise<Page> {
  const b = await getBrowser()
  const page = await b.newPage()

  // Default timeouts — Server Components in dev mode can take 15-30s on cold start
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(45_000)

  // Restore auth cookies from globalSetup
  await restoreAuthCookies(page)

  return page
}

/**
 * Load auth cookies saved by globalSetup into this page.
 * After this, navigating to any SEIDO page will be authenticated.
 */
async function restoreAuthCookies(page: Page): Promise<void> {
  try {
    const data = await fs.readFile(AUTH_COOKIES_PATH, 'utf-8')
    const cookies: Protocol.Network.CookieParam[] = JSON.parse(data)
    if (cookies.length > 0) {
      await page.setCookie(...cookies)
    }
  } catch {
    // Cookies file not found — globalSetup may have failed or not run.
    // Tests will need to login manually as fallback.
    console.warn('[Browser] Auth cookies not found — tests may need manual login')
  }
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
