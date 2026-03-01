# Retrospective: Confirmation & Time Slot Logic Fix

**Date:** 2026-03-01
**Duration:** ~1h (investigation + implementation)
**Branch:** preview

## What Went Well
- Explore agent traced the full data flow (client → API → DB trigger) in one pass, finding root cause quickly
- Defense-in-depth pattern (client `has_account` filter + server `auth_user_id` filter) prevented any single point of failure
- The `isMultiSlot` derived variable kept the slot-count logic DRY across 6 files
- Existing patterns in the codebase (fixed mode toggle, edit flow confirmation) provided templates for the new 1-slot behavior

## What Could Be Improved
- The initial fix (has_account filter) was correct but didn't catch the deeper ordering bug — should have tested end-to-end before declaring done
- The INSERT ordering bug had been present since the feature was built — integration tests covering "tenant with account + slots mode" would have caught this
- 6 files needed the same `requiresParticipantConfirmation` expression updated — this repeated expression should ideally be a shared utility

## New Learnings Added to AGENTS.md
- Learning #101: INSERT ordering in multi-phase assignment creation
- Learning #102: has_account !== false pattern for filtering non-invited contacts
- Learning #103: Slot-count-dependent business logic — derive isMultiSlot

## Patterns Discovered
- **Multi-phase INSERT → UPDATE ordering**: When entities are created in separate INSERT phases, any cross-cutting UPDATE must come AFTER all INSERTs complete. The edit flow accidentally worked because all entities pre-existed.
- **Reactive slot-count UI**: A single `isMultiSlot` boolean drives confirmation from mandatory ↔ optional as the user adds/removes slots in real-time.

## Anti-Patterns Avoided
- **Fixing only the visible symptom**: First bug (has_account) was a real issue but masked the deeper ordering bug. Always trace the full flow.
- **Hardcoding slot mode = mandatory**: Business logic should derive from data state (slot count), not from mode name.

## Recommendations for Similar Future Work
- When debugging "entity X missing from result Y", trace the full chain: UI state → API payload → DB writes → DB triggers → query results
- Any multi-INSERT API route should audit the order of cross-cutting UPDATEs
- Test with mixed contact types (with/without accounts) in all scheduling modes

## Files Changed
- `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/nouvelle-intervention-client.tsx` — buildAllParticipantIds filter + isMultiSlot + payload
- `app/api/create-manager-intervention/route.ts` — moved confirmation block, added single-slot planifiee logic
- `components/intervention/assignment-section-v2.tsx` — slot-count-dependent confirmation UI
- `components/intervention/modals/programming-modal-FINAL.tsx` — ProposeSlotsSection 1-slot toggle
- `app/gestionnaire/(no-navbar)/interventions/modifier/[id]/intervention-edit-client.tsx` — isMultiSlot for edit flow
