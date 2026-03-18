# SEIDO Production Readiness Audit - Consolidated Report

**Date**: 2026-03-12
**Audited by**: 6 specialized agents + 2 deep performance agents + coordinator
**Files reviewed**: ~1,100+ across all domains
**Branch**: `preview`

---

## Executive Summary

SEIDO is architecturally sound with good patterns (repository layer, RLS multi-tenancy, `getServerAuthContext`, `after()` deferral), but has **critical security gaps** (cron auth bypass, missing HSTS, weak CSP), **dead caching infrastructure**, and **sequential processing bottlenecks** in crons and creation flows. The codebase needs a security hardening sprint before production launch, followed by performance optimization of sequential flows.

## Readiness Score

| Domain | Score /10 | Critical | Important | Suggestions |
|--------|-----------|----------|-----------|-------------|
| Frontend | 7 | 5 | 15 | 10 |
| Backend | 6 | 7 | 10 | 7 |
| Database & Services | 6 | 8 | 10 | 6 |
| Dependencies & Config | 6 | 5 | 12 | 7 |
| Performance & Architecture | 7 | 5 | 7 | 6 |
| Security (OWASP) | 5 | 5 | 10 | 16 |
| Deep Performance (Parallelization) | 6 | 1 | 13 | - |
| **Overall** | **6.1** | **36** | **77** | **52** |

---

## Architecture Positives (What's Done Right)

- `getServerAuthContext(role)` consistently used across 59 pages
- Repository pattern well-applied via `lib/services/`
- RLS + `team_id` multi-tenancy at database level
- Rate limiting with Upstash Redis + in-memory dev fallback
- Webhook signature verification on Stripe, ElevenLabs, Resend
- DOMPurify sanitization on all `dangerouslySetInnerHTML` usage
- Structured Pino logging across most of the app
- `after()` deferred work adopted in 19 API routes
- Good `'use client'` discipline (47% of component files)
- Proper `date-fns` tree-shaking (named imports only)
- Proper realtime subscription cleanup
- Building creation already parallelized (bulk inserts + Promise.all)
- Email sync cron already uses Promise.allSettled
- Batch rent reminders already optimized (bulk inserts + after())

---

## Critical Issues (P0 - Must Fix Before Production)

### SECURITY

#### C1. Cron Endpoints Auth Bypass (5 of 6 routes)
- **Files**: `app/api/cron/trial-expiration/route.ts:24`, `trial-notifications/route.ts:30`, `behavioral-triggers/route.ts:30`, `sync-emails/route.ts:10`, `cleanup-webhook-events/route.ts:22`
- **Issue**: `if (process.env.CRON_SECRET && authHeader !== ...)` skips auth entirely when `CRON_SECRET` is unset
- **Impact**: Anyone can trigger mass email sends, subscription manipulations, data cleanup
- **Fix**: Change to `if (!process.env.CRON_SECRET || authHeader !== ...)` (fail-closed)
- **Reference**: `intervention-reminders/route.ts:42` already uses the correct pattern

#### C2. CSP allows `'unsafe-eval'` and `'unsafe-inline'`
- **File**: `next.config.js:71`
- **Issue**: `script-src` includes both, neutralizing XSS protection
- **Fix**: Use nonce-based CSP (Next.js supports this natively) or document why `unsafe-eval` is required

#### C3. Missing HSTS Header
- **File**: `next.config.js` headers section
- **Issue**: No `Strict-Transport-Security` header configured
- **Fix**: Add `{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }`

#### C4. Missing Permissions-Policy Header
- **File**: `next.config.js` headers section
- **Fix**: Add `{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' }`

#### C5. Server Actions Without Authentication
- **Files**: `app/actions/dispatcher-actions.ts:52`, `app/actions/contacts.ts:26`, `app/actions/conversation-notification-actions.ts:50`
- **Issue**: Server actions callable from client without auth checks, trusting unvalidated `teamId`
- **Fix**: Add `getServerAuthContext()` or `getServerActionAuthContextOrNull()` to each

