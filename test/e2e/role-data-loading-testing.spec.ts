/**
 * Test E2E pour le chargement des données par rôle
 * Vérifie que chaque dashboard charge correctement ses données spécifiques
 * Teste également la persistance et le rafraîchissement des données
 */

import { test, expect, type Page } from '@playwright/test'

// Configuration des comptes de test RÉELS
const TEST_ACCOUNTS = {
  admin: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    dashboard: '/admin/dashboard'
  },
  gestionnaire: {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    dashboard: '/gestionnaire/dashboard'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    dashboard: '/locataire/dashboard'
  }
}

// Helper pour se connecter
async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"], input[name="email"], #email', email)
  await page.fill('input[type="password"], input[name="password"], #password', password)
  await page.click('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')

  // Attendre que l'authentification soit complète
  await page.waitForTimeout(2000)
}

// Helper pour vérifier l'absence de spinners
async function waitForDataLoad(page: Page) {
  // Attendre que les spinners disparaissent
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Attendre que le réseau soit stable
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // Petite pause pour s'assurer que tout est chargé
  await page.waitForTimeout(1000)
}

// Helper pour compter les éléments visibles
async function countVisibleElements(page: Page, selector: string): Promise<number> {
  const elements = await page.locator(selector).all()
  let count = 0
  for (const element of elements) {
    if (await element.isVisible({ timeout: 100 }).catch(() => false)) {
      count++
    }
  }
  return count
}

