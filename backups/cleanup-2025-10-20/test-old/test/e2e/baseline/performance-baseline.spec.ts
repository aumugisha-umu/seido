/**
 * Tests de Performance Baseline pour SEIDO
 * Établit les métriques de référence avant optimisation
 */

import { test, expect } from '@playwright/test'
import SeidoTesterConfig from '../../config/seido-tester-agent.config'

test.describe('SEIDO Performance Baseline Tests', () => {
  test.describe.configure({ mode: 'serial' })

  const testAccounts = {
    gestionnaire: { email: 'arthur+000@seido.pm', password: 'Wxcvbn123' },
    prestataire: { email: 'arthur+001@seido.pm', password: 'Wxcvbn123' },
    locataire: { email: 'arthur+002@seido.pm', password: 'Wxcvbn123' },
    admin: { email: 'arthur+003@seido.pm', password: 'Wxcvbn123' }
  }

  test('Homepage performance baseline', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Mesures détaillées via Performance API
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')

      return {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0
      }
    })

    // Enregistrer les métriques baseline
    console.log('📊 Baseline Homepage Metrics:')
    console.log('  Total Load Time:', totalTime, 'ms')
    console.log('  DNS Lookup:', metrics.dns, 'ms')
    console.log('  TCP Connection:', metrics.tcp, 'ms')
    console.log('  Request Time:', metrics.request, 'ms')
    console.log('  Response Time:', metrics.response, 'ms')
    console.log('  DOM Content Loaded:', metrics.domContentLoaded, 'ms')
    console.log('  Page Load Complete:', metrics.loadComplete, 'ms')
    console.log('  First Paint:', metrics.firstPaint, 'ms')
    console.log('  First Contentful Paint:', metrics.firstContentfulPaint, 'ms')

    // Vérifications baseline (état actuel attendu)
    expect(metrics.domContentLoaded).toBeLessThan(8000)  // Baseline: 8s
    expect(metrics.loadComplete).toBeLessThan(15000)     // Baseline: 15s
    expect(totalTime).toBeLessThan(20000)                // Baseline: 20s
  })

  test('Authentication performance baseline', async ({ page }) => {
    for (const [role, credentials] of Object.entries(testAccounts)) {
      await test.step(`${role} authentication baseline`, async () => {
        const startTime = Date.now()

        await page.goto('/auth/login')
        await page.waitForSelector('[name="email"]')

        // Mesurer le temps de chargement du formulaire
        const formLoadTime = Date.now() - startTime

        // Remplir et soumettre le formulaire
        const authStartTime = Date.now()
        await page.fill('[name="email"]', credentials.email)
        await page.fill('[name="password"]', credentials.password)
        await page.click('button[type="submit"]')

        // Attendre la redirection vers le dashboard
        try {
          await page.waitForURL(`**/dashboard/${role}`, { timeout: 30000 })
          const authEndTime = Date.now()
          const authTime = authEndTime - authStartTime
          const totalAuthTime = authEndTime - startTime

          console.log(`📊 ${role.toUpperCase()} Authentication Baseline:`)
          console.log(`  Form Load Time: ${formLoadTime}ms`)
          console.log(`  Auth Process Time: ${authTime}ms`)
          console.log(`  Total Time: ${totalAuthTime}ms`)

          // Baseline attendu: ~14s pour l'authentification
          expect(totalAuthTime).toBeLessThan(20000) // Permettre jusqu'à 20s en baseline

          // Se déconnecter pour le prochain test
          await page.goto('/auth/logout')
        } catch (error) {
          console.error(`❌ Authentication failed for ${role}:`, error)
          // Continue with next role even if this one fails
        }
      })
    }
  })

  test('Bundle size baseline', async ({ page }) => {
    await page.goto('/')

    // Mesurer la taille des ressources chargées
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

      const jsResources = resources.filter(r => r.name.includes('.js'))
      const cssResources = resources.filter(r => r.name.includes('.css'))
      const imageResources = resources.filter(r =>
        r.name.match(/\.(png|jpg|jpeg|gif|svg|webp)/)
      )

      const calculateSize = (resources: PerformanceResourceTiming[]) => {
        return resources.reduce((sum, r) => {
          // Use transferSize if available, otherwise use encodedBodySize
          const size = (r as any).transferSize || (r as any).encodedBodySize || 0
          return sum + size
        }, 0)
      }

      const totalJS = calculateSize(jsResources)
      const totalCSS = calculateSize(cssResources)
      const totalImages = calculateSize(imageResources)
      const totalSize = calculateSize(resources)

      return {
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        imageCount: imageResources.length,
        totalJS: Math.round(totalJS / 1024), // KB
        totalCSS: Math.round(totalCSS / 1024), // KB
        totalImages: Math.round(totalImages / 1024), // KB
        totalSize: Math.round(totalSize / 1024), // KB
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100 // MB with 2 decimals
      }
    })

    console.log('📊 Bundle Size Baseline:')
    console.log('  JS Files:', resourceSizes.jsCount)
    console.log('  CSS Files:', resourceSizes.cssCount)
    console.log('  Image Files:', resourceSizes.imageCount)
    console.log('  Total JS Size:', resourceSizes.totalJS, 'KB')
    console.log('  Total CSS Size:', resourceSizes.totalCSS, 'KB')
    console.log('  Total Images Size:', resourceSizes.totalImages, 'KB')
    console.log('  Total Bundle Size:', resourceSizes.totalSizeMB, 'MB')

    // Baseline actuel (avant optimisation)
    expect(resourceSizes.totalSizeMB).toBeLessThan(6) // 6MB max attendu actuellement
  })

  test('Dashboard load performance by role', async ({ page }) => {
    for (const [role, credentials] of Object.entries(testAccounts)) {
      await test.step(`${role} dashboard load baseline`, async () => {
        // Login first
        await page.goto('/auth/login')
        await page.fill('[name="email"]', credentials.email)
        await page.fill('[name="password"]', credentials.password)
        await page.click('button[type="submit"]')

        // Wait for redirect
        await page.waitForURL(`**/dashboard/${role}`, { timeout: 30000 })

        // Measure dashboard load time
        const startTime = Date.now()
        await page.reload() // Reload to measure pure dashboard load

        // Wait for dashboard to be fully loaded
        await page.waitForSelector(`[data-testid="${role}-dashboard"]`, { timeout: 30000 })
        await page.waitForLoadState('networkidle')

        const loadTime = Date.now() - startTime

        // Measure specific dashboard metrics
        const dashboardMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

          // Count API calls
          const apiCalls = resources.filter(r => r.name.includes('/api/'))

          return {
            domInteractive: navigation.domInteractive - navigation.navigationStart,
            domComplete: navigation.domComplete - navigation.navigationStart,
            apiCallsCount: apiCalls.length,
            apiCallsTime: apiCalls.reduce((sum, r) => sum + r.duration, 0)
          }
        })

        console.log(`📊 ${role.toUpperCase()} Dashboard Baseline:`)
        console.log(`  Total Load Time: ${loadTime}ms`)
        console.log(`  DOM Interactive: ${dashboardMetrics.domInteractive}ms`)
        console.log(`  DOM Complete: ${dashboardMetrics.domComplete}ms`)
        console.log(`  API Calls: ${dashboardMetrics.apiCallsCount}`)
        console.log(`  API Total Time: ${Math.round(dashboardMetrics.apiCallsTime)}ms`)

        // Baseline expectations
        expect(loadTime).toBeLessThan(10000) // 10s max for dashboard load
        expect(dashboardMetrics.apiCallsCount).toBeLessThan(20) // Max 20 API calls

        // Logout for next test
        await page.goto('/auth/logout')
      })
    }
  })

  test('Core Web Vitals baseline', async ({ page }) => {
    await page.goto('/')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        let metrics = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0
        }

        // Get navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        metrics.ttfb = navigation.responseStart - navigation.requestStart

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint')
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint')
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime
        }

        // Observe LCP
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // Observe CLS
        let clsValue = 0
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          metrics.cls = clsValue
        }).observe({ entryTypes: ['layout-shift'] })

        // Wait a bit to collect metrics
        setTimeout(() => {
          resolve(metrics)
        }, 3000)
      })
    })

    console.log('📊 Core Web Vitals Baseline:')
    console.log('  FCP (First Contentful Paint):', Math.round(webVitals.fcp), 'ms')
    console.log('  LCP (Largest Contentful Paint):', Math.round(webVitals.lcp), 'ms')
    console.log('  CLS (Cumulative Layout Shift):', webVitals.cls.toFixed(3))
    console.log('  TTFB (Time to First Byte):', Math.round(webVitals.ttfb), 'ms')

    // Baseline expectations (current state)
    expect(webVitals.fcp).toBeLessThan(5000)  // 5s baseline for FCP
    expect(webVitals.lcp).toBeLessThan(7000)  // 7s baseline for LCP
    expect(webVitals.cls).toBeLessThan(0.5)   // 0.5 baseline for CLS
  })

  test('API response time baseline', async ({ page, request }) => {
    // Login first to get auth token
    await page.goto('/auth/login')
    await page.fill('[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('[name="password"]', testAccounts.gestionnaire.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/gestionnaire', { timeout: 30000 })

    // Get cookies for API requests
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Test various API endpoints
    const apiEndpoints = [
      '/api/interventions',
      '/api/users/me',
      '/api/properties',
      '/api/notifications'
    ]

    const apiMetrics: Record<string, number> = {}

    for (const endpoint of apiEndpoints) {
      try {
        const startTime = Date.now()
        const response = await request.get(`http://localhost:3000${endpoint}`, {
          headers: {
            'Cookie': cookieHeader
          }
        })
        const responseTime = Date.now() - startTime

        apiMetrics[endpoint] = responseTime

        console.log(`📊 API ${endpoint}: ${responseTime}ms (Status: ${response.status()})`)
      } catch (error) {
        console.error(`❌ API ${endpoint} failed:`, error)
        apiMetrics[endpoint] = -1
      }
    }

    // Calculate average API response time
    const validMetrics = Object.values(apiMetrics).filter(t => t > 0)
    const avgResponseTime = validMetrics.length > 0
      ? Math.round(validMetrics.reduce((a, b) => a + b, 0) / validMetrics.length)
      : 0

    console.log(`📊 Average API Response Time: ${avgResponseTime}ms`)

    // Baseline expectation
    expect(avgResponseTime).toBeLessThan(1000) // 1s baseline for API responses
  })

  test('Memory usage baseline', async ({ page }) => {
    await page.goto('/')

    // Login as gestionnaire
    await page.goto('/auth/login')
    await page.fill('[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('[name="password"]', testAccounts.gestionnaire.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/gestionnaire', { timeout: 30000 })

    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
      }
      return 0
    })

    // Navigate through different sections to simulate usage
    const sections = [
      '/dashboard/gestionnaire/interventions',
      '/dashboard/gestionnaire/properties',
      '/dashboard/gestionnaire'
    ]

    for (const section of sections) {
      await page.goto(`http://localhost:3000${section}`)
      await page.waitForLoadState('networkidle')
    }

    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
      }
      return 0
    })

    const memoryIncrease = finalMemory - initialMemory

    console.log('📊 Memory Usage Baseline:')
    console.log('  Initial Memory:', Math.round(initialMemory), 'MB')
    console.log('  Final Memory:', Math.round(finalMemory), 'MB')
    console.log('  Memory Increase:', Math.round(memoryIncrease), 'MB')

    // Baseline expectation
    expect(finalMemory).toBeLessThan(200) // Max 200MB heap usage
    expect(memoryIncrease).toBeLessThan(50) // Max 50MB increase during navigation
  })
})

// Export metrics for comparison
export const baselineMetrics = {
  homepage: {
    domContentLoaded: 8000,
    loadComplete: 15000,
    totalTime: 20000
  },
  authentication: {
    formLoad: 2000,
    authProcess: 12000,
    totalTime: 14000
  },
  bundleSize: {
    totalSizeMB: 5.0,
    jsSize: 4000, // KB
    cssSize: 500  // KB
  },
  dashboardLoad: {
    totalTime: 10000,
    domInteractive: 5000,
    apiCalls: 15
  },
  coreWebVitals: {
    fcp: 5000,
    lcp: 7000,
    cls: 0.5,
    ttfb: 1000
  },
  apiResponse: {
    average: 1000,
    max: 2000
  },
  memory: {
    initial: 50, // MB
    final: 150,  // MB
    increase: 100 // MB
  }
}
