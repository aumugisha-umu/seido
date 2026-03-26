/**
 * Shared Playwright selector utilities for E2E and QA Bot tests.
 * Playwright-native locators (getByRole, getByText, etc.) preferred over CSS selectors.
 */

import { type Page, expect } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

/** Wait for page content to include at least one text marker (SSR streaming) */
export async function waitForContent(page: Page, markers: string[], timeout = 30_000): Promise<void> {
  await page.waitForFunction(
    (ms: string[]) => {
      const text = document.body.innerText.toLowerCase()
      return ms.some(m => text.includes(m.toLowerCase()))
    },
    markers,
    { timeout, polling: 1_000 }
  )
}

/** Wait for URL to contain a path segment */
export async function waitForUrlContaining(page: Page, pathSegment: string, timeout = 10_000): Promise<void> {
  await page.waitForURL(`**/*${pathSegment}*`, { timeout })
}

/** Dismiss cookie banner, PWA install prompts, and notification modals.
 *  Order: top-layer modals first (they block clicks on lower elements) → then banners.
 */
export async function dismissBanners(page: Page): Promise<void> {
  // 1. Notification permission modal (highest z-index — blocks everything underneath)
  try {
    const notifClose = page.locator('[data-testid="notification-dismiss"]')
      .or(page.getByRole('button', { name: /plus tard|j'ai compris|j\'ai compris|pas maintenant|later/i }))
    if (await notifClose.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await notifClose.first().click()
      await page.waitForTimeout(300)
    }
  } catch { /* continue to next dismissal */ }

  // 2. Dialog "Fermer" close button (notification blocked dialog)
  try {
    const dialogClose = page.getByRole('dialog').getByRole('button', { name: /^fermer$/i })
    if (await dialogClose.isVisible({ timeout: 500 }).catch(() => false)) {
      await dialogClose.click()
      await page.waitForTimeout(300)
    }
  } catch { /* continue */ }

  // 3. Cookie banner (lower layer)
  try {
    const cookieAccept = page.getByRole('button', { name: /accepter|accept/i })
    if (await cookieAccept.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cookieAccept.click()
      await page.waitForTimeout(300)
    }
  } catch { /* continue */ }

  // 4. PWA install prompt
  try {
    const pwaClose = page.locator('[data-testid="pwa-dismiss"], [data-testid="close-install-prompt"]')
    if (await pwaClose.isVisible({ timeout: 500 }).catch(() => false)) {
      await pwaClose.click()
    }
  } catch { /* continue */ }
}

// ─── Wizard Navigation ──────────────────────────────────

/** Click the "Continuer" / "Suivant" button to advance a step wizard */
export async function clickNextStep(page: Page): Promise<void> {
  const nextButton = page.getByRole('button', { name: /continuer|suivant/i }).first()
  await expect(nextButton).toBeEnabled({ timeout: 10_000 })
  await nextButton.click()
}

/** Click the "Retour" / back button */
export async function clickPreviousStep(page: Page): Promise<void> {
  await page.getByRole('button', { name: /retour|précédent/i }).first().click()
}

// ─── Toast Assertions ───────────────────────────────────

/** Wait for a success toast (checks both success and error to avoid blind waits) */
export async function waitForSuccessToast(page: Page, timeout = 15_000): Promise<string> {
  const toast = page.locator('[data-sonner-toast]').first()
  await expect(toast).toBeVisible({ timeout })
  const text = await toast.textContent() || ''
  return text
}

/** Wait for toast containing specific text */
export async function waitForToastContaining(page: Page, text: string, timeout = 15_000): Promise<void> {
  await page.waitForFunction(
    (t: string) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    text,
    { timeout, polling: 500 }
  )
}

// ─── Form Helpers ───────────────────────────────────────

/** Fill an input field by its label */
export async function fillByLabel(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: false }).fill(value)
}

/** Select a Radix UI dropdown option by clicking trigger then option text */
export async function selectRadixOption(page: Page, triggerLabel: string, optionText: string): Promise<void> {
  await page.getByLabel(triggerLabel, { exact: false }).click()
  await page.getByRole('option', { name: optionText }).click()
}

// ─── Multi-Role Context ─────────────────────────────────

/** Create a new browser context with a specific role's storageState */
export async function createRoleContext(page: Page, role: 'gestionnaire' | 'locataire' | 'prestataire') {
  const storageStatePath = `playwright/.auth/${role}.json`
  const context = await page.context().browser()!.newContext({ storageState: storageStatePath })
  return context.newPage()
}
