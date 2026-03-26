# Intervention Flow Performance Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all UX bottlenecks in the intervention workflow — cascading sequential awaits, blocking notifications, full page reloads, and redundant queries — to achieve near-instant perceived response on every user action.

**Architecture:** Move all non-critical work (notifications, emails, push) to Next.js `after()` background execution. Replace `window.location.reload()` with `router.refresh()`. Parallelize independent DB operations with `Promise.all`. Close modals optimistically before server response. Fix existing notification bugs.

**Tech Stack:** Next.js 15.2.6 (`after()` API — stable, no experimental flag needed), React 19 (`useOptimistic`), Supabase, TypeScript

---

## Review Notes (2026-02-27)

### Corrections Applied After Review
1. **Task 2 reduced from 10 routes to 4** — Routes `complete`, `finalize`, `schedule`, `validate-tenant`, `quote-request`, `quote-submit` already use `after()` for email notifications. Only `approve`, `reject`, `cancel`, `quote-validate` need wrapping.
2. **Bug fix added (Task 2B)** — `intervention-quote-validate` uses `notificationService` but never instantiates it → silent notification failure for all quote approvals/rejections.
3. **Task 8 refined** — Validate form BEFORE closing dialog, capture variables into local `const` for safety. Analysis confirms no stale closure risk since values are passed by value.
4. **`after()` in Server Actions confirmed safe** — Next.js 15.2.6 supports `after()` in Server Functions (`'use server'`). `cookies()` remains accessible inside `after()` callback in both Route Handlers and Server Actions.
5. **Known issue logged** — `intervention-cancel` route allows any role but `notifyInterventionStatusChange` hardcodes `getServerAuthContext('gestionnaire')`. Bug pre-exists, not in scope.

---

## Acceptance Criteria

- [ ] Zero `window.location.reload()` in intervention-related code
- [ ] `notifyInterventionStatusChange` runs via `after()` in approve/reject/cancel/quote-validate routes
- [ ] `intervention-quote-validate` properly instantiates `NotificationService` — provider notifications actually work
- [ ] All independent DB operations use `Promise.all` — no sequential loops
- [ ] Modals close immediately on confirm (after validation), toast shows on completion
- [ ] `sendConversationNotifications` parallelizes independent queries
- [ ] `lint` passes (`npm run lint`)
- [ ] Manual test: approve, reject, plan, schedule, cancel actions feel instant (< 300ms perceived)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `after()` not running in dev mode | Medium | Low | Test with `npm run build && npm start`; `after()` works in dev with Next.js 15.2.6 |
| Notification failure in `after()` not visible | Low | Medium | Existing logging + error handling in catch blocks |
| Modal closes but action fails silently | Medium | High | Show error toast on failure via `useInterventionWorkflow` hook (already implemented) |
| `router.refresh()` doesn't update slot modals | Low | Medium | Parents already pass `onSuccess` callback; server actions call `revalidatePath` |

---

## Task 1: Replace `window.location.reload()` with `router.refresh()` (Size: S)

Replace 7 instances of full page reload with Next.js router refresh. For modal components that don't have `useRouter`, add the import directly (they are all `'use client'` components).

**Why this matters:** `window.location.reload()` reloads the entire page (JS, CSS, HTML, all state lost). `router.refresh()` only re-fetches the Server Component tree — keeps client state, scroll position, and is ~10x faster.

**Files:**
- Modify: `components/intervention/tabs/execution-tab.tsx` (lines 152, 172, 196)
- Modify: `components/intervention/modals/multi-slot-response-modal.tsx` (line 750)
- Modify: `components/intervention/modals/choose-time-slot-modal.tsx` (line 60)
- Modify: `components/intervention/modals/cancel-slot-modal.tsx` (line 59)
- Modify: `hooks/use-intervention-cancellation.ts` (line 105)

### Step 1: Fix `execution-tab.tsx` — add `useRouter` and replace 3 instances

