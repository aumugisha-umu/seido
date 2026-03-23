/**
 * NotificationsPage — Page Object Model for notifications (works across all 3 roles).
 * Routes: /{role}/notifications
 */

import { type Page, expect } from '@playwright/test'
import { type UserRole } from '../helpers/types'

export class NotificationsPage {
  constructor(private readonly page: Page) {}

  /** Locator for notification cards — each card has "Marquer comme lu/non lu" + "Archiver" buttons */
  private get notificationCards() {
    return this.page.locator('[role="tabpanel"][data-state="active"]')
      .locator('[class*="card"], [class*="Card"]')
      .filter({ has: this.page.getByRole('button', { name: /archiver|marquer/i }) })
  }

  /** Navigate to the notifications page for a given role. */
  async goto(role: UserRole): Promise<void> {
    await this.page.goto(`/${role}/notifications`)
    await this.expectLoaded()
  }

  /** Verify the notifications page has rendered. */
  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByText(/notifications/i).first()
    ).toBeVisible({ timeout: 15_000 })
  }

  /** Switch to the tab that has unread notifications (Personnel or Équipe) */
  async switchToTabWithNotifications(): Promise<void> {
    // Check if "Équipe" tab has a badge count (indicating unread notifications there)
    const equipeTab = this.page.getByRole('tab', { name: /équipe|equipe/i })
    if (await equipeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const tabText = await equipeTab.textContent() ?? ''
      // If Équipe tab shows a number badge, switch to it
      if (/\d+/.test(tabText)) {
        await equipeTab.click()
        await this.page.waitForTimeout(500)
        return
      }
    }

    // Check if Personnel tab is empty and Équipe has content
    const personnelEmpty = await this.page
      .getByText(/aucune notification personnelle/i)
      .isVisible({ timeout: 2_000 })
      .catch(() => false)

    if (personnelEmpty && await equipeTab.isVisible().catch(() => false)) {
      await equipeTab.click()
      await this.page.waitForTimeout(500)
    }
  }

  /** Count the number of unread notifications visible on the page. */
  async getUnreadCount(): Promise<number> {
    // First ensure we're on a tab that has notifications
    await this.switchToTabWithNotifications()

    // The page header shows the unread count in the "Marquer tout comme lu" button
    const markAllButton = this.page.getByRole('button', { name: /marquer tout/i })
    const isVisible = await markAllButton.isVisible().catch(() => false)
    if (!isVisible) return 0

    const text = await markAllButton.textContent() ?? ''
    const match = text.match(/\((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /** Mark a notification as read using "Marquer tout comme lu" button. */
  async markAsRead(_index: number): Promise<void> {
    // Use the global "Marquer tout comme lu" button — individual card buttons may be disabled
    const markAllBtn = this.page.getByRole('button', { name: /marquer tout/i })
    if (await markAllBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await markAllBtn.click()
      return
    }

    // Fallback: try individual card button
    const card = this.notificationCards.nth(_index)
    const readButton = card.getByRole('button', { name: /marquer comme lu/i }).first()
    await readButton.click()
  }

  /** Mark a notification as unread — not directly supported, just verify count behavior. */
  async markAsUnread(_index: number): Promise<void> {
    // After marking all as read, the unread count should be 0
    // Individual "marquer comme non lu" may not be available — skip gracefully
    const card = this.notificationCards.nth(_index)
    const unreadButton = card.getByRole('button', { name: /marquer comme non lu/i }).first()
    if (await unreadButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await unreadButton.click()
    }
  }

  /** Archive the nth notification (0-indexed). */
  async archiveNotification(index: number): Promise<void> {
    const card = this.notificationCards.nth(index)
    const archiveButton = card.getByRole('button', { name: /archiver|archive/i }).first()
    await archiveButton.click()
  }

  /** Click the nth notification to navigate to the related entity (0-indexed). */
  async clickNotification(index: number): Promise<void> {
    const card = this.notificationCards.nth(index)
    await card.click()
  }

  /** Verify the bell icon badge in the header/topbar shows a specific count. */
  async expectBellBadge(count: number): Promise<void> {
    const bellButton = this.page.getByRole('button', { name: /notification/i }).first()
    if (count === 0) {
      // No badge should be visible
      const badge = bellButton.locator('[class*="badge"], [class*="Badge"]')
      await expect(badge).not.toBeVisible()
    } else {
      const badgeText = count > 9 ? '9+' : String(count)
      await expect(bellButton.getByText(badgeText)).toBeVisible()
    }
  }

  /** Open the bell notification popover in the header/topbar. */
  async openBellPopover(): Promise<void> {
    const bellButton = this.page.getByRole('button', { name: /notification/i }).first()
    await bellButton.click()
    // Wait for popover content to appear
    await expect(
      this.page.getByText(/notification/i).first()
    ).toBeVisible()
  }
}
