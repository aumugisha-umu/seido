# B14 -- Server Actions (Cross-cutting)

**Evaluator:** feature-evaluator agent (Opus 4.6)
**Date:** 2026-03-25

## Files Reviewed (10)

- `app/actions/intervention-actions.ts` (3411 lines)
- `app/actions/building-actions.ts` (303 lines)
- `app/actions/lot-actions.ts` (199 lines)
- `app/actions/contacts.ts` (176 lines)
- `app/actions/contract-actions.ts` (1506 lines)
- `app/actions/reminder-actions.ts` (625 lines)
- `app/actions/confirm-actions.ts` (519 lines)
- `app/actions/dispatcher-actions.ts` (274 lines)
- `app/actions/conversation-actions.ts` (1283 lines)
- `app/actions/notification-actions.ts` (1954 lines)

---

## Security: 8/10

**Positives:**
- `getServerActionAuthContextOrNull()` used consistently across ALL action files:
  - `intervention-actions.ts`: every action (createInterventionAction, getInterventionAction, updateInterventionAction, approveInterventionAction, rejectInterventionAction, etc.)
  - `building-actions.ts`: updateCompleteProperty (line 131), getBuildingWithRelations (implicit via service)
  - `lot-actions.ts`: updateCompleteLot (line 76)
  - `contract-actions.ts`: 4 occurrences confirmed
  - `reminder-actions.ts`: ALL 7 actions with `getServerActionAuthContextOrNull('gestionnaire')` -- includes role restriction
  - `dispatcher-actions.ts`: both dispatchInterventionCreated (line 53) and dispatchInterventionStatusChange (line 155)
  - `conversation-actions.ts`: uses getServerActionAuthContextOrNull consistently
- Zod validation present in key action files:
  - `intervention-actions.ts`: InterventionCreateSchema, InterventionUpdateSchema, TimeSlotSchema, InterventionFiltersSchema
  - `lot-actions.ts`: updateCompleteLotSchema with field-level validation
  - `reminder-actions.ts`: ReminderCreateSchema, ReminderUpdateSchema with UUID validation on all IDs
- Role-based access control enforced:
  - Approve/reject/start-planning/finalize: restricted to `['gestionnaire', 'admin']`
  - CompleteByProvider: restricted to `role === 'prestataire'`
  - ValidateByTenant: restricted to `role === 'locataire'`
  - Reminder actions: all restricted to `'gestionnaire'` role
- Subscription lot lock check (`checkLotLockedBySubscription`, `checkInterventionLotLocked`) before every mutating intervention action
- Fail-open pattern on subscription check failure (line 141-143) -- doesn't block users if subscription service is down
- `after()` used for deferred notification work (non-blocking)
- UUID format validation on intervention IDs (regex check, line 556)

**Issues:**
- (-1) **B14-SEC-1**: `createCompleteProperty` (building-actions.ts line 26-89) has NO explicit auth context check. The composite service creates the client via `createServerActionCompositeService()` which uses cookies implicitly, but the action itself never validates the caller. Confirmed from B2 findings -- still unfixed.
- (-1) **B14-SEC-2**: `contacts.ts` server actions (`getTeamContactsAction`, `getTeamContactsByRoleAction`) lack explicit auth context. They use `createServerActionSupabaseClient()` directly, trusting the `teamId` parameter from client. RLS provides implicit protection but explicit validation is the project pattern. Confirmed from B4 findings.

---

## Patterns: 5/10

**Positives:**
- Service layer delegation: Most actions delegate to services (`createServerActionInterventionService()`, `createServerActionReminderService()`, etc.) rather than direct DB queries
- Repository pattern used via services for intervention CRUD, reminder CRUD
- `Promise.allSettled` for batch operations (createBatchRentRemindersAction line 523, assignUserAction batch)
- `Promise.all` for parallel slot updates (line 484) and batch assignments
- Deferred work via `after()` for notifications and activity logging
- Proper error propagation: `NEXT_REDIRECT` correctly re-thrown (line 398)
- Data invalidation broadcast: reminder actions broadcast `['reminders']`, intervention wizard broadcasts `['interventions', 'stats']`

