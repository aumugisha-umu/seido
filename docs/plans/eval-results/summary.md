# Feature Evaluation Summary -- Gestionnaire + Intervention Flow (3 Roles)

**Date:** 2026-03-25
**Methodology:** `.claude/agents/feature-evaluator.md` (3-axis GAN scoring)
**Design Criteria:** `docs/design/design-evaluation-criteria.md`
**Blocks evaluated:** 15/15 (complete)

---

## 1. Full Scorecard

| Block | Domain | Security | Patterns | Design | Weighted | Result |
|-------|--------|----------|----------|--------|----------|--------|
| B1  | Dashboard + Stats | 8 | 7 | 8 | **7.7** | PASS |
| B2  | Immeubles CRUD | 7 | 6 | 8 | **7.0** | PASS (marginal) |
| B3  | Lots CRUD | 8 | 7 | 8 | **7.7** | PASS |
| B4  | Contacts CRUD | 6 | 6 | 7 | **6.3** | FAIL |
| B5  | Intervention Wizard | 7 | 5 | 7 | **6.4** | FAIL |
| B6  | Intervention Detail | 8 | 5 | 7 | **6.8** | FAIL |
| B7  | Quotes + Time Slots | 8 | 7 | 7 | **7.4** | PASS |
| B8  | Contrats Fournisseurs | 8 | 6 | 7 | **7.1** | PASS (borderline) |
| B9  | Rappels (Reminders) | 9 | 9 | 8 | **8.7** | PASS |
| B10 | Mail + Email | 7 | 5 | 7 | **6.4** | FAIL |
| B11 | Settings + Billing | 8 | 6 | 7 | **7.1** | PASS (borderline) |
| B12 | Prestataire Flow | 7 | 5 | 7 | **6.4** | FAIL |
| B13 | Locataire Flow | 8 | 5 | 7 | **6.8** | FAIL |
| B14 | Server Actions (X-cut) | 8 | 5 | 7* | **6.8** | FAIL |
| B15 | Services + Repos (X-cut) | 9 | 6 | 7* | **7.5** | PASS |

*B14/B15 Design scores are neutral (7/10) since they are backend-only code.

**Average weighted score: 7.07/10**
**Pass rate: 8/15 (53%)**

---

## 2. Critical Blockers (Must Fix)

These prevent release quality. Ordered by severity.

### B14-SEC-1 / B2: `createCompleteProperty` missing auth check
- **File:** `app/actions/building-actions.ts` line 26-89
- **Issue:** Server action creates buildings+lots without calling `getServerActionAuthContextOrNull()`. Auth is implicit via cookie-based Supabase client but not explicitly validated.
- **Risk:** Inconsistent with every other mutating server action in the codebase.
- **Fix:** Add `getServerActionAuthContextOrNull()` check at action entry, same pattern as `updateCompleteProperty`.

### B14-SEC-2 / B4: `contacts.ts` actions missing auth context
- **File:** `app/actions/contacts.ts`
- **Issue:** `getTeamContactsAction` and `getTeamContactsByRoleAction` trust client-provided `teamId` without validating caller belongs to that team.
- **Fix:** Add `getServerActionAuthContextOrNull()` and verify `team.id === teamId`.

### B4-SEC-2: Contact detail unbounded queries
- **File:** `app/gestionnaire/(no-navbar)/contacts/details/[id]/page.tsx` lines 115-117
- **Issue:** Fetches ALL interventions/buildings/lots without `team_id` filter. RLS provides protection but queries are unbounded.
- **Fix:** Add `.eq('team_id', team.id)` to all queries.

---

## 3. Important Fixes (Should Fix)

### 3a. File Size Violations (Systemic)

The single most pervasive issue across the codebase. **18 files exceed the 500-line limit**, 7 exceed 1000 lines:

