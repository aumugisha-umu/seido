/**
 * 🛠️ Test Helpers - Central Export File
 *
 * Point d'entrée unique pour tous les helpers de test E2E.
 * Permet des imports propres: `import { loginAsGestionnaire } from '../../helpers'`
 *
 * @example
 * ```typescript
 * import {
 *   loginAsGestionnaire,
 *   navigateToContacts,
 *   navigateToBuildings
 * } from '../../helpers'
 *
 * test('My test', async ({ page }) => {
 *   await loginAsGestionnaire(page)
 *   await navigateToContacts(page)
 *   // ...
 * })
 * ```
 */

// ============================================================================
// Authentication Helpers
// ============================================================================
export {
  loginAsGestionnaire,
  loginAsLocataire,
  loginAsPrestataire,
  login,
  logout
} from './auth-helpers'

// ============================================================================
// Navigation Helpers
// ============================================================================
export {
  navigateToContacts,
  navigateToBuildings,
  navigateToInterventions,
  navigateToDashboard,
  navigateToLots,
  navigateTo
} from './navigation-helpers'

// ============================================================================
// Test Isolation Helpers
// ============================================================================
export {
  cleanBrowserState,
  waitForNetworkIdle,
  setupTestIsolation,
  teardownTestIsolation,
  isPageHealthy,
  resetApplicationState
} from './test-isolation'

// ============================================================================
// Debug Helpers
// ============================================================================
export {
  captureDebugInfo,
  printDebugSummary,
  debugTestFailure,
  assertPageHealthy,
  type DebugInfo,
  type ConsoleEntry,
  type PendingRequest,
  type HealthCheck,
  type PerformanceMetrics
} from './debug-helpers'

// ============================================================================
// Other Helpers (existing)
// ============================================================================
export { E2ETestLogger } from './e2e-test-logger'
