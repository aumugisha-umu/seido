/**
 * E2E test — Full Intervention Lifecycle (Playwright, Multi-Role)
 *
 * Tests the complete intervention lifecycle with proper assignments:
 *
 * 1. Creates FULLY POPULATED interventions via DB with:
 *    - Gestionnaire, Prestataire, and Locataire assigned
 *    - Conversation threads (group, provider_to_managers, tenant_to_managers)
 *    - Time slots for planning
 *
 * 2. Gestionnaire views detail page -- verifies contacts, conversations, action buttons
 * 3. Gestionnaire clicks "Traiter demande" -> "Approuver" (UI -> DB transition)
 * 4. Cross-role: locataire + prestataire view assigned intervention detail
 *
 * NOTE: Requires running dev server + .env.local with Supabase creds.
 *
 * Multi-role tests use browser.newContext() with different storageStates
 * to simulate different authenticated users within the same test.
 */

import { test, expect, type Browser } from '@playwright/test'
import { AUTH_FILES } from '../../setup/auth.setup'
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

test.describe('Intervention Lifecycle (Multi-Role)', () => {
  let teamId: string
  let lotId: string
  let gestUserId: string
  let providerId: string
  let locataireId: string

  test.beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    // CRITICAL: Use EXACT email-based lookups so the DB user IDs match
    // the browser-authenticated users (from storageState cookies).
    gestUserId = await getTestUserId(TEST_ACCOUNTS.gestionnaire.email)
    providerId = await getTestUserId(TEST_ACCOUNTS.prestataire.email)
    locataireId = await getTestUserId(TEST_ACCOUNTS.locataire.email)
  })

  test.afterAll(async () => {
    await cleanupTestInterventions()
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire views fully populated intervention at each status
  // ═══════════════════════════════════════════════════════════

  test.describe('Gestionnaire view with assigned contacts', () => {
    test('demande: shows "Traiter demande" + assigned contacts visible', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: `Lifecycle: demande ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)
      const hasAction = await detail.hasContent('Traiter demande')
      expect(hasAction).toBe(true)

      // Verify the Contacts tab exists and page shows contact count
      const pageText = await detail.getPageText()
      const hasContacts = pageText.toLowerCase().includes('contacts')
      expect(hasContacts).toBe(true)
    })

    test('approuvee: shows "Planifier" action', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: `Lifecycle: approuvee ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // Poll for the "Planifier" button -- action buttons render AFTER the
      // page shell (Server Component streaming).
      await expect(
        page.getByText(/planifier/i).first(),
      ).toBeVisible({ timeout: 15_000 })
    })

    test('planifiee: shows "Cloturer" action with time slots', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'planifiee',
        title: `Lifecycle: planifiee ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
        withTimeSlots: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)
      const hasAction = await detail.hasContent('Clôturer')
      expect(hasAction).toBe(true)
    })

    test('cloturee_par_prestataire: shows "Cloturer" action', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'cloturee_par_prestataire',
        title: `Lifecycle: cloturee_prest ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)
      const hasAction = await detail.hasContent('Clôturer')
      expect(hasAction).toBe(true)
    })

    test('annulee: shows no action buttons', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'annulee',
        title: `Lifecycle: annulee ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      const hasPlanifier = await detail.hasContent('Planifier')
      const hasCloturer = await detail.hasContent('Clôturer')
      const hasTraiter = await detail.hasContent('Traiter demande')
      expect(hasPlanifier).toBe(false)
      expect(hasCloturer).toBe(false)
      expect(hasTraiter).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire approves and the status persists in DB
  // ═══════════════════════════════════════════════════════════

  test.describe('Gestionnaire approve action (UI -> DB)', () => {
    test('clicking "Traiter demande" -> "Approuver" -> "Confirmer" changes status to approuvee', async ({ page }) => {
      const detail = new InterventionDetailPage(page)
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: `Lifecycle: approve via UI ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
      })

      await detail.navigateTo('gestionnaire', intervention.id)

      // Wait for "Traiter demande" button to render (action buttons stream after shell)
      await expect(
        page.getByText(/traiter la demande/i).first(),
      ).toBeVisible({ timeout: 15_000 })

      // Click "Traiter demande"
      await detail.clickProcessRequest()
      await detail.waitForDialog(10_000)

      // Complete the 2-step approval flow
      await detail.completeApprovalFlow()

      // Wait for the API call to complete: poll DB for up to 20s.
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
  })

  // ═══════════════════════════════════════════════════════════
  // Cross-role: locataire + prestataire can view intervention detail
  // ═══════════════════════════════════════════════════════════

  test.describe('Cross-role detail page access', () => {
    let sharedInterventionId: string

    test.beforeAll(async () => {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'planifiee',
        title: `Lifecycle: cross-role ${Date.now()}`,
        providerId,
        locataireId,
        withConversations: true,
        withTimeSlots: true,
      })
      sharedInterventionId = intervention.id
    })

    test('locataire can view their assigned intervention detail', async ({ browser }) => {
      // Create a new context with locataire storageState
      const context = await browser.newContext({
        storageState: AUTH_FILES.locataire,
      })
      const locPage = await context.newPage()

      try {
        await locPage.goto('/locataire/dashboard', {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })

        // Navigate directly to intervention detail page
        const locDetail = new InterventionDetailPage(locPage)
        await locDetail.navigateTo('locataire', sharedInterventionId)

        // Poll for actual rendered content -- navigateTo finds tab markers in
        // the SSR shell, but React hydration may temporarily replace content
        // with loading skeletons. Wait for real text to appear.
        await expect(
          locPage.getByText(/général|conversations|description|localisation/i).first(),
        ).toBeVisible({ timeout: 20_000 })
      } finally {
        await context.close()
      }
    })

    test('prestataire can view their assigned intervention detail', async ({ browser }) => {
      // Create a new context with prestataire storageState
      const context = await browser.newContext({
        storageState: AUTH_FILES.prestataire,
      })
      const prestPage = await context.newPage()

      try {
        await prestPage.goto('/prestataire/dashboard', {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })

        // Navigate directly to intervention detail page
        const prestDetail = new InterventionDetailPage(prestPage)
        await prestDetail.navigateTo('prestataire', sharedInterventionId)

        // Poll for actual rendered content (same pattern as locataire test)
        await expect(
          prestPage.getByText(/général|conversations|description|localisation/i).first(),
        ).toBeVisible({ timeout: 20_000 })
      } finally {
        await context.close()
      }
    })
  })
})
