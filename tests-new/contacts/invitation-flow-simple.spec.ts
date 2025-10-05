/**
 * 🧪 Test E2E - Flow Complet d'Invitation (Simplifié)
 *
 * Ce test valide le flow complet :
 * 1. Gestionnaire crée une invitation via l'UI
 * 2. Récupération du magic link via API
 * 3. Navigation vers le magic link
 * 4. Vérification redirection → /auth/set-password
 * 5. Définition du mot de passe
 * 6. Vérification redirection → dashboard
 *
 * @fix Résolution du blocage callback avec race condition password_set
 */

import { test, expect } from '@playwright/test'
import {
  setupTestIsolation,
  teardownTestIsolation,
  loginAsGestionnaire
} from '../helpers'
import { getConfirmationLinkForEmail } from '../helpers/supabase-helpers'

// Helpers pour générer des données uniques
function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `test-invite-${timestamp}-${random}@seido.pm`
}

function generateTestName(): string {
  const timestamp = Date.now()
  return `Test Prestataire ${timestamp}`
}

test.describe('🔐 Invitation Flow - Simplified E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestIsolation(page)
  })

  test.afterEach(async ({ page }) => {
    await teardownTestIsolation(page)
  })

  test('✅ Complete invitation flow: Create → Accept → Set Password → Dashboard', async ({
    page
  }) => {
    const testEmail = generateTestEmail()
    const firstName = 'Test'
    const lastName = `Prestataire-${Date.now()}`

    console.log(`📧 Testing invitation for: ${testEmail}`)

    // STEP 1: Login as gestionnaire
    console.log('📍 STEP 1: Login as gestionnaire')
    await loginAsGestionnaire(page)
    await page.waitForTimeout(1000)

    // STEP 2: Navigate to contacts page and open form
    console.log('📍 STEP 2: Navigate to contacts and open invitation form')
    await page.goto('http://localhost:3000/gestionnaire/contacts')
    await page.waitForLoadState('networkidle')

    const addContactButton = page.locator('button:has-text("Ajouter un contact")')
    await expect(addContactButton).toBeVisible({ timeout: 10000 })
    await addContactButton.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    console.log('✅ Form opened')

    // STEP 3: Fill form and create invitation
    console.log('📍 STEP 3: Fill contact form with invitation')

    // Select type: Prestataire (no visibility check - Radix UI is hidden until clicked)
    const typeSelect = page.locator('button[role="combobox"]').first()
    await typeSelect.click()
    await page.waitForTimeout(500)

    const prestataireOption = page.locator('[role="option"]:has-text("Prestataire")')
    await prestataireOption.click()
    console.log('✅ Selected contact type: Prestataire')

    // Fill fields
    await page.fill('input#firstName', firstName)
    await page.fill('input#lastName', lastName)
    await page.fill('input#email', testEmail)
    await page.fill('input#phone', '+33612345678')
    await page.fill('textarea#notes', 'Test invitation flow E2E')
    console.log('✅ Form fields filled')

    // Ensure invitation checkbox is checked
    const inviteCheckbox = page.locator('button#inviteToApp[role="checkbox"]')
    await expect(inviteCheckbox).toBeVisible({ timeout: 5000 })

    const isChecked = await inviteCheckbox.getAttribute('data-state')
    console.log('📊 Checkbox state:', isChecked)

    if (isChecked !== 'checked') {
      await inviteCheckbox.click()
      console.log('✅ Checked invitation checkbox')
    } else {
      console.log('✅ Checkbox already checked')
    }

    await page.waitForTimeout(500)

    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Créer")')
    await submitButton.click()
    console.log('✅ Form submitted')

    await page.waitForTimeout(3000)

    // STEP 4: Get invitation link from Supabase
    console.log('📍 STEP 4: Fetching invitation link from Supabase')
    await page.waitForTimeout(2000) // Wait for invitation to be persisted

    const invitationLink = await getConfirmationLinkForEmail(testEmail)
    expect(invitationLink).toBeTruthy()
    console.log(`🔗 Invitation link retrieved: ${invitationLink!.substring(0, 50)}...`)

    // STEP 5: Logout as gestionnaire
    console.log('📍 STEP 5: Logout as gestionnaire')
    await page.goto('http://localhost:3000/auth/logout')
    await page.waitForTimeout(1000)

    // STEP 6: Navigate to invitation link (as invited user)
    console.log('📍 STEP 6: Navigate to invitation link')
    await page.goto(invitationLink!)

    // STEP 7: Wait for callback processing → redirect to set-password
    console.log('📍 STEP 7: Wait for redirect to /auth/set-password')
    await expect(page).toHaveURL(/\/auth\/set-password/, {
      timeout: 15000
    })
    console.log('✅ Successfully redirected to set-password page')

    // STEP 8: Set password
    console.log('📍 STEP 8: Setting password')
    const password = 'TestPassword123!'

    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)

    const setPasswordButton = page.getByRole('button', {
      name: /définir mon mot de passe/i
    })
    await setPasswordButton.click()

    // STEP 9: Verify redirect to dashboard
    console.log('📍 STEP 9: Verify redirect to dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    console.log('✅ Successfully redirected to dashboard')

    // Verify dashboard loaded
    await expect(page.getByText(/tableau de bord/i)).toBeVisible({
      timeout: 10000
    })

    console.log('✅ TEST PASSED: Complete invitation flow successful')
  })

  test('❌ Callback redirect loop validation (no infinite loop)', async ({
    page
  }) => {
    console.log('📍 TEST: Validating redirect loop detection')

    // Navigate to callback without valid session
    await page.goto('http://localhost:3000/auth/callback')

    // Wait 3 seconds and check URL
    await page.waitForTimeout(3000)

    const finalURL = page.url()
    console.log(`Final URL after 3s: ${finalURL}`)

    // Should redirect to login or show error, NOT stay on callback
    expect(finalURL).not.toContain('/auth/callback')
    console.log('✅ No infinite redirect loop detected (as expected)')
  })
})