```typescript
// Add to imports:
import { useRouter } from 'next/navigation'

// Inside component function, add at top:
const router = useRouter()

// Replace line 152 (handleSelectSlot success):
router.refresh()

// Replace line 172 (handleAcceptSlot success):
router.refresh()

// Replace line 196 (handleWithdrawResponse success):
router.refresh()
```

### Step 2: Fix `choose-time-slot-modal.tsx` — add `useRouter`

```typescript
// Add to imports:
import { useRouter } from 'next/navigation'

// Inside component:
const router = useRouter()

// Replace line 60:
router.refresh()
```

### Step 3: Fix `cancel-slot-modal.tsx` — add `useRouter`

```typescript
// Add to imports:
import { useRouter } from 'next/navigation'

// Inside component:
const router = useRouter()

// Replace line 59:
router.refresh()
```

### Step 4: Fix `multi-slot-response-modal.tsx` — add `useRouter`

```typescript
// Add to imports:
import { useRouter } from 'next/navigation'

// Inside component:
const router = useRouter()

// Replace line 750:
router.refresh()
```

### Step 5: Fix `use-intervention-cancellation.ts` — use existing `router`

The hook already imports `useRouter` (line 4). Just replace the reload:

```typescript
// Replace lines 103-106:
// setTimeout(() => {
//   window.location.reload()
// }, 1000)
router.refresh()
```

### Step 6: Verify

```bash
npm run lint
```

---

## Task 2: Move `notifyInterventionStatusChange` to `after()` in 4 API routes (Size: S)

Only 4 routes call `notifyInterventionStatusChange` synchronously. The other 6 routes already use `after()` for email notifications.

**Files:**
- Modify: `app/api/intervention-approve/route.ts` (lines 140-156)
- Modify: `app/api/intervention-reject/route.ts` (lines 107-124)
- Modify: `app/api/intervention-cancel/route.ts` (lines 146-165)
- Modify: `app/api/intervention-quote-validate/route.ts` (lines 252-269)

### Step 1: Pattern to apply

For each route, wrap the `notifyInterventionStatusChange` call in `after()`:

**Before:**
```typescript
import { NextRequest, NextResponse } from 'next/server'

// ... inside the handler, BEFORE the return ...
try {
  const notifResult = await notifyInterventionStatusChange({
    interventionId, oldStatus, newStatus, reason
  })
  // ... logging ...
} catch (notifError) {
  logger.warn(...)
}

return NextResponse.json({ success: true, ... })
```

**After:**
```typescript
import { NextRequest, NextResponse, after } from 'next/server'

// ... build the response FIRST ...
const response = NextResponse.json({ success: true, ... })

// Run notifications in background (after response sent):
after(async () => {
  try {
    await notifyInterventionStatusChange({
      interventionId, oldStatus, newStatus, reason
    })
  } catch (notifError) {
    logger.warn({ notifError }, '⚠️ Background notification failed')
  }
})

return response
```

### Step 2: Apply to `intervention-approve/route.ts`

- Add `after` to the import from `'next/server'`
- Move lines 140-156 (the `notifyInterventionStatusChange` try/catch block) into `after()`
- The comment creation (lines 107-138) stays synchronous — it's user-visible data
- Build the `NextResponse.json` BEFORE the `after()` call

### Step 3: Apply to `intervention-reject/route.ts`

- Same pattern. Lines 107-124 go into `after()`
- Comment saving (lines 89-105) stays synchronous

### Step 4: Apply to `intervention-cancel/route.ts`

- Lines 146-165 go into `after()`
- Activity log creation (lines 122-144) stays synchronous — it's audit data

### Step 5: Apply to `intervention-quote-validate/route.ts`

- Lines 252-269 (`notifyInterventionStatusChange` for approved quotes) go into `after()`
- NOTE: The `notificationService.createNotification` calls at lines 184 and 245 also need to move into `after()`, but they're broken (see Task 2B). Fix them first in Task 2B.

