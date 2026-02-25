# Retrospective: Building Interventions Tab — Show All Related Interventions

**Date:** 2026-02-18
**Duration:** ~15 min
**Branch:** preview

## What Went Well
- Root cause was identified quickly: XOR constraint + single-column query = silent data loss
- Fix was minimal (2 files, ~30 lines added) with zero risk of regression
- Existing `getByBuilding()` method already proved the `.eq('building_id', X)` pattern works

## What Could Be Improved
- The bug existed since the batch optimization on 2026-02-08 (when `getByLotIds` replaced per-lot queries)
- The original `getByLotIds` name clearly signals it only queries lot_id — the oversight was not in the method but in assuming "lot interventions = all interventions for a building"

## New Learnings Added to AGENTS.md
- Learning #042: XOR constraints make single-column queries miss half the data

## Patterns Discovered
- **`.or()` for XOR tables**: When a table has mutually exclusive FK columns, use Supabase `.or()` to query both sides in a single roundtrip. This is both correct (captures all rows) and efficient (1 query, not 2).

## Anti-Patterns Encountered
- **Assuming lot_id coverage = full coverage**: Building-level interventions (elevator repair, fire safety, etc.) have `lot_id = NULL`. SQL `NULL IN (...)` is always UNKNOWN, so `.in('lot_id', lotIds)` silently excludes them.

## Recommendations for Similar Future Work
- When querying a table with XOR constraints, always ask: "What about rows where the OTHER column is populated?"
- Name methods to reflect what they actually query: `getByLotIds` is honest; the bug was in the caller assuming it was sufficient

## Files Changed
- `lib/services/domain/intervention-service.ts` — added `getByBuildingWithLots()` method (+30 lines)
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx` — replaced query call, removed `lots.length > 0` guard
