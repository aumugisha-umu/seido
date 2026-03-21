/**
 * MailHubPage — Page Object Model for the gestionnaire email management hub.
 * Route: /gestionnaire/mail
 */

import { type Page, expect } from '@playwright/test'

type MailFolder = 'inbox' | 'sent' | 'drafts' | 'archive'
type DatePeriod = 'today' | 'week' | 'month'

const FOLDER_LABELS: Record<MailFolder, RegExp> = {
  inbox: /boîte de réception|inbox|réception/i,
  sent: /envoyés|sent/i,
  drafts: /brouillons|drafts/i,
  archive: /archives?/i,
}

interface ComposeFields {
  to: string
  subject: string
  body: string
}

export class MailHubPage {
  constructor(private readonly page: Page) {}

  /** Navigate to the mail hub. */
  async goto(): Promise<void> {
    await this.page.goto('/gestionnaire/mail')
  }

  /** Verify the mail hub renders (not the email connection prompt). */
  async expectLoaded(): Promise<void> {
    // The mail hub has a sidebar with folders — look for the inbox folder indicator.
    // If no email connection exists, an EmailConnectionPrompt is shown instead.
    const mailContent = this.page.locator('[class*="mail"], [class*="Mail"]').first()
    const connectionPrompt = this.page.getByText(/connecter.*email|configurer.*messagerie/i)

    // Either the mail content is visible OR we fail if only the connection prompt shows
    await expect(
      mailContent.or(this.page.getByRole('button', { name: /rédiger/i }))
    ).toBeVisible({ timeout: 15_000 })
    await expect(connectionPrompt).not.toBeVisible()
  }

  /** Select a folder in the sidebar. */
  async selectFolder(folder: MailFolder): Promise<void> {
    // Folders are rendered as links or clickable divs, not buttons
    const folderItem = this.page.getByRole('link', { name: FOLDER_LABELS[folder] })
      .or(this.page.getByText(FOLDER_LABELS[folder]))
      .first()
    await folderItem.click()
  }

  /** Read the badge count for a folder. Returns 0 if no badge is visible. */
  async getFolderCount(folder: MailFolder): Promise<number> {
    const folderItem = this.page.getByRole('link', { name: FOLDER_LABELS[folder] })
      .or(this.page.getByText(FOLDER_LABELS[folder]))
      .first()
    const badge = folderItem.locator('span, [class*="badge"]').first()
    const isVisible = await badge.isVisible().catch(() => false)
    if (!isVisible) return 0
    const text = await badge.textContent()
    return parseInt(text ?? '0', 10) || 0
  }

  /** Click the nth email in the email list (0-indexed). */
  async selectEmail(index: number): Promise<void> {
    const emailItems = this.page.locator('[class*="email-list-item"], [role="listitem"], [class*="EmailListItem"]')
    const item = emailItems.nth(index)
    await expect(item).toBeVisible()
    await item.click()
  }

  /** Verify the detail panel shows an email with the expected subject. */
  async expectEmailDetail(subject: string): Promise<void> {
    await expect(this.page.getByText(subject)).toBeVisible()
  }

  /** Mark the currently selected email as processed. */
  async markAsProcessed(): Promise<void> {
    const button = this.page.getByRole('button', { name: /marquer.*traité|processed/i }).first()
    await button.click()
  }

  /** Mark the currently selected email as unprocessed. */
  async markAsUnprocessed(): Promise<void> {
    const button = this.page.getByRole('button', { name: /marquer.*non.*traité|unprocessed/i }).first()
    await button.click()
  }

  /** Archive the currently selected email (inside MoreHorizontal dropdown). */
  async archiveEmail(): Promise<void> {
    // Open the "More actions" dropdown (MoreHorizontal icon button)
    const dropdownTrigger = this.page.getByRole('button', { name: /more email actions/i })
    await dropdownTrigger.click()
    // Click the "Archiver" menu item
    await this.page.getByRole('menuitem', { name: /archiver/i }).click()
  }