### Step 6: Verify

```bash
npm run lint
```

---

## Task 2B: Fix broken notifications in `intervention-quote-validate` (Size: S)

**BUG:** `notificationService` is used at lines 184 and 245 but never instantiated. All in-app notifications for quote approval/rejection to providers silently fail.

**File:**
- Modify: `app/api/intervention-quote-validate/route.ts`

### Step 1: Add missing imports and instantiation

Follow the pattern from `intervention-complete/route.ts` (lines 14-32):

```typescript
// Add to imports:
import { createServerNotificationRepository } from '@/lib/services'
import { NotificationService } from '@/lib/services/domain/notification.service'

// Inside the handler, after auth check:
const notificationRepository = await createServerNotificationRepository()
const notificationService = new NotificationService(notificationRepository)
```

### Step 2: Move notification calls into `after()`

Since we're now instantiating `notificationService`, move the notification calls (lines 174-203 and 211-250) into `after()` too, alongside the existing `notifyInterventionStatusChange`.

The `after()` block should contain:
1. In-app notification to rejected providers (line 184)
2. In-app notification to the approved/rejected provider (line 245)
3. `notifyInterventionStatusChange` for approved quotes (line 255)

Capture needed variables before `after()`:
```typescript
// Capture before after():
const afterData = {
  interventionId: quote.intervention_id,
  interventionTitle: quote.intervention.title,
  interventionTeamId: quote.intervention.team_id,
  quoteId,
  providerId: quote.provider.id,
  totalAmount: quote.total_amount,
  action,
  rejectionReason,
  userId: user.id,
  otherQuotes: otherQuotes || []
}
```

### Step 3: Verify

```bash
npm run lint
```

---

## Task 3: Move notification to `after()` in `createInterventionAction` server action (Size: XS)

**File:**
- Modify: `app/actions/intervention-actions.ts` (lines 408-413)

### Step 1: Add import and wrap notification

```typescript
// Add to imports (top of file):
import { after } from 'next/server'

// Replace lines 408-413:
after(async () => {
  try {
    await createInterventionNotification(intervention.id)
  } catch (notifError) {
    logger.warn({ error: notifError }, 'Failed to create intervention notification (non-blocking)')
  }
})
```

**Note:** `after()` is confirmed safe in `'use server'` files with Next.js 15.2.6. `cookies()` remains accessible in the callback for Server Functions.

---

## Task 4: Parallelize sequential DB operations in `updateInterventionAction` (Size: S)

**File:**
- Modify: `app/actions/intervention-actions.ts` (lines 777-827)

### Step 1: Parallelize slot updates (lines 777-782)

```typescript
// BEFORE:
for (const update of slotsToUpdate) {
  await supabase
    .from('intervention_time_slots')
    .update(update.data)
    .eq('id', update.id)
}

// AFTER:
if (slotsToUpdate.length > 0) {
  await Promise.all(slotsToUpdate.map(update =>
    supabase
      .from('intervention_time_slots')
      .update(update.data)
      .eq('id', update.id)
  ))
  logger.info({ count: slotsToUpdate.length, changes: slotsToUpdate }, '✏️ Updated time slots')
}
```

### Step 2: Parallelize provider instruction updates (lines 820-827)

```typescript
// BEFORE:
for (const [providerId, instructions] of Object.entries(data.providerInstructions)) {
  await supabase
    .from('intervention_assignments')
    .update({ provider_instructions: instructions })
    .eq('intervention_id', interventionId)
    .eq('user_id', providerId)
    .eq('role', 'prestataire')
}

// AFTER:
await Promise.all(
  Object.entries(data.providerInstructions).map(([providerId, instructions]) =>
    supabase
      .from('intervention_assignments')
      .update({ provider_instructions: instructions })
      .eq('intervention_id', interventionId)
      .eq('user_id', providerId)
      .eq('role', 'prestataire')
  )
)
```

