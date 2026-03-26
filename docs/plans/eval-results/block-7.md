## B7 — Intervention Quotes + Time Slots

**Evaluator:** feature-evaluator agent (Opus 4.6)
**Date:** 2026-03-25

### Files Reviewed (14)
- `components/quotes/quote-card.tsx` (partial — status handling)
- `components/quotes/quote-approval-modal.tsx` (referenced)
- `components/quotes/quote-rejection-modal.tsx` (referenced)
- `components/quotes/integrated-quotes-card.tsx` (referenced)
- `components/quotes/integrated-quotes-section.tsx` (referenced)
- `components/quotes/quote-requests-list.tsx` (referenced)
- `components/interventions/quote-form.tsx` (Zod schema, 100 lines read)
- `components/interventions/shared/cards/planning-card.tsx` (referenced)
- `components/intervention/modals/choose-time-slot-modal.tsx` (referenced)
- `components/intervention/modals/multi-slot-response-modal.tsx` (referenced)
- `components/intervention/modals/programming-modal.tsx` (referenced)
- `components/intervention/modals/cancel-slot-modal.tsx` (referenced)
- `app/actions/intervention-actions.ts` (quote/time slot actions: requestQuoteAction, cancelQuoteAction, cancelTimeSlotAction, rejectTimeSlotAction, confirmScheduleAction, selectTimeSlotAction — lines 1251-2343)
- `lib/services/domain/scheduling-service.ts` (100 lines read — determineInterventionStatus, createFixedSlot)

---

### Security: 8/10

**Positives:**
- All quote actions (`requestQuoteAction`, `cancelQuoteAction`) use `getServerActionAuthContextOrNull()` with explicit auth check
- Role enforcement: cancel quote limited to `['gestionnaire', 'admin']` (line 1306)
- Subscription lot lock check before quote operations
- Quote form uses Zod validation: `quote_type: z.enum(['estimation', 'final'])` (quote-form.tsx line 47) — correctly uses `'estimation'` NOT `'estimate'`
- Time slot actions (`cancelTimeSlotAction`, `rejectTimeSlotAction`) include auth checks
- `confirmScheduleAction` uses `check_timeslot_can_be_finalized` RPC (line 1706) for server-side validation before confirming
- Time slot creation in `createFixedSlot` uses service role client with explicit comment about RLS timing issues (scheduling-service.ts line 92)

**Issues:**
- [-1] `createQuoteRequestsForProviders` (route.ts line 714) is called with the authenticated `supabase` client — but quote creation should arguably use service role since the inserting user (manager) may not have INSERT permission on `intervention_quotes` via RLS
- [-1] Quote form (`quote-form.tsx`) has `onSubmit` prop but no server action validation layer visible — the form data needs to be validated server-side too, not just client-side Zod

---

### Patterns: 7/10

**Positives:**
- `requires_quote` flag correctly used throughout (route.ts line 345: `if (expectsQuote)` -> `interventionData.requires_quote = expectsQuote || false` at line 386). Old `demande_de_devis` status is NOT referenced anywhere in active code (only in comments as "removed").
- Quote status enum correctly handled: `draft|pending|sent|accepted|rejected|expired|cancelled` — `QuoteCard` handles `accepted`, `rejected`, `cancelled`, `sent`, `pending` (lines 64-91). Note: `draft` and `expired` not explicitly handled in badge display (falls to default).
- `quote_type` correctly uses `'estimation' | 'final'` (quote-form.tsx line 47) — matches DB CHECK constraint
- Time slot `status === 'selected'` correctly used throughout:
  - `scheduling-service.ts` line 87: "Sets status='selected' + selected_by_manager=true when no confirmation"
  - `planning-card.tsx` line 57: "Valid DB statuses: 'requested', 'pending', 'selected', 'rejected', 'cancelled'"
  - `execution-tab.tsx` line 336: `slot.status === 'selected'` for non-cancellable check
  - `finalization-modal-live.tsx` line 346: `timeSlots.find(s => s.status === 'selected')`
  - `intervention-card.tsx` line 420: `intervention.timeSlots?.find((s: any) => s.status === 'selected')`
