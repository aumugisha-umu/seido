# Evaluation Fix Plan — Full Cleanup
**Date:** 2026-03-25
**Source:** `docs/plans/eval-results/summary.md` (15-block feature evaluation)
**Scope:** Full cleanup (C) — Security blockers + File splitting + any/console/skeletons
**Strategy:** Parallel phases (C) with hybrid decomposition (C)
**Validation:** `npm run lint` after each unit of work (not `npm run build`)

---

## Progress Tracker

| Phase | Item | Status | Notes |
|-------|------|--------|-------|
| **P1** | P1-1: Auth `createCompleteProperty` | **DONE** | `getServerActionAuthContextOrNull` added |
| **P1** | P1-2: Auth `contacts.ts` actions | **DONE** | Auth + team.id verification |
| **P1** | P1-3: Team-scoped queries contact detail | **DONE** | `.eq('team_id', team.id)` added |
| **P1** | P1-4: Hardcoded `support@seido.be` | **DONE** | → `support@seido-app.com` |
| **P1** | P1-5: `console.error/warn` → logger | **DONE** | 6/8 locations fixed (2 remain in prestataire/locataire detail) |
| **P2** | 2A: Intervention actions split | **PARTIAL** | 5 files + index.ts created. Missing: quote-actions. Originals still exist. |
| **P2** | 2A: Intervention service split | **TODO** | `intervention-service.ts` (2959L) not split |
| **P2** | 2A: Intervention repo split | **TODO** | `intervention.repository.ts` (942L) not split |
| **P2** | 2A: create-manager-intervention route | **TODO** | `route.ts` (1279L) not split |
| **P2** | 2B: Notification actions split | **DONE** | 5 files + index.ts created |
| **P2** | 2B: Contract actions split | **DONE** | 3 files + index.ts created |
| **P2** | 2B: Conversation actions split | **DONE** | 3 files + index.ts created |
| **P2** | 2B: Lot repo search extract | **DONE** | `lot-search.repository.ts` created |
| **P2** | 2B: Building repo search extract | **DONE** | `building-search.repository.ts` created |
| **P2** | 2C: Gestionnaire detail extraction | **PARTIAL** | 7 sub-components created but orchestrator NOT refactored (2404L) |
| **P2** | 2C: Nouvelle-intervention wizard | **TODO** | Not started (2343L) |
| **P2** | 2C: Prestataire detail extraction | **DONE** | 3 sub-components created + wired (1034L, needs hook extraction for <500) |
| **P2** | 2C: Locataire detail extraction | **DONE** | 2 sub-components created + wired (844L, needs hook extraction for <500) |
| **P2** | 2D: Contract form extraction | **PARTIAL** | 5 sub-components created but orchestrator NOT refactored (1392L) |
| **P2** | 2D: Building details extraction | **DONE** | 3 sub-components created + wired (523L ≈ target) |
| **P2** | 2D: Availability extraction | **DONE** | 2 sub-components created + wired (630L, close to target) |
| **P2** | 2D: Lot creation form | **TODO** | Not started (~1000L) |
| **P2** | 2D: Nouvelle-demande (locataire) | **TODO** | Not started (648L) |
| **P2** | Import migration | **TODO** | Update imports from monolith → split folders |
| **P2** | Delete original monoliths | **TODO** | After import migration verified |
| **P3** | 3A: Eliminate ~150 `any` types | **TODO** | |
| **P3** | 3B: Repository pattern violations | **TODO** | |
| **P3** | 3B: Shared conversation extraction | **TODO** | |
| **P3** | 3C: Loading skeletons | **TODO** | |
| **P3** | 3C: `.single()` → `.limit(1)` | **TODO** | |
| **P3** | 3C: Dead code removal | **TODO** | |

---

## Architecture Principles (Guide Rails)

All corrections MUST align with these SEIDO patterns:

