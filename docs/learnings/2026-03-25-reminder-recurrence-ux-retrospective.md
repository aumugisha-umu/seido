# Retrospective: Reminder Recurrence UX & Property Reclassification

**Date:** 2026-03-25
**Duration:** ~3h (across 2 sessions)
**Stories Completed:** 7 / 7
**Branch:** preview

## What Went Well
- Brainstorming session (sp-brainstorming) produced a clean design with 4 user-validated decisions
- Ralph orchestrator decomposed into 7 well-scoped stories with correct dependency ordering
- Lightweight RRULE utility avoided heavy client-side dependency — rrule.js stays server-only
- Per-row toggle + recurrence popover UI is clean and consistent across all 4 wizards
- Template reclassification was straightforward — all 3 constant files updated with explicit itemType

## What Could Be Improved
- The composite lot creation path was missed during initial US-006 implementation — discovered only when reading `buildCompositeInterventions`
- The assignableRoles bug from a previous session was caused by a subtle nullish coalescing precedence issue — could have been caught by a more systematic prop-flow review
- Supplier server action `createReminderInterventions` had to be refactored from direct service calls to `createWizardRemindersAction` — this coupling wasn't visible from the design doc

## New Learnings Added to AGENTS.md
- Learning #187: Nullish coalescing prop override trap — derived boolean must win over passed prop
- Learning #188: `after()` auth context risk — fire-and-forget from client for auth-dependent operations
- Learning #189: Audit ALL submit paths before adding dispatch split — parallel code paths hide silently

## Patterns Discovered
- **RecurrencePopoverContent extraction** — Shared popover with synced custom fields from current RRULE, avoidable duplication between badge and ghost button triggers
- **Fire-and-forget reminder pattern** — After composite action returns `createdLots`, call `createWizardRemindersAction` client-side where auth is still fresh
- **Section unification** — When per-row type discriminant exists, section-level grouping is redundant and confusing

## Anti-Patterns Avoided
- Putting auth-dependent operations inside `after()` — caught before it caused production issues
- Sending all items through a single dispatch regardless of itemType — split early prevents data loss

## Recommendations for Similar Future Work
- When adding a new dispatch dimension (e.g., splitting by status, priority), grep ALL submit entry points first
- Keep `after()` for service-role operations only; user-auth operations belong in the request lifecycle
- When a component prop can be overridden by internal state, use `internalState ? override : (prop ?? default)` — never `prop ?? (internalState ? ...)`

## Files Changed
- `lib/utils/rrule.ts` (NEW)
- `lib/constants/property-interventions.ts`
- `lib/constants/supplier-interventions.ts`
- `lib/types/supplier-contract.types.ts`
- `components/contract/intervention-schedule-row.tsx`
- `components/contract/intervention-planner-step.tsx`
- `components/contract/lease-interventions-step.tsx`
- `components/contract/contract-form-container.tsx`
- `components/property-interventions-step.tsx`
- `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/building-creation-form.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
- `app/actions/supplier-contract-actions.ts`
