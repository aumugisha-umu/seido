# Verification Analysis - Production Readiness Audit (2026-03-12)

## Objective

Validate the audit `docs/audit/production-readiness-audit-2026-03-12.md` against the current codebase before applying fixes, with a focus on:

- confirming real issues vs false positives,
- identifying regression risks introduced by fixes,
- defining a safe correction order and verification plan.

## Verification Method

- Static code verification of all P0 findings listed in the audit.
- Targeted verification of high-impact P1 findings that can invalidate a fix strategy (security, architecture, dead code, data consistency).
- Cross-check for stale findings that are already partially addressed.

## P0 Findings - Verification Status and Regression Risks

| ID | Audit Claim | Verification Status | Notes | Regression Risk if Fixed Blindly |
|---|---|---|---|---|
| C1 | Cron auth bypass when `CRON_SECRET` unset | Confirmed | In `app/api/cron/*` (except `intervention-reminders`), condition is fail-open (`if (CRON_SECRET && ...)`) | Low. Fix is straightforward fail-closed. Main risk: existing cron jobs fail if secret not configured in env. |
| C2 | CSP allows unsafe script execution | Confirmed | `next.config.js` contains `unsafe-inline` and `unsafe-eval` in `Content-Security-Policy` | High if removed abruptly. Can break analytics, Frill, Google Maps, and inline scripts. Needs staged CSP hardening with telemetry. |
| C3 | Missing HSTS | Confirmed | No `Strict-Transport-Security` in `next.config.js` headers | Medium. Must ensure HTTPS everywhere before preload. |
| C4 | Missing Permissions-Policy | Confirmed | No `Permissions-Policy` header in `next.config.js` | Low. Additive hardening, minimal functional risk. |
| C5 | Server actions missing auth checks | Confirmed (with nuance) | `app/actions/contacts.ts` and `app/actions/conversation-notification-actions.ts` rely on caller/session but do not enforce team ownership from server context. `dispatcher-actions.ts` explicitly trusts caller. | Medium-High. Naive auth additions can break existing internal call flows. Must enforce context consistently (`getServerActionAuthContextOrNull`) and derive team server-side. |
| C6 | XSS risk in email send route | Confirmed | `app/api/emails/send/route.ts` injects `body` into HTML with newline replacement only, no escaping/zod | Medium. Escaping only may alter expected rich-text behavior if clients relied on HTML input. Decide explicit plain-text or sanitized rich-text contract. |
| C7 | Open redirect in impersonation callback | Confirmed | `app/auth/impersonate/callback/route.ts` uses unvalidated `next` query parameter | Low-Medium. Tight validation can affect legitimate deep links; allow only same-origin relative routes. |
| C8 | Unauthenticated document download (IDOR class) | Confirmed | `app/api/download-intervention-document/[id]/route.ts` uses service role and no session/team validation | High. If fully locked behind auth, email-based document flow may break. Needs secure tokenized access strategy, not just blanket auth requirement. |
| C9 | Service role key partially logged | Confirmed | `lib/services/core/supabase-client.ts` logs key prefix/suffix/length | Low. Safe to remove immediately. |
| C10 | Next.js version vulnerable | Confirmed as dependency state | `package.json` pins `next` `15.2.6` | Medium. Upgrade may impact middleware/runtime behavior and plugins. Needs smoke tests on auth, middleware, and dynamic routes. |
| C11 | Build gates disabled and no CI | Confirmed | `next.config.js` sets `ignoreDuringBuilds` and `ignoreBuildErrors` true, no `.github/workflows` present | Medium. Re-enabling gates without cleanup can block deploys. Requires staged lint/type debt reduction. |
| C12 | User repository role enum mismatch | Confirmed | `lib/services/repositories/user.repository.ts` validates legacy roles (`manager/provider/tenant`) | Medium. Fix can surface latent invalid persisted values or callers sending old role names. |
| C13 | Lot occupied filter uses wrong role value | Confirmed | `lib/services/repositories/lot.repository.ts` uses `tenant` instead of `locataire` | Low. Direct bug fix likely safe; validate occupied lot views after change. |
| C14 | Stats repository references removed columns | Confirmed | `lib/services/repositories/stats.repository.ts` queries `assigned_gestionnaire` / `assigned_prestataire` | Medium. Fix requires rewriting counting logic via `intervention_assignments`. |
| C15 | PostgREST filter injection risk in building repo | Confirmed | `lib/services/repositories/building.repository.ts` interpolates `userId` directly in `.or(...)` | Medium. Sanitization must preserve intended filtering semantics. |
| C16 | Conflicting transition maps | Confirmed | `lib/services/domain/intervention-service.ts` and `lib/services/repositories/intervention.repository.ts` diverge (`demande_de_devis`, `en_cours`) | High. Harmonization can alter workflow transitions and UI state machine behavior. |
| C17 | Import service highly sequential | Confirmed | `lib/services/domain/import.service.ts` has multiple sequential loops (`for ... await`) in validation/import phases | Medium-High. Aggressive parallelization can break referential dependencies and increase DB contention/rate-limit failures. |