#### C6. XSS in Email Send Route
- **File**: `app/api/emails/send/route.ts:28`
- **Issue**: `body.replace(/\n/g, '<br>')` without HTML escaping, no Zod validation
- **Fix**: Escape HTML entities before replacement, add Zod schema

#### C7. Open Redirect in Impersonation Callback
- **File**: `app/auth/impersonate/callback/route.ts:14`
- **Issue**: `next` query parameter not validated, allows `?next=https://evil.com`
- **Fix**: Validate `next` is a relative path or same-origin URL

#### C8. Unauthenticated Document Download (IDOR)
- **File**: `app/api/download-intervention-document/[id]/route.ts:52-65`
- **Issue**: Uses `createServiceRoleSupabaseClient()` (bypasses RLS) with UUID-only "auth"
- **Fix**: Require session cookie + verify user belongs to document's team

#### C9. Service Role Key Logged in Plaintext
- **File**: `lib/services/core/supabase-client.ts:191-193`
- **Issue**: Logs first 20 + last 10 chars of `SUPABASE_SERVICE_ROLE_KEY`
- **Fix**: Remove the key logging entirely

#### C10. Next.js 15.2.6 Has Known CVEs
- **File**: `package.json:102`
- **Issue**: CVE-2025-55184 (DoS) and CVE-2025-55183 (Source Code Exposure) patched in 15.2.8
- **Fix**: `npm install next@15.2.8`

#### C11. TypeScript & ESLint Errors Ignored During Builds + No CI
- **File**: `next.config.js:93-100`
- **Issue**: `ignoreDuringBuilds: true` + no CI pipeline = zero quality gate before deploy
- **Fix**: Add GitHub Actions workflow with lint + build verification

### DATABASE

#### C12. UserRepository Role Validation Wrong Enum
- **File**: `lib/services/repositories/user.repository.ts:45,175,245`
- **Issue**: Validates against `['admin', 'manager', 'provider', 'tenant']` but DB uses French names `['gestionnaire', 'prestataire', 'locataire']`
- **Impact**: Validation rejects valid data or is never called

#### C13. LotRepository.findOccupied() Wrong Role Name
- **File**: `lib/services/repositories/lot.repository.ts:555`
- **Issue**: Filters by `'tenant'` instead of `'locataire'` — always returns 0 results

#### C14. StatsRepository References Nonexistent Columns
- **File**: `lib/services/repositories/stats.repository.ts:330`
- **Issue**: Queries `assigned_gestionnaire`/`assigned_prestataire` columns that don't exist (migrated to junction table)

#### C15. SQL Injection Risk in BuildingRepository
- **File**: `lib/services/repositories/building.repository.ts:235`
- **Issue**: Raw userId interpolation in `.or()` filter string

#### C16. Duplicate VALID_TRANSITIONS with Conflicting Values
- **Files**: `lib/services/domain/intervention-service.ts:150` vs `lib/services/repositories/intervention.repository.ts:893`
- **Issue**: Repository still includes deprecated `demande_de_devis` and `en_cours` statuses

### PERFORMANCE

#### C17. Import Service Sequential Processing
- **File**: `lib/services/domain/import.service.ts`
- **Issue**: Every entity type imported in sequential `for...of await` loop
- **Impact**: 350 entities = ~40 seconds. With chunks of 10 = ~4 seconds
- **Fix**: `Promise.allSettled` with chunked batches

---

## Important Issues (P1 - Should Fix Soon)

### SECURITY P1

