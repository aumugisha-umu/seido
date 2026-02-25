# Retrospective: Mail Sidebar — Linked Entities Fix

**Date:** 2026-02-23
**Duration:** ~15 minutes
**Stories Completed:** 1 / 1 (bugfix)
**Branch:** feature/stripe-subscription

## What Went Well
- The correct implementation already existed in `/api/email-linked-entities/route.ts` — no design work needed
- Single-file fix with clear before/after comparison
- The RPC function `get_distinct_linked_entities` was already deployed, so the primary path works immediately
- JS fallback preserved for robustness

## What Could Be Improved
- The SSR initial load should have been written to mirror the API from the start
- No integration test existed to catch this divergence (sidebar showing entities with emailCount: 0 should have been a red flag)
- Could add a shared utility function so SSR and API can't diverge again

## New Learnings Added to AGENTS.md
- Learning #078: SSR/API data-fetch divergence — always mirror junction-table logic in SSR

## Patterns Discovered
- **SSR/API parity pattern:** When building a page with both SSR initial load and a client-side API refresh endpoint, both must use the same query strategy. The API endpoint is often written later (or optimized later) and the SSR path gets forgotten.
- **RPC + fallback pattern:** Try the optimized RPC first, catch the error, fall back to direct query + JS dedup. This allows gradual migration rollout.

## Anti-Patterns Avoided (or Encountered)
- **"Fetch all, filter later" anti-pattern:** The original code fetched up to 300 entities (50 per type) then showed them all with `emailCount: 0`. This wastes bandwidth, confuses users, and masks the actual email-linked entities.

## Recommendations for Similar Future Work
- When creating/modifying an API endpoint, grep for SSR equivalents that fetch the same data type
- Consider extracting shared query logic into a service function callable from both SSR and API
- Add a simple smoke test: if sidebar shows entities with emailCount: 0, that's a data-fetch bug

## Files Changed
```
app/gestionnaire/(with-navbar)/mail/page.tsx | ~160 lines rewritten (getLinkedEntities function)
```