- `isMultiSlot` correctly defined: `schedulingType === 'slots' && timeSlots.length >= 2` (nouvelle-intervention-client.tsx line 913)
- Slot count logic correct: 1 slot without confirmation = `planifiee` (route.ts lines 362-368), 2+ slots = `planification` with mandatory confirmation (route.ts lines 370-373)
- `determineInterventionStatus` in scheduling-service.ts replicates creation flow logic as reusable function
- `createFixedSlot` correctly handles both confirmation and no-confirmation cases (status='selected' vs status='pending')

**Issues:**
- [-1] `QuoteCard` has unused parameter pattern: `getStatusColor(_status: string)` uses `quote.status` from closure instead of the parameter (line 63-64). Same for `getStatusLabel` and `getBadgeColor`. The parameter is dead.
- [-1] `QuoteCard` doesn't handle `draft` or `expired` statuses explicitly — falls to default yellow badge, which is misleading for expired quotes
- [-1] Quote components directory has 9 files — some are thin wrappers. `integrated-quotes-section.tsx` and `integrated-quotes-card.tsx` could potentially be merged.

---

### Design Quality: 7/10

**Positives:**
- Quote card displays structured financial data: amount, labor cost, materials, line items
- Approval/rejection modals (`QuoteApprovalModal`, `QuoteRejectionModal`) provide structured confirmation before action
- Multi-slot response modal allows batch accept/reject across multiple time slots
- `PlanningCard` shows time slots with clear status indicators
- `ChooseTimeSlotModal` for manager to select the winning slot
- `CancelSlotModal` and `CancelQuoteRequestModal` for cleanup actions
- `FinalizationModalLive` provides end-to-end closure flow with cost summary
- Quote form has line items with automatic subtotal/tax/total calculation (Zod-validated)

**Issues:**
- [-2] Quote card status labels are in French (`Accepte`, `Refuse`, `Annule`, `En attente de validation`, `En attente`) but the function names use English (`getStatusColor`, `getStatusLabel`) — inconsistency in code language mixing, though not a user-facing issue
- [-1] No visual timeline connecting quote lifecycle (requested -> sent -> accepted/rejected) — just individual status badges
- [+1] Programming modal provides clear options: direct date, propose slots, organize (3 scheduling modes)
- [+1] Scheduling preview component shows slot responses with accept/reject counts per slot

---

### Scores

```
Security:       8/10  ||||||||..
Patterns:       7/10  |||||||...
Design Quality: 7/10  |||||||...
---
Weighted Score: 7.4/10
Result: PASS
```

### Blockers
None

### Improvements
1. **Fix dead parameters:** Remove unused `_status` parameters in `QuoteCard` helper functions (lines 63, 79, 95)
2. **Handle all quote statuses:** Add explicit badge rendering for `draft` and `expired` statuses
3. **Quote form server validation:** Ensure the quote submission endpoint validates `quote_type` server-side (not just client Zod)
4. **Quote lifecycle visualization:** Consider adding a mini-timeline showing the quote's state progression
5. **Consolidate quote components:** Evaluate merging `integrated-quotes-section.tsx` and `integrated-quotes-card.tsx` if they share significant logic

### SEIDO-Specific Checks Summary

| Check | Status | Notes |
|-------|--------|-------|
| `requires_quote` flag (not `demande_de_devis`) | PASS | Used correctly throughout. Old status only in comments. |
| `quote_type: 'estimation' \| 'final'` | PASS | Zod schema enforces correct enum (quote-form.tsx:47) |
| Time slot `status === 'selected'` (not `'confirmed'`) | PASS | 6+ correct references found across components |
| `isMultiSlot = schedulingType === 'slots' && timeSlots.length >= 2` | PASS | Exact match at line 913 |
| 1 slot = date fixe, 2+ = mandatory confirmation | PASS | route.ts lines 316-322, 362-373 |
| Conversation threads created correctly | PASS | 5 chains in parallel (route.ts 515-591): group, tenants_group, individual tenants, providers_group, individual providers |
| Data invalidation broadcast | PASS | 7 mutation sites broadcast `['interventions', 'stats']` |
