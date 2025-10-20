/**
 * 🧭 Navigation Helpers - Page Navigation Functions
 *
 * Helpers réutilisables pour la navigation dans les tests E2E.
 * Basé sur le pattern VALIDÉ de Phase 2 Contacts.
 *
 * Pattern Key Points:
 * - waitUntil: 'domcontentloaded' (plus permissif que 'networkidle')
 * - Attente explicite du header/nav pour confirmer l'UI est chargée
 * - Timeout généreux (30s pour goto, 15s pour selectors)
 *
 * @see test/e2e/gestionnaire-invite-locataire.spec.ts:63-71 - Code source validé
 */

import { Page } from '@playwright/test'

/**
 * ✅ PATTERN VALIDÉ - Navigate to Contacts Page (Gestionnaire)
 *
 * Navigation validée avec attente de l'UI complète.
 *
 * @param page - Playwright Page object
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await loginAsGestionnaire(page)
 * await navigateToContacts(page)
 * // Page is fully loaded with React components mounted
 * ```
 */
export async function navigateToContacts(page: Page): Promise<void> {
  // Navigate with tolerant wait condition
  await page.goto('/gestionnaire/contacts', {
    waitUntil: 'domcontentloaded',  // More permissive than 'networkidle'
    timeout: 30000
  })

  // Wait for page to be minimally interactive (nav visible)
  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  // Additional wait for data loading components
  await page.waitForTimeout(2000)
}

/**
 * ✅ PATTERN VALIDÉ - Navigate to Buildings Page (Gestionnaire)
 *
 * Même pattern que navigateToContacts.
 *
 * @param page - Playwright Page object
 * @returns Promise<void>
 */
export async function navigateToBuildings(page: Page): Promise<void> {
  await page.goto('/gestionnaire/biens', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  await page.waitForTimeout(2000)
}

/**
 * ✅ PATTERN VALIDÉ - Navigate to Interventions Page
 *
 * Works for all roles (gestionnaire, locataire, prestataire).
 * Each role has their own interventions URL.
 *
 * @param page - Playwright Page object
 * @param role - User role ('gestionnaire' | 'locataire' | 'prestataire')
 * @returns Promise<void>
 */
export async function navigateToInterventions(
  page: Page,
  role: 'gestionnaire' | 'locataire' | 'prestataire' = 'gestionnaire'
): Promise<void> {
  await page.goto(`/${role}/interventions`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  await page.waitForTimeout(2000)
}

/**
 * ✅ PATTERN VALIDÉ - Navigate to Dashboard
 *
 * Navigate to the dashboard for the specified role.
 *
 * @param page - Playwright Page object
 * @param role - User role ('gestionnaire' | 'locataire' | 'prestataire')
 * @returns Promise<void>
 */
export async function navigateToDashboard(
  page: Page,
  role: 'gestionnaire' | 'locataire' | 'prestataire'
): Promise<void> {
  await page.goto(`/${role}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  await page.waitForTimeout(2000)
}

/**
 * Navigate to specific building's lots page (Gestionnaire)
 *
 * @param page - Playwright Page object
 * @param buildingId - Building ID
 * @returns Promise<void>
 */
export async function navigateToLots(page: Page, buildingId?: string): Promise<void> {
  const url = buildingId
    ? `/gestionnaire/biens/${buildingId}/lots`
    : '/gestionnaire/biens'

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  await page.waitForTimeout(2000)
}

/**
 * Generic navigation helper
 *
 * Navigate to any URL with the validated pattern.
 *
 * @param page - Playwright Page object
 * @param url - URL path (relative or absolute)
 * @returns Promise<void>
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  await page.waitForSelector('nav, header, [role="navigation"]', {
    timeout: 15000
  })

  await page.waitForTimeout(2000)
}
