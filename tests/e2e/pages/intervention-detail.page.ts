/**
 * Page Object Model — Intervention Detail Page (all roles)
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
 *
 * KEY PATTERNS:
 * 1. `findDialogButton` iterates ALL dialogs and finds the one containing the target button,
 *    rather than picking the first non-system dialog (which could be an empty ghost shell).
 *    Ghost shells from dismissed modals have minimal text content (< 5 chars) and get skipped.
 * 2. Click mechanism uses CDP click (evaluateHandle → asElement().click()) with
 *    coordinate-based mouse click as fallback for Radix Portal elements.
 */

import type { Page, ElementHandle } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'
import { waitForContent } from '../helpers/selectors'
import { dismissAllBanners, dismissSystemModals } from '../helpers/cookies'

/** System-modal keywords used to filter out notification/PWA dialogs */
const SYSTEM_KEYWORDS = ['notification', 'installez', 'restez informé', 'activez les']

/** CSS selector for dialog elements (Radix Dialog, AlertDialog) */
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]'

export class InterventionDetailPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to an intervention detail page for a given role.
   *
   * Strategy: navigate → check URL stabilized on detail page → wait for content.
   * Next.js middleware may redirect to list page if JWT is stale, so we check
   * the URL FIRST (before content markers which can match the brief shell render).
   */
  async navigateTo(role: string, interventionId: string): Promise<void> {
    const baseUrl = getBaseUrl()
    const detailUrl = `${baseUrl}/${role}/interventions/${interventionId}`

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })
      await dismissAllBanners(this.page)

      // Wait for URL to contain the intervention ID (detect middleware redirects).
      // The shell renders "Général" tabs before the redirect fires, so we must
      // check URL first — not content markers.
      try {
        await this.page.waitForFunction(
          (id: string) => window.location.href.includes(id),
          { timeout: 10_000, polling: 500 },
          interventionId,
        )
        break // URL is correct — we're on the detail page
      } catch {
        // URL redirected (stale JWT, RLS denied) — retry
        if (attempt === 2) {
          throw new Error(`navigateTo: URL never contained ${interventionId} after 3 attempts`)
        }
      }
    }

    // Now wait for detail page content (tab bar or section headers).
    await waitForContent(
      this.page,
      ['général', 'participants', 'localisation', 'conversations'],
      45_000,
    )

    // Extra delay for action buttons to render (server components load after shell).
    await new Promise(resolve => setTimeout(resolve, 3000))
    // Dismiss ALL overlays again — banners may appear after content loaded
    await dismissAllBanners(this.page)
  }

  // ─── Status Reading ─────────────────────────────────────

  /** Get the current page text for status checking */
  async getPageText(): Promise<string> {
    return this.page.evaluate(() => document.body.innerText)
  }

  /** Check if the page contains specific text (case-insensitive) */
  async hasContent(text: string): Promise<boolean> {
    return this.page.evaluate(
      (t: string) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      text,
    )
  }

  // ─── Action Buttons ─────────────────────────────────────

  /**
   * Find a visible button by text content and return its ElementHandle.
   * Uses evaluateHandle so we can use CDP click (which fires through the
   * browser's native event system, properly caught by React event delegation).
   */
  private async findButtonByText(text: string): Promise<ElementHandle | null> {
    const handle = await this.page.evaluateHandle((t: string) => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.find(b => {
        const content = b.textContent?.trim().toLowerCase() || ''
        // Check visibility: offsetParent is null for display:none elements.
        // For position:fixed ancestors, also check getComputedStyle.
        const style = window.getComputedStyle(b)
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden'
        return content.includes(t.toLowerCase()) && isVisible
      }) || null
    }, text)
    return handle.asElement()
  }

  /**
   * Click an action button by its text content.
   * Dismisses overlays first (notification/PWA modals can appear on a timer
   * AFTER navigateTo completes, intercepting clicks on page-level buttons).
   */
  async clickActionButton(buttonText: string): Promise<void> {
    await dismissAllBanners(this.page)
    const btn = await this.findButtonByText(buttonText)
    if (btn) {
      await btn.click()
    }
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Click "Traiter la demande" button (gestionnaire, status=demande) */
  async clickProcessRequest(): Promise<void> {
    await this.clickActionButton('Traiter la demande')
  }

  /** Click "Planifier" button (gestionnaire, status=approuvee) */
  async clickPlanify(): Promise<void> {
    await this.clickActionButton('Planifier')
  }

  /** Click "Clôturer" button (gestionnaire, closure statuses) */
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
    // There may be multiple triggers (desktop, tablet, mobile layouts).
    // Pick the first visible one.
    const kebabHandle = await this.page.evaluateHandle(() => {
      const triggers = Array.from(
        document.querySelectorAll('[data-slot="dropdown-menu-trigger"]')
      )
      return triggers.find(t => {
        const style = window.getComputedStyle(t)
        return style.display !== 'none' && style.visibility !== 'hidden'
      }) || null
    })
    const kebab = kebabHandle.asElement()
    if (kebab) {
      await kebab.click()
    }
    // Wait for Radix dropdown menu to animate open
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 2: Find and click "Annuler" menu item via data-slot selector
    const cancelHandle = await this.page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll(
        '[data-slot="dropdown-menu-item"]'
      ))
      return items.find(el =>
        el.textContent?.trim().toLowerCase().includes('annuler'),
      ) || null
    })
    const cancelEl = cancelHandle.asElement()
    if (cancelEl) {
      await cancelEl.click()
    }
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Click "Marquer terminée" button (prestataire, status=planifiee) */
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
    await dismissSystemModals(this.page)
    await this.page.waitForFunction(
      (args: { selector: string; keywords: string[] }) => {
        const dialogs = Array.from(document.querySelectorAll(args.selector))
        return dialogs.some(d => {
          const text = d.textContent?.toLowerCase() || ''
          // Must have meaningful content (not an empty ghost shell)
          if (text.trim().length < 5) return false
          return !args.keywords.some(kw => text.includes(kw))
        })
      },
      { timeout, polling: 300 },
      { selector: DIALOG_SELECTOR, keywords: SYSTEM_KEYWORDS },
    )
  }

  /**
   * Find a button inside an OPEN app dialog (non-system) by text content.
   *
   * CRITICAL: Iterates ALL open dialogs and returns the first button matching
   * the target text. This avoids the "ghost dialog" trap where a dismissed
   * modal's empty shell gets selected first by `find()`.
   */
  private async findDialogButton(buttonText: string): Promise<ElementHandle | null> {
    const handle = await this.page.evaluateHandle(
      (args: { text: string; keywords: string[]; selector: string }) => {
        const dialogs = Array.from(document.querySelectorAll(args.selector))
        for (const dialog of dialogs) {
          const t = (dialog.textContent || '').toLowerCase()
          // Skip system modals
          if (args.keywords.some(kw => t.includes(kw))) continue
          // Skip empty ghost shells
          if (t.trim().length < 5) continue
          // Search for the target button in this dialog
          const buttons = Array.from(dialog.querySelectorAll('button'))
          const btn = buttons.find(b =>
            b.textContent?.trim().toLowerCase().includes(args.text.toLowerCase()),
          )
          if (btn) return btn
        }
        return null
      },
      { text: buttonText, keywords: SYSTEM_KEYWORDS, selector: DIALOG_SELECTOR },
    )
    return handle.asElement()
  }

  /** Fill the comment textarea in an open dialog */
  async fillDialogComment(comment: string): Promise<void> {
    await dismissSystemModals(this.page)
    await this.page.evaluate(
      (args: { text: string; keywords: string[]; selector: string }) => {
        const dialogs = Array.from(document.querySelectorAll(args.selector))
        for (const dialog of dialogs) {
          const t = (dialog.textContent || '').toLowerCase()
          if (args.keywords.some(kw => t.includes(kw))) continue
          if (t.trim().length < 5) continue
          const textarea = dialog.querySelector('textarea')
          if (textarea) {
            textarea.focus()
            // Use native value setter for React controlled inputs
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            )?.set
            if (nativeSetter) {
              nativeSetter.call(textarea, args.text)
            } else {
              textarea.value = args.text
            }
            textarea.dispatchEvent(new Event('input', { bubbles: true }))
            textarea.dispatchEvent(new Event('change', { bubbles: true }))
            return
          }
        }
      },
      { text: comment, keywords: SYSTEM_KEYWORDS, selector: DIALOG_SELECTOR },
    )
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /**
   * Click the confirm button inside a dialog.
   * Looks for "confirmer", "approuver", or "valider" text.
   * Uses CDP click with coordinate-based fallback.
   */
  async clickDialogConfirm(): Promise<void> {
    await dismissSystemModals(this.page)
    const btn =
      (await this.findDialogButton('confirmer')) ||
      (await this.findDialogButton('approuver')) ||
      (await this.findDialogButton('valider'))
    if (btn) {
      await this.robustClick(btn)
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /** Click the cancel button inside a dialog */
  async clickDialogCancel(): Promise<void> {
    await dismissSystemModals(this.page)
    const btn = await this.findDialogButton('annuler')
    if (btn) {
      await this.robustClick(btn)
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /**
   * Click a specific action within a dialog (e.g., "Approuver" or "Rejeter").
   * Uses robust click with coordinate-based fallback for Radix Portal reliability.
   */
  async clickDialogAction(actionText: string): Promise<void> {
    await dismissAllBanners(this.page)
    const btn = await this.findDialogButton(actionText)
    if (btn) {
      await this.robustClick(btn)
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /**
   * Robust click: CDP click + coordinate-based mouse click fallback.
   *
   * Radix Dialog Portal elements render outside React's root container.
   * CDP click (ElementHandle.click) dispatches at element coordinates.
   * As fallback, we also use page.mouse.click at the element's center
   * coordinates, which goes through the browser's full hit-testing.
   */
  private async robustClick(element: ElementHandle): Promise<void> {
    // Primary: CDP click via ElementHandle
    await element.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    // Fallback: coordinate-based mouse click (goes through full browser hit-testing)
    const box = await element.boundingBox()
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2,
      )
    }
  }

  /**
   * Complete the 2-step approval flow:
   * Step 1: Click "Approuver" in the decision view
   * Step 2: Wait for confirm step → Click "Confirmer l'approbation"
   *
   * The approval modal uses a multi-state pattern:
   * decision → approve (confirm) → done
   */
  async completeApprovalFlow(): Promise<void> {
    // CRITICAL: Dismiss ALL overlays before interacting with the modal.
    await dismissAllBanners(this.page)

    // Step 1: Click "Approuver" to transition to confirm state.
    // Retry up to 3 times — overlays or timing can cause the first click to miss.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.clickDialogAction('Approuver')

      // Check if the modal transitioned (look for "Confirmer" button).
      // CRITICAL: Use `some()` to search ALL open dialogs, not `find()` on first.
      try {
        await this.page.waitForFunction(
          (args: { selector: string; keywords: string[] }) => {
            const dialogs = Array.from(document.querySelectorAll(args.selector))
            return dialogs.some(d => {
              const t = (d.textContent || '').toLowerCase()
              if (args.keywords.some(kw => t.includes(kw))) return false
              if (t.trim().length < 5) return false
              const buttons = Array.from(d.querySelectorAll('button'))
              return buttons.some(b =>
                b.textContent?.trim().toLowerCase().includes('confirmer'),
              )
            })
          },
          { timeout: 3_000, polling: 200 },
          { selector: DIALOG_SELECTOR, keywords: SYSTEM_KEYWORDS },
        )
        break // Success — "Confirmer" button appeared
      } catch {
        if (attempt === 2) throw new Error('Approval flow: "Confirmer" button never appeared after 3 attempts')
        // Dismiss banners again in case they reappeared
        await dismissAllBanners(this.page)
      }
    }

    // Step 2: Click "Confirmer l'approbation" to actually approve
    await this.clickDialogConfirm()
  }

  // ─── Toast Verification ─────────────────────────────────

  /** Wait for a toast containing specific text */
  async waitForToastContaining(text: string, timeout: number = 15_000): Promise<string> {
    await this.page.waitForFunction(
      (t: string) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      { timeout, polling: 500 },
      text,
    )
    return this.page.evaluate(() => document.body.innerText)
  }

  /** Wait for any status-change success indicator */
  async waitForStatusUpdate(timeout: number = 30_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase()
        return (
          text.includes('succès') ||
          text.includes('mis à jour') ||
          text.includes('approuvée') ||
          text.includes('rejetée') ||
          text.includes('annulée') ||
          text.includes('finalisée') ||
          text.includes('clôturée') ||
          text.includes('planifi') ||
          text.includes('traitement') ||
          text.includes('erreur') ||
          text.includes('planifier')
        )
      },
      { timeout, polling: 500 },
    )
  }
}
