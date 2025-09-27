/**
 * Helpers principaux pour les tests SEIDO
 * Centralise l'organisation par rôle et les utilitaires de test
 */

import { test as baseTest, expect as baseExpect, Page, TestInfo } from '@playwright/test'
import { createScreenshotHelper, ScreenshotHelper } from '../helpers/screenshot-helper'
import {
  takeOrganizedScreenshot,
  configureVideoRecording,
  capturePageState,
  detectRole
} from '../helpers/media-organization-helper'

/**
 * Extension du test Playwright avec helpers personnalisés
 */
export const test = baseTest.extend<{
  screenshotHelper: ScreenshotHelper
  captureRole: () => Promise<string>
  organizedScreenshot: (name?: string) => Promise<string>
}>({
  // Helper pour screenshots organisées
  screenshotHelper: async ({ page }, use, testInfo) => {
    const helper = createScreenshotHelper(page, testInfo)
    await use(helper)
    // Générer le rapport à la fin du test
    await helper.generateReport()
  },

  // Capture automatique du rôle
  captureRole: async ({ page }, use, testInfo) => {
    await use(async () => {
      const role = detectRole(testInfo)
      console.log(`Test running as role: ${role}`)
      return role
    })
  },

  // Screenshot organisée par rôle
  organizedScreenshot: async ({ page }, use, testInfo) => {
    await use(async (name?: string) => {
      return await takeOrganizedScreenshot(page, testInfo, name)
    })
  }
})

export const expect = baseExpect

/**
 * Helper pour login par rôle
 */
export async function loginAsRole(
  page: Page,
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
) {
  const credentials = {
    admin: { email: 'arthur+admin@seido.pm', password: 'password123' },
    gestionnaire: { email: 'arthur@umumentum.com', password: 'password123' },
    prestataire: { email: 'arthur+prest@seido.pm', password: 'password123' },
    locataire: { email: 'arthur+loc@seido.pm', password: 'password123' }
  }

  const creds = credentials[role]

  await page.goto('/auth/login')
  await page.fill('[name="email"]', creds.email)
  await page.fill('[name="password"]', creds.password)
  await page.click('button[type="submit"]')

  // Attendre la redirection
  await page.waitForURL(/\/dashboard\/.+/, { timeout: 10000 })

  console.log(`Logged in as ${role}`)

  return role
}

/**
 * Helper pour capturer l'état complet avec organisation
 */
export async function captureFullState(
  page: Page,
  testInfo: TestInfo,
  name: string
) {
  return await capturePageState(page, testInfo, name)
}

/**
 * Helper pour configurer les vidéos par rôle
 */
export function setupVideoRecording(testInfo: TestInfo) {
  return configureVideoRecording(testInfo)
}

/**
 * Helper pour les assertions visuelles
 */
export async function expectVisualMatch(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options?: {
    threshold?: number
    maxDiffPixels?: number
    fullPage?: boolean
  }
) {
  const screenshot = await page.screenshot({
    fullPage: options?.fullPage ?? true,
    animations: 'disabled'
  })

  expect(screenshot).toMatchSnapshot(name, {
    threshold: options?.threshold ?? 0.2,
    maxDiffPixels: options?.maxDiffPixels ?? 100
  })
}

/**
 * Helper pour attendre et capturer
 */
export async function waitAndCapture(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  name: string
) {
  await page.waitForSelector(selector, {
    state: 'visible',
    timeout: 30000
  })

  return await takeOrganizedScreenshot(page, testInfo, name)
}

/**
 * Helper pour les tests multi-rôles
 */
export async function testAllRoles(
  testFn: (page: Page, role: string) => Promise<void>
) {
  const roles = ['admin', 'gestionnaire', 'prestataire', 'locataire'] as const

  for (const role of roles) {
    await test(`Test for ${role}`, async ({ page }) => {
      await loginAsRole(page, role)
      await testFn(page, role)
    })
  }
}

/**
 * Helper pour capturer les erreurs
 */
export async function captureOnError(
  page: Page,
  testInfo: TestInfo
) {
  page.on('pageerror', async (error) => {
    console.error(`Page error: ${error.message}`)
    await takeOrganizedScreenshot(page, testInfo, `error-${Date.now()}`)
  })

  page.on('console', async (msg) => {
    if (msg.type() === 'error') {
      console.error(`Console error: ${msg.text()}`)
      await takeOrganizedScreenshot(page, testInfo, `console-error-${Date.now()}`)
    }
  })
}

/**
 * Helper pour nettoyer après test
 */
export async function cleanupAfterTest(page: Page) {
  // Clear cookies
  await page.context().clearCookies()

  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Clear cache si possible
  await page.context().clearPermissions()
}

/**
 * Helpers pour les assertions communes
 */
export const assertions = {
  async isLoggedIn(page: Page) {
    await expect(page).toHaveURL(/\/dashboard\/.+/)
    const logoutButton = page.locator('button:has-text("Déconnexion")')
    await expect(logoutButton).toBeVisible()
  },

  async hasRole(page: Page, role: string) {
    const roleIndicator = page.locator(`[data-role="${role}"]`)
    await expect(roleIndicator).toBeVisible()
  },

  async hasNotification(page: Page, text: string) {
    const notification = page.locator('.notification', { hasText: text })
    await expect(notification).toBeVisible()
  }
}

/**
 * Configuration par défaut pour les tests
 */
export const defaultTestConfig = {
  timeout: 60000,
  retries: 1,
  screenshot: 'on',
  video: 'on',
  trace: 'on'
}

/**
 * Export des types utiles
 */
export type { ScreenshotHelper } from '../helpers/screenshot-helper'
export type { UserRole } from '../helpers/media-organization-helper'