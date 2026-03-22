# Retrospective: Bank Module Simplify Review + Test Regression Fix

**Date:** 2026-03-22
**Duration:** ~3 sessions (context window exhaustion required 2 continuations)
**Branch:** feature/bank-module
**Scope:** Code quality fixes from /simplify review + 17 pre-existing unit test failures

## What Went Well
- Systematic IDOR audit caught 3 vulnerable routes — pattern-based review (all `[id]` routes) is more reliable than ad-hoc
- Atomic SQL RPC for rent call payment eliminated a genuine concurrency bug
- Token function deduplication reduced 90 lines of copy-paste to 15 lines shared helper
- Fixing all 17 pre-existing test failures in one sweep prevented ongoing CI noise

## What Could Be Improved
- Test failures accumulated silently — no CI enforcement on the feature branch before merge
- `getLotCount` implementation changed (subscriptions table → lots table) but tests across 3 files weren't updated simultaneously
- Factory helper migration (`new Service()` → `createService()`) happened without updating tests
- Session exhausted context 2x due to large scope — should have split into 2 tasks

## New Learnings Added to AGENTS.md
- Learning #179: IDOR on all `[id]` routes — verify team_id ownership
- Learning #180: TOCTOU on counters — atomic SQL RPC vs read-then-write
- Learning #181: Factory helper migration breaks constructor-level test mocks
- Learning #182: `vi.fn().mockImplementation()` is NOT constructible — use named function
- Learning #183: DST causes +/-1h drift in day-based date arithmetic — widen tolerance

## Patterns Discovered
- **IDOR audit checklist:** For every `[id]` route, pass `teamId` to repo and add `.eq('team_id', teamId)`
- **Atomic counter pattern:** `GREATEST(0, COALESCE(col, 0) + delta)` — handles NULL, prevents negatives
- **Factory mock pattern:** Mock the factory module, not the class it instantiates
- **DST-safe assertions:** Use 2h tolerance for multi-day date diffs in tests

## Anti-Patterns Avoided (or Encountered)
- Read-then-write on shared counters (TOCTOU) → replaced with atomic RPC
- HTML template literals with unsanitized data (XSS) → escapeHtml() added
- Raw `createClient()` in cron routes → centralized `createServiceRoleSupabaseClient()`
- Arrow functions as constructor mocks → named functions for `new` compatibility

## Recommendations for Similar Future Work
- When changing a service method's implementation (e.g., which table it queries), grep ALL test files that mock that method and update in the same PR
- When migrating from `new Service()` to factory pattern, update tests simultaneously
- Run full `npx vitest run tests/unit/` before considering any code change "done"
- For multi-tenant apps: maintain an IDOR checklist and audit every `[id]` route

## Files Changed (49 files, +1618/-341)
Key files:
- 3 bank API routes (IDOR fixes)
- bank-matching.service.ts (TOCTOU fix + team_id verification)
- tink-api.service.ts (token deduplication)
- lib/utils/date-formatting.ts (new shared utility)
- 4 cron routes (service client standardization)
- 9 test files (17 failures fixed)
- 1 new migration (atomic RPC)
