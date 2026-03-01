# Retrospective: requireRole → getServerAuthContext Migration

**Date:** 2026-02-26
**Duration:** ~30 minutes
**Stories Completed:** 1 (complete migration)
**Branch:** preview

## What Went Well
- Plan-first approach with exhaustive grep audit identified all 7 files precisely
- Clean drop-in replacements — `getServerAuthContext` returns the same `{ user, profile }` shape
- Zero lint regressions introduced
- Server Action files correctly identified and given `getServerActionAuthContextOrNull` (not `getServerAuthContext`)

## What Could Be Improved
- Could have been done incrementally alongside the gestionnaire/locataire/prestataire migration (batch now, but would have been cleaner as one sweep)
- The comment in `proprietaire/layout.tsx` still references `requireRole()` — cosmetic, low priority

## New Learnings Added to AGENTS.md
- Learning #087: Server Components use getServerAuthContext, Server Actions use getServerActionAuthContextOrNull

## Patterns Discovered
- **API shape difference**: `requireRole(['admin'])` (array) vs `getServerAuthContext('admin')` (string) — easy to miss during migration
- **Null-check pattern for actions**: `getServerActionAuthContextOrNull` returns null, so every action needs `if (!authContext) return { success: false, error }` guard
- **Leave routers alone**: `app/dashboard/page.tsx` uses `getUserProfile()` for redirect logic — different concern, correct as-is

## Anti-Patterns Avoided
- Did NOT use `getServerAuthContext` in Server Actions (would redirect instead of returning error)
- Did NOT touch `lib/auth-dal.ts` (still needed as the underlying library)
- Did NOT modify `app/actions/auth-actions.ts` (uses `requireGuest`, different helper)

## Recommendations for Similar Future Work
- When adding new pages/layouts, always use `getServerAuthContext(role)` — never raw `requireRole`
- When adding new server actions, always use `getServerActionAuthContextOrNull(role)` with null-check
- Periodically grep for `requireRole` in `app/` to catch any regressions

## Files Changed
- `app/gestionnaire/(with-navbar)/dashboard/actions.ts` — 2 server actions migrated
- `app/admin/layout.tsx` — root layout
- `app/admin/(with-navbar)/layout.tsx` — with-navbar layout
- `app/proprietaire/layout.tsx` — root layout
- `app/proprietaire/dashboard/page.tsx` — dashboard page
- `app/proprietaire/interventions/page.tsx` — interventions page
- `app/proprietaire/biens/page.tsx` — biens page
