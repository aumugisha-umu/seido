/**
 * Test simplifié - Diagnostic Signup Resend
 * Version minimale pour diagnostiquer le problème d'envoi d'email
 */

import { test, expect } from '@playwright/test'

// Générer un email unique pour chaque test
const testEmail = `test-resend-${Date.now()}@seido.pm`
const testPassword = 'TestResend2025!'

test.describe('🔧 Diagnostic Signup Resend - Mode Visible', () => {
  test('Tester le flux signup et capturer les erreurs', async ({ page }) => {
    console.log(`\n🚀 Starting signup diagnostic test`)
    console.log(`📧 Test email: ${testEmail}`)

    // Capturer TOUS les logs console
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[SIGNUP-ACTION]') ||
          text.includes('[RESEND]') ||
          text.includes('[EMAIL') ||
          text.includes('❌') ||
          text.includes('✅')) {
        console.log(`📋 ${text}`)
      }
    })

    // Capturer les erreurs de page
    page.on('pageerror', error => {
      console.error(`❌ Page error: ${error.message}`)
    })

    // ========================================
    // Étape 1: Aller à la page signup
    // ========================================
    console.log(`\n📍 Step 1: Navigating to signup page...`)
    await page.goto('http://localhost:3000/auth/signup', {
      waitUntil: 'networkidle',
      timeout: 15000
    })

    // Vérifier qu'on est bien sur la page
    await expect(page).toHaveURL(/.*\/auth\/signup/)
    console.log(`✅ Signup page loaded`)

    // ========================================
    // Étape 2: Remplir le formulaire
    // ========================================
    console.log(`\n📍 Step 2: Filling form...`)

    await page.fill('input[name="email"]', testEmail)
    console.log(`  ✅ Email filled: ${testEmail}`)

    await page.fill('input[name="password"]', testPassword)
    console.log(`  ✅ Password filled`)

    await page.fill('input[name="firstName"]', 'Test')
    console.log(`  ✅ First name filled`)

    await page.fill('input[name="lastName"]', 'Resend')
    console.log(`  ✅ Last name filled`)

    // Cocher la checkbox (cibler uniquement le bouton visible, pas le hidden input)
    const checkbox = page.locator('button[role="checkbox"]#terms')
    await checkbox.click()
    console.log(`  ✅ Terms accepted`)

    // ========================================
    // Étape 3: Soumettre et attendre
    // ========================================
    console.log(`\n📍 Step 3: Submitting form...`)

    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()

    // Note: Le bouton peut être disabled par validation côté client
    // On utilise force: true pour cliquer quand même et tester le backend
    const isEnabled = await submitButton.isEnabled()
    console.log(`  ℹ️ Submit button enabled: ${isEnabled}`)

    // Cliquer (force si besoin)
    await submitButton.click({ force: !isEnabled })
    console.log(`  ✅ Form submitted, waiting for response...`)

    // Attendre soit success soit error
    await page.waitForTimeout(5000) // Laisser le temps aux logs d'arriver

    // ========================================
    // Étape 4: Vérifier l'URL finale
    // ========================================
    const finalUrl = page.url()
    console.log(`\n📍 Final URL: ${finalUrl}`)

    if (finalUrl.includes('/auth/signup-success')) {
      console.log(`✅ Redirected to success page`)
    } else if (finalUrl.includes('/auth/signup')) {
      console.log(`⚠️ Still on signup page (likely error)`)
    } else {
      console.log(`⚠️ Unexpected URL: ${finalUrl}`)
    }

    // ========================================
    // Étape 5: Résultat final
    // ========================================
    console.log(`\n📊 Test completed`)
    console.log(`  - Check server console for detailed logs`)
    console.log(`  - Look for [SIGNUP-ACTION], [EMAIL-SERVICE], [RESEND-ERROR]`)
  })
})
