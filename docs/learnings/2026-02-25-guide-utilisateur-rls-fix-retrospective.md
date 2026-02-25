# Retrospective: Guide Utilisateur In-App + RLS Team Access Fix

**Date:** 2026-02-25
**Duration:** ~4h (guide) + ~1.5h (RLS debug)
**Stories Completed:** 12/12 (guide) + 1 critical bug fix
**Branch:** preview

## What Went Well
- Ralph methodology with seo-copywriter + ui-designer agents produced high-quality copy on first pass (78/100 copywriter, 82/100 design)
- Progressive disclosure pattern (overview → sections → FAQ) made the guide scannable
- RLS debugging: systematic approach traced INSERT vs SELECT policy divergence quickly
- Using `interventions.team_id` (denormalized) simplified the RLS query dramatically vs the old building JOIN chain

## What Could Be Improved
- The guide is a single large client component (~700 lines) — could be split into section sub-components
- RLS functions have accumulated 10+ migrations redefining them — consider a "canonical RLS functions" migration that drops + recreates all from scratch
- `users.team_id` field should either be kept in sync or removed entirely to prevent future confusion

## New Learnings Added to AGENTS.md
- Learning #084: users.team_id is stale — use team_members for RLS
- Learning #085: INSERT and SELECT RLS policies must use the same source of truth
- Learning #086: users.role vs team_members.role are different systems

## Patterns Discovered
- **RLS source-of-truth audit**: When debugging "data invisible after creation", compare INSERT WITH CHECK vs SELECT USING policies — if they check different tables/columns, that's your bug
- **Denormalized column shortcut**: `interventions.team_id` avoids the lot→building→team_id JOIN chain in RLS, making the gestionnaire branch a simple 1-JOIN query
- **In-app guide structure**: Stripe Docs pattern (sidebar + cards + accordion) works well for SaaS B2B help pages

## Anti-Patterns Avoided (or Encountered)
- **Stale denormalized fields in RLS**: `users.team_id` was used as a performance shortcut but became the source of a critical access bug
- **Multiple SECURITY DEFINER functions doing the same job differently**: `is_team_manager()` checks `team_members`, `get_accessible_*_ids()` checked `users.team_id` — inconsistent

## Recommendations for Similar Future Work
- When writing ANY new `get_accessible_*` function, use `team_members` as the canonical source
- Audit any RLS policy that references `users.team_id` — it's probably wrong
- Consider deprecating `users.team_id` entirely and using `team_members` everywhere
- For help/guide pages, involve seo-copywriter early — benefit-oriented copy is more engaging than feature descriptions

## Files Changed
- `app/gestionnaire/(with-navbar)/aide/page.tsx` (new)
- `app/gestionnaire/(with-navbar)/aide/aide-client.tsx` (new, ~700 lines)
- `supabase/migrations/20260225120000_fix_rls_gestionnaire_team_id_mismatch.sql` (new)
- `tasks/prd-guide-utilisateur.md` (new)
- Various email files (blacklist, attachment preview, conversation thread updates)
