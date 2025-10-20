/**
 * 🐛 Debug Helpers
 *
 * Fonctions de diagnostic avancé pour comprendre les échecs de tests E2E.
 * Capture automatiquement: logs, requêtes réseau, état DOM, erreurs JS.
 */

import { Page } from '@playwright/test'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { logger, logError } from '@/lib/logger'

/**
 * Structure de diagnostic complète pour un test échoué
 */
export interface DebugInfo {
  testName: string
  timestamp: number
  screenshot: string
  finalUrl: string
  consoleLog: ConsoleEntry[]
  errors: string[]
  pendingRequests: PendingRequest[]
  domSnapshot: string
  pageHealth: HealthCheck
  performanceMetrics: PerformanceMetrics
}

export interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info'
  text: string
  timestamp: number
}

export interface PendingRequest {
  url: string
  method: string
  duration: number
}

export interface HealthCheck {
  readyState: string
  nextJsHydrated: boolean
  hasJsErrors: boolean
  errorCount: number
}

export interface PerformanceMetrics {
  domContentLoaded: number
  loadComplete: number
  firstPaint: number
  largestContentfulPaint: number
}

/**
 * Capture complète de l'état d'une page pour diagnostic
 * À utiliser dans afterEach si test échoué
 */
export async function captureDebugInfo(
  page: Page,
  testName: string
): Promise<DebugInfo> {
  const timestamp = Date.now()
  const sanitizedTestName = testName.replace(/\s+/g, '-').replace(/[^\w-]/g, '')

  // 1. Screenshot (déjà géré par teardownTestIsolation, mais on peut en faire un autre)
  const screenshotDir = 'test/e2e/screenshots/debug'
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true })
  }

  const screenshotPath = join(screenshotDir, `${sanitizedTestName}-${timestamp}.png`)
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  }).catch(() => null)

  // 2. Console logs
  const consoleLog: ConsoleEntry[] = []
  page.on('console', (msg) => {
    consoleLog.push({
      type: msg.type() as ConsoleEntry['type'],
      text: msg.text(),
      timestamp: Date.now()
    })
  })

  // 3. Erreurs JavaScript non catchées
  const errors = await page.evaluate(() => {
    return (window as any).__testErrors || []
  })

  // 4. Requêtes réseau pending
  const pendingRequests: PendingRequest[] = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return resources
      .filter(r => r.duration === 0 || r.responseEnd === 0)
      .map(r => ({
        url: r.name,
        method: 'GET', // Performance API ne donne pas la méthode
        duration: r.duration
      }))
  })

  // 5. Health check de la page
  const pageHealth: HealthCheck = await page.evaluate(() => {
    return {
      readyState: document.readyState,
      nextJsHydrated: !!(window as any).__NEXT_DATA__,
      hasJsErrors: ((window as any).__testErrors || []).length > 0,
      errorCount: ((window as any).__testErrors || []).length
    }
  })

  // 6. Métriques de performance
  const performanceMetrics: PerformanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    const lcp = performance.getEntriesByType('largest-contentful-paint')[0] as any

    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
      loadComplete: navigation?.loadEventEnd || 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      largestContentfulPaint: lcp?.renderTime || lcp?.loadTime || 0
    }
  })

  // 7. DOM snapshot (limité aux premiers 50KB pour éviter fichiers énormes)
  const domSnapshot = await page.content().catch(() => '<error capturing DOM>')
  const truncatedDom = domSnapshot.substring(0, 50000)

  // 8. URL finale
  const finalUrl = page.url()

  const debugInfo: DebugInfo = {
    testName,
    timestamp,
    screenshot: screenshotPath,
    finalUrl,
    consoleLog,
    errors,
    pendingRequests,
    domSnapshot: truncatedDom,
    pageHealth,
    performanceMetrics
  }

  // 9. Sauvegarder le rapport JSON
  const reportPath = join(screenshotDir, `${sanitizedTestName}-${timestamp}.json`)
  try {
    writeFileSync(reportPath, JSON.stringify(debugInfo, null, 2))
  } catch (error) {
    console.error('❌ Could not save debug report:', error)
  }

  return debugInfo
}

/**
 * Affiche un résumé du diagnostic dans la console
 */
export function printDebugSummary(debug: DebugInfo): void {
  console.log('\n' + '='.repeat(80))
  console.log('🐛 DEBUG INFO - Test Failed')
  console.log('='.repeat(80))
  console.log(`Test: ${debug.testName}`)
  console.log(`Time: ${new Date(debug.timestamp).toISOString()}`)
  console.log(`URL: ${debug.finalUrl}`)
  console.log(`Screenshot: ${debug.screenshot}`)
  console.log('\n📊 Page Health:')
  console.log(`  - Ready State: ${debug.pageHealth.readyState}`)
  console.log(`  - Next.js Hydrated: ${debug.pageHealth.nextJsHydrated ? '✅' : '❌'}`)
  console.log(`  - JS Errors: ${debug.pageHealth.errorCount}`)

  if (debug.errors.length > 0) {
    console.log('\n❌ JavaScript Errors:')
    debug.errors.slice(0, 5).forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`)
    })
  }

  if (debug.pendingRequests.length > 0) {
    console.log('\n⏳ Pending Network Requests:')
    debug.pendingRequests.slice(0, 5).forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.method} ${req.url}`)
    })
  }

  if (debug.consoleLog.length > 0) {
    console.log('\n📝 Recent Console Logs (last 10):')
    debug.consoleLog.slice(-10).forEach((log, i) => {
      const icon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️'
      console.log(`  ${icon} [${log.type}] ${log.text}`)
    })
  }

  console.log('\n⚡ Performance Metrics:')
  console.log(`  - DOM Content Loaded: ${debug.performanceMetrics.domContentLoaded.toFixed(0)}ms`)
  console.log(`  - Load Complete: ${debug.performanceMetrics.loadComplete.toFixed(0)}ms`)
  console.log(`  - First Paint: ${debug.performanceMetrics.firstPaint.toFixed(0)}ms`)
  console.log(`  - LCP: ${debug.performanceMetrics.largestContentfulPaint.toFixed(0)}ms`)

  console.log('='.repeat(80) + '\n')
}

/**
 * Hook automatique pour afterEach - combine isolation + debug
 * Usage dans test.afterEach pour capture complète
 */
export async function debugTestFailure(
  page: Page,
  testInfo: any
): Promise<void> {
  if (testInfo.status !== 'failed') {
    return // Seulement si échec
  }

  try {
    const debugInfo = await captureDebugInfo(page, testInfo.title)
    printDebugSummary(debugInfo)
  } catch (error) {
    console.error('⚠️ Error during debug capture:', error)
  }
}

/**
 * Vérifie si un test est "sain" avant de commencer
 * Peut être appelé dans beforeEach pour détecter état corrompu
 */
export async function assertPageHealthy(page: Page): Promise<void> {
  const health = await page.evaluate(() => {
    return {
      readyState: document.readyState,
      hydrated: !!(window as any).__NEXT_DATA__,
      errors: ((window as any).__testErrors || []).length
    }
  })

  if (health.readyState !== 'complete') {
    throw new Error(`Page not ready: readyState = ${health.readyState}`)
  }

  if (!health.hydrated) {
    console.warn('⚠️ Next.js not hydrated - may cause issues')
  }

  if (health.errors > 0) {
    throw new Error(`Page has ${health.errors} uncaught JS errors`)
  }
}
