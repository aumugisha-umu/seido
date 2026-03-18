# Retrospective: Lightweight Signup + Deferred Profile Completion

**Date:** 2026-03-17
**Duration:** ~3 hours (estimated from conversation)
**Stories Completed:** 5 / 5
**Branch:** preview

## What Went Well
- Unified email + OAuth signup into a single `/auth/complete-profile` page — eliminated code duplication
- DB trigger 3-branch IF cleanly separates invitation / lightweight / full signup
- Three-layer profile guard (login + layout + action) provides robust defense-in-depth
- Avatar upload via `supabaseAdmin` in server action elegantly bypasses RLS timing issues
- Simplify review caught 8 issues including a memory leak and blocking I/O

## What Could Be Improved
- Avatar constants were duplicated in 3 places before simplify caught it — should centralize upfront
- The `& {}` type pattern was used instead of idiomatic `NonNullable<>` — code review earlier would help
- `console.error` slipped into client component instead of `logger` — need consistent linting rule

## New Learnings Added to AGENTS.md
- Learning #154: DB trigger must handle partial profiles (3-branch IF for lightweight signup)
- Learning #155: Three-layer incomplete profile guard (login + layout + server action)
- Learning #156: URL.createObjectURL() leaks on re-upload without explicit revoke

## Patterns Discovered
- **Partial profile pattern**: User created with `name=email_prefix`, `team_id=NULL`, completed later — enables minimal-friction signup
- **Unified flow with `isEmailSignup` flag**: Single server action handles both flows, detected via FormData hidden field
- **Avatar upload in server action**: Using `supabaseAdmin` avoids RLS timing issues for just-created profiles (RLS may not grant access yet)

## Anti-Patterns Avoided (or Encountered)
- **Avoided**: Separate pages for email vs OAuth completion (user caught this early)
- **Encountered**: `& {}` type hack instead of `NonNullable<>` — fixed in simplify
- **Encountered**: Blocking `await uploadAvatar()` before redirect — made fire-and-forget
- **Encountered**: Blob URL memory leak on avatar re-selection — added revoke before create

## Recommendations for Similar Future Work
- When adding new signup metadata, always check the DB trigger handles missing fields gracefully
- Profile completion enforcement needs all 3 layers — login redirect alone is insufficient
- Fire-and-forget for non-critical post-signup work (avatar upload, admin notification) — user experience > guaranteed completion
- Run simplify immediately after feature implementation, not as a separate step

## Files Changed
- app/auth/signup/signup-form.tsx (simplified from 7 to 3 fields)
- app/actions/auth-actions.ts (simplified schema + login guard)
- supabase/migrations/20260317100000_team_name_from_organization.sql (3-branch trigger)
- components/auth/confirm-flow.tsx (conditional redirect + logger fix)
- app/auth/complete-profile/page.tsx (unified page)
- app/auth/complete-profile/complete-profile-form.tsx (avatar upload + org field)
- app/auth/complete-profile/actions.ts (unified action + avatar upload helper)
- lib/server-context.ts (profile guard redirects)
- lib/validation/schemas.ts (centralized avatar constants)
