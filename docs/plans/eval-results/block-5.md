## B5 — Intervention Creation Wizard

**Evaluator:** feature-evaluator agent (Opus 4.6)
**Date:** 2026-03-25

### Files Reviewed (12)
- `app/gestionnaire/(no-navbar)/operations/nouvelle-intervention/page.tsx` (149 lines)
- `app/gestionnaire/(no-navbar)/operations/nouvelle-intervention/nouvelle-intervention-client.tsx` (~2343 lines)
- `app/api/create-manager-intervention/route.ts` (~1279 lines)
- `app/actions/intervention-actions.ts` (createInterventionAction, lines 237-403)
- `components/building-confirmation-step.tsx` (462 lines)
- `components/contract/supplier-confirmation-step.tsx` (261 lines)
- `components/contract/intervention-planner-step.tsx` (467 lines)
- `lib/services/domain/scheduling-service.ts` (partial)
- `lib/intervention-action-utils.ts` (435 lines)
- `lib/validation/schemas.ts` (referenced via import)
- `components/interventions/quote-form.tsx` (partial, for quote_type check)
- `components/intervention/intervention-type-combobox.tsx` (referenced)

---

### Security: 7/10

**Positives:**
- `getServerAuthContext('gestionnaire')` correctly used in `page.tsx` (line 23) — proper server auth pattern
- API route uses `getApiAuthContext({ requiredRole: 'gestionnaire' })` (route.ts line 23) — correct role enforcement
- `createInterventionAction` uses `getServerActionAuthContextOrNull()` with explicit null check (line 257-261)
- Zod schema validation in both the server action (`InterventionCreateSchema`, line 171) and API route (`createManagerInterventionSchema`, line 85)
- Subscription restriction check (`checkLotLockedBySubscription`) before creation (line 264)
- `interventionTeamId` validated as non-null before proceeding (route.ts line 282-291)
- XOR constraint (building_id XOR lot_id) handled via conditional logic: `if (safeSelectedLotId) ... else if (safeSelectedBuildingId)` (route.ts line 224-279) — only one is set, never both

**Issues:**
- [-1] `useServiceRole` option in `createInterventionAction` (line 251) bypasses RLS. While auth is still checked, this is a privilege escalation vector if misused by callers. The parameter is undocumented in the Zod schema.
- [-1] Client sends `teamId` in body (route.ts line 149) which could be tampered with. Although overridden by lot/building team_id when available, the fallback path trusts client-provided `teamId`.
- [-1] No rate limiting on intervention creation endpoint

---

### Patterns: 5/10

**Positives:**
- Server Component loads data, Client Component handles interaction — correct pattern
- Parallel data fetching with `Promise.all` in page.tsx (lines 46-61)
- Step validation (`validateCurrentStep`) checks each step before allowing `handleNext` (line 1484)
- `isMultiSlot` correctly defined as `schedulingType === 'slots' && timeSlots.length >= 2` (line 913) — matches SEIDO spec
- `after()` used for deferred notification (line 379) — correct Next.js 15 pattern
- Data invalidation broadcast after creation: `realtime?.broadcastInvalidation(['interventions', 'stats'])` (line 1724)
- Multi-entity ordering correct: intervention INSERT -> threads -> assignments -> tenant assignments -> confirmation flags (route.ts)

**Issues:**
- [-2] **BLOCKER: File size.** `nouvelle-intervention-client.tsx` is **2343 lines** — nearly 5x the 500-line limit. This is the single worst violation in the codebase. Should be split into step components.
- [-2] **BLOCKER: File size.** `route.ts` is **1279 lines** — 2.5x the limit. Scheduling logic, thread creation, assignment logic, and file upload should be extracted into service functions.
- [-1] **`any` type abuse.** 25 `any` casts in `nouvelle-intervention-client.tsx`, 5 in `page.tsx`. Types like `selectedLogement: any` (line 141), `managers: unknown[]` (line 241), `currentUserTeam: any` (line 244) are explicitly prohibited.
- [-1] Direct Supabase calls in `page.tsx` (line 59: `supabase.from('interventions').select(...)`) bypass the repository pattern
- [-1] `handleSubmit` function (line 1532) logs data and navigates but never actually creates the intervention — dead code confusion. `handleCreateIntervention` (line 1560) is the real handler.
- [-1] Client fetches team via `fetch('/api/user-teams?userId=...')` (line 439) — should use the `teamId` already passed from server component via `initialBuildingsData.teamId`
- [+1] Good use of `useSaveFormState`/`useRestoreFormState` for contact creation redirect flow

---

### Design Quality: 7/10

**Positives:**
- 4-step wizard with `StepProgressHeader` — clear progress indication
- `PropertySelector` reused from building/lot CRUD — consistent component reuse
- `InterventionTypeCombobox` provides searchable type selection
- Step validation with toast feedback on errors
- Double-click protection (`isCreating` flag, line 1562)
- Confirmation summary step (`InterventionConfirmationSummary`) before final submission
- `InterventionPlannerStep` is a well-designed shared component with mobile detection (line 58-65)
- Progressive disclosure in confirmation: lots collapsed by default with expand toggle

**Issues:**
- [-2] No skeleton loading state — the page relies on server-side data loading with no Suspense boundary. If `page.tsx` fails, it renders an empty wizard with `teamId: null` (fallback at line 29-37) with no visual indication of the error.
- [-1] Scheduling step has no visual preview of the selected time — user sees raw date/time inputs without a formatted summary card
- [-1] Building confirmation step (`building-confirmation-step.tsx`) is for building CRUD, not intervention creation — naming is confusing in this context
- [+1] `InterventionPlannerStep` auto-collapses reminder sections on mobile (line 79-88)
- [+1] Unified "add tracking" button with popover distinguishing intervention vs reminder (lines 286-325)

---

### Scores

```
Security:       7/10  |||||||...
Patterns:       5/10  |||||.....
Design Quality: 7/10  |||||||...
---
Weighted Score: 6.4/10
Result: FAIL (Patterns < 5 threshold met at exactly 5, but weighted < 7.0)
```

### Blockers
1. **File size: `nouvelle-intervention-client.tsx` (2343 lines)** — Must split into per-step components
2. **File size: `route.ts` (1279 lines)** — Extract scheduling, threading, assignment logic into services

### Improvements
1. **Type safety:** Replace 25+ `any` casts in wizard client with proper interfaces
2. **Remove dead code:** `handleSubmit` (line 1532) is unused — remove or rename
3. **Eliminate client team fetch:** `loadUserTeam()` duplicates data already available from `initialBuildingsData.teamId`
4. **Repository pattern:** Move the direct Supabase count query in `page.tsx` line 59 to a repository method
5. **Loading states:** Add Suspense boundary or skeleton for the wizard page
6. **Restrict `useServiceRole`:** Consider removing this option from `createInterventionAction` or adding explicit permission checks
