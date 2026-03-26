# B10 -- Mail + Email System

## Files reviewed (12)
- `app/gestionnaire/(with-navbar)/mail/page.tsx` (~465 lines)
- `app/gestionnaire/(with-navbar)/mail/components/` (17 component files listed)
- `lib/services/domain/email-notification/email-notification.service.ts`
- `lib/services/domain/email-notification/email-sender.ts`
- `lib/services/domain/email-notification/constants.ts`
- `lib/services/domain/email-notification/helpers.ts`
- `lib/services/domain/email-notification/action-link-generators.ts`
- `lib/email/resend-client.ts`
- `lib/email/email-service.ts` (referenced)

---

## Security: 7/10

**Positives:**
- `getServerAuthContext('gestionnaire')` in mail page (page.tsx:L430)
- Service role client used for email-heavy queries that bypass slow RLS -- justified with comment "Security: getServerAuthContext already validated user is an authenticated gestionnaire" (L432-433)
- Email connections filtered by visibility: shared connections visible to all, private only to owner (L186-189)
- Magic link generation for email action buttons -- no raw tokens exposed
- Rate limiting with exponential backoff for Resend API (email-sender.ts:L200-224)
- Feature flag for interactive emails (`ENABLE_INTERACTIVE_EMAILS` env var)

**Issues:**
- (-1) **`.single()` used on RPC call** (page.tsx:L96): `supabase.rpc('get_email_counts', ...).single()` -- while RPCs returning a single row are safer than table queries, this is inconsistent with the project convention of using `.limit(1)` for resilience
- (-1) **Direct Supabase queries in mail page.tsx** (L95-421): The entire server-side data fetching (`getEmailCounts`, `getBuildings`, `getEmailConnections`, `getLinkedEntities`, `getInitialEmails`) is done with raw Supabase queries inline in the page file rather than through repository pattern. This is a significant pattern violation with ~300 lines of query code in a page file
- (-1) **Service role client passed to functions without explicit team scoping annotation**: While all queries filter by `teamId`, the service role client bypasses RLS entirely. Any missed `team_id` filter would expose data across teams

---

## Patterns: 5/10

**Positives:**
- Email notification module is well-structured: 16 files with clear separation (service, sender, builders, helpers, types, constants)
- Builder pattern for different email types (created, scheduled, time_slots_proposed, completed, status_changed, quotes)
- `BatchEmailSender` class handles rate limiting, retry, and magic link generation
- EMAIL_CONFIG centralized in `lib/email/resend-client.ts` (L24-58) -- no hardcoded domains in email-notification module
- `Promise.all` for parallel data fetching in mail page (L439-451)
- Clean factory function pattern in email-notification.service.ts

**Issues:**
- (-2) **Repository pattern violated in mail page.tsx**: ~300 lines of direct Supabase queries (`getEmailCounts`, `getBuildings`, `getEmailConnections`, `getLinkedEntities`, `getInitialEmails`) should be in repositories
- (-1) **`console.warn` and `console.error` in resend-client.ts** (L12, L44): Production code should use `logger` from `@/lib/logger`, not `console.*`. The file uses both -- `logger` for some things, `console` for others
- (-1) **Mail page at ~465 lines with complex inline types** (BuildingRow, EmailConnectionRow, etc. -- L28-89): These 60+ lines of interface definitions should be in a types file
- (-1) **Fallback query pattern in `getEmailConnections`** (L160-183): If the main query fails, a secondary query without visibility columns runs. This is a migration compatibility hack that should be cleaned up once the migration is confirmed applied

---

## Design Quality: 7/10

**Positives:**
- Full email client UI: mailbox sidebar, email list, email detail, conversation thread, compose modal
- Internal chat panel for team collaboration on emails
- Link-to-entity dialog for associating emails with buildings/lots/contacts/interventions
- Attachment preview modal
- Email connection management (add, configure, view)
- Blacklist manager for blocking senders
- Mark as processed/irrelevant workflows
- Conversation grouping for thread view
- Source counts per email connection in sidebar
- SSR pre-fetch for instant first paint

**Issues:**
- (-1) No empty state guidance described for zero emails (common for new users)
- (-1) Loading fallback in AI assistant page uses spinner instead of skeleton (adjacent finding but relevant pattern)
- (-1) 17 component files in mail/components/ but some may have large sizes -- risk of cognitive overload

**Bonus:**
- (+1) Progressive disclosure with mailbox sidebar (folders) -> email list -> email detail
- (+1) Multi-entity linking (buildings, lots, contacts, contracts, interventions, companies) with email counts

---

## Summary

```
Security:       7/10  ███████░░░
Patterns:       5/10  █████░░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 6.4/10
Result: FAIL (Patterns axis < 7)
```

**Blockers:**
1. **Repository pattern violation**: ~300 lines of direct Supabase queries in mail/page.tsx must be moved to repositories (EmailRepository, EmailConnectionRepository, EmailLinkRepository)

**Improvements:**
1. **CRITICAL**: Extract all Supabase queries from mail/page.tsx into proper repositories
2. **HIGH**: Replace `console.warn`/`console.error` with `logger.warn`/`logger.error` in resend-client.ts (L12, L44)
3. **HIGH**: Replace `.single()` with `.limit(1)` on `get_email_counts` RPC call (page.tsx:L96)
4. **MEDIUM**: Extract inline type definitions from mail/page.tsx into a shared types file
5. **LOW**: Remove migration fallback query in `getEmailConnections` once confirmed deployed
6. **LOW**: Add empty state for zero emails
