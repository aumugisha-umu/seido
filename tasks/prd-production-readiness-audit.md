# PRD: Production Readiness — Audit Remediation

**Date**: 2026-03-12
**Source**: `docs/audit/production-readiness-audit-2026-03-12-FINAL.md`
**Methodology**: 6 domain audit agents + 2 deep perf agents + coordinator + 4 verification agents + external cross-verification
**Scope**: Security, performance, code quality, dependencies, architecture, GDPR

---

## Context

A comprehensive production readiness audit identified 29 verified critical issues and 62 important issues across security, performance, database, frontend, and dependencies. All findings were verified by specialized agents and cross-checked against an independent external analysis. 5 false positives were eliminated.

This PRD organizes remediation into 6 waves (A-F) ordered by risk minimization: low-risk security wins first, then high-impact security with compatibility strategy, platform gates, data correctness, performance optimization, and finally frontend quality.

---

## Wave A: Low-Risk Security Wins (Day 1)

### US-A01: Fix Cron Auth Bypass (5 routes)
**As a** platform admin, **I want** cron endpoints to reject unauthenticated requests when CRON_SECRET is unset **so that** service-role operations can't be triggered by anyone.

**Acceptance Criteria:**
- `app/api/cron/trial-expiration/route.ts` uses fail-closed pattern: `if (!process.env.CRON_SECRET || authHeader !== ...)`
- `app/api/cron/trial-notifications/route.ts` uses same pattern
- `app/api/cron/behavioral-triggers/route.ts` uses same pattern
- `app/api/cron/sync-emails/route.ts` uses same pattern
- `app/api/cron/cleanup-webhook-events/route.ts` uses same pattern
- All 5 routes match the existing correct pattern in `intervention-reminders/route.ts:42`
- Lint passes

**Size**: XS | **Priority**: 1 | **Regression Risk**: Low

---

### US-A02: Add Missing Security Headers (HSTS + Permissions-Policy)
**As a** security engineer, **I want** proper HTTP security headers **so that** the app is protected against protocol downgrade and browser API abuse.

**Acceptance Criteria:**
- `next.config.js` headers include `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `next.config.js` headers include `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- Both headers appear in `/:path*` section alongside existing headers
- Lint passes

**Size**: XS | **Priority**: 1 | **Regression Risk**: Low-Medium

---

### US-A03: Remove Service Role Key From Logs
**As a** security engineer, **I want** no portion of the service role key logged **so that** secrets can't be reconstructed from log aggregators.

**Acceptance Criteria:**
- `lib/services/core/supabase-client.ts:189-193` no longer logs `keyPrefix`, `keySuffix`, or `keyLength`
- Replaced with `keyPresent: !!supabaseServiceRoleKey` (boolean only)
- Lint passes

**Size**: XS | **Priority**: 1 | **Regression Risk**: None

---

### US-A04: Fix LotRepository.findOccupied() Wrong Role
**As a** gestionnaire, **I want** the occupied lots query to return correct results **so that** I can see which lots have tenants.

**Acceptance Criteria:**
- `lib/services/repositories/lot.repository.ts:555` uses `'locataire'` instead of `'tenant'`
- Adjacent `findVacant()` confirmed already correct (uses `'locataire'`)
- Occupied lot views display actual data (not empty)
- Lint passes

**Size**: XS | **Priority**: 1 | **Regression Risk**: Low

---

## Wave B: High-Impact Security with Compatibility (Days 2-3)

### US-B01: Fix Open Redirect in Impersonation Callback
**As a** security engineer, **I want** the impersonation callback to reject external redirect URLs **so that** admin sessions can't be redirected to attacker sites.

**Acceptance Criteria:**
- `app/auth/impersonate/callback/route.ts` validates `next` parameter: must start with `/` and not start with `//`
- Fallback to `/gestionnaire/dashboard` if invalid
- Impersonation flow still works for all role dashboards
- Lint passes

