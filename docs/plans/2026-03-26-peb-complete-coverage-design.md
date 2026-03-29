# Design: PEB Complete Coverage + Portfolio Calculator

**Date:** 2026-03-26
**Branch:** preview
**Status:** Validated

## Context

PEB rating field (`peb_rating TEXT`) added to `lots` table via migration 20260326230000.
Creation and edit wizards updated, but display in cards/lists and portfolio calculator still missing.

## Bloc 1: PEB Display Gaps (corrections)

### 1a. PEB Color Helper (shared utility)

Create `lib/utils/peb-colors.ts`:
```typescript
export function getPebColorClasses(rating: string): { bg: string; text: string; border: string } {
  switch (rating) {
    case 'A+': case 'A': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    case 'B': return { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' }
    case 'C': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
    case 'D': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
    case 'E': case 'F': case 'G': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
}
```

### 1b. Files to update

| File | Change |
|------|--------|
| `components/patrimoine/lot-card-unified/types.ts` | Add `peb_rating?: string` to `LotData` |
| `components/patrimoine/lot-card-unified/lot-card-header.tsx` | Add PEB badge after category |
| `components/patrimoine/building-card-expandable.tsx` | Add PEB badge in LotItemRow |
| `components/building-lot-card.tsx` | Add `pebRating` to interface + badge |
| `components/building-confirmation-step.tsx` | Add `pebRating` to Lot interface + display in summary |
| `components/lot-card.tsx` | Add `peb_rating` to interface + badge |
| `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx` | Use getPebColorClasses instead of hardcoded green |
| `app/gestionnaire/(no-navbar)/biens/immeubles/modifier/[id]/edit-building-client.tsx` | Check PEB flow in BuildingLotsStepV2 |

### 1c. PEB Badge Component Pattern

Inline badge (not a separate component — YAGNI):
```tsx
{lot.peb_rating && (() => {
  const pebColors = getPebColorClasses(lot.peb_rating)
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pebColors.bg} ${pebColors.text} border ${pebColors.border}`}>
      PEB {lot.peb_rating}
    </span>
  )
})()}
```

## Bloc 2: Portfolio Calculator in Aide Page

### Architecture

Replace `IndexationSection` with a tabbed component:
- **Tab "Simulation"** — Current single-lot calculator (keep as-is)
- **Tab "Mes baux"** — Live portfolio view from DB

### Tab "Mes baux" — Data Flow

1. Server Component `aide/page.tsx` fetches lots with active leases:
   ```sql
   SELECT l.id, l.reference, l.peb_rating, l.category,
          a.postal_code, a.city,
          b.name as building_name, ba.postal_code as building_postal_code
   FROM lots l
   LEFT JOIN addresses a ON l.address_id = a.id
   LEFT JOIN buildings b ON l.building_id = b.id
   LEFT JOIN addresses ba ON b.address_id = ba.id
   WHERE l.team_id = ? AND l.deleted_at IS NULL
   ```
2. Pass to `aide-client.tsx` as prop
3. Client-side: user sets region + bail type per lot (or bulk), calculates indexation for all

### Tab "Mes baux" — UI

- Table with columns: Lot | Immeuble | PEB | Region | Loyer | Date bail | Loyer indexé | Delta
- Region auto-detected from postal code when possible
- Editable fields: loyer, date signature, date début (inline)
- "Tout calculer" button → batch `calculateIndexation()` calls
- Summary row: Total ancien loyer, Total nouveau loyer, Delta total

### Props Interface

```typescript
interface PortfolioLot {
  id: string
  reference: string
  peb_rating: string | null
  category: string
  building_name: string | null
  postal_code: string | null
}
```

Passed from server component to client as `portfolioLots: PortfolioLot[]`.
