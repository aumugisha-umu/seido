# Retrospective: Subscription Limit False Positive Fix

**Date:** 2026-02-26
**Duration:** ~1 session
**Bugs Found:** 6 | **Bugs Fixed:** 4 critical
**Branch:** preview

## What Went Well
- **Deep root cause analysis**: Didn't stop at the obvious off-by-one (`>=` vs `>`). The user's 21-lot gap (155 subscribed, blocked at 134) pointed to a deeper issue
- **Traced full data flow**: DB trigger -> repository -> service -> server action -> hook -> client form. Found the stale `billable_properties` cache AND the operator divergence
- **Discovered bypass paths**: `duplicateLot()` and `addIndependentLot()` had zero subscription enforcement — found by systematically auditing all entity-creation functions
- **Minimal, focused fixes**: 4 files changed, no over-engineering. Live count instead of cached counter eliminates drift permanently

## What Could Be Improved
- **The off-by-one should have been caught during billing audit (2026-02-22)**: Learning #073 added `canAddProperty(count)` to the server but nobody audited the 3 client-side `isAtLotLimit()` functions at the same time
- **No integration test for subscription limits**: The limit check only exists in UI forms (client) and server actions — no test validates they agree
- **`billable_properties` trigger should have been tested for drift during the Stripe migration**: A simple `SELECT billable_properties, (SELECT COUNT(*) FROM lots WHERE team_id = s.team_id AND deleted_at IS NULL) FROM subscriptions s` health check would have caught it

## New Learnings Added to AGENTS.md
- Learning #090: Client/server operator divergence in quota checks
- Learning #091: Trigger-maintained cached counters drift — prefer live counts for billing
- Learning #092: Clone/duplicate functions bypass validations added to "add" functions

## Patterns Discovered
- **Operator alignment pattern**: When server uses `(a + c) <= limit` for "allowed", client must use `(a + b) > limit` for "blocked" — same boundary, opposite direction. Test: at exactly the limit, both must agree.
- **Live count > cached counter for billing**: `select('*', { count: 'exact', head: true })` is fast (indexed, no data transfer) and always accurate. Use triggers only for non-critical counters (dashboard stats).
- **Clone function audit checklist**: After adding any validation to a create function, search for: `duplicate`, `clone`, `copy`, `import`, `bulk`, and any alternative creation mode. All must share the guard.

## Anti-Patterns Avoided
- **Didn't just fix the `>=`**: Would have fixed 1 lot of the 21-lot gap. Investigating further revealed the stale cache — the real problem
- **Didn't make isAtLotLimit async**: Considered calling `checkCanAddProperty()` server action from the client form, but that would require loading states and risk UX regression. The pre-computed `actual_lots` from the hook (now live-counted) is fast enough

## Recommendations for Similar Future Work
- Add an integration test: `canAddProperty` result should match `isAtLotLimit` result for the same inputs
- Consider a CRON job that periodically reconciles `billable_properties` with live count for monitoring
- When adding billing features, always audit both client AND server code paths — they tend to drift

## Files Changed

| File | Change |
|------|--------|
| `lot-creation-form.tsx` | `>=` -> `>`, count independentLots, guard duplicateLot + addIndependentLot |
| `building-creation-form.tsx` | `>=` -> `>` |
| `edit-building-client.tsx` | `>=` -> `>` |
| `subscription.repository.ts` | Live COUNT(*) instead of cached billable_properties |
| `tasks/progress.txt` | Added progress log |
| `AGENTS.md` | Added learnings #090-#092 |
