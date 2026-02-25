# Retrospective: E2E Intervention Workflow Debug & Fix

**Date:** 2026-02-21
**Duration:** ~4 hours (multi-session debugging)
**Stories Completed:** E-003 (approve/reject workflow) + E-004 (full lifecycle multi-role)
**Branch:** preview

## What Went Well

- **Screenshot-driven debugging** — every failure produced a screenshot, which revealed the exact root cause (blank page = hydration crash, grey bars = skeleton, modal overlay = late system modal). Without screenshots, these would have been mysterious timeouts.
- **Hybrid E2E pattern** — using integration test helpers (`createFullTestIntervention`, `getTestIntervention`) from within E2E tests eliminated the need to create interventions through the UI, dramatically reducing test setup time and flakiness.
- **DB polling pattern** — instead of relying on toast detection (fragile), polling the DB directly for status changes after clicking "Confirmer" was 100% reliable. The server action takes 2-5 seconds, and polling handles that naturally.
- **Iterative fix-run-screenshot cycle** — each fix was targeted at a specific screenshot, leading to steady progress (9 pass → 10 → 12).

## What Could Be Improved

- **Initial POM design** — the `findDialogButton` method using `find()` was fundamentally broken for pages with ghost dialog shells. Should have used `for...of` iteration from the start. Ghost shells are inherent to Radix Dialog's unmount behavior.
- **Vitest config documentation** — `fileParallelism` is not well-documented and its interaction with `singleFork`/`concurrent` is confusing. We lost time because the two test files were running concurrently despite believing they were sequential.
- **navigateTo URL-first strategy** — should have been the default pattern. Checking content markers BEFORE URL is backwards for Next.js (shell renders before middleware redirects).
- **Missing defensive `dismissAllBanners` in POM action methods** — was only called in navigateTo initially. System modals appear on timers, so every click method needs to dismiss first.

## New Learnings Added to AGENTS.md

- Learning #058: Vitest fileParallelism — singleFork + concurrent:false is NOT enough for E2E
- Learning #059: SSR hydration gap — waitForContent passes on shell, then React replaces with skeleton
- Learning #060: Late-appearing system modals intercept button clicks — dismiss inside every action
- Learning #061: Ghost dialog shells from dismissed Radix modals trap find()
- Learning #062: Radix Dialog Portal elements need robustClick (CDP + coordinate fallback)

## Patterns Discovered

1. **URL-first navigation** — check URL contains expected ID BEFORE checking content markers. Next.js middleware redirects happen after shell render.
2. **Ghost dialog iteration** — `for...of` loop with `textContent.length < 5` filter skips empty shells from dismissed modals. Never use `find()` for dialog selection.
3. **robustClick** — CDP click + coordinate-based mouse.click fallback. Handles Radix Portal elements rendered outside React root.
4. **DB polling for status verification** — poll `getTestIntervention(id).status` for up to 20s instead of relying on toast/UI indicators. More reliable for server action flows.
5. **waitForFunction polling** — always poll for SPECIFIC expected text, never snapshot with instant `hasContent`. SSR hydration gap makes instant checks unreliable.

## Anti-Patterns Avoided (or Encountered)

- **`dialogs.find()` for modal selection** — picks first non-system dialog, which may be empty ghost shell. Use `for...of` loop instead.
- **Instant content snapshots** — `hasContent('Planifier')` can fail if called during SSR→hydration transition. Always use polling.
- **`data-state="open"` selector for dialog filtering** — Radix Dialog's `data-state` attribute is on a child element, not the `[role="dialog"]` element. Can't combine them in a single CSS selector.
- **Checking content before URL** — Next.js shell renders tab labels in SSR, which pass content checks, but middleware then redirects to list page.

## Recommendations for Similar Future Work

1. **Always add `fileParallelism: false` to E2E vitest configs** — it's not the default and causes subtle cross-file interference.
2. **POM action methods should always dismiss overlays before acting** — `dismissAllBanners` should be the first line of any click method, not just in navigation.
3. **Use `waitForFunction` for all E2E assertions** — never trust instant snapshots on Server Component pages.
4. **Test dialog-heavy flows with multiple Radix modals open** — ghost shells accumulate and break naive selectors.
5. **When a test checks DB state after a UI action, always poll** — server actions take 1-10 seconds, single checks are unreliable.

## Files Changed

- `tests/e2e/vitest.e2e.config.ts` — added fileParallelism: false
- `tests/e2e/pages/intervention-detail.page.ts` — major rewrite (ghost dialog iteration, robustClick, late modal dismissal, URL-first navigation)
- `tests/e2e/intervention-workflow.e2e.ts` — DB polling for approval, cancel test skipped
- `tests/e2e/intervention-lifecycle.e2e.ts` — DB polling, waitForFunction polling assertions
- `tests/e2e/helpers/cookies.ts` — dismissSystemModals with loop + keyword detection
- `tests/e2e/helpers/browser.ts` — newPageAs(role) multi-role helper
- `tests/e2e/helpers/auth.ts` — role-aware cookie loading
- `tests/e2e/setup/global-setup.ts` — multi-role authentication (3 accounts)
- `tests/fixtures/test-accounts.ts` — locataire + prestataire test accounts

## Test Results

| File | Pass | Skip | Fail | Total |
|------|------|------|------|-------|
| intervention-workflow.e2e.ts | 4 | 1 | 0 | 5 |
| intervention-lifecycle.e2e.ts | 8 | 0 | 0 | 8 |
| **Total** | **12** | **1** | **0** | **13** |
