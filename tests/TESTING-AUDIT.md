# SEIDO Testing Infrastructure — Comprehensive Audit & Strategy

> **Date**: 2026-02-20
> **Scope**: Full audit of all test-related files, configs, documentation, and dependencies
> **Goal**: Clean up, centralize, and implement proper testing infrastructure
> **Next Step**: Feed this into Ralph methodology for PRD + user stories

---

## 1. Current State Summary

### The Big Picture

| Category | Status | Details |
|----------|--------|---------|
| **Automated Unit Tests** | ZERO | No `.test.ts` or `.test.tsx` files in app source |
| **E2E Tests** | 1 file (WIP) | `tests/e2e/smoke.e2e.ts` — 5 tests, 3-4 passing |
| **Storybook Stories** | 13 files | All in `components/interventions/shared/` only |
| **QA Documentation** | 25 files, 750+ test cases | Manual checklists, Gherkin scenarios (not automated) |
| **Test Configs** | 2 Vitest configs | Root `vitest.config.ts` (unit, empty) + `tests/e2e/vitest.e2e.config.ts` |
| **Test Infrastructure** | Partial | Puppeteer helpers created, but login flow needed fixing |

**Verdict**: SEIDO has **extensive test documentation** but **zero test automation**. The QA docs describe 750+ test scenarios that have never been automated.

---

## 2. File Inventory

### 2.1 Test Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `vitest.config.ts` | Root unit test config | Functional but unused (no test files to run) |
| `tests/e2e/vitest.e2e.config.ts` | E2E test config for Puppeteer | Functional, created 2026-02-20 |
| `.storybook/main.ts` | Storybook config (nextjs-vite) | Functional |
| `.storybook/preview.ts` | Storybook preview with globals.css | Functional |
| `lighthouserc.js` | Lighthouse CI config (3 URLs, perf thresholds) | Functional |

### 2.2 E2E Test Files (tests/e2e/)

| File | Purpose | Status |
|------|---------|--------|
| `smoke.e2e.ts` | Smoke test — login, dashboard, navigation | 3-4/5 passing |
| `helpers/auth.ts` | Login helper (Puppeteer) | Fixed for SEIDO's useActionState redirect |
| `helpers/browser.ts` | Browser launch/management | Functional |
| `helpers/selectors.ts` | UI interaction helpers (forms, toasts, wizard) | Created, untested |
| `fixtures/test-accounts.ts` | Credentials + base URLs | Functional |
| `screenshots/` | Failure screenshots | Auto-generated on test failure |

### 2.3 Storybook Stories (13 files)

All located in `components/interventions/shared/`:

| File | Component |
|------|-----------|
| `atoms/participant-avatar.stories.tsx` | ParticipantAvatar |
| `atoms/message-bubble.stories.tsx` | MessageBubble |
| `atoms/time-slot-card.stories.tsx` | TimeSlotCard |
| `atoms/document-item.stories.tsx` | DocumentItem |
| `cards/planning-card.stories.tsx` | PlanningCard |
| `cards/intervention-details-card.stories.tsx` | InterventionDetailsCard |
| `cards/summary-card.stories.tsx` | SummaryCard |
| `cards/comments-card.stories.tsx` | CommentsCard |
| `cards/documents-card.stories.tsx` | DocumentsCard |
| `cards/conversation-card.stories.tsx` | ConversationCard |
| `cards/quotes-card.stories.tsx` | QuotesCard |
| `layout/preview-hybrid-layout.stories.tsx` | PreviewHybridLayout |

**Coverage**: Only intervention detail page components have stories. 350+ other components have none.

### 2.4 QA Documentation (docs/testing/QA/)

