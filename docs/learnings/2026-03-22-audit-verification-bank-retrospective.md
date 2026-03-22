# Retrospective: Full-Stack Audit + Gestionnaire Verification + Bank Module

**Date:** 2026-03-22
**Duration:** ~8h (across sessions 2026-03-21 to 2026-03-22)
**Stories Completed:** 28 / 28 (6 security + 5 verification + 17 bank)
**Branch:** feature/bank-module

## What Went Well
- **6-agent parallel audit** covered 128 checks in a single pass — no human review bottleneck
- **8-agent gestionnaire verification** scanned 93 files and found 7 real bugs + 29 warnings
- **Bank module 17-story implementation** completed with 113 tests, zero regressions
- **Ralph workflow** (PRD → stories → TDD) kept implementation focused and traceable
- **Pure function exports** from services enabled fast unit testing (no mock chains)
- **Soft delete as BaseRepository method** — centralized fix, immediately available to all repositories

## What Could Be Improved
- **Hard DELETE was in production since day 1** — should have been caught earlier in architecture review
- **`getSession()` usage** was a known Supabase anti-pattern but wasn't flagged until the audit
- **Bank module** was built entirely without integration tests against real Tink API (unit tests only with mocks)
- **Dashboard type cast (`as unknown as InterventionWithRelations`)** was deferred — tech debt accumulating
- **29 console.error → logger warnings** still not fixed (low priority but growing)

## New Learnings Added to AGENTS.md
- Learning #169: Mass assignment via service-role client — Zod .strict() required
- Learning #170: getSession() vs getUser() — JWT validation bypass
- Learning #171: Stripe mapStripeStatus must be fail-closed
- Learning #172: BaseRepository.delete() is hard DELETE — use softDelete()
- Learning #173: Capture dependent data BEFORE mutation
- Learning #174: Role filtering must be exhaustive — proprietaire falls through
- Learning #175: vi.hoisted() required for mock variables
- Learning #176: Export pure functions from services for testability
- Learning #177: Tink API token is 30min — refresh with 2-min buffer
- Learning #178: CSP unsafe-eval and CORS wildcard — dev-only

## Patterns Discovered
- **Audit-driven development**: Systematic codebase scan against official docs catches architecture drift early
- **softDelete at base class level**: One method, all repositories benefit — better than per-repo implementations
- **Pre-capture before mutation**: Always read data you'll need for side effects BEFORE the write
- **Pure function extraction**: Business logic as exported pure functions enables 80% test coverage with zero mocks
- **5-component confidence scoring**: Weighted scoring (ref 40%, amount 25%, approx 15%, name 15%, date 5%) works well for financial matching

## Anti-Patterns Avoided (or Encountered)
- **Fail-open status mapping** (Stripe) — changed to fail-closed
- **Post-delete data access** (building actions) — captured team_id before delete
- **`as any` type escape** (profile pages) — replaced with proper type access
- **`image/*` accept** — too permissive, restricted to safe formats
- **Role switch without exhaustive cases** — added proprietaire

## Recommendations for Similar Future Work
1. **Run audit skill quarterly** against official docs to catch drift
2. **Add softDelete guard**: When creating new tables with `deleted_at`, ensure the service uses `softDelete()` not `delete()`
3. **Pure function rule**: Any service with >3 lines of deterministic logic should export pure functions
4. **Role exhaustiveness**: Add ESLint rule or code review checkpoint for role-based switches
5. **Bank module Phase 2**: Add integration tests with Tink sandbox before production

## Files Changed (Summary)
- **Security Sprint 1**: 6 files (schemas, auth-dal, lot-actions, next.config, company-lookup, subscription.service)
- **Gestionnaire Sprint 2**: 9 files (base-repository, building.service, lot.service, 2 action files, contact page, 2 profile pages, profile-page component)
- **Bank Module**: 40+ new files (7 tables, 5 services, 4 repositories, 9 API routes, 10+ components, 9 test files)
