/**
 * ReminderWizardPage — Page Object Model for the 3-step reminder creation wizard.
 * Route: /gestionnaire/operations/nouveau-rappel
 */

import { type Page, expect } from '@playwright/test'
import { dismissBanners } from '../helpers/selectors'

type Priority = 'basse' | 'normale' | 'haute'
type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface ReminderDetails {
  title: string
  description?: string
  dueDate?: string
  priority?: Priority
  assignedTo?: string
}

interface RecurrenceOptions {
  frequency: Frequency
  interval?: number
  days?: string[]
  endAfter?: number
}

const FREQUENCY_MAP: Record<Frequency, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  yearly: 'Annuel',
}

export class ReminderWizardPage {
  constructor(private readonly page: Page) {}

  /** Navigate to the new reminder wizard. */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/operations/nouveau-rappel')
    await expect(this.page.getByText('Nouveau rappel')).toBeVisible()
  }

  /** Step 1: Toggle property linking on or off. */
  async togglePropertyLinking(enable: boolean): Promise<void> {
    const toggle = this.page.getByLabel('Lier à un bien')
    const isChecked = await toggle.isChecked()
    if (isChecked !== enable) {
      await toggle.click()
    }
  }

  /** Step 1: Select a lot by name in the PropertySelector. */
  async selectProperty(lotName: string): Promise<void> {
    await this.togglePropertyLinking(true)
    // Wait for property selector to render, then click on the lot
    const lotCard = this.page.getByText(lotName, { exact: false }).first()
    await expect(lotCard).toBeVisible()
    await lotCard.click()
  }

  /** Step 1: Select the first available property/lot in the PropertySelector. */
  async selectFirstAvailableProperty(): Promise<void> {
    await this.togglePropertyLinking(true)
    // Wait for any selectable lot to appear, then click the first one
    const lotSelectBtn = this.page.getByTestId(/^lot-select-btn-/).first()
    if (await lotSelectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await lotSelectBtn.click()
    } else {
      // Fallback: click first clickable card-like element in the property selector
      const anyLotCard = this.page.locator('[data-testid*="lot"], [data-testid*="property"]').first()
      await expect(anyLotCard).toBeVisible({ timeout: 5_000 })
      await anyLotCard.click()
    }
  }

  /** Step 2: Fill in reminder details. */
  async fillDetails({ title, description, dueDate, priority, assignedTo }: ReminderDetails): Promise<void> {
    // Title (required)
    await this.page.getByLabel('Titre').fill(title)

    // Description (optional)
    if (description) {
      await this.page.getByLabel('Description').fill(description)
    }

    // Due date (optional) — DatePicker uses a button trigger
    if (dueDate) {
      const dateInput = this.page.getByPlaceholder('jj/mm/aaaa')
      await dateInput.fill(dueDate)
    }

    // Priority (optional) — toggle buttons with aria-label
    if (priority) {
      const priorityButton = this.page.getByRole('button', {
        name: new RegExp(`Priorité ${this.priorityLabel(priority)}`, 'i'),
      })
      await priorityButton.click()
    }

    // Assigned to (optional) — Radix Select
    if (assignedTo) {
      await this.page.getByLabel('Assigner le rappel').click()
      await this.page.getByRole('option', { name: assignedTo }).click()
    }
  }

  /** Step 2: Enable and configure recurrence. */
  async enableRecurrence({ frequency, interval, days, endAfter }: RecurrenceOptions): Promise<void> {
    // Toggle recurrence on (Switch inside RecurrenceConfig)
    const recurrenceToggle = this.page.getByLabel(/récurrence|recurrence/i)
    const isChecked = await recurrenceToggle.isChecked()
    if (!isChecked) {
      await recurrenceToggle.click()
    }

    // Select frequency
    const frequencyLabel = FREQUENCY_MAP[frequency]
    const frequencySelect = this.page.getByLabel(/fréquence|frequence/i)
    await frequencySelect.click()
    await this.page.getByRole('option', { name: frequencyLabel }).click()

    // Interval (optional)
    if (interval && interval > 1) {
      const intervalInput = this.page.getByLabel(/intervalle/i)
      await intervalInput.fill(String(interval))
    }

    // Weekdays (for weekly frequency) — toggle buttons with aria-pressed
    if (days && days.length > 0) {
      for (const day of days) {
        const dayButton = this.page.getByRole('button', { name: new RegExp(day, 'i') }).first()
        await expect(dayButton).toBeVisible()
        // Click with retry — evaluate click may not register if React re-renders between clicks
        for (let attempt = 0; attempt < 3; attempt++) {
          await dayButton.evaluate((el) => (el as HTMLButtonElement).click())
          await this.page.waitForTimeout(500)
          const pressed = await dayButton.getAttribute('aria-pressed')
          if (pressed === 'true') break
        }
      }
    }

    // End after N occurrences
    if (endAfter) {
      const endAfterRadio = this.page.getByLabel(/apr[eè]s/i)
      await endAfterRadio.click()
      const countInput = this.page.getByLabel(/occurrences/i)
      await countInput.fill(String(endAfter))
    }
  }

  /** Step 3: Verify the confirmation page renders with expected content. */
  async verifyConfirmation(): Promise<void> {
    await expect(this.page.getByText(/d[ée]tails du rappel/i)).toBeVisible()
  }

  /** Click the submit button on the final step. */
  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Créer le rappel' }).click()
  }

  /** Click "Continuer" to advance to the next step. */
  async clickNext(): Promise<void> {
    // Dismiss any late-appearing banners (cookie, PWA, notification) before clicking
    await dismissBanners(this.page)

    const nextButton = this.page.getByRole('button', { name: /continuer/i })
    await expect(nextButton).toBeEnabled()
    await nextButton.click({ force: true })
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private priorityLabel(p: Priority): string {
    const labels: Record<Priority, string> = {
      basse: 'Basse',
      normale: 'Normale',
      haute: 'Haute',
    }
    return labels[p]
  }
}