| File | Lines | Ratio |
|------|-------|-------|
| `intervention-actions.ts` | 3411 | 6.8x |
| `intervention-service.ts` | 2959 | 5.9x |
| `intervention-detail-client.tsx` (gestionnaire) | 2405 | 4.8x |
| `nouvelle-intervention-client.tsx` | 2343 | 4.7x |
| `notification-actions.ts` | 1954 | 3.9x |
| `contract-form-container.tsx` | 1728 | 3.5x |
| `contract-actions.ts` | 1506 | 3.0x |
| `conversation-actions.ts` | 1283 | 2.6x |
| `route.ts` (create-manager-intervention) | 1279 | 2.6x |
| `intervention-detail-client.tsx` (prestataire) | 1163 | 2.3x |
| `lot-creation-form.tsx` | ~1000+ | ~2x |
| `intervention.repository.ts` | 942 | 1.9x |
| `intervention-detail-client.tsx` (locataire) | 896 | 1.8x |
| `lot.repository.ts` | 777 | 1.6x |
| `building.repository.ts` | 761 | 1.5x |
| `building-details-client.tsx` | 680 | 1.4x |
| `provider-availability-selection.tsx` | 671 | 1.3x |
| `nouvelle-demande-client.tsx` | 648 | 1.3x |

**Recommended split strategy:**
1. Action files: split by entity subdomain (CRUD, workflow, assignments, timeslots)
2. Service files: split by responsibility (CRUD vs workflow vs assignment)
3. Client components: extract per-tab or per-step components
4. Repository files: extract search/bulk/stats operations

### 3b. `any` Type Violations (Systemic)

**~150+ `any` occurrences** across the evaluated codebase. Worst offenders:
- `locataire intervention-detail-client.tsx`: 35 occurrences
- `nouvelle-intervention-client.tsx`: 25+ occurrences
- `prestataire intervention-detail-client.tsx`: 20+ occurrences
- `intervention-service.ts`: 17 occurrences
- `biens/page.tsx`: 14 occurrences

### 3c. `console.error`/`console.warn` in Production

Found in:
- `contacts/details/[id]/page.tsx` (line 85)
- `contacts/societes/[id]/page.tsx` (line 39)
- `prestataire/intervention-detail-client.tsx` (3 occurrences)
- `locataire/intervention-detail-client.tsx` (2 occurrences)
- `parametres/page.tsx` (line 23)
- `resend-client.ts` (lines 12, 44)

All should use `logger.error()` / `logger.warn()` from `@/lib/logger`.

### 3d. `.single()` on Multi-team Queries

90+ `.single()` calls across repositories. Most are PK lookups (acceptable), but these are risky:
- `subscription.repository.ts`: 4 `.single()` on `team_id` lookups
- `stripe-customer.repository.ts`: 2 `.single()` on `team_id` lookups
- `team.repository.ts`: 9 `.single()` calls

Should use `.limit(1).maybeSingle()` for team-scoped queries per project convention.

### 3e. Repository Pattern Violations

Direct Supabase calls bypass the repository layer in:
- `mail/page.tsx`: ~300 lines of raw queries (B10 blocker)
- `intervention detail pages` (gestionnaire/prestataire/locataire): 9-15 raw `.from()` calls each
- `intervention-actions.ts`: quote cancel, time slot cancel, assignment updates
- `profile/page.tsx`: raw team membership query
- `emails/page.tsx`: raw connection and blacklist queries
- `prestataire intervention-detail-client.tsx`: direct client-side `.from('intervention_quotes').update()`

### 3f. Missing Notification Triggers

Status transition actions (approve, reject, plan, finalize, cancel) do NOT consistently trigger notifications. Only `createInterventionAction` uses `after()` for notification dispatch. The dispatcher-actions.ts has stub functions that throw "Not implemented".

---

## 4. Design Improvements

### 4a. Missing Loading Skeletons
- Intervention detail pages (B5, B6): no Suspense boundary or skeleton
- Contact detail page (B4): no loading skeleton
- Contracts list page (B8): no Suspense boundary
- Provider availability selection (B12): uses spinner instead of skeleton
- AI assistant page (B11): uses spinner

