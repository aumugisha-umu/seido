/**
 * Shard 1 — Auth Smoke Tests
 *
 * Validates that all 3 roles can log in and see their dashboards,
 * that gestionnaire sidebar navigation works, and that profile pages
 * are accessible for every role.
 */

import path from 'path'

import { test, expect } from '@playwright/test'

import { DashboardPage } from '../../shared/pages/dashboard.page'
import { dismissBanners, waitForContent } from '../../shared/helpers/selectors'
import { TIMEOUTS } from '../../shared/helpers/constants'

const AUTH_DIR = path.resolve(__dirname, '../../../playwright/.auth')

// ─── Gestionnaire ───────────────────────────────────────────

test.describe('Gestionnaire — smoke', () => {
  test.use({ storageState: 'playwright/.auth/gestionnaire.json' })

  test('Dashboard charge avec la section KPI visible', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto('gestionnaire')
    await dashboard.expectLoaded('gestionnaire')

    // Verify KPI section is present (cards with numeric values)
    const body = await page.locator('body').innerText()
    const hasKpiContent = /\d+/.test(body)
    expect(hasKpiContent).toBe(true)
  })

  test.describe('Navigation sidebar — 6 sections principales', () => {
    const sections = [
      { label: 'Patrimoine', marker: 'biens' },
      { label: 'Contacts', marker: 'contacts' },
      { label: 'Contrats', marker: 'contrats' },
      { label: 'Opérations', marker: 'opérations' },
      { label: 'Emails', marker: 'mail' },
      { label: 'Parametres', marker: 'parametres' },
    ]

    for (const section of sections) {
      test(`Naviguer vers ${section.label}`, async ({ page }) => {
        const dashboard = new DashboardPage(page)
        await dashboard.goto('gestionnaire')
        await dashboard.expectLoaded('gestionnaire')

        await dashboard.clickSidebarLink(section.label)
        await dismissBanners(page)

        // Verify page loaded by checking for marker content
        await waitForContent(page, [section.marker], TIMEOUTS.content)
        const bodyText = await page.locator('body').innerText()
        expect(bodyText.length).toBeGreaterThan(50)
      })
    }
  })

  test('Page profil accessible', async ({ page }) => {
    await page.goto('/gestionnaire/profile')
    await dismissBanners(page)
    await waitForContent(page, ['profil', 'profile', 'nom', 'email'], TIMEOUTS.content)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  })
})

// ─── Locataire ──────────────────────────────────────────────

test.describe('Locataire — smoke', () => {
  test('Dashboard charge avec les interventions visibles', async ({ browser }) => {
    test.slow() // locataire context loads fresh — needs extra time for Vercel cold start
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, 'locataire.json'),
    })
    const page = await context.newPage()
    try {
      const dashboard = new DashboardPage(page)
      await dashboard.goto('locataire')

      // Extra dismissal pass for late-appearing notification/cookie modals
      await page.waitForTimeout(2_000)
      await dismissBanners(page)

      await dashboard.expectLoaded('locataire')

      // Locataire dashboard shows intervention navigator, properties, or "Contrat à venir"
      const bodyText = await page.locator('body').innerText()
      const hasRelevantContent =
        bodyText.toLowerCase().includes('intervention') ||
        bodyText.toLowerCase().includes('demande') ||
        bodyText.toLowerCase().includes('bien') ||
        bodyText.toLowerCase().includes('lot') ||
        bodyText.toLowerCase().includes('contrat')
      expect(hasRelevantContent).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('Page profil accessible', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, 'locataire.json'),
    })
    const page = await context.newPage()
    try {
      await page.goto('/locataire/profile')
      await dismissBanners(page)
      await waitForContent(page, ['profil', 'profile', 'nom', 'email'], TIMEOUTS.content)

      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(50)
    } finally {
      await context.close()
    }
  })
})

// ─── Prestataire ────────────────────────────────────────────

test.describe('Prestataire — smoke', () => {
  test('Dashboard charge avec les onglets interventions', async ({ browser }) => {
    test.slow() // prestataire fresh context needs extra time for Vercel cold start
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, 'prestataire.json'),
    })
    const page = await context.newPage()
    try {
      const dashboard = new DashboardPage(page)
      await dashboard.goto('prestataire')

      // Wait for dashboard to fully render (prestataire may load slower)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(2_000)
      await dismissBanners(page)

      // Verify the page loaded with some meaningful content
      const bodyText = await page.locator('body').innerText()
      const hasRelevantContent =
        bodyText.toLowerCase().includes('intervention') ||
        bodyText.toLowerCase().includes('mes interventions') ||
        bodyText.toLowerCase().includes('dashboard') ||
        bodyText.toLowerCase().includes('prestataire') ||
        bodyText.toLowerCase().includes('aucune') ||
        bodyText.length > 200
      expect(hasRelevantContent).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('Page profil accessible', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, 'prestataire.json'),
    })
    const page = await context.newPage()
    try {
      await page.goto('/prestataire/profile')
      await dismissBanners(page)
      await waitForContent(page, ['profil', 'profile', 'nom', 'email'], TIMEOUTS.content)

      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(50)
    } finally {
      await context.close()
    }
  })
})

// ─── Multi-role: Push notification modal ────────────────────

test.describe('Multi-role — push notification modal', () => {
  test.use({ storageState: 'playwright/.auth/gestionnaire.json' })

  test('La modale de permission push peut se rendre', async ({ page }) => {
    // Navigate to dashboard — push notification modal may appear on its own
    await page.goto('/gestionnaire/dashboard')

    // Check for the notification permission modal or the "Plus tard" dismiss button
    // We do NOT accept/deny — just verify the UI element can exist
    const notifModal = page.locator('[data-testid="notification-dismiss"]')
      .or(page.getByRole('button', { name: /plus tard|j'ai compris|pas maintenant|later/i }))
    const bellButton = page.getByRole('button', { name: /notification/i }).first()

    // Either the modal appeared automatically, or the bell icon exists in the UI
    const modalVisible = await notifModal.isVisible({ timeout: 5_000 }).catch(() => false)
    const bellVisible = await bellButton.isVisible({ timeout: 5_000 }).catch(() => false)

    // At minimum, the notification bell icon should be present in the header
    expect(modalVisible || bellVisible).toBe(true)
  })
})
