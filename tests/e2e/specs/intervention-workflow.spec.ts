/**
 * Playwright E2E — Intervention Approve/Reject Workflow (gestionnaire)
 *
 * Rewrite of intervention-workflow.e2e.ts (Puppeteer).
 * Tests gestionnaire actions on intervention detail page:
 * - Verify assigned contacts appear on detail page
 * - Approve an intervention (demande -> approuvee) via "Traiter demande"
 * - Verify approved intervention shows "Planifier" action
 * - Cancel an intervention (approuvee -> annulee) via kebab menu
 * - Verify no action buttons for terminal status (annulee)
 *
 * Uses storageState-based auth for gestionnaire role.
 */

import { test, expect } from '@playwright/test'
import { InterventionDetailPage } from '../../shared/pages'
import { dismissBanners } from '../../shared/helpers/selectors'
import { TEST_ACCOUNTS } from '../../shared/fixtures/test-accounts'
import {
  createFullTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestIntervention,
  cleanupTestInterventions,
} from '../../integration/helpers/test-data'

test.describe('Intervention Workflow Actions', () => {
  let detail: InterventionDetailPage
  let teamId: string
  let lotId: string
  let gestUserId: string
  let providerId: string
  let locataireId: string

  test.beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId(TEST_ACCOUNTS.gestionnaire.email)
    providerId = await getTestUserId(TEST_ACCOUNTS.prestataire.email)
    locataireId = await getTestUserId(TEST_ACCOUNTS.locataire.email)
  })

  test.beforeEach(async ({ page }) => {
    detail = new InterventionDetailPage(page)

    await page.goto('/gestionnaire/dashboard', { waitUntil: 'domcontentloaded' })
    await dismissBanners(page)
  })

  test.afterAll(async () => {
    await cleanupTestInterventions()
  })

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

    await detail.goto('gestionnaire', intervention.id)

    // Click on the Contacts tab
    await page.getByRole('tab', { name: /contacts|participants/i }).click()
    await page.waitForTimeout(1500)

    // Should have contact-related content
    await expect(
      page.getByText(/prestataire|locataire|gestionnaire/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('should show "Traiter demande" and complete 2-step approval', async ({ page }) => {
    test.slow()

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

    await detail.goto('gestionnaire', intervention.id)

    // Wait for the "Traiter la demande" button to render (streamed after page shell)
    await expect(
      page.getByText(/traiter la demande/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // Use the POM approve() method which handles the full 3-step flow
    await detail.approve()

    // Poll DB for up to 20s — the server action may take several seconds
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

  test('should show "Planifier" button for approved intervention with contacts', async ({ page }) => {
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

    await detail.goto('gestionnaire', intervention.id)

    await expect(
      page.getByRole('button', { name: /planifier/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('should cancel an approved intervention via kebab menu "Annuler"', async ({ page }) => {
    test.slow()

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

    await detail.goto('gestionnaire', intervention.id)

    // Use the POM cancel() method which handles kebab menu + reason + confirm
    await detail.cancel('Annulation test E2E — raison du test automatique.')

    // Wait for the status update toast
    await detail.expectStatusUpdate()

    // Verify in DB
    const updated = await getTestIntervention(intervention.id)
    expect(updated.status).toBe('annulee')
  })

  test('should show no action buttons for terminal status (annulee)', async ({ page }) => {
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

    await detail.goto('gestionnaire', intervention.id)

    // Terminal status — no action buttons should be visible
    await expect(page.getByRole('button', { name: /planifier/i })).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: /clôturer/i })).not.toBeVisible({ timeout: 3_000 })
    await expect(page.getByRole('button', { name: /traiter demande/i })).not.toBeVisible({ timeout: 3_000 })
  })
})
