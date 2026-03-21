/**
 * Page Object Model — Dashboard Page (all 3 roles)
 *
 * Paths:
 * - /gestionnaire/dashboard
 * - /locataire/dashboard
 * - /prestataire/dashboard
 *
 * The gestionnaire dashboard has a sidebar, KPI cards, and unread messages section.
 * Locataire/prestataire dashboards have simpler layouts with intervention lists.
 */

import { type Page, expect } from '@playwright/test'
import { type UserRole } from '../helpers/routes'
import { dismissBanners, waitForContent } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

/** Role-specific content markers for verifying dashboard load */
const DASHBOARD_MARKERS: Record<UserRole, string[]> = {
  gestionnaire: ['dashboard', 'patrimoine', 'interventions', 'opérations'],
  locataire: ['intervention', 'lot', 'bail', 'logement', 'loyer', 'contrat', 'anderlecht', 'venir'],
  prestataire: ['intervention', 'dashboard', 'mission', 'en cours', 'terminées', 'toutes'],
}

export class DashboardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the dashboard for a given role */
  async goto(role: UserRole): Promise<void> {
    await this.page.goto(`/${role}/dashboard`)
    await dismissBanners(this.page)
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Verify that the dashboard has loaded with role-specific content */
  async expectLoaded(role: UserRole): Promise<void> {
    // Dismiss late-appearing banners that may block content detection
    await dismissBanners(this.page)
    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await dismissBanners(this.page)

    const markers = DASHBOARD_MARKERS[role]
    await waitForContent(this.page, markers, TIMEOUTS.content)

    // Verify the page has substantial content (not blank/error)
    const bodyText = await this.page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  }

  // ─── KPI Cards (gestionnaire) ───────────────────────────

  /**
   * Read a KPI card value by its label text.
   * KPI cards display a label and a numeric value.
   *
   * @param label - The KPI label (e.g., "Interventions actives", "Biens")
   * @returns The displayed value as string, or null if not found
   */
  async getKpiValue(label: string): Promise<string | null> {
    // Target KPI/stat card containers, then filter by label text
    const kpiCard = this.page.locator('[data-testid*="kpi"], [class*="stat"], [class*="kpi"]')
      .filter({ hasText: label })
      .first()

    if (!(await kpiCard.isVisible({ timeout: TIMEOUTS.action }).catch(() => false))) {
      return null
    }

    const value = await kpiCard.locator('text=/\\d+/').first().innerText()
    return value
  }

  // ─── Sidebar Navigation (gestionnaire) ──────────────────

  /**
   * Click a sidebar navigation link by its label.
   * Sidebar labels: "Dashboard", "Patrimoine", "Contacts", "Contrats", "Operations", "Emails"
   */
  async clickSidebarLink(label: string): Promise<void> {
    // Try sidebar container first, fall back to page-level link
    // (some links like "Paramètres" render outside the main sidebar container)
    const sidebar = this.page.locator('[data-sidebar="sidebar"], [data-slot="sidebar-wrapper"]')
    const sidebarLink = sidebar.getByRole('link', { name: label })
    const isSidebarLink = await sidebarLink.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isSidebarLink) {
      await sidebarLink.click()
      return
    }

    const pageLink = this.page.getByRole('link', { name: label })
    await expect(pageLink).toBeVisible({ timeout: TIMEOUTS.action })
    await pageLink.click()
  }

  // ─── Unread Messages ────────────────────────────────────

  /** Verify that an unread messages section exists on the dashboard */
  async expectUnreadMessages(): Promise<void> {
    // Look for "messages" or "non lus" text on the page
    const messagesSection = this.page.getByText(/messages?\s*(non lus?|unread)/i).first()
    await expect(messagesSection).toBeVisible({ timeout: TIMEOUTS.content })
  }
}

export default DashboardPage
