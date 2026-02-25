/**
 * Global teardown for E2E tests — runs ONCE after all test files.
 *
 * Auth cookies are intentionally preserved for reuse across runs
 * (globalSetup checks freshness before re-logging in).
 * Browser data dir is also preserved for cache reuse.
 */

export default async function globalTeardown() {
  // Cookies and browser data are intentionally NOT cleaned up.
  // globalSetup checks cookie freshness (30 min TTL) before re-logging in.
  console.log('[E2E Teardown] Complete. Cookies preserved for reuse.')
}
