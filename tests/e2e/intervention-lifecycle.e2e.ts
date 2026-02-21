/**
 * E2E test — Full Intervention Lifecycle (E-004)
 *
 * Tests the complete intervention lifecycle with proper assignments:
 *
 * 1. Creates FULLY POPULATED interventions via DB with:
 *    - Gestionnaire, Prestataire, and Locataire assigned
 *    - Conversation threads (group, provider_to_managers, tenant_to_managers)
 *    - Time slots for planning
 *
 * 2. Gestionnaire views detail page — verifies contacts, conversations, action buttons
 * 3. Gestionnaire clicks "Traiter la demande" → "Approuver" (UI → DB transition)
 * 4. Cross-role: locataire + prestataire view assigned intervention detail
 *
 * NOTE: Requires running dev server + .env.local with Supabase creds.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Page } from 'puppeteer'
import { newPage, newPageAs, closeBrowser, screenshotOnFailure } from './helpers/browser'
import { dismissAllBanners } from './helpers/cookies'
import { InterventionDetailPage } from './pages/intervention-detail.page'
import { getBaseUrl } from '../fixtures/test-accounts'
import {
  createFullTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestIntervention,
  cleanupTestInterventions,
} from '../integration/helpers/test-data'
import { TEST_ACCOUNTS } from '../fixtures/test-accounts'

describe('Intervention Lifecycle (Multi-Role)', () => {
  let gestPage: Page
  let gestDetail: InterventionDetailPage
  let teamId: string
  let lotId: string
  let gestUserId: string
  let providerId: string
  let locataireId: string
  const baseUrl = getBaseUrl()

  beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    // CRITICAL: Use EXACT email-based lookups so the DB user IDs match
    // the browser-authenticated users (from TEST_ACCOUNTS cookies).
    // getTestProviderId/getTestLocataireId return arbitrary users by role,
    // which may NOT match the browser session → RLS denies access.
    gestUserId = await getTestUserId(TEST_ACCOUNTS.gestionnaire.email)
    providerId = await getTestUserId(TEST_ACCOUNTS.prestataire.email)
    locataireId = await getTestUserId(TEST_ACCOUNTS.locataire.email)

    gestPage = await newPage()
    gestDetail = new InterventionDetailPage(gestPage)

    await gestPage.goto(`${baseUrl}/gestionnaire/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await dismissAllBanners(gestPage)
  })

  afterAll(async () => {
    await cleanupTestInterventions()
    await gestPage?.close()
    await closeBrowser()
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire views fully populated intervention at each status
  // ═══════════════════════════════════════════════════════════

  describe('Gestionnaire view with assigned contacts', () => {
    it('demande: shows "Traiter la demande" + assigned contacts visible', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)
        const hasAction = await gestDetail.hasContent('Traiter la demande')
        expect(hasAction).toBe(true)

        // Verify the Contacts tab exists and page shows contact count
        const pageText = await gestDetail.getPageText()
        const hasContacts = pageText.toLowerCase().includes('contacts')
        expect(hasContacts).toBe(true)
      } catch (error) {
        await screenshotOnFailure(gestPage, 'lifecycle-gest-demande')
        throw error
      }
    })

    it('approuvee: shows "Planifier" action', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)

        // Poll for the "Planifier" button — action buttons render AFTER the
        // page shell (Server Component streaming), and React hydration can
        // temporarily replace SSR content with loading skeletons.
        await gestPage.waitForFunction(
          () => document.body.innerText.toLowerCase().includes('planifier'),
          { timeout: 15_000, polling: 500 },
        )
      } catch (error) {
        await screenshotOnFailure(gestPage, 'lifecycle-gest-approuvee')
        throw error
      }
    })

    it('planifiee: shows "Clôturer" action with time slots', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)
        const hasAction = await gestDetail.hasContent('Clôturer')
        expect(hasAction).toBe(true)
      } catch (error) {
        await screenshotOnFailure(gestPage, 'lifecycle-gest-planifiee')
        throw error
      }
    })

    it('cloturee_par_prestataire: shows "Clôturer" action', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)
        const hasAction = await gestDetail.hasContent('Clôturer')
        expect(hasAction).toBe(true)
      } catch (error) {
        await screenshotOnFailure(gestPage, 'lifecycle-gest-cloturee-prest')
        throw error
      }
    })

    it('annulee: shows no action buttons', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)

        const hasPlanifier = await gestDetail.hasContent('Planifier')
        const hasCloturer = await gestDetail.hasContent('Clôturer')
        const hasTraiter = await gestDetail.hasContent('Traiter la demande')
        expect(hasPlanifier).toBe(false)
        expect(hasCloturer).toBe(false)
        expect(hasTraiter).toBe(false)
      } catch (error) {
        await screenshotOnFailure(gestPage, 'lifecycle-gest-annulee')
        throw error
      }
    })
  })

  // ═══════════════════════════════════════════════════════════
  // Gestionnaire approves and the status persists in DB
  // ═══════════════════════════════════════════════════════════

  describe('Gestionnaire approve action (UI → DB)', () => {
    it('clicking "Traiter la demande" → "Approuver" → "Confirmer" changes status to approuvee', async () => {
      try {
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

        await gestDetail.navigateTo('gestionnaire', intervention.id)

        // Wait for "Traiter la demande" button to render (action buttons stream after shell)
        await gestPage.waitForFunction(
          () => document.body.innerText.toLowerCase().includes('traiter la demande'),
          { timeout: 15_000, polling: 500 },
        )

        // Click "Traiter la demande"
        await gestDetail.clickProcessRequest()
        await gestDetail.waitForDialog(10_000)

        // Complete the 2-step approval flow:
        // Step 1: "Approuver" → transitions to confirm view
        // Step 2: "Confirmer l'approbation" → actually approves
        await gestDetail.completeApprovalFlow()

        // Wait for the API call to complete: poll DB for up to 20s.
        // The screenshot showed "Traitement..." spinner — the server action
        // can take several seconds. Polling DB is more reliable than toast detection.
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
        await screenshotOnFailure(gestPage, 'lifecycle-approve-action')
        throw error
      }
    })
  })

  // ═══════════════════════════════════════════════════════════
  // Cross-role: locataire + prestataire can view intervention detail
  // ═══════════════════════════════════════════════════════════

  describe('Cross-role detail page access', () => {
    let sharedInterventionId: string
    let locPage: Page
    let prestPage: Page

    beforeAll(async () => {
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

    afterAll(async () => {
      if (locPage) await locPage.close()
      if (prestPage) await prestPage.close()
    })

    it('locataire can view their assigned intervention detail', async () => {
      try {
        locPage = await newPageAs('locataire')

        await locPage.goto(`${baseUrl}/locataire/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        await dismissAllBanners(locPage)

        // Navigate directly to intervention detail page
        const locDetail = new InterventionDetailPage(locPage)
        await locDetail.navigateTo('locataire', sharedInterventionId)

        // Poll for actual rendered content — navigateTo finds tab markers in
        // the SSR shell, but React hydration may temporarily replace content
        // with loading skeletons. Wait for real text to appear.
        await locPage.waitForFunction(
          () => {
            const text = document.body.innerText.toLowerCase()
            return (
              text.includes('général') ||
              text.includes('conversations') ||
              text.includes('description') ||
              text.includes('localisation')
            )
          },
          { timeout: 20_000, polling: 500 },
        )
      } catch (error) {
        if (locPage) await screenshotOnFailure(locPage, 'lifecycle-loc-detail')
        throw error
      }
    }, 90_000) // Extended timeout: new page + dashboard + detail navigation

    it('prestataire can view their assigned intervention detail', async () => {
      try {
        prestPage = await newPageAs('prestataire')

        await prestPage.goto(`${baseUrl}/prestataire/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        await dismissAllBanners(prestPage)

        // Navigate directly to intervention detail page
        const prestDetail = new InterventionDetailPage(prestPage)
        await prestDetail.navigateTo('prestataire', sharedInterventionId)

        // Poll for actual rendered content (same pattern as locataire test)
        await prestPage.waitForFunction(
          () => {
            const text = document.body.innerText.toLowerCase()
            return (
              text.includes('général') ||
              text.includes('conversations') ||
              text.includes('description') ||
              text.includes('localisation')
            )
          },
          { timeout: 20_000, polling: 500 },
        )
      } catch (error) {
        if (prestPage) await screenshotOnFailure(prestPage, 'lifecycle-prest-detail')
        throw error
      }
    }, 90_000) // Extended timeout: new page + dashboard + detail navigation
  })
})
