# Retrospective: Fix RLS Building-level Interventions + Closure Button Modal

**Date:** 2026-02-13
**Duration:** ~30 min
**Stories Completed:** 1/1 (RLS fix) + 1 bonus (closure button)
**Branch:** preview

## What Went Well
- Fast root cause identification by tracing the migration chain (4 versions of the same function)
- Migration repair workflow is now second nature (`repair --status reverted` + `db push --linked`)
- The `intervention-action-utils.ts` fix was surgical — 2 lines changed

## What Could Be Improved
- The `get_accessible_intervention_ids()` function has been rewritten 4 times. Each rewrite risks regression. Consider: adding a SQL comment block at the top listing ALL expected branches as a "checklist" for future rewrites
- No automated test catches when a role loses RLS access — a locataire integration test querying a building-level intervention would have caught this

## New Learnings Added to AGENTS.md
- Learning #033: SECURITY DEFINER function rewrite regression — diff all role branches
- Learning #034: Action buttons — apiRoute vs href determines modal presence

## Patterns Discovered
- **Migration chain tracing**: When a function breaks, trace its full history across migrations to find which rewrite lost what
- **INNER JOIN as silent filter**: `INNER JOIN x ON x.col = y.col` silently returns 0 rows when `y.col IS NULL` — this is the root cause of most building-level intervention bugs

## Anti-Patterns Avoided
- Creating a new migration instead of repairing the existing one (migration was already applied but untracked in git)
- Adding workarounds at the application layer instead of fixing the RLS function

## Recommendations for Similar Future Work
- Before rewriting `get_accessible_intervention_ids()`, create a checklist of all role branches and their access paths
- Add `-- BRANCHES: admin(all), gestionnaire(team_id), prestataire(assignments), locataire(lot_contacts+contracts+assignments)` as a header comment in the function
- Consider a test migration that asserts row counts per role after applying

## Files Changed
- `supabase/migrations/20260213120000_fix_rls_gestionnaire_intervention_access.sql` (locataire branch added)
- `lib/intervention-action-utils.ts` (href instead of apiRoute for cloturee_par_locataire)
