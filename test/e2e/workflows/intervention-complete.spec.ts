/**
 * Test du Workflow Complet d'Intervention SEIDO
 * Test critique multi-rôles du cycle de vie d'une intervention
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'
import { TEST_ACCOUNTS_CONFIG } from '../../config/test-accounts.config'
import SeidoTesterConfig from '../../config/seido-tester-agent.config'

test.describe('SEIDO - Workflow Complet d\'Intervention', () => {
  test.describe.configure({ mode: 'serial' })

  let browser: Browser
  let locataireContext: BrowserContext
  let gestionnaireContext: BrowserContext
  let prestataireContext: BrowserContext
  let locatairePage: Page
  let gestionnairePage: Page
  let prestatairePage: Page

  let interventionId: string
  let interventionTitle: string

  const accounts = {
    locataire: { email: 'arthur+002@seido.pm', password: 'Wxcvbn123', role: 'locataire' },
    gestionnaire: { email: 'arthur+000@seido.pm', password: 'Wxcvbn123', role: 'gestionnaire' },
    prestataire: { email: 'arthur+001@seido.pm', password: 'Wxcvbn123', role: 'prestataire' }
  }

  test.beforeAll(async ({ browser: b }) => {
    browser = b

    // Créer les contextes pour chaque rôle
    locataireContext = await browser.newContext()
    gestionnaireContext = await browser.newContext()
    prestataireContext = await browser.newContext()

    // Créer les pages
    locatairePage = await locataireContext.newPage()
    gestionnairePage = await gestionnaireContext.newPage()
    prestatairePage = await prestataireContext.newPage()

    // Connexion pour chaque rôle
    await loginUser(locatairePage, accounts.locataire)
    await loginUser(gestionnairePage, accounts.gestionnaire)
    await loginUser(prestatairePage, accounts.prestataire)
  })

  test.afterAll(async () => {
    await locataireContext.close()
    await gestionnaireContext.close()
    await prestataireContext.close()
  })

  async function loginUser(page: Page, account: typeof accounts.locataire) {
    await page.goto('/auth/login')
    await page.fill('[name="email"]', account.email)
    await page.fill('[name="password"]', account.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`**/dashboard/${account.role}`, { timeout: 30000 })
    console.log(`✅ ${account.role} connecté avec succès`)
  }

  test('1. Locataire crée une demande d\'intervention', async () => {
    console.log('\n📝 ÉTAPE 1: Création de la demande d\'intervention')

    // Naviguer vers la création d'intervention
    await locatairePage.goto('/dashboard/locataire')
    await locatairePage.click('[data-testid="new-request-button"]')

    // Générer un titre unique
    interventionTitle = `Test Intervention ${Date.now()}`

    // Remplir le formulaire
    await locatairePage.fill('[name="title"]', interventionTitle)
    await locatairePage.fill('[name="description"]', 'Fuite d\'eau importante dans la salle de bain. Intervention urgente requise.')
    await locatairePage.selectOption('[name="urgency"]', 'high')
    await locatairePage.selectOption('[name="category"]', 'plumbing')

    // Ajouter des photos si possible
    const fileInput = await locatairePage.$('[type="file"]')
    if (fileInput) {
      // Simuler l'upload d'une image
      console.log('  📷 Ajout de photos...')
    }

    // Soumettre le formulaire
    await locatairePage.click('button[type="submit"]')

    // Attendre la confirmation
    await expect(locatairePage.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 })

    // Récupérer l'ID de l'intervention
    const interventionElement = await locatairePage.locator('[data-testid="intervention-id"]')
    if (await interventionElement.isVisible()) {
      interventionId = await interventionElement.textContent() || ''
      console.log(`  ✅ Intervention créée avec l'ID: ${interventionId}`)
    }

    // Vérifier le statut initial
    await expect(locatairePage.locator('[data-testid="intervention-status"]')).toContainText('nouvelle-demande')

    // Mesurer le temps de création
    const creationTime = await locatairePage.evaluate(() => performance.now())
    console.log(`  ⏱️ Temps de création: ${Math.round(creationTime)}ms`)
  })

  test('2. Gestionnaire reçoit notification et valide la demande', async () => {
    console.log('\n👤 ÉTAPE 2: Validation par le gestionnaire')

    // Rafraîchir le dashboard gestionnaire
    await gestionnairePage.goto('/dashboard/gestionnaire')

    // Vérifier la notification
    const notificationBadge = gestionnairePage.locator('[data-testid="notification-badge"]')
    await expect(notificationBadge).toBeVisible({ timeout: 10000 })
    console.log('  🔔 Notification reçue')

    // Aller à la liste des interventions
    await gestionnairePage.click('[data-testid="interventions-list"]')

    // Trouver l'intervention créée
    const interventionItem = gestionnairePage.locator(`text=${interventionTitle}`)
    await expect(interventionItem).toBeVisible({ timeout: 10000 })

    // Ouvrir les détails
    await interventionItem.click()

    // Vérifier les informations
    await expect(gestionnairePage.locator('[data-testid="intervention-title"]')).toContainText(interventionTitle)
    await expect(gestionnairePage.locator('[data-testid="intervention-urgency"]')).toContainText('high')

    // Ajouter un commentaire interne
    await gestionnairePage.fill('[name="internal_comment"]', 'Intervention approuvée. Prestataire à assigner.')

    // Approuver l'intervention
    await gestionnairePage.click('[data-testid="approve-button"]')

    // Confirmer l'approbation
    const confirmDialog = gestionnairePage.locator('[data-testid="confirm-dialog"]')
    if (await confirmDialog.isVisible()) {
      await gestionnairePage.click('[data-testid="confirm-approve"]')
    }

    // Vérifier le changement de statut
    await expect(gestionnairePage.locator('[data-testid="intervention-status"]')).toContainText('approuvée')
    console.log('  ✅ Intervention approuvée')

    // Assigner un prestataire
    await gestionnairePage.click('[data-testid="assign-provider-button"]')
    await gestionnairePage.selectOption('[name="provider_id"]', { label: 'Prestataire Test' })
    await gestionnairePage.click('[data-testid="confirm-assignment"]')
    console.log('  ✅ Prestataire assigné')
  })

  test('3. Prestataire soumet un devis', async () => {
    console.log('\n💼 ÉTAPE 3: Soumission du devis par le prestataire')

    // Rafraîchir le dashboard prestataire
    await prestatairePage.goto('/dashboard/prestataire')

    // Vérifier la notification d'assignation
    await expect(prestatairePage.locator('[data-testid="notification-badge"]')).toBeVisible({ timeout: 10000 })

    // Aller aux interventions assignées
    await prestatairePage.click('[data-testid="my-interventions"]')

    // Trouver l'intervention
    const interventionItem = prestatairePage.locator(`text=${interventionTitle}`)
    await expect(interventionItem).toBeVisible({ timeout: 10000 })
    await interventionItem.click()

    // Créer un devis
    await prestatairePage.click('[data-testid="create-quote-button"]')

    // Remplir le formulaire de devis
    await prestatairePage.fill('[name="amount"]', '250')
    await prestatairePage.fill('[name="description"]', 'Réparation fuite salle de bain\n- Main d\'œuvre: 150€\n- Matériel: 100€')
    await prestatairePage.fill('[name="validity_days"]', '7')

    // Ajouter des items détaillés si disponible
    const addItemButton = prestatairePage.locator('[data-testid="add-quote-item"]')
    if (await addItemButton.isVisible()) {
      await addItemButton.click()
      await prestatairePage.fill('[name="item_description_0"]', 'Main d\'œuvre')
      await prestatairePage.fill('[name="item_amount_0"]', '150')

      await addItemButton.click()
      await prestatairePage.fill('[name="item_description_1"]', 'Matériel (joint, tuyau)')
      await prestatairePage.fill('[name="item_amount_1"]', '100')
    }

    // Soumettre le devis
    await prestatairePage.click('button[type="submit"]')

    // Vérifier la confirmation
    await expect(prestatairePage.locator('[data-testid="quote-submitted"]')).toBeVisible()
    console.log('  ✅ Devis soumis: 250€')
  })

  test('4. Gestionnaire approuve le devis', async () => {
    console.log('\n✅ ÉTAPE 4: Approbation du devis')

    // Retour au gestionnaire
    await gestionnairePage.reload()

    // Notification de nouveau devis
    await expect(gestionnairePage.locator('[data-testid="new-quote-notification"]')).toBeVisible({ timeout: 10000 })

    // Aller aux devis en attente
    await gestionnairePage.click('[data-testid="pending-quotes"]')

    // Trouver et ouvrir le devis
    const quoteItem = gestionnairePage.locator(`[data-testid="quote-${interventionTitle}"]`).first()
    await quoteItem.click()

    // Vérifier les détails du devis
    await expect(gestionnairePage.locator('[data-testid="quote-amount"]')).toContainText('250')

    // Approuver le devis
    await gestionnairePage.click('[data-testid="approve-quote-button"]')

    // Confirmer
    if (await gestionnairePage.locator('[data-testid="confirm-dialog"]').isVisible()) {
      await gestionnairePage.click('[data-testid="confirm-approve"]')
    }

    console.log('  ✅ Devis approuvé')
  })

  test('5. Prestataire planifie et exécute l\'intervention', async () => {
    console.log('\n🔧 ÉTAPE 5: Planification et exécution')

    // Retour au prestataire
    await prestatairePage.reload()

    // Aller à l'intervention
    await prestatairePage.click('[data-testid="my-interventions"]')
    await prestatairePage.locator(`text=${interventionTitle}`).click()

    // Planifier l'intervention
    await prestatairePage.click('[data-testid="schedule-button"]')

    // Sélectionner une date (demain)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    await prestatairePage.fill('[name="date"]', dateStr)
    await prestatairePage.fill('[name="time"]', '10:00')
    await prestatairePage.fill('[name="duration"]', '2')

    await prestatairePage.click('[data-testid="confirm-schedule"]')
    console.log(`  📅 Intervention planifiée pour ${dateStr} à 10:00`)

    // Simuler le début de l'intervention
    await prestatairePage.click('[data-testid="start-intervention"]')
    console.log('  🔧 Intervention démarrée')

    // Ajouter des notes d'exécution
    await prestatairePage.fill('[name="execution_notes"]', 'Fuite réparée. Joint remplacé. Test d\'étanchéité OK.')

    // Marquer comme terminée
    await prestatairePage.click('[data-testid="complete-intervention"]')

    // Ajouter un rapport final si disponible
    const reportSection = prestatairePage.locator('[data-testid="final-report"]')
    if (await reportSection.isVisible()) {
      await prestatairePage.fill('[name="final_notes"]', 'Intervention terminée avec succès. Pas de complications.')
      await prestatairePage.click('[data-testid="submit-report"]')
    }

    console.log('  ✅ Intervention terminée')
  })

  test('6. Vérification finale multi-rôles', async () => {
    console.log('\n🔍 ÉTAPE 6: Vérification finale')

    // Vérifier côté locataire
    await locatairePage.goto('/dashboard/locataire/interventions')
    const locataireStatus = await locatairePage.locator(`[data-testid="status-${interventionTitle}"]`).textContent()
    expect(locataireStatus).toContain('terminée')
    console.log('  ✅ Locataire: statut "terminée" visible')

    // Vérifier côté gestionnaire
    await gestionnairePage.goto('/dashboard/gestionnaire/interventions')
    const gestionnaireStatus = await gestionnairePage.locator(`[data-testid="status-${interventionTitle}"]`).textContent()
    expect(gestionnaireStatus).toContain('terminée')
    console.log('  ✅ Gestionnaire: statut "terminée" confirmé')

    // Vérifier l'historique complet
    await gestionnairePage.click(`[data-testid="history-${interventionTitle}"]`)
    const historyItems = await gestionnairePage.locator('[data-testid="history-item"]').count()
    expect(historyItems).toBeGreaterThan(5) // Au moins 5 événements dans l'historique
    console.log(`  📜 Historique complet: ${historyItems} événements`)

    // Vérifier les notifications
    const locataireNotifs = await locatairePage.locator('[data-testid="notification-item"]').count()
    const gestionnaireNotifs = await gestionnairePage.locator('[data-testid="notification-item"]').count()
    console.log(`  🔔 Notifications: Locataire (${locataireNotifs}), Gestionnaire (${gestionnaireNotifs})`)

    console.log('\n✅ WORKFLOW COMPLET VALIDÉ AVEC SUCCÈS!')
  })

  test('Performance du workflow complet', async () => {
    console.log('\n📊 Métriques de performance du workflow')

    // Collecter les métriques de chaque page
    const metrics = {
      locataire: await collectPageMetrics(locatairePage),
      gestionnaire: await collectPageMetrics(gestionnairePage),
      prestataire: await collectPageMetrics(prestatairePage)
    }

    // Analyser les performances
    for (const [role, roleMetrics] of Object.entries(metrics)) {
      console.log(`\n  ${role.toUpperCase()}:`)
      console.log(`    Memory: ${Math.round(roleMetrics.memory)}MB`)
      console.log(`    API Calls: ${roleMetrics.apiCalls}`)
      console.log(`    Avg Response Time: ${Math.round(roleMetrics.avgResponseTime)}ms`)

      // Vérifications de performance
      expect(roleMetrics.memory).toBeLessThan(200) // Max 200MB
      expect(roleMetrics.apiCalls).toBeLessThan(50) // Max 50 API calls
      expect(roleMetrics.avgResponseTime).toBeLessThan(1000) // Max 1s avg response
    }
  })

  async function collectPageMetrics(page: Page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const apiCalls = resources.filter(r => r.name.includes('/api/'))

      return {
        memory: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
        apiCalls: apiCalls.length,
        avgResponseTime: apiCalls.length > 0
          ? apiCalls.reduce((sum, r) => sum + r.duration, 0) / apiCalls.length
          : 0
      }
    })
  }
})