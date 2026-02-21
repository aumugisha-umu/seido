/**
 * Common page selectors and interaction helpers for E2E tests
 *
 * Provides reusable functions for interacting with SEIDO UI components:
 * - Step wizard navigation
 * - Form interactions
 * - Toast message assertions
 * - Document upload helpers
 */

import type { Page } from 'puppeteer'

// ─── Navigation ─────────────────────────────────────────

/**
 * Get the current step number from the StepProgressHeader
 */
export async function getCurrentStep(page: Page): Promise<number> {
  return page.evaluate(() => {
    const activeStep = document.querySelector('[data-step-active="true"], .bg-primary')
    if (!activeStep) return -1
    const stepEl = activeStep.closest('[data-step]')
    return stepEl ? parseInt(stepEl.getAttribute('data-step') || '-1') : -1
  })
}

/**
 * Click the "Next" / "Continue" button to advance the wizard
 */
export async function clickNextStep(page: Page): Promise<void> {
  // The next button is typically the last primary button in the footer
  const button = await page.$(
    'button.bg-primary:not([disabled]), ' +
    'button:has-text("Continuer"):not([disabled]), ' +
    'button:has-text("Suivant"):not([disabled])'
  )
  if (button) {
    await button.click()
    await page.waitForTimeout(500) // Wait for animation
  } else {
    // Fallback: find the rightmost non-disabled button in the footer
    await page.evaluate(() => {
      const footer = document.querySelector('.sticky.bottom-0')
      if (!footer) return
      const buttons = footer.querySelectorAll('button:not([disabled])')
      const last = buttons[buttons.length - 1]
      if (last) (last as HTMLButtonElement).click()
    })
    await page.waitForTimeout(500)
  }
}

/**
 * Click the "Previous" / "Back" button
 */
export async function clickPreviousStep(page: Page): Promise<void> {
  const button = await page.$(
    'button:has-text("Retour"):not([disabled]), ' +
    'button:has-text("Précédente"):not([disabled])'
  )
  if (button) {
    await button.click()
    await page.waitForTimeout(500)
  }
}

// ─── Forms ──────────────────────────────────────────────

/**
 * Fill an input field by label text or placeholder
 */
export async function fillInput(page: Page, labelOrPlaceholder: string, value: string): Promise<void> {
  // Try by label first
  const inputByLabel = await page.evaluateHandle((label) => {
    const labels = Array.from(document.querySelectorAll('label'))
    const matchingLabel = labels.find(l =>
      l.textContent?.trim().toLowerCase().includes(label.toLowerCase())
    )
    if (matchingLabel) {
      const forId = matchingLabel.getAttribute('for')
      if (forId) return document.getElementById(forId)
      return matchingLabel.querySelector('input, textarea')
    }
    // Try placeholder
    return document.querySelector(`input[placeholder*="${label}" i], textarea[placeholder*="${label}" i]`)
  }, labelOrPlaceholder)

  const input = inputByLabel.asElement()
  if (input) {
    await input.click({ clickCount: 3 })
    await input.type(value, { delay: 20 })
  } else {
    throw new Error(`Input not found for label/placeholder: "${labelOrPlaceholder}"`)
  }
}

/**
 * Select an option from a select/dropdown by visible text
 */
export async function selectOption(page: Page, labelOrName: string, optionText: string): Promise<void> {
  // Click the trigger to open dropdown
  const trigger = await page.evaluateHandle((label) => {
    const labels = Array.from(document.querySelectorAll('label'))
    const matchingLabel = labels.find(l =>
      l.textContent?.trim().toLowerCase().includes(label.toLowerCase())
    )
    if (matchingLabel) {
      const forId = matchingLabel.getAttribute('for')
      if (forId) return document.getElementById(forId)
      return matchingLabel.nextElementSibling
    }
    return null
  }, labelOrName)

  const el = trigger.asElement()
  if (el) await el.click()

  // Wait for dropdown and click option
  await page.waitForTimeout(300)
  await page.evaluate((text) => {
    const options = document.querySelectorAll('[role="option"], [data-value]')
    for (const opt of options) {
      if (opt.textContent?.trim().toLowerCase().includes(text.toLowerCase())) {
        ;(opt as HTMLElement).click()
        return
      }
    }
  }, optionText)
}

// ─── Assertions ─────────────────────────────────────────

/**
 * Wait for and get toast notification text
 */
export async function waitForToast(page: Page, timeout: number = 5000): Promise<string> {
  const toastSelector = '[data-sonner-toast], [role="status"]'
  await page.waitForSelector(toastSelector, { timeout })
  return page.evaluate((sel) => {
    const toast = document.querySelector(sel)
    return toast?.textContent?.trim() || ''
  }, toastSelector)
}

/**
 * Assert that text content exists on the page
 */
export async function expectTextOnPage(page: Page, text: string): Promise<boolean> {
  return page.evaluate((t) => {
    return document.body.innerText.includes(t)
  }, text)
}

/**
 * Wait for page URL to contain a specific path segment
 */
export async function waitForUrlContaining(page: Page, pathSegment: string, timeout: number = 10_000): Promise<void> {
  await page.waitForFunction(
    (seg: string) => window.location.href.includes(seg),
    { timeout },
    pathSegment
  )
}

// ─── Content Waiting ────────────────────────────────────

/**
 * Wait for page content to include at least one of the given text markers.
 *
 * This is the preferred wait strategy for SEIDO's streaming Server Components,
 * which render skeletons first and then stream actual content. Using text markers
 * is more reliable than `networkidle` or DOM readiness checks.
 *
 * @param page - Puppeteer page instance
 * @param markers - Array of text strings to look for (case-insensitive)
 * @param timeout - Maximum wait time in ms (default 30s for cold dev mode)
 * @param polling - Poll interval in ms (default 1s)
 */
export async function waitForContent(
  page: Page,
  markers: string[],
  timeout: number = 30_000,
  polling: number = 1_000,
): Promise<void> {
  await page.waitForFunction(
    (ms: string[]) => {
      const text = document.body.innerText.toLowerCase()
      return ms.some(m => text.includes(m.toLowerCase()))
    },
    { timeout, polling },
    markers
  )
}

// ─── Document Upload ────────────────────────────────────

/**
 * Upload a file to a document slot by slot label
 */
export async function uploadFileToSlot(page: Page, slotLabel: string, filePath: string): Promise<void> {
  // Find the file input near the slot label
  const fileInput = await page.evaluateHandle((label) => {
    const slots = document.querySelectorAll('[class*="document-slot"], .border.rounded-lg')
    for (const slot of slots) {
      if (slot.textContent?.includes(label)) {
        return slot.querySelector('input[type="file"]')
      }
    }
    return null
  }, slotLabel)

  const input = fileInput.asElement()
  if (input) {
    await (input as any).uploadFile(filePath)
    await page.waitForTimeout(500)
  } else {
    throw new Error(`File input not found for document slot: "${slotLabel}"`)
  }
}
