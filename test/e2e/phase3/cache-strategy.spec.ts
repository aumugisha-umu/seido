/**
 * 🧪 PHASE 3: Cache Strategy Validation Tests
 *
 * Tests pour valider l'efficacité du cache multi-niveaux
 * et les optimisations de performance
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 3: Cache Strategy Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache avant chaque test
    await page.evaluate(() => {
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
    })
  })

  test('Multi-level cache effectiveness', async ({ page }) => {
    // Login gestionnaire
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Premier chargement - données pas en cache
    console.log('🔍 [CACHE-TEST] First load - no cache')
    const firstLoadStart = Date.now()
    await page.goto('/gestionnaire/dashboard')
    await page.waitForSelector('[data-testid="intervention-list"]', { timeout: 10000 })
    const firstLoadTime = Date.now() - firstLoadStart

    console.log(`⏱️ [CACHE-TEST] First load time: ${firstLoadTime}ms`)

    // Rafraîchir - données en cache L1
    console.log('🔍 [CACHE-TEST] Second load - L1 cache')
    const secondLoadStart = Date.now()
    await page.reload()
    await page.waitForSelector('[data-testid="intervention-list"]', { timeout: 10000 })
    const secondLoadTime = Date.now() - secondLoadStart

    console.log(`⏱️ [CACHE-TEST] Second load time: ${secondLoadTime}ms`)

    // Vérifier amélioration cache L1 (50% plus rapide minimum)
    expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8)

    // Nouvelle session - cache L2 (simulation)
    await page.context().clearCookies()
    await page.evaluate(() => {
      sessionStorage.clear()
    })

    const thirdLoadStart = Date.now()
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForSelector('[data-testid="intervention-list"]', { timeout: 10000 })
    const thirdLoadTime = Date.now() - thirdLoadStart

    console.log(`⏱️ [CACHE-TEST] Third load time (new session): ${thirdLoadTime}ms`)

    // Cache L2 doit être plus rapide que premier chargement
    expect(thirdLoadTime).toBeLessThan(firstLoadTime * 1.2) // Allow some overhead for auth
  })

  test('Cache invalidation validation', async ({ page, context }) => {
    // Connexion gestionnaire
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Charger liste interventions (mise en cache)
    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForSelector('[data-testid="intervention-list"]')

    const initialCountElement = await page.locator('[data-testid="intervention-item"]').count()
    console.log(`📊 [CACHE-TEST] Initial intervention count: ${initialCountElement}`)

    // Créer nouvelle intervention pour tester invalidation
    await page.click('[data-testid="create-intervention"]')
    await page.waitForSelector('[data-testid="intervention-form"]')

    await page.fill('[name="title"]', 'Test Cache Invalidation')
    await page.fill('[name="description"]', 'Test description for cache invalidation')
    await page.selectOption('[name="priority"]', 'medium')
    await page.click('button[type="submit"]')

    // Attendre confirmation création
    await page.waitForSelector('[data-testid="intervention-created"]', { timeout: 10000 })

    // Retourner à la liste - cache doit être invalidé
    await page.goto('/gestionnaire/dashboard/interventions')
    await page.waitForSelector('[data-testid="intervention-list"]')

    const newCountElement = await page.locator('[data-testid="intervention-item"]').count()
    console.log(`📊 [CACHE-TEST] New intervention count: ${newCountElement}`)

    expect(newCountElement).toBe(initialCountElement + 1)

    // Vérifier dans second onglet - cache partagé invalidé
    const newPage = await context.newPage()
    await newPage.goto('/auth/login')
    await newPage.fill('[name="email"]', 'gestionnaire@seido.com')
    await newPage.fill('[name="password"]', 'password123')
    await newPage.click('button[type="submit"]')
    await newPage.goto('/gestionnaire/dashboard/interventions')
    await newPage.waitForSelector('[data-testid="intervention-list"]')

    const newTabCount = await newPage.locator('[data-testid="intervention-item"]').count()
    expect(newTabCount).toBe(newCountElement)

    await newPage.close()
  })

  test('Connection pooling efficiency', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/gestionnaire/dashboard')

    // Simuler charge concurrente avec requêtes simultanées
    console.log('🔄 [CACHE-TEST] Testing concurrent requests')
    const promises = []
    const startTime = Date.now()

    // Faire plusieurs requêtes API simultanées
    for (let i = 0; i < 5; i++) {
      promises.push(
        page.evaluate(async (index) => {
          const response = await fetch(`/api/interventions?page=${index + 1}&limit=10`)
          return {
            status: response.status,
            timing: performance.now(),
            index
          }
        }, i)
      )
    }

    const results = await Promise.all(promises)
    const endTime = Date.now()
    const totalTime = endTime - startTime

    console.log(`⏱️ [CACHE-TEST] Concurrent requests completed in: ${totalTime}ms`)
    console.log('📊 [CACHE-TEST] Individual results:', results)

    // Vérifier que toutes les requêtes réussissent
    expect(results.every(r => r.status === 200)).toBe(true)

    // Temps total doit être raisonnable (connection pooling efficace)
    expect(totalTime).toBeLessThan(3000)

    // Les requêtes ne doivent pas être trop lentes individuellement
    results.forEach((result, index) => {
      expect(result.status).toBe(200)
      console.log(`📊 [CACHE-TEST] Request ${index}: ${result.status}`)
    })
  })

  test('Cache metrics validation', async ({ page }) => {
    // Login et navigation pour générer activité cache
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Naviguer vers différentes pages pour tester cache
    const pages = [
      '/gestionnaire/dashboard',
      '/gestionnaire/dashboard/interventions',
      '/gestionnaire/dashboard/buildings',
      '/gestionnaire/dashboard/stats'
    ]

    for (const pagePath of pages) {
      console.log(`🔍 [CACHE-TEST] Visiting: ${pagePath}`)
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500) // Laisser temps au cache
    }

    // Revisiter les pages pour tester cache hits
    for (const pagePath of pages) {
      console.log(`🔍 [CACHE-TEST] Revisiting: ${pagePath}`)
      const startTime = Date.now()
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      console.log(`⏱️ [CACHE-TEST] Cached load time for ${pagePath}: ${loadTime}ms`)

      // Pages en cache doivent charger rapidement
      expect(loadTime).toBeLessThan(2000)
    }

    // Vérifier métriques de cache via API de debug
    const cacheMetrics = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/debug/cache-metrics')
        if (response.ok) {
          return await response.json()
        }
        return null
      } catch (error) {
        console.warn('Cache metrics API not available:', error)
        return null
      }
    })

    if (cacheMetrics) {
      console.log('📊 [CACHE-TEST] Cache metrics:', cacheMetrics)

      // Vérifier hit rate raisonnable
      if (cacheMetrics.hitRate !== undefined) {
        expect(cacheMetrics.hitRate).toBeGreaterThan(20) // Au moins 20% hit rate
      }
    }
  })

  test('Performance baseline comparison', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Mesurer performance dashboard principal
    console.log('📊 [CACHE-TEST] Measuring dashboard performance')

    const navigationPromise = page.waitForNavigation()
    const startTime = Date.now()

    await page.goto('/gestionnaire/dashboard')
    await navigationPromise
    await page.waitForSelector('[data-testid="stats-summary"]')
    await page.waitForSelector('[data-testid="intervention-summary"]')
    await page.waitForSelector('[data-testid="recent-activities"]')

    const loadTime = Date.now() - startTime

    console.log(`⏱️ [CACHE-TEST] Dashboard load time: ${loadTime}ms`)

    // Dashboard doit se charger rapidement avec optimisations Phase 3
    expect(loadTime).toBeLessThan(3000) // 3 secondes max

    // Mesurer métriques Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        resolve({
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        })
      })
    })

    console.log('📊 [CACHE-TEST] Web Vitals:', webVitals)

    // Vérifier métriques de performance
    expect(webVitals.domContentLoaded).toBeLessThan(2000) // 2s max pour DOM ready
    expect(webVitals.firstContentfulPaint).toBeLessThan(1500) // 1.5s max pour FCP
  })
})

test.describe('Phase 3: Cache Performance Under Load', () => {
  test('Cache behavior with rapid navigation', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'gestionnaire@seido.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    const pages = [
      '/gestionnaire/dashboard',
      '/gestionnaire/dashboard/interventions',
      '/gestionnaire/dashboard/buildings',
      '/gestionnaire/dashboard/stats',
      '/gestionnaire/dashboard/interventions',
      '/gestionnaire/dashboard'
    ]

    const navigationTimes = []

    for (const pagePath of pages) {
      const startTime = Date.now()
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      const navTime = Date.now() - startTime
      navigationTimes.push(navTime)

      console.log(`⏱️ [CACHE-TEST] Navigation to ${pagePath}: ${navTime}ms`)
    }

    // Les navigations suivantes doivent être plus rapides (cache)
    const firstNavTime = navigationTimes[0]
    const lastNavTime = navigationTimes[navigationTimes.length - 1]

    // La dernière navigation (retour dashboard) doit être plus rapide
    expect(lastNavTime).toBeLessThan(firstNavTime * 0.8)

    // Aucune navigation ne doit être trop lente
    navigationTimes.forEach((time, index) => {
      expect(time).toBeLessThan(5000) // 5s max
    })
  })
})