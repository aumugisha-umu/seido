# Retrospective: Email Section Refonte — Phase 1

**Date:** 2026-03-06
**Duration:** ~2 sessions (analysis + 12 stories + post-fix)
**Stories Completed:** 12 / 12
**Branch:** preview

## What Went Well
- Ralph methodology kept the work structured — story-by-story with acceptance criteria prevented scope creep
- `adjustCounts` pure function eliminated 7 scattered inline count adjustments
- `optimisticRemovals` Set cleanly solved the stale-while-revalidate resurrection bug
- Single RPC replacing 4 count queries (refresh API) — cleaner and faster
- Systematic debugging on the missing badge quickly identified "migration not applied" as root cause

## What Could Be Improved
- Migration should have been pushed immediately after creation, not left pending
- The useEffect-based folder fetch was fragile from the start — should have been handler-driven from day one
- SSR/API query parity should have been caught in the initial code audit (was a known pattern in MEMORY.md)
- progress.txt entries were only written for US-001 through US-003 during the session — should be consistent

## New Learnings Added to AGENTS.md
- Learning #122: auth.uid() NULL for service_role — don't guard SECURITY DEFINER RPCs with auth-dependent helpers
- Learning #123: Handler-driven fetches over useEffect for user navigation
- Learning #124: optimisticRemovals Set — prevent stale-while-revalidate resurrection
- Learning #125: SSR/API query parity — initial load must match client refresh exactly
- Learning #126: Dead code chain tracing — callback → prop → child handler → UI invocation

## Patterns Discovered
- **folderOverride parameter**: Bypasses stale React closures when state is set but callback needs the NEW value immediately
- **Pure count adjustment function**: `adjustCounts(prev, action, folder)` centralizes delta logic across all email actions
- **Dual-path load-more**: Entity API path vs folder fetchEmails path, selected by `entityFilter` presence

## Anti-Patterns Avoided (or Encountered)
- **useEffect for user-triggered fetches**: Causes stale closure bugs, skip-condition fragility, and same-value-no-fire issues
- **Loose skip conditions**: `offset === 50` matched on ALL inbox visits, not just initial render
- **Mixed reactive + imperative fetch triggers**: Two code paths fighting over when to fetch → double-fetches or missed fetches

## Recommendations for Similar Future Work
- Always push migrations immediately after creation (`supabase db push --linked`)
- For client-side navigation state machines, map ALL transitions in a table before coding
- When SSR provides initial data, verify query parity with a side-by-side diff of SSR and API queries
- Prefer handler-driven fetches with parameter overrides over useEffect([stateVar]) for navigation

## Files Changed (Phase 1 scope)
- `supabase/migrations/20260305100000_fix_get_email_counts_v2.sql` (new)
- `app/gestionnaire/(with-navbar)/mail/page.tsx`
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` (core)
- `app/gestionnaire/(with-navbar)/mail/components/mailbox-sidebar.tsx`
- `app/gestionnaire/(with-navbar)/mail/components/email-detail.tsx`
- `app/gestionnaire/(with-navbar)/mail/components/conversation-group.tsx`
- `app/gestionnaire/(with-navbar)/mail/components/mark-irrelevant-dialog.tsx`
- `lib/services/repositories/email.repository.ts`
- `lib/services/client/email-client.service.ts`
- `app/api/emails/[id]/route.ts`
- `app/api/emails/[id]/attachments/[attachmentId]/route.ts`
- `app/api/emails/refresh/route.ts`
- `hooks/use-email-polling.ts`
