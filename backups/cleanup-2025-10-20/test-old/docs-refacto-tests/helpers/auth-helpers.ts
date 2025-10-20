/**
 * 🔐 Authentication Helpers - Modular Login Functions
 *
 * Helpers réutilisables pour l'authentification dans les tests E2E.
 * Basé sur le pattern VALIDÉ de Phase 2 Contacts (100% success rate).
 *
 * @see test/e2e/gestionnaire-invite-locataire.spec.ts:37-52 - Code source validé
 * @see docs/refacto/Tests/RESULTATS-PHASE-2-CONTACTS.md - Validation complète
 */

import { Page } from '@playwright/test'
import { TEST_USERS, type TestUser } from '../fixtures/users.fixture'

/**
 * ✅ PATTERN VALIDÉ - Login Gestionnaire
 *
 * Code exact du test Phase 2 Contacts qui a fonctionné à 100%.
 *
 * Pattern Key Points:
 * - Promise.all() pour capturer la redirection Next.js 15 Server Action
 * - Timeout 45s pour auth + middleware + redirect
 * - waitForLoadState('networkidle') avant et après
 * - waitForTimeout(2000) pour hydratation React
 *
 * @param page - Playwright Page object
 * @returns Promise<void> - Résolution après login complet et redirection
 *
 * @example
 * ```typescript
 * test('My test', async ({ page }) => {
 *   await loginAsGestionnaire(page)
 *   // User is now logged in on /gestionnaire/dashboard
 * })
 * ```
 */
export async function loginAsGestionnaire(page: Page): Promise<void> {
  const gestionnaire = TEST_USERS.gestionnaire

  // Step 1: Navigate to login page
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  // Step 2: Fill credentials
  await page.fill('input[type="email"]', gestionnaire.email)
  await page.fill('input[type="password"]', gestionnaire.password)

  // Step 3: Submit and wait for redirect (Next.js 15 Server Actions pattern)
  // ✅ Promise.all() captures the redirect properly
  await Promise.all([
    page.waitForURL(`**${gestionnaire.expectedDashboard}**`, {
      timeout: 45000  // Auth + middleware + redirect can take time
    }),
    page.click('button[type="submit"]', { timeout: 50000 })  // Must be >= waitForURL timeout
  ])

  // Step 4: Wait for full page load and React hydration
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)  // React component mounting
}

/**
 * ✅ PATTERN VALIDÉ - Login Locataire
 *
 * Même pattern que loginAsGestionnaire mais pour le rôle locataire.
 *
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function loginAsLocataire(page: Page): Promise<void> {
  const locataire = TEST_USERS.locataire

  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', locataire.email)
  await page.fill('input[type="password"]', locataire.password)

  await Promise.all([
    page.waitForURL(`**${locataire.expectedDashboard}**`, {
      timeout: 45000
    }),
    page.click('button[type="submit"]', { timeout: 50000 })  // Must be >= waitForURL timeout
  ])

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

/**
 * ✅ PATTERN VALIDÉ - Login Prestataire
 *
 * Même pattern que loginAsGestionnaire mais pour le rôle prestataire.
 *
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function loginAsPrestataire(page: Page): Promise<void> {
  const prestataire = TEST_USERS.prestataire

  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', prestataire.email)
  await page.fill('input[type="password"]', prestataire.password)

  await Promise.all([
    page.waitForURL(`**${prestataire.expectedDashboard}**`, {
      timeout: 45000
    }),
    page.click('button[type="submit"]', { timeout: 50000 })  // Must be >= waitForURL timeout
  ])

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

/**
 * ✅ Generic Login Helper
 *
 * Login avec n'importe quel utilisateur from fixtures.
 * Utile pour les tests paramétrés ou custom users.
 *
 * @param page - Playwright Page object
 * @param user - TestUser object from fixtures
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * const customUser = TEST_USERS.gestionnaire
 * await login(page, customUser)
 * ```
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  await Promise.all([
    page.waitForURL(`**${user.expectedDashboard}**`, {
      timeout: 45000
    }),
    page.click('button[type="submit"]', { timeout: 50000 })  // Must be >= waitForURL timeout
  ])

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

/**
 * Logout current user
 *
 * Clique sur le bouton de déconnexion et vérifie la redirection vers /auth/login.
 *
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu button
  const userMenuButton = page.locator('button:has-text("Utilisateur"), [data-testid="user-menu"]').first()
  await userMenuButton.click()

  // Click logout
  const logoutButton = page.locator('button:has-text("Déconnexion"), [data-testid="logout"]').first()
  await logoutButton.click()

  // Wait for redirect to login
  await page.waitForURL('**/auth/login**', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
}
