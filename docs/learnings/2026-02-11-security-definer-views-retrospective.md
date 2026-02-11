# Retrospective: Fix SECURITY DEFINER Views

**Date:** 2026-02-11
**Duration:** ~15 minutes
**Stories Completed:** 1 / 1
**Branch:** preview

## What Went Well
- `ALTER VIEW SET (security_invoker = on)` is the perfect fix — non-destructive, no view redefinition
- Single migration covers all 5 views cleanly
- No backend/UI code changes needed — purely a DB-level fix

## What Could Be Improved
- Should have caught this earlier — Supabase linter should be checked periodically
- Consider adding a CI check that runs Supabase linter on migration changes

## New Learnings Added to AGENTS.md
- Learning #029: SECURITY DEFINER views — use ALTER VIEW SET (security_invoker = on)

## Patterns Discovered
- **DB state divergence:** Migration SQL may not show SECURITY DEFINER, but the live DB can have it if views were created by a superuser. Always verify with the linter.
- **ALTER VIEW for property changes:** No need to DROP/RECREATE views just to change security properties. ALTER VIEW preserves everything.

## Anti-Patterns Avoided
- DROP + RECREATE would have required re-granting permissions and could cascade-drop dependent objects
- Manually running SQL in Supabase dashboard (would diverge from migration history)

## Recommendations for Similar Future Work
- When creating new views, always explicitly add `SET (security_invoker = on)` or use `WITH (security_invoker = on)` in CREATE VIEW
- Periodically run Supabase linter to catch security drift
- Consider adding `security_invoker = on` as a template in view creation migrations

## Files Changed
- `supabase/migrations/20260211100000_fix_security_definer_views.sql` (NEW - 25 lines)
- `AGENTS.md` (updated - Learning #029)
- `tasks/prd.json` (updated for this feature)
- `tasks/progress.txt` (appended entry)
