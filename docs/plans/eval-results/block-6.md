## B6 — Intervention Detail + Status Transitions (Gestionnaire)

**Evaluator:** feature-evaluator agent (Opus 4.6)
**Date:** 2026-03-25

### Files Reviewed (8)
- `app/gestionnaire/(no-navbar)/operations/interventions/[id]/page.tsx` (449 lines)
- `app/gestionnaire/(no-navbar)/operations/interventions/[id]/components/intervention-detail-client.tsx` (~2405 lines)
- `app/gestionnaire/(no-navbar)/operations/interventions/modifier/[id]/page.tsx` (referenced)
- `app/actions/intervention-actions.ts` (approve, reject, cancel, finalize actions — lines 1161-1580)
- `lib/intervention-action-utils.ts` (435 lines — getRoleBasedActions, getDotMenuActions)
- `lib/services/domain/intervention-service.ts` (partial — service layer)
- `lib/services/domain/scheduling-service.ts` (partial — scheduling logic)
- `components/interventions/shared/` (shared cards, layout, types)

---

### Security: 8/10

**Positives:**
- `getServerAuthContext('gestionnaire')` correctly used in `page.tsx` (line 68) — proper server auth
- Subscription read-only check: redirects to list when subscription `is_read_only` (lines 71-82)
- All status transition actions (`approveInterventionAction`, `rejectInterventionAction`, `cancelInterventionAction`, `finalizeByManagerAction`) use `getServerActionAuthContextOrNull()` with explicit auth check
- Role check: `['gestionnaire', 'admin'].includes(user.role)` in approve (line 1174), reject (line 1223), cancel (line 1590-derived), finalize (line 1547)
- Subscription lot lock check (`checkInterventionLotLocked`) before every status change
- Rejection requires minimum 10-character reason (line 1227-1228)
- `notFound()` returned when intervention not found (line 104) — no data leakage
- Dynamic metadata (`generateMetadata`) uses separate lightweight query (lines 28-60)

**Issues:**
- [-1] `generateMetadata` creates its own Supabase client (line 32) instead of reusing the cached `getServerAuthContext` — potential auth bypass for metadata query (read-only, low risk)
- [-1] Address loading in `page.tsx` (lines 344-403) does 3 sequential queries instead of being included in the Step 2 parallel batch. Missed parallelization opportunity.

---

### Patterns: 5/10

**Positives:**
- Parallel data loading: 10 queries in `Promise.all` for Step 2 (lines 121-285) — buildings, lots, assignments, documents, quotes, time slots, threads, comments, linked interventions, reports
- Repository pattern used for intervention loading: `interventionRepo.findByIdWithRelations(id)` (line 96)
- Thread messages and participants pre-fetched and grouped by thread_id server-side (lines 303-333) — eliminates N+1 on client
- Batch unread counts via RPC `get_thread_unread_counts` (line 232) — single call instead of N queries
- `getRoleBasedActions` centralizes action-per-status logic in `intervention-action-utils.ts` — single source of truth
- Status-to-action mapping covers all 9 statuses for gestionnaire:
  - `demande` -> Traiter demande, Demander details
  - `approuvee` -> Planifier
  - `planification` -> Gerer planification
  - `planifiee` -> Cloturer, Modifier planification
  - `cloturee_par_prestataire` -> Cloturer, Relancer locataire
  - `cloturee_par_locataire` -> Cloturer
  - `rejetee` -> (dot menu only: Modifier/Cancel)
  - `cloturee_par_gestionnaire` -> (terminal, no actions)
  - `annulee` -> (terminal, no actions)
- Dot menu (Modifier/Annuler) available on all non-terminal statuses (lines 410-414)
- Data invalidation broadcast after every mutation: 7 sites found with `broadcastInvalidation(['interventions', 'stats'])`

**Issues:**
- [-2] **BLOCKER: File size.** `intervention-detail-client.tsx` is **2405 lines** — nearly 5x the 500-line limit. Tabs, modals, action handlers, and card rendering should be split.
- [-1] 20 `any` casts in `intervention-detail-client.tsx` — violates no-any rule
- [-1] Direct Supabase queries in `page.tsx` Step 2 (lines 132-285) instead of repository methods. The parallel batch contains 9 raw `.from()` calls mixed with 1 repository call.
- [-1] `lastMessageByThread` typed as `Record<string, any>` (page.tsx line 221) — should use proper message type
- [-1] Missing status: `getGestionnaireActions` has no case for `rejetee` — it falls through to `default: return []`. While the dot menu still shows Modifier/Annuler, there's no primary action to reopen a rejected intervention (the `reopen` actionType exists in the type but is never used).
- [+1] Good use of lazy-loaded components: `CancelConfirmationModal` loaded via `dynamic(() => import(...), { ssr: false })` (line 148)

---

### Design Quality: 7/10

**Positives:**
- Tabbed interface (`EntityTabs` with `getInterventionTabsConfig`) — consistent with other entity detail pages
- Shared card components (`InterventionDetailsCard`, `CommentsCard`, `DocumentsCard`, `QuotesCard`, `PlanningCard`, `ReportsCard`) — reusable across roles
- `DetailPageHeader` with status badge, metadata chips, and action buttons
- Quote status utilities (`getQuoteBadgeStatus`, `getQuoteBadgeLabel`, `getQuoteBadgeColor`) — consistent badge rendering
- Google Maps preview for intervention location (line 154)
- `InterventionContactsNavigator` for participant grid/list views
- Activity tab with `useActivityLogs` hook
- Conversation threads fully pre-loaded server-side (no client loading spinners for initial render)

**Issues:**
- [-2] No skeleton loading state at the page level — relies on server-side rendering. Error fallback is `notFound()` which is correct but abrupt.
- [-1] `PlanningCard` and execution tab show complex time slot UI but no visual timeline/Gantt — could benefit from a horizontal timeline component
- [+1] Role-based action buttons adapt per status — correct action affordances
- [+1] Document upload via dedicated `DocumentUploadDialog` modal
- [+1] Linked interventions section (`LinkedInterventionsSection`) for multi-provider mode visibility

---

### Scores

```
Security:       8/10  ||||||||..
Patterns:       5/10  |||||.....
Design Quality: 7/10  |||||||...
---
Weighted Score: 6.8/10
Result: FAIL (weighted < 7.0)
```

### Blockers
1. **File size: `intervention-detail-client.tsx` (2405 lines)** — Must decompose into tab-specific components and extract modal/handler logic

### Improvements
1. **Type safety:** Replace 20 `any` casts with proper types (especially `lastMessageByThread`, `threadParticipants`)
2. **Repository pattern:** Move the 9 raw Supabase queries in `page.tsx` Step 2 into repository methods. Consider a dedicated `InterventionDetailRepository.loadFullDetail(id)` method.
3. **Parallelize address loading:** Include address queries in the Step 2 `Promise.all` instead of sequential Step 3
4. **Add `rejetee` primary action:** Consider adding "Reviser decision" or "Rouvrir" as a primary action for rejected interventions
5. **Loading states:** Add `loading.tsx` with skeleton matching the detail page layout
6. **Metadata query:** Reuse `getServerAuthContext` cache instead of creating a separate Supabase client in `generateMetadata`