### 4b. Missing/Placeholder Features
- Building archive action: just logs, not implemented (B2)
- Document view/download handlers: placeholder in building and lot details (B2, B3)
- Reminder activity history: placeholder text (B9)
- Satisfaction rating UI for tenant validation: parameter exists but not exposed (B13)
- Dispatcher phase 4 stubs: 5 functions that throw "Not implemented" (B14)

### 4c. Role-Specific UX Gaps
- Prestataire dashboard is thin (59 lines) with no stats cards or visual hierarchy despite `pendingCount` prop being passed (B12)
- No mobile gesture support for prestataire (75% mobile) -- swipe, long-press (B12)
- Paused subscription status lacks actionable UX guidance (B11)
- Empty state missing for zero interventions on dashboard (B1)
- Zero emails empty state missing in mail (B10)

### 4d. Hardcoded Values
- `support@seido.be` appears twice in billing-page-client.tsx instead of using `EMAIL_CONFIG.supportEmail` (B11)

---

## 5. Optimization Opportunities

### 5a. Query Optimization
- Contact detail page fetches ALL interventions/buildings/lots then filters by role -- should query per-role (B4)
- Address loading in intervention detail is sequential when it could be in the parallel Promise.all batch (B6)
- `building.repository.ts` `upsertMany()` processes sequentially instead of batching (B15)

### 5b. Code Reuse Opportunities
- Conversation thread fetching code duplicated across gestionnaire/prestataire/locataire detail pages -- extract to `ConversationRepository.getForInterventionByRole()` (B12, B13)
- Recurrence rule creation duplicated between `createReminderAction` and `createWizardRemindersAction` -- extract to shared helper (B9)
- Building/lot/contact transform logic duplicated between contract create and edit pages (B8)

### 5c. Dead Code
- `handleSubmit` function in wizard client (B5) -- unused, replaced by `handleCreateIntervention`
- `getAll()` deprecated fallback path in intervention-service.ts (B15)
- `loadUserTeam()` in wizard client duplicates data already available from server (B5)

---

## 6. Overall Result

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL EVALUATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Average Weighted Score:  7.07 / 10
  Pass Rate:               8 / 15 blocks (53%)
  Critical Blockers:       3

  Result:  CONDITIONAL PASS

  The codebase is functional and production-ready for
  core flows. Security is generally strong (avg 7.8/10).
  Design quality is consistent (avg 7.3/10).

  The PATTERNS axis drags the overall score down
  (avg 5.9/10). The root cause is systemic: oversized
  files and pervasive `any` types. These are tech debt
  issues, not functional bugs.

  Recommendation:
  1. Fix 3 critical security blockers IMMEDIATELY
  2. Schedule file-splitting sprint (18 oversized files)
  3. Adopt B9 (Reminders) as the gold standard:
     - Clean 3-layer architecture
     - Zero `any` types
     - Proper Zod validation on all inputs
     - .limit(1) not .single() for multi-team queries
     - Files under 500 lines
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Per-Axis Averages

| Axis | Average | Min | Max | Assessment |
|------|---------|-----|-----|------------|
| Security | 7.8 | 6 (B4) | 9 (B9, B15) | Strong -- no secrets exposed, auth pattern consistent |
| Patterns | 5.9 | 5 (B5,B6,B10,B12,B13,B14) | 9 (B9) | Weak -- file sizes + `any` types dominate |
| Design | 7.3 | 7 (B4,B7-B14) | 8 (B1,B2,B3,B9) | Adequate -- functional but opportunities exist |

### Top Priority Actions (Ordered)

1. **Security**: Fix `createCompleteProperty` auth + `contacts.ts` auth + contact detail query scoping
2. **Patterns**: Split intervention-actions.ts (3411L) and intervention-service.ts (2959L) -- these are the backbone files
3. **Patterns**: Extract shared conversation-fetching code (eliminates duplication in 3 role pages)
4. **Patterns**: Replace `console.error` with `logger.error` (10+ occurrences)
5. **Design**: Add loading skeletons to intervention detail pages (most visited pages)
