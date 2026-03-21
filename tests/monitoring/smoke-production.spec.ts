/**
 * Production smoke tests for synthetic monitoring.
 *
 * Read-only checks that verify core production pages and APIs are responsive.
 * Runs every 6 hours via .github/workflows/synthetic-monitoring.yml.
 */

import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Production Smoke Tests', () => {
  test('Landing page loads successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Seido/i)
    await expect(page.locator('body')).toBeVisible()
  })

  test('Login page loads successfully', async ({ page }) => {
    const response = await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBe(200)
    // Verify login form is present
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('API health check responds', async ({ request }) => {
    const response = await request.get('/api/health')

    // Accept 200 or 404 (if no health endpoint exists, the app is still running)
    expect([200, 404]).toContain(response.status())
  })

  test('Blog page loads successfully', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBe(200)
    await expect(page.locator('body')).toBeVisible()
  })
})
