# Retrospective: Multi-Fix Session (CSS Layers, Migrations, Contact Email, Expandable List)

**Date:** 2026-03-05
**Duration:** ~3h (estimated from conversation scope)
**Tasks Completed:** 5 independent fixes/features
**Branch:** preview

## What Went Well
- Partial unique index fix for contact email was clean and complete (3-layer defense: DB + Zod + API)
- Expandable list view reused existing `expandedBuildings` state — zero new state management needed
- Migration repair workflow (`repair --status reverted`) handled the failed RPC push smoothly
- Auth redirects were a 10-line addition to `next.config.js` — leveraged built-in Next.js feature

## What Could Be Improved
- Dashboard mobile CSS fix required 3 attempts (Tailwind classes → BEM in @layer → unlayered + !important). Should have researched Tailwind v4 layer cascade behavior first
- The `get_email_counts` RPC used virtual folder names ('processed') that don't exist as DB enums — should have been caught in code review before the migration was committed
- The `NULLS NOT DISTINCT` constraint was added in a previous session without testing the "create 2+ contacts without email" scenario

## New Learnings Added to AGENTS.md
- Learning #118: CSS @layer cascade in Tailwind v4 — unlayered styles beat @layer components
- Learning #119: PostgreSQL NULLS NOT DISTINCT — partial unique index for nullable columns
- Learning #120: Virtual DB concepts vs actual enum values in RPC functions
- Learning #121: Expandable table rows — reuse card view expand state + stopPropagation on action column

## Patterns Discovered
- **Unlayered CSS for critical toggles**: In Tailwind v4, anything that MUST win the cascade should be outside `@layer` with `!important`. Tailwind responsive classes (`hidden lg:block`) are unreliable during hydration.
- **Partial unique index**: `CREATE UNIQUE INDEX ... WHERE col IS NOT NULL AND col != ''` is the PostgreSQL pattern for "unique if present, allow multiple NULLs"
- **Multi-layer input normalization**: Zod preprocess (schema validation) + API route normalization + DB constraint = defense-in-depth for data integrity

## Anti-Patterns Avoided (or Encountered)
- **NULLS NOT DISTINCT for nullable columns**: Treats NULL as equal — only 1 NULL row per unique group
- **Virtual concepts in SQL**: App-layer abstractions (folder = 'processed') leaking into DB functions
- **Tailwind responsive classes for layout-critical toggles**: Unreliable in SSR → hydration transitions with CSS layers

## Recommendations for Similar Future Work
- Before writing SQL RPC functions, always run `\dT+ enum_name` to verify valid enum values
- When adding UNIQUE constraints on nullable columns, always test with 2+ NULL rows
- For mobile/desktop visibility toggles in Tailwind v4 projects, use unlayered CSS media queries — not Tailwind responsive classes
- When both card and list views exist for the same data, share state between them for UX continuity

## Files Changed
- `app/globals.css` — Dashboard stats responsive visibility (unlayered CSS)
- `components/dashboards/manager/manager-dashboard-v2.tsx` — BEM modifier classes
- `next.config.js` — Auth URL redirects
- `supabase/migrations/20260302120000_create_get_email_counts_rpc.sql` — Fix virtual enum value
- `supabase/migrations/20260304100000_fix_users_email_team_unique_allow_null.sql` — Partial unique index
- `app/api/create-contact/route.ts` — Email normalization
- `lib/validation/schemas.ts` — Zod preprocess empty→null
- `components/property-selector.tsx` — Expandable building list view with lot sub-rows
