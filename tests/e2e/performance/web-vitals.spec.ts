/**
 * Performance tests measuring Core Web Vitals (FCP, LCP, CLS).
 * @tags @perf
 *
 * Uses browser Performance APIs to collect metrics and asserts
 * they are within budget thresholds.
 */

import { test, expect } from '@playwright/test'
import { AUTH_FILES } from '../setup/auth.setup'

interface PerformanceBudget {
  name: string
  path: string
  lcp: number
  fcp: number
  cls: number
  requiresAuth: boolean
}

const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { name: 'Landing', path: '/', lcp: 2000, fcp: 1500, cls: 0.1, requiresAuth: false },
  { name: 'Login', path: '/auth/login', lcp: 1500, fcp: 1000, cls: 0.05, requiresAuth: false },
  { name: 'Dashboard', path: '/gestionnaire/dashboard', lcp: 3000, fcp: 2000, cls: 0.15, requiresAuth: true },
  { name: 'Buildings', path: '/gestionnaire/biens', lcp: 2500, fcp: 1800, cls: 0.1, requiresAuth: true },
  { name: 'Interventions', path: '/gestionnaire/interventions', lcp: 2500, fcp: 1800, cls: 0.1, requiresAuth: true },
]

for (const budget of PERFORMANCE_BUDGETS) {
  test.describe(`@perf ${budget.name}`, () => {
    if (budget.requiresAuth) {
      test.use({ storageState: AUTH_FILES.gestionnaire })
    } else {
      test.use({ storageState: { cookies: [], origins: [] } })
    }

    test(`FCP should be under ${budget.fcp}ms`, async ({ page }) => {
      await page.goto(budget.path, { waitUntil: 'networkidle' })

      const fcp = await page.evaluate(() => {
        const entry = performance.getEntriesByName('first-contentful-paint')[0]
        return entry ? entry.startTime : null
      })

      expect(fcp, `FCP was not measured on ${budget.path}`).not.toBeNull()

      await test.info().attach('fcp-result', {
        body: JSON.stringify({ page: budget.path, fcp, budget: budget.fcp }),
        contentType: 'application/json',
      })

      expect(fcp!, `FCP ${fcp}ms exceeds budget of ${budget.fcp}ms`).toBeLessThanOrEqual(budget.fcp)
    })

    test(`LCP should be under ${budget.lcp}ms`, async ({ page }) => {
      // Set up LCP observer before navigation
      await page.addInitScript(() => {
        (window as unknown as Record<string, number>).__lcp = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1];
          (window as unknown as Record<string, number>).__lcp = last.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      })

      await page.goto(budget.path, { waitUntil: 'networkidle' })
      // Wait for LCP to stabilize
      await page.waitForTimeout(1000)

      const lcp = await page.evaluate(() => (window as unknown as Record<string, number>).__lcp)

      await test.info().attach('lcp-result', {
        body: JSON.stringify({ page: budget.path, lcp, budget: budget.lcp }),
        contentType: 'application/json',
      })

      expect(lcp, `LCP ${lcp}ms exceeds budget of ${budget.lcp}ms`).toBeLessThanOrEqual(budget.lcp)
    })

    test(`CLS should be under ${budget.cls}`, async ({ page }) => {
      // Set up CLS observer before navigation
      await page.addInitScript(() => {
        (window as unknown as Record<string, number>).__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
              (window as unknown as Record<string, number>).__cls += (entry as PerformanceEntry & { value: number }).value
            }
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })

      await page.goto(budget.path, { waitUntil: 'networkidle' })
      // Wait for layout to stabilize
      await page.waitForTimeout(2000)

      const cls = await page.evaluate(() => (window as unknown as Record<string, number>).__cls)

      await test.info().attach('cls-result', {
        body: JSON.stringify({ page: budget.path, cls, budget: budget.cls }),
        contentType: 'application/json',
      })

      expect(cls, `CLS ${cls} exceeds budget of ${budget.cls}`).toBeLessThanOrEqual(budget.cls)
    })
  })
}
