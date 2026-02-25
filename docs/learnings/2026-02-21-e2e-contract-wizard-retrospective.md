# Retrospective: E2E Contract Wizard + Test Infrastructure Cleanup

**Date:** 2026-02-21
**Duration:** ~6 hours (across 2 sessions)
**Stories Completed:** 6/6 (unified docs bucket + E2E tests for all 3 wizards)
**Branch:** preview

## What Went Well

- **Page Object Model pattern** scales beautifully — contract-wizard.page.ts took 30 min to write because the pattern was already established in lot-wizard.page.ts and building-wizard.page.ts
- **API-based auth** in global-setup.ts eliminates browser login entirely — test setup is <2s
- **data-testid strategy** pays off: selectors resilient across i18n, view mode (card/list), and Radix rendering changes
- **Service role client** for storage solved the upload-route-blocks problem immediately once identified
- **Unified `documents` bucket** migration + RLS was clean — download routes already had `storage_bucket` column fallback, so zero changes needed for reads
- **generateUniqueStartDate()** with 2040-2060 range eliminates overlap conflicts permanently

## What Could Be Improved

- **Contract upload route was broken for weeks** — nobody noticed because there were no E2E tests. Highlights the value of E2E coverage for critical paths
- **useImperativeHandle ref timing** is a recurring pain point — 3 retry attempts needed. Consider switching to direct prop callbacks instead of imperative refs in new components
- **Debug output was too noisy** — requestfailed handler logged every ERR_ABORTED. Should have added noise filtering from the start
- **Console error serialization** (`JSHandle@error` → `.jsonValue()`) was non-obvious. Should be documented in test helpers

## New Learnings Added to AGENTS.md

- Learning #053: Storage uploads need service role client when RLS blocks user client
- Learning #054: useImperativeHandle ref timing — retry loop in E2E tests
- Learning #055: E2E toast verification — check success OR error to avoid blind timeouts
- Learning #056: E2E network noise — filter analytics, HMR, and ERR_ABORTED in requestfailed handler
- Learning #057: Cookie/PWA banners reappear on each page navigation — dismiss after EVERY goto

## Patterns Discovered

1. **Service role split pattern** — user client for auth/validation, service client for storage/DB writes. Applied when Supabase storage RLS is too restrictive for the user context.

2. **Dual-condition toast wait** — poll for `success OR error` instead of just `success`. Returns full page text for assertion. Cuts debugging time from 30s timeout to instant failure with error message.

3. **Network noise filter** — in `requestfailed` handler, skip: contentsquare.net (analytics), 127.0.0.1:7242 (HMR), googleusercontent.com (ORB-blocked avatars), ERR_ABORTED (RSC prefetches).

4. **useImperativeHandle retry** — 2s initial hydration delay + 3-attempt retry loop (click → wait 3s for dialog → retry after 2s). Handles the timing gap between DOM render and React ref wiring.

## Anti-Patterns Avoided (or Encountered)

- **NEVER use `userDataDir`** in Puppeteer — corrupts browser state, ALL DOM events silently fail (from previous session, still a critical lesson)
- **NEVER use `page.click()` for CDP coordinate-based clicks** when `position:fixed` overlays exist — use `page.evaluate(() => el.click())` for DOM-level clicks instead
- **NEVER log every requestfailed** without filtering — floods output with 20+ irrelevant lines

## Recommendations for Similar Future Work

1. **Start with POM** — create the Page Object Model first, test second. The POM is reusable and makes tests readable
2. **Add data-testid proactively** — when building any new component with user-interactable elements, add data-testid immediately. Costs 10 seconds, saves 10 minutes during E2E
3. **Use service role for storage** — default to `createServiceRoleSupabaseClient()` for all storage operations in API routes. User client only for auth validation
4. **Dual-condition waits** — for any E2E wait that polls for a positive outcome, always also check for error conditions
5. **Run E2E after any upload-route change** — contract upload was broken silently. E2E catches what manual testing misses

## E2E Test Coverage (as of 2026-02-21)

| Wizard | File | Tests | Avg Duration |
|--------|------|-------|-------------|
| Building creation | building-creation.e2e.ts | 8 | ~40s |
| Lot creation (building mode) | lot-creation.e2e.ts | 7 | ~45s |
| Lot creation (independent mode) | lot-creation.e2e.ts | 5 | ~50s |
| Contract creation | contract-creation.e2e.ts | 1 | ~43s |
| Smoke tests | smoke.e2e.ts | 4 | ~15s |
| **Total** | | **25** | |

## Files Changed (this session)

```
tests/e2e/contract-creation.e2e.ts          (new)
tests/e2e/pages/contract-wizard.page.ts     (new)
tests/e2e/vitest.e2e.config.ts              (cleanup)
tests/e2e/setup/global-setup.ts             (cleanup)
app/api/upload-contract-document/route.ts   (service role fix)
components/contracts/contracts-navigator.tsx (À venir tab + cleanup)
components/property-selector.tsx            (data-testid)
components/contact-selector.tsx             (data-testid)
components/ui/contact-section.tsx           (data-testid)
components/ui/step-progress-header.tsx      (data-testid)
components/contract/contract-form-container.tsx (data-testid)
```
