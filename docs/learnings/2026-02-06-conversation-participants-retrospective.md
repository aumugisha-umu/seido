# Retrospective: Fix Conversation Participants Management

**Date:** 2026-02-06
**Duration:** ~2 hours (including UI responsive fixes)
**Stories Completed:** 4 / 4
**Branch:** preview
**Commit:** 71ca982

## What Went Well

- **Root cause analysis**: Identified the problematic SQL trigger quickly by reading the migration file
- **Minimal code changes**: US-002 and US-003 were mostly already working — just needed to remove the global trigger
- **Clear separation**: Distinguished RLS access (reading) from explicit participation (tracking)
- **Non-breaking migration**: Existing participants weren't removed, only new behavior changed

## What Could Be Improved

- **Initial requirements clarity**: Had to clarify mid-implementation that property-linked managers SHOULD be added
- **Test coverage**: No automated tests added for the new participant logic
- **Documentation**: Should have documented the `lot_contacts`/`building_contacts` pattern earlier

## New Learnings Added to AGENTS.md

- **Learning #010**: RLS Access ≠ Explicit Participation
- **Learning #011**: Property-linked vs Team-linked Managers
- **Learning #012**: Trigger Removal vs Application Code

## Patterns Discovered

| Pattern | When to Use |
|---------|-------------|
| **Auto-add on interaction** | When users have access but need tracking only when they engage |
| **lot_contacts + building_contacts union** | Finding managers responsible for a specific property |
| **Trigger → App code migration** | When trigger logic is too coarse and needs context awareness |

## Anti-Patterns Avoided

| Anti-Pattern | What We Did Instead |
|--------------|---------------------|
| Add ALL team managers globally | Add only property-linked managers |
| Silent participant addition via trigger | Explicit addition with logging in app code |
| Assume participant = access | Separate concepts: RLS for access, participants for tracking |

## Recommendations for Similar Future Work

1. **Before modifying participant logic**: Always check for SQL triggers that might interfere
2. **For property-specific assignments**: Use `lot_contacts` + `building_contacts`, not team membership
3. **For conversation features**: Remember the RLS vs participation distinction
4. **When removing triggers**: Consider if existing data needs cleanup (we chose not to)

## Files Changed

```
app/api/create-intervention/route.ts               |  65 ++++++++
app/locataire/.../nouvelle-demande-client.tsx      | 164 +++++++-
components/contracts/contract-dates-display.tsx    |  39 ++++-
components/contracts/contracts-list-view.tsx       |  22 ++-
components/dashboards/locataire-dashboard-hybrid.tsx |  75 +++++++
components/interventions/intervention-confirmation-summary.tsx | 89 ++---
lib/services/domain/conversation-service.ts        |  15 ++
supabase/migrations/20260206100000_remove_...sql   |  54 +++++
tasks/prd-conversation-participants-fix.md         |  89 ++++++
tasks/prd.json                                     |  73 ++++++
tasks/progress.txt                                 |  83 ++++++
11 files changed, 627 insertions(+), 141 deletions(-)
```

## Additional Context

This fix also included UI improvements that were part of the same session:
- Responsive intervention creation flow (mobile-first)
- Adaptive lease duration indicator (months → days)
- Contract cards with progress bars
