/**
 * Page Object Model — Gestionnaire Intervention Creation Wizard
 * Path: /gestionnaire/interventions/nouvelle-intervention
 *
 * 4-step wizard: Bien > Demande > Contacts > Confirmation
 *
 * Step 1: Property selection (building or lot via PropertySelector)
 * Step 2: Intervention details (title, type, urgency, description)
 * Step 3: Contacts assignment (managers, providers, tenants)
 * Step 4: Confirmation summary + submit
 *
 * NOTE: No data-testid attributes on wizard buttons — uses text-based selectors.
 */

import type { Page } from 'puppeteer'
import { getBaseUrl } from '../../fixtures/test-accounts'
import { waitForContent } from '../helpers/selectors'
import { dismissAllBanners } from '../helpers/cookies'

export class InterventionWizardPage {
  constructor(private page: Page) {}

  // ─── Navigation ─────────────────────────────────────────

  /** Navigate to the intervention creation wizard and wait for step 1 */
  async navigate(): Promise<void> {
    const baseUrl = getBaseUrl()
    await dismissAllBanners(this.page)
    await this.page.goto(
      `${baseUrl}/gestionnaire/interventions/nouvelle-intervention`,
      { waitUntil: 'domcontentloaded', timeout: 45_000 },
    )
    // Wait for wizard to load (PropertySelector or step header)
    await waitForContent(this.page, ['créer une intervention', 'bien'], 45_000)
  }

  /** Click the "Continuer" button to advance to the next step */
  async clickNext(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const next = buttons.find(
        b => b.textContent?.trim().toLowerCase() === 'continuer' && !b.disabled,
      )
      if (next) next.click()
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /** Click the "Retour" button to go to the previous step */
  async clickPrev(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const prev = buttons.find(
        b => b.textContent?.trim().toLowerCase().includes('retour'),
      )
      if (prev) prev.click()
    })
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  /** Click the "Créer l'intervention" submit button on step 4 */
  async clickSubmit(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const submit = buttons.find(b =>
        b.textContent?.trim().toLowerCase().includes("créer l'intervention"),
      )
      if (submit) submit.click()
    })
  }

  /** Wait for the Next/Continue button to be enabled */
  async waitForNextEnabled(timeout: number = 15_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const next = buttons.find(
          b => b.textContent?.trim().toLowerCase() === 'continuer',
        )
        return next !== null && !next.disabled
      },
      { timeout, polling: 500 },
    )
  }

  /** Check if the Continue button is enabled */
  async isNextButtonEnabled(): Promise<boolean> {
    return this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const next = buttons.find(
        b => b.textContent?.trim().toLowerCase() === 'continuer',
      )
      return next !== null && !next.disabled
    })
  }

  // ─── Step 1: Property Selection ─────────────────────────

  /** Select the first available property (building or lot) on step 1 */
  async selectFirstProperty(): Promise<void> {
    // Wait for PropertySelector cards to load
    await this.page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('button')
        return Array.from(buttons).some(
          b => b.textContent?.trim() === 'Sélectionner',
        )
      },
      { timeout: 30_000, polling: 500 },
    )

    // Click the first "Sélectionner" button
    await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim() === 'Sélectionner') {
          btn.click()
          return
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // ─── Step 2: Intervention Details ───────────────────────

  /** Fill the title field */
  async fillTitle(title: string): Promise<void> {
    // Find by placeholder
    const input = await this.page.$(
      'input[placeholder*="Fuite"], input[placeholder*="fuite"], input[placeholder*="Ex:"]',
    )
    if (input) {
      await input.click({ clickCount: 3 })
      await input.type(title, { delay: 20 })
    } else {
      // Fallback: find the first text input in the form
      await this.page.evaluate((t: string) => {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])')
        for (const inp of inputs) {
          const placeholder = (inp as HTMLInputElement).placeholder || ''
          if (placeholder.toLowerCase().includes('fuite') || placeholder.toLowerCase().includes('ex:')) {
            (inp as HTMLInputElement).focus();
            (inp as HTMLInputElement).value = '';
            (inp as HTMLInputElement).value = t
            inp.dispatchEvent(new Event('input', { bubbles: true }))
            inp.dispatchEvent(new Event('change', { bubbles: true }))
            return
          }
        }
      }, title)
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /** Select the intervention type from the combobox */
  async selectType(typeLabel: string): Promise<void> {
    // Click the combobox trigger
    await this.page.evaluate(() => {
      const triggers = document.querySelectorAll('button[role="combobox"]')
      for (const t of triggers) {
        if (t.textContent?.includes('catégorie') || t.textContent?.includes('type')) {
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

  /** Select urgency level from dropdown */
  async selectUrgency(level: string): Promise<void> {
    // Click the urgency select trigger
    await this.page.evaluate(() => {
      const labels = document.querySelectorAll('label')
      for (const label of labels) {
        if (label.textContent?.toLowerCase().includes('urgence')) {
          const trigger = label.parentElement?.querySelector('button[role="combobox"], select, [data-radix-select-trigger]')
          if (trigger) (trigger as HTMLElement).click()
          return
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 300))

    // Click the matching option
    await this.page.evaluate((text: string) => {
      const options = document.querySelectorAll('[role="option"]')
      for (const opt of options) {
        if (opt.textContent?.toLowerCase().includes(text.toLowerCase())) {
          (opt as HTMLElement).click()
          return
        }
      }
    }, level)
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /** Fill the description textarea */
  async fillDescription(description: string): Promise<void> {
    const textarea = await this.page.$(
      'textarea[placeholder*="intervention"], textarea[placeholder*="Décrivez"]',
    )
    if (textarea) {
      await textarea.click()
      await textarea.type(description, { delay: 10 })
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  /** Fill all step 2 fields at once */
  async fillDetails(opts: {
    title?: string
    type?: string
    urgency?: string
    description?: string
  }): Promise<void> {
    if (opts.title) await this.fillTitle(opts.title)
    if (opts.type) await this.selectType(opts.type)
    if (opts.urgency) await this.selectUrgency(opts.urgency)
    if (opts.description) await this.fillDescription(opts.description)
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
          text.includes('Intervention créée avec succès') ||
          text.includes('créée avec succès') ||
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
      () => window.location.href.includes('/gestionnaire/interventions/'),
      { timeout, polling: 500 },
    )
    return this.page.url()
  }
}
