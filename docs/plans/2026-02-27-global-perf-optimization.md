# Global Performance Optimization Plan — CRUD + Email Module

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Fix all UX bottlenecks across CRUD entities (lots, immeubles, contacts, contrats) and the email module — unmemoized callbacks causing polling churn, N+1 queries, sequential awaits, full-page reloads, and non-functional filters.

**Architecture:** Same patterns as the intervention optimization: `Promise.all` for independent queries, `router.refresh()` over `window.location.reload()`, `after()` for background work. For email: memoize polling/realtime callbacks, remove no-op filters, optimize SSR payload.

**Tech Stack:** Next.js 15.2.6, React 19, Supabase, TypeScript

**Review Notes (2026-02-27):**
- Task 1 REWRITTEN: Original `folderOverride` approach was wrong — React 18 batching makes it unnecessary. Real root cause is unmemoized inline callbacks causing polling/realtime subscription reset every render.
- Task 10 REWRITTEN: `adaptEmail` needs `body_html`/`body_text` — can't exclude them. Real optimization is narrowing `email_attachments(*)`.
- Task 8 CORRECTED: Use `href` prop pattern (like `patrimoine.config.tsx`), not `router.push`.
- Task 9 CORRECTED: Hook doesn't import `useRouter` — use `onSuccess` callback pattern.
- Task 3 ENHANCED: Added `deleted_at` filter, JOIN requirements, redundant query removal.
- Task 6 ENHANCED: Added duplicate `getByLot` query removal.

---

## Acceptance Criteria

- [ ] Email folder switching works on first click (polling/realtime callbacks memoized)
- [ ] Email date filter actually filters (no-op removed)
- [ ] Zero N+1 document queries on building/lot detail pages
- [ ] Biens list page, building/lot/contract detail pages use `Promise.all` for independent queries
- [ ] Zero `window.location.href` in contacts table config (use `href` prop pattern)
- [ ] Zero `window.location.reload()` remaining in intervention-related hooks
- [ ] Email SSR uses narrowed `email_attachments` columns (not `*`)
- [ ] `npm run lint` passes

---

## Task 1: Memoize email polling/realtime callbacks — root cause of "multiple clicks" (Size: S) — P0

**THE #1 bug.** Unmemoized inline callbacks (`onNewEmails`, `onNewEmail`, `onCountsChange`) create new references every render, causing `useEmailPolling` and `useEmailRealtime` to reset their polling interval and realtime subscription on each re-render. This makes folder switching appear broken because the subscription tears down and re-initializes repeatedly.

**NOTE:** The original `folderOverride` approach was WRONG. React 18 batches state updates synchronously, so `currentFolder` is already correct when the useEffect fires. The `AbortController` already handles race conditions. The real issue is callback instability.

**File:** `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`

### Problem (lines ~243-257)
```typescript
// These inline arrows create NEW references every render:
<EmailPollingProvider
  onNewEmails={(newEmailIds) => { /* ... */ }}  // ← new ref every render!
  onCountsChange={(newCounts) => { /* ... */ }}  // ← new ref every render!
/>
```

Also in the realtime hook setup:
```typescript
onNewEmail={(email) => { /* ... */ }}  // ← new ref every render!
```

### Fix: Wrap all polling/realtime callbacks in `useCallback`

**Step 1:** Find all inline callbacks passed to `useEmailPolling`/`EmailPollingProvider` and `useEmailRealtime`. Wrap each in `useCallback` with stable dependencies:

```typescript
const handleNewEmails = useCallback((newEmailIds: string[]) => {
  // existing logic from the inline arrow
}, [/* only stable deps: fetchEmails, etc. */])

const handleCountsChange = useCallback((newCounts: FolderCounts) => {
  // existing logic
}, [/* stable deps */])

const handleNewEmail = useCallback((email: Email) => {
  // existing logic
}, [/* stable deps */])
```

**Step 2:** Replace all inline arrows with the memoized references:
```typescript
<EmailPollingProvider
  onNewEmails={handleNewEmails}
  onCountsChange={handleCountsChange}
/>
```

