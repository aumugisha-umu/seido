# Data Invalidation Broadcast — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Eliminate stale data across the app by broadcasting granular invalidation signals via Supabase Broadcast — all team members auto-refetch relevant data after any mutation.

**Architecture:** A team-wide Supabase Broadcast channel (`seido-team:{teamId}`) sends lightweight invalidation signals (entity type only, no data). Client-side hooks subscribe to their relevant entities and auto-refetch when signaled. Debounced at 500ms per entity to handle bulk operations.

**Tech Stack:** Supabase Broadcast (pub/sub over existing WebSocket), React Context, existing refetch hooks.

---

## Problem Summary

| Symptom | Root Cause |
|---------|-----------|
| New building not in lot creation selector | `useManagerStats` / `useBuildings` fetch once, never refresh |
| New contact not in dropdowns | `useTeamContacts` SWR 60s dedup, no invalidation |
| Lists stale after creation | `router.push()` navigates, hooks keep old state |
| Status changes invisible | No cross-component refresh after server action |
| 68 `revalidatePath`/`revalidateTag` calls do nothing | All pages are `force-dynamic` — these are no-ops |

## Acceptance Criteria

- [ ] After creating a building, the lot creation form shows it without page reload
- [ ] After creating a contact, all contact selectors show it within 1s
- [ ] After creating a lot/intervention/contract, list pages show it without reload
- [ ] Intervention status changes (approve, reject, close, cancel) propagate to all 3 role views (gestionnaire, prestataire, locataire) without reload
- [ ] Quote and time slot actions propagate across roles without reload
- [ ] All connected team members see updates within 1s (multi-user)
- [ ] Bulk import (10+ entities) triggers at most 1 refetch per entity type (debounce)
- [ ] No new Supabase WebSocket connections (reuse existing client)
- [ ] Existing realtime (notifications, chat) continues to work — no regressions
- [ ] Lint passes (`npm run lint`)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Broadcast not received (WebSocket disconnected) | Low | Medium | Graceful degradation — manual refresh still works |
| Refetch storm on bulk import | Medium | Medium | 500ms debounce per entity type |
| Team channel conflicts multi-team users | Low | Low | Channel keyed by active teamId |
| Hook refetch races (multiple simultaneous) | Medium | Low | Existing `loadingRef` guards in all hooks |

## Dependencies

- **No new packages** — Supabase JS client already supports broadcast
- **No migrations** — pure client-side feature
- **No env vars** — uses existing Supabase connection

---

## Story Map

| # | Story | Size | Files |
|---|-------|------|-------|
| 1 | Create invalidation module | S | 1 new |
| 2 | Add team broadcast channel to RealtimeContext | S | 1 modify |
| 3 | Wire `useBuildings` to invalidation | XS | 1 modify |
| 4 | Wire `useManagerStats` to invalidation | XS | 1 modify |
| 5 | Wire `useTeamContacts` to invalidation | XS | 1 modify |
| 6 | Wire `useContactsData` to invalidation | XS | 1 modify |
| 7 | Wire `useInterventions` to invalidation | XS | 1 modify |
| 8 | Emit invalidation from creation flows | M | 5 modify |
| 9 | Emit invalidation from edit/delete/status-change flows | M | 8 modify |
| 10 | Remove dead revalidation code | S | 9 modify |

### Scope note — Notifications
Notifications are **excluded** from this plan — they already have full realtime via `useRealtimeNotificationsV2` (postgres_changes on `notifications` table, user-filtered). No action needed.

---

## Task 1: Create Invalidation Module

**Files:**
- Create: `lib/data-invalidation.ts`

**Step 1: Create the module**

```typescript
// lib/data-invalidation.ts
'use client'

/**
 * Granular data invalidation via Supabase Broadcast.
 *
 * After a mutation, call broadcastInvalidation(['buildings', 'stats'])
 * All hooks subscribed to those entities auto-refetch.
 */

// Entity types for granular invalidation
export type DataEntity =
  | 'buildings'
  | 'lots'
  | 'contacts'
  | 'interventions'
  | 'contracts'
  | 'stats'

export const BROADCAST_EVENT = 'data-invalidation'

export interface InvalidationPayload {
  type: typeof BROADCAST_EVENT
  entities: DataEntity[]
  triggeredBy: string
  timestamp: number
}
```

**Step 2: Verify lint**
```bash
npm run lint -- lib/data-invalidation.ts
```

---

## Task 2: Add Team Broadcast Channel to RealtimeContext

