# B15 -- Services + Repositories (Cross-cutting)

**Evaluator:** feature-evaluator agent (Opus 4.6)
**Date:** 2026-03-25

## Files Reviewed (9)

- `lib/services/domain/intervention-service.ts` (2959 lines)
- `lib/services/domain/reminder.service.ts` (139 lines)
- `lib/services/domain/subscription.service.ts` (200+ lines read)
- `lib/services/repositories/intervention.repository.ts` (942 lines)
- `lib/services/repositories/building.repository.ts` (761 lines)
- `lib/services/repositories/lot.repository.ts` (777 lines, partial read)
- `lib/services/repositories/contact.repository.ts` (513 lines, partial read)
- `lib/services/repositories/supplier-contract.repository.ts` (~240 lines)
- `lib/services/repositories/reminder.repository.ts` (281 lines)

---

## Security: 9/10

**Positives:**
- RLS-as-authorization pattern consistently followed: repositories do NOT contain manual auth checks. All queries flow through authenticated Supabase clients where RLS policies enforce access.
- InterventionService explicitly documents this pattern: "NO CUSTOM PERMISSION CHECK - RLS handles it" (intervention-service.ts line 201)
- Service layer properly delegates to repositories -- no direct DB calls in service constructors
- SubscriptionService uses DI (constructor injection) for Stripe, SubscriptionRepository, StripeCustomerRepository -- testable and secure
- Contact repository uses separate queries to avoid RLS silent failures with PostgREST relations (documented decision)
- Reminder repository filters `is('deleted_at', null)` consistently
- Supplier contract repository filters `is('deleted_at', null)` consistently
- `createServiceRoleSupabaseClient()` used only where justified (subscription checks, service-level operations)
- Factory functions provide 3 contexts (browser, server, server-action) with appropriate auth levels

**Issues:**
- (-1) InterventionService `getAll()` fallback path (line 243-266) does raw `supabase.from('users').select(...).single()` to find user's team -- this is a deprecated path (commented as such) but still present. Should be removed since callers should pass `teamId` explicitly.

---

## Patterns: 6/10

**Positives:**
- BaseRepository inheritance pattern used consistently: all 6 repositories extend `BaseRepository<T, TInsert, TUpdate>`
- Validation hooks (`protected async validate()`) in repositories: InterventionRepository, BuildingRepository, LotRepository, ContactRepository
- Promise.all for parallel queries:
  - `intervention.repository.ts`: `findByIdWithRelations` uses 2-phase parallel fetching (lines 106-134, then 152-173) -- optimized from single 7-JOIN query to parallel queries
  - `reminder.repository.ts`: `getStats()` uses `Promise.all` for 3 parallel count queries (line 168)
  - `contact.repository.ts`: `findByIdWithRelations` fetches company+team in parallel (line 114)
- N+1 prevention:
  - InterventionService `getByLotIds()` uses single `.in('lot_id', lotIds)` query (line 368)
  - InterventionService `getByBuildingWithLots()` uses `.or()` filter (line 396)
  - SupplierContractRepository `findByLotIds()` (line 104) -- batch N+1 prevention
- ReminderRepository uses `.limit(1)` correctly in `findByIdWithRelations` (line 83)
- BuildingRepository uses `.limit(1).maybeSingle()` in `findByNameAndTeam` (line 526-527)
- Count-only queries: `{ count: 'exact', head: true }` in reminder stats (lines 176-188)
- Error handling: repositories use structured `createErrorResponse(handleError())` pattern
- InterventionService uses custom exception types (ValidationException, ConflictException, PermissionException, NotFoundException)
- Reminder service is exemplary: 139 lines, clean delegation, no bloat

**Issues:**
- (-1) **BLOCKER: File sizes exceed limits:**
  - `intervention-service.ts`: **2959 lines** (5.9x limit) -- contains CRUD, status transitions, multi-provider assignment, quote handling, conversation thread creation, notification dispatch, activity logging. Should be split into InterventionCrudService, InterventionWorkflowService, InterventionAssignmentService.
  - `intervention.repository.ts`: **942 lines** (1.9x limit)
  - `building.repository.ts`: **761 lines** (1.5x limit)
  - `lot.repository.ts`: **777 lines** (1.6x limit)