**Step 3:** Verify that `useEmailPolling` and `useEmailRealtime` have the callbacks in their dependency arrays — if they do, the memoized callbacks will prevent unnecessary resubscriptions.

---

## Task 2: Fix email date filter no-op (Size: XS) — P0

**File:** `app/gestionnaire/(with-navbar)/mail/components/email-list.tsx`

### Problem (line 64-66)
```typescript
const matchesDate = dateFilter === 'all' || true  // Always true!
```

### Fix: Implement actual date filtering
```typescript
const matchesDate = (() => {
  if (dateFilter === 'all') return true
  const emailDate = new Date(email.received_at || email.created_at)
  const now = new Date()
  switch (dateFilter) {
    case 'today':
      return emailDate.toDateString() === now.toDateString()
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return emailDate >= weekAgo
    }
    case 'month': {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return emailDate >= monthAgo
    }
    default:
      return true
  }
})()
```

Check what `dateFilter` values are used in the filter dropdown to match the cases correctly.

---

## Task 3: Fix N+1 document queries on building + lot detail pages (Size: M) — P0

**Files:**
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx` (lines ~245-274)
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` (lines ~352-385)
- `lib/services/repositories/intervention.repository.ts` (new batch method)

### Problem
Both pages do:
```typescript
const interventionsWithDocsData = await Promise.all(
  interventions.map(async (intervention) => {
    const docsResult = await interventionService.getDocuments(intervention.id)  // 1 query per intervention!
    return { ...intervention, documents: docsResult.success ? docsResult.data : [] }
  })
)
```
With 20 interventions = 20 sequential queries.

**Additional findings from review:**
- `getDocuments()` in `intervention.repository.ts` does NOT filter `deleted_at` — soft-deleted docs may leak through. The batch query should add this filter.
- The building page has a redundant interventions fetch: `getByBuildingWithLots` (step 3) already returns interventions, but `getByBuilding` (step 4) re-fetches them.
- The lot page has a duplicate `getByLot` call at lines ~184 and ~355.

### Fix: Batch-load documents in a single query

**Step 1:** Add a `getDocumentsByInterventionIds` method to the intervention repository:

```typescript
// Single query to get all documents for multiple interventions
const interventionIds = interventions.map(i => i.id)
const { data: allDocs } = await supabase
  .from('intervention_documents')
  .select('*, uploaded_by_user:uploaded_by(id, name, first_name, last_name)')
  .in('intervention_id', interventionIds)
  .is('deleted_at', null)  // ← IMPORTANT: filter soft-deleted docs

// Group by intervention_id
const docsByIntervention = new Map<string, typeof allDocs>()
for (const doc of (allDocs || [])) {
  const existing = docsByIntervention.get(doc.intervention_id) || []
  existing.push(doc)
  docsByIntervention.set(doc.intervention_id, existing)
}

// Merge
const interventionsWithDocsData = interventions.map(intervention => ({
  ...intervention,
  documents: docsByIntervention.get(intervention.id) || []
}))
```

**Step 2:** Apply this pattern in BOTH building and lot detail pages.

**Step 3:** Remove the redundant interventions query on the building page — `getByBuildingWithLots` already fetches interventions, so remove the duplicate `getByBuilding` call.

**Step 4:** Remove the duplicate `getByLot` call on the lot page (lines ~184 and ~355 — one result can serve both usages).

---

## Task 4: Parallelize Biens list page queries (Size: XS) — P1

**File:** `app/gestionnaire/(with-navbar)/biens/page.tsx` (lines 62-103)

### Problem
Single-team path has 3 sequential independent queries:
```typescript
const buildingsResult = await buildingService.getBuildingsByTeam(team.id)
const lotsResult = await lotService.getLotsByTeam(team.id)
const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
```

Note: The multi-team path (line 38) already correctly uses `Promise.all`.

### Fix
```typescript
const [buildingsResult, lotsResult, occupiedResult] = await Promise.all([
  buildingService.getBuildingsByTeam(team.id),
  lotService.getLotsByTeam(team.id),
  contractService.getOccupiedLotIdsByTeam(team.id)
])
```

---

## Task 5: Parallelize building detail page queries (Size: S) — P1

