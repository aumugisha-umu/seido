# Production Readiness Sprint — Agent Instructions

## Context

You are implementing the production readiness audit findings from `docs/audit/production-readiness-audit-2026-03-12-FINAL.md`. The audit identified 29 critical + 62 important findings across 6 waves (A through F).

**IMPORTANT**: A previous attempt to implement ALL stories at once via worktree broke the build. This time, implement ONE story at a time, verify the build after each, and commit before moving to the next.

## Critical Rules

1. **Read `AGENTS.md` FIRST** before any implementation — it contains 134 hard-won codebase learnings
2. **Read `CLAUDE.md`** for project conventions and patterns
3. **ONE story at a time** — never batch-implement multiple stories
4. **After EACH story**: run `npm run lint` to verify (do NOT run `npx tsc --noEmit` — it OOMs on Windows, see memory notes)
5. **After every 3-4 stories**: run `npm run build` to verify full build succeeds
6. **Commit after each passing story**: `git add <specific files> && git commit -m "audit(wave-X): <description>"`
7. **Never run `npm run dev`** unless explicitly asked — use `npm run build` for verification
8. **Never create documentation files** unless explicitly requested
9. **Do NOT modify files unrelated to the current story** — scope discipline is critical

## Build Verification Protocol

```bash
# After EACH story (fast check ~30s):
npm run lint

# After every 3-4 stories (full build ~2-3min):
npm run build

# If build fails:
# 1. DO NOT proceed to next story
# 2. Fix the issue immediately
# 3. Re-run build until green
# 4. Only then commit and continue
```

## Key Codebase Patterns to Follow

- **Auth**: Always use `getServerAuthContext(role)` in Server Components — never raw Supabase auth
- **`.single()` is FORBIDDEN for multi-team queries** — use `.limit(1).maybeSingle()` instead
- **Repository pattern**: No direct Supabase calls from components/actions — use `lib/services/repositories/`
- **PostgREST nested relations fail with RLS** — use separate queries + `Promise.all` instead
- **`sanitizeSearch()`** lives in `lib/utils/sanitize-search.ts` — import from there, don't redefine
- **Intervention statuses**: 9 values — `demande`, `rejetee`, `approuvee`, `planification`, `planifiee`, `cloturee_par_prestataire`, `cloturee_par_locataire`, `cloturee_par_gestionnaire`, `annulee`
- **Two role systems**: `users.role` = global type; `team_members.role` = team-specific authorization
- **`after()` from `next/server`** for deferred work (emails, notifications, logs)

## Stories — Execute in Order

### Wave A: Low-Risk Security Wins (5 stories)

#### US-A01: Cron Auth Bypass Fix
- **Files**: `app/api/cron/trial-expiration/route.ts`, `trial-notifications/route.ts`, `behavioral-triggers/route.ts`, `sync-emails/route.ts`, `cleanup-webhook-events/route.ts`
- **Change**: In each file, change `if (process.env.CRON_SECRET && authHeader !== ...)` to `if (!process.env.CRON_SECRET || authHeader !== ...)`
- **Reference**: `app/api/cron/intervention-reminders/route.ts` already has the correct pattern
- **Verify**: `npm run lint`

#### US-A02: Security Headers (Permissions-Policy + HSTS)
- **File**: `next.config.js` — headers section
- **Add** two headers to the existing headers array:
  ```js
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' }
  ```