| File | Content | Tests |
|------|---------|-------|
| `00-plan-test-qa-complet.md` | Methodology (ISO 29119, ISTQB, Test Pyramid) | — |
| `01-checklist-fonctionnel.md` | Functional checklist (65 pages) | ~200+ |
| `02-checklist-design-system.md` | Visual consistency | ~50 |
| `03-checklist-accessibilite.md` | WCAG 2.1 AA | ~30 |
| `04-checklist-securite.md` | OWASP Top 10, RLS | ~40 |
| `05-checklist-performance.md` | Core Web Vitals, Lighthouse | ~20 |
| `06-parcours-gestionnaire.md` | E2E Gestionnaire (Gherkin) | 48 scenarios |
| `07-parcours-prestataire.md` | E2E Prestataire (Gherkin) | 47 scenarios |
| `08-parcours-locataire.md` | E2E Locataire (Gherkin) | 39 scenarios |
| `10-parcours-proprietaire.md` | E2E Proprietaire (Gherkin) | 32 scenarios |
| `17-parcours-admin.md` | E2E Admin (Gherkin) | 28 scenarios |
| `19-parcours-email.md` | E2E Email (Gherkin) | 32 scenarios |
| `11-donnees-test.md` | Test data, accounts, fixtures | — |
| `12-glossaire.md` | Terminology, status mappings | — |
| `13-matrice-couverture.md` | Coverage matrix (auto vs manual) | — |
| `14-cas-negatifs.md` | Negative test cases | 157 |
| `15-baselines-performance.md` | Core Web Vitals baselines | — |
| `16-regression-rapide.md` | Quick regression (20 critical tests) | 20 |
| `18-checklist-pwa.md` | PWA tests | 44 |
| `20-checklist-realtime.md` | WebSocket/real-time tests | 74 |
| `21-matrice-tracabilite.md` | Requirements traceability | 45 |
| `09-template-bug-report.md` | Bug report template | — |
| `templates/*.md` | Test case templates (3 files) | — |
| `README.md` | QA documentation index | — |

### 2.5 Other Testing-Related Files

| File | Purpose | Status |
|------|---------|--------|
| `docs/testing/test-auth-flow.md` | Auth flow test documentation | Outdated (describes old redirect pattern) |
| `docs/testing/test-signup-fix.md` | Signup fix verification | Historical reference |
| `docs/refacto/05-metriques-tests.md` | Test metrics planning | Planning doc only |
| `docs/refacto/HELPERS-GUIDE.md` | E2E helpers guide (mentioned in CLAUDE.md) | May not exist |

### 2.6 Package.json Test Scripts

