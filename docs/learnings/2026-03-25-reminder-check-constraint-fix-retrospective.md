# Retrospective: Fix reminders 400 error — CHECK constraint violation

**Date:** 2026-03-25
**Duration:** ~1h (investigation + fix + simplify review)
**Branch:** preview

## What Went Well
- The `/simplify` code review caught the incomplete XOR enforcement (building_id/contact_id not nulled) before it reached production
- Defense-in-depth approach — enforcing DB constraints at the action layer rather than trusting callers
- Root cause analysis correctly identified the silent failure pattern hiding the real error

## What Could Be Improved
- Template-to-data mappings should be auto-verified — adding a field to a template type should cause a TS error if not propagated in all mapping sites
- Silent failures in Promise.all should be more visible — partial success should be communicated to users
- The `itemType` field being optional on `ScheduledInterventionData` allows this class of bugs — consider making it required with a default

## New Learnings Added to AGENTS.md
- Learning #184: Application-layer XOR enforcement for CHECK constraints — priority cascade
- Learning #185: Template-to-data mapping must spread ALL optional fields
- Learning #186: Silent action failures inside Promise.all hide root cause

## Patterns Discovered
- **Priority cascade for XOR enforcement**: Extract all entity IDs, then null out lower-priority ones based on which higher-priority ID is set. Pattern: `contract > lot > building > contact`
- **Consistent template spread**: When multiple mapping sites consume the same template type, all must spread the same set of optional fields

## Anti-Patterns Avoided (or Encountered)
- **Silent swallowing**: `{ success: false }` return inside `Promise.all` meant the wizard showed success while creating nothing
- **Inconsistent mapping**: Standard interventions had the spread, document interventions didn't — copy-paste divergence

## Recommendations for Similar Future Work
- When adding optional fields to template types, grep ALL `.map()` consumers to ensure propagation
- For tables with `num_nonnulls` CHECK constraints, always enforce the XOR at the action layer
- Consider `Promise.allSettled` at the outer level for multi-operation submissions, with aggregated error reporting

## Files Changed
- `app/actions/reminder-actions.ts` — XOR priority cascade + source_template fix
- `components/contract/contract-form-container.tsx` — document intervention itemType/recurrenceRule spread
