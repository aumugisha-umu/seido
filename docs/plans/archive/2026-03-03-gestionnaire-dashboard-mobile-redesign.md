# Design: Gestionnaire Dashboard Mobile Redesign

**Date:** 2026-03-03 (updated 2026-03-04)
**Status:** Validated — Iteration 2 (Stat Strip)
**Scope:** Mobile viewport (320-599px) only — desktop unchanged
**Files modified:** `kpi-carousel.tsx`

## Problem

The gestionnaire mobile dashboard has poor data density:
- Stats section (hero card + 2x2 grid) takes ~430px = entire mobile viewport
- Messages and interventions list pushed below fold
- Gestionnaire must scroll to see urgent content

## Research References

- Revolut/Stripe mobile: horizontal stat strip with dividers
- Linear/Notion: inline `value label · value label` stat rows
- Material Design 3: compact grid, 8dp gutter, 48dp touch targets
- Apple HIG: "glanceable" principle — one bold number, max 2 supporting lines
- WCAG 2.2 AA: 44px touch targets, 4.5:1 contrast

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Stats layout | **Single-line stat strip (56px)** | 4 KPIs in one horizontal row, -75% vs old layout |
| Actions requises | Compact 44px banner above strip | Clear CTA, hidden when 0 actions |
| Zero actions state | Hide banner completely | Stats strip only = 56px total |
| Icons | None in strip | Values + labels sufficient in compact format |
| Separators | `divide-x` vertical lines | Clean cell separation, no card overhead |

## Layout Specification (375px)

```
WITH BANNER (108px total):
┌─────────────────────────────────────┐
│  [⚠] 7 actions requises    Voir →  │  44px (hidden when 0)
└─────────────────────────────────────┘  gap-2 (8px)
┌─────────┬────────┬────────┬────────┐
│   22    │  17%   │  27    │  198   │  h-14 (56px)
│  Patr.  │ Occup. │ Contr. │ Interv.│
└─────────┴────────┴────────┴────────┘
Total: 44 + 8 + 56 = 108px

WITHOUT BANNER (56px total):
┌─────────┬────────┬────────┬────────┐
│   22    │  17%   │  27    │  198   │  h-14 (56px)
│  Patr.  │ Occup. │ Contr. │ Interv.│
└─────────┴────────┴────────┴────────┘
Total: 56px

COMPARISON:
Old layout:  ~430px (hero card + 2x2 grid)
Iteration 1: 204px (banner + 2x2 compact grid)
Iteration 2: 108px (banner + stat strip) = -75% vs old
```

## Component Specifications

### 1. Action Banner (unchanged from iteration 1)

```tsx
<button className="w-full flex items-center justify-between px-4 py-2.5
  bg-amber-50 border border-amber-200 rounded-xl
  min-h-[44px] text-left active:bg-amber-100 transition-colors
  dark:bg-amber-950/30 dark:border-amber-900/30"
  onClick={onActionsClick}
  aria-label={`${count} actions requises, voir les interventions`}>
  ...
</button>
```

**Height:** 44px | **Hidden when:** `pendingCount === 0`

### 2. Stat Strip (new — replaces 2x2 grid)

```tsx
<div className="flex items-stretch overflow-x-auto
  bg-card dark:bg-white/5 rounded-xl border border-border/50
  divide-x divide-border/30 h-14">
  {stripCards.map((card) => (
    <div key={card.id}
      className="flex-1 min-w-[68px] flex flex-col items-center justify-center
        px-1.5 py-1 text-center">
      <span className="text-base font-bold text-foreground leading-none">
        {card.value}
      </span>
      <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
        {stripLabels[card.id] || card.label}
      </span>
      {card.badge && <span className="text-[10px] ...badge styles...">{badge}</span>}
    </div>
  ))}
</div>
```

**Height:** 56px fixed (`h-14`)
**Cells:** `flex-1 min-w-[68px]` — equal width, scrollable if > 4 stats on narrow screens
**Values:** `text-base font-bold` (16px) — primary visual element
**Labels:** `text-[11px]` muted — secondary, short names from `stripLabels` map
**Touch:** Each cell is interactive if `onClick` present, with `role="button"` and keyboard support

## Files Modified

### `components/dashboards/shared/kpi-carousel.tsx` (KPIMobileGrid)

- Replaced 2x2 grid with horizontal stat strip
- Added `stripLabels` map for compact cell labels
- Strip uses `divide-x` separators, `h-14` fixed height
- Each cell: `flex-1 min-w-[68px]`, value + label stacked vertically
- `role="button"` + `tabIndex` + `onKeyDown` for accessible clickable cells
- Badge support preserved as compact pill below label

## No Changes

- Desktop layout (`lg:` and above) — untouched
- `DashboardStatsCards` (desktop-only component) — untouched
- `UnreadMessagesSection` — untouched
- `InterventionsNavigator` — untouched
- `async-dashboard-content.tsx` — no data changes needed
- `stats-card.tsx` — desktop-only, untouched
- `manager-dashboard-v2.tsx` — no changes needed (KPIMobileGrid API unchanged)

## Verification

- Mobile viewport (375px, 320px): stats in single line, content visible above fold
- Banner hidden when 0 actions
- Touch targets ≥ 44px on interactive cells
- Desktop view unchanged (regression check)
- Values readable at 16px, labels at 11px (supplementary info)
- Horizontal scroll works if viewport < 272px (4 × 68px)
