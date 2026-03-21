/**
 * Page Object Model — Intervention Detail Page (Playwright)
 *
 * Paths:
 * - /gestionnaire/interventions/[id]
 * - /locataire/interventions/[id]
 * - /prestataire/interventions/[id]
 *
 * Provides actions for:
 * - Reading current status
 * - Clicking action buttons (approve, reject, cancel, finalize, etc.)
 * - Interacting with confirmation dialogs
 * - Verifying page content
 */

import { type Page, type Locator, expect } from '@playwright/test'

/** System-modal keywords used to filter out notification/PWA dialogs */
const SYSTEM_KEYWORDS = ['notification', 'installez', 'restez informé', 'activez les']

/** CSS selector for dialog elements (Radix Dialog, AlertDialog) */
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]'

export class InterventionDetailPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /**
   * Navigate to an intervention detail page for a given role.
   *
   * Strategy: navigate -> check URL stabilized on detail page -> wait for content.
   * Next.js middleware may redirect to list page if JWT is stale, so we check
   * the URL FIRST (before content markers which can match the brief shell render).
   */
  async navigateTo(role: string, interventionId: string): Promise<void> {
    const detailUrl = `/${role}/interventions/${interventionId}`

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })

      // Wait for URL to contain the intervention ID (detect middleware redirects).
      try {
        await this.page.waitForURL(`**/${interventionId}*`, { timeout: 10_000 })
        break // URL is correct
      } catch {
        if (attempt === 2) {
          throw new Error(`navigateTo: URL never contained ${interventionId} after 3 attempts`)
        }
      }
    }

    // Now wait for detail page content (tab bar or section headers).
    await expect(
      this.page.getByText(/général|participants|localisation|conversations/i).first(),
    ).toBeVisible({ timeout: 45_000 })

    // Extra delay for action buttons to render (server components load after shell).
    await this.page.waitForTimeout(3000)
  }

  // ─── Status Reading ─────────────────────────────────────

  /** Get the current page text for status checking */
  async getPageText(): Promise<string> {
    return this.page.evaluate(() => document.body.innerText)
  }

  /** Check if the page contains specific text (case-insensitive) */
  async hasContent(text: string): Promise<boolean> {
    return await this.page
      .getByText(text, { exact: false })
      .first()
      .isVisible()
      .catch(() => false)
  }

  // ─── Action Buttons ─────────────────────────────────────

  /**
   * Click an action button by its text content.
   * Uses Playwright's built-in auto-waiting and locator strategy.
   */
  async clickActionButton(buttonText: string): Promise<void> {
    const btn = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    await btn.first().click()
    await this.page.waitForTimeout(800)
  }

  /** Click "Traiter demande" button (gestionnaire, status=demande) */
  async clickProcessRequest(): Promise<void> {
    await this.clickActionButton('Traiter la demande')
  }

  /** Click "Planifier" button (gestionnaire, status=approuvee) */
  async clickPlanify(): Promise<void> {
    await this.clickActionButton('Planifier')
  }

  /** Click "Cloturer" button (gestionnaire, closure statuses) */
  async clickFinalize(): Promise<void> {
    await this.clickActionButton('Clôturer')
  }

  /**
   * Open the kebab (three-dot) menu and click "Annuler".
   *
   * Uses `data-slot="dropdown-menu-trigger"` for the kebab trigger
   * and `data-slot="dropdown-menu-item"` for menu items (from shadcn/Radix).
   */
  async clickCancel(): Promise<void> {
    // Step 1: Find and click the kebab menu trigger via data-slot selector.
    const kebab = this.page.locator('[data-slot="dropdown-menu-trigger"]').first()
    await kebab.click()
    // Wait for Radix dropdown menu to animate open
    await this.page.waitForTimeout(1000)

    // Step 2: Find and click "Annuler" menu item via data-slot selector
    const cancelItem = this.page
      .locator('[data-slot="dropdown-menu-item"]')
      .filter({ hasText: /annuler/i })
      .first()
    await cancelItem.click()
    await this.page.waitForTimeout(800)
  }

  /** Click "Marquer terminee" button (prestataire, status=planifiee) */
  async clickCompleteWork(): Promise<void> {
    await this.clickActionButton('Marquer terminée')
  }

  /** Click "Valider" button (locataire, status=cloturee_par_prestataire) */
  async clickValidateWork(): Promise<void> {
    await this.clickActionButton('Valider')
  }

  /** Click "Contester" button (locataire, status=cloturee_par_prestataire) */
  async clickContestWork(): Promise<void> {
    await this.clickActionButton('Contester')
  }

  // ─── Dialog Interactions ────────────────────────────────

  /**
   * Wait for a NON-SYSTEM confirmation dialog to appear.
   * Skips ghost shells (< 5 chars text) and system modals (notification/PWA keywords).
   */
  async waitForDialog(timeout: number = 10_000): Promise<void> {
    await this.page.waitForFunction(
      (args: { selector: string; keywords: string[] }) => {
        const dialogs = Array.from(document.querySelectorAll(args.selector))
        return dialogs.some(d => {
          const text = d.textContent?.toLowerCase() || ''
          if (text.trim().length < 5) return false
          return !args.keywords.some(kw => text.includes(kw))
        })
      },
      { selector: DIALOG_SELECTOR, keywords: SYSTEM_KEYWORDS },
      { timeout, polling: 300 },
    )
  }

  /** Fill the comment textarea in an open dialog */
  async fillDialogComment(comment: string): Promise<void> {
    // Find the textarea inside a non-system dialog
    const textarea = this.page.locator(`${DIALOG_SELECTOR} textarea`).first()
    await textarea.fill(comment)
    await this.page.waitForTimeout(300)
  }

  /**
   * Click the confirm button inside a dialog.
   * Looks for "confirmer", "approuver", or "valider" text.
   */
  async clickDialogConfirm(): Promise<void> {
    // Try multiple confirm button texts
    const dialog = this.page.locator(DIALOG_SELECTOR)
    const confirmBtn = dialog
      .getByRole('button', { name: /confirmer|approuver|valider/i })
      .first()
    await confirmBtn.click()
    await this.page.waitForTimeout(500)
  }

  /** Click the cancel button inside a dialog */
  async clickDialogCancel(): Promise<void> {
    const dialog = this.page.locator(DIALOG_SELECTOR)
    const cancelBtn = dialog
      .getByRole('button', { name: /annuler/i })
      .first()
    await cancelBtn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Click a specific action within a dialog (e.g., "Approuver" or "Rejeter").
   */
  async clickDialogAction(actionText: string): Promise<void> {
    const dialog = this.page.locator(DIALOG_SELECTOR)
    const btn = dialog
      .getByRole('button', { name: new RegExp(actionText, 'i') })
      .first()
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Complete the 2-step approval flow:
   * Step 1: Click "Approuver" in the decision view
   * Step 2: Wait for confirm step -> Click "Confirmer l'approbation"
   *
   * The approval modal uses a multi-state pattern:
   * decision -> approve (confirm) -> done
   */
  async completeApprovalFlow(): Promise<void> {
    // Step 1: Click "Approuver" to transition to confirm state.
    // Retry up to 3 times -- overlays or timing can cause the first click to miss.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.clickDialogAction('Approuver')

      // Check if the modal transitioned (look for "Confirmer" button).
      try {
        const dialog = this.page.locator(DIALOG_SELECTOR)
        await expect(
          dialog.getByRole('button', { name: /confirmer/i }).first(),
        ).toBeVisible({ timeout: 3_000 })
        break // Success
      } catch {
        if (attempt === 2) {
          throw new Error('Approval flow: "Confirmer" button never appeared after 3 attempts')
        }
      }
    }

    // Step 2: Click "Confirmer l'approbation" to actually approve
    await this.clickDialogConfirm()
  }

  // ─── Toast Verification ─────────────────────────────────

  /** Wait for a toast containing specific text */
  async waitForToastContaining(text: string, timeout: number = 15_000): Promise<void> {
    await expect(
      this.page.getByText(text, { exact: false }).first(),
    ).toBeVisible({ timeout })
  }

  /** Wait for any status-change success indicator */
  async waitForStatusUpdate(timeout: number = 30_000): Promise<void> {
    await expect(
      this.page.getByText(
        /succès|mis à jour|approuvée|rejetée|annulée|finalisée|clôturée|planifi|traitement|erreur|planifier/i,
      ).first(),
    ).toBeVisible({ timeout })
  }
}
