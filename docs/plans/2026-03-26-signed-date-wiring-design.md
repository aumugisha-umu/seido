# Design: Wire signed_date into Contract Wizard, Detail, and Excel Import

**Date:** 2026-03-26
**Context:** `signed_date` column exists in DB (nullable TEXT) and in TS types, but is never exposed in UI or import. Needed for rent indexation calculations.

## Scope (6 touchpoints)

| # | File | Change |
|---|------|--------|
| 1 | `components/contract/lease-form-details-merged-v1.tsx` | Add DatePicker "Date de signature" in dates section (step 2) |
| 2 | `components/contract/contract-form-container.tsx` | Wire `signedDate` in formData, pass to server action |
| 3 | `components/contract/contract-confirmation-step.tsx` | Display signed date in summary (step 5) |
| 4 | `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx` | Display `signed_date` in detail page |
| 5 | `lib/import/` (constants, types, validator, service, template-generator) | "Date Signature" column in Excel import |
| 6 | Server action create/update | Pass `signed_date` to DB |

## No migration needed
Column `signed_date TEXT NULL` already exists.

## Decisions
- **Step 2 placement:** After start date + duration + calculated end date, before financial section
- **Optional:** No validation required, placeholder "Non signe"
- **Import:** Optional column, accepts YYYY-MM-DD or DD/MM/YYYY, normalized to ISO
- **Confirmation (step 5):** Shows "Signe le: DD/MM/YYYY" or "Non signe" if empty
- **Detail page:** Displayed alongside existing dates (start/end)
