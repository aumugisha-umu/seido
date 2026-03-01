# Retrospective: Dashboard Perf & Building Tenant Conversations Fix

**Date:** 2026-03-01
**Stories Completed:** 4/4 (dashboard perf) + 1 bug fix + 1 tab rename
**Branch:** preview

## What Went Well
- PeriodSelector removal was clean — no breaking changes thanks to optional progressData prop
- `usePagination` hook reuse for cards view (fixed 12) — zero new components needed
- Scheduled_date sort with 3-tier logic (null → overdue → upcoming) matched field service management best practices
- Building tenant conversation bug was diagnosed quickly once the thread creation code was read

## What Could Be Improved
- The building-level tenant flow should have been caught during the original implementation — the two code paths (lot vs building) were independently developed and never tested for thread creation parity
- The duplicated tenant resolution code (80+ lines for lot, 60+ for building) was a smell that could have been unified earlier

## New Learnings Added to AGENTS.md
- Learning #096: Building-level tenant data must be resolved BEFORE thread creation — client only sends lot-level IDs

## Patterns Discovered
- **Pre-resolve pattern**: When a dependent step assumes client-sent data, but some code paths resolve data server-side, inject the server-resolved data BEFORE the dependent step — not after
- **Unified assignment path**: By pre-resolving `resolvedTenantIds`, both lot and building assignment code was unified into a single 30-line block (was 80+ lines duplicated)

## Anti-Patterns Encountered
- **Implicit client contract**: Thread creation assumed `selectedTenantIds` was always populated by the client. Building-level silently sent `[]`, so no error was thrown — just missing threads
- **Late data resolution**: The building tenant fetch was placed after thread creation because it was originally written for the assignment step only

## Recommendations for Similar Future Work
- When adding a new housing type (e.g., "complex" or "portfolio-level"), audit ALL steps in the creation flow that depend on participant IDs
- The `resolvedTenantIds` pattern should be replicated for providers if provider assignment ever gains a building-level auto-resolve path
- Thread creation + assignment should ideally share a single "resolve participants" step at the top of the function

## Files Changed
- `app/api/create-manager-intervention/route.ts` — Early building tenant resolution + unified assignment
- `components/dashboards/manager/manager-dashboard-v2.tsx` — Removed PeriodSelector, layout fixes
- `components/interventions/interventions-navigator.tsx` — rejetee filter, scheduled sort, tab rename
- `components/interventions/interventions-view-container.tsx` — Cards pagination (pageSize: 12)
