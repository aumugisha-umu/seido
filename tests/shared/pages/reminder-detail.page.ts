/**
 * ReminderDetailPage — Page Object Model for the reminder detail/management page.
 * Route: /gestionnaire/operations/rappels/[id]
 */

import { type Page, expect } from '@playwright/test'

type ReminderStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'
type ReminderPriority = 'basse' | 'normale' | 'haute'

const STATUS_LABELS: Record<ReminderStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

export class ReminderDetailPage {
  constructor(private readonly page: Page) {}

  /** Navigate to a specific reminder detail page. */
  async goto(reminderId: string): Promise<void> {
    await this.page.goto(`/gestionnaire/operations/rappels/${reminderId}`)
    await expect(this.page.getByText('Details du rappel')).toBeVisible()
  }

  /** Assert that the reminder shows a specific status badge. */
  async expectStatus(status: ReminderStatus): Promise<void> {
    const label = STATUS_LABELS[status]
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible()
  }

  /** Assert that the reminder shows a specific priority badge. */
  async expectPriority(priority: ReminderPriority): Promise<void> {
    const label = PRIORITY_LABELS[priority]
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible()
  }

  /** Assert that the "En retard" (overdue) badge is visible. */
  async expectOverdue(): Promise<void> {
    await expect(this.page.getByText('En retard', { exact: true })).toBeVisible()
  }

  /** Assert that the recurrence badge is visible. */
  async expectRecurrent(): Promise<void> {
    await expect(this.page.getByText('Recurrent')).toBeVisible()
  }

  /** Click the "Commencer" button to start the reminder. */
  async start(): Promise<void> {
    await this.page.getByRole('button', { name: 'Commencer' }).click()
  }

  /** Click the "Terminer" button to complete the reminder. */
  async complete(): Promise<void> {
    await this.page.getByRole('button', { name: 'Terminer' }).click()
  }

  /** Click the "Annuler" button to cancel the reminder. */
  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Annuler' }).click()
  }

  /** Type text into the notes textarea. */
  async fillNotes(text: string): Promise<void> {
    const textarea = this.page.getByPlaceholder('Ajouter des notes...')
    await textarea.fill(text)
  }

  /** Click the "Enregistrer" button to save notes. */
  async saveNotes(): Promise<void> {
    await this.page.getByRole('button', { name: 'Enregistrer' }).click()
  }

  /** Assert that the notes textarea is disabled (terminal status). */
  async expectNotesDisabled(): Promise<void> {
    const textarea = this.page.getByPlaceholder('Ajouter des notes...')
    await expect(textarea).toBeDisabled()
  }

  /** Assert that no action buttons (Commencer, Terminer, Annuler) are visible. */
  async expectNoActionButtons(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Commencer' })).not.toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Terminer' })).not.toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Annuler' })).not.toBeVisible()
  }
}
