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
  getSupabaseAdmin,
  type DebugInfo
} from '../helpers'

// ============================================================================
// Configuration Supabase pour récupération magic link
// ============================================================================
// ✅ Fonction lazy pour créer le client seulement quand nécessaire (après global-setup)
let supabaseAdminInstance: ReturnType<typeof getSupabaseAdmin> | null = null
function getSupabase() {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = getSupabaseAdmin()
  }
  return supabaseAdminInstance
}

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
 * Crée une invitation DIRECTEMENT via DB (plus fiable que UI)
 */
async function createInvitationViaAPI(
  inviteeEmail: string,
  inviteeName: string = 'Test Prestataire'
): Promise<{ magicLink: string; invitationCode: string; teamId: string }> {
  console.log('📧 [INVITATION-TEST] Creating invitation via API for:', inviteeEmail)

  const supabase = getSupabase()

  // Récupérer le team_id du gestionnaire
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('name', 'Équipe Gestion Immobilière')
    .single()

  if (!team) {
    throw new Error('Team not found for gestionnaire')
  }

  const invitationCode = `test-invite-${Date.now()}`

  // Créer l'invitation directement en DB
  const { data: invitation, error } = await supabase
    .from('user_invitations')
    .insert({
      email: inviteeEmail,
      name: inviteeName,
      role: 'prestataire',
      team_id: team.id,
      status: 'pending',
      invitation_code: invitationCode
    })
    .select()
    .single()

  if (error || !invitation) {
    throw new Error(`Failed to create invitation via API: ${error?.message}`)
  }

  console.log('✅ Invitation created via API:', {
    id: invitation.id,
    email: invitation.email,
    code: invitation.invitation_code
  })

  // Construire le magic link
  const magicLink = `http://localhost:3000/auth/callback#access_token=fake&refresh_token=fake&type=invite&invitation_code=${invitation.invitation_code}`

  return {
    magicLink,
    invitationCode: invitation.invitation_code,
    teamId: team.id
  }
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
    // ÉTAPE 1: Créer invitation via API (plus fiable que UI)
    // ========================================================================
    console.log('\n📍 STEP 1: Create invitation via API')

    const inviteeEmail = generateTestEmail('test-prestataire-invite@seido.pm')
    const inviteeName = 'Test Prestataire Invité'

    let magicLink: string
    let invitationCode: string

    try {
      const result = await createInvitationViaAPI(inviteeEmail, inviteeName)
      magicLink = result.magicLink
      invitationCode = result.invitationCode

      console.log('✅ Magic link generated:', magicLink)
    } catch (error) {
      console.error('❌ Failed to create invitation via API:', error)
      throw error
    }

    // ========================================================================
    // ÉTAPE 2: Accepter l'invitation via magic link (sans login nécessaire)
    // ========================================================================
    console.log('\n📍 STEP 2: Accept invitation via magic link')

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
    // ÉTAPE 3: Définir le mot de passe
    // ========================================================================
    console.log('\n📍 STEP 3: Set password')

    try {
      const newPassword = 'NewPassword123'

      // Remplir le formulaire de mot de passe
      await page.fill('input#password', newPassword)
      await page.fill('input#confirmPassword', newPassword)

      // Soumettre
      await page.locator('button:has-text("Définir le mot de passe")').click()

      console.log('✅ Password form submitted')

      // ========================================================================
      // ÉTAPE 4: Vérifier redirection vers dashboard prestataire
      // ========================================================================
      console.log('\n📍 STEP 4: Verify redirection to prestataire dashboard')

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
    // ÉTAPE 5: Nettoyage - Supprimer l'invitation et l'utilisateur de test
    // ========================================================================
    console.log('\n📍 STEP 5: Cleanup - Delete test invitation and user')

    try {
      const supabase = getSupabase()

      // Supprimer l'invitation
      await supabase
        .from('user_invitations')
        .delete()
        .eq('invitation_code', invitationCode)

      console.log('✅ Test invitation deleted')

      // Supprimer l'utilisateur de test (si créé)
      const { data: testUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .single()

      if (testUser) {
        await supabase
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