### Step 3: Verify

```bash
npm run lint
```

---

## Task 5: Parallelize `sendParticipantAddedSystemMessage` queries (Size: XS)

**File:**
- Modify: `app/actions/intervention-actions.ts` (lines 58-81)

### Step 1: Run user + thread queries in parallel

```typescript
// BEFORE (lines 58-81) — 2 sequential queries:
const { data: addedUser, error: userError } = await supabase
  .from('users').select('id, name, role').eq('id', addedUserId).single()

if (userError || !addedUser) { ... return }

const { data: groupThread, error: threadError } = await supabase
  .from('conversation_threads').select('id')
  .eq('intervention_id', interventionId).eq('thread_type', 'group').single()

if (threadError || !groupThread) { ... return }

// AFTER — 1 parallel batch:
const [userResult, threadResult] = await Promise.all([
  supabase.from('users').select('id, name, role').eq('id', addedUserId).single(),
  supabase.from('conversation_threads').select('id')
    .eq('intervention_id', interventionId).eq('thread_type', 'group').single()
])

const { data: addedUser, error: userError } = userResult
const { data: groupThread, error: threadError } = threadResult

if (userError || !addedUser) {
  logger.error('❌ [SYSTEM-MESSAGE] Could not find added user:', userError)
  return
}
if (threadError || !groupThread) {
  logger.error('❌ [SYSTEM-MESSAGE] Could not find group thread:', threadError)
  return
}
```

---

## Task 6: Parallelize repository creation in `notifyInterventionStatusChange` (Size: XS)

**File:**
- Modify: `app/actions/notification-actions.ts` (lines 404-419)

### Step 1: Reuse existing repository + parallelize the rest

```typescript
// BEFORE (lines 404-409) — 5 sequential creates, `notificationRepository` is DUPLICATE of line 329:
const notificationRepository = await createServerNotificationRepository()
const interventionRepository = await createServerInterventionRepository()
const userRepository = await createServerUserRepository()
const buildingRepository = await createServerBuildingRepository()
const lotRepository = await createServerLotRepository()

// AFTER — reuse `repository` from line 329, parallelize 4 independent creates:
const [interventionRepository, userRepository, buildingRepository, lotRepository] = await Promise.all([
  createServerInterventionRepository(),
  createServerUserRepository(),
  createServerBuildingRepository(),
  createServerLotRepository()
])
```

Then on line 412, replace `notificationRepository` with `repository` (the variable from line 329):

```typescript
const emailNotificationService = new EmailNotificationService(
  repository,  // was: notificationRepository (duplicate)
  emailService,
  interventionRepository,
  userRepository,
  buildingRepository,
  lotRepository
)
```

---

## Task 7: Parallelize conversation notification queries (Size: XS)

**File:**
- Modify: `app/actions/conversation-notification-actions.ts` (lines 66-115)

### Step 1: Run thread + managers + sender queries in parallel

```typescript
// BEFORE: 3 sequential queries (lines 66, 92, 111):
const { data: thread } = await supabase.from('conversation_threads')...  // await 1
const { data: managers } = await supabase.from('users')...               // await 2
const { data: sender } = await supabase.from('users')...                 // await 3

// AFTER: 1 parallel batch:
const [threadResult, managersResult, senderResult] = await Promise.all([
  supabase.from('conversation_threads')
    .select('id, thread_type, intervention_id, last_email_notification_at, participants:conversation_participants(user_id)')
    .eq('id', threadId).single(),
  supabase.from('users')
    .select('id').eq('team_id', teamId)
    .in('role', ['gestionnaire', 'admin'])
    .not('auth_user_id', 'is', null),
  supabase.from('users')
    .select('id, name, first_name, last_name, role')
    .eq('id', messageUserId).single()
])

const { data: thread, error: threadError } = threadResult
if (threadError || !thread) {
  logger.warn({ threadId, error: threadError }, '⚠️ [CONV-NOTIF] Thread not found')
  return { success: false, pushSent: 0, emailsSent: 0 }
}

const managers = managersResult.data
const sender = senderResult.data
```