```json
"test": "vitest run",                    // Unit tests (nothing to run)
"test:watch": "vitest",                  // Watch mode
"test:coverage": "vitest run --coverage", // Coverage report
"test:ui": "vitest --ui",               // Vitest UI
"test:e2e": "vitest run --config tests/e2e/vitest.e2e.config.ts",
"test:e2e:preview": "cmd /c \"set VITEST_MODE=preview && vitest run --config tests/e2e/vitest.e2e.config.ts\"",
"test:e2e:headed": "cmd /c \"set E2E_HEADLESS=false && vitest run --config tests/e2e/vitest.e2e.config.ts\"",
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

### 2.7 Test Dependencies (devDependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.0.13 | Test runner (unit + E2E) |
| `@vitest/coverage-v8` | ^4.0.13 | Code coverage |
| `@vitest/ui` | ^4.0.13 | Visual test UI |
| `puppeteer` | ^24.22.3 | Browser automation (E2E) |
| `@faker-js/faker` | ^10.1.0 | Test data generation |
| `storybook` | ^10.1.2 | Component stories |
| `@storybook/nextjs-vite` | ^10.1.2 | Next.js + Vite integration |
| `@storybook/addon-a11y` | ^10.1.2 | Accessibility addon |
| `@storybook/addon-docs` | ^10.1.2 | Documentation addon |
| `@storybook/addon-onboarding` | ^10.1.2 | Onboarding addon |
| `@lhci/cli` | ^0.15.1 | Lighthouse CI |
| `lighthouse` | ^12.0.0 | Performance testing |
| `vite-tsconfig-paths` | ^5.1.4 | Path aliases in Vitest |

---

## 3. Key Problems Identified

### 3.1 Zero Automated Tests
- 750+ documented test cases exist as manual checklists
- Not a single automated test file (`*.test.ts`) in the source code
- The Vitest unit config runs but finds nothing

### 3.2 Scattered Test Configuration
- Root `vitest.config.ts` for unit tests (empty pipeline)
- `tests/e2e/vitest.e2e.config.ts` for E2E tests
- `.storybook/` for component stories
- `lighthouserc.js` or similar may exist (Lighthouse CI configured in package.json)
- No centralized test strategy or shared setup

### 3.3 QA Docs Disconnected from Code
- `docs/testing/QA/` has 226 Gherkin scenarios but none are automated
- Test data documented in `11-donnees-test.md` uses different credentials than `tests/e2e/fixtures/test-accounts.ts`
- The `docs/testing/test-auth-flow.md` describes an old auth pattern that's been reverted

### 3.4 E2E Infrastructure Incomplete
- Login helper fixed but building creation page test still fails (skeleton timeout)
- No Page Object Model pattern
- Cookie consent banner blocks interactions
- `test:e2e:headed` script doesn't work on Windows (env var not propagated)

### 3.5 Storybook Minimal Coverage
- Only 13 stories out of 365+ components
- All stories are in one domain (intervention detail)
- No interaction tests in stories
- No visual regression testing

### 3.6 No CI/CD Test Pipeline
- No GitHub Actions workflow for tests
- No pre-commit hooks running tests
- No test gates on PRs

---

## 4. SEIDO-Specific Testing Challenges

### 4.1 Authentication Pattern
SEIDO uses React 19's `useActionState` + server actions for login. The login flow:
1. Form submits via server action (no page reload)
2. Server action returns `{ success: true, data: { redirectTo: '/gestionnaire/dashboard' } }`
3. Client-side `useEffect` fires `window.location.href = redirectTo` after 100ms

**E2E Implication**: Cannot use `waitForNavigation` — must use `waitForFunction` polling URL changes.

### 4.2 Server Components + Streaming
- Many pages use `loading.tsx` skeletons while server components fetch data
- `domcontentloaded` fires during skeleton, not after data loads
- Page content only appears after async server-side data fetching completes
- In dev mode, cold fetches can take 10-30s

**E2E Implication**: Must wait for specific content markers (form labels, text) not generic DOM readiness.

### 4.3 Multi-Role Architecture
- 5 roles: admin, gestionnaire (70%), prestataire (75% mobile), locataire, proprietaire
- Each role has different routes, RLS policies, and UI
- Tests must cover cross-role interactions (e.g., gestionnaire assigns prestataire)

### 4.4 Supabase RLS
- 165 migrations with complex RLS policies
- Silent failures when RLS blocks writes (no error, empty data)
- Multi-team users can access data across teams

### 4.5 Real-Time Features
- WebSocket subscriptions for notifications, chat
- `networkidle2` never fires on pages with persistent connections
- Must handle real-time state in E2E tests

### 4.6 Cookie Consent Banner
- Appears on every page for non-returning users
- Overlays content and can intercept clicks
- Must be dismissed in E2E tests before interactions

---

## 5. Best Practices Reference

### 5.1 Testing Pyramid for SEIDO

```
           ┌──────────┐
           │   E2E    │  5-10% — Critical paths only
           │ Puppeteer│  (login, creation wizards, role switching)
           ├──────────┤
           │ Integr.  │  20-30% — Server actions, API routes
           │ Vitest   │  (auth, CRUD operations, RLS validation)
           ├──────────┤
           │          │
           │  Unit    │  60-70% — Pure functions, utilities, hooks
           │ Vitest   │  (date calc, validation, state logic)
           └──────────┘
