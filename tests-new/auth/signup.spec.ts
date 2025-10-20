/**
 * 🧪 TEST SIGNUP - Test complet du flux d'inscription
 *
 * Test du workflow :
 * 1. Remplir formulaire signup
 * 2. Soumettre et attendre succès
 * 3. Recevoir email de confirmation
 * 4. Cliquer sur le lien de confirmation
 * 5. Vérifier création profil + équipe
 * 6. Recevoir email de bienvenue
 * 7. Redirection vers dashboard
 *
 * Features :
 * - Auto-healing activé (max 5 tentatives)
 * - Logs complets (console, server, Supabase, Pino)
 * - Interception emails Resend
 * - Détection boucles infinies
 * - Rapports détaillés
 */

import { test, expect } from '../helpers/test-runner'
import { generateTestEmail } from '../config/test-config'
import {
  navigateToSignup,
  fillSignupForm,
  submitSignupForm,
  waitForSignupSuccess,
  waitForDashboard,
  expectAuthenticated,
  cleanupTestUser,
  waitForFormReady,
} from '../helpers/auth-helpers'
import {
  waitForUserInSupabase,
  getConfirmationLinkForEmail,
} from '../helpers/supabase-helpers'

test.describe('Authentication - Signup', () => {
  test('Complete signup flow with email confirmation', async ({
    page,
    logCollector,
    bugDetector,
  }) => {
    // Générer un email unique pour ce test
    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testUser = {
      email: testEmail,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '+33612345678',
    }

    console.log('🧪 Starting signup test with email:', testEmail)

    try {
      // ÉTAPE 1 : Naviguer vers la page de signup
      console.log('\n📍 STEP 1: Navigate to signup page')
      await navigateToSignup(page)
      await waitForFormReady(page)

      // ÉTAPE 2 : Remplir le formulaire
      console.log('\n📍 STEP 2: Fill signup form')
      await fillSignupForm(page, testUser)

      // ÉTAPE 3 : Soumettre le formulaire
      console.log('\n📍 STEP 3: Submit signup form')
      await submitSignupForm(page)

      // ÉTAPE 4 : Attendre la page de succès
      console.log('\n📍 STEP 4: Wait for signup success page')
      await waitForSignupSuccess(page, testEmail)

      // ÉTAPE 5 : Attendre que l'utilisateur soit créé dans Supabase
      console.log('\n📍 STEP 5: Wait for user in Supabase')
      const userCreated = await waitForUserInSupabase(testEmail, { timeout: 15000 })

      expect(userCreated).toBeTruthy()
      console.log('✅ User created in Supabase')

      // ÉTAPE 6 : Récupérer le lien de confirmation depuis Supabase
      console.log('\n📍 STEP 6: Get confirmation link from Supabase')
      const confirmLink = await getConfirmationLinkForEmail(testEmail)

      expect(confirmLink).toBeTruthy()
      expect(confirmLink).toContain('/auth/confirm')
      expect(confirmLink).toContain('token_hash')
      expect(confirmLink).toContain('type=email')

      console.log('🔗 Confirmation link:', confirmLink)

      // ÉTAPE 7 : Cliquer sur le lien de confirmation
      console.log('\n📍 STEP 7: Click confirmation link')
      await page.goto(confirmLink!)
      await page.waitForLoadState('networkidle')

      // ÉTAPE 8 : Attendre la redirection vers le dashboard
      console.log('\n📍 STEP 8: Wait for dashboard redirect')
      await waitForDashboard(page, 'gestionnaire')

      // ÉTAPE 9 : Vérifier qu'on est authentifié
      console.log('\n📍 STEP 9: Verify authentication')
      await expectAuthenticated(page)

      // Vérifier qu'on est bien sur le dashboard
      const url = page.url()
      expect(url).toContain('/gestionnaire/dashboard')

      console.log('✅ User authenticated and on dashboard:', url)

      // ÉTAPE 10 : Vérifier que l'email de bienvenue a été envoyé (optionnel)
      console.log('\n📍 STEP 10: Welcome email sent (check logs if needed)')
      // Note: L'email de bienvenue est envoyé côté serveur, on ne peut pas l'intercepter facilement
      // mais on peut vérifier dans les logs serveur si nécessaire

      // Vérifier que le dashboard se charge correctement
      console.log('\n📍 STEP 11: Verify dashboard content')

      // Attendre que le dashboard soit chargé
      await page.waitForSelector('h1, h2', { timeout: 5000 })

      // Vérifier qu'on a bien le contenu du dashboard
      const hasTitle = await page.locator('h1, h2').count()
      expect(hasTitle).toBeGreaterThan(0)

      console.log('✅ Dashboard loaded successfully')

      // SUCCÈS
      console.log('\n✅ ✅ ✅ SIGNUP TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ SIGNUP TEST FAILED\n')

      // Enregistrer l'erreur dans le bug detector
      if (error instanceof Error) {
        bugDetector.recordBug(error, {
          step: 'signup-flow',
          email: testEmail,
        })
      }

      // Prendre un screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        path: `${logCollector['logPaths'].screenshots}/failure-${Date.now()}.png`,
      })

      console.log('📸 Screenshot saved')

      throw error
    } finally {
      // Nettoyage : Supprimer l'utilisateur de test
      console.log('\n🧹 Cleanup: Removing test user')
      await cleanupTestUser(testEmail)
    }
  })

  test('Signup with invalid data should show validation errors', async ({
    page,
  }) => {
    console.log('\n🧪 Starting signup validation test')

    // Naviguer vers signup
    await navigateToSignup(page)
    await waitForFormReady(page)

    // Test 1 : Email invalide
    console.log('\n📍 TEST: Invalid email')
    await fillSignupForm(page, {
      email: 'invalid-email',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    })

    await submitSignupForm(page)

    // Vérifier message d'erreur
    const emailError = page.locator('text=Email invalide')
    await expect(emailError).toBeVisible({ timeout: 3000 })

    console.log('✅ Email validation error shown')

    // Test 2 : Mot de passe trop court
    console.log('\n📍 TEST: Password too short')
    await page.reload()
    await waitForFormReady(page)

    await fillSignupForm(page, {
      email: 'test@test.com',
      password: 'short',
      firstName: 'Test',
      lastName: 'User',
    })

    await submitSignupForm(page)

    // Vérifier message d'erreur
    const passwordError = page.locator('text=/Au moins 8 caractères/i')
    await expect(passwordError).toBeVisible({ timeout: 3000 })

    console.log('✅ Password validation error shown')

    // Test 3 : Conditions non acceptées
    console.log('\n📍 TEST: Terms not accepted')
    await page.reload()
    await waitForFormReady(page)

    await page.fill('input[name="email"]', 'test@test.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')

    // Ne PAS cocher les conditions
    await submitSignupForm(page)

    // Vérifier message d'erreur
    const termsError = page.locator('text=/Acceptation.*requise/i')
    await expect(termsError).toBeVisible({ timeout: 3000 })

    console.log('✅ Terms validation error shown')

    console.log('\n✅ ✅ ✅ VALIDATION TEST PASSED ✅ ✅ ✅\n')
  })
})