**Files:**
- Modify: `contexts/realtime-context.tsx`

**What changes:**
1. Add a second channel `seido-team:{teamId}` for broadcast (keep existing per-user channel for postgres_changes)
2. Expose `broadcastInvalidation(entities)` and `onInvalidation(entities, callback)` in context
3. Debounce incoming invalidation events at 500ms per entity

**Step 1: Add types and imports**

Add to the imports section:
```typescript
import type { DataEntity, InvalidationPayload } from '@/lib/data-invalidation'
import { BROADCAST_EVENT } from '@/lib/data-invalidation'
```

Add to `RealtimeContextType`:
```typescript
  /** Broadcast invalidation signal to all team members */
  broadcastInvalidation: (entities: DataEntity[]) => void

  /** Subscribe to invalidation events for specific entities. Returns cleanup. */
  onInvalidation: (entities: DataEntity[], callback: () => void) => () => void
```

**Step 2: Add team broadcast channel**

Inside `RealtimeProvider`, after the existing `channelRef` setup effect, add a new effect for the team channel:

```typescript
const teamChannelRef = useRef<RealtimeChannel | null>(null)
const invalidationHandlersRef = useRef<Map<string, { entities: DataEntity[]; callback: () => void }>>(new Map())
const debounceTimersRef = useRef<Map<DataEntity, NodeJS.Timeout>>(new Map())

// Team broadcast channel for data invalidation
useEffect(() => {
  if (!teamId) return

  const supabase = supabaseRef.current

  const teamChannel = supabase
    .channel(`seido-team:${teamId}`)
    .on('broadcast', { event: BROADCAST_EVENT }, (payload) => {
      const data = payload.payload as InvalidationPayload
      if (!data?.entities) return

      logger.info(`[REALTIME] Received invalidation for: ${data.entities.join(', ')}`)

      // Debounce per entity type (500ms)
      for (const entity of data.entities) {
        const existing = debounceTimersRef.current.get(entity)
        if (existing) clearTimeout(existing)

        debounceTimersRef.current.set(entity, setTimeout(() => {
          debounceTimersRef.current.delete(entity)

          // Dispatch to all handlers interested in this entity
          invalidationHandlersRef.current.forEach((handler) => {
            if (handler.entities.includes(entity)) {
              try {
                handler.callback()
              } catch (err) {
                logger.error(`[REALTIME] Invalidation handler error for ${entity}`, { err })
              }
            }
          })
        }, 500))
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info(`[REALTIME] ✅ Team broadcast channel connected: seido-team:${teamId}`)
      }
    })

  teamChannelRef.current = teamChannel

  return () => {
    // Clear all debounce timers
    debounceTimersRef.current.forEach((timer) => clearTimeout(timer))
    debounceTimersRef.current.clear()

    supabase.removeChannel(teamChannel)
    teamChannelRef.current = null
  }
}, [teamId])
```

**Step 3: Implement broadcastInvalidation**

```typescript
const broadcastInvalidation = useCallback((entities: DataEntity[]) => {
  if (!teamChannelRef.current) {
    logger.warn('[REALTIME] Cannot broadcast — team channel not connected')
    return
  }

  const payload: InvalidationPayload = {
    type: BROADCAST_EVENT,
    entities,
    triggeredBy: userId,
    timestamp: Date.now()
  }

  teamChannelRef.current.send({
    type: 'broadcast',
    event: BROADCAST_EVENT,
    payload
  })

  logger.info(`[REALTIME] Broadcasted invalidation: ${entities.join(', ')}`)
}, [userId])
```

**Step 4: Implement onInvalidation**

```typescript
const onInvalidation = useCallback((entities: DataEntity[], callback: () => void) => {
  const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  invalidationHandlersRef.current.set(id, { entities, callback })

  return () => {
    invalidationHandlersRef.current.delete(id)
  }
}, [])
```

**Step 5: Update context value**

```typescript
const contextValue = useMemo(
  () => ({ isConnected, connectionStatus, subscribe, unsubscribe, broadcastInvalidation, onInvalidation }),
  [isConnected, connectionStatus, subscribe, unsubscribe, broadcastInvalidation, onInvalidation]
)
```

**Step 6: Verify lint**
```bash
npm run lint -- contexts/realtime-context.tsx
```

---

## Task 3: Wire `useBuildings` to Invalidation

**Files:**
- Modify: `hooks/use-buildings.ts`

**Step 1: Add invalidation subscription**

Add import and effect after the existing `fetchBuildings` effect:

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'

