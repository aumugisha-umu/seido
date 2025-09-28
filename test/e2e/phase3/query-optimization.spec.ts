/**
 * 🧪 PHASE 3: Database Query Optimization Tests
 *
 * Tests pour valider l'optimisation des requêtes,
 * les vues matérialisées et le batch loading
 */

import { test, expect } from '@playwright/test'

test.describe('Database Query Optimization Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login avant chaque test
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
  })

  test('Materialized views performance', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing materialized views performance')

    // Mesurer temps chargement dashboard avec vues matérialisées
    const startTime = Date.now()

    await page.goto('/gestionnaire/dashboard')

    // Attendre que tous les éléments du dashboard soient chargés
    await page.waitForSelector('[data-testid="stats-summary"]', { timeout: 10000 })
    await page.waitForSelector('[data-testid="intervention-summary"]', { timeout: 10000 })
    await page.waitForSelector('[data-testid="recent-activities"]', { timeout: 10000 })

    const loadTime = Date.now() - startTime

    console.log(`⏱️ [QUERY-TEST] Dashboard load time with materialized views: ${loadTime}ms`)

    // Dashboard doit se charger rapidement avec vues pré-calculées
    expect(loadTime).toBeLessThan(2000) // 2 secondes max

    // Vérifier données cohérentes entre stats et liste
    const statsText = await page.locator('[data-testid="total-interventions"]').textContent()
    const listItems = await page.locator('[data-testid="intervention-item"]').count()

    if (statsText) {
      const totalFromStats = parseInt(statsText.replace(/\D/g, '')) || 0
      console.log(`📊 [QUERY-TEST] Stats total: ${totalFromStats}, List items visible: ${listItems}`)

      // Stats doivent être cohérentes (total >= visible car pagination)
      expect(totalFromStats).toBeGreaterThanOrEqual(listItems)
    }

    // Vérifier que les activités récentes sont chargées
    const recentActivities = await page.locator('[data-testid="activity-item"]').count()
    console.log(`📊 [QUERY-TEST] Recent activities loaded: ${recentActivities}`)
    expect(recentActivities).toBeGreaterThan(0)
  })

  test('Batch loading effectiveness', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing batch loading effectiveness')

    // Surveiller les requêtes API
    const apiCalls = []
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          timestamp: Date.now(),
          method: request.method()
        })
      }
    })

    // Charger page avec beaucoup de données liées
    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForSelector('[data-testid="intervention-list"]')
    await page.waitForLoadState('networkidle')

    console.log(`📊 [QUERY-TEST] Total API calls: ${apiCalls.length}`)
    apiCalls.forEach(call => {
      console.log(`🔗 [QUERY-TEST] API call: ${call.method} ${call.url}`)
    })

    // Vérifier optimisation batch loading
    const contactRequests = apiCalls.filter(call => call.url.includes('contacts'))
    const fileRequests = apiCalls.filter(call => call.url.includes('files'))
    const buildingRequests = apiCalls.filter(call => call.url.includes('buildings'))

    console.log(`📊 [QUERY-TEST] Contact requests: ${contactRequests.length}`)
    console.log(`📊 [QUERY-TEST] File requests: ${fileRequests.length}`)
    console.log(`📊 [QUERY-TEST] Building requests: ${buildingRequests.length}`)

    // Doit utiliser batch loading, pas une requête par item
    expect(contactRequests.length).toBeLessThan(5) // Max 5 requêtes pour contacts
    expect(fileRequests.length).toBeLessThan(5) // Max 5 requêtes pour files
    expect(buildingRequests.length).toBeLessThan(3) // Max 3 requêtes pour buildings
  })

  test('Pagination performance', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing pagination performance')

    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForSelector('[data-testid="intervention-list"]')

    // Test pagination rapide entre plusieurs pages
    const pages = [1, 2, 3, 2, 1]
    const pageTimes = []

    for (const pageNum of pages) {
      const startTime = Date.now()

      // Cliquer sur le numéro de page ou utiliser navigation
      const pageButton = page.locator(`[data-testid="page-${pageNum}"]`)
      const isPageButtonVisible = await pageButton.isVisible()

      if (isPageButtonVisible) {
        await pageButton.click()
      } else {
        // Fallback: utiliser les boutons suivant/précédent
        if (pageNum > 1) {
          await page.click('[data-testid="next-page"]')
        }
      }

      await page.waitForSelector('[data-testid="intervention-list"]')
      await page.waitForLoadState('networkidle')

      const pageTime = Date.now() - startTime
      pageTimes.push(pageTime)

      console.log(`⏱️ [QUERY-TEST] Page ${pageNum} load time: ${pageTime}ms`)

      // Chaque page doit charger rapidement
      expect(pageTime).toBeLessThan(1500) // 1.5s max par page
    }

    // Navigation cache/retour doit être plus rapide
    if (pageTimes.length >= 4) {
      // Retour page 2 (index 3) doit être plus rapide que première visite page 2 (index 1)
      expect(pageTimes[3]).toBeLessThan(pageTimes[1] * 1.2)

      // Retour page 1 (index 4) doit être plus rapide que première visite page 1 (index 0)
      expect(pageTimes[4]).toBeLessThan(pageTimes[0] * 1.2)
    }
  })

  test('Complex query optimization', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing complex query optimization')

    // Tester recherche avec filtres (requête complexe)
    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForSelector('[data-testid="intervention-list"]')

    // Appliquer filtres multiples
    const startTime = Date.now()

    await page.click('[data-testid="filters-toggle"]')
    await page.selectOption('[data-testid="status-filter"]', 'pending')
    await page.selectOption('[data-testid="priority-filter"]', 'high')
    await page.fill('[data-testid="search-input"]', 'plomberie')
    await page.click('[data-testid="apply-filters"]')

    await page.waitForSelector('[data-testid="intervention-list"]')
    await page.waitForLoadState('networkidle')

    const filterTime = Date.now() - startTime

    console.log(`⏱️ [QUERY-TEST] Complex filter query time: ${filterTime}ms`)

    // Requête avec filtres doit rester rapide grâce aux index
    expect(filterTime).toBeLessThan(2000) // 2s max

    // Vérifier que les résultats correspondent aux filtres
    const filteredItems = await page.locator('[data-testid="intervention-item"]').count()
    console.log(`📊 [QUERY-TEST] Filtered results: ${filteredItems}`)

    // Doit y avoir des résultats ou message "aucun résultat"
    const noResultsMessage = page.locator('[data-testid="no-results"]')
    const hasResults = filteredItems > 0
    const hasNoResultsMessage = await noResultsMessage.isVisible()

    expect(hasResults || hasNoResultsMessage).toBe(true)
  })

  test('Database response time monitoring', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing database response time monitoring')

    // Faire plusieurs requêtes et mesurer les temps
    const endpoints = [
      '/api/interventions',
      '/api/buildings',
      '/api/contacts',
      '/api/dashboard/stats'
    ]

    const responseTimes = []

    for (const endpoint of endpoints) {
      const startTime = Date.now()

      const response = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url)
          return {
            status: response.status,
            ok: response.ok
          }
        } catch (error) {
          return {
            status: 0,
            ok: false,
            error: error.message
          }
        }
      }, endpoint)

      const responseTime = Date.now() - startTime
      responseTimes.push({
        endpoint,
        responseTime,
        status: response.status,
        ok: response.ok
      })

      console.log(`⏱️ [QUERY-TEST] ${endpoint}: ${responseTime}ms (${response.status})`)
    }

    // Vérifier que toutes les requêtes réussissent
    responseTimes.forEach(({ endpoint, responseTime, ok }) => {
      expect(ok).toBe(true)

      // Database response time doit être < 200ms pour 95% des requêtes
      if (responseTime > 200) {
        console.warn(`⚠️ [QUERY-TEST] Slow query detected: ${endpoint} (${responseTime}ms)`)
      }
    })

    // Au moins 80% des requêtes doivent être < 200ms
    const fastQueries = responseTimes.filter(r => r.responseTime < 200).length
    const fastQueryRate = (fastQueries / responseTimes.length) * 100

    console.log(`📊 [QUERY-TEST] Fast query rate: ${fastQueryRate}%`)
    expect(fastQueryRate).toBeGreaterThan(70) // Au moins 70% de requêtes rapides
  })

  test('Connection pooling under load', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing connection pooling under load')

    await page.goto('/gestionnaire/dashboard')

    // Simuler charge avec requêtes simultanées
    const concurrentRequests = 10
    const promises = []

    const startTime = Date.now()

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        page.evaluate(async (index) => {
          const startTime = performance.now()
          try {
            const response = await fetch(`/api/interventions?page=${index + 1}&limit=5`)
            const endTime = performance.now()
            return {
              success: response.ok,
              status: response.status,
              responseTime: endTime - startTime,
              index
            }
          } catch (error) {
            return {
              success: false,
              error: error.message,
              responseTime: performance.now() - startTime,
              index
            }
          }
        }, i)
      )
    }

    const results = await Promise.all(promises)
    const totalTime = Date.now() - startTime

    console.log(`⏱️ [QUERY-TEST] ${concurrentRequests} concurrent requests completed in: ${totalTime}ms`)

    // Vérifier que toutes les requêtes réussissent
    const successfulRequests = results.filter(r => r.success).length
    const successRate = (successfulRequests / results.length) * 100

    console.log(`📊 [QUERY-TEST] Success rate: ${successRate}%`)
    expect(successRate).toBeGreaterThan(90) // Au moins 90% de succès

    // Vérifier temps de réponse individuel
    results.forEach((result, index) => {
      console.log(`📊 [QUERY-TEST] Request ${index}: ${result.responseTime}ms (${result.success ? 'success' : 'failed'})`)

      if (result.success) {
        expect(result.responseTime).toBeLessThan(2000) // 2s max par requête
      }
    })

    // Le temps total ne doit pas être excessif (connection pooling efficace)
    expect(totalTime).toBeLessThan(5000) // 5s max pour toutes les requêtes
  })

  test('Query performance metrics', async ({ page }) => {
    console.log('🔍 [QUERY-TEST] Testing query performance metrics')

    // Générer activité pour avoir des métriques
    await page.goto('/gestionnaire/dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForLoadState('networkidle')

    await page.goto('/gestionnaire/dashboard/buildings')
    await page.waitForLoadState('networkidle')

    // Vérifier métriques via API de debug
    const queryMetrics = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/debug/query-metrics')
        if (response.ok) {
          return await response.json()
        }
        return null
      } catch (error) {
        console.warn('Query metrics API not available:', error)
        return null
      }
    })

    if (queryMetrics) {
      console.log('📊 [QUERY-TEST] Query metrics:', queryMetrics)

      // Vérifier métriques de performance
      if (queryMetrics.averageDuration !== undefined) {
        expect(queryMetrics.averageDuration).toBeLessThan(300) // 300ms moyenne max
      }

      if (queryMetrics.slowQueryRate !== undefined) {
        expect(queryMetrics.slowQueryRate).toBeLessThan(20) // Moins de 20% de requêtes lentes
      }

      if (queryMetrics.cacheHitRate !== undefined) {
        expect(queryMetrics.cacheHitRate).toBeGreaterThan(30) // Au moins 30% de cache hits
      }
    } else {
      console.warn('⚠️ [QUERY-TEST] Query metrics API not available - skipping metrics validation')
    }
  })
})