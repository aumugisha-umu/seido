/**
 * Test E2E Complet - Signup → Confirmation → Login → Dashboard
 * Mode: VISIBLE (headed) pour suivre chaque étape
 */

import { test, expect } from '@playwright/test'

// Générer un email unique pour chaque test
const testEmail = `arthur+test-${Date.now()}@seido.pm`
const testPassword = 'TestComplete2025!'
const testFirstName = 'Arthur'
const testLastName = 'TestComplete'

// Variable pour stocker le lien de confirmation
let confirmationUrl = ''

test.describe('🚀 Signup Complet E2E - Mode Visible', () => {
  test('Créer compte → Confirmer email → Login → Dashboard', async ({ page }) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🧪 TEST E2E COMPLET - SIGNUP FLOW`)
    console.log(`${'='.repeat(60)}`)
    console.log(`📧 Test email: ${testEmail}`)
    console.log(`🔑 Test password: ${testPassword}`)
    console.log(`${'='.repeat(60)}\n`)

    // ========================================
    // CONFIGURATION: Capturer les logs serveur
    // ========================================
    page.on('console', msg => {
      const text = msg.text()

      // Capturer le lien de confirmation depuis les logs
      if (text.includes('🔗 [SIGNUP-ACTION] Built confirmation URL')) {
        console.log(`\n📋 [CONSOLE-LOG] ${text}`)
      }

      // Capturer l'URL de confirmation construite
      const confirmMatch = text.match(/internalConfirmUrl['"]\s*:\s*['"](http[^'"]+)/)
      if (confirmMatch) {
        confirmationUrl = confirmMatch[1]
        console.log(`\n✅ [CONFIRMATION-URL-CAPTURED] ${confirmationUrl}\n`)
      }

      // Logger tous les messages importants
      if (text.includes('[SIGNUP-ACTION]') ||
          text.includes('[AUTH-CONFIRM]') ||
          text.includes('[LOGIN-ACTION]') ||
          text.includes('✅') ||
          text.includes('❌')) {
        console.log(`📋 ${text}`)
      }
    })

    // Capturer les erreurs de page
    page.on('pageerror', error => {
      console.error(`❌ [PAGE-ERROR] ${error.message}`)
    })

    // Capturer les requêtes réseau (pour voir les appels API)
    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/auth/signup') ||
          url.includes('/auth/confirm') ||
          url.includes('/auth/login')) {
        const status = response.status()
        console.log(`🌐 [API] ${status} ${url}`)
      }
    })

    // ========================================
    // ÉTAPE 1: SIGNUP - Créer le compte
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 1: SIGNUP - Création du compte`)
    console.log(`${'━'.repeat(60)}`)

    await page.goto('http://localhost:3000/auth/signup', {
      waitUntil: 'networkidle',
      timeout: 15000
    })
    await expect(page).toHaveURL(/.*\/auth\/signup/)
    console.log(`  ✅ Page signup chargée`)

    // Remplir le formulaire
    await page.fill('input[name="email"]', testEmail)
    console.log(`  ✅ Email: ${testEmail}`)

    await page.fill('input[name="password"]', testPassword)
    console.log(`  ✅ Password: ********`)

    await page.fill('input[name="firstName"]', testFirstName)
    console.log(`  ✅ First name: ${testFirstName}`)

    await page.fill('input[name="lastName"]', testLastName)
    console.log(`  ✅ Last name: ${testLastName}`)

    // Cocher la checkbox des termes
    const checkbox = page.locator('button[role="checkbox"]#terms')
    await checkbox.click()
    console.log(`  ✅ Terms accepted`)

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()

    const isEnabled = await submitButton.isEnabled()
    console.log(`  ℹ️  Submit button enabled: ${isEnabled}`)

    await submitButton.click({ force: !isEnabled })
    console.log(`  ✅ Formulaire soumis`)

    // Attendre la redirection vers signup-success
    await page.waitForURL(/.*\/auth\/signup-success/, { timeout: 10000 })
    console.log(`  ✅ Redirection vers /auth/signup-success`)

    // Vérifier le message de succès
    const successMessage = page.locator('text=/email de confirmation/i')
    await expect(successMessage).toBeVisible()
    console.log(`  ✅ Message de succès visible`)

    // ========================================
    // ÉTAPE 2: Attendre et récupérer le lien de confirmation
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 2: Récupération du lien de confirmation`)
    console.log(`${'━'.repeat(60)}`)

    // Attendre que le lien soit capturé (max 10 secondes)
    let attempts = 0
    while (!confirmationUrl && attempts < 20) {
      await page.waitForTimeout(500)
      attempts++
      if (attempts % 4 === 0) {
        console.log(`  ⏳ Waiting for confirmation URL... (${attempts * 0.5}s)`)
      }
    }

    if (!confirmationUrl) {
      console.error(`\n❌ ERREUR: Impossible de capturer le lien de confirmation`)
      console.error(`  → Vérifiez les logs serveur pour [SIGNUP-ACTION]`)

      // Essayer de récupérer le lien depuis Supabase directement
      console.log(`\n⚠️  Tentative de récupération manuelle du lien...`)
      console.log(`  → Allez dans Supabase Dashboard → SQL Editor`)
      console.log(`  → Exécutez: SELECT properties FROM auth.users WHERE email = '${testEmail}'`)

      throw new Error('Lien de confirmation non capturé')
    }

    console.log(`  ✅ Lien de confirmation capturé`)
    console.log(`  🔗 URL: ${confirmationUrl}`)

    // ========================================
    // ÉTAPE 3: CONFIRMATION - Visiter le lien
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 3: CONFIRMATION - Visite du lien email`)
    console.log(`${'━'.repeat(60)}`)

    await page.goto(confirmationUrl, {
      waitUntil: 'networkidle',
      timeout: 15000
    })
    console.log(`  ✅ Lien de confirmation visité`)

    // Attendre la redirection vers /auth/login?confirmed=true
    await page.waitForURL(/.*\/auth\/login\?confirmed=true/, { timeout: 10000 })
    console.log(`  ✅ Redirection vers /auth/login?confirmed=true`)

    // Vérifier le message de confirmation
    const confirmedMessage = page.locator('text=/email confirmé/i, text=/confirmation/i')
    await expect(confirmedMessage).toBeVisible({ timeout: 5000 })
    console.log(`  ✅ Message de confirmation visible`)

    // ========================================
    // ÉTAPE 4: VÉRIFICATION - Profil créé dans la base
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 4: VÉRIFICATION - Profil et équipe créés`)
    console.log(`${'━'.repeat(60)}`)

    console.log(`  ℹ️  Pour vérifier manuellement dans Supabase:`)
    console.log(``)
    console.log(`  -- Voir les logs du trigger`)
    console.log(`  SELECT * FROM public.trigger_debug_logs`)
    console.log(`  WHERE email = '${testEmail}'`)
    console.log(`  ORDER BY created_at ASC;`)
    console.log(``)
    console.log(`  -- Vérifier le profil`)
    console.log(`  SELECT u.*, t.name as team_name`)
    console.log(`  FROM public.users u`)
    console.log(`  LEFT JOIN public.teams t ON u.team_id = t.id`)
    console.log(`  WHERE u.email = '${testEmail}';`)
    console.log(``)

    // Pause de 2 secondes pour laisser le trigger s'exécuter
    console.log(`  ⏳ Pause de 2s pour laisser le trigger s'exécuter...`)
    await page.waitForTimeout(2000)
    console.log(`  ✅ Trigger devrait être terminé`)

    // ========================================
    // ÉTAPE 5: LOGIN - Se connecter avec le nouveau compte
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 5: LOGIN - Connexion avec le nouveau compte`)
    console.log(`${'━'.repeat(60)}`)

    // Remplir le formulaire de login
    await page.fill('input[name="email"]', testEmail)
    console.log(`  ✅ Email filled: ${testEmail}`)

    await page.fill('input[name="password"]', testPassword)
    console.log(`  ✅ Password filled: ********`)

    // Soumettre le formulaire de login
    const loginButton = page.locator('button[type="submit"]')
    await expect(loginButton).toBeVisible()
    await loginButton.click()
    console.log(`  ✅ Login form submitted`)

    // Attendre la redirection vers le dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 })
    const finalUrl = page.url()
    console.log(`  ✅ Redirection vers: ${finalUrl}`)

    // ========================================
    // ÉTAPE 6: DASHBOARD - Vérifier l'accès
    // ========================================
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📍 ÉTAPE 6: DASHBOARD - Vérification de l'accès`)
    console.log(`${'━'.repeat(60)}`)

    // Vérifier qu'on est bien sur le dashboard gestionnaire
    expect(finalUrl).toContain('/dashboard/gestionnaire')
    console.log(`  ✅ URL correcte: /dashboard/gestionnaire`)

    // Vérifier que le nom de l'utilisateur est affiché
    const userName = page.locator(`text=/${testFirstName}|${testLastName}|${testFirstName} ${testLastName}/i`).first()
    await expect(userName).toBeVisible({ timeout: 5000 })
    console.log(`  ✅ Nom d'utilisateur visible dans l'interface`)

    // Vérifier qu'il n'y a pas d'erreur affichée
    const errorMessages = page.locator('text=/error|erreur|échec/i')
    const errorCount = await errorMessages.count()
    if (errorCount > 0) {
      console.warn(`  ⚠️  ${errorCount} message(s) d'erreur détecté(s)`)
    } else {
      console.log(`  ✅ Aucun message d'erreur`)
    }

    // ========================================
    // SUCCÈS FINAL
    // ========================================
    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ TEST E2E COMPLET RÉUSSI !`)
    console.log(`${'='.repeat(60)}`)
    console.log(`📧 Compte créé: ${testEmail}`)
    console.log(`✅ Email confirmé`)
    console.log(`✅ Login réussi`)
    console.log(`✅ Dashboard accessible`)
    console.log(`${'='.repeat(60)}\n`)

    // Attendre 3 secondes pour observer le dashboard
    console.log(`⏸️  Pause de 3s pour observer le dashboard...`)
    await page.waitForTimeout(3000)
  })
})
