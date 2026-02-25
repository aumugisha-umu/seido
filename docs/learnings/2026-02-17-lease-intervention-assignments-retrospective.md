# Retrospective: Lease-Created Intervention Assignments Fix

**Date:** 2026-02-17
**Duration:** ~20 min (plan + implementation)
**Branch:** preview

## What Went Well
- Clean plan: the fix was straightforward once the root cause was identified (raw INSERT vs service call)
- The existing `assignUserAction()` already accepted `'locataire'` — only the service layer needed widening
- Thread creation logic (line 690) already handled non-prestataire roles via the ternary (`tenant_to_managers`)
- `Promise.allSettled` pattern was already established in the codebase (intervention-create-form.tsx)

## What Could Be Improved
- The raw INSERT was in the codebase since the lease feature was built — could have been caught earlier with a code review checking "does this code path match the UI path?"
- No automated test covers "lease creates intervention with threads" — a future integration test would prevent regression

## New Learnings Added to AGENTS.md
- Learning #041: Bulk INSERT bypasses business logic — use centralized service actions

## Patterns Discovered
- **Service Parity Pattern**: When an automated/background process does the same thing as a UI flow, it MUST use the same service/action — not a raw DB operation. This ensures all side effects (threads, notifications, activity logs) are consistently applied.

## Anti-Patterns Avoided
- Raw bulk INSERT for operations with business-logic side effects → replaced with centralized `assignUserAction()`
- `Promise.all` for non-critical multi-operations → used `Promise.allSettled` instead (one failure shouldn't block others)

## Recommendations for Similar Future Work
- When adding a new code path that creates/modifies data, always check: "Is there an existing service/action for this?" If yes, use it.
- When widening a type (like adding `'locataire'` to a role union), add the corresponding validation guard immediately.

## Files Changed
- `app/actions/intervention-actions.ts` — replaced raw INSERT block with `assignUserAction()` calls
- `lib/services/domain/intervention-service.ts` — widened `assignUser()` role type + added locataire validation
