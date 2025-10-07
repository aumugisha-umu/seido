import { test, expect, Page } from '@playwright/test'

// Test credentials for each role
const TEST_USERS = {
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    expectedDashboard: '/gestionnaire/dashboard',
    roleName: 'Gestionnaire'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/prestataire/dashboard',
    roleName: 'Prestataire'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    expectedDashboard: '/locataire/dashboard',
    roleName: 'Locataire'
  }
}

// Helper function to perform login
async function performLogin(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/auth/login')

  // Wait for the form to be ready
  await page.waitForSelector('form', { timeout: 10000 })

  // Fill in email
  const emailInput = page.locator('input[name="email"], input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible' })
  await emailInput.fill(email)

  // Fill in password
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first()
  await passwordInput.waitFor({ state: 'visible' })
  await passwordInput.fill(password)

  // Click submit button
  const submitButton = page.locator('button[type="submit"]').first()
  await submitButton.waitFor({ state: 'visible' })
  await submitButton.click()
}

// Helper function to check dashboard access
async function checkDashboardAccess(page: Page, expectedPath: string, roleName: string) {
  // Wait for navigation to dashboard
  await page.waitForURL(expectedPath, { timeout: 15000 })

  // Check URL
  expect(page.url()).toContain(expectedPath)

  // Check for dashboard elements
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })

  // Look for role-specific content
  const pageContent = await page.textContent('body')
  console.log(`Dashboard content preview for ${roleName}:`, pageContent?.substring(0, 200))
}

// Helper function to perform logout
async function performLogout(page: Page) {
  // Try multiple selectors for logout button
  const logoutSelectors = [
    'button:has-text("Déconnexion")',
    'button:has-text("Se déconnecter")',
    'button:has-text("Logout")',
    'a[href="/auth/logout"]',
    '[data-testid="logout-button"]'
  ]

  let logoutFound = false
  for (const selector of logoutSelectors) {
    try {
      const logoutButton = page.locator(selector).first()
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click()
        logoutFound = true
        break
      }
    } catch {
      // Try next selector
    }
  }

  if (logoutFound) {
    // Wait for redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 10000 })
  } else {
    console.log('Logout button not found, navigating directly to /auth/logout')
    await page.goto('/auth/logout')
  }
}

