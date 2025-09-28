/**
 * 🧪 PHASE 3: Complete Workflow E2E Tests
 *
 * Tests complets du workflow multi-rôles avec validation
 * de performance sous charge et cache optimization
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 3: Complete Multi-Role Workflow Tests', () => {
  test('Complete intervention workflow with performance monitoring', async ({ browser }) => {
    console.log('🚀 [WORKFLOW-TEST] Starting complete multi-role workflow')

    // Créer contextes séparés pour chaque rôle
    const locataireContext = await browser.newContext()
    const gestionnaireContext = await browser.newContext()
    const prestataireContext = await browser.newContext()

    const locatairePage = await locataireContext.newPage()
    const gestionnaireePage = await gestionnaireContext.newPage()
    const prestatairePage = await prestataireContext.newPage()

    // Track performance metrics
    const performanceMetrics = {
      loginTimes: {},
      actionTimes: {},
      cacheMetrics: {}
    }

    try {
      // 1. Login tous les rôles simultanément
      console.log('👥 [WORKFLOW-TEST] Logging in all roles simultaneously')

      const loginPromises = [
        // Locataire login
        (async () => {
          const startTime = Date.now()
          await locatairePage.goto('/auth/login')
          await locatairePage.fill('[name="email"]', 'locataire@seido.com')
          await locatairePage.fill('[name="password"]', 'password123')
          await locatairePage.click('button[type="submit"]')
          await locatairePage.waitForSelector('[data-testid="dashboard-header"]')
          performanceMetrics.loginTimes.locataire = Date.now() - startTime
          console.log(`✅ [WORKFLOW-TEST] Locataire logged in: ${performanceMetrics.loginTimes.locataire}ms`)
        })(),

        // Gestionnaire login
        (async () => {
          const startTime = Date.now()
          await gestionnaireePage.goto('/auth/login')
          await gestionnaireePage.fill('[name="email"]', 'gestionnaire@seido.com')
          await gestionnaireePage.fill('[name="password"]', 'password123')
          await gestionnaireePage.click('button[type="submit"]')
          await gestionnaireePage.waitForSelector('[data-testid="dashboard-header"]')
          performanceMetrics.loginTimes.gestionnaire = Date.now() - startTime
          console.log(`✅ [WORKFLOW-TEST] Gestionnaire logged in: ${performanceMetrics.loginTimes.gestionnaire}ms`)
        })(),

        // Prestataire login
        (async () => {
          const startTime = Date.now()
          await prestatairePage.goto('/auth/login')
          await prestatairePage.fill('[name="email"]', 'prestataire@seido.com')
          await prestatairePage.fill('[name="password"]', 'password123')
          await prestatairePage.click('button[type="submit"]')
          await prestatairePage.waitForSelector('[data-testid="dashboard-header"]')
          performanceMetrics.loginTimes.prestataire = Date.now() - startTime
          console.log(`✅ [WORKFLOW-TEST] Prestataire logged in: ${performanceMetrics.loginTimes.prestataire}ms`)
        })()
      ]

      await Promise.all(loginPromises)

      // Vérifier temps de login raisonnables
      Object.entries(performanceMetrics.loginTimes).forEach(([role, time]) => {
        expect(time).toBeLessThan(5000) // 5s max pour login
      })

      // 2. Locataire crée une demande d'intervention
      console.log('📝 [WORKFLOW-TEST] Locataire creating intervention request')

      const demandCreationStart = Date.now()
      await locatairePage.goto('/locataire/dashboard/interventions')
      await locatairePage.click('[data-testid="create-intervention"]')
      await locatairePage.waitForSelector('[data-testid="intervention-form"]')

      await locatairePage.fill('[name="title"]', 'Fuite robinet cuisine - Test Phase 3')
      await locatairePage.fill('[name="description"]', 'Le robinet de la cuisine fuit depuis ce matin. Intervention urgente requise.')
      await locatairePage.selectOption('[name="priority"]', 'high')
      await locatairePage.selectOption('[name="category"]', 'plumbing')
      await locatairePage.click('button[type="submit"]')

      await locatairePage.waitForSelector('[data-testid="intervention-created"]')
      const demandId = await locatairePage.getAttribute('[data-testid="intervention-created"]', 'data-intervention-id')

      performanceMetrics.actionTimes.demandCreation = Date.now() - demandCreationStart
      console.log(`✅ [WORKFLOW-TEST] Intervention created: ${demandId} in ${performanceMetrics.actionTimes.demandCreation}ms`)

      expect(performanceMetrics.actionTimes.demandCreation).toBeLessThan(3000) // 3s max

      // 3. Gestionnaire valide la demande
      console.log('✅ [WORKFLOW-TEST] Gestionnaire validating intervention')

      const validationStart = Date.now()
      await gestionnaireePage.goto('/gestionnaire/dashboard/interventions')
      await gestionnaireePage.waitForSelector('[data-testid="intervention-list"]')

      // Rechercher l'intervention créée
      await gestionnaireePage.fill('[data-testid="search-input"]', 'Fuite robinet cuisine')
      await gestionnaireePage.click('[data-testid="search-button"]')
      await gestionnaireePage.waitForSelector(`[data-testid="intervention-${demandId}"]`)

      await gestionnaireePage.click(`[data-testid="intervention-${demandId}"]`)
      await gestionnaireePage.waitForSelector('[data-testid="intervention-details"]')
      await gestionnaireePage.click('[data-testid="validate-intervention"]')
      await gestionnaireePage.click('[data-testid="confirm-validation"]')

      performanceMetrics.actionTimes.validation = Date.now() - validationStart
      console.log(`✅ [WORKFLOW-TEST] Intervention validated in ${performanceMetrics.actionTimes.validation}ms`)

      expect(performanceMetrics.actionTimes.validation).toBeLessThan(4000) // 4s max

      // 4. Prestataire consulte et crée un devis
      console.log('💰 [WORKFLOW-TEST] Prestataire creating quote')

      const quoteCreationStart = Date.now()
      await prestatairePage.goto('/prestataire/dashboard/interventions')
      await prestatairePage.waitForSelector('[data-testid="intervention-list"]')

      await prestatairePage.click(`[data-testid="intervention-${demandId}"]`)
      await prestatairePage.waitForSelector('[data-testid="intervention-details"]')
      await prestatairePage.click('[data-testid="create-quote"]')

      await prestatairePage.fill('[name="amount"]', '180')
      await prestatairePage.fill('[name="description"]', 'Réparation robinet + remplacement joint - Intervention urgente')
      await prestatairePage.fill('[name="estimated_duration"]', '2')
      await prestatairePage.click('button[type="submit"]')

      performanceMetrics.actionTimes.quoteCreation = Date.now() - quoteCreationStart
      console.log(`✅ [WORKFLOW-TEST] Quote created in ${performanceMetrics.actionTimes.quoteCreation}ms`)

      expect(performanceMetrics.actionTimes.quoteCreation).toBeLessThan(3000) // 3s max

      // 5. Gestionnaire approuve le devis
      console.log('✅ [WORKFLOW-TEST] Gestionnaire approving quote')

      const quoteApprovalStart = Date.now()
      await gestionnaireePage.reload()
      await gestionnaireePage.waitForSelector('[data-testid="intervention-details"]')
      await gestionnaireePage.click('[data-testid="approve-quote"]')
      await gestionnaireePage.click('[data-testid="confirm-approval"]')

      performanceMetrics.actionTimes.quoteApproval = Date.now() - quoteApprovalStart
      console.log(`✅ [WORKFLOW-TEST] Quote approved in ${performanceMetrics.actionTimes.quoteApproval}ms`)

      // 6. Prestataire planifie l'intervention
      console.log('📅 [WORKFLOW-TEST] Prestataire scheduling intervention')

      const schedulingStart = Date.now()
      await prestatairePage.reload()
      await prestatairePage.waitForSelector('[data-testid="intervention-details"]')
      await prestatairePage.click('[data-testid="schedule-intervention"]')

      // Planifier pour demain
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      await prestatairePage.fill('[name="scheduled_date"]', dateStr)
      await prestatairePage.fill('[name="scheduled_time"]', '14:00')
      await prestatairePage.click('button[type="submit"]')

      performanceMetrics.actionTimes.scheduling = Date.now() - schedulingStart
      console.log(`✅ [WORKFLOW-TEST] Intervention scheduled in ${performanceMetrics.actionTimes.scheduling}ms`)

      // 7. Vérifier notifications pour tous les rôles
      console.log('🔔 [WORKFLOW-TEST] Verifying notifications')

      const notificationChecks = await Promise.all([
        locatairePage.locator('[data-testid="notification-badge"]').isVisible(),
        gestionnaireePage.locator('[data-testid="notification-badge"]').isVisible(),
        prestatairePage.locator('[data-testid="notification-badge"]').isVisible()
      ])

      notificationChecks.forEach((hasNotification, index) => {
        const roles = ['locataire', 'gestionnaire', 'prestataire']
        console.log(`📬 [WORKFLOW-TEST] ${roles[index]} notifications: ${hasNotification ? 'Yes' : 'No'}`)
      })

      // Au moins 2 rôles doivent avoir des notifications
      const activeNotifications = notificationChecks.filter(Boolean).length
      expect(activeNotifications).toBeGreaterThanOrEqual(2)

      // 8. Prestataire marque comme terminé
      console.log('✅ [WORKFLOW-TEST] Prestataire completing intervention')

      const completionStart = Date.now()
      await prestatairePage.click('[data-testid="mark-completed"]')
      await prestatairePage.waitForSelector('[data-testid="completion-form"]')
      await prestatairePage.fill('[name="completion_notes"]', 'Robinet réparé avec succès. Joint remplacé. Test effectué.')
      await prestatairePage.click('button[type="submit"]')

      performanceMetrics.actionTimes.completion = Date.now() - completionStart
      console.log(`✅ [WORKFLOW-TEST] Intervention completed in ${performanceMetrics.actionTimes.completion}ms`)

      // 9. Vérifier statut final dans tous les dashboards
      console.log('🔍 [WORKFLOW-TEST] Verifying final status across all dashboards')

      const statusVerifications = await Promise.all([
        // Locataire
        (async () => {
          await locatairePage.goto('/locataire/dashboard/interventions')
          await locatairePage.waitForSelector('[data-testid="intervention-list"]')
          const status = await locatairePage.locator(`[data-testid="status-${demandId}"]`).textContent()
          return { role: 'locataire', status }
        })(),

        // Gestionnaire
        (async () => {
          await gestionnaireePage.goto('/gestionnaire/dashboard/interventions')
          await gestionnaireePage.waitForSelector('[data-testid="intervention-list"]')
          const status = await gestionnaireePage.locator(`[data-testid="status-${demandId}"]`).textContent()
          return { role: 'gestionnaire', status }
        })(),

        // Prestataire
        (async () => {
          await prestatairePage.goto('/prestataire/dashboard/interventions')
          await prestatairePage.waitForSelector('[data-testid="intervention-list"]')
          const status = await prestatairePage.locator(`[data-testid="status-${demandId}"]`).textContent()
          return { role: 'prestataire', status }
        })()
      ])

      statusVerifications.forEach(({ role, status }) => {
        console.log(`📊 [WORKFLOW-TEST] ${role} sees status: ${status}`)
        expect(status).toContain('Terminé')
      })

      // 10. Mesurer métriques de cache final
      console.log('📊 [WORKFLOW-TEST] Measuring final cache metrics')

      try {
        const cacheMetrics = await gestionnaireePage.evaluate(async () => {
          const response = await fetch('/api/debug/cache-metrics')
          return response.ok ? await response.json() : null
        })

        if (cacheMetrics) {
          performanceMetrics.cacheMetrics = cacheMetrics
          console.log('📈 [WORKFLOW-TEST] Final cache metrics:', cacheMetrics)

          // Vérifier efficacité du cache
          if (cacheMetrics.hitRate !== undefined) {
            expect(cacheMetrics.hitRate).toBeGreaterThan(40) // Au moins 40% hit rate
          }
        }
      } catch (error) {
        console.warn('⚠️ [WORKFLOW-TEST] Could not fetch cache metrics:', error)
      }

      // Performance globale du workflow
      const totalWorkflowTime = Object.values(performanceMetrics.actionTimes).reduce((sum, time) => sum + time, 0)
      console.log(`⏱️ [WORKFLOW-TEST] Total workflow time: ${totalWorkflowTime}ms`)

      // Le workflow complet ne doit pas prendre plus de 20 secondes
      expect(totalWorkflowTime).toBeLessThan(20000)

      console.log('🎉 [WORKFLOW-TEST] Complete workflow test passed successfully!')
      console.log('📊 [WORKFLOW-TEST] Performance summary:', performanceMetrics)

    } finally {
      // Nettoyer les contextes
      await locataireContext.close()
      await gestionnaireContext.close()
      await prestataireContext.close()
    }
  })

  test('Performance under load - Multiple concurrent workflows', async ({ browser }) => {
    console.log('🚀 [LOAD-TEST] Starting performance under load test')

    const concurrentWorkflows = 3
    const contexts = []
    const pages = []

    try {
      // Créer plusieurs contextes pour simuler charge
      for (let i = 0; i < concurrentWorkflows; i++) {
        const context = await browser.newContext()
        const page = await context.newPage()
        contexts.push(context)
        pages.push(page)
      }

      // Simuler actions simultanées
      const loadTestStart = Date.now()

      const workflowPromises = pages.map(async (page, index) => {
        const workflowStart = Date.now()

        // Login gestionnaire
        await page.goto('/auth/login')
        await page.fill('[name="email"]', 'gestionnaire@seido.com')
        await page.fill('[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForSelector('[data-testid="dashboard-header"]')

        // Naviguer et interagir avec dashboard
        await page.goto('/gestionnaire/dashboard/interventions')
        await page.waitForSelector('[data-testid="intervention-list"]')

        // Filtrer interventions
        await page.selectOption('[data-testid="status-filter"]', 'pending')
        await page.click('[data-testid="apply-filters"]')
        await page.waitForLoadState('networkidle')

        // Changer de page
        await page.goto('/gestionnaire/dashboard/stats')
        await page.waitForSelector('[data-testid="stats-dashboard"]')

        const workflowTime = Date.now() - workflowStart
        console.log(`⏱️ [LOAD-TEST] Workflow ${index + 1} completed in: ${workflowTime}ms`)

        return { index, time: workflowTime }
      })

      const results = await Promise.all(workflowPromises)
      const totalLoadTime = Date.now() - loadTestStart

      console.log(`⏱️ [LOAD-TEST] ${concurrentWorkflows} concurrent workflows completed in: ${totalLoadTime}ms`)

      // Vérifier performance individuelle
      results.forEach(({ index, time }) => {
        expect(time).toBeLessThan(10000) // 10s max par workflow sous charge
      })

      // Performance globale doit être raisonnable
      expect(totalLoadTime).toBeLessThan(15000) // 15s max pour tous

      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length
      console.log(`📊 [LOAD-TEST] Average workflow time under load: ${avgTime}ms`)

    } finally {
      // Nettoyer tous les contextes
      await Promise.all(contexts.map(context => context.close()))
    }
  })

  test('Cache effectiveness during extended session', async ({ page }) => {
    console.log('🚀 [CACHE-SESSION-TEST] Testing cache effectiveness during extended session')

    // Login
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    const navigationPattern = [
      '/gestionnaire/dashboard',
      '/gestionnaire/dashboard/interventions',
      '/gestionnaire/dashboard/buildings',
      '/gestionnaire/dashboard/stats',
      '/gestionnaire/dashboard/contacts',
      '/gestionnaire/dashboard/interventions', // Retour
      '/gestionnaire/dashboard/stats', // Retour
      '/gestionnaire/dashboard' // Retour accueil
    ]

    const navigationTimes = []

    for (const [index, route] of navigationPattern.entries()) {
      console.log(`🔍 [CACHE-SESSION-TEST] Navigation ${index + 1}: ${route}`)

      const navigationStart = Date.now()
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const navigationTime = Date.now() - navigationStart

      navigationTimes.push({
        route,
        time: navigationTime,
        isReturn: index > 4 // Routes after index 4 are returns
      })

      console.log(`⏱️ [CACHE-SESSION-TEST] ${route}: ${navigationTime}ms`)

      // Attendre un peu pour simuler utilisation réelle
      await page.waitForTimeout(500)
    }

    // Analyser performance cache
    const firstVisits = navigationTimes.filter(n => !n.isReturn)
    const returnVisits = navigationTimes.filter(n => n.isReturn)

    const avgFirstVisit = firstVisits.reduce((sum, n) => sum + n.time, 0) / firstVisits.length
    const avgReturnVisit = returnVisits.reduce((sum, n) => sum + n.time, 0) / returnVisits.length

    console.log(`📊 [CACHE-SESSION-TEST] Average first visit: ${avgFirstVisit}ms`)
    console.log(`📊 [CACHE-SESSION-TEST] Average return visit: ${avgReturnVisit}ms`)
    console.log(`📊 [CACHE-SESSION-TEST] Cache improvement: ${((avgFirstVisit - avgReturnVisit) / avgFirstVisit * 100).toFixed(1)}%`)

    // Les visites de retour doivent être significativement plus rapides
    expect(avgReturnVisit).toBeLessThan(avgFirstVisit * 0.8) // Au moins 20% plus rapide

    // Aucune navigation ne doit être trop lente
    navigationTimes.forEach(({ route, time }) => {
      expect(time).toBeLessThan(3000) // 3s max par navigation
    })
  })
})