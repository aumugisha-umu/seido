# Retrospective: Centralize Email Config — Eliminate Hardcoded Domains

**Date:** 2026-03-25
**Duration:** ~15 minutes
**Branch:** preview

## What Went Well
- Plan was precise with exact file paths and line numbers — zero ambiguity
- All 17 edits applied cleanly in a single pass, no conflicts
- Grep verification confirmed 0 remaining hardcoded emails in `emails/`

## What Could Be Improved
- Could have been done during the original `seido.app` → `seido-app.com` migration to avoid two passes

## New Learnings Added to AGENTS.md
- Learning #169: Centralize hardcoded email/domain strings into EMAIL_CONFIG

## Patterns Discovered
- **Config boundary pattern:** Server-side config (`EMAIL_CONFIG`) belongs in email templates (server-rendered via React Email) but NOT in client components (landing pages, legal pages). The boundary is rendering context, not importance.

## Anti-Patterns Avoided
- Did NOT import `EMAIL_CONFIG` into client-side pages (`app/page.tsx`, legal pages) — would add unnecessary server-side imports to static client content

## Recommendations for Similar Future Work
- When changing any domain/email address, always check `EMAIL_CONFIG` first — it should be the only place to update
- `noreply@` is deprecated convention — prefer `notifications@` for better deliverability

## Files Changed
 emails/components/email-footer.tsx            |  7 ++++---
 emails/templates/auth/password-changed.tsx    |  5 +++--
 emails/templates/auth/password-reset.tsx      |  5 +++--
 emails/templates/auth/signup-confirmation.tsx |  5 +++--
 emails/templates/auth/team-addition.tsx       |  3 ++-
 emails/templates/auth/welcome.tsx             |  5 +++--
 emails/templates/billing/payment-failed.tsx   |  3 ++-
 lib/email/resend-client.ts                    |  5 +++++
 lib/services/domain/email-reply.service.ts    |  4 ++--
 9 files changed, 27 insertions(+), 15 deletions(-)