**Size**: XS | **Priority**: 2 | **Regression Risk**: Low

---

### US-B02: Fix XSS in Email Send Route + Add Validation
**As a** gestionnaire, **I want** email composition to be safe from HTML injection **so that** recipients can't receive malicious content.

**Acceptance Criteria:**
- `app/api/emails/send/route.ts` HTML-escapes `body` before `<br>` replacement (`&`, `<`, `>` entities)
- Zod schema validates `to` (email format), `subject` (string, max length), `body` (string), `cc` (optional email array)
- Invalid input returns 400 with generic error message
- Lint passes

**Size**: S | **Priority**: 2 | **Regression Risk**: Medium

---

### US-B03: Add Auth to Dispatcher Actions
**As a** security engineer, **I want** dispatcher-actions to verify caller authentication **so that** unauthenticated clients can't trigger notification dispatches.

**Acceptance Criteria:**
- `app/actions/dispatcher-actions.ts` uses `getServerActionAuthContextOrNull()` at top of `dispatchInterventionCreated`
- Returns early (no-op) if auth is null
- Existing internal callers (other server actions) continue to work (they already have valid sessions)
- Lint passes

**Size**: S | **Priority**: 2 | **Regression Risk**: Medium-High (test all notification dispatch flows)

---

### US-B04: Secure Document Download with Signed Tokens
**As a** security engineer, **I want** document download links to use signed tokens **so that** UUIDs alone can't grant access to sensitive documents.

**Acceptance Criteria:**
- Email notification links include HMAC-signed token (document_id + expiration + optional recipient)
- Download route validates HMAC signature before serving file
- Existing email links continue to work (backward-compatible migration period)
- Token expires after configured TTL (e.g., 24h)
- Rate limiting on download endpoint prevents enumeration
- Lint passes

**Size**: M | **Priority**: 2 | **Regression Risk**: HIGH (must preserve email link UX)

---

### US-B05: Standardize PostgREST Search Sanitization
**As a** security engineer, **I want** all search queries to sanitize user input **so that** PostgREST filter injection is prevented.

**Acceptance Criteria:**
- Shared utility created (e.g., `lib/utils/sanitize-search.ts`) based on `contact.repository.ts:299` pattern
- Applied in `user.repository.ts:242`, `building.repository.ts:321`, `lot.repository.ts:649`, `property-document.repository.ts:321`, `user-admin-actions.ts:498`
- Search still works with normal characters (letters, spaces, accents)
- Special characters (`,`, `(`, `)`, `.`) stripped safely
- Lint passes

**Size**: S | **Priority**: 2 | **Regression Risk**: Low

---

### US-B06: Remove Debug Info From Error Responses
**As a** security engineer, **I want** error responses to never contain internal details **so that** attackers can't learn about the infrastructure.

**Acceptance Criteria:**
- `app/api/reset-password/route.ts`: remove `debugInfo` from all error responses, remove `details: resetError?.message`, remove full user email list logging (line 97)
- `app/api/change-password/route.ts:68`: replace Supabase error message with generic error
- `app/api/change-email/route.ts:100`: replace Supabase error message with generic error
- Error responses use only generic messages: "An error occurred. Please try again."
- Lint passes

**Size**: S | **Priority**: 2 | **Regression Risk**: Low

---

### US-B07: Derive team_id Server-Side in Upload Route
**As a** security engineer, **I want** the upload route to derive team_id from the authenticated profile **so that** clients can't upload to arbitrary teams.

**Acceptance Criteria:**
- `app/api/property-documents/upload/route.ts` gets `team_id` from `authResult.data.userProfile` instead of FormData
- Storage path and DB insert use server-derived team_id
- Upload flow works end-to-end for gestionnaires
- Lint passes

**Size**: XS | **Priority**: 2 | **Regression Risk**: Low

---

## Wave C: Platform & Quality Gates (Sprint)

