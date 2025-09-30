/**
 * Test de démonstration du système Auto-Healing
 * Test de login admin avec auto-correction automatique
 */

import { test, expect } from '@playwright/test'
import { AutoHealingOrchestrator } from './orchestrator'
import { ErrorContextCollector } from './error-context-collector'

// Utiliser gestionnaire car pas de compte admin créé pour l'instant
const TEST_USER_GESTIONNAIRE = {
  email: 'arthur@seido.pm',
  password: 'Wxcvbn123', // Mot de passe correct pour tous les comptes test
  role: 'gestionnaire',
  expectedDashboard: '/gestionnaire/dashboard'
}

test.describe('🤖 Auto-Healing Demo - Login Gestionnaire', () => {
  let orchestrator: AutoHealingOrchestrator

  test.beforeEach(() => {
    orchestrator = new AutoHealingOrchestrator({
      maxRetries: 3,
      retryDelay: 3000,
      verboseLogging: true
    })
  })

  test('✅ Login gestionnaire with auto-healing', async ({ page }) => {
    const testId = `auto-heal-login-${Date.now()}`
    const testName = 'login-gestionnaire-auto-heal'

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🚀 Starting Auto-Healing Demo Test`)
    console.log(`${'='.repeat(80)}\n`)

    let attempt = 0
    const maxAttempts = 3
    let lastError: Error | null = null

    while (attempt < maxAttempts) {
      attempt++
      console.log(`\n🎯 Attempt ${attempt}/${maxAttempts}`)

      try {
        // Naviguer vers la page de login
        console.log('📍 Navigating to /auth/login...')
        await page.goto('/auth/login')
        await page.waitForLoadState('networkidle')

        // Remplir le formulaire
        console.log('📝 Filling login form...')
        console.log(`   📧 Email: ${TEST_USER_GESTIONNAIRE.email}`)
        console.log(`   🔑 Password: ${TEST_USER_GESTIONNAIRE.password}`)

        // CLEAR browser autofill first to avoid cached credentials
        await page.fill('input[type="email"]', '')
        await page.fill('input[type="password"]', '')

        // Now fill with correct test credentials
        await page.fill('input[type="email"]', TEST_USER_GESTIONNAIRE.email)
        await page.fill('input[type="password"]', TEST_USER_GESTIONNAIRE.password)

        // Vérifier ce qui a été rempli
        const filledEmail = await page.inputValue('input[type="email"]')
        const filledPassword = await page.inputValue('input[type="password"]')
        console.log(`   ✓ Actually filled - Email: ${filledEmail}`)
        console.log(`   ✓ Actually filled - Password: ${filledPassword}`)

        // Soumettre
        console.log('🔘 Submitting form...')
        await page.click('button[type="submit"]')

        // Attendre la redirection (côté client avec délai de propagation cookies)
        console.log(`⏳ Waiting for client-side redirect to ${TEST_USER_GESTIONNAIRE.expectedDashboard}...`)

        try {
          // Le Server Action retourne maintenant le redirectTo au lieu de redirect()
          // Le client fait la navigation après 500ms pour la propagation des cookies
          // On attend donc plus longtemps (15s) pour la navigation côté client
          await page.waitForURL(`**${TEST_USER_GESTIONNAIRE.expectedDashboard}**`, {
            timeout: 15000
          })

          console.log('✅ Redirect successful!')
          console.log(`📍 Current URL: ${page.url()}`)

          // Vérifier le contenu du dashboard
          const mainTitle = page.locator('h1').first()
          await expect(mainTitle).toBeVisible({ timeout: 5000 })

          console.log('\n✅ TEST PASSED! Auto-healing was not needed.')
          return // Success!

        } catch (error) {
          // Timeout sur la redirection - déclencher auto-healing
          lastError = error as Error
          console.log(`\n❌ Redirect timeout detected!`)
          console.log(`   Current URL: ${page.url()}`)
          console.log(`   Expected: ${TEST_USER_GESTIONNAIRE.expectedDashboard}`)

          if (attempt < maxAttempts) {
            console.log(`\n🤖 Triggering AUTO-HEALING system...`)

            // Déclencher le système auto-healing
            const healingReport = await orchestrator.heal(
              testId,
              testName,
              'gestionnaire',
              lastError,
              'waitForURL',
              page,
              TEST_USER_GESTIONNAIRE.expectedDashboard
            )

            if (healingReport.finalResult.resolved) {
              console.log(`\n✅ Auto-healing claims fix was applied`)
              console.log(`   Retrying test after fix...`)
            } else {
              console.log(`\n⚠️  Auto-healing could not fix the issue`)
              console.log(`   Recommendations:`)
              healingReport.recommendations.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec}`)
              })
            }

            // Attendre avant retry
            console.log(`\n⏳ Waiting before retry...`)
            await new Promise(resolve => setTimeout(resolve, 3000))

          } else {
            throw lastError
          }
        }

      } catch (error) {
        if (attempt >= maxAttempts) {
          console.log(`\n❌ TEST FAILED after ${maxAttempts} attempts`)
          throw error
        }
      }
    }
  })
})

/**
 * Test alternatif avec wrapper automatique
 */
test.describe.skip('🤖 Auto-Healing Demo - With Wrapper', () => {
  test('✅ Login with automatic retry wrapper', async ({ page }) => {
    const orchestrator = new AutoHealingOrchestrator()
    let attempts = 0

    const performLogin = async () => {
      attempts++
      console.log(`\nAttempt ${attempts}`)

      await page.goto('/auth/login')

      // CLEAR browser autofill first
      await page.fill('input[type="email"]', '')
      await page.fill('input[type="password"]', '')

      // Fill with correct credentials
      await page.fill('input[type="email"]', TEST_USER_GESTIONNAIRE.email)
      await page.fill('input[type="password"]', TEST_USER_GESTIONNAIRE.password)
      await page.click('button[type="submit"]')

      // Ceci va déclencher auto-healing si timeout
      await page.waitForURL(`**${TEST_USER_GESTIONNAIRE.expectedDashboard}**`, {
        timeout: 10000
      })
    }

    // Retry avec auto-healing
    for (let i = 0; i < 3; i++) {
      try {
        await performLogin()
        console.log(`✅ Success on attempt ${attempts}`)
        return
      } catch (error) {
        if (i < 2) {
          console.log(`🤖 Auto-healing triggered...`)
          await orchestrator.heal(
            `attempt-${i}`,
            'login-gestionnaire',
            'gestionnaire',
            error as Error,
            'login-flow',
            page,
            TEST_USER_GESTIONNAIRE.expectedDashboard
          )
          await new Promise(r => setTimeout(r, 3000))
        } else {
          throw error
        }
      }
    }
  })
})