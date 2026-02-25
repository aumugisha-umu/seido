# Retrospective: Finalization Modal Planning & Estimation Fix

**Date:** 2026-02-16
**Duration:** ~30 min
**Branch:** preview

## What Went Well
- Cross-referencing the General tab's working code with the finalization modal instantly revealed 3 distinct bugs
- The fix was surgical — only 2 files modified, no cascading side effects
- The `InterventionDetailsCard` already supported `isFixedScheduling`, so adding the field just worked

## What Could Be Improved
- Time slot status values (`'selected'`, `'pending'`, `'requested'`) should be centralized as constants instead of magic strings scattered across components
- The finalization modal was built independently without verifying against the General tab — a shared useMemo or hook would prevent drift

## New Learnings Added to AGENTS.md
- Learning #035: Time slot status is 'selected' not 'confirmed' — DB status values diverge from UI semantics

## Patterns Discovered
- **Cross-view diff pattern:** When two views display the same data differently, diff their code side-by-side to find status value mismatches
- **API field propagation:** When a component needs a new DB field, the chain is: API select → response type → component useMemo

## Anti-Patterns Encountered
- **Magic string assumption:** Using `'confirmed'` because it "sounds right" instead of checking the actual DB enum/values
- **Count inflation:** `timeSlots.length` counted ALL statuses including the selected one — should filter to only pending/requested

## Recommendations for Similar Future Work
- Consider creating `lib/constants/time-slot-status.ts` with `SELECTED`, `PENDING`, `REQUESTED` constants
- When building a new view that displays existing data, always start by reading the existing working view's data-fetching code
- Always check the API route's `.select()` clause matches the component's type definition

## Files Changed
- `app/api/intervention/[id]/finalization-context/route.ts` — added `selected_by_manager` to time slots select
- `components/intervention/finalization-modal-live.tsx` — fixed type, useMemo logic, removed redundant title
