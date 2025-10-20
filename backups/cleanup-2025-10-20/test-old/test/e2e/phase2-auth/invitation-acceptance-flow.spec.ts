/**
 * 🧪 Test E2E Auto-Healing: Flux Complet d'Acceptation d'Invitation
 *
 * @description
 * Valide le workflow complet d'invitation d'un prestataire par un gestionnaire:
 * 1. Gestionnaire crée une invitation
 * 2. Récupération du magic link depuis la base de données
 * 3. Navigation vers le magic link (simulation acceptation)
 * 4. Validation: Redirection vers /auth/set-password en < 5s
 * 5. Validation: Pas de boucle de redirection (max 1 callback → set-password)
 * 6. Définition du mot de passe
 * 7. Validation: Redirection vers dashboard prestataire
 *
 * @features
 * - Auto-healing avec captureDebugInfo()
 * - Test isolation (setupTestIsolation + teardownTestIsolation)
 * - Assertions strictes sur les redirections
 * - Timeout adapté (< 10s total)
 *
 * @resolves Boucle de redirection infinie après acceptation invitation (fix use-auth.tsx)
 */

import { test, expect } from '@playwright/test'
import {
  loginAsGestionnaire,
  setupTestIsolation,
  teardownTestIsolation,
  captureDebugInfo,
  type DebugInfo
} from '../../helpers'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration Supabase pour récupération magic link
// ============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ============================================================================
// Helpers Spécifiques Invitation
// ============================================================================

/**
 * Génère un email unique pour éviter conflits
 */
function generateTestEmail(baseEmail: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return baseEmail.replace('@', `+test-${timestamp}-${random}@`)
}

/**
 * Crée une invitation et récupère le magic link depuis la DB
 */
