# Feature Evaluation Plan — Gestionnaire + Intervention Flow (3 Roles)
**Date:** 2026-03-25
**Methodology:** `.claude/agents/feature-evaluator.md` (3-axis GAN scoring)
**Design Criteria:** `docs/design/design-evaluation-criteria.md`

## How To Use This Plan

1. **Pick any PENDING block** (blocks are independent — run in any order)
2. **Launch a general-purpose agent** with this prompt template:
   ```
   You are the SEIDO feature-evaluator. Read `.claude/agents/feature-evaluator.md`
   and `docs/design/design-evaluation-criteria.md` first.

   Evaluate BLOCK [X] from `docs/plans/2026-03-25-feature-evaluation-plan.md`.
   Read every file listed. Score each against 3 axes (Security 40%, Patterns 30%,
   Design Quality 30%). Output the exact format specified in the plan.

   When done, write your results to `docs/plans/eval-results/block-[X].md`
   ```
3. **Update status** in this file: PENDING → IN_PROGRESS → DONE
4. **If token limit hit:** Stop current block, mark partial, next session resumes

## Progress Tracker

| Block | Domain | Status | Score | Agent |
|-------|--------|--------|-------|-------|
| B1 | Dashboard + Stats | DONE | 7.7 PASS | Agent 1 |
| B2 | Biens: Immeubles (CRUD) | DONE | 7.0 PASS | Agent 1 |
| B3 | Biens: Lots (CRUD) | DONE | 7.7 PASS | Agent 1 |
| B4 | Contacts (CRUD + Societes) | DONE | 6.3 FAIL | Agent 1 |
| B5 | Intervention Creation Wizard | DONE | 6.4 FAIL | Agent 2 |
| B6 | Intervention Detail + Status Transitions (Gestionnaire) | DONE | 6.8 FAIL | Agent 2 |
| B7 | Intervention Quotes + Time Slots | DONE | 7.4 PASS | Agent 2 |
| B8 | Contrats Fournisseurs (CRUD) | DONE | 7.1 PASS | Agent 3 |
| B9 | Operations: Rappels | DONE | 8.7 PASS | Agent 3 |
| B10 | Mail + Email System | DONE | 6.4 FAIL | Agent 3 |
| B11 | Parametres + Profile + Billing | DONE | 7.1 PASS | Agent 3 |
| B12 | Prestataire: Intervention Flow | DONE | 6.4 FAIL | Agent 4 |
| B13 | Locataire: Intervention Flow | DONE | 6.8 FAIL | Agent 4 |
| B14 | Server Actions (Cross-cutting) | DONE | 6.8 FAIL | Agent 5 |
| B15 | Services + Repositories (Cross-cutting) | DONE | 7.5 PASS | Agent 5 |

**Parallelizable groups:**
- Group A (independent pages): B1, B2, B3, B4, B8, B9, B10, B11
- Group B (intervention flow): B5, B6, B7 (sequential recommended — creation → detail → quotes)
- Group C (other roles): B12, B13 (independent of each other, depend on B6 findings)
- Group D (cross-cutting): B14, B15 (run last — aggregates findings from B1-B13)

---

## Block Details

### B1 — Dashboard + Stats
**Files to read:**
- `app/gestionnaire/(with-navbar)/dashboard/page.tsx`
- `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx`
- `components/dashboards/manager/manager-dashboard-v2.tsx`
- Any components imported by the dashboard (grep imports)

**Check specifically:**
- Auth: getServerAuthContext('gestionnaire') in page.tsx
- Parallelized data fetching (Promise.all for independent queries)
- Dashboard cards: visual hierarchy (not all same weight)
- Empty states when no data
- Loading: skeleton or suspense boundaries
- Stats accuracy (correct queries, no N+1)

**Output format:**
```
## B1 — Dashboard + Stats
Files reviewed: [list]
Security: X/10 — [findings]
Patterns: X/10 — [findings]
Design:   X/10 — [findings]
Weighted: X.X/10
Blockers: [list or "None"]
Improvements: [list]
```

---

### B2 — Biens: Immeubles (CRUD)
**Files to read:**
- `app/gestionnaire/(with-navbar)/biens/page.tsx` (list)
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx` (detail)
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/page.tsx` (create)
- `app/gestionnaire/(no-navbar)/biens/immeubles/modifier/[id]/page.tsx` (edit)
- `components/building-*.tsx` (all building components)
- `app/actions/building-actions.ts`
- `lib/services/repositories/building.repository.ts`

**Check specifically:**
- CRUD completeness: create, read, update, delete all protected
- Building → lot relationship navigation
- File size of detail client component
- Subscription gate on creation (canAddProperty check)

---