**Note:** The `participantIds` filtering (line 84-86) uses `thread.participants` and `messageUserId`, both available after the parallel batch. The `recipientIds` merging (line 100) uses `managerIds`, also available. No logic change needed.

---

## Task 8: Optimize modal close behavior in `workflow-actions.tsx` (Size: XS)

**File:**
- Modify: `components/interventions/workflow-actions.tsx` (lines 208-263)

### Step 1: Validate first, capture values, then close dialog

**Analysis confirms safety:** All form values (`rejectReason`, `cancelReason`, `managerComment`) are passed by value as string parameters to `workflow.reject(reason)`, etc. The async continuation has its own copy — closing the dialog cannot cause stale reads. `useOptimistic` fires synchronously inside `executeAction` before any await.

```typescript
const handleAction = async (action: keyof typeof WORKFLOW_ACTIONS) => {
  // 1. Capture all form state into local const FIRST
  const localRejectReason = rejectReason
  const localCancelReason = cancelReason
  const localManagerComment = managerComment
  const localProviderComment = providerComment
  const localSatisfaction = satisfaction
  const localFinalCost = finalCost
  const localSelectedProvider = selectedProvider

  // 2. Validate BEFORE closing (reopening a closed dialog is jarring)
  switch (action) {
    case 'reject':
      if (!localRejectReason || localRejectReason.length < 10) {
        toast.error('Veuillez fournir une raison détaillée (min. 10 caractères)')
        return
      }
      break
    case 'cancel':
      if (!localCancelReason || localCancelReason.length < 10) {
        toast.error('Veuillez fournir une raison détaillée (min. 10 caractères)')
        return
      }
      break
    case 'requestQuote':
      if (!localSelectedProvider) {
        toast.error('Veuillez sélectionner un prestataire')
        return
      }
      break
  }

  // 3. Close dialog immediately — validation passed
  setDialogOpen(null)

  // 4. Execute action (optimistic update handled by useInterventionWorkflow)
  try {
    switch (action) {
      case 'approve':
        await workflow.approve(localManagerComment)
        break
      case 'reject':
        await workflow.reject(localRejectReason)
        break
      case 'requestQuote':
        await workflow.requestQuote(localSelectedProvider)
        break
      case 'startPlanning':
        await workflow.startPlanning()
        break
      case 'confirmSchedule':
        toast.info('Sélection de créneau requise')
        break
      case 'startWork':
        await workflow.startWork()
        break
      case 'completeWork':
        await workflow.completeWork(localProviderComment)
        break
      case 'validateWork':
        await workflow.validateWork(localSatisfaction)
        break
      case 'finalize':
        await workflow.finalize(localFinalCost)
        break
      case 'cancel':
        await workflow.cancel(localCancelReason)
        break
    }

    if (onStatusChange && WORKFLOW_ACTIONS[action].nextStatus) {
      onStatusChange(WORKFLOW_ACTIONS[action].nextStatus)
    }
  } catch (error) {
    console.error('Error executing action:', error)
    // Error toast is handled by useInterventionWorkflow.executeAction
  }
}
```

---

## Task 9: Parallelize file uploads in `document-upload-dialog.tsx` (Size: S)

**File:**
- Modify: `components/interventions/document-upload-dialog.tsx` (lines 197-225)

### Step 1: Upload files in parallel with concurrency limit

