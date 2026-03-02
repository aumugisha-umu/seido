# Retrospective: Performance Optimization TIER 3

**Date:** 2026-03-02
**Duration:** ~2h (continued from TIER 1+2 session)
**Stories Completed:** 16 / 16 (US-014 through US-029)
**Branch:** preview
**Total Across All Tiers:** 29 / 29 stories

## What Went Well

- **Verification-first approach**: 3 parallel Explore agents verified 26 findings, pruning 10 false positives BEFORE implementation. This saved significant wasted effort
- **Incremental story-by-story delivery**: Each US was small (XS-M), making changes reviewable and low-risk
- **Pattern reuse**: Several optimizations used the same patterns (head:true, Promise.allSettled, cache(), useRef for stable deps), so later stories were faster
- **Zero regressions**: All changes were additive optimizations; no functional changes to user-facing behavior
- **US-023 correctly identified as no-change**: Verified the pattern was already correct, avoided unnecessary "fix"

## What Could Be Improved

- **prd.json sync issue**: 3 stories (US-024, US-025, US-027) were completed but prd.json wasn't updated before context was lost. Need to update prd.json immediately after each story, not in batch
- **TDZ trap in useRef pattern (US-021)**: Placed `useRef(optimisticMessages)` before `useOptimistic()` declaration. Hook declaration order is critical and easy to miss
- **Service role in Server Components**: The SSR pre-fetch hybrid (US-028) required using `createServiceRoleSupabaseClient()` for blacklist JOIN. This works but is a pattern that needs careful security review (auth is validated by getServerAuthContext, but service role bypasses ALL RLS)

## New Learnings Added to AGENTS.md

- Learning #111: useRef for stable callback deps — prevent useEffect re-registration
- Learning #112: SSR pre-fetch hybrid — Server Component fetches, Client Component renders
- Learning #113: SQL COUNT FILTER for multi-category aggregation — single scan replaces N queries
- Learning #114: React cache() for Server Component service deduplication

## Patterns Discovered

1. **React cache() for service factories** → Deduplicate service creation across Server Component render tree
2. **COUNT(*) FILTER (WHERE ...)** → Multi-condition counts in a single Postgres scan
3. **SSR pre-fetch hybrid** → Server Component fetches initial data, Client Component receives as props
4. **useRef + empty deps** → Stable event listeners/subscriptions despite volatile callback references

## Anti-Patterns Avoided (or Encountered)

- **Hook TDZ**: Declaring `useRef(value)` before the hook that creates `value` → runtime crash
- **data.X.length in useCallback deps**: Creates potential infinite loop (data changes → callback recreated → effect re-fires → data changes)
- **optimisticMessages in subscription deps**: Causes Realtime channel thrashing (unsub/resub on every message)
- **fetchAll + memory filter**: Loading entire contact table then filtering in JS instead of DB-side ilike

## Recommendations for Similar Future Work

1. **Always verify audit findings**: Run verification agents before implementing — expect 30-40% false positives
2. **Update prd.json IMMEDIATELY after each story**: Don't batch — context loss risks losing tracking
3. **For count aggregation**: Prefer SQL RPC with COUNT FILTER over multiple head:true queries when counting 3+ categories on the same table
4. **For hook stability**: When a useEffect's purpose is to register a listener, the deps should be [] or minimal stable refs. Volatile values go in useRef

## Files Changed (TIER 3 only)

```
13 files changed, ~634 insertions(+), ~538 deletions(-)
app/actions/intervention-actions.ts
app/api/cron/intervention-reminders/route.ts
app/blog/[slug]/page.tsx
app/blog/page.tsx
app/gestionnaire/.../async-dashboard-content.tsx
app/gestionnaire/.../mail/page.tsx
app/gestionnaire/.../parametres/emails/page.tsx (rewritten)
app/gestionnaire/.../parametres/emails/email-settings-client.tsx (NEW)
app/layout.tsx
app/page.tsx
app/sitemap.ts
components/pwa-register.tsx
hooks/use-buildings.ts
hooks/use-global-notifications.ts
hooks/use-realtime-chat-v2.ts
lib/blog.ts
lib/services/domain/contact.service.ts
lib/services/repositories/contact.repository.ts
lib/services/repositories/lot.repository.ts
lib/services/repositories/quote-repository.ts
middleware.ts
next.config.js
supabase/migrations/20260302120000_create_get_email_counts_rpc.sql (NEW)
```