| Principle | Reference |
|-----------|-----------|
| Repository Pattern — no direct Supabase in components/actions | `systemPatterns.md` §2 |
| `getServerAuthContext` / `getServerActionAuthContextOrNull` | `systemPatterns.md` §1 |
| `.limit(1)` not `.single()` for team-scoped queries | Memory: "Common Mistakes" |
| Server Components default, minimize `use client` | `CLAUDE.md` §Development Rules |
| Files < 500 lines, single responsibility | `CLAUDE.md` §Development Rules |
| `logger.error()` not `console.error()` | `CLAUDE.md` §INTERDICTIONS |
| No `any` types in production code | `CLAUDE.md` §INTERDICTIONS |
| B9 (Rappels) = gold standard architecture | `eval-results/block-9.md` |

**Hybrid decomposition strategy:**
- **Backend files** (actions, services, repos): Full decomposition — split into separate files, update all imports
- **Client components** (.tsx): Extract-only — main file becomes orchestrator (state + layout), sub-components extracted to sibling files

---

## Phase 1: Security Blockers — COMPLETE

All 5 items fixed. See git diff for details.

Files modified:
- `app/actions/building-actions.ts` — P1-1
- `app/actions/contacts.ts` — P1-2
- `app/gestionnaire/(no-navbar)/contacts/details/[id]/page.tsx` — P1-3 + P1-5
- `app/gestionnaire/(no-navbar)/contacts/societes/[id]/page.tsx` — P1-5
- `app/gestionnaire/(with-navbar)/parametres/page.tsx` — P1-5
- `app/gestionnaire/(with-navbar)/settings/billing/billing-page-client.tsx` — P1-4
- `lib/email/resend-client.ts` — P1-5

---

## Phase 2: File Splitting — IN PROGRESS

### What's DONE:

**Backend split structure created (not yet wired to consumers):**
```
app/actions/intervention/          ← 5 split files + index.ts (re-exports)
app/actions/notifications/         ← 5 split files + index.ts
app/actions/contracts/             ← 3 split files + index.ts
app/actions/conversations/         ← 3 split files + index.ts
lib/services/repositories/building-search.repository.ts
lib/services/repositories/lot-search.repository.ts
```

**Client sub-components created:**
```
gestionnaire/.../components/       ← 7 sub-components (general, planning, documents, header, modals, comments, types)
prestataire/.../components/        ← 3 sub-components (general, planning, modals) — WIRED
locataire/.../components/          ← 2 sub-components (general, planning) — WIRED
components/contract/               ← 5 sub-components (basic-info, property, scheduling, document, confirmation)
building-details/                  ← 3 sub-components (lots-tab, documents-tab, info-section) — WIRED
components/intervention/           ← 2 sub-components (availability-calendar, slot-list)
```

### What REMAINS (next sessions):

#### Priority 1: Wire orchestrators to use sub-components
These files have sub-components created but the orchestrator hasn't been refactored to use them:
- `gestionnaire/intervention-detail-client.tsx` (2404L → target <500L)
- `components/contract/contract-form-container.tsx` (1392L → target <400L)

**Approach for gestionnaire detail:**
- Keep: all useState, useEffect, hooks, data transforms, event handlers
- Replace: ~800L of inline JSX with component imports (InterventionGeneralTab, InterventionPlanningTab, etc.)
- Move: type definitions → `intervention-detail-types.ts`
- Result: ~580L orchestrator (state + props-passing + tab layout)

**Approach for contract form:**
- Extract: 4 custom hooks (use-contract-supplier, use-contract-submit, use-lease-interventions, use-contract-contacts)
- Result: ~400L orchestrator (hooks + layout)

#### Priority 2: Files not started
- `nouvelle-intervention-client.tsx` (2343L) — extract per-step components
- `lot-creation-form.tsx` (~1000L) — extract per-step components
- `nouvelle-demande-client.tsx` (648L) — extract per-step components

#### Priority 3: Complete backend wiring
- Migrate all imports from `@/app/actions/intervention-actions` → `@/app/actions/intervention`
- Same for notifications, contracts, conversations
- Delete original monolith files after all imports updated
- Split files still > 500L need further decomposition:
  - `intervention-crud-actions.ts` (928L)
  - `intervention-timeslot-actions.ts` (995L)
  - `intervention-workflow-actions.ts` (719L)

#### Priority 4: Remaining 2A items
- `intervention-service.ts` (2959L) — split into CRUD/workflow/assignment services
- `intervention.repository.ts` (942L) — extract search operations
- `create-manager-intervention/route.ts` (1279L) — extract to service layer

