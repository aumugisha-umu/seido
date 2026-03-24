# Per-Lot Document Accordion Harmonization

**Date:** 2026-03-10
**Scope:** 4 files, ~80 lines removed, ~90 lines added

## Problem
- Lot accordion header + document checklist rendering duplicated in `BuildingContactsStepV3` and `IndependentLotsDocumentsTab`
- Expansion state management duplicated 3 times
- Default expansion inconsistent: building docs = closed, lot docs = open, interventions = open

## Solution

### New shared component: `components/documents/per-lot-document-accordion.tsx`
- Encapsulates expansion state (default: all open)
- Expandable lot header (blue #N badge, reference, category, progress %, chevron)
- Per-lot `DocumentChecklistGeneric` with prop mapping from upload hook
- Optional building-level `DocumentChecklistGeneric` at top

### Files changed
1. **CREATE** `components/documents/per-lot-document-accordion.tsx`
2. **EDIT** `components/building-contacts-step-v3.tsx` — replace inline accordion
3. **EDIT** `app/.../lots/nouveau/lot-creation-form.tsx` — remove IndependentLotsDocumentsTab
4. **EDIT** title: "Documents de l'immeuble" → "Documents" for consistency

## Decisions
- Intervention steps (Property vs Lease) stay separate — divergence is meaningful
- All lot cards default OPEN regardless of count
- InterventionScheduleRow remains the shared abstraction for interventions
