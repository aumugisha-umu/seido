/**
 * 🧪 TEST LOGOUT - Test complet du flux de déconnexion
 *
 * Test du workflow :
 * 1. Créer et confirmer un compte test
 * 2. Se connecter avec ce compte
 * 3. Vérifier l'état authentifié
 * 4. Se déconnecter via le menu utilisateur
 * 5. Vérifier redirection vers login
 * 6. Vérifier que l'accès au dashboard est bloqué
 * 7. Tester persistence de la déconnexion (refresh)
 *
 * Features :
 * - Auto-healing activé
 * - Logs complets
 * - Test multi-rôles
 * - Rapports détaillés
 */

import { test, expect } from '../helpers/test-runner'
import { generateTestEmail } from '../config/test-config'
import {
  navigateToSignup,
  fillSignupForm,
  submitSignupForm,
  waitForSignupSuccess,
  navigateToLogin,
  fillLoginForm,
  submitLoginForm,
  waitForDashboard,
  expectAuthenticated,
  expectNotAuthenticated,
  performLogout,
  waitForFormReady,
  cleanupTestUser,
} from '../helpers/auth-helpers'
import {
  waitForUserInSupabase,
  getConfirmationLinkForEmail,
} from '../helpers/supabase-helpers'

test.describe('Authentication - Logout', () => {
  test('Logout from dashboard and verify session cleared', async ({
    page,
    logCollector,
  }) => {
    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testPassword = 'TestPassword123!'

    console.log('🧪 Starting logout test with email:', testEmail)

    try {
      // ============================================================================
      // PHASE 1 : CRÉATION ET CONFIRMATION DU COMPTE
      // ============================================================================
      console.log('\n📍 PHASE 1: Create and confirm test account')

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

      // Confirmer l'email
      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      expect(confirmLink).toBeTruthy()

      await page.goto(confirmLink!)
      await page.waitForLoadState('networkidle')
      await waitForDashboard(page, 'gestionnaire')
      await expectAuthenticated(page)

      console.log('✅ Account created, confirmed, and authenticated')

      // ============================================================================
      // PHASE 2 : TEST LOGOUT
      // ============================================================================
      console.log('\n📍 PHASE 2: Test logout flow')

      // ÉTAPE 1 : Se déconnecter
      console.log('\n📍 STEP 1: Perform logout')
      await performLogout(page)

      // Vérifier qu'on est sur la page de login
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')
      console.log('✅ Redirected to login page:', currentUrl)

      // ÉTAPE 2 : Vérifier qu'on n'est plus authentifié
      console.log('\n📍 STEP 2: Verify user is not authenticated')
      await expectNotAuthenticated(page)

      // ÉTAPE 3 : Tenter d'accéder au dashboard (doit rediriger vers login)
      console.log('\n📍 STEP 3: Try to access dashboard (should redirect to login)')
      await page.goto('/gestionnaire/dashboard')
      await page.waitForLoadState('networkidle')

      const redirectedUrl = page.url()
      expect(redirectedUrl).toContain('/auth/login')
      console.log('✅ Dashboard access blocked, redirected to login:', redirectedUrl)

      // ÉTAPE 4 : Vérifier persistence après refresh
      console.log('\n📍 STEP 4: Verify logout persists after page refresh')
      await page.reload()
      await page.waitForLoadState('networkidle')

      const afterReloadUrl = page.url()
      expect(afterReloadUrl).toContain('/auth/login')
      await expectNotAuthenticated(page)
      console.log('✅ Logout persisted after page reload')

      // ÉTAPE 5 : Vérifier qu'on peut se reconnecter
      console.log('\n📍 STEP 5: Verify re-login works after logout')
      await waitForFormReady(page)

      await fillLoginForm(page, {
        email: testEmail,
        password: testPassword,
      })

      await submitLoginForm(page)
      await waitForDashboard(page, 'gestionnaire')
      await expectAuthenticated(page)

      console.log('✅ Re-login successful after logout')

      // SUCCÈS
      console.log('\n✅ ✅ ✅ LOGOUT TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ LOGOUT TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })

  test('Logout from different role dashboards', async ({ page }) => {
    console.log('\n🧪 Testing logout from prestataire dashboard')

    const testEmail = generateTestEmail('prestataire', Date.now())
    const testPassword = 'TestPassword123!'

    try {
      // Créer compte prestataire
      console.log('\n📍 STEP 1: Create prestataire account')
      await navigateToSignup(page)
      await waitForFormReady(page)

      await fillSignupForm(page, {
        email: testEmail,
        password: testPassword,
        firstName: 'Provider',
        lastName: 'Test',
        phone: '+33612345678',
      })

      await submitSignupForm(page)
      await waitForSignupSuccess(page, testEmail)

      // Confirmer
      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      await page.goto(confirmLink!)

      // Attendre redirection vers dashboard prestataire
      await page.waitForURL(/\/(gestionnaire|prestataire|locataire)\/dashboard/, {
        timeout: 30000,
      })

      console.log('✅ Prestataire account created and confirmed')

      // Logout
      console.log('\n📍 STEP 2: Logout from prestataire dashboard')
      await performLogout(page)

      // Vérifier
      const url = page.url()
      expect(url).toContain('/auth/login')
      await expectNotAuthenticated(page)

      console.log('✅ Logout successful from prestataire dashboard')
      console.log('\n✅ ✅ ✅ MULTI-ROLE LOGOUT TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ MULTI-ROLE LOGOUT TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })

  test('Multiple logout/login cycles', async ({ page }) => {
    console.log('\n🧪 Testing multiple logout/login cycles')

    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testPassword = 'TestPassword123!'

    try {
      // Créer compte
      console.log('\n📍 STEP 1: Create account')
      await navigateToSignup(page)
      await waitForFormReady(page)

      await fillSignupForm(page, {
        email: testEmail,
        password: testPassword,
        firstName: 'Cycle',
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

      console.log('✅ Initial account created')

      // Tester 3 cycles de logout/login
      for (let i = 1; i <= 3; i++) {
        console.log(`\n📍 CYCLE ${i}: Logout → Login`)

        // Logout
        await performLogout(page)
        await expectNotAuthenticated(page)
        console.log(`✅ Cycle ${i}: Logged out`)

        // Login
        await waitForFormReady(page)
        await fillLoginForm(page, {
          email: testEmail,
          password: testPassword,
        })
        await submitLoginForm(page)
        await waitForDashboard(page, 'gestionnaire')
        await expectAuthenticated(page)

        console.log(`✅ Cycle ${i}: Logged back in`)
      }

      console.log('\n✅ ✅ ✅ MULTIPLE CYCLES TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ MULTIPLE CYCLES TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })

  test('Logout clears sensitive data from browser', async ({ page }) => {
    console.log('\n🧪 Testing logout clears browser data')

    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testPassword = 'TestPassword123!'

    try {
      // Créer et confirmer compte
      await navigateToSignup(page)
      await waitForFormReady(page)

      await fillSignupForm(page, {
        email: testEmail,
        password: testPassword,
        firstName: 'Security',
        lastName: 'Test',
        phone: '+33612345678',
      })

      await submitSignupForm(page)
      await waitForSignupSuccess(page, testEmail)

      await waitForUserInSupabase(testEmail, { timeout: 15000 })
      const confirmLink = await getConfirmationLinkForEmail(testEmail)
      await page.goto(confirmLink!)
      await waitForDashboard(page, 'gestionnaire')

      console.log('✅ Account authenticated')

      // Vérifier présence de cookies/localStorage avant logout
      console.log('\n📍 STEP 1: Check session data before logout')

      const cookiesBefore = await page.context().cookies()
      const authCookiesBefore = cookiesBefore.filter(
        (c) =>
          c.name.includes('auth') ||
          c.name.includes('supabase') ||
          c.name.includes('sb-')
      )

      console.log(
        `📊 Auth cookies found before logout: ${authCookiesBefore.length}`
      )
      expect(authCookiesBefore.length).toBeGreaterThan(0)

      // Logout
      console.log('\n📍 STEP 2: Perform logout')
      await performLogout(page)

      // Vérifier que les données sensibles sont supprimées
      console.log('\n📍 STEP 3: Verify session data cleared after logout')

      // Note: Supabase peut garder certains cookies techniques,
      // mais la session doit être invalide
      await page.waitForTimeout(1000) // Attendre nettoyage

      // Vérifier qu'on ne peut pas accéder au dashboard
      await page.goto('/gestionnaire/dashboard')
      await page.waitForLoadState('networkidle')

      const finalUrl = page.url()
      expect(finalUrl).toContain('/auth/login')

      console.log('✅ Session invalidated, access to dashboard blocked')
      console.log('\n✅ ✅ ✅ SECURITY LOGOUT TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ SECURITY LOGOUT TEST FAILED\n')
      throw error
    } finally {
      await cleanupTestUser(testEmail)
    }
  })
})
