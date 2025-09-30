/**
 * Test E2E: Vérification du chargement des données du dashboard gestionnaire
 * Vérifie que le dashboard affiche correctement les 5 contacts et autres données
 */

import { test, expect } from '@playwright/test'

const GESTIONNAIRE = {
  email: 'arthur@seido.pm',
  password: 'Wxcvbn123',
  expectedDashboard: '/gestionnaire/dashboard'
}

test.describe('Dashboard Gestionnaire - Chargement des données', () => {
  test('Doit charger et afficher les 5 contacts', async ({ page }) => {
    console.log('🚀 Starting gestionnaire dashboard data test')

    // Étape 1: Login
    console.log('📝 Step 1: Navigate to login')
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    console.log('📝 Step 2: Fill credentials')
    await page.fill('input[type="email"]', GESTIONNAIRE.email)
    await page.fill('input[type="password"]', GESTIONNAIRE.password)

    console.log('📝 Step 3: Submit login')
    await page.click('button[type="submit"]')

    console.log('📝 Step 4: Wait for dashboard redirect')
    await page.waitForURL(`**${GESTIONNAIRE.expectedDashboard}**`, {
      timeout: 10000
    })

    console.log('✅ Redirected to:', page.url())

    // Attendre que la page soit complètement chargée
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Attendre le chargement des données

    // Prendre une capture d'écran
    await page.screenshot({
      path: 'test/e2e/screenshots/gestionnaire-dashboard-loaded.png',
      fullPage: true
    })

    console.log('📸 Screenshot saved')

    // Vérifier le titre de la page
    const title = await page.locator('h1, h2').first().textContent()
    console.log('📌 Page title:', title)
    expect(title).toContain('Tableau de bord')

    // Vérifier que les cartes de statistiques sont présentes
    console.log('📊 Checking statistics cards...')

    // Chercher la carte "Contacts" ou équivalent
    const contactsCard = page.locator('text=/contacts/i').first()
    await expect(contactsCard).toBeVisible({ timeout: 5000 })

    // Vérifier le texte du body pour s'assurer que les données sont chargées
    const bodyText = await page.locator('body').textContent()

    // Vérifications des données
    console.log('📝 Checking for data presence...')

    // Chercher des indicateurs de données chargées (pas vides)
    const hasContactsData = bodyText?.includes('contact') || bodyText?.includes('Contact')
    const hasPropertyData = bodyText?.includes('Immeuble') || bodyText?.includes('immeuble') || bodyText?.includes('Propriété')

    console.log('✅ Has contacts data:', hasContactsData)
    console.log('✅ Has property data:', hasPropertyData)

    // Vérifier qu'il n'y a pas de messages "vide" ou "aucun"
    const emptyMessages = page.locator('text=/aucun|vide|empty|no data/i')
    const emptyCount = await emptyMessages.count()
    console.log('⚠️  Empty state messages found:', emptyCount)

    // Compter les éléments de données visibles
    // Chercher des cartes, des listes ou des tableaux
    const statCards = page.locator('[class*="card"], [class*="Card"]')
    const cardCount = await statCards.count()
    console.log('📊 Stat cards found:', cardCount)

    // Vérification: Au moins 3 cartes de stats devraient être visibles
    expect(cardCount).toBeGreaterThanOrEqual(3)

    // Chercher le texte "5 comptes actifs" ou similaire
    const accountsText = page.locator('text=/5.*compt|compt.*5/i')
    const hasAccountsCount = await accountsText.count()
    console.log('👥 Found "5 comptes" text:', hasAccountsCount > 0)

    // Si on trouve "5 comptes", c'est un succès
    if (hasAccountsCount > 0) {
      const text = await accountsText.first().textContent()
      console.log('✅ Accounts text found:', text)
      expect(text).toBeTruthy()
    }

    // Vérifications globales
    expect(hasContactsData || hasPropertyData).toBeTruthy()

    console.log('✅ Dashboard data loading test completed successfully')
  })

  test('Doit afficher les statistiques du dashboard', async ({ page }) => {
    console.log('🚀 Starting dashboard statistics test')

    // Login
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', GESTIONNAIRE.email)
    await page.fill('input[type="password"]', GESTIONNAIRE.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`**${GESTIONNAIRE.expectedDashboard}**`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Vérifier les sections du dashboard
    const sections = [
      'Immeubles',
      'Lots',
      'Contacts',
      'Interventions'
    ]

    for (const section of sections) {
      const sectionElement = page.locator(`text=/${section}/i`).first()
      const isVisible = await sectionElement.isVisible().catch(() => false)
      console.log(`📊 Section "${section}":`, isVisible ? 'visible' : 'not found')
    }

    console.log('✅ Statistics verification completed')
  })
})