- (-1) **`.single()` used extensively across repositories** -- 90+ occurrences found across all repository files. While many are for primary key lookups (acceptable), several are used in team-scoped queries:
  - `subscription.repository.ts`: `findByTeamId` uses `.single()` (line 38, 49, 60, 70) -- if a team ever has 2 subscription rows, this crashes
  - `stripe-customer.repository.ts`: `findByTeamId` uses `.single()` (line 36, 47)
  - `team.repository.ts`: 9 `.single()` calls -- some on unique lookups (OK) but `findTeamForUser` and similar could have edge cases
  - `building.repository.ts`: `findByIdWithRelations` uses `.single()` (line 287) -- OK for PK lookup
  - **Contrast with reminder.repository.ts which correctly uses `.limit(1)`** (line 83)
- (-1) `any` types in services/repositories:
  - `intervention-service.ts`: **17 occurrences** including `(addr: any)`, `formatAddressFromRecord(addressRecord?: any)`, service method return types
  - `intervention.repository.ts`: 2 occurrences (`(addr: any)` in findByIdWithRelations)
  - `building.repository.ts`: `(bc: { user?: { role?: string }; is_primary?: boolean })` -- typed inline but `eslint-disable @typescript-eslint/no-explicit-any` at line 301-302, 386-387
  - `contact.repository.ts`: 1 occurrence (line 84 `contact: any` in `getTeamContactsAction`)
- (-1) Some sequential query patterns where parallel would be better:
  - `building.repository.ts` `upsertMany()` (line 549-589): processes buildings sequentially with `for` loop -- should batch with `Promise.all` or use bulk upsert
  - `intervention-service.ts`: several methods do sequential queries that could be parallelized

---

## Design Quality: N/A (cross-cutting -- no UI)

Services and repositories are backend code. Design Quality axis scored as 7/10 (neutral) for weighted calculation:
- Good module structure with factory functions per context
- Clean service->repository delegation in reminder module (exemplary)
- Well-documented optimization comments in intervention repository
- Structured error handling with custom exception types

---

## Scores

```
Security:       9/10  |||||||||.
Patterns:       6/10  ||||||....
Design Quality: 7/10  |||||||... (N/A -- neutral score)
---
Weighted Score: 7.5/10
Result: PASS
```

## Blockers

None (weighted >= 7.0, no axis < 5.0)

## Improvements

1. **HIGH**: Split `intervention-service.ts` (2959 lines) into 3-4 focused service classes:
   - `InterventionCrudService` (CRUD + queries)
   - `InterventionWorkflowService` (status transitions + notifications)
   - `InterventionAssignmentService` (multi-provider, threading)
2. **HIGH**: Audit `.single()` usage across repositories -- replace with `.limit(1).maybeSingle()` for team-scoped queries (subscription, stripe-customer, team repos). Keep `.single()` only for PK lookups.
3. **HIGH**: Split oversized repositories:
   - `building.repository.ts` (761 lines): extract search, city, nearby, bulk operations
   - `lot.repository.ts` (777 lines): extract search, category, stats operations
   - `intervention.repository.ts` (942 lines): extract tenant/provider-specific queries
4. **MEDIUM**: Replace `any` types in intervention-service.ts (17 occurrences) with proper interfaces
5. **MEDIUM**: Parallelize `upsertMany` in building.repository.ts -- use `Promise.all` with chunking instead of sequential loop
6. **LOW**: Remove deprecated `getAll()` fallback path in intervention-service.ts (lines 232-266)
7. **LOW**: Add `.limit(1)` to subscription.repository.ts team lookups

## Cross-Block Correlations

| Finding | Also Found In |
|---------|---------------|
| Oversized files | B2 (building-details 680L), B3 (lot-details 909L), B5 (wizard 2343L), B6 (detail 2405L), B8 (contract-form 1728L) |
| `.single()` on team queries | B2 (noted as acceptable for PK), memory bank (documented pitfall) |
| `any` type abuse | B1 (6 in dashboard), B2 (14+5), B3 (lot-details), B5 (25+), B12 (20+), B13 (46) |
| N+1 prevention via batch | B1 (batch enrichment), B6 (parallel Step 2 queries), B9 (parallel stats) |
| Exemplary module | B9 (reminder) is the gold standard: clean 3-layer, no `any`, proper validation |