**Issues:**
- (-2) **BLOCKER: File sizes vastly exceed 500-line limit:**
  - `intervention-actions.ts`: **3411 lines** (6.8x limit) -- contains create, batch create, get, update, assignments, 8 status transitions, time slot operations, time slot responses. Should be split into at least 5 files.
  - `notification-actions.ts`: **1954 lines** (3.9x limit) -- 20 notification creation functions
  - `contract-actions.ts`: **1506 lines** (3x limit) -- lease + supplier contract management
  - `conversation-actions.ts`: **1283 lines** (2.6x limit) -- thread management + messaging
- (-1) `any` types in action files: 21 occurrences across 7 files. Notable: `building-actions.ts` line 278 (`contactsCount: (result.data as any).building_contacts?.length`), `confirm-actions.ts` line 86-96 (4 `as any` casts on verifyOtp type param), `notification-actions.ts` (6 occurrences)
- (-1) Direct Supabase calls bypass repository pattern in several actions:
  - `intervention-actions.ts`: cancelQuoteAction (lines 1316-1341) does direct `.from('intervention_quotes')` queries
  - `intervention-actions.ts`: cancelTimeSlotAction (lines 1767-1833) does direct `.from('intervention_time_slots')` queries
  - `intervention-actions.ts`: updateInterventionAction (lines 686-998) has extensive direct DB operations for assignments, time slots, confirmation requirements, documents
  - `lot-actions.ts`: direct `.from('lot_contacts')` delete+insert (lines 140-175)
- (-1) Missing Zod validation in some actions:
  - `building-actions.ts`: no Zod schema for `createCompleteProperty` or `updateCompleteProperty` inputs
  - `contacts.ts`: no Zod validation on `teamId` parameter
  - `contract-actions.ts`: supplier contract actions reference external schema but not visible inline
- (-1) Notification triggers inconsistent: `createInterventionAction` uses `after()` for deferred notification, but many status transition actions (approve, reject, finalize) don't trigger any notification at all. The notification dispatch is left to the client-side or is absent.

---

## Design Quality: N/A (cross-cutting -- no UI)

Server actions are backend code. Design Quality axis is not applicable. Scored as 7/10 (neutral) for weighted calculation purposes, based on:
- Good error messages in French for user-facing errors
- Consistent `ActionResult<T>` type across all action files
- Deferred logging pattern provides good audit trail

---

## Scores

```
Security:       8/10  ||||||||..
Patterns:       5/10  |||||.....
Design Quality: 7/10  |||||||... (N/A -- neutral score)
---
Weighted Score: 6.8/10
Result: FAIL (Weighted < 7.0, Patterns at threshold)
```

## Blockers

1. **B14-FILE-1**: `intervention-actions.ts` at 3411 lines -- must split into:
   - `intervention-crud-actions.ts` (create, get, update, getAll)
   - `intervention-status-actions.ts` (approve, reject, plan, complete, finalize, cancel)
   - `intervention-assignment-actions.ts` (assign, unassign)
   - `intervention-timeslot-actions.ts` (propose, select, cancel, accept, reject slots)
   - `intervention-quote-actions.ts` (request, cancel quotes)
2. **B14-FILE-2**: `notification-actions.ts` at 1954 lines -- split by notification domain
3. **B14-FILE-3**: `contract-actions.ts` at 1506 lines -- split lease vs supplier
4. **B14-SEC-1**: `createCompleteProperty` missing explicit auth check
5. **B14-SEC-2**: `contacts.ts` actions missing explicit auth context

## Improvements

1. **CRITICAL**: Split oversized action files (4 files > 1000 lines)
2. **HIGH**: Add explicit auth checks to `createCompleteProperty` and `contacts.ts` actions
3. **HIGH**: Move direct Supabase calls in intervention-actions (quote cancel, time slot cancel, assignment updates) into repository methods
4. **MEDIUM**: Add Zod validation to `createCompleteProperty` and `contacts.ts`
5. **MEDIUM**: Standardize notification triggers -- every status transition should trigger appropriate notifications (many are missing)
6. **LOW**: Replace `any` casts with proper types (21 occurrences across action files)

## Cross-Block Correlations

| Finding | Also Found In |
|---------|---------------|
| `createCompleteProperty` missing auth | B2 (first identified) |
| `contacts.ts` missing auth context | B4 (first identified) |
| Oversized action files | B5, B6, B8 (client files also oversized) |
| Direct Supabase in actions | B10 (mail page), B12/B13 (role detail pages) |
| Missing Zod validation | B4 (contacts), B8 (contracts) |
