/**
 * E2E test — Intervention Approve/Reject Workflow (Playwright)
 *
 * Tests gestionnaire actions on intervention detail page:
 * - Approve an intervention (demande -> approuvee) by clicking "Traiter demande"
 * - Verify approved intervention shows "Planifier" action
 * - Cancel an intervention (approuvee -> annulee) by clicking "Annuler"
 * - Verify contacts (provider + locataire) are visible on intervention detail
 *
 * Uses createFullTestIntervention to create interventions with proper
 * assignments (provider, locataire, gestionnaire) and conversation threads.
 *
 * NOTE: These tests require:
 * - A running dev server (localhost:3000)
 * - Valid Supabase service role key in .env.local
 */

import { test, expect } from '@playwright/test'
import { InterventionDetailPage } from '../../pages/intervention-detail.page.pw'
import { TEST_ACCOUNTS } from '../../../fixtures/test-accounts'
import {
  createFullTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestIntervention,
  cleanupTestInterventions,
} from '../../../integration/helpers/test-data'

test.describe('Intervention Workflow Actions', () => {
  let detail: InterventionDetailPage
  let teamId: string
  let lotId: string
  let gestUserId: string
  let providerId: string
  let locataireId: string

  test.beforeAll(async () => {
    // Set up test data lookups -- use EXACT email matches to ensure
    // DB user IDs align with browser-authenticated sessions.
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId(TEST_ACCOUNTS.gestionnaire.email)
    providerId = await getTestUserId(TEST_ACCOUNTS.prestataire.email)
    locataireId = await getTestUserId(TEST_ACCOUNTS.locataire.email)
  })

  test.beforeEach(async ({ page }) => {
    detail = new InterventionDetailPage(page)

    await page.goto('/gestionnaire/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
  })

  test.afterAll(async () => {
    await cleanupTestInterventions()
  })

  // ═══════════════════════════════════════════════════════════
  // Verify assigned contacts appear on detail page
  // ═══════════════════════════════════════════════════════════

  test('should show assigned contacts on the intervention detail page', async ({ page }) => {
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
    const contactTab = page
      .locator('[role="tab"], button')
      .filter({ hasText: /contacts/i })
      .first()
    await contactTab.click()
    await page.waitForTimeout(1500)

    // Should have contact-related content
    const pageText = await detail.getPageText()
    const hasContacts =
      pageText.toLowerCase().includes('prestataire') ||
      pageText.toLowerCase().includes('locataire') ||
      pageText.toLowerCase().includes('gestionnaire')
    expect(hasContacts).toBe(true)
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire processes a request (demande -> approve)
  // ═══════════════════════════════════════════════════════════

  test('should show "Traiter demande" and complete 2-step approval', async ({ page }) => {
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
    await expect(
      page.getByText(/traiter la demande/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // Click "Traiter demande"
    await detail.clickProcessRequest()

    // Wait for the dialog/modal to appear
    await detail.waitForDialog(10_000)

    // Complete the 2-step approval flow
    await detail.completeApprovalFlow()

    // Poll DB for up to 20s -- the server action may take several seconds.
    let finalStatus = 'demande'
    for (let poll = 0; poll < 20; poll++) {
      await page.waitForTimeout(1000)
      const updated = await getTestIntervention(intervention.id)
      if (updated.status !== 'demande') {
        finalStatus = updated.status
        break
      }
    }
    expect(finalStatus).toBe('approuvee')
  })

  // ═══════════════════════════════════════════════════════════
  // Approved intervention shows "Planifier" action
  // ═══════════════════════════════════════════════════════════

  test('should show "Planifier" button for approved intervention with contacts', async () => {
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
  })

  // ═══════════════════════════════════════════════════════════
  // Cancel an approved intervention
  // ═══════════════════════════════════════════════════════════

  test('should cancel an approved intervention via kebab menu "Annuler"', async ({ page }) => {
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

    // "Annuler" is inside the kebab dropdown menu
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
  })

  // ═══════════════════════════════════════════════════════════
  // Terminal status shows no action buttons
  // ═══════════════════════════════════════════════════════════

  test('should show no action buttons for terminal status (annulee)', async () => {
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

    // Terminal status -- no action buttons
    const hasPlanifier = await detail.hasContent('Planifier')
    const hasCloturer = await detail.hasContent('Clôturer')
    const hasTraiter = await detail.hasContent('Traiter demande')
    expect(hasPlanifier).toBe(false)
    expect(hasCloturer).toBe(false)
    expect(hasTraiter).toBe(false)
  })
})
