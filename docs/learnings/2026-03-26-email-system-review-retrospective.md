# Retrospective: Email System Comprehensive Review

**Date:** 2026-03-26
**Duration:** ~1.5h (explore + dual review + verify + fix)
**Branch:** preview

## What Went Well
- Dual review approach (simplify + feature-evaluator) caught complementary issues
- False positive verification prevented 2 unnecessary fixes (H4 stale team_id, H5 approved/rejected)
- Parallel 3-agent fix strategy with non-overlapping file sets maximized throughput
- All fixes passed lint on first try

## What Could Be Improved
- The SSRF vulnerability (C1) existed since the route was created — should have been caught in initial code review
- The welcome email prop mismatch likely shipped broken — TypeScript strict mode should catch this
- `assets.ts` (186 lines) was dead code for months — periodic dead code audits needed
- The dual email service architecture (legacy singleton vs modern class) creates ongoing confusion

## New Learnings Added to AGENTS.md
- Learning #202: Unauthenticated API routes — check EVERY route in a directory
- Learning #203: Welcome email prop name mismatch — WelcomeEmailProps.dashboardUrl

## Patterns Discovered
- **Dual-agent review pattern:** simplify (code quality) + feature-evaluator (3-axis scoring) find different issues. Simplify catches dead code and bugs; evaluator catches security and architecture gaps.
- **False positive verification:** Reading actual source code before acting on agent findings prevents wasted work (2/11 high-severity findings were false positives).

## Anti-Patterns Avoided (or Encountered)
- **Auth gap in sibling routes:** `connections/test/route.ts` had no auth while `connections/[id]/test/route.ts` did. Same directory, different security posture.
- **Mislabeled function:** `calculateBackoffDelay` said "exponential" but implemented linear (`baseDelay * n` vs `baseDelay * 2^n`)
- **Dead code accumulation:** 6 functions in `assets.ts`, unused type `EmailBuildContext`, deprecated no-op method, unused factory — all hiding in plain sight

## Recommendations for Similar Future Work
- Run email system review quarterly — 40 templates + 20 routes = high surface area
- When creating API route directories, add a checklist: every route needs `getApiAuthContext()` or explicit public annotation
- Consolidate the two email services (legacy singleton vs modern class) — this is the highest-ROI medium-term investment

## Files Changed
 app/api/emails/[id]/links/route.ts                              | ~6 changes
 app/api/emails/[id]/route.ts                                    | ~4 changes
 app/api/emails/connections/[id]/sync/route.ts                   | ~2 changes
 app/api/emails/connections/[id]/test/route.ts                   | ~6 changes
 app/api/emails/connections/test/route.ts                        | major rewrite (auth + SSRF)
 app/api/emails/oauth/revoke/route.ts                            | ~2 changes
 app/api/emails/send/route.ts                                    | ~2 changes
 app/api/emails/sync/route.ts                                    | ~4 changes
 app/api/send-welcome-email/route.ts                             | 1 line fix
 emails/components/email-footer.tsx                               | 2 link fixes
 emails/templates/auth/welcome.tsx                                | +proprietaire role
 emails/utils/assets.ts                                           | DELETED
 emails/utils/render.ts                                           | simplified (removed unused exports)
 lib/email/resend-client.ts                                       | removed unused import
 lib/services/domain/__tests__/email-notification.service.test.ts | removed deprecated test
 lib/services/domain/email-notification/builders/quote-emails.builder.ts | as any → typed
 lib/services/domain/email-notification/constants.ts              | removed unused constant
 lib/services/domain/email-notification/email-notification.service.ts | removed deprecated method + dead cases
 lib/services/domain/email-notification/helpers.ts                | fixed exponential backoff
 lib/services/domain/email-notification/types.ts                  | removed unused type + dead event types
 lib/services/domain/email-reply.service.ts                       | removed unused factory
 lib/services/domain/email-to-conversation.service.ts             | TODO comment for race condition
