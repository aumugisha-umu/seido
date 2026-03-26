# B9 -- Operations: Rappels (Reminders)

## Files reviewed (9)
- `app/gestionnaire/(with-navbar)/operations/page.tsx`
- `app/gestionnaire/(no-navbar)/operations/nouveau-rappel/page.tsx`
- `app/gestionnaire/(no-navbar)/operations/nouveau-rappel/nouveau-rappel-client.tsx`
- `app/gestionnaire/(no-navbar)/operations/rappels/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/operations/rappels/[id]/reminder-detail-client.tsx`
- `app/actions/reminder-actions.ts`
- `lib/services/domain/reminder.service.ts`
- `lib/services/repositories/reminder.repository.ts`
- `components/recurrence/recurrence-config.tsx` (imported, not read in full)

---

## Security: 9/10

**Positives:**
- `getServerAuthContext('gestionnaire')` in all 3 Server Component pages (operations/page.tsx:L15, nouveau-rappel/page.tsx:L9, rappels/[id]/page.tsx:L14)
- All 7 server actions use `getServerActionAuthContextOrNull('gestionnaire')` with early return on auth failure
- Zod validation schemas for both create and update: `ReminderCreateSchema` and `ReminderUpdateSchema` (reminder-actions.ts:L34-58)
- UUID validation on all ID parameters (`z.string().uuid().safeParse(id)`)
- XOR constraint validated server-side via `validateLinkedEntity()` (reminder-actions.ts:L67-79) -- enforces `num_nonnulls(building_id, lot_id, contact_id, contract_id) <= 1`
- Team ID verification in `createWizardRemindersAction` (`team.id !== options.team_id` check, L291)
- Repository filters by `team_id` and `is('deleted_at', null)` consistently
- Deferred activity logging via `after()` -- doesn't leak sensitive data

**Issues:**
- (-1) `getReminderStatsAction` accepts `teamId` as parameter but doesn't verify it matches `authContext.team.id` (reminder-actions.ts:L595-624). A gestionnaire could potentially request stats for another team. RLS would block the actual query, but the action should still validate.

---

## Patterns: 9/10

**Positives:**
- Clean 3-layer architecture: Actions -> Service -> Repository
- Repository uses `.limit(1)` not `.single()` (reminder.repository.ts:L83)
- `Promise.all` for parallel stat queries in `getStats()` (reminder.repository.ts:L168)
- Count-only queries use `{ count: 'exact', head: true }` for overdue/due_today (L176-188) -- zero row transfer
- No `any` types anywhere in reminder code
- No `console.log` anywhere
- `Promise.allSettled` for batch creation in `createWizardRemindersAction` (L304) -- fault-tolerant
- Service layer is thin and clean (reminder.service.ts, 139 lines)
- Factory functions for all contexts (browser, server, server-action)
- Proper soft delete pattern
- Recurrence rule handling with rrule.js, graceful fallback if not installed (L226-229)
- XOR constraint enforced in wizard batch with clear priority chain: contract > lot > building > contact (L307-311)

**Issues:**
- (-1) Duplicate recurrence rule creation logic between `createReminderAction` (L177-233) and `createWizardRemindersAction` (L328-381) -- identical pattern should be extracted to a shared helper like `createRecurrenceForReminder()`

---

## Design Quality: 8/10

**Positives:**
- 3-step wizard for creation (Property -> Details -> Confirmation) with `StepProgressHeader`
- Confirmation page uses shared `ConfirmationPageShell`, `ConfirmationEntityHeader`, `ConfirmationSummaryBanner` components -- consistent with other wizards
- Priority selector with visual color coding and `aria-pressed` accessibility
- Date picker component for due date
- Recurrence configuration with `RecurrenceConfig` component and summary display
- Detail page has proper status badges with role-appropriate colors (STATUS_BADGE_VARIANTS, PRIORITY_BADGE_VARIANTS)
- Action buttons contextual to status: "Commencer" for en_attente, "Terminer" for en_cours, "Annuler" for both
- Overdue badge with AlertTriangle icon
- Notes section with inline save (only shows button when changed)
- Disabled interactions when reminder is termine/annule
- Sticky header with back navigation
- Data invalidation broadcast on all mutations (`realtime?.broadcastInvalidation(['reminders'])`)
- Operations page uses Suspense with `ListSkeleton` fallback
- PropertySelector reuse for linking to building/lot with toggle switch
- XOR constraint enforced in UI: selecting lot clears building and vice versa (L163-175)

**Issues:**
- (-1) Reminder detail page has placeholder "L'historique des modifications sera disponible prochainement" (reminder-detail-client.tsx:L364-365) -- incomplete feature
- (-1) AI assistant settings page (adjacent in B11) uses a spinner for loading instead of skeleton. The operations page correctly uses `ListSkeleton` though.
- Recurrence badge shows "Recurrent" but no human-readable summary of the rule on the detail page

**Bonus:**
- (+1) Excellent recurrence UX in creation wizard with `RecurrenceConfig` component and `buildRecurrenceSummary()` for confirmation display

---

## Summary

```
Security:       9/10  █████████░
Patterns:       9/10  █████████░
Design Quality: 8/10  ████████░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 8.7/10
Result: PASS
```

**Blockers:** None

**Improvements:**
1. **MEDIUM**: Extract shared recurrence rule creation logic from both create actions into a `createRecurrenceForReminder()` helper
2. **LOW**: Validate `teamId` against `authContext.team.id` in `getReminderStatsAction`
3. **LOW**: Show human-readable recurrence summary on reminder detail page
4. **LOW**: Implement activity history section (currently placeholder)
