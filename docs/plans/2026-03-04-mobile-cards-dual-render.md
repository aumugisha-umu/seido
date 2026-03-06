# Design: Mobile Cards — Dual Render Pattern

**Date:** 2026-03-04
**Branch:** preview
**Scope:** All 4 gestionnaire navigators + InterventionsNavigator (shared with locataire/prestataire)

## Decision

**Pattern:** Dual render with Tailwind breakpoints.
- Desktop (>= md/768px): DataTable/list (already implemented)
- Mobile (< md/768px): Compact mobile cards (72-80px height, full-width, tap = navigate)
- No manual toggle — CSS decides automatically
- Same pattern for all roles (gestionnaire, locataire, prestataire)

**Research basis:** NN/G mobile tables study, Material Design 3 cards guidelines, Apple HIG touch targets, AppFolio property management, MS Dynamics 365 Field Service.

## Architecture

### Dual Render Pattern

```tsx
// In each navigator's render function:
<>
  {/* Mobile: cards */}
  <div className="block md:hidden space-y-2">
    {items.map(item => <EntityCardMobile key={item.id} {...item} />)}
  </div>
  {/* Desktop: table */}
  <div className="hidden md:block">
    <DataTable data={items} columns={columns} />
  </div>
</>
```

SSR renders both, CSS visibility decides. No JS state, no hydration flash.

### New Components (4)

1. `intervention-card-mobile.tsx` — Priority + title + location + status + date
2. `building-card-mobile.tsx` — Name + address + lots count + occupancy
3. `lot-card-mobile.tsx` — Reference + building + surface + status
4. `contact-card-mobile.tsx` — Name + role + email + invitation status
5. `contract-card-mobile.tsx` — Title + lot + dates + status

### Card Anatomy (shared pattern)

```
┌──────────────────────────────────────┐
│ [Icon/Badge]  Title text       [Status] │  Line 1: primary info
│ Subtitle • Meta detail      [Date]  │  Line 2: secondary info
│ Third line if needed (optional)      │  Line 3: context
└──────────────────────────────────────┘
```

- Height: 72-80px (3 lines), 56px (2 lines)
- Full-width, rounded-lg, border, bg-card
- Tap target: entire card
- Touch target: >= 44px (Apple HIG minimum)

### Integration Points

| Navigator | Render function | Where to add dual render |
|-----------|----------------|--------------------------|
| InterventionsViewContainer | `renderListView()` | Wrap existing `InterventionsListViewV1` in `hidden md:block`, add `block md:hidden` |
| PatrimoineNavigator | `renderBuildingsContent()` / `renderLotsContent()` | Wrap DataTable, add card list |
| ContactsNavigator | `renderContent()` | Wrap DataTable, add card list |
| ContractsNavigator | main content area | Wrap ContractsListView, add card list |

### Pagination on Mobile

InterventionsViewContainer uses pagination (10 items/page). The mobile cards receive the same `paginatedItems` — no separate pagination needed.

Other navigators (patrimoine, contacts, contrats) don't paginate — they render all items. This is fine for mobile since gestionnaires typically have < 200 items per tab.
