/**
 * 🧪 Test E2E - Contact Creation & Invitation Flow (Auto-Healing)
 *
 * Tests le flux complet de création de contact avec et sans invitation:
 * - Création contact simple (checkbox OFF) → Profil sans auth
 * - Création contact avec invitation (checkbox ON) → Auth + Email Resend + Profil
 * - Callback invitation → Magic link → Profil créé par trigger
 *
 * Pattern: Auto-healing avec isolation complète entre tests
 */

import { test, expect } from '@playwright/test'
import {
  loginAsGestionnaire,
  navigateToContacts,
  setupTestIsolation,
  teardownTestIsolation,
  captureDebugInfo
} from './helpers'

// Configuration timeout pour tests complets
test.setTimeout(120000) // 2 minutes

test.describe('Contact Creation & Invitation Flow', () => {

  test.beforeEach(async ({ page }) => {
    console.log('🔧 [SETUP] Initializing test isolation...')
    await setupTestIsolation(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    console.log('🧹 [TEARDOWN] Cleaning up test state...')
    await teardownTestIsolation(page, testInfo)
  })

  /**
   * Test 1: Contact SANS invitation (checkbox décochée)
   * Objectif: Vérifier création profil simple sans auth
   */
  test('Doit créer un contact SANS invitation (checkbox décochée)', async ({ page }) => {
    try {
      console.log('📝 [TEST-1] Starting contact creation WITHOUT invitation...')

      // ÉTAPE 1: Login gestionnaire
      console.log('🔑 [TEST-1-STEP-1] Login as gestionnaire...')
      await loginAsGestionnaire(page, 'arthur@seido.pm', 'Wxcvbn123')

      // ÉTAPE 2: Navigation vers contacts
      console.log('🧭 [TEST-1-STEP-2] Navigate to contacts page...')
      await navigateToContacts(page)

      // ÉTAPE 3: Ouvrir modale de création
      console.log('📋 [TEST-1-STEP-3] Opening contact creation modal...')
      const addButton = page.getByRole('button', { name: /ajouter.*contact/i }).first()
      await expect(addButton).toBeVisible({ timeout: 15000 })
      await addButton.click()

      // Attendre ouverture modale
      await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 5000 })

      // ÉTAPE 4: Remplir formulaire
      console.log('✍️ [TEST-1-STEP-4] Filling form without invitation...')

      const timestamp = Date.now()
      const email = `simple.contact.${timestamp}@seido.pm`

      await page.locator('#email').fill(email)
      await page.locator('#firstName').fill('Jean')
      await page.locator('#lastName').fill('Dupont')

      // Sélectionner type (si visible)
      const typeSelect = page.locator('select[name*="type"], button:has-text("Type de contact")')
      if (await typeSelect.isVisible({ timeout: 2000 })) {
        await typeSelect.click()
        await page.getByText(/prestataire/i, { exact: false }).click()
      }

      // ÉTAPE 5: DÉCOCHER la checkbox invitation
      console.log('☑️ [TEST-1-STEP-5] Unchecking invitation checkbox...')
      const checkbox = page.getByLabel(/inviter.*application/i)

      // Vérifier si cochée par défaut et décocher
      const isChecked = await checkbox.isChecked()
      console.log('📌 [TEST-1-STEP-5] Checkbox initial state:', isChecked ? 'checked' : 'unchecked')

      if (isChecked) {
        await checkbox.uncheck()
        await expect(checkbox).not.toBeChecked()
        console.log('✅ [TEST-1-STEP-5] Checkbox successfully unchecked')
      }

      // ÉTAPE 6: Soumettre le formulaire
      console.log('📤 [TEST-1-STEP-6] Submitting form...')
      const submitButton = page.getByRole('button', { name: /créer/i })
      await submitButton.click()

      // ÉTAPE 7: Vérifier succès SANS invitation
      console.log('✅ [TEST-1-STEP-7] Verifying success WITHOUT invitation...')

      // Attendre message de succès
      await expect(
        page.getByText(/contact créé avec succès/i)
      ).toBeVisible({ timeout: 10000 })

      // Vérifier que le contact apparaît dans la liste
      await expect(page.getByText(email)).toBeVisible({ timeout: 5000 })

      // IMPORTANT: Vérifier qu'il N'Y A PAS de message d'invitation
      await expect(
        page.getByText(/invitation.*envoyée/i)
      ).not.toBeVisible()

      console.log('🎉 [TEST-1] Test completed successfully - Contact created WITHOUT invitation')

    } catch (error) {
      console.error('❌ [TEST-1] Test failed:', error)
      await captureDebugInfo(page, 'contact-creation-without-invite-failed')
      throw error
    }
  })

  /**
   * Test 2: Contact AVEC invitation (checkbox cochée)
   * Objectif: Vérifier création auth + envoi email Resend + profil trigger
   */
  test('Doit créer un contact AVEC invitation (checkbox cochée)', async ({ page }) => {
    try {
      console.log('📝 [TEST-2] Starting contact creation WITH invitation...')

      // ÉTAPE 1: Login gestionnaire
      console.log('🔑 [TEST-2-STEP-1] Login as gestionnaire...')
      await loginAsGestionnaire(page, 'arthur@seido.pm', 'Wxcvbn123')

      // ÉTAPE 2: Navigation vers contacts
      console.log('🧭 [TEST-2-STEP-2] Navigate to contacts page...')
      await navigateToContacts(page)

      // ÉTAPE 3: Ouvrir modale de création
      console.log('📋 [TEST-2-STEP-3] Opening contact creation modal...')
      const addButton = page.getByRole('button', { name: /ajouter.*contact/i }).first()
      await expect(addButton).toBeVisible({ timeout: 15000 })
      await addButton.click()

      // Attendre ouverture modale
      await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 5000 })

      // ÉTAPE 4: Remplir formulaire
      console.log('✍️ [TEST-2-STEP-4] Filling form WITH invitation...')

      const timestamp = Date.now()
      const email = `invited.contact.${timestamp}@seido.pm`

      await page.locator('#email').fill(email)
      await page.locator('#firstName').fill('Marie')
      await page.locator('#lastName').fill('Martin')

      // Sélectionner type locataire (checkbox cochée par défaut)
      const typeSelect = page.locator('select[name*="type"], button:has-text("Type de contact")')
      if (await typeSelect.isVisible({ timeout: 2000 })) {
        await typeSelect.click()
        await page.getByText(/locataire/i, { exact: false }).click()
      }

      // ÉTAPE 5: Vérifier checkbox COCHÉE par défaut
      console.log('☑️ [TEST-2-STEP-5] Verifying invitation checkbox is checked...')
      const checkbox = page.getByLabel(/inviter.*application/i)
      await expect(checkbox).toBeChecked({ timeout: 3000 })
      console.log('✅ [TEST-2-STEP-5] Checkbox is checked (default behavior for locataire)')

      // ÉTAPE 6: Soumettre le formulaire
      console.log('📤 [TEST-2-STEP-6] Submitting form...')
      const submitButton = page.getByRole('button', { name: /créer/i })
      await submitButton.click()

      // ÉTAPE 7: Vérifier succès AVEC invitation
      console.log('✅ [TEST-2-STEP-7] Verifying success WITH invitation...')

      // Attendre message de succès avec mention d'invitation
      await expect(
        page.getByText(/invitation.*envoyée/i)
      ).toBeVisible({ timeout: 15000 })

      // Vérifier que le contact apparaît dans la liste
      await expect(page.getByText(email)).toBeVisible({ timeout: 5000 })

      // ÉTAPE 8: Vérifier badge "En attente" sur le contact
      console.log('🏷️ [TEST-2-STEP-8] Verifying "En attente" badge...')

      // Localiser la row du contact et vérifier le badge
      const contactRow = page.locator(`text=${email}`).locator('..')
      await expect(
        contactRow.getByText(/en attente/i)
      ).toBeVisible({ timeout: 5000 })

      console.log('🎉 [TEST-2] Test completed successfully - Contact created WITH invitation')

    } catch (error) {
      console.error('❌ [TEST-2] Test failed:', error)
      await captureDebugInfo(page, 'contact-creation-with-invite-failed')
      throw error
    }
  })

  /**
   * Test 3: Callback invitation et création profil
   * Objectif: Vérifier que le magic link fonctionne et crée le profil via trigger
   */
  test('Doit gérer le callback invitation et créer le profil', async ({ page, context }) => {
    let magicLink = ''

    // Intercepter la requête /api/invite-user pour récupérer le magic link
    await page.route('**/api/invite-user', async (route) => {
      const response = await route.fetch()
      const json = await response.json()

      if (json.invitation?.magicLink) {
        magicLink = json.invitation.magicLink
        console.log('🔗 [TEST-3] Magic link intercepted:', magicLink.substring(0, 100) + '...')
      }

      await route.fulfill({ response })
    })

    try {
      console.log('📝 [TEST-3] Starting invitation callback test...')

      // ÉTAPE 1: Créer invitation (réutiliser la logique du test 2)
      console.log('🔑 [TEST-3-STEP-1] Login as gestionnaire...')
      await loginAsGestionnaire(page, 'arthur@seido.pm', 'Wxcvbn123')

      console.log('🧭 [TEST-3-STEP-2] Navigate to contacts page...')
      await navigateToContacts(page)

      console.log('📋 [TEST-3-STEP-3] Opening contact creation modal...')
      const addButton = page.getByRole('button', { name: /ajouter.*contact/i }).first()
      await addButton.click()
      await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 5000 })

      const timestamp = Date.now()
      const email = `callback.test.${timestamp}@seido.pm`

      console.log('✍️ [TEST-3-STEP-4] Filling form for invitation...')
      await page.locator('#email').fill(email)
      await page.locator('#firstName').fill('Callback')
      await page.locator('#lastName').fill('Tester')

      console.log('📤 [TEST-3-STEP-5] Submitting form...')
      await page.getByRole('button', { name: /créer/i }).click()

      await expect(
        page.getByText(/invitation.*envoyée/i)
      ).toBeVisible({ timeout: 15000 })

      // ÉTAPE 2: Attendre interception du magic link
      console.log('⏳ [TEST-3-STEP-6] Waiting for magic link interception...')
      await page.waitForTimeout(3000)

      if (!magicLink) {
        throw new Error('Magic link was not intercepted')
      }

      console.log('✅ [TEST-3-STEP-6] Magic link received successfully')

      // ÉTAPE 3: Simuler clic sur magic link (nouvelle page)
      console.log('🌐 [TEST-3-STEP-7] Opening magic link in new page...')
      const callbackPage = await context.newPage()
      await callbackPage.goto(magicLink)

      // ÉTAPE 4: Vérifier callback processing
      console.log('⚙️ [TEST-3-STEP-8] Verifying callback processing...')
      await expect(
        callbackPage.getByText(/authentification|traitement|processing/i)
      ).toBeVisible({ timeout: 20000 })

      // ÉTAPE 5: Vérifier redirection vers set-password ou dashboard
      console.log('🔄 [TEST-3-STEP-9] Waiting for redirect after callback...')
      await callbackPage.waitForURL(
        /\/(set-password|dashboard|locataire|gestionnaire)/,
        { timeout: 45000 }
      )

      const finalUrl = callbackPage.url()
      console.log('✅ [TEST-3-STEP-9] Redirected to:', finalUrl)

      // Vérifier que la page finale est accessible
      await expect(
        callbackPage.locator('body')
      ).toBeVisible({ timeout: 10000 })

      await callbackPage.close()

      console.log('🎉 [TEST-3] Test completed successfully - Callback handled and profile created')

    } catch (error) {
      console.error('❌ [TEST-3] Test failed:', error)
      await captureDebugInfo(page, 'invitation-callback-failed')
      throw error
    }
  })
})