### US-C01: Set Up GitHub Actions CI Pipeline
**As a** developer, **I want** automated lint checking on every PR **so that** code quality issues are caught before deployment.

**Acceptance Criteria:**
- `.github/workflows/ci.yml` runs `npm run lint` on push/PR to `main` and `preview` branches
- Pipeline passes on current codebase (lint-only first)
- Pipeline status visible in GitHub PR checks
- Lint passes

**Size**: S | **Priority**: 3 | **Regression Risk**: Low

---

### US-C02: CSP Report-Only Mode
**As a** security engineer, **I want** CSP violations collected in report-only mode **so that** we can identify which scripts require unsafe directives before enforcing.

**Acceptance Criteria:**
- `next.config.js` adds `Content-Security-Policy-Report-Only` header alongside existing enforced CSP
- Report-only header has a stricter policy (no `unsafe-eval`, nonce-based `unsafe-inline` replacement)
- Violations reported to a logging endpoint or console
- Existing functionality not affected (report-only doesn't block)
- Lint passes

**Size**: M | **Priority**: 3 | **Regression Risk**: None (report-only)

---

### US-C03: Pin @vercel/analytics Version
**As a** developer, **I want** @vercel/analytics pinned to a specific semver range **so that** builds are reproducible.

**Acceptance Criteria:**
- `package.json` changes `"@vercel/analytics": "latest"` to `"@vercel/analytics": "^X.Y.Z"` (current resolved version)
- `npm install` produces identical lockfile
- Lint passes

**Size**: XS | **Priority**: 3 | **Regression Risk**: None

---

### US-C04: Split Impersonation Cookie for httpOnly
**As a** security engineer, **I want** the impersonation JWT to be httpOnly **so that** XSS can't read admin email from cookies.

**Acceptance Criteria:**
- Impersonation sets TWO cookies: (1) `impersonation-token` with `httpOnly: true` (JWT with admin email), (2) `is-impersonating` with `httpOnly: false, value: 'true'` (for banner detection)
- Client-side banner detection reads `is-impersonating` cookie
- Admin email no longer exposed to client JS
- Impersonation flow works end-to-end
- Lint passes

**Size**: S | **Priority**: 3 | **Regression Risk**: Medium

---

### US-C05: Dependency Hygiene Cleanup
**As a** developer, **I want** dependencies properly categorized and cleaned **so that** the production bundle is minimal and auditable.

**Acceptance Criteria:**
- Move to devDependencies: `@types/bcryptjs`, `@types/mailparser`, `@types/node-imap`, `@types/nodemailer`, `pino-pretty`, `dotenv`
- Remove unused: `@radix-ui/react-toast` (zero imports, sonner used exclusively)
- Remove no-op: `webpack: (config) => { return config }` from `next.config.js`
- Document missing env vars in `.env.example`: `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_JWT_SECRET`
- `npm install` succeeds, `npm run lint` passes

**Size**: S | **Priority**: 3 | **Regression Risk**: Low

---

## Wave D: Data/Workflow Correctness (Sprint)

### US-D01: Fix StatsRepository Nonexistent Columns
**As a** admin, **I want** user stats to query the correct table **so that** the admin dashboard shows accurate intervention counts per user.

**Acceptance Criteria:**
- `lib/services/repositories/stats.repository.ts:330` rewritten to use `intervention_assignments` junction table instead of `assigned_gestionnaire`/`assigned_prestataire`
- Query returns correct counts for gestionnaires and prestataires
- Lint passes

**Size**: S | **Priority**: 4 | **Regression Risk**: Medium

---

### US-D02: Harmonize VALID_TRANSITIONS (Service + Repository)
**As a** developer, **I want** a single source of truth for intervention status transitions **so that** deprecated statuses can't be used.

**Acceptance Criteria:**
- `intervention.repository.ts:893` VALID_TRANSITIONS aligned with `intervention-service.ts:150`
- Deprecated statuses `demande_de_devis` and `en_cours` removed from repository
- `contestee` status added to repository map
- All status transitions tested end-to-end for gestionnaire, prestataire, locataire roles
- `intervention-display.ts` references to deprecated statuses cleaned up
- Lint passes

**Size**: S | **Priority**: 4 | **Regression Risk**: HIGH (test all workflow transitions)

---

### US-D03: Fix getDocuments() Missing deleted_at Filter
**As a** gestionnaire, **I want** soft-deleted documents hidden from single-intervention views **so that** deleted docs don't appear in the UI.

**Acceptance Criteria:**
- `intervention.repository.ts:791` (getDocuments) adds `.is('deleted_at', null)`
- Matches existing filter in `getDocumentsByInterventionIds():828`
- Deleted documents no longer appear in intervention detail view
- Lint passes

**Size**: XS | **Priority**: 4 | **Regression Risk**: Low

---

### US-D04: Fix findByBuilding() to Include Building-Level Interventions
**As a** gestionnaire, **I want** building-level interventions (no lot) to appear in building views **so that** I see all interventions for a building.

**Acceptance Criteria:**
- `intervention.repository.ts:435-474` queries both `lot_id IN (lotIds)` AND `building_id = buildingId` (for interventions with lot_id IS NULL)
- Building-level interventions appear in building detail view
- Lint passes

**Size**: XS | **Priority**: 4 | **Regression Risk**: Low

---

### US-D05: Fix UserRepository Role Enum Values
**As a** developer, **I want** the UserRepository validation to use correct French role names **so that** if hooks are wired up later, they don't reject valid data.

**Acceptance Criteria:**
- `user.repository.ts:45,175,245` validation uses `['admin', 'gestionnaire', 'prestataire', 'locataire', 'proprietaire']`
- Matches DB enum and service-types.ts User type
- Note: hooks are currently dead code (beforeCreate/beforeUpdate not called), but this prevents a future trap
- Lint passes

**Size**: XS | **Priority**: 4 | **Regression Risk**: Low

---

### US-D06: Consolidate Duplicate Validation Functions
**As a** developer, **I want** a single set of validation utilities **so that** error types and UUID version handling are consistent.

**Acceptance Criteria:**
- Single source of truth for `validateRequired`, `validateEmail`, `validateUUID` (keep `error-handler.ts` versions with `ValidationException`)
- Remove duplicates from `service-types.ts`
- All import sites updated
- UUID validation accepts v1-v5 (wider, safer)
- Lint passes

**Size**: S | **Priority**: 4 | **Regression Risk**: Medium

---

## Wave E: Performance Optimization (Sprint)

### US-E01: Parallelize Import Service Entity Loops
**As a** gestionnaire, **I want** CSV imports to process entities in parallel chunks **so that** large imports complete in seconds instead of minutes.

**Acceptance Criteria:**
- `import.service.ts` entity loops (buildings, lots, companies, contacts, contracts) use `Promise.allSettled` with chunks of 10
- Inter-phase order preserved: companies -> contacts -> buildings -> lots -> contracts
- Partial failures logged per entity without stopping the batch
- Import 350 entities completes in <10 seconds (vs ~40 seconds before)
- Error handling per row preserved (currently try/catch with continue)
- Lint passes

**Size**: M | **Priority**: 5 | **Regression Risk**: Medium-High

---

### US-E02: Parallelize Contract Creation Post-Steps
**As a** gestionnaire, **I want** contract creation to complete faster **so that** the form submission feels responsive.

**Acceptance Criteria:**
- After contacts step completes, [documents + interventions + reminders] run in `Promise.all`
- Contacts step still runs first (required by others)
- Interventions remain using `Promise.allSettled` (already parallel internally)
- Notification remains fire-and-forget
- Contract creation time reduced by ~50%
- Lint passes

**Size**: S | **Priority**: 5 | **Regression Risk**: Medium

---

### US-E03: Parallelize 3 Cron Sequential Loops
**As a** platform admin, **I want** cron jobs to process subscriptions in parallel **so that** they complete within Vercel's execution time limits.

**Acceptance Criteria:**
- `trial-expiration/route.ts`: subscriptions processed via `Promise.allSettled` (chunks of 5 for email rate limit safety)
- `trial-notifications/route.ts`: 3 windows processed in `Promise.all`, subscriptions within each window via `Promise.allSettled`
- `behavioral-triggers/route.ts`: subscriptions via `Promise.allSettled`, inner steps 1+2 via `Promise.all`
- Each cron logs total processed count and any failures
- Lint passes

**Size**: S | **Priority**: 5 | **Regression Risk**: Medium (email rate limits)

---

### US-E04: Add after() to 3 Routes for Notification Deferral
**As a** user, **I want** API responses to return faster **so that** status changes feel instant.

**Acceptance Criteria:**
- `work-completion/route.ts:182`: wrap `notifyInterventionStatusChange()` in `after()`
- `intervention-finalize/route.ts:217-268`: wrap in-app notification creates + activity log in `after()`
- `intervention-schedule/route.ts:330-381`: wrap in-app notification creates in `after()`
- Response time improved by ~100-200ms per route
- Notifications still delivered (deferred, not dropped)
- Lint passes

**Size**: S | **Priority**: 5 | **Regression Risk**: Low

---

### US-E05: Parallelize Service Init in 2 Routes
**As a** developer, **I want** service factories initialized in parallel **so that** API route cold starts are faster.

**Acceptance Criteria:**
- `intervention-schedule/route.ts:23-41`: 6 `await createServer*()` calls wrapped in `Promise.all`
- `intervention-finalize/route.ts:22-40`: same treatment
- Init time reduced from ~180ms to ~35ms
- Lint passes

**Size**: XS | **Priority**: 5 | **Regression Risk**: Low

---

### US-E06: Activate or Remove Dead Cache Layer
**As a** developer, **I want** the cache infrastructure either working or deleted **so that** there's no confusing dead code.

**Acceptance Criteria:**
- Decision: activate cached queries in key pages OR delete `lib/cache/cached-queries.ts` entirely
- If activated: import `getCachedInterventionTypes` in intervention creation pages, `getCachedTeamMembers` in team-scoped pages
- If deleted: remove `lib/cache/cached-queries.ts`, `lib/cache/index.ts`, and all dead `revalidateTag` calls in server actions
- Clean up dead `revalidatePath` calls targeting force-dynamic pages
- Lint passes

**Size**: S | **Priority**: 5 | **Regression Risk**: Low

---

## Wave F: Frontend Quality (Backlog)

### US-F01: Extract Shared ALLOWED_MIME_TYPES
**As a** developer, **I want** a single source of truth for allowed file types **so that** upload validation is consistent.

**Acceptance Criteria:**
- `lib/constants/mime-types.ts` created with base types + per-context variants (e.g., `AUDIO_TYPES` for interventions)
- All 8 definition sites updated to import from shared constant
- Upload behavior unchanged
- Lint passes

**Size**: S | **Priority**: 6 | **Regression Risk**: Low

---

### US-F02: Add loading.tsx to 16 Bare Route Segments
**As a** user, **I want** a loading indicator during navigation **so that** I don't see a blank white screen.

**Acceptance Criteria:**
- `loading.tsx` added to 16 identified gestionnaire sub-routes lacking them
- Loading state shows skeleton or spinner consistent with existing loading.tsx files
- Lint passes

**Size**: S | **Priority**: 6 | **Regression Risk**: Low

---

### US-F03: Set Up Sentry Error Tracking
**As a** developer, **I want** production errors reported to Sentry **so that** unhandled exceptions are visible and actionable.

**Acceptance Criteria:**
- `@sentry/nextjs` installed and initialized (client + server + edge configs)
- Error boundaries send errors to Sentry
- Source maps uploaded during build (not exposed publicly)
- Environment tagging (production vs preview)
- Lint passes

**Size**: M | **Priority**: 6 | **Regression Risk**: Low

---

### US-F04: Add /api/health Endpoint
**As a** platform admin, **I want** a health check endpoint **so that** uptime monitoring and load balancers can verify the app is running.

**Acceptance Criteria:**
- `app/api/health/route.ts` returns `{ status: 'ok', timestamp: ISO }` with 200
- Optionally checks DB connectivity (Supabase ping)
- No authentication required
- Response time < 200ms
- Lint passes

**Size**: XS | **Priority**: 6 | **Regression Risk**: None

---

### US-F05: Remove Test/Debug Pages from Production
**As a** security engineer, **I want** test pages inaccessible in production **so that** mock data and debug tools aren't exposed.

**Acceptance Criteria:**
- `app/gestionnaire/test-property-preview/page.tsx` deleted or guarded with `process.env.NODE_ENV !== 'production'`
- Any debug routes under `app/gestionnaire/(with-navbar)/debug/` deleted or guarded
- Lint passes

**Size**: XS | **Priority**: 6 | **Regression Risk**: None

---

### US-F06: Fix userScalable Accessibility
**As a** user with visual impairments, **I want** to pinch-to-zoom on mobile **so that** I can read content comfortably.

**Acceptance Criteria:**
- `app/layout.tsx:49` changed from `userScalable: false` to `userScalable: true`
- `maximumScale: 1` removed or set to `5`
- Mobile forms still usable (no accidental zoom on input focus — test manually)
- Lint passes

**Size**: XS | **Priority**: 6 | **Regression Risk**: Low

---

### US-F07: Extract Chat Tab Skeleton to Shared Module
**As a** developer, **I want** the chat tab dynamic import + skeleton in one place **so that** changes propagate to all 3 role views.

**Acceptance Criteria:**
- Shared `components/interventions/shared/lazy-chat-tab.tsx` created with `dynamic()` + skeleton
- `gestionnaire`, `locataire`, `prestataire` intervention detail clients import from shared module
- Chat tab still lazy-loads correctly for all roles
- Lint passes

**Size**: XS | **Priority**: 6 | **Regression Risk**: Low

---

## GDPR/Compliance (Future — Requires Product Decision)

### US-G01: Data Export (Right of Portability)
**As a** user, **I want** to export all my data **so that** I comply with GDPR Article 20.

### US-G02: Permanent Data Erasure (Right to Erasure)
**As a** user, **I want** my data permanently deleted on request **so that** I comply with GDPR Article 17.

### US-G03: Consent Tracking
**As a** platform admin, **I want** data processing consent tracked per user **so that** we can prove lawful basis.

### US-G04: MFA for Sensitive Roles
**As a** gestionnaire/admin, **I want** to enable MFA **so that** my account is protected against credential theft.

*Note: GDPR stories require product decisions on scope, UX, and legal requirements before decomposition.*

---

## Summary

| Wave | Stories | Total Size | Estimated Effort |
|------|---------|-----------|-----------------|
| A: Low-Risk Security | 4 | 3 XS + 1 XS = all XS | Day 1 |
| B: High-Impact Security | 7 | 3 XS + 3 S + 1 M | Days 2-3 |
| C: Platform & Quality | 5 | 2 XS + 2 S + 1 M | Sprint |
| D: Data Correctness | 6 | 3 XS + 3 S | Sprint |
| E: Performance | 6 | 1 XS + 4 S + 1 M | Sprint |
| F: Frontend Quality | 7 | 4 XS + 2 S + 1 M | Backlog |
| G: GDPR (future) | 4 | TBD | TBD |
| **Total** | **39** | | |
