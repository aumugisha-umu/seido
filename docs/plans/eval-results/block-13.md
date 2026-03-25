## B13 — Locataire: Intervention Flow

**Evaluator:** feature-evaluator agent (GAN pattern)
**Date:** 2026-03-25

### Files Reviewed (8 files)

- `app/locataire/(no-navbar)/dashboard/page.tsx` (dashboard server)
- `app/locataire/(no-navbar)/interventions/nouvelle-demande/page.tsx` (creation server)
- `app/locataire/(no-navbar)/interventions/nouvelle-demande/nouvelle-demande-client.tsx` (creation client, **648 lines**)
- `app/locataire/(no-navbar)/interventions/[id]/page.tsx` (detail server, 263 lines)
- `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` (detail client, **896 lines**)
- `app/locataire/(no-navbar)/lots/[id]/page.tsx` (lot detail, 180 lines)
- `components/dashboards/locataire-dashboard.tsx` (dashboard client)
- `components/dashboards/locataire-dashboard-hybrid.tsx` (dashboard hybrid)

---

### Security: 8/10

**Positives:**
- `getServerAuthContext('locataire')` used consistently in all 6 server pages/layouts
- Assignment check gate in intervention detail (page.tsx:37-47) — user must be assigned as `locataire` to view
- Subscription block checks in intervention detail (page.tsx:25-27), nouvelle-demande (page.tsx:11-13), and lot detail (page.tsx:60-62)
- Lot access verified via `contract_contacts` join (lots/[id]/page.tsx:65-78) — locataire can only see lots they're linked to via contract
- Time slot selection uses `selectTimeSlotAction` server action (not direct client mutation)
- Work validation uses `validateByTenantAction` server action
- Action buttons role-gated — locataire cannot approve, reject (intervention), assign, or close_par_gestionnaire

**Concerns:**
- **Service role client used 4 times** in intervention detail (page.tsx:82, 157, 187, 198) for conversation data — same pattern as prestataire. Assignment verified first, but broad escalation surface. (-1)
- **`getInterventionAction` (line 30)** in detail page uses a server action to load data — need to verify this action checks authorization (team membership). Not a local check. (-1)
- **Thread access includes `group` threads** (page.tsx:88) — locataire should only see `tenant_to_managers` per task brief. Same note as B12: may be intentional but warrants verification.

---

### Patterns: 5/10

**Positives:**
- Promise.all parallelization in dashboard (page.tsx:16), lot detail (page.tsx:84, 101), and intervention detail (page.tsx:50-219)
- Shared components used: `InterventionDetailsCard`, `DocumentsCard`, `PlanningCard`, `ReportsCard`, `EntityTabs`, `LocalisationTab`
- `useAutoExecuteAction` for email magic links (confirm_slot, reject_slot, validate_intervention)
- Tenant lot detail reuses gestionnaire's `LotDetailsClient` component with `role="locataire"` prop — good code reuse
- Data invalidation broadcast after mutations via `realtime?.broadcastInvalidation(['interventions'])`
- `InterventionConfirmationSummary` shared component in nouvelle-demande for review step

**Concerns:**
- **`intervention-detail-client.tsx` is 896 lines** — nearly 2x the 500-line limit. Same monolithic pattern as prestataire. (-1)
- **`nouvelle-demande-client.tsx` is 648 lines** — exceeds 500-line limit. Multi-step wizard with all steps in one component. (-1)
- **35+ `any` type occurrences** across locataire files (46 total per grep). Particularly dense in `intervention-detail-client.tsx` (35 occurrences) with `(a: any)`, `(slot as any)`, `(r: any)` casts throughout. (-1)
- **`console.error` in production code**: 2 occurrences in `intervention-detail-client.tsx` (lines 497, 576). (-1)
- **13 direct `.from()` calls in intervention detail server page** instead of repository pattern. (-1)
- **7 `any` casts in lot detail page** (page.tsx) — `as any[]`, `(i: any)`, `(lot as any)` used for type coercion instead of proper typing. (-1)
- **Conversation thread fetching duplicated** between locataire and prestataire detail pages — identical code structure with only `thread_type` filter changed. (-1)
- **`useInterventionPlanning` imported but partially used** (line 142-149) — hook receives 9 `undefined` arguments which suggests API mismatch or over-generic design. (-1)

---

### Design Quality: 7/10

**Positives:**
- **Demande creation wizard** with step progress header, lot selection, type combobox, urgency selection, description, file attachment, and confirmation summary — well-structured multi-step flow (+1)
- **Auto-open tenant validation** from dashboard card via `?action=validate_work` or `?action=contest_work` — reduces tap count (+1)
- **Lot detail reuses gestionnaire component** with `role="locataire"` — consistent experience with appropriate scoping (+1)
- **EntityTabs** with unread indicator for conversations tab
- **Deep-link support** via `?tab=conversations&thread=group`
- **Confirmation banners** (required/success/rejected) for participant confirmation
- **InterventionProgressCard** shown alongside documents — good progressive disclosure
- Server-loaded tenant data avoids client-side loading states on dashboard

**Concerns:**
- **Thread access includes `group` threads** (same as B12) — locataire task brief says only `tenant_to_managers`. (-1 INFO, not penalized)
- **No satisfaction rating UI visible** in work validation despite `handleValidateWork(satisfaction?: number)` accepting it (line 565) — the parameter exists but may not be exposed in the action panel UI. (-1)
- **Loading spinner** in `ProviderAvailabilitySelection` (shared component used from locataire side) uses `animate-spin` instead of skeleton. (-1)
- **Dashboard delegates entirely** to `locataire-dashboard-hybrid.tsx` which handles the rich view. Need to verify pending-action CTA prominence for < 2 minute target.
- **`confirm()` browser dialog** inherited from shared components (quote actions) — not inline or toast-based. (-1)
- **Lot detail page casts `as any` to pass data** (page.tsx:166-167) — `interventions={interventionsResult as any}` and `interventionsWithDocs={interventionsWithDocs as any}` hide type mismatches that could cause runtime issues.

---

### Scores

```
━━━ Feature Evaluation ━━━━━━━━━━━━━━━━━━━━━━━
Feature: Locataire Intervention Flow
Files reviewed: 8

Security:       8/10  ████████░░
Patterns:       5/10  █████░░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 6.8/10
Result: FAIL (Patterns < 5 threshold, Weighted < 7.0)

Blockers:
- intervention-detail-client.tsx at 896 lines (1.8x limit)
- nouvelle-demande-client.tsx at 648 lines (1.3x limit)
- 46 `any` type occurrences across locataire files
- 13 direct .from() calls in server page bypassing repository pattern

Suggestions:
1. Split intervention-detail-client.tsx: extract GeneralTabContent, PlanningTabContent, ConversationsTabContent into separate files
2. Split nouvelle-demande-client.tsx: extract each wizard step (LotSelection, TypeSelection, DescriptionStep, ConfirmationStep) into sub-components
3. Extract shared conversation-fetching code into a ConversationRepository.getForInterventionByRole() method — eliminates duplication with prestataire
4. Type assignmentList properly in detail client: replace `(intervention as any).assignments` with explicit type
5. Fix useInterventionPlanning call: 9 undefined args suggest the hook API needs refactoring or a config object parameter
6. Replace console.error with logger.error (2 occurrences)
7. Add explicit satisfaction rating UI to tenant validation flow (parameter exists in handleValidateWork but not exposed)
8. Verify group thread access for locataire — document rationale or restrict to tenant_to_managers only
9. Type lot detail page data properly instead of `as any` casts (lines 166-167)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
