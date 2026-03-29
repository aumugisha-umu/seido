# Retrospective: Invite-Only Hook — Admin Invite Fix

**Date:** 2026-03-26
**Duration:** ~1h (investigation + fix + deploy)
**Branch:** preview

## What Went Well
- Fast root cause identification: chicken-and-egg ordering between `generateLink` and `user_invitations` insert
- Two-layer defense design (metadata + pre-insert) gives redundancy
- Migration deployed to both production and staging in same session
- Error message sanitization (pg-functions:// URI leak) caught and fixed

## What Could Be Improved
- Original hook migration comment was wrong ("Admin API calls bypass auth hooks") — should have verified against Supabase docs
- Should have tested the invite flow immediately after enabling the hook in production
- `inviteGestionnaireAction` uses `invited_by: userProfile?.id` which is the INVITED user's profile, not the admin — potential data quality issue (separate fix)

## New Learnings Added to AGENTS.md
- Learning #201: Supabase before-user-created hook blocks admin API calls (generateLink)

## Patterns Discovered
- **Metadata as admin marker in auth hooks:** `password_set: false` in `user_metadata` reliably distinguishes server-side admin invites from user-initiated signups (email form and OAuth don't set this field)
- **Pre-insert gate records:** When a hook checks a table for authorization, insert the record BEFORE the hook-triggering call, then update with remaining fields after

## Anti-Patterns Avoided (or Encountered)
- **Assuming Admin API bypasses hooks:** The migration comment said "Admin API calls bypass auth hooks" — this is FALSE for Supabase auth hooks. Always verify hook behavior for ALL code paths.
- **Exposing internal URIs:** The raw `pg-functions://postgres/public/hook_block_uninvited_signups` error message was leaking to users. Always sanitize auth error messages.

## Recommendations for Similar Future Work
- When adding ANY Supabase auth hook, audit ALL code paths that create `auth.users` entries: signUp, signInWithOAuth, generateLink(invite), generateLink(magiclink), admin.createUser
- Test hooks against admin API calls explicitly — don't rely on documentation assumptions
- For gate tables with NOT NULL FK constraints, use metadata checks as fallback when pre-insert isn't possible

## Files Changed
 app/api/invite-user/route.ts                       | 64 +++++++++-----------
 app/auth/oauth-callback/route.ts                   | 11 +++-
 supabase/migrations/20260326210000_fix_hook_allow_admin_invites.sql | 69 ++++++++++++++++++++++
 3 files changed, 117 insertions(+), 27 deletions(-)
