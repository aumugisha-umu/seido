# Lot Creation Performance — Composite Server Action

## Problem
Lot creation takes ~10s because handleFinish() makes N separate server action calls (each with its own auth init + service factory + DB queries). For 3 independent lots: ~12 client→server round-trips, ~33 DB queries, ~12 auth initializations.

## Solution: Option C — Composite Action + after() Deferral

### New Server Action: `createLotsCompositeAction`

**File:** `app/actions/lots/create-lots-composite.ts`

Single server action that handles ALL lot creation modes:
- Independent lots (with addresses)
- Building-linked lots
- Contacts assignment (bulk)
- Interventions + documents deferred via `after()`

### Flow

```
Client: handleFinish()
  └─ 1 call: createLotsCompositeAction(payload)
       ├─ Auth: 1× createServerActionSupabaseClient()
       ├─ Subscription: 1× canAddProperty(teamId, count)
       ├─ Addresses: 1× bulk INSERT (independent mode only)
       ├─ Lots: 1× bulk INSERT with pre-generated UUIDs
       ├─ Contacts: 1× bulk INSERT lot_contacts
       ├─ after() → interventions + documents (non-blocking)
       └─ return { success, createdLotIds }
  └─ toast + broadcastInvalidation + router.push()
```

### Payload Shape

```typescript
type CreateLotsCompositePayload = {
  teamId: string
  mode: 'independent' | 'existing_building'
  buildingId?: string // for existing_building mode
  lots: Array<{
    reference: string
    category: string
    floor?: number | null
    doorNumber?: string | null
    description?: string | null
    // Address (independent mode only)
    address?: {
      street: string
      postalCode: string
      city: string
      country: string
      latitude?: number
      longitude?: number
      placeId?: string
      formattedAddress?: string
    }
  }>
  contacts: Array<{
    lotIndex: number // maps to lots array index
    userId: string
    isPrimary: boolean
  }>
  // Deferred via after()
  interventions: Array<{
    lotIndex: number
    title: string
    description?: string
    interventionTypeCode: string
    scheduledDate?: string
    assignedUsers: Array<{ userId: string; role: string }>
  }>
  documentUploads: Array<{
    lotIndex: number
    lotLocalId: string // client-side lot ID for file mapping
  }>
}
```

### Key Optimizations

1. **1 auth init** instead of 4-12
2. **Bulk INSERT addresses** — single query for N addresses
3. **Bulk INSERT lots** — single query with pre-generated UUIDs
4. **Bulk INSERT lot_contacts** — single query, no UNSET-then-INSERT per contact
5. **after()** for interventions + documents — response returns before these complete
6. **No SELECT after INSERT** — UUIDs pre-generated, return them directly

### Files Modified

1. **NEW:** `app/actions/lots/create-lots-composite.ts`
2. **MODIFY:** `lot-creation-form.tsx` — handleFinish() calls composite
3. **MODIFY:** `building-creation-form.tsx` — handleFinish() calls composite

### Document Uploads

Documents are uploaded client-side (need browser File objects). Pattern:
- Composite action returns `createdLotIds` mapped by index
- Client uploads docs in parallel AFTER redirect (fire-and-forget)
- OR: Upload docs before calling composite (pre-upload), pass storage paths

Decision: **Upload after redirect** — simpler, user sees success faster.
Actually: Documents need lot IDs for storage paths. So:
1. Composite returns lot IDs
2. Client fires doc uploads in parallel (no await)
3. Client redirects immediately

### Expected Performance

| Metric | Before | After |
|--------|--------|-------|
| Client→Server round-trips | 4-12 | 1 |
| Auth initializations | 4-12 | 1 |
| DB queries (3 lots, 6 contacts) | ~33 | ~5 |
| Wall clock time | ~10s | ~1-2s |
