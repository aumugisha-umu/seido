## B12 — Prestataire: Intervention Flow

**Evaluator:** feature-evaluator agent (GAN pattern)
**Date:** 2026-03-25

### Files Reviewed (8 files)

- `app/prestataire/layout.tsx` (root layout)
- `app/prestataire/(with-navbar)/dashboard/page.tsx` (dashboard server)
- `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` (detail server, 315 lines)
- `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` (detail client, **1163 lines**)
- `app/prestataire/(with-navbar)/profile/page.tsx` (profile wrapper)
- `components/dashboards/provider/provider-dashboard-v2.tsx` (dashboard client, 59 lines)
- `components/intervention/provider-availability-selection.tsx` (slot selection, **671 lines**)
- `components/intervention/intervention-action-panel-header.tsx` (action panel, shared)

---

### Security: 7/10

**Positives:**
- `getServerAuthContext('prestataire')` used consistently in all server pages (layout:29, dashboard:23, detail:24)
- Assignment check gate before loading intervention data (detail page.tsx:34-48) — user must be assigned as `prestataire` to the intervention
- Subscription block check with in-progress exception (detail page.tsx:51-67) — correct business logic
- Action buttons gated by `userRole` in `InterventionActionButtons` — prestataire cannot approve/reject/assign
- Quote queries scoped to `provider_id === userData.id` (detail page.tsx:137)
- `validateByTenantAction` and `approveIntervention` are gestionnaire-only server actions — prestataire calling them would fail

**Concerns:**
- **Service role client used 4 times** in detail page.tsx (lines 143, 221, 251, 266) for conversation data — bypasses all RLS. Justified by comment "user already verified as assigned above" but creates a broad escalation surface. If the assignment check were ever bypassed, all conversation data for any intervention would leak. (-1)
- **Direct Supabase mutation in client component** — `intervention-detail-client.tsx` lines 662-684 and 699-717 use `createBrowserSupabaseClient().from('intervention_quotes').update(...)` directly, bypassing the repository pattern. RLS should protect, but this violates architectural discipline. (-1)
- **No Zod validation** on quote rejection/cancellation in the client-side handlers (lines 652-717) — relies entirely on RLS. (-1)

---

### Patterns: 5/10

**Positives:**
- Promise.all parallelization in both dashboard (page.tsx:26) and detail (page.tsx:70, 100-283)
- Shared components used (`InterventionDetailsCard`, `DocumentsCard`, `PlanningCard`, `QuotesCard`, `ReportsCard`, `EntityTabs`)
- Data invalidation broadcast via `realtime?.broadcastInvalidation(['interventions'])` after mutations
- `useAutoExecuteAction` hook for email magic link deep-links
- `useDocumentActions` shared hook for document preview/download

**Concerns:**
- **`intervention-detail-client.tsx` is 1163 lines** — over 2x the 500-line limit. Contains slot transformation logic, quote management, multiple modal states, and all tab content in a single component. (-1)
- **`provider-availability-selection.tsx` is 671 lines** — exceeds 500-line limit. Combines selection UI, modification mode, empty state, and validation. (-1)
- **`any` types pervasive**: `stats: any` and `interventions: any[]` in `provider-dashboard-v2.tsx` (line 12-13), `Record<string, any>` x3 in detail page.tsx (lines 163, 240, 268), 20+ `as any` casts in client component. (-1)
- **`console.error` in production code**: 3 occurrences in `intervention-detail-client.tsx` (lines 680, 714, 1026). (-1)
- **`logger: any` with eslint-disable** in dashboard page.tsx (line 9-10) — forced type suppression. (-1)
- **15 direct `.from()` calls in server page** (detail page.tsx) instead of repository methods — extensive bypass of the repository pattern for a single page load. (-1)
- **Conversation thread code duplicated** across prestataire and locataire detail pages (fetching threads, messages, participants with service role) — should be a shared utility or repository method. (-1)
- **`useInterventionPlanning` not used** — prestataire detail manually manages slot response modals with local state instead of the shared hook that locataire uses. Missed reuse opportunity. (-1)

---

### Design Quality: 7/10

**Positives:**
- Dashboard uses `InterventionsNavigator` with `tabsPreset="prestataire"` — role-specific tab configuration (+1)
- Unread messages section shown at dashboard top with role-specific routing (+1)
- Detail page uses shared `DetailPageHeader` with status badges, urgency indicators, and metadata
- Planning/scheduling UI with slot response modal, modify choice modal, multi-slot support
- Confirmation banners (required/success/rejected) for participant confirmation flow
- Localisation tab with map for address visualization
- `EntityTabs` unified component with unread indicator on conversations tab (+1)
- Deep-link support via `?tab=conversations&thread=group` and `?action=complete`

**Concerns:**
- **Thread access includes `group` threads** (page.tsx:149) — the task brief says prestataire should only see `provider_to_managers`. If group thread exists, prestataire sees all participant messages. This may be intentional design but warrants verification. (-1 INFO, not penalized as may be correct)
- **Loading spinner instead of skeleton** in `provider-availability-selection.tsx` (line 313): `animate-spin rounded-full` — should use skeleton matching final layout. (-1)
- **`confirm()` dialog** used for quote cancellation (line 696) — native browser dialog, not inline action or toast as per design criteria. (-1)
- **provider-dashboard-v2.tsx is thin** — 59 lines that essentially delegate everything to `InterventionsNavigator`. No stats cards, no visual hierarchy, no pending-actions banner despite `pendingCount` being passed as prop but unused. Prestataire dashboard feels generic compared to gestionnaire. (-1)
- No visible mobile gesture support (swipe to change status, long-press for quick actions) despite 75% mobile user base. Standard tap-based interactions only. (-1)

---

### Scores

```
━━━ Feature Evaluation ━━━━━━━━━━━━━━━━━━━━━━━
Feature: Prestataire Intervention Flow
Files reviewed: 8

Security:       7/10  ███████░░░
Patterns:       5/10  █████░░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 6.4/10
Result: FAIL (Patterns < 5 threshold, Weighted < 7.0)

Blockers:
- intervention-detail-client.tsx at 1163 lines (2.3x limit)
- Direct Supabase mutations in client component (lines 662-717)
- 20+ `any` type violations across prestataire files
- 3x console.error in production client component

Suggestions:
1. Split intervention-detail-client.tsx: extract tab content into per-tab components (GeneralTab, PlanningTab, etc.)
2. Move quote reject/cancel logic to server actions (consistent with other mutations using intervention-actions.ts)
3. Extract conversation-fetching code (threads + messages + participants + unread) into a ConversationRepository method or shared utility
4. Type dashboard props properly: replace `stats: any` with `{ interventionsCount: number; activeCount: number; completedCount: number }`
5. Replace console.error with logger.error
6. Verify intentional design: prestataire access to `group` threads (line 149) — document rationale if correct
7. Add skeleton loading to provider-availability-selection.tsx
8. Add pending-actions card to prestataire dashboard (pendingCount prop is already passed but unused)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
