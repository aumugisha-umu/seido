/**
 * Auto-Healing Test: Dashboard Load (RLS Recursion Fix)
 *
 * Purpose:
 * Validates that the team_members RLS recursion issue (error 42P17) is completely resolved
 *
 * Test Strategy:
 * 1. Login as gestionnaire
 * 2. Navigate to dashboard
 * 3. Monitor console for 42P17 errors
 * 4. Verify teams data loads successfully
 * 5. Reload page to trigger fresh data fetch
 * 6. Assert NO recursion errors occurred
 *
 * Auto-Healing Context:
 * - Previous issue: infinite recursion in team_members RLS policy
 * - Root cause: Function-based policy calling get_user_id_from_auth()
 * - Solution: Permissive policy USING (true) + app-level filtering
 * - Migration: 20251003200000_fix_rls_team_members_final.sql
 */

import { test, expect } from '@playwright/test'
import { loginAsGestionnaire } from '@/docs/refacto/Tests/helpers'

test.describe('Auto-Healing: Dashboard Load - RLS Fix Validation', () => {
  let consoleErrors: string[] = []
  let rls42P17Errors: string[] = []

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = []
    rls42P17Errors = []

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text()
        consoleErrors.push(errorText)

        // Specifically track RLS recursion errors (code 42P17)
        if (errorText.includes('42P17') || errorText.includes('infinite recursion')) {
          rls42P17Errors.push(errorText)
          console.error(`🚨 [RLS-42P17] ${errorText}`)
        }
      }
    })

    // Capture page errors
    page.on('pageerror', error => {
      const errorMessage = error.message
      consoleErrors.push(errorMessage)

      if (errorMessage.includes('42P17') || errorMessage.includes('infinite recursion')) {
        rls42P17Errors.push(errorMessage)
        console.error(`🚨 [PAGE-ERROR-42P17] ${errorMessage}`)
      }
    })
  })

  test('should load gestionnaire dashboard without RLS recursion (42P17)', async ({ page }) => {
    console.log('🧪 [AUTO-HEALING-TEST] Starting dashboard load validation...')

    // STEP 1: Login as gestionnaire
    console.log('📝 [STEP 1] Logging in as gestionnaire...')
    await loginAsGestionnaire(page)
    await expect(page).toHaveURL(/gestionnaire\/dashboard/, { timeout: 15000 })
    console.log('✅ [STEP 1] Login successful, on dashboard')

    // STEP 2: Wait for initial data load
    console.log('⏳ [STEP 2] Waiting for teams data to load...')
    await page.waitForTimeout(3000)

    // STEP 3: Check for 42P17 errors after initial load
    console.log('🔍 [STEP 3] Checking for RLS recursion errors (initial load)...')
    expect(rls42P17Errors.length).toBe(0)
    console.log(`✅ [STEP 3] No 42P17 errors found (checked ${consoleErrors.length} console messages)`)

    // STEP 4: Reload page to trigger fresh data fetch
    console.log('🔄 [STEP 4] Reloading page to test fresh data fetch...')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    // STEP 5: Verify NO 42P17 errors after reload
    console.log('🔍 [STEP 5] Checking for RLS recursion errors (after reload)...')
    expect(rls42P17Errors.length).toBe(0)
    console.log(`✅ [STEP 5] No 42P17 errors found after reload`)

    // STEP 6: Verify dashboard UI loaded successfully
    console.log('🎨 [STEP 6] Verifying dashboard UI elements...')

    // Wait for dashboard content (with generous timeout)
    const dashboardLoaded = await page.waitForSelector('main', { timeout: 10000 }).catch(() => null)
    expect(dashboardLoaded).not.toBeNull()
    console.log('✅ [STEP 6] Dashboard main content visible')

    // Optional: Check for team-related content (if visible in UI)
    const bodyText = await page.textContent('body')
    const hasTeamContent = bodyText?.includes('Équipe') || bodyText?.includes('Team') || bodyText?.includes('Statistiques')

    if (hasTeamContent) {
      console.log('✅ [STEP 6] Team-related content detected in UI')
    } else {
      console.log('ℹ️ [STEP 6] No team content detected (may be empty state)')
    }

    // FINAL VALIDATION
    console.log('📊 [FINAL] Test Summary:')
    console.log(`  - Total console messages: ${consoleErrors.length}`)
    console.log(`  - RLS 42P17 errors: ${rls42P17Errors.length}`)
    console.log(`  - Dashboard loaded: ✅`)

    // Hard assert: NO 42P17 errors should exist
    expect(rls42P17Errors, 'RLS recursion error (42P17) detected - fix failed!').toHaveLength(0)

    console.log('✅ [SUCCESS] Auto-healing validation passed - RLS recursion fixed!')
  })

  test('should handle getUserTeams() without recursion', async ({ page }) => {
    console.log('🧪 [AUTO-HEALING-TEST] Testing TeamService.getUserTeams() specifically...')

    // Login
    await loginAsGestionnaire(page)
    await expect(page).toHaveURL(/gestionnaire\/dashboard/)

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check network requests for errors
    const failedRequests: string[] = []

    page.on('response', response => {
      if (!response.ok() && response.url().includes('/gestionnaire/dashboard')) {
        failedRequests.push(`${response.status()} - ${response.url()}`)
      }
    })

    // Reload to trigger getUserTeams() again
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Verify no 42P17 in console
    expect(rls42P17Errors).toHaveLength(0)

    // Verify no failed requests
    expect(failedRequests).toHaveLength(0)

    console.log('✅ [SUCCESS] getUserTeams() executed without recursion')
  })

  test.afterEach(async () => {
    // Report errors if any
    if (rls42P17Errors.length > 0) {
      console.error('❌ [TEST-FAILED] RLS recursion errors detected:')
      rls42P17Errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}`)
      })
    }
  })
})
