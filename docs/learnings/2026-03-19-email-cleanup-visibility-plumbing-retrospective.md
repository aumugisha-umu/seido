# Retrospective: Email Section Cleanup & Visibility Plumbing

**Date:** 2026-03-19
**Duration:** ~1 session
**Branch:** preview

## What Went Well
- 3-agent parallel review (Code Reuse + Code Quality + Efficiency) found comprehensive issues in one pass
- Worktree isolation allowed parallel fixes without merge conflicts
- The `EmailVisibilityService` was already well-designed as single source of truth — just needed to be wired to API routes
- `EMAIL_LIST_COLUMNS` constant is a clean pattern for excluding heavy columns

## What Could Be Improved
- The visibility feature was implemented bottom-up (service → repo → types) but never connected top-down (API routes → UI). A top-down trace should be part of the feature definition of done
- The initial plan focused only on the Select z-index fix, but a broader audit revealed much deeper issues. Feature-scoped /simplify should be standard practice
- `bg-background` class didn't work on SelectTrigger (overridden by base `bg-transparent`), required explicit `bg-white` — Tailwind merge behavior is unreliable when base classes have equal specificity

## New Learnings Added to AGENTS.md
- Learning #159: Radix Select inside high-z-index modals — portal z-index override
- Learning #160: Bottom-up feature plumbing — service layer ready but API routes unconnected
- Learning #161: `select('*')` on tables with large text columns — exclude body in list views
- Learning #162: Extract repeated API auth boilerplate into shared helpers
- Learning #163: Visibility filter must be applied consistently across SSR, API listing, and API counts

## Patterns Discovered
- **baseQuery() factory** for uniform filter application across parallel count queries
- **3-agent parallel review** as quality gate: Reuse + Quality + Efficiency covers all angles
- **Final review agent** after fix agents catches cross-cutting issues the domain-specific agents miss

## Anti-Patterns Encountered
- **Bottom-up implementation without top-down verification**: Service/repo layers perfect, but API routes never called them. `added_by_user_id` NOT NULL constraint would have caused runtime crashes
- **Tailwind class override assumptions**: `bg-background` on SelectTrigger didn't override `bg-transparent` — inline style or explicit `bg-white` needed
- **Team-wide counts for visibility-filtered features**: Counts route showed ALL team emails but listing showed only accessible ones — user sees more items than exist in their view

## Recommendations for Similar Future Work
- After implementing any new DB column with NOT NULL: grep for ALL INSERT statements hitting that table
- After implementing visibility/access control at service layer: verify ALL read paths (listing, counts, search, SSR, export) apply the filter
- Use `/simplify` with section scope after any multi-file feature to catch cross-cutting issues

## Files Changed
30 files changed, +1098 insertions, -671 deletions

Key files:
- 7 API routes (console→logger, any→unknown, team helper, visibility filter)
- 5 client components (type consolidation, console cleanup, any removal)
- 7 services/repos (visibility dedup, select columns, parameter objects)
- 1 new helper (api-team-context.ts)
- 1 globals.css (modal header bg-white)