**File:** `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx` (lines ~111-326)

### Problem
After loading building + lots (sequential, necessary), 4 independent data fetches run sequentially:
- Occupied lots + contracts
- Interventions
- Building contacts
- Address

### Fix
After building and lots are loaded, run independent queries in `Promise.all`:
```typescript
const [occupiedResult, contractsResult, interventionsResult, buildingContactsData, addressData] = await Promise.all([
  contractService.getOccupiedLotIdsByTeam(team.id),
  // contracts for lots...
  interventionService.getByBuildingWithLots(id, lotIds),
  // building contacts query...
  // address query...
])
```

Read the file carefully to identify exactly which queries are independent.

---

## Task 6: Parallelize lot detail page queries + remove duplicate fetch (Size: S) — P1

**File:** `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` (lines ~108-503)

### Problem
8+ sequential steps where 5 are independent (interventions, contacts, building contacts, contracts, tenant checks).

**Additional finding:** Duplicate `interventionService.getByLot(id)` call at lines ~184 and ~355 — the second call is redundant.

### Fix
**Step 1:** Remove the duplicate `getByLot` call — use the first result for both usages.

**Step 2:** After lot is loaded, run independent queries in `Promise.all`. Read the file to identify exactly which queries depend on each other.

---

## Task 7: Parallelize contract detail page queries (Size: XS) — P1

**File:** `app/gestionnaire/(no-navbar)/contrats/[id]/page.tsx` (lines ~66-113)

### Problem
```typescript
const contract = await contractService.getById(id)
const documentsResult = await contractService.getDocuments(id)  // independent
const interventionsResult = await interventionService.getByContract(id)  // independent
```

### Fix
```typescript
const contract = await contractService.getById(id)
const [documentsResult, interventionsResult] = await Promise.all([
  contractService.getDocuments(id),
  interventionService.getByContract(id)
])
```

---

## Task 8: Replace `window.location.href` in contacts table config (Size: XS) — P1

**File:** `config/table-configs/contacts.config.tsx` (lines ~340, 348, 360)

### Problem
```typescript
onClick: (contact) => {
  window.location.href = `/gestionnaire/contacts/modifier/${contact.id}`
}
```
Full page reload on every contact row action.

### Fix: Use `href` prop pattern (same as `patrimoine.config.tsx`)

The `patrimoine.config.tsx` already uses the correct pattern — `href` prop on action buttons instead of `onClick` with `window.location.href`:

```typescript
// patrimoine.config.tsx (correct pattern):
{
  label: 'Modifier',
  href: (building) => `/gestionnaire/biens/immeubles/modifier/${building.id}`
}
```

Replace all `onClick: (contact) => { window.location.href = ... }` with `href: (contact) => ...` in the contacts config. The table component already supports the `href` prop and renders it as a Next.js `<Link>`.

---

## Task 9: Fix `window.location.reload()` in planning hook (Size: XS) — P1

**File:** `hooks/use-intervention-planning.ts` (line ~270)

### Problem
Uses `window.location.reload()` but does NOT import `useRouter` — cannot simply swap to `router.refresh()`.

### Fix: Use `onSuccess` callback pattern
The hook should accept an `onSuccess` callback from the consuming component, which can call `router.refresh()`:

```typescript
// In the hook signature:
const useInterventionPlanning = ({ onSuccess }: { onSuccess?: () => void }) => {
  // ...
  // Replace window.location.reload() with:
  onSuccess?.()
}

// In the consuming component:
const router = useRouter()
const { ... } = useInterventionPlanning({ onSuccess: () => router.refresh() })
```

Read the file to check if there's already an `onSuccess` prop or similar callback mechanism.

---

## Task 10: Optimize email SSR payload — narrow attachment columns (Size: S) — P1

**File:** `app/gestionnaire/(with-navbar)/mail/page.tsx` (lines ~279-328)

### Problem
SSR `getInitialEmails` uses `select('*')` which includes `body_html` (5-50KB per email) and `email_attachments(*)` which fetches all attachment columns.

### Important: `body_html` and `body_text` CANNOT be excluded

