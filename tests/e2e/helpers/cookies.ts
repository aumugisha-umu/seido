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
 * Uses DOM .click() via page.evaluate to bypass overlay issues.
 * Silently succeeds if the banner is not present.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const acceptBtn = buttons.find(b =>
        b.textContent?.trim().toLowerCase().includes('accepter')
      )
      if (acceptBtn) { acceptBtn.click(); return true }
      return false
    })
    if (clicked) {
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
 * aria-label="Fermer le banner". Uses DOM click to bypass position:fixed overlays.
 */
export async function dismissPWABanner(page: Page): Promise<void> {
  try {
    const clicked = await page.evaluate(() => {
      // Try aria-label close button
      const closeBtn = document.querySelector(
        '[role="banner"] button[aria-label="Fermer le banner"]'
      ) as HTMLButtonElement | null
      if (closeBtn) { closeBtn.click(); return true }
      // Also try any close/X button inside a role="banner" element
      const banner = document.querySelector('[role="banner"]')
      if (banner) {
        const xBtn = banner.querySelector('button') as HTMLButtonElement | null
        if (xBtn) { xBtn.click(); return true }
      }
      return false
    })
    if (clicked) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch {
    // Banner not present — ignore
  }
}

/**
 * Dismiss any system modal dialogs that use role="dialog":
 * - PWA install modal ("Restez informé en temps réel")
 * - Notification permission modal ("Activez les notifications")
 *
 * Both have a "Plus tard" button to dismiss and both interfere with
 * test dialog detection (approval modal, cancel dialog, etc.)
 */
export async function dismissSystemModals(page: Page): Promise<void> {
  try {
    // Keep dismissing until no more system modals are found.
    // Multiple modals can queue (PWA + notifications).
    for (let i = 0; i < 3; i++) {
      const dismissed = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
        for (const dialog of dialogs) {
          const text = dialog.textContent?.toLowerCase() || ''
          const isSystemModal =
            text.includes('notification') ||
            text.includes('installez') ||
            text.includes('restez informé') ||
            text.includes('activez les')
          if (isSystemModal) {
            const buttons = Array.from(dialog.querySelectorAll('button'))
            const dismiss = buttons.find(b => {
              const btnText = b.textContent?.trim().toLowerCase() || ''
              return btnText.includes('plus tard') || btnText.includes('fermer')
            })
            // Also try the X close button
            const closeBtn = dialog.querySelector('button[aria-label*="ermer"], button[aria-label*="lose"]')
            if (dismiss) { dismiss.click(); return true }
            if (closeBtn) { (closeBtn as HTMLElement).click(); return true }
          }
        }
        return false
      })
      if (!dismissed) break
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch {
    // Modal not present — ignore
  }
}

/**
 * Dismiss all overlays: cookie consent banner + PWA install banner + system modals.
 * Call AFTER each page navigation (overlays reappear on every goto).
 */
export async function dismissAllBanners(page: Page): Promise<void> {
  await dismissCookieBanner(page)
  await dismissPWABanner(page)
  await dismissSystemModals(page)
}
