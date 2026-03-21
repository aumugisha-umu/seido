/**
 * Shared axe-core accessibility fixture for SEIDO E2E tests.
 *
 * Provides a pre-configured AxeBuilder instance that:
 * - Targets WCAG 2.1 Level AA compliance
 * - Excludes third-party elements (Crisp chat, Stripe, etc.)
 */

import { test as base, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export interface AccessibilityFixtures {
  makeAxeBuilder: (page: Page) => AxeBuilder
}

export const test = base.extend<AccessibilityFixtures>({
  makeAxeBuilder: async ({}, use) => {
    const builder = (page: Page) =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#crisp-chatbox')
        .exclude('[data-stripe]')
        .exclude('iframe[src*="stripe"]')
        .exclude('iframe[src*="recaptcha"]')
        .exclude('[data-testid="third-party"]')

    await use(builder)
  },
})

export { expect } from '@playwright/test'
