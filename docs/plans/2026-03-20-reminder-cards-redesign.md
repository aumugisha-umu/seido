# Reminder Cards Redesign + List View + RecurrenceConfig Bug Fix

## Context

Reminder cards take too much vertical space (~120px) for minimal info. Need to:
1. Redesign cards with better information hierarchy (intervention-style)
2. Add card/list view toggle (matching interventions pattern)
3. Fix RecurrenceConfig setState-in-render bug

## Design Decisions

- **Card layout:** Intervention-style with 3 rows (title+CTA, status banner, metadata)
- **Left border:** Priority-colored (red=haute, amber=normale, gray=basse)
- **Primary CTA:** Inline for active statuses (Commencer/Terminer), dot menu for rest
- **List view:** 7 sortable columns (Title, Priority, Status, Due Date, Linked Entity, Assignee, Actions)
- **View toggle:** Reuse `ViewModeSwitcherV1` (add `modes` prop to hide calendar), placed via `rightControls` in ContentNavigator
- **Mobile:** Cards-only fallback (dual-render pattern)

## Files to Modify

| File | Change |
|------|--------|
| `components/operations/reminder-card.tsx` | Redesign: 3-row layout, priority border, inline CTA |
| `components/operations/reminders-navigator.tsx` | Add `useViewMode` + view toggle via `rightControls`, route card/list |
| `components/operations/reminders-view-container.tsx` | Pass viewMode, render card grid or list |
| `components/interventions/view-mode-switcher-v1.tsx` | Add optional `modes` prop (default all 3) |
| **New:** `components/operations/reminders-list-view.tsx` | Dense table: 7 columns, sortable, overdue row tint |
| `components/recurrence/recurrence-config.tsx` | Move onChange out of setFormState into useEffect |

## Card Layout Spec

```
┌─ priority-color border ─────────────────────────────────────────────┐
│  Title 🔄                                    [Commencer]  [⋮]      │
│  ─── Status badge ───  Action message                               │
│  📅 Due date  •  🏠 Linked entity  •  👤 Assignee                  │
└─────────────────────────────────────────────────────────────────────┘
```

- Row 1: Title + recurrence icon (left), primary CTA + dot menu (right)
- Row 2: Status banner (colored bg strip) + action message
- Row 3: Metadata compact row
- Padding: p-3 (vs current p-4)
- Target height: ~80px

### Primary CTA Logic

| Status | Button | Color |
|--------|--------|-------|
| en_attente | Commencer | blue |
| en_cours | Terminer | green |
| termine | (none) | — |
| annule | (none) | — |

### Priority Border Colors

| Priority | Border Color |
|----------|-------------|
| haute | border-l-red-500 |
| normale | border-l-amber-500 |
| basse | border-l-gray-300 |

## List View Spec

| Column | Width | Content |
|--------|-------|---------|
| Titre | flex-1 | Title + recurrence icon |
| Priorite | 90px | Colored badge |
| Statut | 100px | Status badge |
| Echeance | 110px | Relative date |
| Bien lie | 150px | Icon + name |
| Assigne a | 120px | User name |
| Actions | 80px | Eye + dot menu |

- Default sort: due_date ascending, overdue first
- Overdue rows: subtle `bg-red-50` tint
- Row click → navigate to detail
- Mobile: hidden, shows cards instead (dual-render)

## RecurrenceConfig Bug Fix

**Problem:** `emitRRule(next)` called inside `setFormState` updater → `onChange()` fires during render → React error.

**Fix:** Remove `emitRRule` calls from `setFormState` updaters. Add `useEffect` watching `formState` to emit onChange after render completes.

## Verification

1. `/gestionnaire/operations` → Rappels tab: cards show redesigned layout
2. View toggle switches between cards and list
3. List view: sortable columns, overdue row tint, row click navigates
4. Mobile: only cards shown regardless of toggle
5. localStorage persists view preference
6. Nouveau rappel: toggle recurrence → no React error in console
7. `npm run lint` passes
