/**
 * E2E: Read-only enforcement across roles (T-013)
 *
 * Tests that read-only mode properly restricts actions.
 * Requires: test user with subscription in read_only status.
 *
 * NOTE: These tests require a specific DB state (subscription status = 'read_only').
 * Before running, set the test team's subscription to read_only:
 *   UPDATE subscriptions SET status = 'read_only' WHERE team_id = '<test_team_id>';
 *
 * After running, restore:
 *   UPDATE subscriptions SET status = 'trialing' WHERE team_id = '<test_team_id>';
 *
 * Prerequisites:
 * - Dev server running (npm run dev)
 * - Test user's subscription set to read_only
 */

import { test, expect } from '@playwright/test'

const READ_ONLY_E2E = process.env.READ_ONLY_E2E === 'true'

test.describe('E2E: Read-Only Enforcement', () => {
  test('read-only banner is visible on dashboard', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/dashboard')
    await page.waitForTimeout(3000)

    const hasBanner = await page.evaluate(() => {
      const text = document.body.innerText
      return text.includes('lecture seule') ||
             text.includes('read-only') ||
             text.includes('Reactiver')
    })

    expect(hasBanner).toBe(true)
  })

  test('read-only banner is not dismissible', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/dashboard')
    await page.waitForTimeout(3000)

    // The ReadOnlyBanner should not have a close/dismiss button
    const hasDismissButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.some(b =>
        b.getAttribute('aria-label')?.includes('Fermer') ||
        b.getAttribute('aria-label')?.includes('close')
      )
    })

    // Read-only banner should NOT be dismissible (unlike trial banner)
    expect(hasDismissButton).toBe(false)
  })

  test('biens page has disabled creation buttons', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/biens')
    await page.waitForTimeout(2000)

    // Check for disabled/absent creation buttons
    const creationState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const createBtn = buttons.find(b =>
        b.textContent?.includes('Nouveau') ||
        b.textContent?.includes('Ajouter')
      )
      if (!createBtn) return 'absent'
      return createBtn.disabled ? 'disabled' : 'enabled'
    })

    // In read-only mode, creation buttons should be disabled or absent
    expect(['disabled', 'absent']).toContain(creationState)
  })

  test('interventions page has disabled creation buttons', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/interventions')
    await page.waitForTimeout(2000)

    const creationState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const createBtn = buttons.find(b =>
        b.textContent?.includes('Nouvelle') ||
        b.textContent?.includes('intervention')
      )
      if (!createBtn) return 'absent'
      return createBtn.disabled ? 'disabled' : 'enabled'
    })

    expect(['disabled', 'absent']).toContain(creationState)
  })

  test('read-only banner has reactivation CTA', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/dashboard')
    await page.waitForTimeout(2000)

    const hasReactivationCTA = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'))
      return buttons.some(el =>
        el.textContent?.includes('Reactiver') ||
        el.textContent?.includes('abonner') ||
        el.textContent?.includes('Souscrire')
      )
    })

    expect(hasReactivationCTA).toBe(true)
  })

  test('export functionality still works in read-only mode (RGPD)', async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    // Navigate to a page with export capability
    await page.goto('/gestionnaire/interventions')
    await page.waitForTimeout(2000)

    // Export/download buttons should NOT be disabled
    const hasExportCapability = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a'))
      const exportEl = elements.find(el =>
        el.textContent?.includes('Export') ||
        el.textContent?.includes('Telecharger') ||
        el.textContent?.includes('CSV')
      )
      if (!exportEl) return 'no-export-button'
      return (exportEl as HTMLButtonElement).disabled ? 'disabled' : 'enabled'
    })

    // Export should remain enabled even in read-only mode (RGPD compliance)
    if (hasExportCapability !== 'no-export-button') {
      expect(hasExportCapability).toBe('enabled')
    }
  })
})
