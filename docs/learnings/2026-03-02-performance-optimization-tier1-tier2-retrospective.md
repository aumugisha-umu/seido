# Retrospective: Performance Optimization TIER 1+2

**Date:** 2026-03-02
**Duration:** ~1 session (13 stories)
**Stories Completed:** 13 / 13
**Branch:** preview
**Source:** 6-agent audit (96 findings consolidated) + 4 verification agents

## What Went Well
- Verification agents (US-001) caught that 7 out of 8 proposed indexes already existed — saved useless migration bloat
- Parallelization pattern (Phase 0 → Wave 1 → Wave 2) was consistently applicable across 11 pages
- Removing redundant auth checks (US-002) was clean — RLS is already the access control layer
- Batch actions (US-007/008) reduced query counts by 4-5x with minimal code changes
- `after()` from next/server (US-009) is a near-zero-effort optimization for any email/notification path
- Dead revalidation code removal (US-010) was safe — all pages are force-dynamic, no route cache exists

## What Could Be Improved
- The audit initially proposed 96 findings — needed significant deduplication and prioritization
- Some parallelization required async IIFE patterns inside Promise.all, which reduces readability
- No load testing was done to measure actual before/after timing — improvements are theoretical

## New Learnings Added to AGENTS.md
- Learning #105: Server Component parallelization — Phase 0 → Wave 1 → Wave 2
- Learning #106: RLS makes manual auth checks redundant in server actions
- Learning #107: next/server after() for deferred non-critical work
- Learning #108: force-dynamic — revalidation is dead code, unstable_cache still works
- Learning #109: SECURITY DEFINER RPC for batch cross-RLS operations
- Learning #110: Supabase bulk patterns — array .insert() + { head: true } for counts

## Patterns Discovered
- **Phase 0 → Wave 1 → Wave 2**: Universal pattern for Server Component data loading. Phase 0 parallelizes service instantiations. Wave 1 parallelizes all independent queries. Wave 2 handles dependent queries. Applied to 11 pages.
- **RLS-as-authorization**: Authenticated Supabase client already has RLS enforcement — manual team_members checks are pure duplication. ~16 queries eliminated per action flow.
- **after() deferral**: Non-blocking post-response work for emails, notifications, activity logs. Variables captured as const before closure.
- **Data cache vs Route cache**: `unstable_cache` (data cache) works independently of `force-dynamic` (route cache). `revalidateTag` only matters for unstable_cache entries, not for force-dynamic pages.
- **SECURITY DEFINER + unnest() for batch RLS**: When you need N×M queries across RLS-protected tables, batch into a single SQL function. 15 queries → 1 RPC call.
- **Supabase array .insert()**: Accepts arrays for bulk operations. Combined with `{ head: true }` for count-only queries, eliminates both query count and data transfer overhead.

## Anti-Patterns Avoided (or Encountered)
- **Manual auth before RLS-protected queries**: Pure duplication, ~50ms per query, zero security benefit
- **Sequential awaits for independent queries**: Each await blocks the next, even when queries are independent
- **Full row fetch for count operations**: `select('*').then(data => data.length)` transfers all row data just to count
- **Loop of server actions for batch operations**: N × (auth + service init + insert) instead of 1 × (auth + bulk insert)
- **revalidatePath on force-dynamic pages**: No-op that costs ~1-2ms per call for zero benefit

## Impact Summary (by story)

| Story | Impact |
|-------|--------|
| US-001 | 1 new composite index (7 proposed already existed) |
| US-002 | ~80 lines removed, ~16 DB queries eliminated per action |
| US-003 | Intervention edit: 12 sequential → 3 phases |
| US-004 | 6 entity creation pages parallelized |
| US-005 | Intervention API: removed redundant FK validation query |
| US-006 | 5 dashboard/detail pages parallelized |
| US-007 | Contract reminders: 72+ queries → ~18 queries |
| US-008 | Contract contacts: N × (auth+insert) → 1 × (auth+bulk) |
| US-009 | Invitation email response: immediate (email deferred) |
| US-010 | ~85 dead revalidation calls removed, ~120 lines |
| US-011 | Subscription info cached 15min, webhook-invalidated |
| US-012 | Thread unread counts: 15 queries → 1 RPC |
| US-013 | Stats: 7 count queries use head:true, 2 waves → 1 wave |

## Recommendations for Similar Future Work
- Always verify existing indexes/constraints before creating new ones (US-001 saved 7 useless indexes)
- Start with the audit → dedup → prioritize → implement cycle (96 → 13 stories)
- Batch operations offer the biggest ROI — look for loops of server action calls
- `after()` is the lowest-effort win — just wrap non-critical work, no architecture change needed
- When multiple tables need cross-RLS batch access, prefer SQL RPC over multiple client queries

## Files Changed (key files)
- 7 server action files (auth checks removed, revalidation cleaned)
- 11 Server Component pages (parallelized)
- 1 API route (create-manager-intervention parallelized)
- 2 client components (batch action calls)
- 1 layout (subscription caching)
- 1 repository (stats head:true optimization)
- 2 SQL migrations (composite index + unread counts RPC)
