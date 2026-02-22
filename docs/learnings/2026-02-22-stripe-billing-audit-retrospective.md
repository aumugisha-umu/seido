# Retrospective: Stripe Billing Audit Fixes + Trial Overage Lot Restriction

**Date:** 2026-02-22
**Duration:** ~4 hours (audit + implementation)
**Stories Completed:** 12/12 (6 trial overage + 6 audit fixes)
**Branch:** feature/stripe-subscription

## What Went Well
- Ralph methodology kept implementation focused and traceable (12 stories, 0 regressions)
- Parallel audit agents (3 agents) covered backend, UI, and restriction system in ~5 minutes total
- Fail-open/fail-closed layered architecture gives security without bricking the app
- canAddProperty(count) pattern prevents batch bypass while maintaining backward compatibility (count=1 default)
- CSS overlay technique for locked lots avoids opacity inheritance issue elegantly

## What Could Be Improved
- Audit agents produce false positives (2/10 CRITICALs were wrong) — need to read full call chains
- Lot edit page was missed in the original lot restriction feature — should have used CRUD checklist from the start
- `mapStripeStatus` was duplicated across 3 files during initial Stripe integration — should consolidate immediately when creating utility functions
- No integration tests for lot restriction bypass scenarios (server action with locked lot_id)

## New Learnings Added to AGENTS.md
- Learning #072: CRUD completeness — gate ALL routes when restricting access
- Learning #073: Boolean canAdd() insufficient for batch — use canAdd(count)
- Learning #074: Layered fail behavior — fail-closed at service, fail-open at page
- Learning #075: Consolidate status mapping to avoid 3-file drift
- Learning #076: Always verify audit findings against actual code before implementing
- Learning #077: CSS opacity inheritance — use overlay, not parent opacity

## Patterns Discovered

### Layered Fail Pattern
Service-level error = fail-closed (conservative, security-first)
Page-level error = fail-open (permissive, UX-first)
This gives a safety net at both levels without being too strict or too loose.

### CRUD Access Checklist
When restricting access to an entity, check ALL routes:
- `[id]/page.tsx` (detail view)
- `nouveau/page.tsx` (creation)
- `modifier/[id]/page.tsx` (edit)
- All server actions (create, update, delete, status changes)

### Quota Check with Count Parameter
`canAddProperty(teamId, count = 1)` — simple change that prevents batch bypass.
Pattern: `actualLots + count <= limit` instead of `actualLots < limit`.

## Anti-Patterns Avoided
- **Audit-driven blind fixes**: 2/10 "CRITICALs" were false positives. Always verify before implementing.
- **Boolean quota checks for batch ops**: `canAdd()` was true even when adding 5 lots with 1 slot.
- **Fail-open everywhere**: DB query error in getAccessibleLotIds granted full access.

## Recommendations for Similar Future Work
1. When adding access control to any entity, use the CRUD checklist immediately
2. When creating any mapping/utility function, consolidate to ONE location from the start
3. Parallel audit agents are valuable but always verify findings before implementing
4. Paused subscription status needs explicit handling — it's easy to forget since it's rare
5. Error boundaries should wrap billing/subscription components from day 1

## Files Changed (Audit Fixes)
- lib/services/domain/subscription.service.ts (paused status, canAddProperty count, fail-closed)
- lib/services/domain/stripe-webhook.handler.ts (consolidated mapStripeStatus)
- app/actions/subscription-actions.ts (consolidated mapStripeStatus)
- app/actions/building-actions.ts (updateCompleteProperty gate, count param)
- app/gestionnaire/(no-navbar)/biens/lots/modifier/[id]/page.tsx (subscription gate)
- hooks/use-subscription.ts (hasError boolean)
- components/settings-page.tsx (BillingErrorBoundary)
