# Retrospective: Data Invalidation Broadcast + UX Improvements

**Date:** 2026-03-15
**Duration:** ~3h (brainstorm + design + implementation + simplify review)
**Branch:** preview
**Commit:** 0be45d68

## What Went Well
- Supabase Broadcast was the right call — zero DB overhead, reuses existing WebSocket infra
- `useRealtimeOptional()` pattern enabled clean integration without breaking standalone pages/tests
- `/simplify` review caught a real N+1 debounce bug before it shipped
- Separating team channel from per-user channel was architecturally clean
- All 5 hooks + 12+ mutation sites wired in a single session

## What Could Be Improved
- Initial per-entity debounce was a naive implementation — should have designed batch debounce from the start
- Sticky tabs required a wrapper div discovery (TabsList alone is max-w-md, can't cover full width)
- Dead `revalidatePath` cleanup (68 calls) was deferred — tech debt remains

## New Learnings Added to AGENTS.md
- Learning #142: Debounce event dispatch per-batch, not per-entity
- Learning #143: Supabase Broadcast for cache invalidation (zero DB overhead)
- Learning #144: Separate channels for different scopes (per-user vs per-team)

## Patterns Discovered
- **Broadcast invalidation pattern**: `realtime?.broadcastInvalidation(['entity', 'stats'])` before `router.push()` — simple, fire-and-forget, works because WebSocket .send() is synchronous
- **Batch debounce**: Collect entities in `Set`, single timer, dispatch once per handler — prevents N+1 storms
- **Optional context hook**: `useRealtimeOptional()` returns null outside provider — hooks degrade gracefully

## Anti-Patterns Avoided
- **Per-entity debounce** → N+1 callbacks (caught by /simplify, fixed to batch)
- **postgres_changes for invalidation** → unnecessary DB overhead when we just need pub/sub
- **Single channel for all concerns** → per-user notifications would leak to team broadcasts

## Recommendations for Similar Future Work
- When adding new entity types to invalidation, update `DataEntity` type in `lib/data-invalidation.ts` and wire the corresponding hook
- Consider adding `contracts` hook subscription when a contracts list page is built
- Task 10 (dead revalidatePath cleanup) should be done in a future session — 68 calls across 9 files

## Files Changed
- lib/data-invalidation.ts (new)
- contexts/realtime-context.tsx (+115 lines)
- hooks/use-buildings.ts, use-manager-stats.ts, use-team-contacts.ts, use-contacts-data.ts, use-interventions.ts
- 7 creation/detail form components (gestionnaire, locataire, prestataire)
- components/billing/onboarding-checklist.tsx
- components/building-contacts-step-v3.tsx
- docs/plans/2026-03-15-data-invalidation-broadcast.md (new)
