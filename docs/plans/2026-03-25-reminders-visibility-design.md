# Design: Surface Reminders in Dashboard & Detail Pages

**Date:** 2026-03-25
**Branch:** preview
**Scope:** 3 areas — dashboard, lot detail, building detail

## Context

Reminders are only visible in the Operations page (tabs) and as a dashboard KPI widget. Lot/building detail pages only show interventions. The dashboard list section only shows interventions. This creates a blind spot for gestionnaires who expect to see reminders linked to their properties.

## A. Dashboard — "Operations" section with tab switcher

**Current:** `InterventionsNavigator` with header "Interventions" (Wrench icon)

**New:** Add `TaskTypeSegment` toggle above, conditionally render `InterventionsNavigator` or `RemindersNavigator`.

### Changes

1. **`async-dashboard-content.tsx`** — Add `reminderService.getByTeam()` to Wave 2 parallel fetch. Pass `reminders` array to `ManagerDashboardV2`.

2. **`manager-dashboard-v2.tsx`** — Add state `activeType: 'intervention' | 'rappel'`. Render `TaskTypeSegment` with counts above current navigator. Conditionally render `InterventionsNavigator` or `RemindersNavigator`. Replace header from "Interventions" to "Operations".

3. **Reuse:** `TaskTypeSegment` and `RemindersNavigator` already exist on Operations page.

## B. Lot detail page — Add "Rappels" tab

### Server side (`lots/[id]/page.tsx`)
- Add `reminderRepository.findByLot(lotId)` call in parallel with interventions fetch.
- Pass `reminders` array to client.

### Client side (`lot-details-client.tsx`)
- Add tab: `{ value: "reminders", label: "Rappels", count: reminders.length }` after "interventions"
- Render `RemindersNavigator` in tab content (compact mode)
- Empty state with link to create reminder

## C. Building detail page — Add "Rappels" tab

### Server side (`immeubles/[id]/page.tsx`)
- Add `reminderRepository.findByBuilding(buildingId, lotIds)` — XOR query same as interventions: `.or('building_id.eq.X,lot_id.in.(Y)')`
- Pass `reminders` array to client.

### Client side (`building-details-client.tsx`)
- Same pattern as lot: new tab + `RemindersNavigator`

## D. Repository additions

**`reminder.repository.ts`** — Add two methods:

```typescript
async findByLot(lotId: string): Promise<Reminder[]>
// SELECT * FROM reminders WHERE lot_id = ? AND deleted_at IS NULL ORDER BY due_date

async findByBuilding(buildingId: string, lotIds: string[]): Promise<Reminder[]>
// SELECT * FROM reminders WHERE (building_id = ? OR lot_id IN (?)) AND deleted_at IS NULL ORDER BY due_date
```

## Not in scope
- Contract detail pages (reminders visible via Operations page)
- Dashboard KPI widget (already works)
- Sidebar navigation (already correct)

## Files to modify
- `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx`
- `components/dashboards/manager/manager-dashboard-v2.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx`
- `lib/services/repositories/reminder.repository.ts`
- `lib/services/domain/reminder.service.ts` (expose new repo methods)