// Inside useBuildings(), after the existing useEffects:
const realtime = useRealtimeOptional()

useEffect(() => {
  if (!realtime?.onInvalidation) return
  return realtime.onInvalidation(['buildings', 'lots'], () => {
    if (user?.id) {
      logger.info('🔄 [BUILDINGS] Auto-refetch triggered by invalidation')
      lastUserIdRef.current = null
      loadingRef.current = false
      fetchBuildings(user.id, true)
    }
  })
}, [realtime, user?.id, fetchBuildings])
```

Note: `useRealtimeOptional` is used (not `useRealtime`) so the hook still works outside the RealtimeProvider (e.g., in tests or standalone pages).

---

## Task 4: Wire `useManagerStats` to Invalidation

**Files:**
- Modify: `hooks/use-manager-stats.ts`

**Step 1: Add invalidation subscription to `useManagerStats`**

Same pattern as Task 3, subscribes to `['buildings', 'lots', 'contacts', 'interventions', 'stats']`:

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'

// Inside useManagerStats(), after existing useEffects:
const realtime = useRealtimeOptional()

useEffect(() => {
  if (!realtime?.onInvalidation) return
  return realtime.onInvalidation(['buildings', 'lots', 'contacts', 'interventions', 'stats'], () => {
    if (user?.id) {
      logger.info('🔄 [MANAGER-STATS] Auto-refetch triggered by invalidation')
      lastUserIdRef.current = null
      loadingRef.current = false
      fetchStats(user.id, true)
    }
  })
}, [realtime, user?.id, fetchStats])
```

**Step 2: Same pattern for `useContactStats`** (same file)

Subscribe to `['contacts']`:

```typescript
// Inside useContactStats(), after existing useEffects:
const realtimeCS = useRealtimeOptional()

useEffect(() => {
  if (!realtimeCS?.onInvalidation) return
  return realtimeCS.onInvalidation(['contacts'], () => {
    if (user?.id) {
      logger.info('🔄 [CONTACT-STATS] Auto-refetch triggered by invalidation')
      lastUserIdRef.current = null
      loadingRef.current = false
      fetchContactStats(user.id, true)
    }
  })
}, [realtimeCS, user?.id, fetchContactStats])
```

---

## Task 5: Wire `useTeamContacts` to Invalidation

**Files:**
- Modify: `hooks/use-team-contacts.ts`

**Challenge:** This hook uses `swr/immutable`. We need to call SWR's `mutate` to force revalidation.

**Step 1: Add invalidation to `useTeamContacts`**

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { useEffect } from 'react'

export function useTeamContacts(teamId?: string) {
  const result = useSWR(
    teamId ? ['team-contacts', teamId] : null,
    // ... existing fetcher ...
    // ... existing config ...
  )

  // Auto-revalidate on invalidation broadcast
  const realtime = useRealtimeOptional()

  useEffect(() => {
    if (!realtime?.onInvalidation) return
    return realtime.onInvalidation(['contacts'], () => {
      logger.info('[USE-TEAM-CONTACTS] Auto-revalidate triggered by invalidation')
      result.mutate()
    })
  }, [realtime, result.mutate])

  return result
}
```

Note: SWR's `mutate()` without arguments triggers a revalidation (refetch), respecting the deduplication window. Since we want an immediate refetch, we may need to also clear the dedupe. Alternative: `mutate(undefined, { revalidate: true })`.

---

## Task 6: Wire `useContactsData` to Invalidation

**Files:**
- Modify: `hooks/use-contacts-data.ts`

**Step 1: Same pattern as Task 3**

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'

// Inside useContactsData(), after existing useEffects:
const realtime = useRealtimeOptional()

useEffect(() => {
  if (!realtime?.onInvalidation) return
  return realtime.onInvalidation(['contacts'], () => {
    if (user?.id) {
      logger.info('🔄 [CONTACTS-DATA] Auto-refetch triggered by invalidation')
      lastUserIdRef.current = null
      loadingRef.current = false
      fetchContactsData(user.id, true)
    }
  })
}, [realtime, user?.id, fetchContactsData])
```

---

## Task 7: Wire `useInterventions` to Invalidation

**Files:**
- Modify: `hooks/use-interventions.ts`

**Step 1: Same pattern**

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'

// Inside useInterventions(), after existing useEffects:
const realtime = useRealtimeOptional()

