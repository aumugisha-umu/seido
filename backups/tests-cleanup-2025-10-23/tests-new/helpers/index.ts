/**
 * 🛠️ Test Helpers - Central Export File (tests-new)
 *
 * Point d'entrée unique pour tous les helpers de test E2E.
 * Permet des imports propres: `import { loginAsGestionnaire } from '../helpers'`
 */

// ============================================================================
// Authentication Helpers
// ============================================================================
export {
  loginAsGestionnaire,
  loginAsLocataire,
  loginAsPrestataire,
  login,
  logout,
  waitForAuth
} from './auth-helpers'

// ============================================================================
// Invitation Helpers
// ============================================================================
export {
  createInvitation,
  getMagicLinkFromDB,
  acceptInvitation,
  cleanupInvitation
} from './invitation-helpers'

// ============================================================================
// Email Helpers
// ============================================================================
export {
  waitForEmail,
  extractMagicLink,
  verifyEmailContent
} from './email-helpers'

// ============================================================================
// Supabase Helpers
// ============================================================================
export {
  createTestSupabaseClient as getSupabaseAdmin,
  getConfirmationLinkForEmail,
  userExistsInSupabase,
  waitForUserInSupabase,
  deleteUserFromSupabase
} from './supabase-helpers'

// ============================================================================
// Test Isolation Helpers (Auto-Healing Pattern)
// ============================================================================

import { Page } from '@playwright/test'

/**
 * Clean browser state for test isolation
 */
export async function cleanBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.context().clearPermissions()

  // ✅ CORRECTION: Vérifier si on est sur une vraie page avant d'accéder au storage
  try {
    const url = page.url()
    // Ne pas essayer de nettoyer le storage sur about:blank ou pages système
    if (url && !url.startsWith('about:') && !url.startsWith('data:')) {
      await page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          // Ignore les erreurs (par ex. sur fichier local)
        }
      })
    }
  } catch (e) {
    // Ignore les erreurs de sécurité
  }
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 2000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Setup test isolation before each test
 */
export async function setupTestIsolation(page: Page): Promise<void> {
  console.log('🧹 [SETUP] Cleaning browser state...')
  await cleanBrowserState(page)
  await page.goto('http://localhost:3000')
  await waitForNetworkIdle(page)
  console.log('✅ [SETUP] Test isolation ready')
}

/**
 * Teardown test isolation after each test
 */
export async function teardownTestIsolation(page: Page): Promise<void> {
  console.log('🧹 [TEARDOWN] Cleaning up...')
  await cleanBrowserState(page)
  console.log('✅ [TEARDOWN] Cleanup complete')
}

/**
 * Check if page is healthy (no errors, content loaded)
 */