test.describe('SEIDO Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.describe('Gestionnaire Authentication Flow', () => {
    test('should login, access dashboard, navigate, and logout', async ({ page }) => {
      const user = TEST_USERS.gestionnaire

      console.log(`Testing ${user.roleName} authentication...`)

      // 1. Login process
      await performLogin(page, user.email, user.password)

      // 2. Check dashboard redirection
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // 3. Test navigation within role-specific areas
      console.log('Testing navigation within gestionnaire areas...')

      // Try to navigate to interventions
      await page.goto('/gestionnaire/interventions')
      await expect(page).toHaveURL(/\/gestionnaire\/interventions/)

      // Try to navigate to properties
      await page.goto('/gestionnaire/biens')
      await expect(page).toHaveURL(/\/gestionnaire\/biens/)

      // 4. Test logout
      await page.goto('/gestionnaire/dashboard')
      await performLogout(page)

      // Verify logged out
      expect(page.url()).toContain('/auth/login')
    })

    test('should prevent access to other role dashboards', async ({ page }) => {
      const user = TEST_USERS.gestionnaire

      // Login as gestionnaire
      await performLogin(page, user.email, user.password)
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // Try to access prestataire dashboard
      await page.goto('/prestataire/dashboard')
      // Should redirect to gestionnaire dashboard or show error
      await expect(page).not.toHaveURL(/\/prestataire\/dashboard/)

      // Try to access locataire dashboard
      await page.goto('/locataire/dashboard')
      // Should redirect to gestionnaire dashboard or show error
      await expect(page).not.toHaveURL(/\/locataire\/dashboard/)
    })
  })

  test.describe('Prestataire Authentication Flow', () => {
    test('should login, access dashboard, navigate, and logout', async ({ page }) => {
      const user = TEST_USERS.prestataire

      console.log(`Testing ${user.roleName} authentication...`)

      // 1. Login process
      await performLogin(page, user.email, user.password)

      // 2. Check dashboard redirection
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // 3. Test navigation within role-specific areas
      console.log('Testing navigation within prestataire areas...')

      // Try to navigate to interventions
      await page.goto('/prestataire/interventions')
      await expect(page).toHaveURL(/\/prestataire\/interventions/)

      // Try to navigate to availabilities
      await page.goto('/prestataire/disponibilites')
      await expect(page).toHaveURL(/\/prestataire\/disponibilites/)

      // 4. Test logout
      await page.goto('/prestataire/dashboard')
      await performLogout(page)

      // Verify logged out
      expect(page.url()).toContain('/auth/login')
    })

    test('should prevent access to other role dashboards', async ({ page }) => {
      const user = TEST_USERS.prestataire

      // Login as prestataire
      await performLogin(page, user.email, user.password)
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // Try to access gestionnaire dashboard
      await page.goto('/gestionnaire/dashboard')
      // Should redirect to prestataire dashboard or show error
      await expect(page).not.toHaveURL(/\/gestionnaire\/dashboard/)

      // Try to access locataire dashboard
      await page.goto('/locataire/dashboard')
      // Should redirect to prestataire dashboard or show error
      await expect(page).not.toHaveURL(/\/locataire\/dashboard/)
    })
  })

  test.describe('Locataire Authentication Flow', () => {
    test('should login, access dashboard, navigate, and logout', async ({ page }) => {
      const user = TEST_USERS.locataire

      console.log(`Testing ${user.roleName} authentication...`)

      // 1. Login process
      await performLogin(page, user.email, user.password)

      // 2. Check dashboard redirection
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // 3. Test navigation within role-specific areas
      console.log('Testing navigation within locataire areas...')

      // Try to navigate to interventions
      await page.goto('/locataire/interventions')
      await expect(page).toHaveURL(/\/locataire\/interventions/)

      // Try to navigate to new intervention request
      await page.goto('/locataire/interventions/nouvelle-demande')
      await expect(page).toHaveURL(/\/locataire\/interventions\/nouvelle-demande/)

      // 4. Test logout
      await page.goto('/locataire/dashboard')
      await performLogout(page)

      // Verify logged out
      expect(page.url()).toContain('/auth/login')
    })

    test('should prevent access to other role dashboards', async ({ page }) => {
      const user = TEST_USERS.locataire

      // Login as locataire
      await performLogin(page, user.email, user.password)
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // Try to access gestionnaire dashboard
      await page.goto('/gestionnaire/dashboard')
      // Should redirect to locataire dashboard or show error
      await expect(page).not.toHaveURL(/\/gestionnaire\/dashboard/)

      // Try to access prestataire dashboard
      await page.goto('/prestataire/dashboard')
      // Should redirect to locataire dashboard or show error
      await expect(page).not.toHaveURL(/\/prestataire\/dashboard/)
    })
  })

  test.describe('Cross-Role Authentication Tests', () => {
    test('should handle sequential logins with different roles', async ({ page }) => {
      // Test logging in with each role sequentially
      for (const [roleKey, user] of Object.entries(TEST_USERS)) {
        console.log(`Testing sequential login for ${user.roleName}...`)

        // Clear cookies and storage
        await page.context().clearCookies()
        await page.evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })

        // Login and verify
        await performLogin(page, user.email, user.password)
        await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

        // Logout
        await performLogout(page)
      }
    })

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/auth/login')

      // Try invalid email
      await performLogin(page, 'invalid@email.com', 'wrongpassword')

      // Should stay on login page with error
      await expect(page).toHaveURL(/\/auth\/login/)

      // Check for error message
      const errorMessage = page.locator('text=/invalid|incorrect|error/i').first()
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    })

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = [
        '/gestionnaire/dashboard',
        '/prestataire/dashboard',
        '/locataire/dashboard'
      ]

      for (const route of protectedRoutes) {
        await page.goto(route)
        // Should redirect to login
        await expect(page).toHaveURL(/\/auth\/login/)
      }
    })
  })

  test.describe('Authentication Performance Tests', () => {
    test('should complete login within acceptable time', async ({ page }) => {
      const user = TEST_USERS.gestionnaire

      const startTime = Date.now()
      await performLogin(page, user.email, user.password)
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)
      const endTime = Date.now()

      const loginTime = endTime - startTime
      console.log(`Login completed in ${loginTime}ms`)

      // Login should complete within 5 seconds
      expect(loginTime).toBeLessThan(5000)
    })

    test('should maintain session across page refreshes', async ({ page }) => {
      const user = TEST_USERS.gestionnaire

      // Login
      await performLogin(page, user.email, user.password)
      await checkDashboardAccess(page, user.expectedDashboard, user.roleName)

      // Refresh page
      await page.reload()

      // Should still be on dashboard
      await expect(page).toHaveURL(user.expectedDashboard)
    })
  })
})
