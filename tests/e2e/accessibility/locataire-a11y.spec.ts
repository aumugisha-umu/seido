/**
 * Accessibility tests for locataire pages.
 * @tags @a11y
 */

import { test, expect } from '../fixtures/accessibility.fixture'
import { AUTH_FILES } from '../setup/auth.setup'

test.use({ storageState: AUTH_FILES.locataire })

const LOCATAIRE_PAGES = [
  { name: 'Dashboard', path: '/locataire/dashboard' },
  { name: 'Interventions', path: '/locataire/interventions' },
  { name: 'Documents', path: '/locataire/documents' },
  { name: 'Profile', path: '/locataire/profile' },
]

for (const { name, path } of LOCATAIRE_PAGES) {
  test(`@a11y Locataire ${name} page should have no WCAG 2.1 AA violations`, async ({
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
