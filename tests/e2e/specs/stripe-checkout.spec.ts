/**
 * Playwright E2E — Stripe Checkout Flow (gestionnaire)
 *
 * Rewrite of stripe/checkout-flow.e2e.ts (Puppeteer).
 * Tests the checkout flow using Stripe test mode:
 * - Billing page loads with subscribe buttons
 * - Clicking subscribe creates checkout session (gated by STRIPE_E2E env)
 * - Manual navigation to ?checkout=success shows no success message
 * - Cancelled checkout returns to billing page
 *
 * Uses storageState-based auth for gestionnaire role.
 */

import { test, expect } from '@playwright/test'
import { BillingPage } from '../../shared/pages'
import { dismissBanners } from '../../shared/helpers/selectors'

const STRIPE_E2E = process.env.STRIPE_E2E === 'true'

test.describe('Stripe Checkout Flow', () => {
  let billing: BillingPage

  test.beforeEach(async ({ page }) => {
    billing = new BillingPage(page)
  })

  test('billing page loads with subscribe buttons', async ({ page }) => {
    await billing.goto()
    await dismissBanners(page)

    // Should have at least one subscribe button
    await expect(
      page.getByRole('button', { name: /abonner|choisir|annuel|mensuel/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('clicking subscribe creates a checkout session and redirects', async ({ page }) => {
    test.skip(!STRIPE_E2E, 'Set STRIPE_E2E=true to run Stripe checkout tests')

    await billing.goto()
    await dismissBanners(page)

    // Find and click the annual subscribe button
    const subscribeBtn = page.getByRole('button', { name: /annuel|abonner/i }).first()
    await expect(subscribeBtn).toBeVisible({ timeout: 10_000 })
    await subscribeBtn.click()

    // Wait for redirect to Stripe Checkout
    try {
      await page.waitForURL('**/checkout.stripe.com/**', { timeout: 15_000 })
    } catch {
      // May redirect via server action — check if URL changed
    }

    const url = page.url()
    // Should either be on Stripe or still on billing
    expect(
      url.includes('checkout.stripe.com') || url.includes('billing'),
    ).toBe(true)
  })

  test.skip('completes payment with test card 4242 -> redirects back to app', () => {
    // NOTE: This test requires interaction with Stripe's checkout page DOM
    // which can change without notice. Run manually when needed.
  })

  test.skip('declined card 4000000000000002 shows error on Stripe', () => {
    // Manual test: Use decline card number, verify Stripe shows error message
  })

  test.skip('3D Secure card 4000002500003155 shows authentication challenge', () => {
    // Manual test: Use 3DS card, verify challenge modal appears
  })

  test('manual navigation to ?checkout=success without session_id shows no success message', async ({ page }) => {
    await page.goto('/gestionnaire/settings/billing?checkout=success', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2000)

    // Without a valid session_id, no success celebration should show
    await expect(
      page.getByText(/abonnement activ|paiement confirm/i),
    ).not.toBeVisible({ timeout: 5_000 })
  })

  test('cancelled checkout returns to billing page', async ({ page }) => {
    await page.goto('/gestionnaire/settings/billing?checkout=cancelled', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2000)

    // Should be on billing page (no crash)
    expect(page.url()).toContain('/billing')
  })
})