```

### 5.2 Puppeteer E2E Best Practices (2026)

1. **Use Page Object Model (POM)**: Encapsulate page-specific selectors and actions
2. **Prefer data attributes**: Use `data-testid` instead of CSS classes for selectors
3. **Wait for content, not network**: Use `waitForFunction` with content markers
4. **Handle cookies/banners**: Dismiss consent banners in `beforeAll`
5. **Screenshot on failure**: Always capture screenshots for debugging
6. **Use `networkidle0` sparingly**: Pages with WebSocket never reach idle
7. **Sequential execution**: E2E tests share browser state, run sequentially

### 5.3 Vitest Configuration Best Practices

1. **Separate configs**: Unit tests (root) vs E2E tests (tests/e2e/)
2. **Mock external services**: Use `vi.mock()` for Supabase, email, push notifications
3. **Test server actions**: Import and call directly with mocked Supabase client
4. **Use setup files**: Shared mocks and utilities in `tests/setup.ts`

### 5.4 Next.js 15 Testing Recommendations

1. **Server Components**: Test via E2E or by extracting logic into testable utilities
2. **Server Actions**: Import directly, mock dependencies, test return values
3. **Middleware**: Test via integration tests hitting actual routes
4. **App Router**: Use real navigation in E2E, mock router in unit tests

### 5.5 Supabase Testing Patterns

1. **Mock Supabase client**: Create factory that returns chainable mock methods
2. **Test RLS separately**: Use Supabase CLI local test database with different roles
3. **Seed test data**: Script to populate test database with known state
4. **Never test against production**: Always use local or preview environment

---

## 6. Proposed Clean Architecture

### 6.1 Directory Structure

```
tests/
├── TESTING-AUDIT.md              # This document (audit + strategy)
├── setup.ts                       # Global test setup (shared utilities)
├── fixtures/                      # Shared test data & credentials
│   ├── test-accounts.ts          # Real credentials (gestionnaire, etc.)
│   ├── known-entities.ts         # Known building/lot/intervention IDs from staging DB
│   └── test-helpers.ts           # Shared assertion helpers
├── e2e/                          # E2E browser tests (Puppeteer + Vitest)
│   ├── vitest.e2e.config.ts     # E2E-specific Vitest config
│   ├── helpers/                  # Puppeteer helpers
│   │   ├── auth.ts              # Login/logout (handles useActionState redirect)
│   │   ├── browser.ts           # Browser launch/management
│   │   ├── selectors.ts         # UI interaction helpers (forms, toasts, wizard)
│   │   └── cookies.ts           # Cookie consent banner dismissal
│   ├── pages/                   # Page Object Models (POM)
│   │   ├── login.page.ts        # Login page — selectors + actions
│   │   ├── dashboard.page.ts    # Dashboard — sidebar, topbar selectors
│   │   ├── building-wizard.page.ts # Building creation 5-step wizard
│   │   └── lot-wizard.page.ts   # Lot creation 5-step wizard
│   ├── smoke.e2e.ts             # Infrastructure validation (5 tests)
│   ├── auth.e2e.ts              # Login/logout/role flows
│   ├── building-creation.e2e.ts # Building wizard full E2E
│   ├── lot-creation.e2e.ts      # Lot wizard full E2E
│   ├── document-upload.e2e.ts   # Document staging + upload validation
│   ├── intervention-creation.e2e.ts # Intervention selection + creation
│   └── screenshots/             # Auto-generated failure screenshots
└── unit/                         # Unit tests (pure functions, no mocks needed)
    ├── lib/                      # Utility function tests (date-fns, transforms, validators)
    └── constants/                # Template/config validation tests