- **DO NOT** add CSP-Report-Only header yet (that's C-CSP, later)
- **Verify**: `npm run build` (headers affect build config)

#### US-A03: Service Role Key Logging Fix
- **File**: `lib/services/core/supabase-client.ts:189-193`
- **Change**: Replace `keyPrefix`, `keySuffix`, `keyLength` logging with just `keyPresent: !!supabaseServiceRoleKey`
- **Verify**: `npm run lint`

#### US-A04: LotRepository.findOccupied() Wrong Role
- **File**: `lib/services/repositories/lot.repository.ts:555`
- **Change**: Replace `'tenant'` with `'locataire'` in the role filter
- **Verify**: `npm run lint`

#### US-A05: CSP Report-Only + Reporting Endpoint (staged)
- **File**: `next.config.js`
- **What**: Add `Content-Security-Policy-Report-Only` header with same directives as enforced CSP but WITHOUT `'unsafe-eval'`, plus `report-uri /api/csp-report`
- **CRITICAL**: Wrap in `...(process.env.NODE_ENV !== 'development' ? [{ ... }] : [])` — Next.js dev uses eval extensively
- **Also create**: `app/api/csp-report/route.ts` — simple POST handler that logs violations via `logger`
- **Verify**: `npm run build`

### Wave B: High-Impact Security (7 stories)

#### US-B01: Open Redirect in Impersonation
- **File**: `app/auth/impersonate/callback/route.ts:14`
- **Change**: Validate `next` param: `const safePath = (next.startsWith('/') && !next.startsWith('//')) ? next : '/gestionnaire/dashboard'`
- **Verify**: `npm run lint`

#### US-B02: XSS in Email Send Route
- **File**: `app/api/emails/send/route.ts`
- **Change**: HTML-escape the `body` field before `<br>` replacement. Use a simple escape function (replace `<>&"'` with entities)
- **Verify**: `npm run lint`

#### US-B03: Server Actions Auth Hardening
- **File**: `app/actions/dispatcher-actions.ts:52`
- **Change**: Add auth check using `getServerActionAuthContextOrNull()` — if null, return error
- **CAUTION**: Don't break internal orchestration calls from other server actions that call dispatcher. Only guard the exported action entry points.
- **Verify**: `npm run lint`

#### US-B04: Rate Limiter for Document Download
- **File**: `app/api/download-intervention-document/[id]/route.ts`
- **Change**: Add simple in-memory rate limiter (IP-based, 20 req/60s window)
- **IMPORTANT**: Add eviction when map.size > 1000 to prevent memory leak
- **Verify**: `npm run lint`

#### US-B05: PostgREST Filter Injection — Sanitize Search
- **Files**: `user.repository.ts`, `building.repository.ts`, `lot.repository.ts`, `property-document.repository.ts`, `user-admin-actions.ts`
- **Change**: Import `sanitizeSearch` from `@/lib/utils/sanitize-search` and use it to sanitize any `.ilike`/`.or` filter inputs
- **Reference**: `contact.repository.ts` already uses `sanitizeSearch` correctly
- **Verify**: `npm run lint`

#### US-B06: Error Message Leak in Reset Password
- **File**: `app/api/reset-password/route.ts`
- **Change**: Remove `debugInfo` from production responses. Remove user email list from logs.
- **Verify**: `npm run lint`

#### US-B07: Upload Route team_id Derivation
- **File**: `app/api/property-documents/upload/route.ts:69`
- **Change**: Derive `team_id` from authenticated user's profile context instead of trusting FormData
- **Verify**: `npm run lint`

### Wave C: Platform & Quality Gates (4 stories)

#### US-C01: Pin @vercel/analytics Version
- **File**: `package.json`
- **Change**: Replace `"latest"` with the actual resolved version (check `node_modules/@vercel/analytics/package.json` for current version)
- **Verify**: `npm run lint`

#### US-C02: Dependency Hygiene
- **File**: `package.json`
- **Move to devDependencies**: `@types/bcryptjs`, `@types/mailparser`, `@types/node-imap`, `@types/nodemailer`, `pino-pretty`, `dotenv`
- **Remove unused**: `@radix-ui/react-toast` (zero imports, sonner is used)
- **After changes**: Run `npm install` to update lockfile
- **Verify**: `npm run build`

#### US-C03: Remove No-Op Webpack Config
- **File**: `next.config.js`
- **Change**: Remove `webpack: (config) => { return config }` if it exists and does nothing
- **Verify**: `npm run build`

#### US-C04: Impersonation Cookie httpOnly
- **File**: `app/actions/impersonation-actions.ts`
- **Change**: Split impersonation cookie into httpOnly JWT (for auth) + non-httpOnly boolean flag (for banner UI detection)
- **CAUTION**: Read `components/impersonation-banner.tsx` first to understand how the cookie is currently consumed
- **Verify**: `npm run build`

### Wave D: Data/Workflow Correctness (6 stories)

#### US-D01: StatsRepository Nonexistent Columns
- **File**: `lib/services/repositories/stats.repository.ts:330`
- **Change**: Fix column references to use `intervention_assignments` table instead of nonexistent columns
- **Read the file first** — understand what columns are being queried vs what actually exists
- **Verify**: `npm run lint`

#### US-D02: Duplicate VALID_TRANSITIONS Alignment
- **Files**: `lib/services/domain/intervention-service.ts` vs `lib/services/repositories/intervention.repository.ts`
- **Change**: Make repository's transitions match the service's. The SERVICE is the source of truth.
- **CAUTION**: This is HIGH regression risk — run `npm test -- tests/unit/intervention-status-transitions.test.ts` after change
- **Verify**: `npm run lint` + unit test

#### US-D03: getDocuments() Missing deleted_at Filter
- **File**: `lib/services/repositories/intervention.repository.ts`
- **Change**: Add `.is('deleted_at', null)` to `getDocuments()` query
- **Verify**: `npm run lint`

#### US-D04: findByBuilding() Missing Building-Level Interventions
- **File**: `lib/services/repositories/intervention.repository.ts:435-474`
- **Change**: Add OR condition to also fetch interventions linked directly to building_id (not just via lot_id)
- **Verify**: `npm run lint`

#### US-D05: UserRepository Role Enum Fix
- **File**: `lib/services/repositories/user.repository.ts:45,175,245`
- **Change**: Fix hardcoded English role values to match DB enum (`'tenant'` → `'locataire'`, `'provider'` → `'prestataire'`, etc.)
- **Verify**: `npm run lint`

#### US-D06: Duplicate Validation Functions
- **Files**: `lib/services/core/error-handler.ts` vs `lib/services/core/service-types.ts`
- **Change**: Keep the canonical version in `error-handler.ts`, add re-export from `service-types.ts`: `export { validateRequired } from './error-handler'`
- **WHY re-export**: 14 repositories import from `service-types.ts` — changing all imports is high-risk
- **Verify**: `npm run lint`

### Wave E: Performance Optimization (6 stories)

#### US-E01: Import Service Parallelization
- **File**: `lib/services/domain/import.service.ts`
- **Change**: Replace sequential `for...of` loops with chunked `Promise.allSettled` (chunks of 10)
- **Pattern**: Create `chunkArray()` utility in `lib/utils/array-utils.ts` FIRST, then use it
- **IMPORTANT**: Keep inter-phase order (companies → contacts → buildings → lots → contracts). Only parallelize WITHIN each phase.
- **Verify**: `npm run build`

#### US-E02: Contract Creation Parallelization
- **File**: `components/contract/contract-form-container.tsx:636-827`
- **Change**: After contacts step completes, parallelize [docs + interventions + reminders] with `Promise.allSettled`
- **Verify**: `npm run build`

#### US-E03: Cron Loops Parallelization
- **Files**: `app/api/cron/trial-expiration/route.ts`, `trial-notifications/route.ts`, `behavioral-triggers/route.ts`
- **Change**: Replace sequential subscription processing with chunked `Promise.allSettled` (chunks of 5)
- **Import**: `chunkArray` from `@/lib/utils/array-utils` (created in E01)
- **Verify**: `npm run lint`

#### US-E04: Missing after() Deferral
- **Files**: `app/api/intervention/[id]/work-completion/route.ts`, `app/api/intervention-finalize/route.ts`, `app/api/intervention-schedule/route.ts`
- **Change**: Wrap in-app notifications and activity logs in `after()` from `next/server`
- **Reference**: Search for existing `after()` usage in the codebase for the correct pattern
- **Verify**: `npm run lint`

#### US-E05: Service Init Parallelization
- **Files**: `app/api/intervention-schedule/route.ts`, `app/api/intervention-finalize/route.ts`
- **Change**: Wrap 6 independent `create*Service()` / `create*Repository()` calls in `Promise.all`
- **Verify**: `npm run lint`

#### US-E06: Dead Cache Layer Cleanup
- **File**: `lib/cache/cached-queries.ts`
- **Check**: Are any of its exports imported anywhere? If not, delete the file and `lib/cache/index.ts`
- **Also check**: Remove any dead `revalidatePath`/`revalidateTag` calls on `force-dynamic` pages (they're no-ops)
- **Verify**: `npm run build`

### Wave F: Frontend Quality (6 stories — pick the safe ones)

#### US-F01: MIME Types Centralization
- **Create**: `lib/constants/mime-types.ts` with a single `ALLOWED_DOCUMENT_MIME_TYPES` constant
- **Update**: All 8 hooks that define their own MIME arrays: `use-chat-upload.ts`, `use-contract-upload.ts`, `use-intervention-upload.ts`, `use-multi-lot-document-upload.ts`, `use-property-document-upload.ts`, and check for others
- **Change**: Replace inline arrays with import from the constant
- **CRITICAL**: Do NOT leave orphaned array literals in the files (previous attempt left bare string literals causing parse errors)
- **Verify**: `npm run build`

#### US-F02: userScalable WCAG Fix
- **File**: `app/layout.tsx:49`
- **Change**: Remove `userScalable: false` or set to `true` — blocking pinch-to-zoom is a WCAG violation
- **Verify**: `npm run build`

#### US-F03: getPriorityColor Consolidation
- **Canonical**: `lib/intervention-utils.ts`
- **Find and replace**: 2 local copies elsewhere in the codebase with imports from the canonical version
- **Verify**: `npm run lint`

#### US-F04: Health Endpoint
- **Create**: `app/api/health/route.ts` — simple GET returning `{ status: 'ok', timestamp }` with `force-dynamic`
- **Verify**: `npm run build`

#### US-F05: Test/Debug Pages Guard
- **File**: `app/gestionnaire/(with-navbar)/test-property-preview/page.tsx` (and any similar)
- **Change**: Add `export const dynamic = 'force-dynamic'` + server-side `NODE_ENV` check using `notFound()` from `next/navigation`
- **DO NOT use `throw new Error()` in 'use client' components** — this corrupts the webpack module registry and breaks ALL static pages during build
- **Verify**: `npm run build`

#### US-F06: Duplicate Chat Tab Skeleton
- **Find**: 3 role-specific views with identical `dynamic()` + skeleton pattern for chat tab
- **Extract**: Shared component or utility
- **Verify**: `npm run lint`

## After All Stories Complete

```bash
# Final verification
npm run build
npm run lint
npm test

# If all pass:
git log --oneline -30  # Review all audit commits
```

## Pitfalls from Previous Attempt (MUST AVOID)

1. **`validateRequired` re-export**: When touching `service-types.ts`, 14 repos import `validateRequired` from it — add re-export, don't move imports
2. **`use-chat-upload.ts` syntax**: When replacing MIME arrays, ensure the old array body is COMPLETELY removed (lines between import and closing bracket)
3. **Debug page `throw new Error()` at module level**: NEVER use `throw` outside a function body in `'use client'` components — it corrupts the webpack module registry. Use `notFound()` in a Server Component wrapper instead.
4. **`chunkArray` must be created BEFORE using it**: Create `lib/utils/array-utils.ts` in E01 before E03 imports it
5. **`npm run build`** on Windows can take 2-3 minutes — be patient, don't interrupt
6. **CSP Report-Only in dev mode**: MUST be wrapped in `process.env.NODE_ENV !== 'development'` guard or Next.js HMR floods the console with 100+ violations per page
