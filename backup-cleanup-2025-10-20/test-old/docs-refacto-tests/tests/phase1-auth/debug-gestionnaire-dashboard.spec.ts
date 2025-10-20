/**
 * 🔍 TEST DEBUG - Dashboard Gestionnaire
 * Test pour diagnostiquer le problème des données vides
 */

import { test, expect } from '@playwright/test'

const GESTIONNAIRE = {
  email: 'arthur@seido.pm',
  password: 'Wxcvbn123',
  expectedDashboard: '/gestionnaire/dashboard'
}

test('🔍 Debug: Gestionnaire dashboard data loading', async ({ page }) => {
  console.log('🚀 Starting gestionnaire dashboard debug test')

  // Étape 1: Login
  console.log('📝 Step 1: Navigate to login')
  await page.goto('http://localhost:3000/auth/login')
  await page.waitForLoadState('networkidle')

  console.log('📝 Step 2: Fill credentials')
  await page.fill('input[type="email"]', '')
  await page.fill('input[type="password"]', '')
  await page.fill('input[type="email"]', GESTIONNAIRE.email)
  await page.fill('input[type="password"]', GESTIONNAIRE.password)

  console.log('📝 Step 3: Submit login')

  // ✅ FIX: Ne pas attendre de navigation sur click (Server Actions Next.js 15)
  await Promise.all([
    page.waitForURL(`**${GESTIONNAIRE.expectedDashboard}**`, {
      timeout: 45000  // Timeout augmenté pour auth + middleware + dashboard load
    }),
    page.click('button[type="submit"]', { timeout: 5000 })
  ])

  console.log('📝 Step 4: Wait for dashboard redirect')

  console.log('✅ Redirected to:', page.url())

  // Attendre que la page soit complètement chargée
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000) // Attendre 2s pour le chargement des données

  // Prendre une capture d'écran
  await page.screenshot({
    path: 'docs/refacto/Tests/screenshots/debug-gestionnaire-dashboard.png',
    fullPage: true
  })

  console.log('📸 Screenshot saved')

  // Analyser le contenu de la page
  console.log('\n📊 Dashboard Content Analysis:')
  console.log('================================')

  // Vérifier le titre
  const title = await page.locator('h1').first().textContent()
  console.log('📌 Title:', title)

  // Chercher tous les textes visibles
  const bodyText = await page.locator('body').textContent()
  console.log('\n📝 Page contains:')
  console.log('- "intervention":', bodyText?.toLowerCase().includes('intervention'))
  console.log('- "équipe":', bodyText?.toLowerCase().includes('équipe'))
  console.log('- "bâtiment":', bodyText?.toLowerCase().includes('bâtiment'))
  console.log('- "contact":', bodyText?.toLowerCase().includes('contact'))

  // Chercher des cartes statistiques
  const statCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]')
  const cardCount = await statCards.count()
  console.log('\n📊 Stat cards found:', cardCount)

  // Afficher les 5 premiers éléments de carte
  for (let i = 0; i < Math.min(cardCount, 5); i++) {
    const cardText = await statCards.nth(i).textContent()
    console.log(`  Card ${i + 1}:`, cardText?.substring(0, 100))
  }

  // Chercher des tableaux ou listes
  const tables = page.locator('table')
  const tableCount = await tables.count()
  console.log('\n📋 Tables found:', tableCount)

  const lists = page.locator('ul, ol')
  const listCount = await lists.count()
  console.log('📋 Lists found:', listCount)

  // Chercher des messages "vide" ou "aucun"
  const emptyMessages = page.locator('text=/aucun|vide|empty|no data/i')
  const emptyCount = await emptyMessages.count()
  console.log('\n⚠️  Empty state messages found:', emptyCount)

  if (emptyCount > 0) {
    console.log('⚠️  Empty messages:')
    for (let i = 0; i < emptyCount; i++) {
      const msg = await emptyMessages.nth(i).textContent()
      console.log(`  - "${msg}"`)
    }
  }

  // Vérifier les requêtes réseau
  console.log('\n🌐 Network Analysis:')

  const responses: any[] = []
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('/api/') || url.includes('supabase')) {
      responses.push({
        url,
        status: response.status(),
        statusText: response.statusText()
      })
    }
  })

  // Recharger la page pour capturer les requêtes
  console.log('\n🔄 Reloading page to capture network requests...')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  console.log('\n🌐 API Requests captured:')
  responses.forEach(r => {
    console.log(`  ${r.status} - ${r.url}`)
  })

  // Vérifier les erreurs console
  const consoleMessages: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(`[ERROR] ${msg.text()}`)
    }
  })

  if (consoleMessages.length > 0) {
    console.log('\n❌ Console Errors:')
    consoleMessages.forEach(msg => console.log(`  ${msg}`))
  }

  // Récupérer le HTML du body pour analyse
  const bodyHTML = await page.locator('body').innerHTML()

  // Chercher des indicateurs de données manquantes
  console.log('\n🔍 Data Loading Indicators:')
  console.log('- Loading spinner:', bodyHTML.includes('loading') || bodyHTML.includes('spinner'))
  console.log('- Skeleton:', bodyHTML.includes('skeleton'))
  console.log('- Error boundary:', bodyHTML.includes('error'))

  console.log('\n================================')
  console.log('✅ Debug test completed')
  console.log('📸 Check screenshot at: docs/refacto/Tests/screenshots/debug-gestionnaire-dashboard.png')
})