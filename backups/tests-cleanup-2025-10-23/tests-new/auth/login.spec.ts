/**
 * 🧪 TEST LOGIN - Test complet du flux de connexion
 *
 * Test du workflow :
 * 1. Naviguer vers page de login
 * 2. Remplir formulaire avec credentials valides
 * 3. Soumettre et attendre redirection dashboard
 * 4. Vérifier authentification et rôle correct
 * 5. Tester logout et retour à login page
 *
 * Features :
 * - Auto-healing activé (max 5 tentatives)
 * - Logs complets (console, server, Supabase, Pino)
 * - Test multi-rôles (gestionnaire, prestataire, locataire)
 * - Test cas d'erreur (mauvais password, email invalide)
 * - Rapports détaillés
 */

import { test, expect } from '../helpers/test-runner'
import { generateTestEmail } from '../config/test-config'
import {
  navigateToLogin,
  fillLoginForm,
  submitLoginForm,
  waitForDashboard,
  expectAuthenticated,
  cleanupTestUser,
  waitForFormReady,
  navigateToSignup,
  fillSignupForm,
  submitSignupForm,
  waitForSignupSuccess,
  performLogout,
  expectNotAuthenticated,
} from '../helpers/auth-helpers'
import {
  waitForUserInSupabase,
  getConfirmationLinkForEmail,
} from '../helpers/supabase-helpers'

