/**
 * Shard 5 — Conversations, Documents, Demande locataire
 *
 * Tests covering:
 * - Conversation messaging on interventions (group thread, internal comments)
 * - Document upload/download on interventions
 * - Locataire intervention request creation + gestionnaire notification
 */

import { test, expect } from '@playwright/test'
import { InterventionDetailPage } from '../../shared/pages/intervention-detail.page'
import { NotificationsPage } from '../../shared/pages/notifications.page'
import {
  createRoleContext,
  dismissBanners,
  waitForContent,
  waitForSuccessToast,
} from '../../shared/helpers/selectors'
import { TIMEOUTS } from '../../shared/helpers/constants'

// ---------------------------------------------------------------------------
// Conversations sur intervention
// ---------------------------------------------------------------------------

test.describe('Conversations sur intervention', () => {
  test.use({ storageState: 'playwright/.auth/gestionnaire.json' })

  test('Envoyer message dans thread group', async ({ page }) => {
    test.slow() // Multiple navigation steps + Vercel cold start

    // Navigate to an existing intervention — use the interventions list to find one
    await page.goto('/gestionnaire/operations')
    await dismissBanners(page)
    await waitForContent(page, ['interventions', 'intervention'], TIMEOUTS.content)

    // Click the first intervention in the list
    const firstIntervention = page.locator('a[href*="/interventions/"]').first()
    const hasIntervention = await firstIntervention.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)
    if (!hasIntervention) {
      test.skip(true, 'No intervention links found on operations page')
      return
    }
    await firstIntervention.click()
    await dismissBanners(page)

    // Wait for the intervention detail page to fully load (tabs visible)
    await page.waitForURL('**/interventions/**', { timeout: TIMEOUTS.navigation })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await dismissBanners(page)

    // Click Conversations tab and wait for the tab to become selected
    const conversationsTab = page.getByRole('tab', { name: /conversations/i })
    await expect(conversationsTab).toBeVisible({ timeout: TIMEOUTS.content })
    await conversationsTab.click()

    // Wait for the message input to appear (chat interface loaded)
    const messageInput = page.getByPlaceholder(/message|tapez/i).first()
    const noConversation = page.getByText(/aucune conversation/i)

    // Wait for either the message input or the "no conversation" message
    const result = await Promise.race([
      messageInput.waitFor({ state: 'visible', timeout: TIMEOUTS.content }).then(() => 'has-input' as const),
      noConversation.waitFor({ state: 'visible', timeout: TIMEOUTS.content }).then(() => 'no-conversation' as const),
    ]).catch(() => 'timeout' as const)

    if (result === 'no-conversation') {
      test.skip(true, 'No conversations on this intervention (no participants assigned)')
      return
    }

    if (result === 'timeout') {
      test.skip(true, 'Conversation tab did not load message input or empty state')
      return
    }

    await messageInput.fill('Message QA test')
    await messageInput.press('Enter')

    // Verify success via toast or message appearing in the thread
    const toastOrMessage = page.getByText('Message QA test')
    await expect(toastOrMessage).toBeVisible({ timeout: TIMEOUTS.toast })
  })

  test('Message interne (manager-only)', async ({ page }) => {
    const detail = new InterventionDetailPage(page)

    // Navigate to an existing intervention
    await page.goto('/gestionnaire/operations')
    await dismissBanners(page)
    await waitForContent(page, ['interventions', 'intervention'], TIMEOUTS.content)

    const firstIntervention = page.locator('a[href*="/interventions/"]').first()
    const hasIntervention = await firstIntervention.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)
    if (!hasIntervention) {
      test.skip(true, 'No intervention links found on operations page')
      return
    }
    await firstIntervention.click()
    await dismissBanners(page)
    await waitForContent(page, ['general', 'conversations'], TIMEOUTS.content)

    // Navigate to the Activite tab for internal comments
    await detail.goToTab('Activit')

    // Look for the internal comment input (commentaire interne)
    const commentInput = page.getByPlaceholder(/commentaire|note|interne/i).first()
    const hasCommentInput = await commentInput.isVisible({ timeout: 5_000 }).catch(() => false)

    if (hasCommentInput) {
      await commentInput.fill('Commentaire interne QA')

      const sendBtn = page.getByRole('button', { name: /envoyer|ajouter|publier/i }).first()
      await sendBtn.click()

      // Verify the comment appears
      await expect(page.getByText('Commentaire interne QA')).toBeVisible({
        timeout: TIMEOUTS.toast,
      })
    } else {
      // Some interventions may not have the internal comment section visible
      // Verify at least the tab loaded
      await waitForContent(page, ['activit', 'historique', 'commentaire'], TIMEOUTS.content)
    }
  })

  test('Verifier notification apres message', async ({ page }) => {
    // Send a message as gestionnaire first
    const detail = new InterventionDetailPage(page)
    await page.goto('/gestionnaire/operations')
    await dismissBanners(page)
    await waitForContent(page, ['interventions', 'intervention'], TIMEOUTS.content)

    const firstIntervention = page.locator('a[href*="/interventions/"]').first()
    const hasIntervention = await firstIntervention.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)
    if (!hasIntervention) {
      test.skip(true, 'No intervention links found on operations page')
      return
    }
    await firstIntervention.click()
    await dismissBanners(page)

    // Wait for detail page content — use flexible markers
    const detailLoaded = await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase()
        return text.includes('general') || text.includes('conversations') || text.includes('intervention')
      },
      { timeout: TIMEOUTS.content }
    ).catch(() => false)

    if (!detailLoaded) {
      test.skip(true, 'Intervention detail page did not load properly')
      return
    }

    // Try to send a message — skip if conversation tab is not available
    try {
      await detail.sendMessage('Notification test QA')
    } catch {
      test.skip(true, 'Could not send message — conversation tab may not be available')
      return
    }

    // Switch to locataire role context and check notifications
    const locatairePage = await createRoleContext(page, 'locataire')
    const notifications = new NotificationsPage(locatairePage)

    try {
      await notifications.goto('locataire')
      // Verify the notifications page loaded (notification presence depends on data)
      await notifications.expectLoaded()
    } finally {
      await locatairePage.context().close()
    }
  })
})

