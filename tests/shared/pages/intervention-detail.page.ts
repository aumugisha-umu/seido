/**
 * Page Object Model — Intervention Detail Page (all 3 roles)
 *
 * Paths:
 * - /gestionnaire/operations/interventions/[id]
 * - /locataire/interventions/[id]
 * - /prestataire/interventions/[id]
 *
 * Action buttons vary by role and status (see intervention-detail-header.tsx):
 * - Gestionnaire: Approuver, Rejeter, Planifier, Finaliser, Annuler
 * - Prestataire: Marquer terminee, respond to time slots
 * - Locataire: Valider cloture, Contester
 *
 * Tabs: General, Conversations, Documents, Devis, Activite
 */

import { type Page, expect } from '@playwright/test'
import { type UserRole } from '../helpers/types'
import { dismissBanners, waitForContent, waitForSuccessToast } from '../helpers/selectors'
import { TIMEOUTS } from '../helpers/constants'

/** Detail page URL pattern per role */
const DETAIL_URL_PATTERNS: Record<UserRole, string> = {
  gestionnaire: '/gestionnaire/operations/interventions',
  locataire: '/locataire/interventions',
  prestataire: '/prestataire/interventions',
}

export class InterventionDetailPage {
  constructor(private page: Page) {}

  /** Dialog locator filtering out notification/PWA banners */
  private get actionDialog() {
    return this.page.getByRole('dialog').filter({
      hasNot: this.page.getByText(/notification|installez/i),
    })
  }

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the intervention detail page for a given role */
  async goto(role: UserRole, interventionId: string): Promise<void> {
    const basePath = DETAIL_URL_PATTERNS[role]
    await this.page.goto(`${basePath}/${interventionId}`)
    await dismissBanners(this.page)
    await waitForContent(
      this.page,
      ['general', 'participants', 'localisation', 'conversations'],
      TIMEOUTS.content,
    )
  }

  // ─── Status ─────────────────────────────────────────────

  /** Verify the status badge displays the expected status text */
  async expectStatus(status: string): Promise<void> {
    const statusBadge = this.page.getByText(status, { exact: false }).first()
    await expect(statusBadge).toBeVisible({ timeout: TIMEOUTS.action })
  }

  // ─── Gestionnaire Actions ──────────────────────────────

