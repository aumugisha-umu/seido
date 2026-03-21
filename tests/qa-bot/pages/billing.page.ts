/**
 * BillingPage — Page Object Model for the gestionnaire billing/subscription page.
 * Route: /gestionnaire/settings/billing
 */

import { type Page, expect } from '@playwright/test'

export class BillingPage {
  constructor(private readonly page: Page) {}

  /** Navigate to the billing page. */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/settings/billing')
    await this.expectLoaded()
  }

  /** Verify the billing page has rendered with the subscription card. */
  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByText('Votre abonnement')
    ).toBeVisible({ timeout: 15_000 })
  }

  /** Read the current subscription status text (e.g., "Essai gratuit", "Pro", "Standard"). */
  async getSubscriptionStatus(): Promise<string> {
    const card = this.page.locator('div').filter({ hasText: 'Votre abonnement' }).first()
    await expect(card).toBeVisible()
    const text = await card.textContent() ?? ''

    if (text.includes('Essai gratuit')) return 'Essai gratuit'
    if (text.includes('Pro')) return 'Pro'
    if (text.includes('Standard')) return 'Standard'
    if (text.includes('Actif')) return 'Actif'
    if (text.includes('Gratuit')) return 'Gratuit'

    return text.slice(0, 50)
  }

  /** Verify the page is in read-only mode (read_only status banner visible). */
  async expectReadOnlyMode(): Promise<void> {
    await expect(
      this.page.getByText(/lecture seule|read.only/i)
    ).toBeVisible()
  }

  /** Verify a specific button is disabled. */
  async expectButtonDisabled(buttonName: string): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') })
    await expect(button).toBeDisabled()
  }
}

export default BillingPage