## Additional P1 Cross-Checks (High Value)

These were verified because they can directly impact the safety of P0 remediations:

- **P1 security filter injection family: confirmed**  
  Unsanitized `.or(...)` interpolation exists in:
  - `lib/services/repositories/user.repository.ts`
  - `lib/services/repositories/building.repository.ts`
  - `lib/services/repositories/lot.repository.ts`
  - `lib/services/repositories/property-document.repository.ts`
  - `app/actions/user-admin-actions.ts`  
  `lib/services/repositories/contact.repository.ts` already has sanitization logic and can serve as canonical pattern.

- **P1 unstable cache dead code: confirmed**  
  `lib/cache/cached-queries.ts` is exported by `lib/cache/index.ts` but not imported by runtime app code.

- **P1 rate-limit fail-open: confirmed**  
  In `middleware.ts`, limiter errors are swallowed with request pass-through.

- **P1 sensitive debug data leaks: confirmed**  
  `app/api/reset-password/route.ts` logs/returns detailed internal debug data in some branches.

- **P1 impersonation cookie not httpOnly: confirmed**  
  `app/actions/impersonation-actions.ts` sets impersonation cookie with `httpOnly: false`.

- **P1 upload trusts client `team_id`: confirmed**  
  `app/api/property-documents/upload/route.ts` reads `team_id` from form-data instead of deriving from authenticated profile context.

- **P1 magic link no explicit rate-limit: confirmed**  
  `app/api/magic-link/[token]/route.ts` has no route-level rate limiter.

- **P1 false positive detected: UserUpdate missing `proprietaire`**  
  Not confirmed. `lib/services/core/service-types.ts` includes `proprietaire` in role unions.

## Key Regression Hotspots (Where fixes must be designed carefully)

1. **Document download security (`C8`)**
   - Current behavior intentionally supports unauthenticated email link downloads.
   - Forcing session auth will break this flow.
   - Safer remediation: signed one-time token scoped to document + expiration + optional recipient binding, while preserving email UX.

2. **CSP tightening (`C2`)**
   - Hard switch away from unsafe directives risks breaking scripts used by analytics/widgets/maps.
   - Recommended path: report-only CSP first, collect violations, then enforce iteratively.

3. **Intervention status transition harmonization (`C16`)**
   - Domain and repository currently diverge.
   - Unifying transitions may affect creation/edit/finalization flows and historical records with deprecated statuses.

4. **Import parallelization (`C17`)**
   - Some phases are dependency-bound (companies -> contacts, buildings -> lots, lots/contacts -> contracts).
   - Safe gain is intra-phase chunked parallelism, not full cross-phase parallelism.

5. **Server actions auth hardening (`C5`)**
   - Some actions are designed as internal orchestration calls.
   - Add server-side context checks without coupling every action to end-user session assumptions that break internal workflows.

## Recommended Fix Order (Risk-Minimized)

### Wave A - Low-Risk Security Wins

- C1, C4, C9, C13.
- Add guardrails/tests first, then patch.

### Wave B - High-Impact Security with Compatibility Strategy

- C7, C6, C5, C8.
- For C8 specifically, implement a compatibility path for email download links before closing service-role access.

### Wave C - Platform and Quality Gates

- C10, C11.
- Upgrade Next and introduce CI in a dedicated branch with full smoke tests.

### Wave D - Data/Workflow Correctness and Performance

- C12, C14, C15, C16, C17.
- Run targeted domain regression tests around interventions and imports after each sub-batch.

## Mandatory Post-Fix Regression Checklist

### Security/Access

- Cron endpoints reject requests with missing/invalid bearer secret.
- Impersonation callback rejects absolute/external `next` URLs.
- Property document upload ignores client `team_id` and uses authenticated profile context.
- Unauthenticated document link behavior is explicitly tested for intended policy (allowed via secure token or denied consistently).

### Auth/Actions

- `useTeamContacts` flow still works for authorized users.
- Conversation notifications still dispatch from all expected entry points.
- No server action breaks due to new auth context assumptions.

### Intervention Workflow

- Status transitions validated end-to-end for all active roles.
- Deprecated statuses (`en_cours`, `demande_de_devis`) handling is explicit (migrate, map, or reject).

### Import Pipeline

- Import still respects entity dependency order.
- Partial failures do not corrupt cross-reference maps.
- Performance gain measured with same dataset before/after.

### Build/Deploy

- Typecheck and lint pass on CI pipeline.
- Middleware/auth flows pass smoke tests after Next upgrade.

## Conclusion

The audit is largely reliable on P0 security and architecture risks. Most critical findings are confirmed in code.  
However, several fixes (notably C2, C5, C8, C16, C17) carry meaningful regression risk if applied as direct patches without compatibility design and targeted regression tests.

The safest path is staged remediation with explicit test gates after each wave.