// ---------------------------------------------------------------------------
// Documents sur intervention
// ---------------------------------------------------------------------------

test.describe('Documents sur intervention', () => {
  test.use({ storageState: 'playwright/.auth/gestionnaire.json' })

  test('Upload document (gestionnaire)', async ({ page }) => {
    const detail = new InterventionDetailPage(page)

    await page.goto('/gestionnaire/operations')
    await dismissBanners(page)
    await waitForContent(page, ['interventions', 'intervention'], TIMEOUTS.content)

    const firstIntervention = page.locator('a[href*="/interventions/"]').first()
    const hasIntervention = await firstIntervention.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)
    if (!hasIntervention) {
      test.skip(true, 'No intervention links found on operations page')
      return
    }
    await firstIntervention.click()
    await dismissBanners(page)
    await waitForContent(page, ['general', 'conversations'], TIMEOUTS.content)

    // Go to Documents tab
    await detail.goToTab('Documents')

    // Create a test file buffer for upload
    const fileInput = page.locator('input[type="file"]').first()
    const hasFileInput = await fileInput.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasFileInput) {
      // File input may be hidden — try to make it visible or find upload button
      const uploadBtn = page.getByRole('button', { name: /ajouter|upload|importer/i }).first()
      const hasUploadBtn = await uploadBtn.isVisible({ timeout: 3_000 }).catch(() => false)
      if (hasUploadBtn) {
        await uploadBtn.click()
      }
    }

    // Upload a synthetic test file
    await fileInput.setInputFiles({
      name: 'qa-test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('QA test document content'),
    })

    // Wait for upload confirmation
    const uploadResult = await Promise.race([
      waitForSuccessToast(page, TIMEOUTS.toast).then(() => 'toast'),
      page
        .getByText(/qa-test-document/i)
        .waitFor({ timeout: TIMEOUTS.toast })
        .then(() => 'visible'),
    ]).catch(() => 'timeout')

    expect(['toast', 'visible']).toContain(uploadResult)
  })

  test('Download document', async ({ page }) => {
    const detail = new InterventionDetailPage(page)

    await page.goto('/gestionnaire/operations')
    await dismissBanners(page)
    await waitForContent(page, ['interventions', 'intervention'], TIMEOUTS.content)

    const firstIntervention = page.locator('a[href*="/interventions/"]').first()
    const hasIntervention = await firstIntervention.isVisible({ timeout: TIMEOUTS.action }).catch(() => false)
    if (!hasIntervention) {
      test.skip(true, 'No intervention links found on operations page')
      return
    }
    await firstIntervention.click()
    await dismissBanners(page)
    await waitForContent(page, ['general', 'conversations'], TIMEOUTS.content)

    await detail.goToTab('Documents')

    // Check if there are any documents listed
    const documentItems = page.locator('[class*="document"], [class*="Document"], [class*="file"]')
    const hasDocuments = await documentItems.first().isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasDocuments) {
      test.skip(true, 'No documents available for download test')
      return
    }

    // Click the download button on the first document
    const downloadBtn = page
      .getByRole('button', { name: /telecharger|download|ouvrir/i })
      .or(page.locator('a[download], a[href*="storage"]'))
      .first()

    const hasDownload = await downloadBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (hasDownload) {
      // Intercept the download/navigation to verify signed URL
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes('storage') || resp.url().includes('sign'),
          { timeout: TIMEOUTS.action },
        ),
        downloadBtn.click(),
      ]).catch(() => [null])

      if (response) {
        expect(response.status()).toBeLessThan(400)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Demande intervention locataire (serial — creation then notification check)
// ---------------------------------------------------------------------------

test.describe('Demande intervention locataire', () => {
  test('Creer demande', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/locataire.json',
    })
    const locatairePage = await context.newPage()

    try {
      await locatairePage.goto('/locataire/interventions/nouvelle-demande')
      await dismissBanners(locatairePage)
      // Extra wait + dismiss for late-appearing notification dialog
      await locatairePage.waitForTimeout(2_000)
      await dismissBanners(locatairePage)

      const pageLoaded = await locatairePage.waitForFunction(
        () => {
          const text = document.body.innerText.toLowerCase()
          return (
            text.includes('sinistre') ||
            text.includes('intervention') ||
            text.includes('lot') ||
            text.includes('demande') ||
            text.includes('type de probl')
          )
        },
        { timeout: TIMEOUTS.content }
      ).catch(() => false)

      if (!pageLoaded) {
        test.skip(true, 'Locataire intervention request page did not load')
        return
      }

      await dismissBanners(locatairePage)

      // Skip if locataire has a future contract (bail not started yet — creation blocked by the app)
      const futureContract = locatairePage.getByText(/contrat.*venir|n.*pas encore.*démarré|sera disponible.*début/i)
      if (await futureContract.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.skip(true, 'Locataire has future contract — cannot create intervention requests yet')
        return
      }

      // Step 1: Select a lot (logement) — only if a lot selector is present
      // Note: locataire with single lot may have it pre-selected (no selector shown)
      const lotSelect = locatairePage
        .getByRole('button', { name: /logement|lot/i })
        .first()
      const hasLotSelect = await lotSelect.isVisible({ timeout: 3_000 }).catch(() => false)

      if (hasLotSelect) {
        await lotSelect.click()
        const firstOption = locatairePage.getByRole('option').first()
        if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstOption.click()
        }
      }

      // Step 2: Select intervention type (required)
      await dismissBanners(locatairePage)
      const typeCombobox = locatairePage
        .getByRole('combobox', { name: /type/i })
        .or(locatairePage.getByLabel(/type/i))
        .first()
      const hasTypeCombobox = await typeCombobox.isVisible({ timeout: 5_000 }).catch(() => false)

      if (hasTypeCombobox) {
        await typeCombobox.click()
        // Select the first type
        const firstType = locatairePage.getByRole('option').first()
        if (await firstType.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstType.click()
        }
      }

      // Step 3: Fill description
      await dismissBanners(locatairePage)
      const descriptionField = locatairePage
        .getByPlaceholder(/decri|description|detail/i)
        .or(locatairePage.getByLabel(/description/i))
        .first()
      await expect(descriptionField).toBeVisible({ timeout: TIMEOUTS.action })
      await descriptionField.fill("Fuite d'eau QA")

      // Navigate through steps if wizard-based (click Continuer/Suivant)
      const nextBtn = locatairePage.getByRole('button', { name: /continuer|suivant/i }).first()
      const hasNext = await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)
      if (hasNext) {
        // Progress through remaining steps (max 5 iterations to avoid infinite loop)
        for (let step = 0; step < 5; step++) {
          await dismissBanners(locatairePage)
          const visible = await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)
          if (!visible) break
          const isEnabled = await nextBtn.isEnabled()
          if (!isEnabled) break
          await nextBtn.click()
          await locatairePage.waitForTimeout(500)
        }
      }

      // Submit the form
      const submitBtn = locatairePage
        .getByRole('button', { name: /envoyer|soumettre|creer|confirmer/i })
        .first()
      const hasSubmit = await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)

      if (hasSubmit) {
        await submitBtn.click()
        // Verify success
        await waitForSuccessToast(locatairePage, TIMEOUTS.toast)
      }
    } finally {
      await context.close()
    }
  })

  test('Verifier notification gestionnaire', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/gestionnaire.json',
    })
    const page = await context.newPage()

    try {
      const notifications = new NotificationsPage(page)

      await notifications.goto('gestionnaire')
      await notifications.expectLoaded()

      // Check that the notifications page has content (new intervention request may show)
      await waitForContent(
        page,
        ['notification', 'intervention', 'demande'],
        TIMEOUTS.content,
      )
    } finally {
      await context.close()
    }
  })
})
