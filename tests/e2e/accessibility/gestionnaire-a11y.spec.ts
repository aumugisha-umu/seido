/**
 * Accessibility tests for gestionnaire pages.
 * @tags @a11y
 */

import { test, expect } from '../fixtures/accessibility.fixture'
import { AUTH_FILES } from '../setup/auth.setup'

test.use({ storageState: AUTH_FILES.gestionnaire })

const GESTIONNAIRE_PAGES = [
  { name: 'Dashboard', path: '/gestionnaire/dashboard' },
  { name: 'Buildings', path: '/gestionnaire/biens' },
  { name: 'Interventions', path: '/gestionnaire/interventions' },
  { name: 'Contacts', path: '/gestionnaire/contacts' },
  { name: 'Settings', path: '/gestionnaire/settings' },
  { name: 'Billing', path: '/gestionnaire/settings/billing' },
  { name: 'Team', path: '/gestionnaire/settings/team' },
  { name: 'Email', path: '/gestionnaire/email' },
]

for (const { name, path } of GESTIONNAIRE_PAGES) {
  test(`@a11y Gestionnaire ${name} page should have no WCAG 2.1 AA violations`, async ({
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
