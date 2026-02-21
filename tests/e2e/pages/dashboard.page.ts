/**
 * Page Object Model — Dashboard Page (/gestionnaire/dashboard)
 *
 * Encapsulates selectors and assertions for the SEIDO dashboard.
 * The dashboard is the first page loaded after gestionnaire login.
 *
 * SEIDO uses shadcn/ui Sidebar with data-sidebar="sidebar" attribute
 * and a topbar with h1 page title.
 */

import type { Page } from 'puppeteer'

/** CSS selectors for dashboard elements */
export const DASHBOARD_SELECTORS = {
  sidebar: '[data-sidebar="sidebar"], [data-slot="sidebar-wrapper"]',
  pageTitle: 'h1',
  navLinks: '[data-sidebar="sidebar"] a',
} as const

export class DashboardPage {
  constructor(private page: Page) {}

  /** Check if the sidebar is visible (present on all gestionnaire pages) */
  async hasSidebar(): Promise<boolean> {
    const sidebar = await this.page.$(DASHBOARD_SELECTORS.sidebar)
    return sidebar !== null
  }

  /** Check if a page title (h1) is visible in the topbar */
  async hasPageTitle(): Promise<boolean> {
    const title = await this.page.$(DASHBOARD_SELECTORS.pageTitle)
    return title !== null
  }

  /** Get the current page title text */
  async getPageTitle(): Promise<string> {
    return this.page.evaluate((sel) => {
      const h1 = document.querySelector(sel)
      return h1?.textContent?.trim() || ''
    }, DASHBOARD_SELECTORS.pageTitle)
  }

  /** Check that page body has substantial content (not blank) */
  async hasContent(minLength: number = 50): Promise<boolean> {
    const textLength = await this.page.evaluate(() => document.body.innerText.length)
    return textLength > minLength
  }

  /** Verify the dashboard page loaded correctly (sidebar + title + content) */
  async isLoaded(): Promise<boolean> {
    const [sidebar, title, content] = await Promise.all([
      this.hasSidebar(),
      this.hasPageTitle(),
      this.hasContent(),
    ])
    return sidebar && title && content
  }
}
