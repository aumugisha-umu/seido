/**
 * Visual regression tests for key UI components.
 * @tags @visual
 *
 * Uses Playwright's built-in screenshot comparison with toHaveScreenshot().
 * Reference screenshots are stored in visual-regression.spec.ts-snapshots/.
 */

import { test, expect } from '@playwright/test'
import { AUTH_FILES } from '../setup/auth.setup'

interface VisualTest {
  name: string
  path: string
  selector: string
  storageState: string | { cookies: never[]; origins: never[] }
  maskSelectors?: string[]
}

const VISUAL_TESTS: VisualTest[] = [
  {
    name: 'login-page',
    path: '/auth/login',
    selector: 'main',
    storageState: JSON.stringify({ cookies: [], origins: [] }),
  },
  {
    name: 'dashboard-sidebar',
    path: '/gestionnaire/dashboard',
    selector: '[data-testid="sidebar"]',
    storageState: AUTH_FILES.gestionnaire,
  },
  {
    name: 'intervention-list',
    path: '/gestionnaire/interventions',
    selector: '[data-testid="intervention-list"]',
    storageState: AUTH_FILES.gestionnaire,
    maskSelectors: ['time', '[data-testid="timestamp"]', '[data-testid="date"]'],
  },
  {
    name: 'pricing-cards',
    path: '/gestionnaire/settings/billing',
    selector: '[data-testid="pricing-cards"]',
    storageState: AUTH_FILES.gestionnaire,
  },
  {
    name: 'landing-hero',
    path: '/',
    selector: '[data-testid="hero-section"]',
    storageState: JSON.stringify({ cookies: [], origins: [] }),
  },
]

for (const vt of VISUAL_TESTS) {
  test(`@visual ${vt.name} should match snapshot`, async ({ browser }) => {
    const storageState =
      typeof vt.storageState === 'string' && vt.storageState.startsWith('{')
        ? JSON.parse(vt.storageState)
        : vt.storageState

    const context = await browser.newContext({ storageState })
    const page = await context.newPage()

    await page.goto(vt.path, { waitUntil: 'networkidle' })

    const locator = page.locator(vt.selector)
    await locator.waitFor({ state: 'visible', timeout: 15_000 })

    // Build mask locators for dynamic content
    const masks = (vt.maskSelectors ?? []).map((sel) => page.locator(sel))

    await expect(locator).toHaveScreenshot(`${vt.name}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask: masks,
    })

    await context.close()
  })
}