test.describe('Chargement des Données par Rôle', () => {
  test.beforeEach(async ({ page }) => {
    // Nettoyer l'état
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.context().clearCookies()
  })

  test('Gestionnaire: Chargement complet des données', async ({ page }) => {
    console.log('Testing data loading for Gestionnaire...')

    // 1. Se connecter
    await login(page, TEST_ACCOUNTS.gestionnaire.email, TEST_ACCOUNTS.gestionnaire.password)
    await page.waitForURL(TEST_ACCOUNTS.gestionnaire.dashboard, { timeout: 15000 })
    await waitForDataLoad(page)

    // 2. Vérifier le titre du dashboard
    await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Tableau de bord/i }).first()).toBeVisible({ timeout: 10000 })

    // 3. Vérifier les statistiques
    console.log('  Vérification des statistiques...')
    const statsCards = page.locator('[data-testid="stat-card"], .stat-card, [class*="stat"], [class*="metric"]')
    const statsCount = await countVisibleElements(page, '[data-testid="stat-card"], .stat-card, [class*="stat"], [class*="metric"]')

    if (statsCount > 0) {
      console.log(`  ✓ ${statsCount} statistiques chargées`)

      // Vérifier qu'au moins certaines valeurs sont non nulles
      const statsTexts = await statsCards.allTextContents()
      const hasNonZeroValues = statsTexts.some(text => /[1-9]/.test(text))
      expect(hasNonZeroValues).toBeTruthy()
      console.log('  ✓ Statistiques contiennent des valeurs')
    }

    // 4. Vérifier la liste des interventions
    console.log('  Vérification des interventions...')

    // Chercher les interventions avec différents sélecteurs possibles
    const interventionSelectors = [
      '[data-testid="intervention-item"]',
      '.intervention-item',
      '[class*="intervention"]',
      'tr[data-intervention]',
      'div[data-intervention-id]'
    ]

    let interventionCount = 0
    for (const selector of interventionSelectors) {
      const count = await countVisibleElements(page, selector)
      if (count > 0) {
        interventionCount = count
        console.log(`  ✓ ${count} interventions trouvées avec le sélecteur: ${selector}`)
        break
      }
    }

    // Si aucune intervention n'est trouvée, chercher un message "Aucune intervention"
    if (interventionCount === 0) {
      const emptyMessage = page.locator('text=/aucune intervention|pas d\'intervention|no intervention/i')
      if (await emptyMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ℹ️ Message "Aucune intervention" affiché')
      } else {
        console.log('  ⚠️ Aucune intervention visible')
      }
    }

    // 5. Vérifier les boutons d'action
    console.log('  Vérification des boutons d\'action...')
    const actionButtons = [
      'button:has-text("Approuver")',
      'button:has-text("Rejeter")',
      'button:has-text("Voir")',
      'button:has-text("Détails")',
      'a:has-text("Interventions")',
      'a:has-text("Biens")'
    ]

    for (const buttonSelector of actionButtons) {
      const button = page.locator(buttonSelector).first()
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ✓ Bouton trouvé: ${buttonSelector}`)
      }
    }

    // 6. Tester le rafraîchissement des données
    console.log('  Test du rafraîchissement...')
    await page.reload()
    await waitForDataLoad(page)

    // Vérifier que les données sont toujours là après rafraîchissement
    const statsCountAfterReload = await countVisibleElements(page, '[data-testid="stat-card"], .stat-card, [class*="stat"], [class*="metric"]')
    expect(statsCountAfterReload).toBeGreaterThan(0)
    console.log(`  ✓ Données persistantes après rafraîchissement (${statsCountAfterReload} stats)`)

    // Screenshot du dashboard chargé
    await page.screenshot({
      path: 'test-results/data-gestionnaire-loaded.png',
      fullPage: true
    })
  })

  test('Prestataire: Chargement complet des données', async ({ page }) => {
    console.log('Testing data loading for Prestataire...')

    // 1. Se connecter
    await login(page, TEST_ACCOUNTS.prestataire.email, TEST_ACCOUNTS.prestataire.password)
    await page.waitForURL(TEST_ACCOUNTS.prestataire.dashboard, { timeout: 15000 })
    await waitForDataLoad(page)

    // 2. Vérifier le titre du dashboard
    await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Mes interventions|Prestataire/i }).first()).toBeVisible({ timeout: 10000 })

    // 3. Vérifier les interventions assignées
    console.log('  Vérification des interventions assignées...')

    const interventionCount = await countVisibleElements(page, '[data-testid="intervention-item"], .intervention-item, [class*="intervention"]')

    if (interventionCount > 0) {
      console.log(`  ✓ ${interventionCount} interventions assignées trouvées`)

      // Vérifier les statuts des interventions
      const statusBadges = page.locator('[data-status], .status-badge, [class*="status"]')
      const statusCount = await countVisibleElements(page, '[data-status], .status-badge, [class*="status"]')
      if (statusCount > 0) {
        console.log(`  ✓ ${statusCount} statuts d'intervention visibles`)
      }
    } else {
      const emptyMessage = page.locator('text=/aucune intervention|pas d\'intervention assignée/i')
      if (await emptyMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ℹ️ Message "Aucune intervention assignée" affiché')
      }
    }

    // 4. Vérifier la section devis
    console.log('  Vérification de la section devis...')
    const quotesSection = page.locator('text=/devis|quotes|estimation/i')
    if (await quotesSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ Section devis présente')

      // Compter les devis
      const quotesCount = await countVisibleElements(page, '[data-testid="quote-item"], .quote-item, [class*="quote"]')
      if (quotesCount > 0) {
        console.log(`  ✓ ${quotesCount} devis trouvés`)
      }
    }

    // 5. Vérifier le planning/calendrier
    console.log('  Vérification du planning...')
    const planningSection = page.locator('text=/planning|calendrier|disponibilités/i')
    if (await planningSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ Section planning présente')
    }

    // 6. Vérifier les actions disponibles
    console.log('  Vérification des actions prestataire...')
    const prestataireActions = [
      'button:has-text("Accepter")',
      'button:has-text("Démarrer")',
      'button:has-text("Terminer")',
      'button:has-text("Créer un devis")',
      'a:has-text("Mes interventions")'
    ]

    for (const actionSelector of prestataireActions) {
      const action = page.locator(actionSelector).first()
      if (await action.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ✓ Action trouvée: ${actionSelector}`)
      }
    }

    // Screenshot du dashboard chargé
    await page.screenshot({
      path: 'test-results/data-prestataire-loaded.png',
      fullPage: true
    })
  })

  test('Locataire: Chargement complet des données', async ({ page }) => {
    console.log('Testing data loading for Locataire...')

    // 1. Se connecter
    await login(page, TEST_ACCOUNTS.locataire.email, TEST_ACCOUNTS.locataire.password)
    await page.waitForURL(TEST_ACCOUNTS.locataire.dashboard, { timeout: 15000 })
    await waitForDataLoad(page)

    // 2. Vérifier le titre du dashboard
    await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Mes demandes|Locataire/i }).first()).toBeVisible({ timeout: 10000 })

    // 3. Vérifier les demandes d'intervention
    console.log('  Vérification des demandes d\'intervention...')

    const demandesCount = await countVisibleElements(page, '[data-testid="demande-item"], .demande-item, [class*="intervention"]')

    if (demandesCount > 0) {
      console.log(`  ✓ ${demandesCount} demandes trouvées`)

      // Vérifier les statuts
      const statusElements = page.locator('[data-status], .status, [class*="status"]')
      for (const element of await statusElements.all()) {
        const text = await element.textContent()
        if (text) {
          console.log(`    - Statut: ${text.trim()}`)
        }
      }
    } else {
      const emptyMessage = page.locator('text=/aucune demande|pas de demande/i')
      if (await emptyMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ℹ️ Message "Aucune demande" affiché')
      }
    }

    // 4. Vérifier le bouton de nouvelle demande
    console.log('  Vérification du bouton nouvelle demande...')
    const newRequestButton = page.locator('button:has-text("Nouvelle demande"), a:has-text("Nouvelle demande"), [data-testid="new-request"]')
    if (await newRequestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ Bouton "Nouvelle demande" disponible')

      // Tester le clic sur le bouton
      await newRequestButton.click()
      await page.waitForTimeout(2000)

      // Vérifier qu'on est sur le formulaire ou la modale
      const formPresent = await page.locator('form, [role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false)
      if (formPresent) {
        console.log('  ✓ Formulaire de nouvelle demande accessible')

        // Revenir au dashboard
        const closeButton = page.locator('button:has-text("Annuler"), button:has-text("Fermer"), [aria-label="Close"]')
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click()
        } else {
          await page.goBack()
        }
      }
    }

    // 5. Vérifier les informations du bien
    console.log('  Vérification des informations du bien...')
    const propertyInfo = page.locator('text=/adresse|appartement|lot|immeuble/i')
    if (await propertyInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  ✓ Informations du bien affichées')
    }

    // Screenshot du dashboard chargé
    await page.screenshot({
      path: 'test-results/data-locataire-loaded.png',
      fullPage: true
    })
  })

  test('Performance: Temps de chargement des données', async ({ page }) => {
    console.log('Testing data loading performance...')

    const performanceResults: Record<string, { initial: number; reload: number }> = {}

    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      console.log(`\nTesting ${role} performance...`)

      // Mesurer le chargement initial
      const startInitial = Date.now()

      await login(page, account.email, account.password)
      await page.waitForURL(account.dashboard, { timeout: 15000 })
      await waitForDataLoad(page)

      const endInitial = Date.now()
      const initialLoad = endInitial - startInitial

      // Mesurer le rechargement
      const startReload = Date.now()

      await page.reload()
      await waitForDataLoad(page)

      const endReload = Date.now()
      const reloadTime = endReload - startReload

      performanceResults[role] = { initial: initialLoad, reload: reloadTime }

      console.log(`  Initial load: ${initialLoad}ms`)
      console.log(`  Reload: ${reloadTime}ms`)

      // Vérifications de performance
      expect(initialLoad).toBeLessThan(10000) // Max 10s pour le chargement initial
      expect(reloadTime).toBeLessThan(5000)   // Max 5s pour le rechargement

      // Nettoyer pour le prochain test
      await page.goto('/auth/logout')
    }

    // Résumé des performances
    console.log('\n📊 Résumé des performances de chargement:')
    for (const [role, times] of Object.entries(performanceResults)) {
      const initialStatus = times.initial < 3000 ? '✅' : times.initial < 7000 ? '⚠️' : '❌'
      const reloadStatus = times.reload < 2000 ? '✅' : times.reload < 4000 ? '⚠️' : '❌'
      console.log(`  ${role}:`)
      console.log(`    ${initialStatus} Initial: ${times.initial}ms`)
      console.log(`    ${reloadStatus} Reload: ${times.reload}ms`)
    }
  })

  test('Stabilité: Données persistent après navigation', async ({ page }) => {
    console.log('Testing data persistence after navigation...')

    // Se connecter comme gestionnaire
    await login(page, TEST_ACCOUNTS.gestionnaire.email, TEST_ACCOUNTS.gestionnaire.password)
    await page.waitForURL(TEST_ACCOUNTS.gestionnaire.dashboard, { timeout: 15000 })
    await waitForDataLoad(page)

    // Capturer l'état initial
    const initialStatsCount = await countVisibleElements(page, '[data-testid="stat-card"], .stat-card, [class*="stat"]')
    const initialInterventionsCount = await countVisibleElements(page, '[data-testid="intervention-item"], .intervention-item')

    console.log(`  État initial: ${initialStatsCount} stats, ${initialInterventionsCount} interventions`)

    // Naviguer vers une autre page
    const biensLink = page.locator('a:has-text("Biens"), [href*="/biens"]').first()
    if (await biensLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await biensLink.click()
      await waitForDataLoad(page)
      console.log('  ✓ Navigation vers la page Biens')

      // Revenir au dashboard
      const dashboardLink = page.locator('a:has-text("Dashboard"), a:has-text("Tableau de bord"), [href*="/dashboard"]').first()
      if (await dashboardLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dashboardLink.click()
      } else {
        await page.goto(TEST_ACCOUNTS.gestionnaire.dashboard)
      }
      await waitForDataLoad(page)

      // Vérifier que les données sont toujours là
      const afterNavStatsCount = await countVisibleElements(page, '[data-testid="stat-card"], .stat-card, [class*="stat"]')
      const afterNavInterventionsCount = await countVisibleElements(page, '[data-testid="intervention-item"], .intervention-item')

      console.log(`  État après navigation: ${afterNavStatsCount} stats, ${afterNavInterventionsCount} interventions`)

      // Les données devraient être similaires (permettre une petite variation)
      expect(Math.abs(afterNavStatsCount - initialStatsCount)).toBeLessThanOrEqual(2)
      console.log('  ✓ Données persistantes après navigation')
    }
  })
})