useEffect(() => {
  if (!realtime?.onInvalidation) return
  return realtime.onInvalidation(['interventions'], () => {
    logger.info('🔄 [useInterventions] Auto-refetch triggered by invalidation')
    lastFetchTimeRef.current = 0
    loadingRef.current = false
    loadInterventions(true)
  })
}, [realtime, loadInterventions])
```

---

## Task 8: Emit Invalidation from Creation Flows

**Files:**
- Modify: `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/building-creation-form.tsx`
- Modify: `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
- Modify: `app/gestionnaire/(no-navbar)/contacts/nouveau/contact-creation-client.tsx`
- Modify: `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/nouvelle-intervention-client.tsx`
- Modify: `app/gestionnaire/(with-navbar)/dashboard/actions.ts` (createContactAction)

**Pattern:** In each creation form, after the server action succeeds and before `router.push()`:

```typescript
import { useRealtimeOptional } from '@/contexts/realtime-context'

// In the component:
const realtime = useRealtimeOptional()

// After successful creation, before router.push():
realtime?.broadcastInvalidation(['buildings', 'lots', 'stats'])
router.push(`/gestionnaire/biens/immeubles/${result.data.building.id}`)
```

### Exact broadcast calls per form:

| Form | After success, broadcast: |
|------|--------------------------|
| **Building creation** (`building-creation-form.tsx:973-976`) | `['buildings', 'lots', 'stats']` |
| **Lot creation** (`lot-creation-form.tsx` — after `createLot` success) | `['lots', 'buildings', 'stats']` |
| **Contact creation** (`contact-creation-client.tsx:410-442`) | `['contacts', 'stats']` |
| **Intervention creation** (`nouvelle-intervention-client.tsx:1740-1743`) | `['interventions', 'stats']` |
| **Contract creation** (contract wizard submit handler) | `['contracts', 'stats']` |

### Example — Building creation form (line ~973):

```typescript
// Before:
toast.success("Immeuble créé avec succès", { ... })
router.push(`/gestionnaire/biens/immeubles/${result.data.building.id}`)

// After:
toast.success("Immeuble créé avec succès", { ... })
realtime?.broadcastInvalidation(['buildings', 'lots', 'stats'])
router.push(`/gestionnaire/biens/immeubles/${result.data.building.id}`)
```

---

## Task 9: Emit Invalidation from Edit/Delete/Status-Change Flows

