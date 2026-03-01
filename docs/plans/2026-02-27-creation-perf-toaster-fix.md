# Creation Flow Performance + Toaster Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Fix ForwardRef error (dual toaster conflict), fix broken analytics tracking, migrate 34 files from custom useToast to Sonner, and parallelize entity creation flows for near-instant UX.

**Architecture:** Remove Radix toast system entirely (custom Toaster + useToast hook), standardize on Sonner. Parallelize lot creation with `Promise.all`, document uploads with `Promise.allSettled`, and flatten lot intervention loops.

**Tech Stack:** Next.js 15.2.6, React 19, Sonner 1.7.4, Supabase, TypeScript

---

## Acceptance Criteria

- [ ] Zero ForwardRef setState errors in console
- [ ] `<Toaster />` (Radix) removed from layout.tsx — only `<SonnerToaster />` remains
- [ ] Zero imports from `@/hooks/use-toast` or `@/components/ui/use-toast` in app code
- [ ] Analytics tracking works when cookies accepted (`consentState.preferences.analytics`)
- [ ] Building creation with 5 lots completes in ~1 round trip (not 5 sequential)
- [ ] Document uploads for building+lots run in parallel
- [ ] `npm run lint` passes

---

## Task 1: Fix analytics-provider consent bug (Size: XS) — P0

**File:** `components/analytics-provider.tsx`

### Problem (lines 40, 45)
```typescript
const { consent } = useCookieConsent()  // WRONG — hook returns consentState, not consent
// ...
{consent?.analytics && (  // Always undefined → AnalyticsTracker NEVER renders
```

### Fix
```typescript
const { consentState } = useCookieConsent()
// ...
{consentState.preferences.analytics && (
```

Check `hooks/use-cookie-consent.tsx` to verify the exact shape of `consentState.preferences`.

---

## Task 2: Remove custom Toaster + migrate useToast to Sonner (Size: L) — P0

This is the ForwardRef fix. Two toast systems conflict in the same render tree.

### Step 1: Remove `<Toaster />` from layout.tsx

**File:** `app/layout.tsx`
- Remove line 14: `import { Toaster } from "@/components/ui/toaster"`
- Remove line 77: `<Toaster />`
- Keep `<SonnerToaster />` (line 78)

### Step 2: Migrate 34 files from useToast to Sonner

**Pattern transformation:**
```typescript
// BEFORE (custom useToast):
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()
toast({ title: "Success", description: "Done", variant: "success" })
toast({ title: "Error", description: "Failed", variant: "destructive" })
toast({ title: "Warning", description: "Careful", variant: "warning" })

// AFTER (Sonner):
import { toast } from "sonner"
toast.success("Success", { description: "Done" })
toast.error("Error", { description: "Failed" })
toast.warning("Warning", { description: "Careful" })
// default variant → toast("Title", { description: "..." })
```

**Variant mapping:**
| useToast variant | Sonner equivalent |
|-----------------|-------------------|
| `"success"` | `toast.success(title, { description })` |
| `"destructive"` | `toast.error(title, { description })` |
| `"warning"` | `toast.warning(title, { description })` |
| `"default"` / none | `toast(title, { description })` |

**Files to migrate (34 files across 3 categories):**

**App routes (9 files):**
- `app/admin/(with-navbar)/users/users-management-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/immeubles/modifier/[id]/edit-building-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
- `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-2-company.tsx`
- `app/gestionnaire/(no-navbar)/interventions/modifier/[id]/intervention-edit-client.tsx`
- `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/nouvelle-intervention-client.tsx`
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`
- `app/gestionnaire/(with-navbar)/notifications/notifications-client.tsx`
- `app/locataire/(no-navbar)/interventions/nouvelle-demande/nouvelle-demande-client.tsx`

**Components (17 files):**
- `components/building-contacts-tab.tsx`
- `components/contact-details/hooks/use-contact-invitation.ts`
- `components/contacts/building-contacts-navigator.tsx`
- `components/dashboards/manager/manager-dashboard-v2.tsx`
- `components/dashboards/shared/intervention-card.tsx`
- `components/intervention/finalization-modal-live.tsx`
- `components/intervention/simple-work-completion-modal.tsx`
- `components/notifications/personal-notifications-page.tsx`
- `components/notifications-page.tsx`
- `components/patrimoine/lot-card-unified/building-lots-grid.tsx`
- `components/profile-page.tsx`
- `components/quotes/quote-approval-modal.tsx`
- `components/quotes/quote-rejection-modal.tsx`
- `components/ui/contacts-grid-preview.tsx`
- `components/ui/lot-contacts-grid-preview.tsx`
- `components/ui/lots-with-contacts-preview.tsx`
- `components/ui/security-modals.tsx`

