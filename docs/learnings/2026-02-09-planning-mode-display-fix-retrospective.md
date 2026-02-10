# Retrospective: Planning Mode Display Fix + Chat Avatar Fix

**Date:** 2026-02-09
**Duration:** ~1h (analysis + implementation)
**Stories Completed:** 4 / 4 (Planning Mode) + 1 standalone fix (Chat Avatar)
**Branch:** preview

## What Went Well
- Ralph methodology kept the fix organized despite touching 7 files across 3 roles
- Reusing the emerald card visual pattern from `InterventionSchedulingPreview` saved design time and maintained consistency
- Identifying ALL 6 call sites (3 roles x 2 components) early prevented partial fixes
- The UX priority cascade (intervention status > scheduling mode > default) was the correct design — avoids showing "Coordination autonome" for unapproved interventions

## What Could Be Improved
- The `scheduling_type` field existed in DB since the scheduling feature was built, but was never propagated to summary views. A "display audit checklist" when adding DB enums would have caught this earlier.
- The chat avatar bug existed because the `ParticipantsDisplay` component (group threads) had robust fallback logic, but the individual thread avatar (added later) used a simpler pattern. Code duplication of display logic without reusing helpers.

## New Learnings Added to AGENTS.md
- Learning #022: DB enum fields must propagate to ALL display components
- Learning #023: Avatar fallback cascade (first_name -> name -> email -> '?')

## Patterns Discovered
- **UX Priority Cascade**: When multiple states could affect display (intervention status + scheduling mode), establish a clear priority order. In SEIDO: `demande` > `rejetee` > `flexible` > default `En attente`.
- **Visual Pattern Reuse**: The emerald card (bg-emerald-50/30, border-emerald-200, Users icon) is now a recognized "flexible scheduling" visual cue across 3 views.

## Anti-Patterns Avoided
- **Partial role coverage**: Could have only fixed the gestionnaire view (the one in the bug report). Instead, we fixed all 3 roles proactively.
- **Silent empty render**: The avatar `AvatarFallback` rendering empty string instead of a visible fallback. Now cascades to '?' as last resort.

## Recommendations for Similar Future Work
1. When adding a new DB enum that affects display, grep for ALL components displaying related data and create a checklist
2. When building avatar/initials display, always use the cascade pattern from ParticipantsDisplay — consider extracting to a shared `getInitials(user)` utility
3. When a visual pattern is established (like the emerald flexible card), document it in the component or create a shared component to prevent divergence

## Files Changed
- `components/interventions/shared/types/intervention-preview.types.ts` — Added schedulingType to types
- `components/interventions/shared/cards/intervention-details-card.tsx` — Flexible mode in General tab
- `components/interventions/shared/cards/planning-card.tsx` — Flexible mode in Planning tab
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — Wiring
- `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — Wiring
- `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — Wiring
- `components/chat/chat-interface.tsx` — Avatar fallback + header spacing
