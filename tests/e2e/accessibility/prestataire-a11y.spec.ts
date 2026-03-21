/**
 * Accessibility tests for prestataire pages.
 * @tags @a11y
 */

import { test, expect } from '../fixtures/accessibility.fixture'
import { AUTH_FILES } from '../setup/auth.setup'

test.use({ storageState: AUTH_FILES.prestataire })

const PRESTATAIRE_PAGES = [
  { name: 'Dashboard', path: '/prestataire/dashboard' },
  { name: 'Interventions', path: '/prestataire/interventions' },
  { name: 'Profile', path: '/prestataire/profile' },
]

for (const { name, path } of PRESTATAIRE_PAGES) {
  test(`@a11y Prestataire ${name} page should have no WCAG 2.1 AA violations`, async ({
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
