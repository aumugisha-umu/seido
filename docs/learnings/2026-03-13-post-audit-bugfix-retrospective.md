# Retrospective: Post-Audit Production Bug Fixes

**Date:** 2026-03-13
**Duration:** ~3h (single session)
**Stories Completed:** 11 / 11
**Branch:** preview
**Commit:** 80e25dc

## What Went Well
- Ralph methodology (PRD + story-by-story) kept 30 bug fixes organized and traceable
- Parallel agent review (3 agents: reuse, quality, efficiency) found the initial 16 bugs quickly
- `npm run lint` + `npm run build` as verification gates caught zero regressions
- Batch editing workflow (reading all files first, then applying all edits) was efficient for the 15-file `demande_de_devis` cleanup

## What Could Be Improved
- **Initial review was too narrow.** The 3-agent `/simplify` review only examined recently changed files, missing 14 bugs in files that hadn't been touched. Full-codebase grep should be standard for enum/status deprecation.
- **String-typed configs bypass TypeScript.** `Record<string, ...>` and `string[]` arrays mean TypeScript cannot enforce enum removals. Consider using `satisfies Record<InterventionStatus, ...>` for status configs.
- **`generate-intervention-magic-links` was the most dangerous bug.** It was silently writing a deprecated status to the DB. This would have created "ghost" interventions invisible to the UI. This class of bug (write path with deprecated value) should be prioritized above read-only references.

## New Learnings Added to AGENTS.md
- Learning #135: Deprecated enum cleanup — grep entire codebase, not just typed references
- Learning #136: sanitizeSearch() needed on ALL .ilike() with user input, not just search bars
- Learning #137: .single() on composite UNIQUE — must filter ALL constraint columns

## Patterns Discovered
- **`requires_quote` flag replaces status check everywhere**: UI components, modals, and cards should use `intervention.requires_quote` instead of `intervention.status === 'demande_de_devis'`. This decouples quote management from the workflow status machine.
- **Table rename residue audit**: When a table is renamed (e.g., `intervention_contacts` -> `intervention_assignments`), both the table name AND property access paths (`.intervention_contacts[0]`) must be updated. PostgREST nested selects use the table name as the property key.

## Anti-Patterns Avoided (or Encountered)
- **Write-path deprecated values (CRITICAL)**: `generate-intervention-magic-links` was writing `status: 'demande_de_devis'` to DB. This is far more dangerous than read-path references because it creates corrupted data.
- **Asymmetric security**: `building.repository.ts` had `sanitizeSearch()` on the fallback code path but NOT on the primary path. Both paths must be equally secured.
- **`.single()` without full constraint coverage**: Using `.single()` with only 2 of 3 UNIQUE constraint columns causes runtime crashes when data matches the partial filter in multiple rows.

## Recommendations for Similar Future Work
1. **When deprecating any enum value**, start with `grep -r 'value_name' --include='*.{ts,tsx}'` across the entire codebase before any other analysis
2. **Classify hits as write-path vs read-path** — write-path bugs (INSERT/UPDATE with deprecated value) are P0, read-path bugs are P1-P2
3. **Check ALL `.ilike()` calls** after adding `sanitizeSearch()` to any repository — the pattern is needed project-wide, not file-by-file
4. **Use `satisfies Record<InterventionStatus, ...>` pattern** for status config objects so TypeScript enforces exhaustive coverage and catches stale entries

## Bug Breakdown

| Priority | Count | Category | Example |
|----------|-------|----------|---------|
| P0 | 7 | Table rename (`intervention_contacts`) | 7 API routes with runtime crashes |
| CRITICAL | 4 | Write-path deprecated status | `generate-intervention-magic-links` writing to DB |
| P1 | 5 | Security (sanitizeSearch + validateEnum) | 5 repositories with injection risk |
| HIGH | 7 | Read-path deprecated status (services) | Color maps, status labels, filter arrays |
| P2 | 4 | Logic (.single(), deprecated in mappers) | Composite UNIQUE constraint violations |
| P2 | 3 | Code smell (dead code, identity copy) | Unused function, duplicate constant |
| **Total** | **30** | | **45 files changed** |

## Files Changed
```
45 files changed, 1340 insertions(+), 1167 deletions(-)
```

Key areas: 16 API routes, 11 UI components/hooks, 6 repositories, 5 services/utils, 4 mappers/configs, 3 task files
