# Retrospective: QA Bot E2E Test Suite + Admin Invite + Email Enhancements

**Date:** 2026-03-21
**Duration:** ~1 session
**Branch:** preview
**Commit:** 3ccd8d22
**Scope:** 70 files changed, +13,088 / -444 lines

## What Went Well
- Playwright Page Object Model (POM) pattern scales well to 114 tests across 8 page objects
- Sharded test architecture (8 shards) enables parallel CI execution
- Semantic locators (`getByRole`, `getByTestId`, `getByLabel`) proved resilient across deploys
- Admin invite action reused existing patterns (after() for email, magiclink for password setting)
- cancelIntervention bug was caught early by E2E tests before reaching production

## What Could Be Improved
- Auth role mismatch (admin vs gestionnaire) wasted significant debugging time. E2E test user setup should be documented and verified before writing tests
- Vercel preview cold starts are unpredictable — a warm-up phase or health check endpoint would reduce flakiness
- Intervention auto-advancement (skipping "demande" to "planification") means tests can't assume a fixed starting status. Tests must detect current status before acting
- Contact wizard flow assumptions were wrong initially ("Personne physique" skips Societe step) — wizard flow documentation would help

## New Learnings Added to AGENTS.md
- Learning #164: requireRole('gestionnaire') rejects 'admin' role — DB role must match exactly
- Learning #165: cancelIntervention union type — callers may pass object or string
- Learning #166: Playwright POM selectors — prefer semantic over CSS class
- Learning #167: Vercel preview cold starts cause E2E race conditions — use test.slow()
- Learning #168: Radix tab panel scoping — scope assertions to active tabpanel

## Patterns Discovered
- **Sharded E2E architecture**: Split tests by domain (dashboard, interventions, contacts, etc.) into independent shards for parallel CI
- **Status-detection-first**: Before acting on an entity, detect its current state rather than assuming a fixed starting point
- **Warm-up navigation**: First test in suite navigates to dashboard to trigger cold start before real tests run
- **goToTab reliability**: Direct `getByRole('tab')` click is more reliable than waiting for `[data-state="active"]` panel changes

## Anti-Patterns Encountered
- **Assuming role hierarchy in requireRole()**: `admin` is NOT a superset of `gestionnaire` — strict equality check
- **CSS class selectors in E2E**: `.bg-red-500` breaks when styles change — always use semantic locators
- **Unscoped tab content assertions**: `getByText()` without tab panel scope matches elements in invisible inactive panels
- **Hardcoded status assumptions**: Intervention status depends on configuration (auto-advancement) — never assume "demande" is the starting status

## Recommendations for Similar Future Work
- Before writing E2E tests for a role: verify the test user's DB role matches exactly
- Always scope Radix Tabs assertions to `[role="tabpanel"][data-state="active"]`
- For Vercel preview targets: use `test.slow()` as default, not exception
- Document wizard flows (which steps are skipped based on selections) before writing wizard E2E tests
- When fixing service method signatures: check ALL callers for type mismatches, not just the one that failed

## Files Changed
- `tests/e2e/playwright/` — 8 page objects, 8 test shards, config
- `lib/services/domain/intervention.service.ts` — cancelIntervention union type fix
- `app/actions/user-admin-actions.ts` — inviteGestionnaireAction, resendGestionnaireInvitationAction
- `emails/templates/auth/admin-invitation.tsx` — new email template
- `lib/email/email-service.ts` — sendAdminInvitationEmail method