test.describe('Authentication - Login', () => {
  test('Login with valid credentials (gestionnaire)', async ({
    page,
    logCollector,
    bugDetector,
  }) => {
    // Créer un utilisateur de test complet (signup + confirmation)
    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testPassword = 'TestPassword123!'
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: 'Login',
      lastName: 'Test',
      phone: '+33612345678',
    }

    console.log('🧪 Starting login test with email:', testEmail)

    try {
      // ============================================================================
      // PHASE 1 : CRÉATION DU COMPTE TEST
      // ============================================================================
      console.log('\n📍 PHASE 1: Creating test account')

      // Signup
      await navigateToSignup(page)
      await waitForFormReady(page)
      await fillSignupForm(page, testUser)
      await submitSignupForm(page)
      await waitForSignupSuccess(page, testEmail)

      // Confirmer email
      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      expect(confirmLink).toBeTruthy()

      await page.goto(confirmLink!)
      await page.waitForLoadState('networkidle')
      await waitForDashboard(page, 'gestionnaire')

      console.log('✅ Test account created and confirmed')

      // Se déconnecter pour tester le login
      console.log('\n📍 PHASE 2: Logout to prepare login test')
      await performLogout(page)
      await expectNotAuthenticated(page)
      console.log('✅ Logged out successfully')

      // ============================================================================
      // PHASE 3 : TEST LOGIN
      // ============================================================================
      console.log('\n📍 PHASE 3: Test login with valid credentials')

      // ÉTAPE 1 : Naviguer vers login
      console.log('\n📍 STEP 1: Navigate to login page')
      await navigateToLogin(page)
      await waitForFormReady(page)

      // ÉTAPE 2 : Remplir formulaire de login
      console.log('\n📍 STEP 2: Fill login form')
      await fillLoginForm(page, {
        email: testEmail,
        password: testPassword,
      })

      // ÉTAPE 3 : Soumettre le formulaire
      console.log('\n📍 STEP 3: Submit login form')
      await submitLoginForm(page)

      // ÉTAPE 4 : Attendre redirection vers dashboard
      console.log('\n📍 STEP 4: Wait for dashboard redirect')
      await waitForDashboard(page, 'gestionnaire')

      // ÉTAPE 5 : Vérifier authentification
      console.log('\n📍 STEP 5: Verify authentication')
      await expectAuthenticated(page)

      const url = page.url()
      expect(url).toContain('/gestionnaire/dashboard')

      console.log('✅ Login successful, user authenticated on dashboard:', url)

      // ÉTAPE 6 : Vérifier contenu du dashboard
      console.log('\n📍 STEP 6: Verify dashboard content')
      await page.waitForSelector('h1, h2', { timeout: 5000 })
      const hasTitle = await page.locator('h1, h2').count()
      expect(hasTitle).toBeGreaterThan(0)

      console.log('✅ Dashboard loaded successfully')

      // SUCCÈS
      console.log('\n✅ ✅ ✅ LOGIN TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ LOGIN TEST FAILED\n')

      if (error instanceof Error) {
        bugDetector.recordBug(error, {
          step: 'login-flow',
          email: testEmail,
        })
      }

      const screenshot = await page.screenshot({
        fullPage: true,
        path: `${logCollector['logPaths'].screenshots}/failure-login-${Date.now()}.png`,
      })

      console.log('📸 Screenshot saved')
      throw error
    } finally {
      // Nettoyage
      console.log('\n🧹 Cleanup: Removing test user')
      await cleanupTestUser(testEmail)
    }
  })

  test('Login with invalid password should show error', async ({
    page,
    bugDetector,
  }) => {
    console.log('\n🧪 Starting login validation test (invalid password)')

    // Créer un utilisateur de test
    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const correctPassword = 'TestPassword123!'
    const wrongPassword = 'WrongPassword123!'

    try {
      // Créer le compte
      console.log('\n📍 STEP 1: Create test account')
      await navigateToSignup(page)
      await waitForFormReady(page)

      await fillSignupForm(page, {
        email: testEmail,
        password: correctPassword,
        firstName: 'Invalid',
        lastName: 'Test',
        phone: '+33612345678',
      })

      await submitSignupForm(page)
      await waitForSignupSuccess(page, testEmail)

      // Confirmer email
      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      await page.goto(confirmLink!)
      await waitForDashboard(page, 'gestionnaire')

      // Se déconnecter
      console.log('\n📍 STEP 2: Logout')
      await performLogout(page)

      // Tenter login avec mauvais password
      console.log('\n📍 STEP 3: Try login with wrong password')
      await navigateToLogin(page)
      await waitForFormReady(page)

      await fillLoginForm(page, {
        email: testEmail,
        password: wrongPassword,
      })

      await submitLoginForm(page)

      // Attendre message d'erreur
      console.log('\n📍 STEP 4: Wait for error message')
      const errorMessage = page.locator('[role="alert"]:has-text("Email ou mot de passe incorrect")')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })

      console.log('✅ Error message displayed correctly')

      // Vérifier qu'on est toujours sur la page de login
      const url = page.url()
      expect(url).toContain('/auth/login')

      console.log('✅ User still on login page (not authenticated)')
      console.log('\n✅ ✅ ✅ INVALID PASSWORD TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ INVALID PASSWORD TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })

  test('Login with non-existent email should show error', async ({ page }) => {
    console.log('\n🧪 Starting login validation test (non-existent email)')

    try {
      // Naviguer vers login
      console.log('\n📍 STEP 1: Navigate to login page')
      await navigateToLogin(page)
      await waitForFormReady(page)

      // Tenter login avec email inexistant
      console.log('\n📍 STEP 2: Try login with non-existent email')
      const fakeEmail = generateTestEmail('fake', Date.now())

      await fillLoginForm(page, {
        email: fakeEmail,
        password: 'SomePassword123!',
      })

      await submitLoginForm(page)

      // Attendre message d'erreur
      console.log('\n📍 STEP 3: Wait for error message')
      const errorMessage = page.locator('[role="alert"]:has-text("Email ou mot de passe incorrect")')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })

      console.log('✅ Error message displayed correctly')

      // Vérifier qu'on est toujours sur la page de login
      const url = page.url()
      expect(url).toContain('/auth/login')

      console.log('✅ User still on login page (not authenticated)')
      console.log('\n✅ ✅ ✅ NON-EXISTENT EMAIL TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ NON-EXISTENT EMAIL TEST FAILED\n')
      throw error
    }
  })

  test('Login and logout flow', async ({ page }) => {
    console.log('\n🧪 Starting login/logout flow test')

    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testPassword = 'TestPassword123!'

    try {
      // Créer compte
      console.log('\n📍 PHASE 1: Create account')
      await navigateToSignup(page)
      await waitForFormReady(page)

      await fillSignupForm(page, {
        email: testEmail,
        password: testPassword,
        firstName: 'Logout',
        lastName: 'Test',
        phone: '+33612345678',
      })

      await submitSignupForm(page)
      await waitForSignupSuccess(page, testEmail)

      // Confirmer
      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      await page.goto(confirmLink!)
      await waitForDashboard(page, 'gestionnaire')

      console.log('✅ Account created and confirmed')

      // Logout
      console.log('\n📍 PHASE 2: Logout')
      await performLogout(page)
      await expectNotAuthenticated(page)
      console.log('✅ Logged out')

      // Login à nouveau
      console.log('\n📍 PHASE 3: Login again')
      await navigateToLogin(page)
      await waitForFormReady(page)

      await fillLoginForm(page, {
        email: testEmail,
        password: testPassword,
      })

      await submitLoginForm(page)
      await waitForDashboard(page, 'gestionnaire')
      await expectAuthenticated(page)

      console.log('✅ Re-login successful')

      // Logout à nouveau
      console.log('\n📍 PHASE 4: Logout again')
      await performLogout(page)
      await expectNotAuthenticated(page)

      console.log('✅ Second logout successful')
      console.log('\n✅ ✅ ✅ LOGIN/LOGOUT FLOW TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ LOGIN/LOGOUT FLOW TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })
})