1. **PostgREST filter injection** — unsanitized search in 5 repositories (`user.repository.ts:242`, `building.repository.ts:321`, `lot.repository.ts:649`, `property-document.repository.ts:321`, `user-admin-actions.ts:498`). Only `contact.repository.ts:299` sanitizes correctly.
2. **Beta password non-timing-safe comparison** — `app/actions/beta-actions.ts:92`
3. **Upload route trusts client-supplied `team_id`** — `app/api/property-documents/upload/route.ts:69-70`
4. **Error messages leak internal details** — `change-password/route.ts:68`, `change-email/route.ts:100`, `reset-password/route.ts:160-170`
5. **Impersonation cookie not `httpOnly`** — `app/actions/impersonation-actions.ts:111`
6. **Magic link endpoint no rate limiting** — `app/api/magic-link/[token]/route.ts`
7. **HTML injection in beta email** — `app/actions/beta-actions.ts:211-239`
8. **Sensitive data in logs** — `app/api/reset-password/route.ts:54,97,162`
9. **Rate limiting fails open** — `middleware.ts:97-100`
10. **`@vercel/analytics` pinned to `"latest"`** — `package.json:83`

### PERFORMANCE P1

11. **Contract creation sequential** — 4 independent post-creation steps run serially (~510ms → ~250ms with `Promise.all`). File: `components/contract/contract-form-container.tsx:636`
12. **Intervention creation tail** — steps 8-11 (quotes, tenants, slots) sequential but independent (~200ms → ~120ms). File: `app/api/create-manager-intervention/route.ts:710`
13. **3 crons with sequential loops** — trial-expiration, trial-notifications, behavioral-triggers. Each ~85-90% parallelizable.
14. **Missing composite indexes** — `intervention_assignments(user_id, role)` and `contract_contacts(user_id, role)` for RLS optimization
15. **`unstable_cache` layer is 100% dead code** — `lib/cache/cached-queries.ts` defines 4 cached functions, none are imported anywhere
16. **6 `revalidatePath` calls on `force-dynamic` pages** — no-ops (dead code)
17. **All `revalidateTag` calls invalidate tags with no matching `unstable_cache`** — dead code
18. **3 `after()` missing** — work-completion, intervention-finalize, intervention-schedule have notifications in request path
19. **Service init sequential** (6 awaits) in schedule + finalize routes — `Promise.all` saves ~140ms

### FRONTEND P1

20. **9 files massively exceed 500-line limit** — `lot-creation-form.tsx` (2705), `intervention-detail-client.tsx` (2466), `nouvelle-intervention-client.tsx` (2373), `building-creation-form.tsx` (1581), `contract-form-container.tsx` (1330), etc.
21. **Pervasive `any` types** — ~226 in gestionnaire files alone, core dashboard components heavily untyped
22. **No route-segment error boundaries** — only role-level `error.tsx` exists (5 files vs needed ~15+)
23. **`ALLOWED_MIME_TYPES` duplicated across 5 upload hooks** with inconsistencies
24. **7+ copies of `getPriorityColor`/`getPriorityLabel`** — canonical version in `lib/intervention-utils.ts` unused by most consumers
25. **Missing `loading.tsx`** on 20+ route segments — blank white screen during navigation
26. **No error tracking service (Sentry)** — unhandled errors silently lost in production
27. **No `/api/health` endpoint** — no uptime monitoring or LB health checks
28. **Test/debug pages accessible in production** — `test-property-preview`, `debug/`
29. **`userScalable: false`** in root layout — WCAG accessibility violation

### DATABASE P1

30. **`getDocuments()` missing `deleted_at` filter** — `intervention.repository.ts:791`
31. **Duplicate validation functions** — `error-handler.ts` vs `service-types.ts` with different error types
32. **`getInterventionStats()` fetches all rows to count** — should use count-only query
33. **73 untyped `any` across 23 service files**
34. **`intervention-service.ts` is 3,154 lines** — 6x the 500-line rule
35. **Unsanitized user input in 4 repository `.or()` filters**
36. **`upsertMany` loops create N+1 queries** — building, lot, user repositories
37. **`InterventionRepository.findByBuilding()` misses building-level interventions** where `lot_id IS NULL`
38. **`UserUpdate` type missing `proprietaire` role**

### DEPENDENCIES P1

39. **`node-imap` unmaintained** (8+ years) — replace with `imapflow`
40. **Tailwind v3 config format with v4 runtime** — potential silent config mismatches
41. **`pino-pretty` and `dotenv` in production dependencies** — should be devDependencies
42. **`xlsx` from CDN tarball** — bypasses npm audit and Dependabot scanning
43. **Duplicate toast libraries** — both `sonner` (used) and `@radix-ui/react-toast` (unused)

