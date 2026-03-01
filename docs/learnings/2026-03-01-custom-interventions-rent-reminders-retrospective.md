# Retrospective: Custom Interventions + Rent Reminders + Dashboard Perf

**Date:** 2026-03-01
**Duration:** ~4h (estimated from conversation scope)
**Stories Completed:** 7/7 (4 dashboard perf + 3 rent reminders)
**Branch:** preview

## What Went Well

- **Ralph methodology** cleanly decomposed rent reminders into 3 stories (migration, UI, parent state)
- **`isEditable` prop polymorphism** on `InterventionScheduleRow` — zero duplication, same card layout for both modes
- **Key prefix convention (`custom_`)** solved the useEffect regeneration problem elegantly — 2 lines of filter
- **1-to-N meta-card pattern** kept UI simple (1 card) while generating N DB entries at submit
- **Sentinel key routing** avoided duplicating the entire ContactSelector for rent reminders
- **Dashboard perf stories** were surgical (4 stories, 3 files, 0 regressions)
- **Duplicate key fix** was a clean data-layer fix, not a UI workaround

## What Could Be Improved

- The `useEffect` that regenerates template interventions initially wiped custom entries — should have anticipated dynamic entries from the start
- Card background styling was changed 3 times (grey→white for editable→white for all) — should have applied the design decision globally from the first iteration
- The `rappel_loyer` migration was created early but the type wasn't immediately testable without the UI — could have been story-ordered differently

## New Learnings Added to AGENTS.md

- Learning #097: Multi-contract tenants cause duplicate lot IDs — deduplicate at data layer
- Learning #098: 1-to-N meta-card pattern for recurring interventions
- Learning #099: Key prefix convention for preserving dynamic entries during useEffect template regeneration
- Learning #100: Sentinel key routing for shared component instances

## Patterns Discovered

- **Key prefix as type discriminator**: `custom_`, `retrieve_document_`, `rent_reminders` — lightweight convention for filtering without schema changes
- **Separate config state for meta-cards**: `RentReminderConfig` lives alongside `scheduledInterventions[]` but has its own shape (enabled/dayOfMonth/assignedUsers), expanding to N entities only at submit
- **Set-based dedup at service layer**: When a "get unique X" method traverses junction tables, always deduplicate by entity ID before returning
- **Avatar chips with role coloring**: `ROLE_COLORS` map + `getInitials()` helper — reusable pattern for any contact display

## Anti-Patterns Avoided (or Encountered)

- **Index-based React keys to mask duplicates**: Would have hidden the real bug (showing same logement twice). Fixed at data layer instead.
- **Encoding N recurring items as N editable cards**: Would create UX chaos for 12-60 monthly reminders. Meta-card pattern was the right call.
- **Duplicating ContactSelector for each assignment target**: Sentinel key routing kept a single instance.

## Recommendations for Similar Future Work

1. **When building "generate recurring events" features**: Always use the meta-card pattern — one config card, N entities at submit. Never show N editable cards for periodic data.
2. **When adding dynamic user entries to template-managed lists**: Establish a key prefix convention from day 1. Document it in the component's JSDoc.
3. **When querying through junction tables for "unique entities"**: Add `.filter(dedup)` at the service layer, not the UI. This protects ALL consumers.
4. **When a shared component (selector/modal) serves multiple targets**: Use sentinel keys in the routing field rather than duplicating the component.

## Files Changed (this session's features)

```
lib/constants/property-interventions.ts               | +32 (factory + options)
components/contract/intervention-schedule-row.tsx      | ~93 lines changed (isEditable, delete, styling)
components/property-interventions-step.tsx             | ~104 lines changed (custom section)
components/contract/lease-interventions-step.tsx       | ~317 lines added (rent reminders + custom interventions + contact assignment)
components/contract/contract-form-container.tsx        | ~71 lines added (RentReminderConfig state + submit)
supabase/migrations/20260228100000_add_rappel_loyer_type.sql | +7 (new intervention type)
lib/services/domain/tenant.service.ts                  | +8 (dedup fix)
```
