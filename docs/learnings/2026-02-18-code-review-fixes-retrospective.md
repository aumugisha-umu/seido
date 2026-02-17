# Retrospective: Code Review Critical+High Fixes

**Date:** 2026-02-18
**Duration:** ~45 minutes
**Issues Fixed:** 10 confirmed (3 CRITICAL, 7 HIGH) + 2 quick fixes. 1 dismissed (C3 false positive).
**Branch:** preview

## What Went Well
- Parallel file reading approach built full context before any edits — zero wasted attempts
- Verifying the XOR constraint before C3 prevented a broken "fix" that would have violated the DB CHECK constraint
- The `useMultiLotDocumentUpload` hook's late-binding pattern (tempId → realId) was already well-designed; just needed to be called
- All fixes passed lint without introducing new warnings

## What Could Be Improved
- The code review found 10 issues across 5 features — running reviews after each feature (not batched) would catch bugs closer to when code is written
- The lot creation page (1800+ lines) is too large — multiple creation modes in one file make TDZ and ordering bugs likely
- Duplicate imports (C2) weren't caught by lint — consider enabling `import/no-duplicates` ESLint rule
- The `expiryDate` bypass (H4) reveals a pattern: when adding fields to existing routes, the Zod schema is often forgotten

## New Learnings Added to AGENTS.md
- Learning #043: Temporal dead zone — useState order matters with dependent hooks
- Learning #044: Multi-lot creation — loop all successes, not just [0]
- Learning #045: Zod schema drift — always route raw input through validated data
- Learning #046: Verify DB constraints before "fixing" query patterns

## Patterns Discovered
- **TDZ in React hooks**: `const`/`let` are uninitialized until declaration, unlike `var`. Hooks that depend on state must be declared after the state.
- **Zod schema as boundary guardian**: Every field from `FormData`/`request.json()` must pass through Zod — raw values should never reach DB inserts.
- **Multi-entity post-creation trap**: When creating N entities, post-creation effects (interventions, documents) commonly use `results[0]` instead of looping all results.

## Anti-Patterns Avoided
- **False positive C3**: The initial analysis said per-lot interventions needed `building_id`. But the strict XOR CHECK constraint means this would crash. Always read the migration SQL before changing entity references.
- **Inline import() type assertions**: Using `import("@/lib/lot-types").LotCategory` when `LotCategory` is already imported — signals a stale/divergent import block.

## Recommendations for Similar Future Work
1. After implementing multi-entity creation flows, always search for `[0]` or `.first()` patterns — they're often bugs when all entities need processing
2. When adding fields to API routes, immediately update the Zod schema in the same commit
3. For files > 500 lines with multiple hooks, manually verify hook declaration order (state → effects → derived → handlers)
4. Consider splitting lot creation page into mode-specific files (existing-building, independent, legacy) to reduce complexity
5. Enable `import/no-duplicates` ESLint rule to catch duplicate imports automatically

## Files Changed
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` — C1, C2, H1, H2 (4 fixes)
- `lib/types/contract.types.ts` — H3 (expiry_date fields)
- `app/api/upload-contract-document/route.ts` — H4 (Zod validation)
- `lib/validation/schemas.ts` — H4 (expiryDate schema field)
- `lib/constants/lease-interventions.ts` — H5 (interface fields), Q2 (unused export)
- `lib/services/domain/intervention-service.ts` — H6 (gestionnaire role validation)
- `app/actions/intervention-actions.ts` — H7 (role validation before cast)
- `lib/step-configurations.ts` — Q1 (trailing space)