**Hooks (8 files):**
- `hooks/use-creation-success.ts` (DEPRECATED — consider deleting)
- `hooks/use-intervention-approval.ts`
- `hooks/use-intervention-cancellation.ts`
- `hooks/use-property-creation.ts`
- `hooks/use-quote-cancellation.ts`
- `hooks/use-quote-toast.ts` (specialized — migrate all 11 patterns)
- `hooks/use-strategic-notification.ts`
- `hooks/use-auto-execute-action.ts`

### Step 3: Delete dead toast infrastructure

After all migrations verified:
- Delete `components/ui/toaster.tsx`
- Delete `components/ui/toast.tsx` (Radix primitives)
- Delete `hooks/use-toast.ts`
- Delete `components/ui/use-toast.ts`

### Important notes:
- Two different `use-toast` files exist (`hooks/use-toast.ts` and `components/ui/use-toast.ts`) — migrate both import paths
- `use-quote-toast.ts` has 11 predefined message patterns — migrate each one to Sonner
- `use-creation-success.ts` is already marked DEPRECATED — delete it, migrate its 1 consumer
- Some files use `duration` option — Sonner supports this natively: `toast.success("...", { duration: 8000 })`

---

## Task 3: Parallelize lot creation in composite service (Size: S) — P1

**File:** `lib/services/domain/composite.service.ts` (lines ~717-750)

### Problem
```typescript
for (let i = 0; i < data.lots.length; i++) {
  const lotResult = await this.lotService.create({...})  // Sequential!
  lots.push(lotResult.data)
}
```

### Fix: `Promise.all` with order preservation

```typescript
const lotResults = await Promise.all(
  data.lots.map((lotData, index) =>
    this.lotService.create({
      ...lotData,
      building_id: building.id,
      team_id: data.building.team_id
    }).then(result => ({ result, index, lotData }))
  )
)

// Maintain original order (critical — lot contact assignments use index)
const lots: Lot[] = []
for (const { result, index, lotData } of lotResults.sort((a, b) => a.index - b.index)) {
  if (!result.success) {
    throw new Error(`Lot creation failed for ${lotData.reference}: ${result.error}`)
  }
  lots.push(result.data)
  operations.push({
    // ... operation tracking for this lot
  })
}
```

**CRITICAL:** Order must be maintained — downstream lot contact assignments use array index.

---

## Task 4: Parallelize document uploads in building creation (Size: S) — P1

**File:** `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/building-creation-form.tsx` (lines ~891-913)

### Problem
Building doc upload + per-lot doc uploads run sequentially.

### Fix: Single `Promise.allSettled` for all uploads

```typescript
const allDocUploads: Promise<void>[] = []

// Building docs
if (buildingDocUpload.hasFiles) {
  allDocUploads.push(
    buildingDocUpload.uploadFiles(result.data.building.id, userTeam!.id)
      .catch(err => { console.error('Building doc upload failed:', err) })
  )
}

// Per-lot docs
for (let i = 0; i < lots.length; i++) {
  const tempLotId = lots[i].id
  const realLotId = result.data.lots[i]?.id
  if (realLotId && lotDocUploads[tempLotId]?.hasFiles) {
    allDocUploads.push(
      uploadLotDocs(tempLotId, realLotId, userTeam!.id)
        .catch(err => { console.error(`Lot doc upload failed:`, err) })
    )
  }
}

await Promise.allSettled(allDocUploads)
```

Also flatten the lot interventions loop (lines ~952-981) into a single `Promise.allSettled`.

---

## Task 5: Parallelize document uploads in lot creation (Size: XS) — P1

**File:** `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`

### Problem
Same sequential doc upload loop for multi-lot creation.

### Fix
Same pattern as Task 4 — find the per-lot upload loop and wrap in `Promise.allSettled`.

---

## Summary — Expected Impact

| Fix | Before | After | Priority |
|-----|--------|-------|----------|
| ForwardRef error | Console error on every page | Zero errors | **P0** |
| Analytics tracking | Silently broken (never tracks) | Works when cookies accepted | **P0** |
| Toast migration | 2 competing systems | Single Sonner system | **P0** |
| Building + 5 lots creation | 5 sequential DB inserts | 1 parallel batch | **P1** |
| Document uploads (building+5 lots) | 6 sequential uploads | 1 parallel batch | **P1** |
| Lot interventions | Sequential per-lot loop | 1 parallel batch | **P1** |

---

**Execution Order:** Task 1 (XS, quick fix) → Task 2 (L, toast migration) → Task 3 → Task 4 → Task 5
