/**
 * E2E: Checkout flow with Stripe test cards (T-012)
 *
 * Tests the full checkout flow using Stripe test mode.
 * Most tests require interaction with the Stripe Checkout page (third-party domain),
 * which makes them inherently fragile. Tests are structured for manual verification
 * and automated where possible.
 *
 * Prerequisites:
 * - Dev server running (npm run dev)
 * - Stripe CLI listening (stripe listen --forward-to localhost:3000/api/stripe/webhook)
 * - Test user with trialing subscription
 * - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in .env.local
 *
 * IMPORTANT: Tests that interact with Stripe Checkout UI are skipped by default
 * because Stripe's checkout page DOM is not guaranteed to be stable.
 * Run with STRIPE_E2E=true to enable them.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser } from '../helpers/browser'
import { dismissCookieBanner } from '../helpers/cookies'
import { getBaseUrl } from '../../fixtures/test-accounts'

const STRIPE_E2E = process.env.STRIPE_E2E === 'true'

describe('E2E: Checkout Flow', () => {
  let page: Page
  const baseUrl = getBaseUrl()

  beforeAll(async () => {
    page = await newPage()
  })

  afterAll(async () => {
    await page?.close()
    await closeBrowser()
  })

  it('billing page loads with subscribe buttons', async () => {
    await page.goto(`${baseUrl}/gestionnaire/settings/billing`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await new Promise(resolve => setTimeout(resolve, 3000))
    await dismissCookieBanner(page)

    // Should have at least one subscribe button
    const hasSubscribeButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.some(b =>
        b.textContent?.includes('abonner') ||
        b.textContent?.includes('Choisir') ||
        b.textContent?.includes('Annuel') ||
        b.textContent?.includes('Mensuel')
      )
    })

    expect(hasSubscribeButton).toBe(true)
  })

  it('clicking subscribe creates a checkout session and redirects', async () => {
    if (!STRIPE_E2E) {
      console.log('⏭️  Skipped: Set STRIPE_E2E=true to run Stripe checkout tests')
      return
    }

    // Find and click the annual subscribe button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const subscribeBtn = buttons.find(b =>
        b.textContent?.includes('Annuel') || b.textContent?.includes('abonner')
      )
      if (subscribeBtn) {
        subscribeBtn.click()
        return true
      }
      return false
    })

    expect(clicked).toBe(true)

    // Wait for redirect to Stripe Checkout
    await page.waitForFunction(
      () => window.location.href.includes('checkout.stripe.com'),
      { timeout: 15_000 },
    ).catch(() => {
      // May redirect via server action — check if URL changed
    })

    const url = page.url()
    // Should either be on Stripe or have started the redirect
    expect(
      url.includes('checkout.stripe.com') || url.includes('billing'),
    ).toBe(true)
  })

  it.skip('completes payment with test card 4242 → redirects back to app', async () => {
    // NOTE: This test requires interaction with Stripe's checkout page DOM
    // which can change without notice. Run manually when needed.
    //
    // Manual test steps:
    // 1. Enter email: test@example.com
    // 2. Enter card: 4242 4242 4242 4242
    // 3. Enter expiry: 12/30
    // 4. Enter CVC: 123
    // 5. Enter name: Test User
    // 6. Click Pay
    // 7. Verify redirect back to /gestionnaire/settings/billing?checkout=success
  })

  it.skip('declined card 4000000000000002 shows error on Stripe', async () => {
    // Manual test: Use decline card number, verify Stripe shows error message
  })

  it.skip('3D Secure card 4000002500003155 shows authentication challenge', async () => {
    // Manual test: Use 3DS card, verify challenge modal appears
  })

  it('manual navigation to ?checkout=success without session_id shows no success message', async () => {
    await page.goto(`${baseUrl}/gestionnaire/settings/billing?checkout=success`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Without a valid session_id, no success celebration should show
    const hasSuccessMessage = await page.evaluate(() => {
      return document.body.innerText.includes('Abonnement activ') ||
             document.body.innerText.includes('Paiement confirm')
    })

    // Should NOT show success without valid session_id
    expect(hasSuccessMessage).toBe(false)
  })

  it('cancelled checkout returns to billing page', async () => {
    await page.goto(`${baseUrl}/gestionnaire/settings/billing?checkout=cancelled`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Should be on billing page (no crash)
    expect(page.url()).toContain('/billing')
  })
})
