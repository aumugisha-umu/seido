# Retrospective: Lot Wizard — Server Component Refactoring + E2E Submission Tests

**Date:** 2026-02-20
**Duration:** ~4 hours (estimated from conversation flow)
**Stories Completed:** 7 / 7
**Branch:** preview

## What Went Well

- **Server Component pattern copy-paste**: Mirroring `immeubles/nouveau/page.tsx` for the lot wizard was nearly mechanical — 75-line Server Component worked on first try
- **Page Object Model (POM)**: Clean separation between selectors, navigation methods, and verification methods made adding submission tests trivial (3 methods + 2 tests)
- **Ralph methodology**: Story-by-story implementation with acceptance criteria prevented scope creep and ensured each piece was validated before moving on
- **Refactoring payoff**: Removing 161 lines of client-side auth/data-loading code (useAuth, useTeamStatus, TeamCheckModal) eliminated an entire class of hydration bugs
- **`waitForNextEnabled()` universal guard**: Single pattern fix eliminated ALL intermittent failures across both wizard modes

## What Could Be Improved

- **Start with submission tests**: Navigation-only E2E tests gave false confidence — "green tests" with zero real data created. Always include at least one submission test from the start.
- **Timeout calibration**: Default timeouts (5s, 10s) were too aggressive for staging DB with cache invalidation. Should start with generous timeouts (15s-30s) and tighten later, not the reverse.
- **Variable rename completeness**: When removing `useAuth()` and replacing `user` with `userProfile`, simple grep for `user.property` missed bare references like `!user` and `user?.id`. Need `\buser\b` word-boundary grep.

## New Learnings Added to AGENTS.md

- Learning #047: Auto-init useEffects cause E2E race conditions — always `waitForNextEnabled()` before `clickNext()`
- Learning #048: Next.js client-side navigation bypasses Puppeteer `waitForNavigation` — poll URL instead
- Learning #049: Dashboard-bounce clears Next.js client cache between E2E test runs
- Learning #050: Radix toast detection — poll DOM text, not specific CSS selectors
- Learning #051: Radix RadioGroupItem — click label, verify via `data-state`

## Patterns Discovered

### Server Component Wizard Pattern
Strip all client-side auth from wizard forms. Server Component handles:
1. `getServerAuthContext()` — auth + role guard
2. Data loading (team managers, category counts)
3. Pass as props to `'use client'` form component

Result: Form component drops from 2872 → 2711 lines, no auth hooks, no loading states, no TeamCheckModal.

### E2E Wizard Submission Pattern
```
1. Dashboard-bounce (clear client cache)
2. wizard.navigate()
3. Fill required fields (step 1)
4. For each step 2-N:
   a. waitForNextEnabled(15_000)  ← KEY: handles auto-init effects
   b. clickNext()
   c. waitForStep(N)
5. clickSubmit()
6. waitForSuccessToast(30_000)  ← polls DOM text
7. waitForRedirect(urlPart, 30_000)  ← polls URL (not waitForNavigation)
```

### Radix Component E2E Interaction Pattern
- **RadioGroup**: Click `label[for="id"]` via `page.evaluate()`, verify via `data-state="checked"`
- **Toast**: Poll `document.body.innerText.includes('text')` — don't rely on toast selectors
- **Retry on hydration**: If first click doesn't work, wait 500ms and retry

## Anti-Patterns Avoided (or Encountered)

| Anti-Pattern | What Happened | Fix |
|-------------|---------------|-----|
| Navigation-only E2E tests | Tests passed but no data created — false confidence | Added submission tests with real DB verification |
| `waitForNavigation` for Next.js | Hangs forever on `router.push()` | Poll URL with `page.waitForFunction()` |
| Short default timeouts | 5s/10s caused intermittent failures after cache invalidation | Generous defaults (15s-30s), validated by 2 consecutive runs |
| Grepping `user.property` for rename | Missed bare `!user` and `user?.id` | Use word-boundary grep: `\buser\b` |

## Recommendations for Similar Future Work

1. **New wizard E2E tests**: Always include at least one submission test — navigation-only gives false confidence
2. **Auto-init effects**: Any wizard that auto-creates entities on step mount needs `waitForNextEnabled()` guards
3. **Timeout budget**: Start generous (30s) in staging. Only tighten after 3+ consecutive green runs.
4. **Server Component refactoring**: Use `immeubles/nouveau/page.tsx` as the template — it's been validated across building and lot wizards
5. **Radix E2E**: Never trust `.click()` on Radix primitives during hydration — use `page.evaluate()` + `data-state` verification

## Files Changed

```
tests/e2e/lot-creation.e2e.ts          — +2 submission tests, header update
tests/e2e/pages/lot-wizard.page.ts     — +3 submission methods, timeout fixes
tests/e2e/building-creation.e2e.ts     — +1 submission test (bonus)
tests/e2e/pages/building-wizard.page.ts — +3 submission methods (bonus)
tasks/prd.json                         — US-006/007 added, all passes:true
tasks/progress.txt                     — US-005/006/007 entries
app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx         — New Server Component
app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx — Refactored (-161 lines)
app/gestionnaire/(no-navbar)/biens/lots/nouveau/loading.tsx      — Deleted
```