### B3 — Biens: Lots (CRUD)
**Files to read:**
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` (detail)
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` (create)
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/modifier/[id]/page.tsx` (edit)
- `app/actions/lot-actions.ts`
- `app/actions/create-lots-composite.ts`
- `lib/services/repositories/lot.repository.ts`

**Check specifically:**
- Multi-lot creation (composite action)
- Subscription gate (canAddProperty with batch count)
- Lot → building back-navigation
- Document upload on lot (storage RLS)

---

### B4 — Contacts (CRUD + Societes)
**Files to read:**
- `app/gestionnaire/(with-navbar)/contacts/page.tsx` (list)
- `app/gestionnaire/(no-navbar)/contacts/details/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/contacts/nouveau/page.tsx`
- `app/gestionnaire/(no-navbar)/contacts/modifier/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/contacts/societes/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/contacts/societes/modifier/[id]/page.tsx`
- `app/actions/contacts.ts`
- `lib/services/repositories/contact.repository.ts`

**Check specifically:**
- Contact type prefill (?type= parameter)
- Company (societe) → contact relationship
- Contact used in intervention assignments
- mapContactType() handling both EN and FR values

---

### B5 — Intervention Creation Wizard
**Files to read:**
- `app/gestionnaire/(no-navbar)/operations/nouvelle-intervention/page.tsx`
- All wizard step components (grep for step/wizard in components/)
- `components/contract/intervention-planner-step.tsx`
- `components/building-confirmation-step.tsx`
- `components/contract/supplier-confirmation-step.tsx`
- Server action that creates the intervention
- `app/actions/intervention-actions.ts` (createIntervention)

**Check specifically:**
- Wizard step validation (each step validated before next)
- Multi-entity creation ordering (intervention → assignments → documents)
- XOR constraint (building_id XOR lot_id)
- requires_quote flag handling
- Time slot creation (single vs multi-slot logic)
- Notification triggers post-creation
- Data invalidation broadcast

---

### B6 — Intervention Detail + Status Transitions (Gestionnaire)
**Files to read:**
- `app/gestionnaire/(no-navbar)/operations/interventions/[id]/page.tsx`
- Its client component(s)
- `app/gestionnaire/(no-navbar)/operations/interventions/modifier/[id]/page.tsx`
- `app/actions/intervention-actions.ts` (all status transition actions)
- `lib/services/domain/intervention.service.ts`

**Check specifically:**
- All 9 status values rendered correctly with appropriate action buttons
- Status transitions: approve, reject, plan, close (par gestionnaire), cancel
- Action buttons visibility per current status (no impossible transitions)
- Timeline/activity log display
- Conversation threads (group, provider_to_managers, tenant_to_managers)
- Document management on intervention
- Assignment display and modification
- Data invalidation after each mutation
- Optimistic UI updates where appropriate

---

### B7 — Intervention Quotes + Time Slots
**Files to read:**
- Quote components (grep for quote in components/)
- Time slot components (grep for time-slot/timeslot in components/)
- `app/actions/intervention-actions.ts` (quote and time slot actions)
- `lib/services/repositories/intervention-quote.repository.ts`

**Check specifically:**
- Quote status enum: draft|pending|sent|accepted|rejected|expired|cancelled
- quote_type enum: 'estimation' or 'final' (NOT 'estimate')
- requires_quote flag usage (not old demande_de_devis status)
- Time slot confirmed = status === 'selected' (NOT 'confirmed')
- isMultiSlot logic: schedulingType === 'slots' && timeSlots.length >= 2
- Slot count: 1 slot = date fixe, 2+ = mandatory confirmation

---

### B8 — Contrats Fournisseurs (CRUD)
**Files to read:**
- `app/gestionnaire/(with-navbar)/contrats/page.tsx` (list)
- `app/gestionnaire/(no-navbar)/contrats/[id]/page.tsx` (detail)
- `app/gestionnaire/(no-navbar)/contrats/nouveau/page.tsx` (create)
- `app/gestionnaire/(no-navbar)/contrats/modifier/[id]/page.tsx` (edit)
- `app/actions/contract-actions.ts`
- `lib/services/repositories/supplier-contract.repository.ts`
- `components/contract/contract-form-container.tsx`

**Check specifically:**
- Supplier contract → intervention linking
- Contract recurrence/scheduling
- Intervention planner step reuse

---

### B9 — Operations: Rappels
**Files to read:**
- `app/gestionnaire/(with-navbar)/operations/page.tsx`
- `app/gestionnaire/(no-navbar)/operations/nouveau-rappel/page.tsx`
- `app/gestionnaire/(no-navbar)/operations/rappels/[id]/page.tsx`
- `app/actions/reminder-actions.ts`
- `lib/services/domain/reminder.service.ts`
- `lib/services/repositories/reminder.repository.ts`

**Check specifically:**
- Reminder → building/lot/intervention linking
- XOR constraint (single entity CHECK)
- Recurrence UX (recently implemented feature)
- Reminder visibility per role

---

### B10 — Mail + Email System
**Files to read:**
- `app/gestionnaire/(with-navbar)/mail/page.tsx`
- Mail client components (grep for mail in components/)
- `app/actions/email-conversation-actions.ts`
- `lib/services/domain/email-notification/` (all 15 files)
- `lib/email/resend-client.ts`

**Check specifically:**
- Email thread display and reply
- Attachment handling (storage RLS)
- Email config centralization (EMAIL_CONFIG)
- Internal chat panel
- Notification vs email distinction

---

### B11 — Parametres + Profile + Billing
**Files to read:**
- `app/gestionnaire/(with-navbar)/parametres/page.tsx`
- `app/gestionnaire/(with-navbar)/parametres/emails/page.tsx`
- `app/gestionnaire/(with-navbar)/parametres/assistant-ia/page.tsx`
- `app/gestionnaire/(with-navbar)/profile/page.tsx`
- `app/gestionnaire/(with-navbar)/settings/billing/page.tsx`
- `components/billing/` (all billing components)
- `lib/services/domain/subscription.service.ts`

**Check specifically:**
- Billing: Stripe checkout, subscription display, upgrade preview
- paused status handling (read-only, can't add properties)
- canAddProperty loading race condition (check loading before acting)
- Profile: avatar upload, team management
- AI assistant: usage display, configuration

---

### B12 — Prestataire: Intervention Flow
**Files to read:**
- `app/prestataire/(with-navbar)/dashboard/page.tsx`
- `app/prestataire/(no-navbar)/interventions/[id]/page.tsx`
- Prestataire-specific components
- Shared intervention components used by prestataire

**Check specifically:**
- Mobile-first design (75% mobile users, thumb-zone, < 3 taps)
- Actions available: accept time slot, submit quote, update status, close
- Cannot do: approve, reject, assign (gestionnaire-only)
- Push notification URLs include role prefix: /prestataire/interventions/[id]
- Conversation thread: only provider_to_managers (not group)

---

### B13 — Locataire: Intervention Flow
**Files to read:**
- `app/locataire/(no-navbar)/dashboard/page.tsx`
- `app/locataire/(no-navbar)/interventions/nouvelle-demande/page.tsx`
- `app/locataire/(no-navbar)/interventions/[id]/page.tsx`
- `app/locataire/(no-navbar)/lots/[id]/page.tsx`
- Locataire-specific components

**Check specifically:**
- Demande creation flow (< 2 minutes target)
- Status tracking view (read-only for most statuses)
- Time slot confirmation from locataire side
- Conversation thread: only tenant_to_managers
- Cannot do: approve, reject, assign, close_par_gestionnaire
- Lot detail view (tenant sees their lot info)

---

### B14 — Server Actions (Cross-cutting)
**Files to read:**
- `app/actions/intervention-actions.ts`
- `app/actions/building-actions.ts`
- `app/actions/lot-actions.ts`
- `app/actions/contacts.ts`
- `app/actions/contract-actions.ts`
- `app/actions/reminder-actions.ts`
- `app/actions/confirm-actions.ts`
- `app/actions/dispatcher-actions.ts`
- `app/actions/conversation-actions.ts`
- `app/actions/notification-actions.ts`

**Check specifically:**
- Every action uses getServerActionAuthContext or getServerActionAuthContextOrNull
- Zod schema validation on all inputs
- Error handling (try/catch, meaningful error messages)
- Data invalidation broadcast after mutations
- Notification triggers where appropriate
- No direct Supabase calls (repository pattern)
- Role-appropriate access control

---

### B15 — Services + Repositories (Cross-cutting)
**Files to read:**
- `lib/services/domain/intervention.service.ts`
- `lib/services/domain/reminder.service.ts`
- `lib/services/domain/subscription.service.ts`
- `lib/services/repositories/intervention.repository.ts`
- `lib/services/repositories/building.repository.ts`
- `lib/services/repositories/lot.repository.ts`
- `lib/services/repositories/contact.repository.ts`
- `lib/services/repositories/supplier-contract.repository.ts`
- `lib/services/repositories/reminder.repository.ts`

**Check specifically:**
- .limit(1) not .single() for multi-team queries
- RLS reliance (no manual auth checks in repositories)
- Promise.all for independent queries (no sequential waste)
- No N+1 patterns
- Proper error handling (not swallowed errors)
- Type safety (no any)

---

## Aggregation Phase

After all blocks complete, create `docs/plans/eval-results/summary.md` with:

1. **Scorecard:** All 15 blocks with their 3-axis scores + weighted
2. **Critical blockers:** Must fix before next release (security < 7)
3. **Important fixes:** Should fix (patterns violations, missing validation)
4. **Design improvements:** Anti-slop fixes (generic UIs, missing empty states)
5. **Optimization opportunities:** Performance, code reuse, DRY violations
6. **Overall PASS/FAIL** with combined weighted score

## Execution Commands

**Sequential (single agent, all blocks):**
```
Evaluate all PENDING blocks from docs/plans/2026-03-25-feature-evaluation-plan.md
following the feature-evaluator methodology. Update the plan after each block.
```

**Parallel (recommended — 4 agents max):**
```
Agent 1: Blocks B1, B2, B3, B4 (pages — independent)
Agent 2: Blocks B5, B6, B7 (intervention flow — sequential)
Agent 3: Blocks B8, B9, B10, B11 (other pages — independent)
Agent 4: Blocks B12, B13 (other roles — independent)
Then: Blocks B14, B15 (cross-cutting — after B1-B13 done)
```
