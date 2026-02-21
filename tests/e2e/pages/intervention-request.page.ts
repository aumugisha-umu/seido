/**
 * Page Object Model — Locataire Intervention Request
 * Path: /locataire/interventions/nouvelle-demande
 *
 * 2-3 step wizard: [Logement] > Demande > Confirmation
 *
 * Step 1 (Logement) is auto-skipped if the tenant has only 1 lot.
 * Step 2: Type, urgency, description (required: type + description)
 * Step 3: Confirmation summary + submit
 *
 * NOTE: No data-testid attributes — uses text-based and ID-based selectors.
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'
import { waitForContent } from '../helpers/selectors'
import { dismissAllBanners } from '../helpers/cookies'

export class InterventionRequestPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the locataire request page and wait for content */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await dismissAllBanners(this.page)
    await this.page.goto(
      `${baseUrl}/locataire/interventions/nouvelle-demande`,
      { waitUntil: 'domcontentloaded', timeout: 45_000 },
    )
    // Wait for the page to render (title or form fields)
    await waitForContent(
      this.page,
      ['déclarer un sinistre', 'demande', 'type de problème', 'logement'],
      45_000,
    )
  }

  /** Click the "Continuer" or "Sélectionner ce logement" next button */
  async clickNext(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const next = buttons.find(b => {
        const text = b.textContent?.trim().toLowerCase() || ''
        return (
          (text === 'continuer' || text.includes('sélectionner ce logement') || text === 'sélectionner') &&
          !b.disabled
        )
      })
      if (next) next.click()
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /** Click the "Confirmer la création" or "Confirmer" submit button */
  async clickSubmit(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const submit = buttons.find(b => {
        const text = b.textContent?.trim().toLowerCase() || ''
        return text.includes('confirmer') && !text.includes('annuler')
      })
      if (submit) submit.click()
    })
  }

  /** Wait for the next button to be enabled */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const next = buttons.find(b => {
          const text = b.textContent?.trim().toLowerCase() || ''
          return text === 'continuer' || text.includes('sélectionner')
        })
        return next !== null && !(next as HTMLButtonElement).disabled
      },
      { timeout, polling: 500 },
    )
  }

  // ─── Step 1: Logement Selection ─────────────────────────

  /** Select the first lot card (if step 1 is shown) */
  async selectFirstLot(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim() === 'Sélectionner') {
          btn.click()
          return
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // ─── Step 2: Request Details ────────────────────────────

  /** Select the intervention type from the combobox */
  async selectType(typeLabel: string): Promise<void> {
    // Click the combobox trigger
    await this.page.evaluate(() => {
      const triggers = document.querySelectorAll('button[role="combobox"]')
      for (const t of triggers) {
        if (
          t.textContent?.includes('type') ||
          t.textContent?.includes('Sélectionnez')
        ) {
          (t as HTMLElement).click()
          return
        }
      }
      // Fallback: click first combobox
      if (triggers[0]) (triggers[0] as HTMLElement).click()
    })
    await new Promise(resolve => setTimeout(resolve, 500))

    // Select the option by text
    await this.page.evaluate((label: string) => {
      const options = document.querySelectorAll('[role="option"], [cmdk-item]')
      for (const opt of options) {
        if (opt.textContent?.toLowerCase().includes(label.toLowerCase())) {
          (opt as HTMLElement).click()
          return
        }
      }
    }, typeLabel)
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /** Fill the description textarea (id="description") */
  async fillDescription(description: string): Promise<void> {
    const textarea = await this.page.$('#description')
    if (textarea) {
      await textarea.click()
      await textarea.type(description, { delay: 10 })
    } else {
      // Fallback: find textarea by placeholder
      const fallback = await this.page.$(
        'textarea[placeholder*="Décrivez"], textarea[placeholder*="problème"]',
      )
      if (fallback) {
        await fallback.click()
        await fallback.type(description, { delay: 10 })
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /** Fill all step 2 fields at once */
  async fillDetails(opts: {
    type: string
    description: string
    urgency?: string
  }): Promise<void> {
    await this.selectType(opts.type)
    await this.fillDescription(opts.description)
  }

  // ─── Verification ───────────────────────────────────────

  /** Check if page contains given text (case-insensitive) */
  async hasContent(text: string): Promise<boolean> {
    return this.page.evaluate(
      (t: string) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      text,
    )
  }

  /** Wait for the success toast after submission */
  async waitForSuccessToast(timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText
        return (
          text.includes('Demande envoyée') ||
          text.includes('envoyée') ||
          text.includes('Erreur')
        )
      },
      { timeout, polling: 500 },
    )
    return this.page.evaluate(() => document.body.innerText)
  }

  /** Wait for redirect to intervention detail page */
  async waitForRedirect(timeout: number = 30_000): Promise<string> {
    await this.page.waitForFunction(
      () => window.location.href.includes('/locataire/interventions/'),
      { timeout, polling: 500 },
    )
    return this.page.url()
  }
}