---

## Phase 3: Type Safety & Polish — TODO

> Depends on Phase 2 orchestrator refactoring for maximum impact.

### Group 3A: Eliminate `any` types (~150 occurrences)
Priority: locataire detail (35), wizard (25+), prestataire detail (20+), intervention-service (17), biens page (14)

### Group 3B: Repository Pattern Violations
- `mail/page.tsx`: ~300L raw queries → `mail.repository.ts`
- Intervention detail pages: direct `.from()` calls → server actions + repository
- Create `conversation.repository.ts` for shared thread-fetching code

### Group 3C: Loading Skeletons & UX Polish
- Add Suspense + skeleton to: intervention detail (3 roles), contact detail, contracts list, AI assistant
- Fix `.single()` → `.limit(1)` in subscription/stripe-customer/team repos
- Remove dead code (handleSubmit, getAll, loadUserTeam)
- Fix lot-details-client.tsx old status values

---

## Lint Status

`npm run lint -- --quiet` passes with only pre-existing errors:
- Storybook renderer imports (6x)
- phone-input displayName
- activity-logger/logger require() imports
- magic-link empty interface

**Zero new errors introduced by this plan's changes.**

---

## Files Created This Session

```
app/actions/intervention/index.ts                          (NEW)
app/actions/intervention/intervention-crud-actions.ts       (NEW)
app/actions/intervention/intervention-workflow-actions.ts    (NEW)
app/actions/intervention/intervention-assignment-actions.ts  (NEW)
app/actions/intervention/intervention-timeslot-actions.ts    (NEW)
app/actions/intervention/intervention-shared.ts              (NEW)
app/actions/notifications/index.ts                          (NEW)
app/actions/notifications/notification-crud-actions.ts       (NEW)
app/actions/notifications/notification-intervention-actions.ts (NEW)
app/actions/notifications/notification-contract-actions.ts    (NEW)
app/actions/notifications/notification-quote-actions.ts       (NEW)
app/actions/notifications/notification-helpers.ts             (NEW)
app/actions/contracts/index.ts                               (NEW)
app/actions/contracts/contract-crud-actions.ts                (NEW)
app/actions/contracts/contract-workflow-actions.ts            (NEW)
app/actions/conversations/index.ts                           (NEW)
app/actions/conversations/conversation-crud-actions.ts        (NEW)
app/actions/conversations/conversation-thread-actions.ts      (NEW)
lib/services/repositories/building-search.repository.ts      (NEW)
lib/services/repositories/lot-search.repository.ts           (NEW)
app/gestionnaire/.../intervention-general-tab.tsx            (NEW)
app/gestionnaire/.../intervention-planning-tab.tsx           (NEW)
app/gestionnaire/.../intervention-documents-tab.tsx          (NEW)
app/gestionnaire/.../intervention-header-actions.tsx         (NEW)
app/gestionnaire/.../intervention-modals.tsx                 (NEW)
app/gestionnaire/.../intervention-comments-modal.tsx         (NEW)
app/gestionnaire/.../intervention-detail-types.ts            (NEW)
app/prestataire/.../provider-general-tab.tsx                 (NEW)
app/prestataire/.../provider-planning-tab.tsx                (NEW)
app/prestataire/.../provider-modals.tsx                      (NEW)
app/locataire/.../tenant-general-tab.tsx                     (NEW)
app/locataire/.../tenant-planning-tab.tsx                    (NEW)
components/contract/contract-basic-info.tsx                  (NEW)
components/contract/contract-property-selection.tsx          (NEW)
components/contract/contract-scheduling-section.tsx          (NEW)
components/contract/contract-document-section.tsx            (NEW)
components/contract/contract-confirmation-step.tsx           (NEW)
components/intervention/availability-calendar.tsx            (NEW)
components/intervention/availability-slot-list.tsx           (NEW)
app/gestionnaire/.../building-lots-tab.tsx                   (NEW)
app/gestionnaire/.../building-documents-tab.tsx              (NEW)
app/gestionnaire/.../building-info-section.tsx               (NEW)
```

42 new files created, 13 existing files modified.
