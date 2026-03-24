# Design: Document Date + Validity Duration

**Date**: 2026-03-10
**Status**: Validated
**Scope**: Lot creation wizard — Documents tab + Interventions step

## Context

Currently, document upload cards with `hasExpiry: true` show a single **expiry date picker**. The user must calculate the expiry date themselves (e.g., PEB issued today → expires in 10 years → manually enter 2036).

## Design

Replace the single expiry date with two fields:
1. **"Date document"** — DatePicker, when the document was issued. Default: today (appears after file upload).
2. **"Durée de validité"** — Select dropdown. Presets: 1 an, 2 ans, 3 ans, 5 ans, 10 ans, Personnalisé. Auto-selects from slot's `defaultValidityYears`.
3. **"Personnalisé"** option → shows an extra DatePicker for the exact expiry date.

### Data Model

**`GenericFileWithPreview`** — replace `expiryDate` with:
- `documentDate?: string` — ISO string
- `validityDuration?: number` — in months (12, 24, 36, 60, 120)
- `validityCustomExpiry?: string` — ISO string, only when "Personnalisé"

**New constant** `VALIDITY_DURATION_OPTIONS`:
```typescript
[
  { value: 12,  label: '1 an' },
  { value: 24,  label: '2 ans' },
  { value: 36,  label: '3 ans' },
  { value: 60,  label: '5 ans' },
  { value: 120, label: '10 ans' },
  { value: -1,  label: 'Personnalisé' },
]
```

**Utility**: `computeExpiryDate(documentDate, validityDuration, customExpiry) → string | undefined`

### UI Layout

Desktop: Date + dropdown side by side. Mobile: stacked.
When "Personnalisé" selected: extra date picker appears below.

### Data Flow to Interventions

The Interventions step receives the same `documentExpiryDates` shape as before.
Expiry is computed at the boundary: `customExpiry ?? addMonths(documentDate, validityDuration)`.
No changes to `property-interventions.ts`, `PropertyInterventionsStep`, or `resolveSchedulingOptions()`.

Auto-update: since `documentExpiryDates` is recomputed on render, navigating back-and-forth picks up changes silently.

### Files to Modify

| File | Change |
|------|--------|
| `components/documents/types.ts` | Replace `expiryDate` with 3 new fields |
| `lib/constants/property-document-slots.ts` | Add `VALIDITY_DURATION_OPTIONS` |
| `components/documents/document-slot-generic.tsx` | Replace DatePicker with Date+Select+conditional DatePicker |
| `components/documents/document-checklist-generic.tsx` | Update callbacks |
| `hooks/use-property-document-upload.ts` | Replace expiry setters, compute at upload |
| `hooks/use-multi-lot-document-upload.ts` | Same (delegates) |
| `lot-creation-form.tsx` | Update `documentExpiryDates` computation |

No DB migration, no API change, no intervention logic change.

### Decisions

- **(C)** Shared preset list with auto-selected defaults per document type
- **(C)** Real-estate focused durations: 1, 2, 3, 5, 10 ans + Personnalisé
- **(C)** Smart default: today's date, appears after file upload
- **(C)** "Personnalisé" shows a date picker for exact expiry
- **(A)** Silent auto-update when navigating back to Interventions
