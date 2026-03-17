# Retrospective: Admin Notification Emails

**Date:** 2026-03-16
**Duration:** ~2h (estimated from conversation flow)
**Stories Completed:** 5 / 5
**Branch:** preview

## What Went Well
- Brainstorming phase produced clear, user-validated design before any code was written
- Fire-and-forget pattern cleanly separates admin notifications from critical paths
- Reusing existing Resend singleton and price constants avoided duplication
- API route bridge pattern for Client Component → server email sending was clean
- MRR helper is self-contained and testable

## What Could Be Improved
- Initial implementation created a 3rd Resend instance — should have checked existing singletons first
- Price constants were duplicated before simplify caught it — grep-before-create discipline needed
- OAuth insert was missing `first_name`/`last_name` columns — existing code audit before integration
- Floating promises in webhook handler could silently drop emails in serverless

## New Learnings Added to AGENTS.md
- Learning #145: Resend singleton reuse — always import from `lib/email/resend-client.ts`
- Learning #146: Floating promises in Vercel serverless — use `void promise.catch(() => {})`
- Learning #147: Client Component → Server email bridge — API route with auth + time guard
- Learning #148: MRR on-the-fly calculation — JS reduce on active subscriptions, acceptable at <100 subs

## Patterns Discovered
- **Platform owner notifications vs team notifications**: Different recipient resolution (env var vs DB query), different format (raw HTML vs React Email), separate service
- **1-hour created_at guard**: Prevents duplicate signup notifications if the API route is called multiple times
- **Old-vs-new comparison in webhooks**: Fetch current state BEFORE upsert when you need delta information
- **HTML email builder with colored badges**: Reusable pattern for internal admin dashboards via email

## Anti-Patterns Avoided (or Encountered)
- **Multiple Resend instances** → Fixed: use singleton from `lib/email/resend-client.ts`
- **Duplicated constants** → Fixed: export from `lib/stripe.ts`, import in helper
- **Bare floating promises in serverless** → Fixed: `void .catch(() => {})` pattern
- **Service instantiation inside loop** → Fixed: hoist before chunk iteration

## Recommendations for Similar Future Work
- Always run `/simplify` after multi-file feature implementation — caught 6 critical issues here
- For any new email-sending code, check `lib/email/resend-client.ts` first
- When integrating into webhook handlers, consider old-state capture BEFORE mutations
- Fire-and-forget in serverless MUST have `.catch()` — process may freeze after response

## Files Changed

### New Files (admin notification feature)
- `lib/services/domain/admin-notification/admin-notification.service.ts` — Main service (4 notification methods)
- `lib/services/domain/admin-notification/admin-mrr.helper.ts` — MRR/ARR calculation
- `lib/services/domain/admin-notification/admin-email-builder.ts` — HTML email builder
- `app/api/internal/admin-signup-notification/route.ts` — API bridge for email signup

### Modified Files
- `app/auth/complete-profile/actions.ts` — OAuth signup notification + first_name/last_name fix
- `app/auth/set-password/page.tsx` — Fire-and-forget fetch to admin notification API
- `lib/services/domain/stripe-webhook.handler.ts` — Subscription change/cancel notifications
- `app/api/cron/trial-expiration/route.ts` — Trial expired admin notification
- `lib/stripe.ts` — Exported price constants
- `.env.example` — Added ADMIN_NOTIFICATION_EMAILS
- `AGENTS.md` — +4 learnings (#145-148)
- `tasks/prd.json` — Feature status: completed
- `tasks/progress.txt` — 5 story entries