```typescript
// BEFORE: Sequential upload (lines 198-225)
for (let i = 0; i < files.length; i++) {
  const formData = new FormData()
  ...
  const response = await fetch('/api/upload-intervention-document', { ... })
  ...
  setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
}

// AFTER: Parallel upload (max 3 concurrent to avoid overwhelming server)
const CONCURRENCY = 3
const uploadedIds: string[] = []
let completedCount = 0

for (let i = 0; i < files.length; i += CONCURRENCY) {
  const batch = files.slice(i, i + CONCURRENCY)
  const results = await Promise.all(
    batch.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('interventionId', interventionId)
      formData.append('documentType', documentType)
      formData.append('description', description || `Document ${documentType} - ${file.name}`)

      const response = await fetch('/api/upload-intervention-document', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || `Erreur lors de l'upload de ${file.name}`)
      }
      return result.document.id
    })
  )
  uploadedIds.push(...results)
  completedCount += batch.length
  setUploadProgress(Math.round((completedCount / files.length) * 100))
}
```

---

## Task 10: Scope cache invalidation to affected roles (Size: XS)

**File:**
- Modify: `app/actions/intervention-actions.ts` (lines 178-194)

### Step 1: Add optional `affectedRoles` parameter

```typescript
function revalidateInterventionCaches(
  interventionId: string,
  teamId?: string,
  affectedRoles: ('gestionnaire' | 'locataire' | 'prestataire')[] = ['gestionnaire', 'locataire', 'prestataire']
) {
  revalidateTag('interventions')
  revalidateTag('stats')
  if (teamId) {
    revalidateTag(`team-${teamId}-interventions`)
    revalidateTag(`team-${teamId}-stats`)
  }

  for (const role of affectedRoles) {
    revalidatePath(`/${role}/interventions`)
    revalidatePath(`/${role}/interventions/${interventionId}`)
  }
}
```

This is backward compatible — existing callers without `affectedRoles` invalidate all 3 roles as before. New callers can scope:
- Approval/Rejection: `['gestionnaire', 'locataire']` (prestataire not involved yet)
- Quote actions: `['gestionnaire', 'prestataire']` (locataire not involved)
- Scheduling: `['gestionnaire', 'prestataire']`

---

## Summary — Expected Impact

| Optimization | Before | After | Gain |
|-------------|--------|-------|------|
| Approve/Reject response time | 1-3s (notification blocking) | < 200ms | **~90%** |
| Time slot modal confirm | 2-4s (full page reload) | < 300ms (router.refresh) | **~85%** |
| Multi-slot response | 2-4s (full page reload) | < 300ms | **~85%** |
| Cancellation | 3-5s (1s delay + reload) | < 300ms | **~90%** |
| Update intervention (5 slots) | 5 × roundtrip | 1 × roundtrip (Promise.all) | **~80%** |
| Quote notification to providers | Silent failure (bug) | Working notifications | **Bug fix** |
| Conversation notifications | 3 sequential queries | 1 parallel batch | **~66%** |
| File upload (5 files) | 5 sequential | 2 batches (3+2) | **~60%** |

**Total perceived improvement: Actions that felt like 2-4 seconds will feel near-instant (< 300ms).**

---

## Known Issues (Out of Scope)

1. **`intervention-cancel` auth mismatch**: Route accepts any role via `getApiAuthContext()` but `notifyInterventionStatusChange()` hardcodes `getServerAuthContext('gestionnaire')`. Non-gestionnaire cancellations will have silent notification failure. Pre-existing bug, separate fix needed.
2. **`intervention-availability-submit` and `intervention-confirm-participation`**: No notifications sent at all (TODO comments in code). Feature gap, not optimization.
3. **`notifyQuoteSubmittedWithPush` in `quote-submit`**: Called synchronously outside `after()`. Low impact since it uses `createServiceRoleSupabaseClient()` (fast, no auth overhead).

---

**PRD:** N/A (optimization + bug fix, not feature)
**Dependencies:** None — Next.js 15.2.6 already supports `after()`
**Execution Order:** Task 1 → Task 2 + 2B → Task 3 → Tasks 4-7 (independent) → Task 8 → Task 9 → Task 10
