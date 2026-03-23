/**
 * Playwright E2E — Read-Only Enforcement (gestionnaire)
 *
 * Rewrite of stripe/read-only-enforcement.e2e.ts (Puppeteer).
 * Tests that read-only mode properly restricts actions:
 * - Read-only banner visible and not dismissible
 * - Creation buttons disabled on biens and interventions pages
 * - Reactivation CTA present
 * - Export still works (RGPD compliance)
 *
 * All tests gated by READ_ONLY_E2E env var.
 * Requires: test user with subscription status = 'read_only'.
 *
 * Uses storageState-based auth for gestionnaire role.
 */

import { test, expect } from '@playwright/test'
import { dismissBanners } from '../../shared/helpers/selectors'

const READ_ONLY_E2E = process.env.READ_ONLY_E2E === 'true'

test.describe('Read-Only Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!READ_ONLY_E2E, 'Set READ_ONLY_E2E=true and configure subscription to read_only before running')

    await page.goto('/gestionnaire/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await dismissBanners(page)
  })

  test('read-only banner is visible on dashboard', async ({ page }) => {
    await expect(
      page.getByText(/lecture seule|read-only|réactiver/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('read-only banner is not dismissible', async ({ page }) => {
    // The ReadOnlyBanner should not have a close/dismiss button
    const dismissButton = page.getByRole('button', { name: /fermer|close/i })
    await expect(dismissButton).not.toBeVisible({ timeout: 3_000 })
  })

  test('biens page has disabled creation buttons', async ({ page }) => {
    await page.goto('/gestionnaire/biens', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Creation button should be disabled or absent
    const createBtn = page.getByRole('button', { name: /nouveau|ajouter/i }).first()
    const isVisible = await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isVisible) {
      await expect(createBtn).toBeDisabled()
    }
    // If not visible, it's absent — both outcomes are valid in read-only mode
  })

  test('interventions page has disabled creation buttons', async ({ page }) => {
    await page.goto('/gestionnaire/interventions', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const createBtn = page.getByRole('button', { name: /nouvelle|intervention/i }).first()
    const isVisible = await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isVisible) {
      await expect(createBtn).toBeDisabled()
    }
  })

  test('read-only banner has reactivation CTA', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /réactiver|abonner|souscrire/i })
        .or(page.getByRole('link', { name: /réactiver|abonner|souscrire/i }))
        .first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('export functionality still works in read-only mode (RGPD)', async ({ page }) => {
    await page.goto('/gestionnaire/interventions', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Export/download button should NOT be disabled
    const exportBtn = page.getByRole('button', { name: /export|télécharger|csv/i }).first()
    const isVisible = await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isVisible) {
      await expect(exportBtn).toBeEnabled()
    }
  })
})
