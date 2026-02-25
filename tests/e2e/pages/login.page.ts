/**
 * Page Object Model — Login Page (/auth/login)
 *
 * Encapsulates selectors and actions for SEIDO's login page.
 *
 * SEIDO login flow:
 * 1. Form submits via React 19 useActionState (server action)
 * 2. Server action returns { success: true, data: { redirectTo } }
 * 3. Client-side useEffect fires window.location.href = redirectTo after 100ms
 * 4. We must use waitForFunction (not waitForNavigation) to detect the redirect
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'

/** CSS selectors for login page elements */
export const LOGIN_SELECTORS = {
  emailInput: '#email',
  passwordInput: '#password',
  submitButton: 'button[type="submit"]',
  errorAlert: '[role="alert"]',
  toastError: '[data-sonner-toast]',
} as const

export class LoginPage {
  constructor(private page: Page) {}

  /** Navigate to the login page */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await this.page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
    await this.page.waitForSelector(LOGIN_SELECTORS.emailInput, { timeout: 10_000 })
  }

  /** Check if the login form is visible */
  async isFormVisible(): Promise<boolean> {
    const email = await this.page.$(LOGIN_SELECTORS.emailInput)
    const password = await this.page.$(LOGIN_SELECTORS.passwordInput)
    return email !== null && password !== null
  }

  /** Fill the email field */
  async fillEmail(email: string): Promise<void> {
    const input = await this.page.$(LOGIN_SELECTORS.emailInput)
    if (!input) throw new Error('Email input (#email) not found')
    await input.click({ clickCount: 3 })
    await input.type(email, { delay: 20 })
  }

  /** Fill the password field */
  async fillPassword(password: string): Promise<void> {
    const input = await this.page.$(LOGIN_SELECTORS.passwordInput)
    if (!input) throw new Error('Password input (#password) not found')
    await input.click({ clickCount: 3 })
    await input.type(password, { delay: 20 })
  }

  /** Click the submit button */
  async submit(): Promise<void> {
    const button = await this.page.$(LOGIN_SELECTORS.submitButton)
    if (!button) throw new Error('Submit button not found')
    await button.click()
  }

  /**
   * Wait for the login redirect to complete.
   * Uses waitForFunction because SEIDO uses client-side window.location.href redirect.
   */
  async waitForRedirect(timeout: number = 30_000): Promise<void> {
    await this.page.waitForFunction(
      () => !window.location.href.includes('/auth/login'),
      { timeout, polling: 200 }
    )
    // Wait for the redirected page to fully load
    await this.page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 10_000 }
    )
    // Small extra wait for Next.js hydration
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /** Get error message if login failed */
  async getErrorMessage(): Promise<string> {
    const errorText = await this.page.evaluate((selectors) => {
      const alert = document.querySelector(selectors.errorAlert)
      if (alert) return alert.textContent?.trim() || ''
      const toast = document.querySelector(selectors.toastError)
      if (toast) return toast.textContent?.trim() || ''
      return ''
    }, LOGIN_SELECTORS)
    return errorText
  }

  /**
   * Full login flow: fill credentials → submit → wait for redirect
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()

    try {
      await this.waitForRedirect()
    } catch {
      const errorMsg = await this.getErrorMessage()
      if (errorMsg) {
        throw new Error(`Login failed with error: ${errorMsg}`)
      }
      throw new Error(`Login timed out — still on login page after 30s: ${this.page.url()}`)
    }
  }
}
