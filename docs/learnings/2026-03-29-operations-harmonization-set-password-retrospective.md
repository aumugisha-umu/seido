# Retrospective: Operations Card Harmonization + Set-Password Bug Fix

**Date:** 2026-03-29
**Duration:** ~3h (card harmonization + debugging + production migration)
**Branch:** preview → merged to main

## What Went Well
- Card harmonization was systematic: applied same pattern (hover lift, Eye button, click-to-detail) across 3 different component architectures
- AI source filtering used clean 2-layer approach (server + client pagination) instead of hacking the query
- Custom WhatsApp SVG icon matches lucide-react API seamlessly (className, fill="currentColor")
- Systematic debugging (sp-systematic-debugging) quickly identified the stale closure root cause in set-password
- Production migration failure was handled cleanly with data cleanup + repair workflow

## What Could Be Improved
- The set-password redirect bug had been lurking since 2025-10-07 — the original "CORRECTIF" comment shows awareness of propagation issues but the fix was incomplete
- Should have captured the role eagerly from the start instead of relying on a delayed setTimeout reading React context
- Production migration should have included a retroactive cleanup clause in the SQL itself

## New Learnings Added to AGENTS.md
- Learning #232: Stale React context in setTimeout after Supabase auth state change
- Learning #233: ADD CONSTRAINT CHECK validates ALL existing rows — clean stale data first

## Patterns Discovered
- **Eager capture before async mutations**: `const capturedRole = user?.role` before `updateUser()` → immune to context refresh timing
- **Whole-card clickable with stopPropagation**: Card div gets `cursor-pointer` + `onClick`, inner buttons/links use `e.stopPropagation()`
- **Hover micro-interaction**: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-300` — subtle lift indicating clickability

## Anti-Patterns Avoided (or Encountered)
- **Stale closure in setTimeout** — reading `user?.role` 1.5s after `updateUser()` when auth context may have re-rendered with null during the refresh cycle
- **`finally { setIsLoading(false) }` after success path** — resetting loading state when the component has already switched to the success screen is a no-op that confuses state tracking

## Recommendations for Similar Future Work
- When writing auth flows with delayed redirects, ALWAYS capture auth data eagerly before the mutation
- When adding CHECK constraints to existing tables, ALWAYS query `SELECT DISTINCT column FROM table` first and include cleanup in migration
- For card harmonization: extract a shared hook for actions (like useTriageActions) rather than duplicating logic

## Files Changed
- app/auth/set-password/page.tsx (150 lines changed — redirect fix)
- components/operations/whatsapp-triage-card.tsx (layout + Eye button + hover)
- components/operations/reminder-card.tsx (Eye button + hover + clickable)
- components/dashboards/shared/intervention-card.tsx (hover + clickable)
- components/operations/triage-shared.ts (WhatsApp/SMS icon differentiation)
- components/icons/whatsapp-icon.tsx (NEW — custom SVG)
- app/gestionnaire/(with-navbar)/operations/components/async-operations-content.tsx (AI source filter)
- app/gestionnaire/(with-navbar)/interventions/interventions-page-client.tsx (excludeAiSources prop)
