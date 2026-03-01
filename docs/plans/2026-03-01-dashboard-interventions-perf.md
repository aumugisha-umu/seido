# Dashboard Interventions Performance & UX Optimization

**Date:** 2026-03-01
**Status:** Design validated

## Problem

The gestionnaire dashboard loads and renders ALL interventions at once (~124+ items). The cards view has no pagination, creating DOM bloat. The period filter uses `created_at` which doesn't match how users think about interventions (they care about scheduled execution dates, not creation dates).

## Design

### 1. Remove Period Filter from Dashboard

The tab-based filtering (À traiter / En cours / Terminées) is sufficient for the dashboard. The period filter adds complexity without matching user intent.

**Remove:**
- `PeriodSelector` from dashboard header (desktop + mobile)
- `filteredInterventions` useMemo that filters by `created_at`
- `period` state and all `progressData` computations that depend on it
- Period-related props passed to stats cards

**Keep:**
- The `PeriodSelector` component itself (still used on other pages)
- Tab counts use unfiltered data (always accurate)

### 2. Sort by Scheduled Date (not created_at)

Change the default sort in InterventionsNavigator when used on dashboard:

**Sort order:**
1. **Unscheduled** (`scheduled_date IS NULL`) — first, sorted by urgency DESC then `created_at` DESC
2. **Overdue** (`scheduled_date < today`) — next, most overdue first
3. **Upcoming** (`scheduled_date >= today`) — last, soonest first

This matches field service management best practices (Salesforce FSM, ServiceNow): items needing attention appear first.

**Implementation:**
- Add new sort option `'scheduled-asc'` to `SORT_OPTIONS`
- Make it the **default** when `tabsPreset === 'dashboard'`
- Keep existing sort options available via dropdown

### 3. Client-Side Pagination on Cards View

Add pagination to the cards/grid view using the existing `usePagination` hook (already used by list view).

**Specs:**
- Page size: **12 items** (4 rows × 3 cols on desktop)
- Pagination controls: compact `< Page X of Y >` at bottom of cards grid
- Tab switch → reset to page 1
- Search/filter change → reset to page 1
- List view: already paginated ✅
- Calendar view: no change needed

**Where to add:**
- `components/interventions/interventions-view-container.tsx` — wrap cards view with pagination
- Reuse `usePagination` from existing hooks
- Reuse `InterventionPagination` component from list view

### 4. Add 'rejetee' to Dashboard 'Terminées' Tab

Currently rejected interventions are excluded from all dashboard tabs.

**Change:**
```typescript
// Before
terminees: () => filteredInterventions.filter(i => [
  "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee"
].includes(i.status))

// After — add "rejetee"
terminees: () => filteredInterventions.filter(i => [
  "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"
].includes(i.status))
```

### 5. SSR — No Change

Keep loading all interventions server-side. Reasons:
- Tab counts need the full dataset to be accurate
- Client-side pagination handles the rendering perf
- ~100-200 interventions is fine for SSR (< 1s)
- The dedicated `/interventions` page already has server-side pagination for large datasets

## Files to Modify

| File | Change |
|------|--------|
| `components/dashboards/manager/manager-dashboard-v2.tsx` | Remove PeriodSelector, period state, filteredInterventions, progressData |
| `components/interventions/interventions-navigator.tsx` | Add scheduled-date sort, make it default for dashboard, add rejetee to terminees |
| `components/interventions/interventions-view-container.tsx` | Add pagination to cards view |
| `components/dashboards/shared/dashboard-stats-cards.tsx` | Remove progressData prop (no longer needed) |
| `components/dashboards/shared/kpi-carousel.tsx` | Remove progressData from KPI cards |

## What This Achieves

- **Performance:** Only 12 cards rendered at a time (was 124+)
- **UX:** Sort by scheduled date surfaces what matters (unscheduled → overdue → upcoming)
- **Simplicity:** Remove period filter complexity, rely on intuitive tabs
- **Completeness:** Rejected interventions now visible in Terminées tab