**Review finding:** `adaptEmail()` actually NEEDS `body_html` and `body_text` to function — removing them would break the email detail view. The SSR page loads emails that will be displayed including their body.

### Fix: Narrow `email_attachments(*)` to only needed columns

The `EmailList` component only needs attachment metadata (name, size, type), not the full attachment data. Replace `email_attachments(*)` with explicit columns:

```typescript
.select(`
  *,
  attachments:email_attachments(id, filename, content_type, size, storage_path)
`, { count: 'estimated' })
```

Read `email-list.tsx` and `email-detail.tsx` to verify exactly which attachment columns are used in the list view vs detail view. The detail view can lazy-load full attachment data when needed.

---

## Task 11: Fix emailLinksCache destroyed on email change (Size: XS) — P1

**File:** `app/gestionnaire/(with-navbar)/mail/components/email-detail.tsx` + `mail-client.tsx`

### Problem
`EmailDetail` is rendered with `key={selectedEmail.id}` which destroys and recreates the component (and its `useRef` cache) on every email selection.

### Fix
Move `emailLinksCache` to the parent `MailClient` component and pass it as a prop:

```typescript
// In mail-client.tsx:
const emailLinksCache = useRef<Map<string, EmailLink[]>>(new Map())

// Pass to EmailDetail:
<EmailDetail emailLinksCache={emailLinksCache} ... />
```

---

## Task 12: Add loading state to email entity click (Size: XS) — P1

**File:** `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` (lines ~468-493)

### Problem
`handleEntityClick` calls fetch without any loading indicator. Users think nothing happened and click again.

### Fix
Add loading state:
```typescript
const handleEntityClick = useCallback(async (type: string, id: string) => {
  setIsLoading(true)  // existing loading state
  try {
    const response = await fetch(`/api/entities/${type}/${id}/emails`)
    // ...
  } finally {
    setIsLoading(false)
  }
}, [linkedEntities])
```

Check what loading state variable exists in the component and use it.

---

## Task 13: Parallelize contract overlap checks (Size: XS) — P1

**File:** `app/actions/contract-actions.ts` (lines ~1162-1188)

### Problem
```typescript
for (const tenantUserId of tenantUserIds) {
  const tenantResult = await repository.findTenantActiveContractsOnLot(...)
}
```

### Fix
```typescript
const results = await Promise.all(
  tenantUserIds.map(id => repository.findTenantActiveContractsOnLot(lotId, id, startDate, endDate, excludeContractId))
)
```

---

## ~~Task 14: Memoize email polling callbacks~~ — MERGED into Task 1

This task is now part of Task 1 (memoize polling/realtime callbacks). No separate work needed.

---

## Summary — Expected Impact

| Fix | Before | After | Priority |
|-----|--------|-------|----------|
| Email polling/realtime callbacks | Resubscribe every render → multiple clicks | Stable subscriptions, first-click works | **P0** |
| Email date filter | Does nothing (`\|\| true`) | Actually filters | **P0** |
| Building/Lot detail (20 interventions) | 21 queries (N+1) | 2 queries (batch) | **P0** |
| Biens list page | 3 sequential queries | 1 parallel batch | **P1** |
| Building detail page | 6 sequential steps + redundant fetch | 2 sequential + 4 parallel | **P1** |
| Lot detail page | 8 sequential steps + duplicate fetch | 2 sequential + 5 parallel | **P1** |
| Contract detail page | 3 sequential | 1 + 2 parallel | **P1** |
| Contacts navigation | Full page reload | SPA `<Link>` navigation | **P1** |
| Email SSR attachments | Full `email_attachments(*)` | Narrowed columns only | **P1** |
| Email entity filter click | No loading feedback | Loading indicator | **P1** |
| Email links cache | Destroyed every click | Persistent across emails | **P1** |
| Planning hook | `window.location.reload()` | `onSuccess` callback → `router.refresh()` | **P1** |
| Contract overlap checks | Sequential loop | `Promise.all` | **P1** |

---

**Execution Order:** Task 1 → Task 2 → Task 3 → Tasks 4-7 (independent) → Tasks 8-9 → Tasks 10-12 → Task 13
**Note:** Task 14 merged into Task 1. Total: 13 tasks.
