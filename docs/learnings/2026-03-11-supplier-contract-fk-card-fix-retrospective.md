# Retrospective: Supplier Contract FK Fix + Card Display

**Date:** 2026-03-11
**Duration:** ~15 min
**Branch:** feature/ai-phone-assistant

## What Went Well
- PostgREST FK hint syntax is a clean one-line fix per query
- Reusing the contact-card-compact badge pattern ensured UI consistency immediately
- Splitting `getSupplierName` into two focused functions (`getSupplierDisplayName` + `getSupplierCompanyName`) is more maintainable

## What Could Be Improved
- The initial `company_record:companies(id, name)` was added without checking for reverse FKs — should have anticipated PGRST201 given the `deleted_by` audit column pattern
- FK constraint names should be documented or discoverable easily (e.g., a quick reference of multi-FK table pairs)

## New Learnings Added to AGENTS.md
- Learning #133: PostgREST PGRST201 — disambiguate multiple FK paths with `!fk_name`
- Learning #134: Card display — show person name + company badge, not company-as-name

## Patterns Discovered
- `!fk_constraint_name` in PostgREST nested selects to resolve ambiguity between forward FK and reverse FK (audit columns)
- Card display consistency: person name as primary text, company as purple Badge with Building2 icon

## Anti-Patterns Avoided
- Showing company name *as* the contact name loses individual identity — always separate person vs. company

## Recommendations for Similar Future Work
- When adding nested selects to `users` table, check if the target table has `created_by`/`updated_by`/`deleted_by` pointing back to `users` — if so, add FK hint immediately
- Any new entity card showing a supplier/contact should follow the `contact-card-compact` pattern for name + company display

## Files Changed
- `lib/services/repositories/supplier-contract.repository.ts` — FK hint on 4 queries
- `components/contracts/supplier-contract-card.tsx` — person name + company badge display
