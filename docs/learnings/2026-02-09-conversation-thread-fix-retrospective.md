# Retrospective: Fix Conversation Thread Bugs + Participant Account Indicator

**Date:** 2026-02-09
**Duration:** ~2h (investigation + implementation)
**Stories Completed:** 4 / 4
**Branch:** preview

## What Went Well
- Leveraging existing `/sp-ralph` investigation from earlier saved significant time — 5/6 PRD stories from the original harmonization plan were already done
- The migration repair workflow (`supabase migration repair --status reverted` + re-push) worked cleanly, avoiding destructive `db reset`
- Retroactive cleanup in the migration (DELETE bad data + INSERT missing participants) ensured consistency for existing interventions, not just new ones
- The `hasAccount !== false` backwards compatibility pattern allowed gradual adoption across 3 role views without breaking any existing callers
- Visual distinction (dashed border + muted opacity) for no-account participants is subtle but clear — follows Material Design 3 principles of hierarchy through visual weight

## What Could Be Improved
- The original trigger (`add_assignment_to_conversation_participants`) lacked two basic guards: (1) auth_user_id check and (2) participant_id matching for individual threads. Both should have been in the initial trigger design — the `LIMIT 1` hack was a ticking time bomb
- The bug only surfaced when a contact without an auth account was assigned as a provider. This edge case wasn't tested during the initial trigger implementation. Testing with the 3 user archetypes (Learning #009) would have caught this
- The migration was already applied remotely before we caught the bug, requiring the repair workflow. A local-first testing discipline before pushing would avoid this

## New Learnings Added to AGENTS.md
- Learning #024: DB triggers must guard on auth_user_id before adding conversation participants
- Learning #025: Supabase migration repair workflow for already-applied migrations
- Learning #026: Optional boolean backwards compat (`!== false` pattern)

## Patterns Discovered
- **Trigger Guard Pattern**: Any SQL trigger that adds users to permission-gated features (conversations, notifications) must check `auth_user_id IS NOT NULL`. This is a security boundary — contacts without accounts can't log in and shouldn't pollute participant lists
- **Visual Account Indicator**: Dashed border + reduced opacity (50%/60%) is the established visual cue for "no account" participants. Chat icon hidden. Tooltip shows "Pas de compte"
- **Migration Repair Workflow**: `migration repair --status reverted` -> edit SQL -> `db push --linked` -> verify. Include retroactive cleanup (DELETE/INSERT) for data consistency

## Anti-Patterns Avoided
- **Database reset**: User correctly rejected `supabase db reset --linked` — too destructive. Migration repair was the right approach
- **Breaking existing callers**: Could have made `hasAccount` required on the Participant interface, forcing immediate updates everywhere. Instead, optional + `!== false` default preserved backwards compat
- **Partial role coverage**: Updated all 3 role detail clients (gestionnaire, locataire, prestataire) simultaneously — not just the one showing the bug

## Root Cause Analysis
```
Trigger: add_assignment_to_conversation_participants
Bug 1: No auth_user_id check → contacts without accounts added to group thread
Bug 2: LIMIT 1 without participant_id → provider added to wrong individual thread
Bug 3: No visual distinction → can't tell who has an account in participant badges
```

The fundamental issue was that the DB trigger operated at a lower abstraction level than the application code, without access to the same business rules. Application code (ensureInterventionConversationThreads) correctly filtered by auth_user_id, but the trigger didn't. This is a general lesson: **triggers that interact with user-facing features need the same guards as application code**.

## Recommendations for Similar Future Work
1. Any new trigger that adds users to conversations/notifications: always add `auth_user_id IS NOT NULL` guard
2. Individual thread lookups must always use `participant_id` — never `LIMIT 1`
3. When adding optional boolean to shared interfaces, use `!== false` pattern for backwards compat
4. Test trigger behavior with contacts who have NO auth account — not just registered users

## Files Changed
- `supabase/migrations/20260209100000_fix_trigger_individual_threads.sql` — Trigger rewrite with auth guard + participant_id filter + retroactive cleanup
- `components/interventions/shared/layout/participants-row.tsx` — hasAccount interface + visual indicator (dashed border, muted, no chat icon, tooltip)
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — hasAccount mapping in participants useMemo
- `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — hasAccount mapping in participants useMemo
- `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx` — hasAccount mapping in participants useMemo