  /** Type a search query into the search bar. */
  async searchEmails(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/rechercher|search/i)
    await searchInput.fill(query)
  }

  /** Filter emails by date period (Radix Select, not buttons). */
  async filterByDate(period: DatePeriod): Promise<void> {
    const periodLabels: Record<DatePeriod, string> = {
      today: "Aujourd'hui",
      week: 'Cette semaine',
      month: 'Ce mois-ci',
    }
    // Open the date filter Select trigger (has aria-label "Filtrer par date")
    const selectTrigger = this.page.getByLabel(/filtrer par date/i)
    await selectTrigger.click()
    // Click the matching option in the dropdown
    await this.page.getByRole('option', { name: periodLabels[period] }).click()
  }

  /** Open the compose email modal. */
  async openCompose(): Promise<void> {
    await this.page.getByRole('button', { name: /rédiger/i }).click()
  }

  /** Fill the compose email modal fields. */
  async fillCompose({ to, subject, body }: ComposeFields): Promise<void> {
    // Select "From" address first — the "Envoyer" button stays disabled without a sender
    // The "De" field is a combobox inside the compose dialog, scoped to avoid matching other comboboxes
    const dialog = this.page.getByRole('dialog').filter({
      hasNot: this.page.getByText(/notification|installez/i),
    })
    const fromSelect = dialog.getByRole('combobox').first()
    if (await fromSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fromSelect.click({ force: true })
      await this.page.waitForTimeout(300)
      // Select the first available email option
      const firstOption = this.page.getByRole('option').first()
      if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstOption.click()
      }
    }

    // "To" field — simple email input, no Enter needed
    const toInput = this.page.getByPlaceholder(/destinataire/i).first()
    await toInput.fill(to)

    // Subject (placeholder: "Objet du message")
    const subjectInput = this.page.getByPlaceholder(/objet/i)
    await subjectInput.fill(subject)

    // Body — use textarea locator to avoid matching subject's "Objet du message" placeholder
    // which also contains "message". The body is a textarea, not an input.
    const bodyInput = this.page.locator('textarea[placeholder*="message" i], textarea[placeholder*="rédigez" i], textarea[placeholder*="ecrivez" i]').first()
      .or(this.page.getByPlaceholder(/rédigez|écrivez/i).first())
    await bodyInput.fill(body)
  }

  /** Click send in the compose modal. */
  async sendEmail(): Promise<void> {
    await this.page.getByRole('button', { name: /envoyer|send/i }).click()
  }

  /** Link the selected email to an entity (inside MoreHorizontal dropdown). */
  async linkToEntity(entityType: string, entityName: string): Promise<void> {
    // Open the "More actions" dropdown (MoreHorizontal icon button)
    const dropdownTrigger = this.page.getByRole('button', { name: /more email actions/i })
    await dropdownTrigger.click()
    // Click "Lier à une entité" or "Gérer les liaisons" menu item
    await this.page.getByRole('menuitem', { name: /lier|gérer les liaisons/i }).click()

    // In the LinkToEntityDialog, select entity type if visible
    const typeOption = this.page.getByText(entityType, { exact: false }).first()
    if (await typeOption.isVisible().catch(() => false)) {
      await typeOption.click()
    }

    // Select the entity by name
    await this.page.getByText(entityName, { exact: false }).first().click()
  }

  /** Remove a link to an entity. */
  async unlinkEntity(entityName: string): Promise<void> {
    const entityLink = this.page.getByText(entityName, { exact: false }).first()
    // Look for a remove/unlink button near the entity name
    const removeButton = entityLink.locator('..').getByRole('button', { name: /supprimer|retirer|unlink/i }).first()
    await removeButton.click()
  }

  /** Open the internal discussion panel. */
  async openInternalChat(): Promise<void> {
    const chatButton = this.page.getByRole('button', { name: /discussion|chat|interne/i }).first()
    await chatButton.click()
  }

  /** Start a new conversation on the selected email. */
  async startConversation(): Promise<void> {
    const startButton = this.page.getByRole('button', { name: /démarrer.*conversation|nouvelle.*conversation/i }).first()
    await startButton.click()
  }
}

export default MailHubPage
