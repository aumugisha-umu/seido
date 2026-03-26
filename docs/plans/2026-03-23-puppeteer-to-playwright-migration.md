# Migration E2E: Puppeteer → Playwright + Shared POMs

## Context

SEIDO uses two browser automation frameworks:
- **Puppeteer** (E2E tests): 11 test files, 8 POMs, Vitest runner, sequential execution
- **Playwright** (QA Bot): 8 guided specs (114 tests), 11 POMs, native sharding, CI pipeline

Both do browser automation against a live app. Puppeteer tests accumulate workarounds (robustClick, manual cookie chunking, waitForFunction polling) that Playwright solves natively (auto-wait, storageState, web-first assertions).

**Decision:** Migrate E2E from Puppeteer → Playwright. Keep QA Bot (autonomous AI explorer is unique). Share POMs.

## Architecture (After)

```
tests/
  shared/
    pages/              <- Unified Playwright POMs (13 page objects)
    helpers/            <- Shared selectors, constants
    fixtures/           <- Test accounts
  e2e/
    playwright.config.ts <- New E2E config (role-based projects, storageState)
    setup/
      auth.setup.ts     <- Adapted from qa-bot/setup/
    specs/              <- All regression specs (.spec.ts)
  qa-bot/
    playwright.config.ts <- Keeps own config (blob reporter, CI sharding)
    autonomous/         <- AI explorer + anomaly detector (UNCHANGED)
    reporting/          <- Telegram, GitHub, reports (UNCHANGED)
    guided/             <- Imports from shared/pages/
  integration/          <- Vitest, unchanged
  unit/                 <- Vitest, unchanged
```

## Stories

### Story 1: Create shared POM layer
**Files:** `tests/shared/pages/*.page.ts`, `tests/shared/helpers/`, `tests/shared/fixtures/`

1. Create `tests/shared/pages/` directory
2. Copy QA Bot POMs as base (they're already Playwright):
   - `dashboard.page.ts`, `building-wizard.page.ts`, `lot-wizard.page.ts`
   - `contract-wizard.page.ts`, `intervention-wizard.page.ts`, `intervention-detail.page.ts`
   - `billing.page.ts`, `mail-hub.page.ts`, `notifications.page.ts`
   - `reminder-wizard.page.ts`, `reminder-detail.page.ts`
3. Port unique methods from Puppeteer POMs into shared POMs:
   - `intervention-request.page.ts` (locataire flow) — new, from Puppeteer only
   - `login.page.ts` — not needed (auth.setup.ts replaces it)
4. Move `tests/e2e/fixtures/test-accounts.ts` → `tests/shared/fixtures/`
5. Merge `tests/e2e/helpers/selectors.ts` + `tests/qa-bot/helpers/selectors.ts` → `tests/shared/helpers/selectors.ts`
6. Update QA Bot imports to use `../../shared/pages/` — verify guided specs still pass

**Acceptance:** `npx playwright test --config tests/qa-bot/playwright.config.ts` passes with shared POMs.

### Story 2: Create E2E Playwright config + auth setup
**Files:** `tests/e2e/playwright.config.ts`, `tests/e2e/setup/auth.setup.ts`

1. Create `tests/e2e/playwright.config.ts`:
   - 4 projects: setup, gestionnaire, locataire, prestataire
   - `storageState` per role (same pattern as qa-bot)
   - `baseURL` from env or localhost:3000
   - `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`
   - `testDir: './specs'`
2. Create `tests/e2e/setup/auth.setup.ts`:
   - Adapt from `tests/qa-bot/setup/auth.setup.ts`
   - Login 3 roles, save storageState to `playwright/.auth/`
3. Update `package.json` scripts:
   - `test:e2e` → `npx playwright test --config tests/e2e/playwright.config.ts`
   - `test:e2e:headed` → add `--headed`
   - `test:e2e:debug` → add `--debug`

**Acceptance:** `npm run test:e2e` runs Playwright (even with 0 specs).

### Story 3: Rewrite unique Puppeteer tests as Playwright specs
**Files:** `tests/e2e/specs/*.spec.ts`

Tests to rewrite (no QA Bot equivalent):
1. `intervention-locataire.e2e.ts` → `tests/e2e/specs/intervention-locataire.spec.ts`
2. `intervention-workflow.e2e.ts` → `tests/e2e/specs/intervention-workflow.spec.ts`
3. `stripe/checkout-flow.e2e.ts` → `tests/e2e/specs/stripe-checkout.spec.ts`
4. `stripe/read-only-enforcement.e2e.ts` → `tests/e2e/specs/stripe-readonly.spec.ts`

Translation patterns:
- `page.waitForSelector('.btn')` → `page.locator('.btn')` (auto-waits)
- `page.$eval('#el', el => el.textContent)` → `page.locator('#el').textContent()`
- `page.evaluate(() => el.click())` → `page.locator(...).click()`
- `page.setCookie(...)` → `storageState` (zero code)
- Vitest `expect(x).toBe(y)` → Playwright `expect(locator).toHaveText(y)` (auto-retry)

**Acceptance:** 4 specs pass with `npm run test:e2e`.

### Story 4: Merge overlapping tests into QA Bot specs
**Files:** QA Bot guided specs (update only)

Puppeteer tests with QA Bot equivalents — port unique assertions:
1. `intervention-gestionnaire.e2e.ts` → merge into `intervention-lifecycle.spec.ts`
2. `stripe/billing-ui.e2e.ts` → merge into `billing-settings.spec.ts`
3. `intervention-lifecycle.e2e.ts` → verify covered, drop

**Acceptance:** QA Bot guided specs pass with merged assertions.

### Story 5: Cleanup Puppeteer
**Files:** Delete 20+ files, update package.json

1. Delete Puppeteer infrastructure:
   - `tests/e2e/helpers/browser.ts` (Puppeteer browser management)
   - `tests/e2e/helpers/auth.ts` (cookie chunking)
   - `tests/e2e/helpers/cookies.ts` (Supabase cookie parsing)
   - `tests/e2e/setup/global-setup.ts` (Puppeteer login)
   - `tests/e2e/setup/global-teardown.ts`
   - `tests/e2e/vitest.e2e.config.ts`
2. Delete migrated Puppeteer test files (11 `.e2e.ts` files)
3. Delete Puppeteer POM files (`tests/e2e/pages/`)
4. `npm uninstall puppeteer`
5. Remove Puppeteer-specific entries from AGENTS.md / memory (optional)
6. Update CLAUDE.md E2E commands section

**Acceptance:** `npm ls puppeteer` shows "empty", `npm run test:e2e` runs Playwright, `npm run test:qa-bot` still passes.

### Story 6: Update documentation
**Files:** CLAUDE.md, discovery-tree, memory

1. Update CLAUDE.md Development Commands section
2. Update `docs/qa/discovery-tree.json` if test paths changed
3. Update memory: E2E testing patterns section
4. Run `npx tsx scripts/generate-discovery-tree.ts`

**Acceptance:** Documentation reflects new test architecture.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Puppeteer POM has methods not in Playwright POM | Story 1 explicitly ports unique methods |
| Auth setup differences | Both use Supabase SSR cookies; Playwright's `storageState` is simpler |
| QA Bot CI pipeline breaks | Story 1 verifies QA Bot still works before proceeding |
| Stripe tests need special setup | Rewrite preserves test logic, only changes browser API |

## Dependencies

- Playwright already installed (`@playwright/test@^1.58.2`)
- Puppeteer can be removed after Story 5
- No database or API changes needed