```

**Note**: No `mocks/` directory — all tests run against the **real staging database** with real credentials. No Supabase mocking.

### 6.2 Priority Order for Implementation

| Priority | Layer | Target | Estimated Tests |
|----------|-------|--------|----------------|
| P0 | E2E | Login + smoke tests passing | 5-10 |
| P0 | E2E | Building creation wizard (5 steps) | 8-12 |
| P0 | E2E | Lot creation wizard (5 steps) | 8-12 |
| P1 | Unit | Utility functions (date, validation, transforms) | 30-50 |
| P1 | Unit | Document upload hooks (single + multi-lot) | 10-15 |
| P1 | Integration | Server actions (auth, interventions, CRUD) | 15-20 |
| P2 | Unit | Service layer (intervention, property-document) | 20-30 |
| P2 | E2E | Contract creation wizard | 8-12 |
| P2 | Storybook | Core UI components (Button, Card, Form) | 20-30 |
| P3 | E2E | Cross-role flows (gestionnaire → prestataire) | 5-10 |
| P3 | Integration | RLS policy validation | 10-15 |
| P3 | E2E | Mobile viewport tests | 5-10 |

### 6.3 Cleanup Actions Needed

1. **Move test-accounts.ts** from `tests/e2e/fixtures/` to shared `tests/fixtures/`
2. **Consolidate QA docs**: Keep `docs/testing/QA/` as manual reference, don't duplicate
3. **Delete stale screenshots**: Clean `tests/e2e/screenshots/` debug images
4. **Fix Windows env var scripts**: `test:e2e:headed` uses `cmd /c` which is fragile
5. **Add cross-platform scripts**: Use `cross-env` package for env vars
6. **Add `data-testid` attributes**: To key UI elements for stable E2E selectors
7. **Create shared test setup**: `tests/setup.ts` with common mocks
8. **Align test credentials**: `test-accounts.ts` vs `docs/testing/QA/11-donnees-test.md`

---

## 7. Known Issues from This Session

### 7.1 Login Auth Helper (FIXED)
- **Problem**: `waitForNavigation` doesn't work with SEIDO's client-side redirect
- **Solution**: Use `waitForFunction(() => !window.location.href.includes('/auth/login'))`
- **File**: `tests/e2e/helpers/auth.ts`

### 7.2 Building Creation Page Skeleton Timeout (OPEN)
- **Problem**: Server component data fetching takes 10-30s in dev mode
- **Symptom**: `waitForFunction` times out waiting for form content markers
- **Root Cause**: Cold server-side data fetches (team members, lot counts, categories)
- **Workaround needed**: Either increase timeout to 45s+ or warm up the page first
- **Screenshot**: Shows skeleton still loading after 30s

### 7.3 Cookie Consent Banner Interference (PARTIAL FIX)
- **Problem**: "Nous utilisons des cookies" banner overlays page content
- **Partial fix**: `dismissCookieBanner()` helper clicks "Accepter tout"
- **Issue**: Cookie preference may not persist across `page.goto()` calls
- **Solution**: Accept cookies once and verify persistence

### 7.4 Windows `test:e2e:headed` Script (OPEN)
- **Problem**: `cmd /c "set E2E_HEADLESS=false && ..."` doesn't propagate env vars correctly
- **Solution**: Use `cross-env` package: `cross-env E2E_HEADLESS=false vitest run ...`

### 7.5 Multi-Lot Document Upload Bug (FIXED)
- **Problem**: `use-multi-lot-document-upload.ts` used camelCase field names (100% failure)
- **Solution**: Changed to snake_case (`lot_id`, `team_id`, `document_type`, `expiry_date`)
- **Also fixed**: Error propagation, document ID extraction, missing title field

---

## 8. References

### Official Documentation
- [Vitest Documentation](https://vitest.dev/) — Test runner
- [Puppeteer Documentation](https://pptr.dev/) — Browser automation
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing) — Official testing guide
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/local-development#testing) — Local testing
- [Storybook for Next.js](https://storybook.js.org/docs/get-started/frameworks/nextjs) — Component stories

### SEIDO Internal Docs
- `docs/testing/QA/README.md` — QA documentation index (750+ test cases)
- `docs/testing/QA/11-donnees-test.md` — Test accounts and data
- `docs/testing/QA/16-regression-rapide.md` — Quick regression (20 critical tests)
- `docs/testing/test-auth-flow.md` — Auth flow documentation (partially outdated)
- `AGENTS.md` — 46 learnings from development (testing-relevant patterns)

### Key Learnings from AGENTS.md
- `.single()` fails with multi-team users → use `.limit(1)` (#003)
- PostgREST nested relations fail silently with RLS → separate queries (#004)
- RLS upsert returns success even when blocked → check data length (#001)
- Push notification URLs must include role prefix (#006)
- Create conversation threads BEFORE assignments (#007)

---

## 9. Decision Log

| Decision | Rationale |
|----------|-----------|
| **NO MOCK DATA** | Tests run against real staging DB with real credentials. No Supabase mocks. |
| **Real credentials provided** | `arthur@seido-app.com` / `Wxcvbn123` (gestionnaire) — tests use live data |
| **Vitest over Jest** | Already installed, Vite-native, faster, better ESM support |
| **Puppeteer over Playwright** | Already installed (v24.22.3), Chrome 140 works |
| **Centralized tests/ directory** | Single location for all test types, easier to manage |
| **Page Object Model for E2E** | Encapsulate selectors, reduce duplication, easier maintenance |
| **data-testid for selectors** | Stable across CSS changes, explicit test intent |
| **Local-first testing** | Focus on localhost:3000 before Vercel preview |
| **Sequential E2E execution** | Tests share browser state, parallel would be flaky |

### Critical: No Mock Data Policy

All tests (E2E, integration, unit where applicable) run against the **real staging database**:
- **No Supabase client mocking** — tests hit the actual API
- **Real user credentials** — provided by the user, stored in `tests/fixtures/test-accounts.ts`
- **Real data validation** — tests verify actual buildings, lots, interventions exist in DB
- **Cleanup responsibility** — tests that create data should clean up after themselves (or use known test entities)
- **Environment**: `localhost:3000` connected to the Supabase staging project

This means:
- No need for `tests/mocks/` directory
- `tests/fixtures/` contains credentials and known entity IDs, not fake data
- Integration tests can directly import server actions and run against real Supabase
- E2E tests validate the full stack end-to-end with real data

---

## 10. Implementation Status (Post-Ralph)

**Date**: 2026-02-20 | **Methodology**: Ralph (11 stories)

### Completed Stories

| Story | Title | Status | Details |
|-------|-------|--------|---------|
| US-001 | Delete stale files | Done | Removed `tests-new/`, cleaned 8 screenshots |
| US-002 | Reorganize directory | Done | Created `tests/fixtures/`, `tests/e2e/pages/`, `tests/unit/` |
| US-003 | Install cross-env | Done | `cross-env@10.1.0`, fixed Windows scripts |
| US-004 | Extract cookie helper | Done | `cookies.ts`, `waitForContent()` in selectors.ts |
| US-005 | Page Object Models | Done | `LoginPage`, `DashboardPage` POMs |
| US-006 | Fix smoke tests | Blocked | Requires dev server running (code ready) |
| US-007 | Add data-testid | Done | 6 files modified, login/wizard/sidebar |
| US-008 | Building wizard E2E | Blocked | Depends on US-006 |
| US-009 | Lot wizard E2E | Blocked | Depends on US-006 |
| US-010 | Unit tests | Done | 51 tests (vat-validator, quote-status, intervention-location) |
| US-011 | Consolidate & docs | Done | Configs aligned, docs updated |

### Current Test Inventory

| Type | Files | Tests | Status |
|------|-------|-------|--------|
| Unit (new) | 3 | 51 | All passing |
| Unit (pre-existing) | 3 | 28 | 4 failures (stale expectations) |
| E2E smoke | 1 | 5 | Ready, needs dev server |
| Storybook | 13 | — | Unchanged |

### Files Created/Modified

**New files:**
- `tests/fixtures/test-accounts.ts` (shared credentials)
- `tests/fixtures/known-entities.ts` (routes + content markers)
- `tests/e2e/helpers/cookies.ts` (banner dismissal)
- `tests/e2e/pages/login.page.ts` (LoginPage POM)
- `tests/e2e/pages/dashboard.page.ts` (DashboardPage POM)
- `tests/unit/vat-validator.test.ts` (19 tests)
- `tests/unit/quote-status.test.ts` (24 tests)
- `tests/unit/intervention-location.test.ts` (8 tests)

**Modified files:**
- `tests/e2e/smoke.e2e.ts` (refactored to use POMs + helpers)
- `tests/e2e/helpers/auth.ts` (uses LoginPage POM)
- `tests/e2e/helpers/selectors.ts` (added waitForContent)
- `vitest.config.ts` (include tests/unit/, exclude tests/e2e/)
- `package.json` (cross-env scripts, cross-env devDep)
- `app/auth/login/login-form.tsx` (data-testid on inputs + submit)
- `components/ui/step-progress-header.tsx` (data-testid on steps)
- `components/gestionnaire-sidebar.tsx` (data-testid on nav links)
- `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/building-creation-form.tsx` (data-testid)
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` (data-testid)

**Deleted files:**
- `tests-new/` directory (stale Playwright tests)
- 8 debug screenshots from `tests/e2e/screenshots/`