  /** Click "Traiter demande" → "Approuver" → "Confirmer l'approbation" (3-step flow) */
  async approve(): Promise<void> {
    await dismissBanners(this.page)

    // Step 1: Click "Traiter demande" to open the approval modal
    const processBtn = this.page.getByRole('button', { name: /traiter demande/i }).first()
    await expect(processBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await processBtn.click()

    // Step 2: In the approval modal, click "Approuver"
    const dialog = this.actionDialog
    const approveBtn = dialog.getByRole('button', { name: /approuver/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await approveBtn.click()

    // Step 3: Confirm the approval — "Confirmer l'approbation"
    const confirmBtn = dialog.getByRole('button', { name: /confirmer l.approbation|confirmer/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await confirmBtn.click()
  }

  /**
   * Reject an intervention from "demande" status.
   * Flow: "Traiter demande" → approval modal → "Rejeter" → rejection form → "Confirmer le rejet"
   */
  async reject(reason?: string): Promise<void> {
    await dismissBanners(this.page)

    // Step 1: Click "Traiter demande" to open the approval modal
    const processBtn = this.page.getByRole('button', { name: /traiter demande/i }).first()
    await expect(processBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await processBtn.click()

    // Step 2: In the approval modal, click "Rejeter"
    const dialog = this.actionDialog
    const rejectBtn = dialog.getByRole('button', { name: /rejeter/i }).first()
    await expect(rejectBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await rejectBtn.click()

    // Step 3: Fill rejection reason if provided
    if (reason) {
      const textarea = dialog.getByRole('textbox').first()
      if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await textarea.fill(reason)
      }
    }

    // Step 4: Click "Confirmer le rejet"
    const confirmBtn = dialog.getByRole('button', { name: /confirmer le rejet|confirmer/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await confirmBtn.click()
  }

  /** Click "Planifier directement" to start the planning flow */
  async startPlanning(): Promise<void> {
    await dismissBanners(this.page)
    const planBtn = this.page.getByRole('button', { name: /planifier/i }).first()
    await expect(planBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await planBtn.click()
  }

  /** Click "Annuler" from the kebab/actions dropdown menu */
  async cancel(reason = 'Annulation QA test automatise'): Promise<void> {
    await dismissBanners(this.page)
    // Open the dot menu — button has sr-only "Plus d'actions" text
    const kebab = this.page.getByRole('button', { name: /plus d'actions|plus d.actions|actions/i }).first()
    await expect(kebab).toBeVisible({ timeout: TIMEOUTS.action })
    await kebab.click()

    // Click "Annuler" in the dropdown menu
    const cancelItem = this.page.getByRole('menuitem', { name: /annuler/i })
    await expect(cancelItem).toBeVisible({ timeout: TIMEOUTS.action })
    await cancelItem.click()

    // Wait for cancellation dialog to appear
    await this.page.waitForTimeout(500)

    // Fill the required "Motif de l'annulation" field
    const reasonInput = this.page.getByRole('textbox', { name: /motif/i }).first()
    await expect(reasonInput).toBeVisible({ timeout: TIMEOUTS.action })
    await reasonInput.fill(reason)

    // Click "Confirmer l'annulation"
    const confirmBtn = this.page.getByRole('button', { name: /confirmer l.annulation/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await confirmBtn.click()
  }

  // ─── Time Slot Interactions ─────────────────────────────

  /**
   * Confirm a time slot (locataire/gestionnaire).
   * Clicks the confirm button on a specific time slot or the first available one.
   *
   * @param index - Zero-based index of the time slot to confirm (default: 0)
   */
  async confirmTimeSlot(index = 0): Promise<void> {
    await dismissBanners(this.page)
    const slotButtons = this.page.getByRole('button', { name: /sélectionner|choisir/i })
    const targetSlot = slotButtons.nth(index)
    await expect(targetSlot).toBeVisible({ timeout: TIMEOUTS.action })
    await targetSlot.click()

    // Confirm selection in dialog if prompted
    const confirmBtn = this.actionDialog
      .getByRole('button', { name: /confirmer/i })
      .first()
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  /** Respond to time slots as prestataire (accept/propose slots) */
  async respondToTimeSlots(): Promise<void> {
    await dismissBanners(this.page)
    // Look for the provider time slot response button
    const respondBtn = this.page.getByRole('button', { name: /répondre|disponibilités|accepter/i }).first()
    await expect(respondBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await respondBtn.click()
  }

  // ─── Quote Interactions ─────────────────────────────────

  /**
   * Submit a quote as prestataire.
   *
   * @param amount - Quote amount in euros
   * @param description - Optional quote description
   */
  async submitQuote(amount: number, description?: string): Promise<void> {
    await dismissBanners(this.page)
    // Navigate to the Devis tab first
    await this.goToTab('Devis')

    // Click "Soumettre un devis" or similar button
    const submitQuoteBtn = this.page.getByRole('button', { name: /soumettre|nouveau devis|ajouter/i }).first()
    await expect(submitQuoteBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await submitQuoteBtn.click()

    // Fill amount
    const amountInput = this.page.getByLabel(/montant|prix|cout/i).first()
    await expect(amountInput).toBeVisible({ timeout: TIMEOUTS.action })
    await amountInput.fill(amount.toString())

    // Fill description if provided
    if (description) {
      const descInput = this.page.getByLabel(/description|détail/i).first()
      if (await descInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await descInput.fill(description)
      }
    }

    // Submit the quote form
    const confirmBtn = this.page.getByRole('button', { name: /soumettre|envoyer|confirmer/i }).first()
    await confirmBtn.click()
  }

  /** Approve the first pending quote (gestionnaire) */
  async approveQuote(): Promise<void> {
    await dismissBanners(this.page)
    await this.goToTab('Planning et Estimations')

    const approveBtn = this.page.getByRole('button', { name: /accepter|approuver/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await approveBtn.click()

    // Confirm in dialog
    const confirmBtn = this.actionDialog
      .getByRole('button', { name: /confirmer/i })
      .first()
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  // ─── Closure Flow ───────────────────────────────────────

  /** Click "Marquer terminee" as prestataire */
  async closeAsProvider(): Promise<void> {
    await dismissBanners(this.page)
    const completeBtn = this.page.getByRole('button', { name: /marquer terminée/i }).first()
    await expect(completeBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await completeBtn.click()

    // Handle completion report dialog if it appears
    const dialog = this.actionDialog
    const confirmBtn = dialog.getByRole('button', { name: /confirmer|soumettre|envoyer/i }).first()
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  /** Click "Valider cloture" as locataire */
  async validateAsLocataire(): Promise<void> {
    await dismissBanners(this.page)
    const validateBtn = this.page.getByRole('button', { name: /valider/i }).first()
    await expect(validateBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await validateBtn.click()

    // Handle validation dialog
    const dialog = this.actionDialog
    const confirmBtn = dialog.getByRole('button', { name: /confirmer|valider/i }).first()
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  /**
   * Click "Finaliser" as gestionnaire and optionally set final cost.
   *
   * @param finalCost - Optional final cost to enter
   */
  async finalizeAsManager(finalCost?: number): Promise<void> {
    await dismissBanners(this.page)
    const finalizeBtn = this.page.getByRole('button', { name: /finaliser/i }).first()
    await expect(finalizeBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await finalizeBtn.click()

    // Handle finalization modal
    const dialog = this.actionDialog

    if (finalCost !== undefined) {
      const costInput = dialog.getByLabel(/coût|montant|prix/i).first()
      if (await costInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await costInput.fill(finalCost.toString())
      }
    }

    const confirmBtn = dialog.getByRole('button', { name: /finaliser|confirmer/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: TIMEOUTS.action })
    await confirmBtn.click()
  }

  // ─── Tab Navigation ─────────────────────────────────────

  /**
   * Switch to a specific tab on the detail page.
   *
   * @param tabName - Tab name: "General", "Conversations", "Documents", "Devis", "Activite"
   */
  async goToTab(tabName: string): Promise<void> {
    const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') })
    await expect(tab).toBeVisible({ timeout: TIMEOUTS.action })
    await tab.click()
    // Wait for the active tab panel (inactive ones have data-state="inactive" and hidden)
    await this.page.locator('[role="tabpanel"][data-state="active"]').waitFor({ state: 'visible', timeout: 5_000 })
  }

  // ─── Conversations ─────────────────────────────────────

  /** Send a message in the conversations tab */
  async sendMessage(text: string): Promise<void> {
    await this.goToTab('Conversations')

    const messageInput = this.page.getByPlaceholder(/message|écrire|tapez/i).first()
    await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.action })
    await messageInput.fill(text)

    // The send button is an icon-only button with no accessible name,
    // so submit via Enter key press instead
    await messageInput.press('Enter')
  }

  // ─── Documents ──────────────────────────────────────────

  /**
   * Upload a document in the documents tab.
   *
   * @param filePath - Absolute path to the file to upload
   */
  async uploadDocument(filePath: string): Promise<void> {
    await this.goToTab('Documents')

    // Find the file input (hidden behind drag-drop zone)
    const fileInput = this.page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(filePath)
  }

  // ─── Assertions ─────────────────────────────────────────

  /** Wait for a status update toast */
  async expectStatusUpdate(): Promise<string> {
    return await waitForSuccessToast(this.page, TIMEOUTS.toast)
  }
}