---

## Dependency Update Plan

| Package | Current | Target | Priority | Breaking? |
|---------|---------|--------|----------|-----------|
| `next` | 15.2.6 | **15.2.8** | **Immediate** (CVEs) | No |
| `@vercel/analytics` | `"latest"` | Pin `^1.x` | Immediate | No |
| `@supabase/ssr` | 0.7.0 | 0.9.0 | Soon | Check changelog |
| `@supabase/supabase-js` | ^2.57.0 | 2.99.1 | Soon | No |
| `stripe` | ^20.3.1 | 20.4.1 | Low | No |
| `tailwindcss` | ^4.1.9 | 4.2.1 | Low | No |
| `node-imap` | 0.9.6 | Replace with `imapflow` | Plan | Yes (different API) |
| `pino-pretty` | prod dep | Move to devDeps | Quick | No |
| `dotenv` | prod dep | Move to devDeps | Quick | No |
| `@types/*` (4 packages) | prod dep | Move to devDeps | Quick | No |

---

## GDPR/Compliance Notes

1. **No data export** (GDPR "right of portability") feature
2. **No permanent erasure** workflow (only soft delete via `deleted_at`)
3. **No consent tracking** mechanism for data processing
4. **No data retention** policy (only `cleanup-webhook-events` cron)
5. **No MFA support** for admin/gestionnaire roles handling PII
6. **Audit trail gaps** — admin user management and impersonation not logged to tamper-resistant trail

---

## Recommended Action Plan

### Phase 1: Security Hardening (Immediate - 1-2 days)
1. Fix cron auth bypass (5 routes, 30 min)
2. Add HSTS + Permissions-Policy headers (15 min)
3. Upgrade Next.js to 15.2.8 (15 min)
4. Fix server actions missing auth (3 files, 1 hour)
5. Fix open redirect in impersonation callback (15 min)
6. Remove service role key logging (5 min)
7. Add auth to document download endpoint (1 hour)
8. Fix XSS in email send route (30 min)
9. Pin `@vercel/analytics` version (5 min)

### Phase 2: Performance Quick Wins (This sprint - 2-3 days)
1. Add composite indexes for RLS (5 min each)
2. Parallelize import service (2 hours)
3. Parallelize contract creation post-steps (30 min)
4. Parallelize cron loops (1 hour each, 3 crons)
5. Add `after()` to 3 routes (30 min)
6. Parallelize service init in schedule + finalize (15 min)
7. Activate or remove dead `unstable_cache` code (1 hour)
8. Clean up dead `revalidatePath`/`revalidateTag` calls (30 min)

### Phase 3: Code Quality (Next sprint)
1. Fix role enum mismatch in repositories
2. Fix StatsRepository nonexistent columns
3. Fix duplicate VALID_TRANSITIONS
4. Standardize search input sanitization (5 repos)
5. Add route-segment error boundaries
6. Add `loading.tsx` to bare route segments
7. Extract duplicated constants (`ALLOWED_MIME_TYPES`, `getPriorityColor`)
8. Remove dead files (`programming-modal-FINAL.tsx`)
9. Set up GitHub Actions CI (lint + build)

### Phase 4: Architecture & Cleanup (Backlog)
1. Split oversized files (9 files > 500 lines)
2. Reduce `any` types in core components
3. Set up Sentry error tracking
4. Add `/api/health` endpoint
5. Remove test/debug pages from production
6. Fix `userScalable: false` accessibility
7. Evaluate CSP nonce-based approach
8. Replace `node-imap` with `imapflow`
9. Clean up unused dependencies
10. GDPR: data export + erasure + consent features

---

**Generated by**: 8 specialized audit agents (6 domain + 2 deep perf + 1 coordinator)
**Total files analyzed**: ~1,100+
**Total findings**: 36 critical + 77 important + 52 suggestions
