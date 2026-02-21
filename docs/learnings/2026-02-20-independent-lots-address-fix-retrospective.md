# Retrospective: Independent Lots Address Display Fix

**Date:** 2026-02-20
**Duration:** ~30 minutes
**Branch:** preview

## What Went Well
- The `findByIdWithRelations()` batch address pattern was directly reusable — copy-adapt took under 5 minutes
- The plan correctly identified all 3 layers needing fixes (repository, server page, client)
- No new lint errors introduced

## What Could Be Improved
- The original "optimization" on 2026-01-30 that removed nested JOINs from `findByTeam()` should have added a batch replacement at the same time
- The server page should never have required coordinates just to display an address string — this conflation was present since the page was first written

## New Learnings Added to AGENTS.md
- Learning #052: Query optimization must replace removed data, not just remove JOINs

## Patterns Discovered
- **"Display data" vs "Feature data" separation**: An address has two distinct use cases — text display (needs `formatted_address` or `street`) and map rendering (needs `latitude` + `longitude`). Guard these separately with different conditions.
- **Three-layer data pipeline debugging**: When data is missing in the UI, check each layer independently: (1) Is it fetched? (2) Is it passed through? (3) Does the type allow it?

## Anti-Patterns Avoided (or Encountered)
- **Optimization regression**: Removing nested JOINs without replacing the data → silent data loss in UI
- **Coordinate gating**: Requiring lat/lng to display an address string → addresses from manual entry (no geocoding) are silently hidden

## Recommendations for Similar Future Work
- When optimizing any repository method by removing nested JOINs, immediately add a batch post-fetch
- Audit the UI consumers of the method to verify they still have all data they need
- For address data, always treat coordinates as optional — geocoding can fail or be skipped

## Files Changed
- `lib/services/repositories/lot.repository.ts` — Added batch address fetch to `findByTeam()` (+15 lines)
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` — Relaxed 4 address conditions, made coords nullable (+8/-6 lines)
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx` — Made LotAddress coords nullable, added map guard (+2/-2 lines)