export async function isPageHealthy(page: Page): Promise<boolean> {
  try {
    // Check if page is loaded
    const title = await page.title()
    if (!title || title === '') return false

    // Check for error pages
    const errorIndicators = [
      'text=Error',
      'text=404',
      'text=500',
      'text=Something went wrong'
    ]

    for (const indicator of errorIndicators) {
      const errorElement = await page.locator(indicator).count()
      if (errorElement > 0) return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Reset application state (logout + clear data)
 */
export async function resetApplicationState(page: Page): Promise<void> {
  console.log('🔄 [RESET] Resetting application state...')

  // Try to logout if already logged in
  try {
    await page.goto('http://localhost:3000/auth/logout', { waitUntil: 'networkidle', timeout: 5000 })
  } catch {
    // Ignore errors, user might not be logged in
  }

  // Clear all state
  await cleanBrowserState(page)

  console.log('✅ [RESET] Application state reset')
}

// ============================================================================
// Debug Helpers (Auto-Healing Pattern)
// ============================================================================

export interface ConsoleEntry {
  type: string
  message: string
  timestamp: number
}

export interface PendingRequest {
  url: string
  method: string
  timestamp: number
}

export interface HealthCheck {
  pageLoaded: boolean
  hasErrors: boolean
  consoleErrorCount: number
  networkErrorCount: number
  pendingRequestsCount: number
}

export interface PerformanceMetrics {
  domContentLoaded: number
  loadComplete: number
  firstContentfulPaint?: number
}

export interface DebugInfo {
  timestamp: number
  url: string
  title: string
  screenshot?: string
  consoleLogs: ConsoleEntry[]
  consoleErrors: ConsoleEntry[]
  networkErrors: PendingRequest[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  cookies: any[]
  healthCheck: HealthCheck
  performance: PerformanceMetrics
}

/**
 * Capture comprehensive debug information
 */
export async function captureDebugInfo(page: Page, testName: string): Promise<DebugInfo> {
  console.log(`📸 [DEBUG] Capturing debug info for: ${testName}`)

  const consoleLogs: ConsoleEntry[] = []
  const consoleErrors: ConsoleEntry[] = []
  const networkErrors: PendingRequest[] = []

  // Listen to console messages
  page.on('console', (msg) => {
    const entry: ConsoleEntry = {
      type: msg.type(),
      message: msg.text(),
      timestamp: Date.now()
    }

    if (msg.type() === 'error') {
      consoleErrors.push(entry)
    } else {
      consoleLogs.push(entry)
    }
  })

  // Listen to network errors
  page.on('requestfailed', (request) => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      timestamp: Date.now()
    })
  })

  // Capture screenshot
  const screenshotPath = `tests-new/logs/${testName}-${Date.now()}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })

  // Get storage data
  const localStorage = await page.evaluate(() => ({ ...window.localStorage }))
  const sessionStorage = await page.evaluate(() => ({ ...window.sessionStorage }))
  const cookies = await page.context().cookies()

  // Health check
  const healthCheck: HealthCheck = {
    pageLoaded: await isPageHealthy(page),
    hasErrors: consoleErrors.length > 0 || networkErrors.length > 0,
    consoleErrorCount: consoleErrors.length,
    networkErrorCount: networkErrors.length,
    pendingRequestsCount: 0
  }

  // Performance metrics
  const performance = await page.evaluate(() => {
    const timing = window.performance.timing
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart
    }
  })

  const debugInfo: DebugInfo = {
    timestamp: Date.now(),
    url: page.url(),
    title: await page.title(),
    screenshot: screenshotPath,
    consoleLogs,
    consoleErrors,
    networkErrors,
    localStorage,
    sessionStorage,
    cookies,
    healthCheck,
    performance
  }

  console.log('✅ [DEBUG] Debug info captured')
  return debugInfo
}

/**
 * Print debug summary to console
 */
export function printDebugSummary(debugInfo: DebugInfo): void {
  console.log('\n📊 ========== DEBUG SUMMARY ==========')
  console.log(`📍 URL: ${debugInfo.url}`)
  console.log(`📄 Title: ${debugInfo.title}`)
  console.log(`⏰ Timestamp: ${new Date(debugInfo.timestamp).toISOString()}`)
  console.log(`\n🏥 Health Check:`)
  console.log(`  ✅ Page Loaded: ${debugInfo.healthCheck.pageLoaded}`)
  console.log(`  ❌ Has Errors: ${debugInfo.healthCheck.hasErrors}`)
  console.log(`  🔴 Console Errors: ${debugInfo.healthCheck.consoleErrorCount}`)
  console.log(`  🌐 Network Errors: ${debugInfo.healthCheck.networkErrorCount}`)
  console.log(`\n⚡ Performance:`)
  console.log(`  DOM Content Loaded: ${debugInfo.performance.domContentLoaded}ms`)
  console.log(`  Load Complete: ${debugInfo.performance.loadComplete}ms`)
  console.log('\n=======================================\n')
}

/**
 * Debug test failure with auto-healing
 */
export async function debugTestFailure(page: Page, testName: string, error: any): Promise<void> {
  console.error(`❌ [TEST FAILED] ${testName}`)
  console.error('Error:', error)

  const debugInfo = await captureDebugInfo(page, testName)
  printDebugSummary(debugInfo)

  // Auto-healing suggestions
  console.log('\n🔧 Auto-Healing Suggestions:')

  if (debugInfo.healthCheck.consoleErrorCount > 0) {
    console.log('  • Fix console errors:')
    debugInfo.consoleErrors.slice(0, 3).forEach((err, i) => {
      console.log(`    ${i + 1}. ${err.message}`)
    })
  }

  if (debugInfo.healthCheck.networkErrorCount > 0) {
    console.log('  • Fix network errors:')
    debugInfo.networkErrors.slice(0, 3).forEach((err, i) => {
      console.log(`    ${i + 1}. ${err.method} ${err.url}`)
    })
  }

  if (!debugInfo.healthCheck.pageLoaded) {
    console.log('  • Page did not load properly - check server status')
  }

  console.log(`  • Screenshot saved: ${debugInfo.screenshot}`)
  console.log('\n')
}

/**
 * Assert page is healthy before proceeding
 */
export async function assertPageHealthy(page: Page, context: string): Promise<void> {
  const healthy = await isPageHealthy(page)
  if (!healthy) {
    throw new Error(`Page is not healthy in context: ${context}`)
  }
}
