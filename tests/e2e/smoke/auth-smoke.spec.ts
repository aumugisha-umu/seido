/**
 * Smoke tests — Couche 1
 *
 * Validates core infrastructure: auth, dashboards, public pages, API health.
 * Runs on every push. Must complete in < 2 minutes.
 *
 * Tag: @smoke
 * Auth: Uses storageState (no UI login).
 * Data: Read-only (no mutations).
 */

import { test, expect } from '@playwright/test'
import { AUTH_FILES } from '../setup/auth.setup'

test.describe('@smoke Auth & Navigation', () => {
  test('gestionnaire can reach dashboard', async ({ page }) => {
    await page.goto('/gestionnaire/dashboard')
    await expect(page).toHaveURL(/gestionnaire/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 })
  })

  test('gestionnaire can navigate to biens', async ({ page }) => {
    await page.goto('/gestionnaire/biens')
    await expect(page).toHaveURL(/biens/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  })

  test('gestionnaire can navigate to interventions', async ({ page }) => {
    await page.goto('/gestionnaire/interventions')
    await expect(page).toHaveURL(/interventions/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  })

  test('gestionnaire can navigate to building wizard', async ({ page }) => {
    await page.goto('/gestionnaire/biens/immeubles/nouveau')
    await expect(page.getByText(/ajouter un immeuble/i)).toBeVisible({ timeout: 30_000 })
  })

  test('gestionnaire can navigate to lot wizard', async ({ page }) => {
    await page.goto('/gestionnaire/biens/lots/nouveau')
    await expect(page.getByText(/ajouter un nouveau lot/i)).toBeVisible({ timeout: 30_000 })
  })
})

test.describe('@smoke Prestataire', () => {
  test.use({ storageState: AUTH_FILES.prestataire })

  test('prestataire can reach dashboard', async ({ page }) => {
    await page.goto('/prestataire/dashboard')
    await expect(page).toHaveURL(/prestataire/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 })
  })
})

test.describe('@smoke Locataire', () => {
  test.use({ storageState: AUTH_FILES.locataire })

  test('locataire can reach dashboard', async ({ page }) => {
    await page.goto('/locataire/dashboard')
    await expect(page).toHaveURL(/locataire/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 })
  })
})

test.describe('@smoke Public Pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('landing page loads', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/SEIDO/i)
  })

  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(
      page.getByRole('button', { name: /connexion|se connecter/i }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('blog is accessible', async ({ page }) => {
    const response = await page.goto('/blog')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('@smoke API Health', () => {
  test('health endpoint responds 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })
})
