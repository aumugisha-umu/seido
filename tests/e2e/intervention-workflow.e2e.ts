/**
 * E2E test — Intervention Approve/Reject Workflow (E-003)
 *
 * Tests gestionnaire actions on intervention detail page:
 * - Approve an intervention (demande → approuvee) by clicking "Traiter demande"
 * - Verify approved intervention shows "Planifier" action
 * - Cancel an intervention (approuvee → annulee) by clicking "Annuler"
 * - Verify contacts (provider + locataire) are visible on intervention detail
 *
 * Uses createFullTestIntervention to create interventions with proper
 * assignments (provider, locataire, gestionnaire) and conversation threads.
 *
 * NOTE: These tests require:
 * - A running dev server (localhost:3000)
 * - Valid Supabase service role key in .env.local
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPage, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissAllBanners } from './helpers/cookies'
import { InterventionDetailPage } from './pages/intervention-detail.page'
import { getBaseUrl, TEST_ACCOUNTS } from '../fixtures/test-accounts'
import {
  createFullTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestIntervention,
  cleanupTestInterventions,
} from '../integration/helpers/test-data'

describe('Intervention Workflow Actions', () => {
  let page: Page
  let detail: InterventionDetailPage
  let teamId: string
  let lotId: string
  let gestUserId: string
  let providerId: string
  let locataireId: string

  beforeAll(async () => {
    // Set up test data lookups — use EXACT email matches to ensure
    // DB user IDs align with browser-authenticated sessions.
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId(TEST_ACCOUNTS.gestionnaire.email)
    providerId = await getTestUserId(TEST_ACCOUNTS.prestataire.email)
    locataireId = await getTestUserId(TEST_ACCOUNTS.locataire.email)

    // Set up browser
    page = await newPage()
    detail = new InterventionDetailPage(page)

    const baseUrl = getBaseUrl()
    await page.goto(`${baseUrl}/gestionnaire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await dismissAllBanners(page)
  })

  afterAll(async () => {
    await cleanupTestInterventions()
    await page?.close()
    await closeBrowser()
  })

  // ═══════════════════════════════════════════════════════════
  // Verify assigned contacts appear on detail page
  // ═══════════════════════════════════════════════════════════

  it('should show assigned contacts on the intervention detail page', async () => {
    try {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: `E2E Workflow: Contacts ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // Click on the Contacts tab
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"], button'))
        const contactTab = tabs.find(t =>
          t.textContent?.toLowerCase().includes('contacts'),
        )
        if (contactTab) (contactTab as HTMLElement).click()
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Should have contact-related content
      const pageText = await detail.getPageText()
      const hasContacts =
        pageText.toLowerCase().includes('prestataire') ||
        pageText.toLowerCase().includes('locataire') ||
        pageText.toLowerCase().includes('gestionnaire')
      expect(hasContacts).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'workflow-contacts')
      throw error
    }
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire processes a request (demande → approve)
  // ═══════════════════════════════════════════════════════════

  it('should show "Traiter demande" and complete 2-step approval', async () => {
    try {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: `E2E Workflow: Approve ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // Wait specifically for the "Traiter demande" button to render.
      // Action buttons load AFTER the page shell (Server Component streaming),
      // so we poll rather than instant-check.
      await page.waitForFunction(
        () => document.body.innerText.toLowerCase().includes('traiter la demande'),
        { timeout: 15_000, polling: 500 },
      )

      // Click "Traiter demande"
      await detail.clickProcessRequest()

      // Wait for the dialog/modal to appear
      await detail.waitForDialog(10_000)

      // Complete the 2-step approval flow:
      // Step 1: "Approuver" → transitions to confirm view
      // Step 2: "Confirmer l'approbation" → actually approves
      await detail.completeApprovalFlow()

      // Poll DB for up to 20s — the server action may take several seconds.
      // The confirm button shows "Traitement..." spinner during the API call.
      let finalStatus = 'demande'
      for (let poll = 0; poll < 20; poll++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const updated = await getTestIntervention(intervention.id)
        if (updated.status !== 'demande') {
          finalStatus = updated.status
          break
        }
      }
      expect(finalStatus).toBe('approuvee')
    } catch (error) {
      await screenshotOnFailure(page, 'workflow-approve')
      throw error
    }
  })

  // ═══════════════════════════════════════════════════════════
  // Approved intervention shows "Planifier" action
  // ═══════════════════════════════════════════════════════════

  it('should show "Planifier" button for approved intervention with contacts', async () => {
    try {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: `E2E Workflow: Planifier ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      const hasButton = await detail.hasContent('Planifier')
      expect(hasButton).toBe(true)
    } catch (error) {
      await screenshotOnFailure(page, 'workflow-planifier-button')
      throw error
    }
  })

  // ═══════════════════════════════════════════════════════════
  // Cancel an approved intervention
  // ═══════════════════════════════════════════════════════════

  it('should cancel an approved intervention via kebab menu "Annuler"', async () => {
    try {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: `E2E Workflow: Cancel ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // "Annuler" is inside the kebab (⋮) dropdown menu, not visible until opened.
      // clickCancel() opens the kebab menu and clicks "Annuler" inside it.
      await detail.clickCancel()

      // Wait for cancellation dialog
      await detail.waitForDialog(10_000)

      // Fill the required cancellation reason (min 10 chars)
      await detail.fillDialogComment('Annulation test E2E — raison du test automatique.')

      // Confirm cancellation
      await detail.clickDialogConfirm()

      // Wait for status update
      await detail.waitForStatusUpdate(30_000)

      // Verify in DB
      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('annulee')
    } catch (error) {
      await screenshotOnFailure(page, 'workflow-cancel')
      throw error
    }
  })

  // ═══════════════════════════════════════════════════════════
  // Terminal status shows no action buttons
  // ═══════════════════════════════════════════════════════════

  it('should show no action buttons for terminal status (annulee)', async () => {
    try {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'annulee',
        title: `E2E Workflow: Terminal ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // Terminal status — no action buttons
      const hasPlanifier = await detail.hasContent('Planifier')
      const hasCloturer = await detail.hasContent('Clôturer')
      const hasTraiter = await detail.hasContent('Traiter demande')
      expect(hasPlanifier).toBe(false)
      expect(hasCloturer).toBe(false)
      expect(hasTraiter).toBe(false)
    } catch (error) {
      await screenshotOnFailure(page, 'workflow-terminal')
      throw error
    }
  })
})