**Files:**
- Modify: `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/` — building edit/delete
- Modify: `app/gestionnaire/(no-navbar)/biens/lots/[id]/` — lot edit/delete
- Modify: `app/gestionnaire/(no-navbar)/contacts/modifier/[id]/` — contact edit
- Modify: `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx` — contract activate/terminate/delete
- Modify: `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — **6 `router.refresh()` calls** for status changes, approvals, assignments
- Modify: `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — **2 `router.refresh()` calls** for quote submission, closure
- Modify: `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — **7 `router.refresh()` calls** for confirmations, closures
- Modify: `components/intervention/tabs/execution-tab.tsx` — **3 `router.refresh()` calls** for execution actions

**Pattern:** At every `router.refresh()` or `router.push()` after a mutation, add `realtime?.broadcastInvalidation([...])` **before** it. This ensures both the current page AND other connected team members (all roles) get fresh data.

### Key mutation sites to wire:

| File | Mutation | Broadcast |
|------|----------|-----------|
| Building edit page | `updateBuildingAction` success | `['buildings', 'stats']` |
| Building edit page | `deleteBuildingAction` success | `['buildings', 'lots', 'stats']` |
| Lot edit page | `updateLotAction` success | `['lots', 'buildings', 'stats']` |
| Lot edit page | `deleteLotAction` success | `['lots', 'buildings', 'stats']` |
| Contact edit page | contact update success | `['contacts', 'stats']` |
| Contract details | `activateContract` / `terminateContract` / `deleteContract` | `['contracts', 'stats']` |
| **Gestionnaire** intervention detail | approve, reject, plan, close, cancel, assign contact | `['interventions', 'stats']` |
| **Prestataire** intervention detail | submit quote, propose time slots, close | `['interventions']` |
| **Locataire** intervention detail | confirm time slot, close, rate | `['interventions']` |
| Execution tab (shared) | mark complete, upload receipt, request extension | `['interventions']` |

### Intervention status changes — critical for cross-role sync

When a **gestionnaire** approves an intervention, the **prestataire** and **locataire** views should update. The broadcast channel is team-wide (`seido-team:{teamId}`), so all 3 roles receive the invalidation signal if they're connected.

**Important:** The existing `postgres_changes` realtime on `interventions` (UPDATE only) handles real-time status pill updates in the detail view. The broadcast invalidation complements this by refreshing **list pages** and **stats** — which the postgres_changes don't cover.

### Notifications — already handled

Notifications are **not** included in the broadcast system because they already have full realtime coverage:
- `useRealtimeNotificationsV2` listens to `postgres_changes` on `notifications` (INSERT/UPDATE/DELETE, filtered by `user_id`)
- `useGlobalNotifications` uses `useRealtimeNotificationsV2` for optimistic badge count updates
- This works cross-role because notifications are per-user, not per-team

---

## Task 10: Remove Dead Revalidation Code (Optional Cleanup)

**Files:**
- Modify: `app/gestionnaire/(no-navbar)/biens/lots/[id]/actions.ts`
- Modify: `app/gestionnaire/(no-navbar)/biens/lots/nouveau/actions.ts`
- Modify: `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/actions.ts`
- Modify: `app/gestionnaire/(with-navbar)/dashboard/actions.ts`

**What:** Remove all `revalidatePath()` and `revalidateTag()` calls from server actions that target `force-dynamic` pages. These are confirmed no-ops (68 calls across 9 files).

**Why:** Dead code cleanup. These calls give a false sense of cache invalidation but do nothing because the destination pages are `force-dynamic`.

**Caution:** Keep the `revalidatePath('/', 'layout')` in auth actions (login/logout) — the root layout is NOT force-dynamic. Keep `revalidateTag('subscription')` in the Stripe webhook — subscription cache uses `unstable_cache`.

**Approach:** Replace with a comment explaining why:
```typescript
// Data invalidation handled by Supabase Broadcast (lib/data-invalidation.ts)
// Pages are force-dynamic — revalidatePath/revalidateTag are no-ops
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  User A (Browser)                                            │
│                                                              │
│  ┌─────────────┐    broadcastInvalidation()    ┌──────────┐ │
│  │ Creation     │──────────────────────────────▶│ Supabase │ │
│  │ Form         │                               │ Broadcast│ │
│  └─────────────┘                               │ Channel  │ │
│                                                 │ seido-   │ │
│  ┌─────────────┐    onInvalidation() callback  │ team:    │ │
│  │ useBuildings │◀─────────────────────────────│ {teamId} │ │
│  │ refetch()    │                               │          │ │
│  └─────────────┘                               └────┬─────┘ │
│                                                      │       │
│  ┌─────────────┐    onInvalidation() callback        │       │
│  │ useManager   │◀───────────────────────────────────│       │
│  │ Stats        │                                    │       │
│  │ refetch()    │                                    │       │
│  └─────────────┘                                     │       │
└──────────────────────────────────────────────────────┼───────┘
                                                       │
                     WebSocket (Supabase Realtime)      │
                                                       │
┌──────────────────────────────────────────────────────┼───────┐
│  User B (Browser) — same team                        │       │
│                                                      │       │
│  ┌─────────────┐    onInvalidation() callback  ┌────┴─────┐ │
│  │ useBuildings │◀─────────────────────────────│ Supabase │ │
│  │ refetch()    │                               │ Broadcast│ │
│  └─────────────┘                               │ Channel  │ │
│                                                 └──────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

After implementation, test these scenarios:

### Entity creation
1. **Building → Lot flow:** Create building → go to lot creation → building appears in selector immediately
2. **Contact → Intervention flow:** Create contact → go to intervention creation → contact appears in selector
3. **Lot creation:** Create lot → list page `/biens` shows it without reload
4. **Intervention creation:** Create intervention → list page shows it without reload
5. **Contract creation:** Create contract → list page shows it without reload

### Intervention status changes (cross-role)
6. **Gestionnaire approves:** Approve intervention → prestataire's list updates status pill
7. **Prestataire submits quote:** Submit devis → gestionnaire's detail page shows new quote
8. **Prestataire proposes slots:** Propose time slots → gestionnaire sees them without reload
9. **Locataire confirms slot:** Confirm time slot → gestionnaire and prestataire views update
10. **Gestionnaire closes:** Close intervention → all 3 role views reflect closure

### Multi-user & edge cases
11. **Multi-user:** Open 2 browser tabs (same team) → create lot in tab A → tab B list updates
12. **Multi-role:** Gestionnaire tab + prestataire tab → status change in one reflects in the other
13. **Bulk import:** Import 10 lots → only 1 refetch fires per hook (debounce)
14. **Disconnected graceful degradation:** Disconnect WebSocket → create entity → manual page refresh still works
15. **No regressions:** Existing realtime (notifications, chat, intervention postgres_changes) still works
