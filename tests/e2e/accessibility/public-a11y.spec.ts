/**
 * Accessibility tests for public (unauthenticated) pages.
 * @tags @a11y
 */

import { test, expect } from '../fixtures/accessibility.fixture'

test.use({ storageState: { cookies: [], origins: [] } })

const PUBLIC_PAGES = [
  { name: 'Landing', path: '/' },
  { name: 'Login', path: '/auth/login' },
  { name: 'Blog', path: '/blog' },
  { name: 'Pricing', path: '/pricing' },
]

for (const { name, path } of PUBLIC_PAGES) {
  test(`@a11y Public ${name} page should have no WCAG 2.1 AA violations`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.goto(path, { waitUntil: 'networkidle' })

    const results = await makeAxeBuilder(page).analyze()

    await test.info().attach('a11y-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    })

    expect(
      results.violations,
      `Found ${results.violations.length} accessibility violation(s) on ${name}`,
    ).toHaveLength(0)
  })
}
