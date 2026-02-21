/**
 * Authentication helpers for E2E tests
 *
 * Primary mode: Cookies pre-loaded by globalSetup → no login needed.
 * Fallback mode: Full login via LoginPage POM (if cookies unavailable).
 *
 * Multi-role: Each role has its own dashboard URL:
 * - gestionnaire → /gestionnaire/dashboard
 * - locataire → /locataire/dashboard
 * - prestataire → /prestataire/dashboard
 *
 * IMPORTANT: SEIDO uses React 19 useActionState + client-side window.location.href
 * redirect (100ms delay). The LoginPage POM handles this with waitForFunction polling.
 */

import type { Page } from 'puppeteer'
import { TEST_ACCOUNTS, type TestAccount, getBaseUrl } from '../../fixtures/test-accounts'
import { LoginPage } from '../pages/login.page'

/** Dashboard URL for each role */
const DASHBOARD_URLS: Record<string, string> = {
  gestionnaire: '/gestionnaire/dashboard',
  locataire: '/locataire/dashboard',
  prestataire: '/prestataire/dashboard',
  admin: '/admin/dashboard',
}

/**
 * Get the dashboard URL for a role.
 */
export function getDashboardUrl(role: string): string {
  return DASHBOARD_URLS[role] || `/gestionnaire/dashboard`
}

/**
 * Ensure the page is authenticated.
 *
 * With globalSetup, cookies are already loaded by newPage/newPageAs().
 * This function verifies auth by navigating to the role's dashboard.
 * Falls back to full login if cookies are expired/missing.
 *
 * @param page - Puppeteer page (cookies already loaded by newPage/newPageAs)
 * @param role - Role key from TEST_ACCOUNTS (e.g. 'gestionnaire')
 * @returns The account that was used
 */
export async function login(page: Page, role: string = 'gestionnaire'): Promise<TestAccount> {
  const account = TEST_ACCOUNTS[role]
  if (!account) throw new Error(`No test account for role: ${role}`)

  const baseUrl = getBaseUrl()
  const dashboardPath = getDashboardUrl(role)

  // Navigate to role-specific dashboard — cookies should authenticate automatically
  await page.goto(`${baseUrl}${dashboardPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

  // Wait briefly for any redirect
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Check if we ended up on the login page (cookies expired/missing)
  const url = page.url()
  if (url.includes('/auth/login')) {
    console.warn(`[Auth] Cookies expired for ${role} — performing full login`)
    const loginPage = new LoginPage(page)
    await loginPage.loginAs(account.email, account.password)
  }

  return account
}

/**
 * Check if the page is authenticated (not on login/auth pages)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/auth/') && !url.includes('/login')
}

/**
 * Navigate to a page, logging in first if needed
 */
export async function navigateAuthenticated(
  page: Page,
  path: string,
  role: string = 'gestionnaire'
): Promise<void> {
  const baseUrl = getBaseUrl()
  const targetUrl = `${baseUrl}${path}`

  // Try navigating directly first (cookies should authenticate)
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Wait briefly for redirect check
  await new Promise(resolve => setTimeout(resolve, 1000))

  // If redirected to login, authenticate and retry
  if (page.url().includes('/auth/login')) {
    await login(page, role)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  }
}