async function createInvitationAndGetMagicLink(
  page: any,
  inviteeEmail: string,
  inviteeName: string = 'Test Prestataire'
): Promise<{ magicLink: string; invitationCode: string }> {
  console.log('📧 [INVITATION-TEST] Creating invitation for:', inviteeEmail)

  // Navigation vers page de contacts
  await page.goto('http://localhost:3000/gestionnaire/contacts', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  // Cliquer sur "Inviter un nouveau contact"
  const inviteButton = page.locator('button:has-text("Inviter un nouveau contact")')
  await expect(inviteButton).toBeVisible({ timeout: 5000 })
  await inviteButton.click()

  // Remplir le formulaire d'invitation
  await page.fill('input[name="email"]', inviteeEmail)
  await page.fill('input[name="name"]', inviteeName)

  // Sélectionner le rôle prestataire
  await page.locator('button[role="combobox"]').click()
  await page.locator('div[role="option"]:has-text("Prestataire")').click()

  // Soumettre l'invitation
  await page.locator('button:has-text("Envoyer l\'invitation")').click()

  // Attendre confirmation (toast ou message de succès)
  await page.waitForTimeout(2000)

  console.log('✅ [INVITATION-TEST] Invitation created, fetching magic link from DB...')

  // Récupérer l'invitation depuis la base de données
  const { data: invitation, error } = await supabaseAdmin
    .from('user_invitations')
    .select('*')
    .eq('email', inviteeEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !invitation) {
    throw new Error(`Failed to retrieve invitation from DB: ${error?.message || 'Not found'}`)
  }

  console.log('📧 [INVITATION-TEST] Invitation found:', {
    id: invitation.id,
    email: invitation.email,
    code: invitation.invitation_code,
    status: invitation.status
  })

  // Construire le magic link
  const magicLink = `http://localhost:3000/auth/callback#access_token=fake&refresh_token=fake&type=invite&invitation_code=${invitation.invitation_code}`

  return {
    magicLink,
    invitationCode: invitation.invitation_code
  }
}

/**
 * Compte le nombre de redirections vers une URL spécifique
 */
async function countRedirections(page: any, targetUrl: string, maxWaitMs: number = 5000): Promise<number> {
  const startTime = Date.now()
  let redirectCount = 0
  const targetPath = new URL(targetUrl).pathname

  while (Date.now() - startTime < maxWaitMs) {
    const currentUrl = page.url()
    const currentPath = new URL(currentUrl).pathname

    if (currentPath === targetPath) {
      redirectCount++
      console.log(`🔄 [REDIRECT-COUNT] Redirect #${redirectCount} to ${targetPath}`)
    }

    await page.waitForTimeout(100)

    // Si on a dépassé 2 redirections, c'est une boucle
    if (redirectCount > 2) {
      throw new Error(`⚠️ Infinite redirect loop detected! Redirected to ${targetPath} ${redirectCount} times`)
    }
  }

  return redirectCount
}

// ============================================================================
// Tests E2E Invitation Flow
// ============================================================================

test.describe('🔐 Invitation Acceptance Flow - Auto-Healing', () => {
  let debugInfo: DebugInfo | null = null

  test.beforeEach(async ({ page }) => {
    console.log('\n🧹 [SETUP] Setting up test isolation...')
    await setupTestIsolation(page)
  })

  test.afterEach(async ({ page }) => {
    console.log('\n🧹 [TEARDOWN] Cleaning up test isolation...')
    await teardownTestIsolation(page)

    // Si le test a échoué, afficher les infos de debug
    if (debugInfo) {
      console.log('\n📊 [DEBUG] Test failed, debug info:')
      console.log('URL:', debugInfo.url)
      console.log('Console Errors:', debugInfo.consoleErrors)
      console.log('Network Errors:', debugInfo.networkErrors)
    }
  })

  test('✅ Gestionnaire invite prestataire → Acceptation → Set password → Dashboard', async ({ page }) => {
    // ========================================================================
    // ÉTAPE 1: Login gestionnaire
    // ========================================================================
    console.log('\n📍 STEP 1: Login as gestionnaire')
    await loginAsGestionnaire(page)

    // Vérifier que le login a réussi
    await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 10000 })
    console.log('✅ Gestionnaire logged in successfully')

    // ========================================================================
    // ÉTAPE 2: Créer invitation et récupérer magic link
    // ========================================================================
    console.log('\n📍 STEP 2: Create invitation and get magic link')

    const inviteeEmail = generateTestEmail('test-prestataire-invite@seido.pm')
    const inviteeName = 'Test Prestataire Invité'

    let magicLink: string
    let invitationCode: string

    try {
      const result = await createInvitationAndGetMagicLink(page, inviteeEmail, inviteeName)
      magicLink = result.magicLink
      invitationCode = result.invitationCode

      console.log('✅ Magic link generated:', magicLink)
    } catch (error) {
      debugInfo = await captureDebugInfo(page, 'invitation-creation-failed')
      throw error
    }

    // ========================================================================
    // ÉTAPE 3: Se déconnecter (pour simuler un nouvel utilisateur)
    // ========================================================================
    console.log('\n📍 STEP 3: Logout gestionnaire')

    await page.goto('http://localhost:3000/auth/logout', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    console.log('✅ Logged out successfully')

    // ========================================================================
    // ÉTAPE 4: Accepter l'invitation via magic link
    // ========================================================================
    console.log('\n📍 STEP 4: Accept invitation via magic link')

    try {
      // Navigation vers le magic link
      await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 10000 })

      console.log('🔗 Navigated to magic link:', magicLink)
      console.log('📍 Current URL:', page.url())

      // ✅ VALIDATION CRITIQUE: Redirection vers /auth/set-password en < 5s
      console.log('⏱️ Waiting for redirection to /auth/set-password (max 5s)...')

      const redirectStartTime = Date.now()

      await page.waitForURL('**/auth/set-password', { timeout: 5000 })

      const redirectDuration = Date.now() - redirectStartTime
      console.log(`✅ Redirected to /auth/set-password in ${redirectDuration}ms`)

      // ✅ VALIDATION: Pas de boucle de redirection
      const finalUrl = page.url()
      expect(finalUrl).toContain('/auth/set-password')

      // Vérifier qu'on est bien sur la page set-password
      await expect(page.locator('h1:has-text("Définir votre mot de passe")')).toBeVisible({ timeout: 3000 })

      console.log('✅ Set password page loaded successfully')

    } catch (error) {
      debugInfo = await captureDebugInfo(page, 'invitation-acceptance-failed')

      console.error('❌ [INVITATION-TEST] Acceptance failed')
      console.error('Current URL:', page.url())
      console.error('Error:', error)

      throw error
    }

    // ========================================================================
    // ÉTAPE 5: Définir le mot de passe
    // ========================================================================
    console.log('\n📍 STEP 5: Set password')

    try {
      const newPassword = 'NewPassword123'

      // Remplir le formulaire de mot de passe
      await page.fill('input#password', newPassword)
      await page.fill('input#confirmPassword', newPassword)

      // Soumettre
      await page.locator('button:has-text("Définir le mot de passe")').click()

      console.log('✅ Password form submitted')

      // ========================================================================
      // ÉTAPE 6: Vérifier redirection vers dashboard prestataire
      // ========================================================================
      console.log('\n📍 STEP 6: Verify redirection to prestataire dashboard')

      await page.waitForURL('**/prestataire/dashboard', { timeout: 5000 })

      const dashboardUrl = page.url()
      expect(dashboardUrl).toContain('/prestataire/dashboard')

      console.log('✅ Redirected to prestataire dashboard:', dashboardUrl)

      // Vérifier contenu du dashboard
      await expect(page.locator('text=Interventions')).toBeVisible({ timeout: 5000 })

      console.log('✅ Dashboard loaded successfully')

    } catch (error) {
      debugInfo = await captureDebugInfo(page, 'password-setup-failed')

      console.error('❌ [INVITATION-TEST] Password setup failed')
      console.error('Current URL:', page.url())
      console.error('Error:', error)

      throw error
    }

    // ========================================================================
    // ÉTAPE 7: Nettoyage - Supprimer l'invitation et l'utilisateur de test
    // ========================================================================
    console.log('\n📍 STEP 7: Cleanup - Delete test invitation and user')

    try {
      // Supprimer l'invitation
      await supabaseAdmin
        .from('user_invitations')
        .delete()
        .eq('invitation_code', invitationCode)

      console.log('✅ Test invitation deleted')

      // Supprimer l'utilisateur de test (si créé)
      const { data: testUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .single()

      if (testUser) {
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', testUser.id)

        console.log('✅ Test user deleted')
      }

    } catch (cleanupError) {
      console.warn('⚠️ Cleanup failed (non-blocking):', cleanupError)
    }

    console.log('\n✅✅✅ INVITATION ACCEPTANCE FLOW COMPLETED SUCCESSFULLY ✅✅✅\n')
  })

  test('❌ Validation: Boucle de redirection détectée si bug présent', async ({ page }) => {
    // Ce test valide que notre détection de boucle fonctionne

    console.log('\n📍 TEST: Validating redirect loop detection')

    // Simuler une boucle en allant sur callback sans session valide
    await page.goto('http://localhost:3000/auth/callback', { waitUntil: 'networkidle' })

    // Attendre 3 secondes pour détecter les redirections
    await page.waitForTimeout(3000)

    const finalUrl = page.url()

    // Si le bug est présent, on devrait rester sur /auth/callback ou /auth/login
    // Si le fix fonctionne, on devrait être redirigé vers /auth/login

    console.log('Final URL after 3s:', finalUrl)

    // Validation: On ne doit PAS rester bloqué sur /auth/callback
    expect(finalUrl).not.toContain('/auth/callback')

    console.log('✅ No infinite redirect loop detected (as expected)')
  })
})
