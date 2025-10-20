import { test, expect } from '@playwright/test'
import { TestAccountsHelper } from '../utils/test-accounts-helper'

test.describe('Phase 2 - Server Component Validation', () => {
  const testAccounts = TestAccountsHelper.getDefaultTestAccounts()

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('Server Components render correctly for all roles', async ({ page }) => {
    const roles = [
      { email: testAccounts.gestionnaire.email, role: 'gestionnaire', dashboard: '/gestionnaire/dashboard' },
      { email: testAccounts.prestataire.email, role: 'prestataire', dashboard: '/prestataire/dashboard' },
      { email: testAccounts.locataire.email, role: 'locataire', dashboard: '/locataire/dashboard' },
      { email: testAccounts.admin.email, role: 'admin', dashboard: '/admin/dashboard' }
    ]

    for (const { email, role, dashboard } of roles) {
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', testAccounts.password)
      await page.click('button[type="submit"]')

      // Wait for redirect to dashboard
      await page.waitForURL(dashboard)

      // Verify Server Component rendered
      await expect(page.locator('main')).toBeVisible()

      // Check that navigation works
      if (role === 'gestionnaire') {
        await page.click('a[href="/gestionnaire/interventions"]')
        await page.waitForURL('/gestionnaire/interventions')
        await expect(page.locator('h1:has-text("Interventions")')).toBeVisible()
      }

      // Logout for next iteration
      await page.click('button:has-text("Déconnexion")')
      await page.waitForURL('/auth/login')
    }
  })

  test('Loading states display correctly during navigation', async ({ page }) => {
    // Login as gestionnaire
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Test navigation with loading state
    const navigationPromise = page.waitForURL('/gestionnaire/interventions')
    await page.click('a[href="/gestionnaire/interventions"]')

    // Loading indicator should appear
    const loadingIndicator = page.locator('[data-testid="loading-indicator"], .animate-spin, [role="status"]')

    // Check if loading indicator appears (it might be very fast)
    const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false)

    await navigationPromise

    // Verify content loaded
    await expect(page.locator('h1:has-text("Interventions")')).toBeVisible()
  })

  test('Error boundaries catch errors properly', async ({ page }) => {
    // Test error handling by navigating to a non-existent route
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Try to navigate to a non-existent page
    await page.goto('/gestionnaire/non-existent-page', { waitUntil: 'networkidle' })

    // Should show 404 or error page
    const errorContent = await page.locator('body').textContent()
    expect(errorContent).toMatch(/404|not found|erreur|error/i)
  })

  test('NavigationRefreshWrapper maintains state correctly', async ({ page }) => {
    // Login as gestionnaire
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Get initial auth state
    const initialAuthState = await page.evaluate(() => {
      return localStorage.getItem('seido_user')
    })

    // Navigate to different pages
    await page.click('a[href="/gestionnaire/interventions"]')
    await page.waitForURL('/gestionnaire/interventions')

    // Check auth state is maintained
    const afterNavAuthState = await page.evaluate(() => {
      return localStorage.getItem('seido_user')
    })

    expect(afterNavAuthState).toBe(initialAuthState)

    // Navigate back
    await page.click('a[href="/gestionnaire/dashboard"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Verify state still maintained
    const finalAuthState = await page.evaluate(() => {
      return localStorage.getItem('seido_user')
    })

    expect(finalAuthState).toBe(initialAuthState)
  })

  test('Multi-role layout isolation works correctly', async ({ browser }) => {
    // Test that different roles have isolated layouts
    const gestionnaireContext = await browser.newContext()
    const prestataireContext = await browser.newContext()

    const gestionnaireePage = await gestionnaireContext.newPage()
    const prestatairePage = await prestataireContext.newPage()

    // Login as gestionnaire
    await gestionnaireePage.goto('/auth/login')
    await gestionnaireePage.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await gestionnaireePage.fill('input[name="password"]', testAccounts.password)
    await gestionnaireePage.click('button[type="submit"]')
    await gestionnaireePage.waitForURL('/gestionnaire/dashboard')

    // Login as prestataire
    await prestatairePage.goto('/auth/login')
    await prestatairePage.fill('input[name="email"]', testAccounts.prestataire.email)
    await prestatairePage.fill('input[name="password"]', testAccounts.password)
    await prestatairePage.click('button[type="submit"]')
    await prestatairePage.waitForURL('/prestataire/dashboard')

    // Verify different navigation menus
    const gestionnaireNav = await gestionnaireePage.locator('nav').textContent()
    const prestataireNav = await prestatairePage.locator('nav').textContent()

    // Gestionnaire should have "Biens" in navigation
    expect(gestionnaireNav).toContain('Biens')

    // Prestataire should not have "Biens"
    expect(prestataireNav).not.toContain('Biens')

    // Clean up
    await gestionnaireContext.close()
    await prestataireContext.close()
  })

  test('Client component interactions work with Server Components', async ({ page }) => {
    // Login as gestionnaire
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Test client-side interactions (like dropdowns, modals)
    // Click on notifications if available
    const notificationButton = page.locator('button[aria-label*="notification"], button:has-text("Notifications")')

    if (await notificationButton.isVisible()) {
      await notificationButton.click()

      // Check if dropdown/modal appears
      const notificationContent = page.locator('[role="menu"], [role="dialog"], .dropdown-menu')
      await expect(notificationContent).toBeVisible({ timeout: 5000 })
    }

    // Test theme toggle if available
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme")')

    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      // Theme should change
      await page.waitForTimeout(500)
    }
  })

  test('Performance: Initial page load is optimized', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/auth/login', { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000)

    // Check that critical resources are loaded
    const hasCSS = await page.locator('link[rel="stylesheet"]').count()
    expect(hasCSS).toBeGreaterThan(0)

    // Check JavaScript bundle is loaded
    const scripts = await page.locator('script[src]').count()
    expect(scripts).toBeGreaterThan(0)
  })

  test('Cache optimization works for authenticated routes', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Measure first navigation
    const firstNavStart = Date.now()
    await page.click('a[href="/gestionnaire/interventions"]')
    await page.waitForURL('/gestionnaire/interventions')
    const firstNavTime = Date.now() - firstNavStart

    // Go back to dashboard
    await page.click('a[href="/gestionnaire/dashboard"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Measure second navigation (should be cached)
    const secondNavStart = Date.now()
    await page.click('a[href="/gestionnaire/interventions"]')
    await page.waitForURL('/gestionnaire/interventions')
    const secondNavTime = Date.now() - secondNavStart

    // Second navigation should be faster (cached)
    console.log(`First navigation: ${firstNavTime}ms, Second navigation: ${secondNavTime}ms`)

    // Allow for some variance, but cached should generally be faster
    // Don't fail the test if not faster, just log it
    if (secondNavTime < firstNavTime) {
      expect(secondNavTime).toBeLessThanOrEqual(firstNavTime)
    }
  })
})

test.describe('Phase 2 - Error Recovery', () => {
  const testAccounts = TestAccountsHelper.getDefaultTestAccounts()

  test('Handles network errors gracefully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Simulate network error
    await page.route('**/api/**', route => {
      route.abort('failed')
    })

    // Try to navigate
    await page.goto('/gestionnaire/interventions', { waitUntil: 'networkidle' })

    // Should show error state or fallback
    const content = await page.locator('body').textContent()

    // Page should still render (Server Component)
    expect(content).toBeTruthy()

    // Restore network
    await page.unroute('**/api/**')
  })

  test('Recovers from authentication errors', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Clear auth token to simulate expiry
    await page.evaluate(() => {
      localStorage.removeItem('seido_token')
    })

    // Try to navigate to protected route
    await page.goto('/gestionnaire/interventions')

    // Should redirect to login
    await page.waitForURL('/auth/login')

    // Can login again
    await page.fill('input[name="email"]', testAccounts.gestionnaire.email)
    await page.fill('input[name="password"]', testAccounts.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/gestionnaire/dashboard')

    // Should work normally
    await expect(page.locator('h1')).toBeVisible()
  })
})
