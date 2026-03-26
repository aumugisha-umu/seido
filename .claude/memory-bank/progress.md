# SEIDO Progress Log

## Milestones Completes

### Phase 1: Core Architecture ✅
- Users, Teams, Companies, Invitations
- Repository Pattern implementation
- 19 repositories crees

### Phase 2: Property Management ✅
- Buildings, Lots, Property Documents
- RLS policies multi-tenant

### Phase 3: Interventions ✅
- Workflow 9 statuts
- Chat/Conversation system
- Notifications infrastructure
- Email system (IMAP/SMTP)

### Phase 4: Contracts ✅
- Contract management
- Document handling
- Import jobs

### Phase 5: UX Improvements ✅ (Complete)
- [x] Google OAuth integration
- [x] Onboarding modal (5 slides)
- [x] Avatar system
- [x] Email quote stripping
- [x] Gmail OAuth integration
- [x] Email conversation threading
- [x] Memory Bank implementation
- [x] **Optimisation ecosysteme .claude/** (2026-01-23)
- [x] **PWA Push Notifications** (2026-01-25)
- [x] Chat message bubble enhancements (2026-01-25)
- [x] **Participant confirmation flow** (2026-01-25)
- [x] **Intervention types dynamiques** (2026-01-25)
- [x] **Migration workflow devis** (2026-01-26) - Suppression demande_de_devis
- [x] **Fix affichage reponses en attente** (2026-01-26)
- [x] **Pagination vue liste interventions** (2026-01-26)
- [x] **Verification architecture cards unifiee** (2026-01-27)
- [x] **Centralisation Adresses + Google Maps prep** (2026-01-28)
- [x] **Fix Conversation Threads Multi-Profil** (2026-01-29)
- [x] **Performance Optimization + UX Tabs** (2026-01-30)
- [x] **Accessibility WCAG AA ApprovalModal** (2026-01-30)
- [x] **Card Refactoring: PendingActionsCard → InterventionCard** (2026-01-30)
- [x] **Fix Finalization Modal z-index** (2026-01-30) - Modale invisible corrigée
- [x] **Auth Refactoring Complet** (2026-01-31) - Centralisation auth, suppression appels redondants
- [x] **SWR Server Component Fix** (2026-01-31) - Séparation client/serveur pour hooks SWR
- [x] **Tenant Dashboard UX** (2026-01-31) - Affichage étage/porte/description avec alignement corrigé
- [x] **Extension Types Locataire** (2026-01-31) - Dropdown locataire: 20 → 27 types (ajout catégorie "Locataire")
- [x] **Fix Confirmation Gestionnaire** (2026-01-31) - Header "Intervention créée" affiché après création, pas avant
- [x] **Auth API Optimization** (2026-01-31) - Réduction de 250+ appels à 1 par navigation
- [x] **Filtrage auth_id Conversations/Notifications** (2026-02-01) - Seuls les contacts invités (avec compte) reçoivent conversations et notifications
- [x] **PWA Notification Prompt Modal** (2026-02-02) - Modale rappel notifications à chaque ouverture PWA
- [x] **Web/PWA Notification Unification** (2026-02-02) - PushNotificationToggle unifié pour web et PWA
- [x] **Quote Notifications Multi-Canal** (2026-02-02) - 4 nouvelles actions: quote request/submit/approve/reject
- [x] **Push Subscription Security Fix** (2026-02-02) - userProfile.id + null data check pour RLS silent blocks
- [x] **Voice Recorder + Documents + Reports Card** (2026-02-12) - Upload audio, signed URLs, composant reports partagé
- [x] **Intervention Workflow Polish** (2026-02-16) - 7 themes, 40 files: demande_de_devis→requires_quote, approved→accepted, finalization API, quote form simplification, details card enrichi, dashboard simplification, quote modals
- [x] **Property Documents + Interventions Step** (2026-02-17) - 5-step wizard for buildings/lots with document upload + intervention scheduling
- [x] **Building Interventions Tab Fix** (2026-02-18) - XOR query pattern with `.or()` for building+lot interventions
- [x] **Code Review Fixes (3C+7H+2Q)** (2026-02-18) - TDZ, multi-lot [0], Zod drift, role validation, type completeness
- [x] **SEO Landing Page Optimization** (2026-02-19) - Score 52→78/100, 13 stories, JSON-LD schemas, FAQ structured data
- [x] **Blog Section Complete** (2026-02-19) - 6 stories: lib/blog.ts, /blog index with filters, /blog/[slug] article pages, landing preview, navbar link, sitemap SEO
- [x] **Blog Articles Published** (2026-02-19) - 2 articles on Belgian property management (Jan+Feb 2026 Le Cri), fully sourced with 45+ references
- [x] **Lot Wizard Server Component Refactoring** (2026-02-20) - Extracted 2914-line page.tsx into lot-creation-form.tsx (client) + page.tsx (server)
- [x] **Independent Lots Address Display Fix** (2026-02-20) - Batch address fetch in lot.repository.ts after JOIN removal optimization
- [x] **Unified Documents Bucket** (2026-02-20) - Consolidated 3 storage buckets (property/intervention/contract) into 1 `documents` bucket
- [x] **E2E Testing Infrastructure V2** (2026-02-20/21) - 25 E2E tests across 4 test files, 5 POMs, API-based auth, Puppeteer + Vitest
- [x] **Contract Wizard E2E** (2026-02-21) - Full 5-step wizard test with doc upload, service role storage fix, 11 data-testid attrs added
- [x] **Cancel Modal Wiring** (2026-02-21) - Wired pre-built cancellation hook+modal into gestionnaire detail page, un-skipped E2E cancel test
- [x] **Guide Utilisateur In-App** (2026-02-25) - /gestionnaire/aide: 9 sections, 20 FAQ, search
- [x] **RLS team_members Fix** (2026-02-25) - get_accessible_*_ids() use team_members, not stale users.team_id
- [x] **Email Attachment Enhancements** (2026-02-25) - Preview modal, download, blacklist API, storage RLS
- [x] **Auth Migration Complete** (2026-02-26) - ALL requireRole→getServerAuthContext across admin+proprietaire+actions
- [x] **Storage Bucket + RLS Auth Fix** (2026-02-26) - 404 bucket fix, auth.uid()→get_my_profile_ids() in storage policies
- [x] **Unify Document Preview & Download** (2026-02-26) - useDocumentActions shared hook, modal preview for all roles, 3 AGENTS.md learnings

### Phase 6: Stripe Subscription Integration ✅ (Complete 2026-02-22)
- [x] **Stripe Subscription System** (2026-02-21/22) - 48 stories + 13 debugging fixes + 6 audit fixes
- [x] **Lot Access Restriction** (2026-02-22) - Trial overage banner, locked lot cards, server-side gates
- [x] **Billing Audit Fixes** (2026-02-22) - mapStripeStatus consolidation, fail-closed patterns, error boundaries

## Sprint Actuel (Mar 2026)

### 2026-03-25 - Centralize Email Config + Compound

**Session: Eliminate hardcoded domains across email templates**

**Ce qui a ete fait:**
- Added `contactEmail` to `EMAIL_CONFIG` in `lib/email/resend-client.ts`
- Replaced `noreply` → `notifications` in 2 fallback addresses (email-reply.service.ts)
- Replaced hardcoded `support@seido-app.com` with `EMAIL_CONFIG.supportEmail` in 6 templates
- Replaced hardcoded URLs + contact in email footer with `EMAIL_CONFIG.appUrl`/`EMAIL_CONFIG.contactEmail`
- Compound: Learning #169 added, retrospective created

**Fichiers cles modifies:**
- `lib/email/resend-client.ts` — contactEmail added
- `lib/services/domain/email-reply.service.ts` — noreply → notifications
- `emails/components/email-footer.tsx` — dynamic URLs from EMAIL_CONFIG
- 6 email templates — supportEmail from EMAIL_CONFIG

---

### 2026-03-25 - Reminder Recurrence UX + Intervention Planner + CHECK Constraint Fix

**Session: Intervention/reminder reclassification, shared planner component, critical bug fix**

**Ce qui a ete fait:**
- Intervention/reminder itemType reclassification across property-interventions and supplier-interventions templates
- Shared InterventionPlannerStep component with sections, visual differentiation (Wrench/Bell icons)
- InterventionScheduleRow enhanced with recurrence config and item type toggle
- Dual dispatch in lease wizard: interventions to `createInterventionAction`, reminders to `createWizardRemindersAction`
- Supplier wizard: template reminders via server action, custom/toggled items via separate dispatch
- **Critical fix**: `reminders_single_entity` CHECK constraint violation — XOR priority cascade (contract > lot > building > contact)
- **Secondary fix**: Document interventions missing `itemType`/`recurrenceRule` spread from templates
- Property creation wizards (building + lot) updated with intervention planner integration
- New `lib/utils/rrule.ts` utility for recurrence rule parsing
- Landing header improvements

**Fichiers cles modifies:**
- `app/actions/reminder-actions.ts` — XOR enforcement
- `components/contract/contract-form-container.tsx` — dual dispatch + document intervention fix
- `components/contract/intervention-planner-step.tsx` — shared component
- `components/contract/intervention-schedule-row.tsx` — enhanced row with visual differentiation
- `components/contract/lease-interventions-step.tsx` — lease-specific planner integration
- `components/property-interventions-step.tsx` — property creation planner
- `lib/constants/property-interventions.ts` + `supplier-interventions.ts` — template updates

**Decisions techniques:**
- Enforce DB CHECK constraints at action layer (not caller) — callers can safely pass multiple entity links
- Priority cascade pattern: contract > lot > building > contact for single-entity XOR
- Shared InterventionPlannerStep accepts sections array — flexible for both lease and supplier modes

**Learnings:** AGENTS.md #184-186

---

### 2026-03-22 - Bank Module Phase 1 + Full-Stack Audit + Gestionnaire Verification

**Session: 3 major work streams — 28 stories total, 10 new AGENTS.md learnings**

| Change | Description |
|--------|-------------|
| **Bank Module Phase 1** | 17 stories: Tink Open Banking OAuth, transaction sync (4h cron), rent call generation, 5-component reconciliation scoring, quittance PDF, dashboard widgets |
| **Full-Stack Security Audit** | 128 checks across 6 domains. Sprint 1: 6 critical fixes (mass assignment Zod .strict(), getSession→getUser, CSP/CORS, Stripe fail-closed) |
| **Gestionnaire Verification** | 93 files reviewed by 8 parallel agents. 5 bugs fixed: BaseRepository.softDelete(), pre-capture team_id, proprietaire role, type safety, avatar accept |

**New infrastructure:**
- 7 DB tables, 4 repositories, 4 services, 13 API endpoints, 4 crons, 10 components
- 113 bank unit tests + 17 pre-existing test fixes (652 total passing)
- BaseRepository.softDelete() available for all repositories

**Key decisions:**
- Soft delete in BaseRepository (centralized) vs per-repo (fragmented) → centralized
- Fail-closed for unknown Stripe statuses (past_due, not active)
- Tink token refresh with 2-min buffer (not 5-min, tokens are 30-min not 1h)
- Pure function exports from services for zero-mock testing

**Learnings:** AGENTS.md #169-178
**Retrospective:** `docs/learnings/2026-03-22-audit-verification-bank-retrospective.md`

---

### 2026-03-21 - QA Bot E2E Test Suite + Admin Invite + Email Enhancements

**Session: Full Playwright QA bot suite, admin invite action, email system enhancements (70 files, +13,088/-444 lines)**

| Change | Description |
|--------|-------------|
| **Playwright QA bot** | 114 tests across 8 shards, 8 page objects (POM pattern), targeting Vercel preview |
| **Page Objects** | Dashboard, Interventions, Contacts, Properties, Contracts, Notifications, Settings, Operations |
| **cancelIntervention fix** | Union type `string \| CancellationData` — callers passed object but method expected string |
| **Admin invite action** | `inviteGestionnaireAction()` — createUser + magiclink + email via after() |
| **Email enhancements** | Admin invitation template, resend action, UI dialog |
| **Auth role fix** | E2E user had `admin` role causing gestionnaire page redirects — strict role matching |

**Key discoveries:**
- `requireRole('gestionnaire')` does strict equality, not role hierarchy — admin != gestionnaire
- Vercel preview cold starts (3-5s) need `test.slow()` + generous timeouts
- Radix tab panels stay in DOM when inactive — must scope to `[data-state="active"]`
- Intervention auto-advancement: may skip "demande" → "planification" after creation

**Learnings:** AGENTS.md #164-168
**Retrospective:** `docs/learnings/2026-03-21-qa-bot-suite-retrospective.md`

---

### 2026-03-20 - Operations Section + Reminders/Recurrence + AI Agent Design

**Session 1: Operations Section — Major Feature (118 files, +7102/-1293 lines)**

| Change | Description |
|--------|-------------|
| **Operations section** | New `/gestionnaire/operations/` route group replacing `/gestionnaire/interventions/` |
| **Reminders system** | Full CRUD: create, edit, detail, list, stats — with entity linking (building/lot/contact/contract) |
| **Recurrence engine** | RFC 5545 RRULE system: rules, occurrences, cron scanner (daily 06:00 UTC) |
| **Reminder cards** | `reminder-card.tsx`, `reminders-list-view.tsx`, `reminders-navigator.tsx`, stats widget |
| **Recurrence config** | `recurrence-config.tsx` — visual RRULE builder (daily/weekly/monthly/yearly) |
| **View mode** | Tab-based navigation: Interventions / Rappels with segment control |
| **DB migration** | `20260319200000_operations_reminders_recurrence.sql` — 3 new tables, RLS, indexes |
| **RLS policy fix** | `20260319300000_fix_users_update_policy_recursion.sql` — infinite recursion fix |
| **Route restructuring** | Interventions moved under `operations/interventions/` |
| **Deleted files** | Removed separate assignment mode, multi-provider button, provider instructions input |
| **Intervention service cleanup** | Extracted scheduling logic, removed ~200 lines of dead code |
| **Sidebar/topbar** | Updated navigation to point to operations section |
| **Dashboard integration** | Operations stats in async dashboard content |

**New files:** `app/actions/reminder-actions.ts`, `app/api/cron/recurrence-scan/route.ts`, `lib/services/domain/reminder.service.ts`, `lib/services/repositories/reminder.repository.ts`, `lib/services/repositories/recurrence.repository.ts`, `lib/types/reminder.types.ts`, `hooks/use-reminders.ts`, `lib/utils/reminder-helpers.ts`, 8 components in `components/operations/`, 1 component in `components/recurrence/`, 5 pages in `app/gestionnaire/(no-navbar)/operations/`

**New tables:** `reminders`, `recurrence_rules`, `recurrence_occurrences`

**Session 2: AI Intervention Agent Design Document**

Comprehensive design for an AI agent that:
- Analyzes all intervention-related data (property, contracts, contacts, history, documents, emails)
- Proposes structured action plans to gestionnaires
- Executes approved actions with hybrid autonomy (safe=auto, sensitive=confirmation)
- Extracts document metadata at upload (inline validation)

Design saved: `docs/AI/ai-intervention-agent-design.md`
Phase 1: Manual (8 stories) / Phase 2: Auto on demande (4 stories) / Phase 2.5: Learning + Embeddings (3 stories)

---

### 2026-03-19 - Email Section Cleanup + Visibility Plumbing

**Session: Exhaustive email code review (3 parallel agents) + visibility feature wiring**

| Change | Description |
|--------|-------------|
| **Compose modal fix** | Select dropdown z-index conflict in UnifiedModal (z-[10000] fix) |
| **console->logger** | ~22 console.error/warn replaced across 7 API routes + 5 components |
| **any->unknown** | ~20 any types eliminated |
| **Type consolidation** | 3 local EmailConnection interfaces -> TeamEmailConnection import |
| **getTeamManagerContext()** | Extracted shared API route auth helper in lib/services/helpers/ |
| **N+1 fix** | connections/route.ts 2N queries -> 2 batch queries |
| **EMAIL_LIST_COLUMNS** | email.repository.ts excludes body_html from list queries |
| **Sequential->parallel** | connections/[id]/route.ts deletes via Promise.all |
| **Parameter sprawl** | createSharesForThread 6 params -> options object |
| **Visibility plumbing** | added_by_user_id + visibility wired through OAuth + IMAP flows |
| **Access control** | EmailVisibilityService.getAccessibleConnectionIds() on listing + counts |

**30 files changed**, +1098 -671 lines
**Learnings:** AGENTS.md #159-163
**Retrospective:** docs/learnings/2026-03-19-email-cleanup-visibility-plumbing-retrospective.md

### 2026-03-18 - Contact Role Rename "Autre" → "Propriétaire"

**Ce qui a été fait:**
- Renamed "Autre" contact category to "Propriétaire" across entire app (labels, icons, colors)
- Changed color scheme from gray to amber (matching garant/proprietaire pattern)
- Fixed critical bug: proprietaire contacts invisible in selector modal (key mismatch `other` vs `owner`)
- Fixed "Non défini" display in contacts list (missing `proprietaire`/`garant` in lookup tables)
- Hidden invite button for proprietaire/garant contacts (no app interface)
- Changed lot creation default to "Laisser le lot indépendant"

**Fichiers clés modifiés:**
- `components/contact-selector.tsx` — tab key `other`→`owner`, role switch, icon
- `config/table-configs/contacts.config.tsx` — added proprietaire/garant to label+badge maps
- `components/ui/contact-section.tsx` — others config: labels, icon, amber colors
- `components/ui/lot-contact-card-v4.tsx` — section header, tooltip, badge, items, button
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx` — boundary mapping owner↔other
- `app/gestionnaire/(no-navbar)/contacts/details/[id]/contact-details-client.tsx` — hide invite for proprietaire/garant

**Learnings:** #157 (contact type key mismatch), #158 (missing role entries in lookups)

### 2026-03-16 - Admin Notification Emails (5 stories via Ralph)

**Session: Platform owner email notifications for 4 user lifecycle events**

| Story | Title | Impact |
|-------|-------|--------|
| US-001 | Admin notification service core + MRR helper + HTML builder | 3 new files, 4 methods, colored badges, MRR calculation |
| US-002 | Integrate signup flows (OAuth + Email) | OAuth fire-and-forget + API route bridge for email signup |
| US-003 | Integrate Stripe webhooks (created/updated/deleted) | 3 event types with MRR delta, old-vs-new lot comparison |
| US-004 | Integrate trial expiration cron | Admin notification after each trial→free_tier/read_only transition |
| US-005 | Env var + simplify review | 8 fixes: Resend singleton, floating promises, constant dedup, type narrowing |

**New files:** `lib/services/domain/admin-notification/` (3 files), `app/api/internal/admin-signup-notification/route.ts`
**Modified files:** `complete-profile/actions.ts`, `set-password/page.tsx`, `stripe-webhook.handler.ts`, `trial-expiration/route.ts`, `lib/stripe.ts`, `.env.example`
**Learnings:** AGENTS.md #145-148 (Resend singleton, floating promises, Client→Server bridge, MRR on-the-fly)
**Retrospective:** `docs/learnings/2026-03-16-admin-notification-emails-retrospective.md`

---

### 2026-03-15 - Data Invalidation Broadcast + UX Improvements

**Session: Cross-team real-time cache sync via Supabase Broadcast + onboarding UX**

| Change | Description |
|--------|-------------|
| **Data invalidation system** | `lib/data-invalidation.ts` (types) + team broadcast channel in `realtime-context.tsx` |
| **5 hooks wired** | use-buildings, use-manager-stats, use-team-contacts, use-contacts-data, use-interventions auto-refetch on invalidation |
| **12+ mutation sites** | Building/lot/contact/intervention/contract creation + status changes broadcast invalidation |
| **Batch debounce** | Single 500ms timer collects entities in Set, dispatches once per handler (fixed N+1 bug) |
| **Onboarding auto-expand** | Checklist auto-expands on dashboard until user has 1 lot + 1 contact |
| **Sticky tabs** | Contacts/Documents tabs float on scroll in building + lot creation wizards |

**Fichiers cles modifies:** lib/data-invalidation.ts, contexts/realtime-context.tsx, 5 hooks, 10+ form/detail components
**AGENTS.md learnings:** #142-144 (batch debounce, broadcast vs postgres_changes, channel scoping)
**Retrospective:** `docs/learnings/2026-03-15-data-invalidation-broadcast-retrospective.md`

---

### 2026-03-14 - Claude Code Ecosystem Optimization

**Session: Full .claude/ restructuring for consistency, reliability, and replicability**

| Change | Description |
|--------|-------------|
| **CLAUDE.md restructured** | 487→164 lines: INTERDICTIONS at top, skill routing with validation, commit workflow, parallel execution protocol |
| **23 skills enriched** | Code Craftsmanship Standards hooks added to all implementation/review/design skills |
| **8 agents enriched** | SEIDO-specific learnings, AGENTS.md references, anti-patterns added |
| **4 new skills** | sp-release (deployment), sp-monitoring (error budgets), sp-a11y (WCAG), sp-analytics (KPIs) |
| **Safety hooks** | block-dangerous-commands.js, block-secret-writes.js (PreToolUse deterministic) |
| **Quality gate enhanced** | Step 2.5 Simplify Quick-Scan + Step 4.5 Knowledge Capture |
| **Parallel execution** | sp-dispatching-parallel-agents rewritten with full worktree lifecycle |
| **Content extracted** | seido-reference.md, feature-reference.md (conditional rules), sp-orchestration (skill) |
| **Global blueprint** | `.claude/claude-code-global-blueprint.md` — full template for replication to other projects |

**Fichiers cles modifies:** CLAUDE.md, 23 skills, 8 agents, 2 rules, 2 scripts, settings.local.json
**No AGENTS.md learnings** — meta/process work, not codebase patterns

---

### 2026-03-14 - Import Review + Simplify + Deferred Geocoding (3 stories)

**Session: Import wizard bug fixes, code simplification, geocoding optimization**

| Story | Title | Impact |
|-------|-------|--------|
| US-001 | Bug fixes (7 bugs) | Auth wrapper, SSE errors, AbortController, setMonth overflow, phase index |
| US-002 | Simplify | Shared validators/utils.ts, ~150 lines dead code removed, N+1 batched |
| US-003 | Deferred geocoding | Phase 0 removed, after() post-response, rate-limited batch (40/sec) |

**Fichiers cles modifies:** import.service.ts, address.service.ts, execute-stream/route.ts, 5 validators, import-step-progress.tsx
**Learnings:** JS setMonth overflow, after() for non-blocking geocoding

---

### 2026-03-11 - Supplier Contracts + Blog Hub/Cluster + Intervention Planner

**Session: Multi-feature work — new entity, content architecture, bug fixes**

| Change | Description |
|--------|-------------|
| **Supplier Contracts** | New `supplier_contracts` + `supplier_contract_documents` tables, repository, service, card UI, wizard steps |
| **Blog Hub/Cluster** | 23 articles (Jan/Feb/Mar 2026), hub-cluster architecture with sibling navigation |
| **PostgREST FK Fix** | `!fk_users_company` hint on 4 repository queries to resolve PGRST201 ambiguous FK |
| **Card Display Fix** | Supplier cards show person name + purple company badge (matching contact-card-compact pattern) |
| **Intervention Planner** | Refactoring in progress (6 stories in prd.json) |

**Fichiers cles modifies:**
- `lib/services/repositories/supplier-contract.repository.ts` — FK hint fix
- `components/contracts/supplier-contract-card.tsx` — person name + company badge
- `components/contract/contract-form-container.tsx` — supplier contracts wizard integration
- `lib/database.types.ts` — new table types
- 23 blog articles in `blog/articles/`

**Learnings:** AGENTS.md #130-#134

---

### 2026-03-02 - Performance Optimization TIER 1+2 (13 stories)

**Session: Comprehensive app-wide performance optimization from 6-agent audit**

| Story | Title | Impact |
|-------|-------|--------|
| US-001 | Composite index conversation_participants | 1 new index (7 proposed already existed) |
| US-002 | Remove redundant auth checks | ~80 lines removed, ~16 queries/action eliminated |
| US-003 | Parallelize intervention edit page | 12 sequential → 3 phases |
| US-004 | Parallelize 6 entity creation pages | Phase 0 → Wave 1 → Wave 2 pattern |
| US-005 | Parallelize intervention API | Removed redundant FK validation |
| US-006 | Parallelize 5 dashboards/detail pages | Parallel query chains |
| US-007 | Batch rent reminder creation | 72+ queries → ~18 queries |
| US-008 | Bulk contract contact insertion | N × (auth+insert) → 1 × (auth+bulk) |
| US-009 | Defer invitation email to after() | Immediate response, email post-response |
| US-010 | Remove dead revalidation code | ~85 calls, ~120 lines removed |
| US-011 | Cache Stripe subscription info | unstable_cache 15min + webhook invalidation |
| US-012 | RPC for thread unread counts | 15 queries → 1 RPC call |
| US-013 | Stats head:true + contrats after() | Zero row data transfer for counts |

**New patterns established:**
- Server Component parallelization (Phase 0 → Wave 1 → Wave 2)
- RLS-as-authorization (no manual auth checks needed)
- next/server `after()` for deferred non-critical work
- `SECURITY DEFINER` RPC for batch cross-RLS operations
- Supabase bulk `.insert()` + `{ head: true }` for counts

**Learnings added:** AGENTS.md #105-#110
**Retrospective:** `docs/learnings/2026-03-02-performance-optimization-tier1-tier2-retrospective.md`

---

### 2026-03-02 - Post-Creation Redirect to Detail Page

**Session: UX improvement — 4 one-line edits in 3 files**

| Entity | Before | After |
|--------|--------|-------|
| Immeuble | `/gestionnaire/biens` (list) | `/gestionnaire/biens/immeubles/{id}` (detail) |
| Lot (single) | `/gestionnaire/biens` (list) | `/gestionnaire/biens/lots/{id}` (detail) |
| Lot (multi independent) | `/gestionnaire/biens` (list) | `/gestionnaire/biens/lots/{firstId}` (detail) |
| Contact (standalone) | `/gestionnaire/contacts` (list) | `/gestionnaire/contacts/details/{id}` (detail) |

Also removed redundant `router.refresh()` after `router.push()`.
**Learning:** AGENTS.md #104

---

### 2026-03-01 - Confirmation Logic + Slot-Count Business Rules + Billing Polish

**Session: Multi-topic fixes — business logic, billing UI, onboarding**

| Change | Description |
|--------|-------------|
| Slot-count logic | `isMultiSlot = schedulingType === 'slots' && timeSlots.length >= 2` — 1 slot = Date fixe behavior |
| Non-invited contacts | Confirmation logic fix for contacts without accounts |
| Billing interval | Enhanced monthly/yearly display in subscription UI |
| Onboarding checklist | Swapped steps 2↔3, hid useless building option |
| Beta gate removal | Removed beta access check from signup page |

**Learnings:** AGENTS.md #101-#103

---

## Previous Sprint (Feb 2026)

### 2026-02-26 - Unify Document Preview & Download (Ralph, 4 stories)

**Session: Shared hook + cross-role UX unification for document preview/download**

| Story | Title | Impact |
|-------|-------|--------|
| US-001 | Create `useDocumentActions` hook | 128 lines, manages modal state + API calls |
| US-002 | Refactor gestionnaire | −70 lines inline handlers |
| US-003 | Refactor locataire | −45 lines, `window.open` → modal |
| US-004 | Refactor prestataire | −45 lines, `window.open` → modal |

**Root cause chain (from debugging):**
1. Buttons "nothing happens" → client-side `createSignedUrl()` unreliable (stale JWT)
2. Download opens doc → HTML `download` attr ignored cross-origin
3. UX inconsistency → locataire/prestataire used `window.open`, gestionnaire used modal

**Solutions:**
- Server-side API routes (`/api/view-*`, `/api/download-*`) with `getApiAuthContext()`
- `{ download: fileName }` option in `createSignedUrl()` for `Content-Disposition: attachment`
- Shared `useDocumentActions` hook returning `{ handleViewDocument, handleDownloadDocument, previewModal }`

**Files created:** `components/interventions/shared/hooks/use-document-actions.tsx`, `hooks/index.ts`
**Files modified:** 3 role detail clients, download API route, shared/index.ts
**Net impact:** ~160 lines duplication → 1 shared hook (128 lines) + 2 lines per consumer
**Learnings:** AGENTS.md #093-#095 (client-side signedUrl, cross-origin download, hook-as-ReactNode)
**Retrospective:** `docs/learnings/2026-02-26-unify-document-preview-download-retrospective.md`

---

### 2026-02-26 - Storage Bucket Fix + RLS Auth UID

**Session: Fix 404 bucket errors and storage RLS auth.uid() mismatch**

| Fix | Description | Files |
|-----|-------------|-------|
| Bucket migration | `intervention-documents` → `documents` in remaining code paths | 3 upload routes, 3 detail clients |
| RLS auth fix | `auth.uid()` ≠ `users.id` in storage policies → use `get_my_profile_ids()` | Migration `20260226110000` |
| Service role revert | Upload routes back to authenticated client (not service role) | 3 upload API routes |

---

### 2026-02-26 - requireRole → getServerAuthContext Migration

**Session: Complete auth pattern migration across admin + proprietaire + gestionnaire actions**

| Change | Files | Pattern |
|--------|-------|---------|
| Admin layouts (2) | `app/admin/layout.tsx`, `app/admin/(with-navbar)/layout.tsx` | `getServerAuthContext('admin')` |
| Proprietaire pages (4) | `layout.tsx`, `dashboard/page.tsx`, `interventions/page.tsx`, `biens/page.tsx` | `getServerAuthContext('proprietaire')` |
| Gestionnaire actions (1) | `dashboard/actions.ts` (2 functions) | `getServerActionAuthContextOrNull('gestionnaire')` |

**Result:** Zero `requireRole` usage in `app/` (excluding lib files and comments).
**Learnings:** AGENTS.md #087 (Server Components vs Server Actions auth helpers)
**Retrospective:** `docs/learnings/2026-02-26-auth-migration-requireRole-retrospective.md`

---

### 2026-02-25 - Guide Utilisateur + Email Enhancements + RLS Fix

**Session: In-app user guide, email attachment enhancements, critical RLS fix**

| Feature | Description | Files |
|---------|-------------|-------|
| Guide utilisateur | 9 sections, 20 FAQ, search | `app/gestionnaire/(with-navbar)/aide/` |
| RLS fix | `get_accessible_*_ids()` → `team_members` source of truth | `20260225120000_fix_rls_*.sql` |
| Email attachments | Preview modal, download, blacklist API | `mail/components/attachment-preview-modal.tsx` |
| Storage RLS | Team-scoped email attachment policies | `20260225100000_tighten_email_attachments_rls.sql` |

**Learnings:** AGENTS.md #084-#086 (RLS team_members patterns)

---

### 2026-02-21/22 - Stripe Subscription Integration (Feature Complete)

**Session: Full billing system with trial management, subscription gates, and billing UI**

| Feature | Description | Files |
|---------|-------------|-------|
| **Billing System** | 48 user stories + 13 debugging fixes + 6 audit fixes | 249 test cases total |
| **DB Migrations** | Subscriptions, stripe_customers, stripe_invoices, webhook_events | 4 new migrations |
| **UI Components** | Billing settings page, trial overage banner, locked lot cards | 11 new components |
| **Services** | SubscriptionService, SubscriptionEmailService | 2 new services |
| **Repositories** | SubscriptionRepository, StripeCustomerRepository | 2 new repositories |
| **CRON Jobs** | Trial expiration, trial notifications, behavioral triggers, cleanup webhook events | 4 new API routes |
| **Webhook Handler** | Stripe webhook with 8 event types (invoice.*, customer.subscription.*) | 1 new API route |
| **Server Actions** | Subscription management, checkout session creation, portal access | subscription-actions.ts |

**Key Features Implemented:**
1. **Trial Management**
   - 14-day trial with 2 properties free
   - Auto-expire trial after 14 days
   - Trial notifications (7-day, 3-day, 1-day, expired)

2. **Subscription Gates**
   - Server-side gates on lot detail/edit pages
   - Building detail interventions tab restricted
   - Intervention action guards on locked lots
   - Server Action guards in createLotAction, updateCompleteProperty

3. **Lot Access Restriction (6 stories)**
   - Trial overage banner (dismissible, amber theme)
   - Locked lot cards (semi-transparent overlay + "Déverrouiller" button)
   - Server-side gates on lot detail + lot edit pages
   - Intervention action guards on locked lots
   - Building detail grid shows locked lots

4. **Billing Audit Fixes (6 stories)**
   - mapStripeStatus consolidated to single source
   - Paused status handled in checkReadOnly/checkCanAddProperty
   - Lot edit page subscription gate added
   - updateCompleteProperty subscription check + canAddProperty(count)
   - getAccessibleLotIds fail-closed (security)
   - BillingErrorBoundary + useSubscription hasError

**New Patterns Documented:**
- Layered fail: service-level = fail-closed, page-level = fail-open
- CRUD access checklist when restricting entities
- canAddProperty(count) for batch quota checks
- CSS overlay for locked card dimming (not parent opacity)

**AGENTS.md Learnings Added:**
- #072: Stripe metadata isolation (checkout.session vs subscription_data)
- #073: Stripe customer stale detection (deleted: true returns, not throws)
- #074: Billing table RLS (service role only, client silently fails)
- #075: OAuth vs DB trigger (mirror trial init in completeOAuthProfileAction)
- #076: Webhook fallback (verifyCheckoutSession for local dev)
- #077: Metered vs Standard pricing (metered rejects quantity param)

**Test Coverage:**
- Unit tests: 218 (5 new Stripe test files)
- Integration tests: 15 (1 new Stripe test file)
- E2E tests: 16 (billing settings flow)
- Total: 249 test cases

**Retrospective:** `docs/learnings/2026-02-22-stripe-billing-audit-retrospective.md`

---

### 2026-02-21 - Cancel Modal Wiring (Intervention Detail Page)

**Session: Wire pre-built cancellation infrastructure into gestionnaire detail page**

| Change | File | Description |
|--------|------|-------------|
| Import hook | intervention-detail-client.tsx | `useInterventionCancellation` hook |
| Dynamic modal | intervention-detail-client.tsx | `CancelConfirmationModal` via `next/dynamic` |
| Wire handler | intervention-detail-client.tsx | Replace `case 'cancel': // TODO` with hook call |
| Render modal | intervention-detail-client.tsx | JSX block after ApprovalModal |
| Un-skip E2E | intervention-workflow.e2e.ts | Cancel test now active |

**Pattern used:** Same headless hook + dynamic modal as `useInterventionApproval` + `ApprovalModal`. Zero new files created — all infrastructure was pre-built (hook, modal, API route, service method).

**Lint:** Clean (no new warnings).

---

### 2026-02-20/21 - E2E Testing V2 + Unified Documents Bucket

**Session: Full E2E Infrastructure + Document Consolidation**

| Feature | Description | Files |
|---------|-------------|-------|
| Unified `documents` bucket | Migration + 3 upload routes updated | 1 migration, 3 API routes, storage.service.ts |
| Lot wizard refactoring | 2914-line page.tsx → server + client separation | page.tsx, lot-creation-form.tsx (NEW) |
| Building E2E + doc upload | 8 tests with real DB submission + PDF upload | building-creation.e2e.ts, building-wizard.page.ts |
| Lot E2E + doc upload | 12 tests (2 modes) with doc upload | lot-creation.e2e.ts, lot-wizard.page.ts |
| Contract E2E + doc upload | 1 test, 5-step wizard with real submission | contract-creation.e2e.ts, contract-wizard.page.ts (NEW) |
| data-testid attributes | 11 new data-testid across 7 components | property-selector, contact-selector, step-progress-header, etc. |
| Contracts navigator | Added "A venir" tab + cleaned unused imports | contracts-navigator.tsx |
| Address fix | Batch address fetch for independent lots | lot.repository.ts, page.tsx |

**Key decisions:**
- API-based auth (Supabase GoTrue REST) instead of browser login — 2s setup vs 15s
- Service role client for storage uploads (user client blocked by RLS)
- Page Object Model pattern for test maintainability
- data-testid over text matching for i18n resilience

**Learnings added:** AGENTS.md #047-#057 (11 new, E2E patterns + storage)
**Retrospectives:** 3 files in docs/learnings/2026-02-20-* and 2026-02-21-*

---

### 2026-02-19 - Blog Section + SEO Articles (6 stories via Ralph)

**Session: Full Blog Feature Implementation**

| Story | Title | Files Created |
|-------|-------|---------------|
| US-001 | Blog utility library | `lib/blog.ts` |
| US-002 | Blog article page | `app/blog/layout.tsx`, `app/blog/[slug]/page.tsx`, `components/blog/blog-markdown.tsx` |
| US-003 | Blog index page | `app/blog/page.tsx`, `components/blog/blog-article-card.tsx`, `components/blog/blog-list-client.tsx` |
| US-004 | Landing page blog section | Modified `app/page.tsx`, `components/landing/landing-page.tsx` |
| US-005 | Navbar blog link | Modified `components/landing/landing-header.tsx`, `app/blog/layout.tsx` |
| US-006 | Blog SEO sitemap | Modified `app/sitemap.ts` |

**Key decisions:**
- Pages over modals for SEO (individual URLs, JSON-LD, OG tags)
- Server→Client boundary: `getLatestArticles()` in server parent, prop to client LandingPage
- Layout consolidation: shared header/footer in `app/blog/layout.tsx`
- `showBlogNav` prop on LandingHeader for blog navigation mode

**Also this session:** 2 blog articles written, SEO-reviewed (Seven Sweeps), 45+ authoritative sources added

---

### 2026-02-18 - Code Review Fixes (3 CRITICAL + 7 HIGH + 2 Quick)

**Session: 5-Agent Code Review Fix Implementation**

Applied 10 confirmed fixes from comprehensive code review across 9 files:

| Severity | ID | Description | File(s) |
|----------|-----|-------------|---------|
| CRITICAL | C1 | TDZ: useState before dependent hooks | lots/nouveau/page.tsx |
| CRITICAL | C2 | Duplicate imports (Badge, getLotCategoryConfig) | lots/nouveau/page.tsx |
| CRITICAL | C3 | **DISMISSED** — XOR constraint correct | building-creation-form.tsx |
| HIGH | H1 | Multi-lot: interventions only for [0] | lots/nouveau/page.tsx |
| HIGH | H2 | Multi-lot: docs staged but never uploaded | lots/nouveau/page.tsx |
| HIGH | H3 | ContractDocument missing expiry_date | contract.types.ts |
| HIGH | H4 | expiryDate bypasses Zod validation | route.ts + schemas.ts |
| HIGH | H5 | ResolvedLeaseInterventionTemplate fields | lease-interventions.ts |
| HIGH | H6 | assignUser() missing gestionnaire check | intervention-service.ts |
| HIGH | H7 | Unsafe `as` cast on assignments | intervention-actions.ts |
| QUICK | Q1 | Trailing space "Immeuble " | step-configurations.ts |
| QUICK | Q2 | Unused CUSTOM_DATE_OPTION export | lease-interventions.ts |

**Learnings ajoutes:** AGENTS.md #043-#046
**Retrospective:** `docs/learnings/2026-02-18-code-review-fixes-retrospective.md`

---

### 2026-02-17 - Property Documents + Interventions Step (5 stories)

**Session: 5-Step Creation Wizard for Buildings & Lots**

| Story | Description | Files |
|-------|-------------|-------|
| US-001 | Property intervention templates (6 building, 2 lot) | lib/constants/property-interventions.ts (NEW) |
| US-002 | PropertyInterventionsStep component | components/property-interventions-step.tsx (NEW) |
| US-003 | Building creation 4→5 steps | building-creation-form.tsx, step-configurations.ts |
| US-004 | Building intervention DB creation | building-creation-form.tsx (handleFinish) |
| US-005 | Lot creation integration (3 modes) | lots/nouveau/page.tsx, step-configurations.ts |

**Also:** Property document upload hooks, multi-lot document upload, building interventions tab fix.

---

### 2026-02-12 - Voice Recorder + Documents Management + Reports Display

**Session: File Upload Improvements + Reports Card**

Améliorations complètes de l'upload de fichiers audio et de l'affichage des rapports de clôture :

| Feature | Description |
|---------|-------------|
| **Fix fileName audio** | Nomenclature "Rapport audio - [titre intervention]" |
| **Fix mediaFiles upload** | FormData pour File objects (JSON.stringify les supprimait) |
| **Fix documents preview** | Signed URLs via createBrowserSupabaseClient (prestataire, locataire) |
| **ReportsCard component** | Composant shared affichant les 3 rapports de clôture (provider, tenant, manager) |
| **Data fetching** | Fetch intervention_reports dans les 3 page.tsx |

**Fichiers créés (1):**
- `components/interventions/shared/cards/reports-card.tsx` (165 lignes)

**Fichiers modifiés (13):**
- Hooks: use-audio-recorder.ts
- Components: voice-recorder.tsx, simple-work-completion-modal.tsx, intervention-action-buttons.tsx
- Cards: reports-card.tsx (NEW), documents-card.tsx, index.ts
- Pages: 3 x page.tsx (gestionnaire, prestataire, locataire)
- Detail clients: 3 x intervention-detail-client.tsx
- Knowledge base: AGENTS.md (+3 learnings), progress.txt

**Learnings ajoutés:** AGENTS.md #030-#032
**Retrospective:** `docs/learnings/2026-02-12-voice-recorder-documents-reports-retrospective.md`

---

### 2026-02-11 - Security & RLS Policy Consolidation

**Session: Fix Supabase Linter Warnings — 4 Migrations**

Applied 4 migrations to fix security issues and consolidate overlapping RLS policies:

| Migration | Description |
|-----------|-------------|
| `20260211140000` | Performance advisor fixes (reverted) |
| `20260211150000` | Revert all (rollback) |
| `20260211160000` | Re-apply: search_path='public' on 52 functions, SECURITY INVOKER on 6 views, InitPlan caching on 18 policies |
| `20260211170000` | Fix ~53 `multiple_permissive_policies` warnings across 13 tables |

**Policy Consolidation (migration 170000):**

| Group | Action | Tables |
|-------|--------|--------|
| A | Updated 3 helper functions (proprietaire + contract-based locataire), dropped 7 redundant SELECT policies | buildings, lots, interventions |
| B | Replaced 4 FOR ALL with individual action policies | intervention_type_*, import_jobs |
| C | Merged 8 overlapping UPDATE into 4 (soft-delete pattern) | documents, quotes, reports, interventions |
| D | Merged/dropped overlapping SELECT/INSERT/UPDATE policies | quotes, emails, email_attachments, users |

**Net result:** 27 policies dropped, 17 created = 10 fewer policies. Zero remaining duplicates.

**Key learning:** `pg_policies.roles` is `name[]` not `text[]` — must cast `::text[]` when using `@>` operator.

---

## Dette Technique Connue
- 15 fichiers utilisent encore le singleton notification legacy
- Certains composants pourraient migrer vers Server Components
- ✅ PROJECT_INDEX.json - **Genere et synchronise**
- ✅ Version variants nettoyes - **1 fichier supprime**
- ✅ Ecosysteme .claude/ optimise - **62% reduction** (2026-01-23)

## Metriques Projet (2026-03-22)

| Metrique | Valeur |
|----------|--------|
| Repositories | **29** (+4 bank) |
| Domain Services | **44** (+4 bank) |
| API Routes | **143** (+13 bank) |
| Hooks | **66** |
| Components | **430** (+10 bank) |
| Pages | **84** (+1 banque) |
| Blog Articles | **23** |
| DB Tables | **56** (+7 bank) |
| DB Enums | 39 |
| DB Functions | **81** (+1 increment_rent_call_received) |
| Migrations | **202** (+1 banking) |
| Cron Jobs | **9** (+4 bank) |
| Server Actions | **20** files (+2: bank-actions, rent-reminder-actions) |
| Notification Actions | **20** |
| Supabase Client Types | **4** (browser, server, serverAction, serviceRole) |
| **AGENTS.md Learnings** | **183** |
| **systemPatterns.md Patterns** | **40** |
| **Unit Tests** | **652** (45 files) |
| **E2E Test Files** | **8** |
| **E2E Page Objects** | **8** |
| **Retrospectives** | **50** |
| **Integration Test Files** | **5** |

### Metriques Ecosysteme .claude/ (2026-03-14)

| Categorie | Count | Lignes |
|-----------|-------|--------|
| CLAUDE.md | 1 | 164 |
| Skills | 23 | ~2,800 |
| Agents | 15 | ~4,200 |
| Rules | 5 | ~450 |
| Scripts | 5 | ~363 |
| Memory Bank | 6 | ~800 |
| **Total** | 55 | ~8,777 |

## Historique des Decisions Techniques

| Date | Decision | Raison | Impact |
|------|----------|--------|--------|
| 2025-10 | getServerAuthContext() | Centralisation auth | 21 pages migrees |
| 2025-11 | Server Actions notifications | Next.js 15 compliance | 12 fichiers migres |
| 2025-11 | RealtimeProvider | Single channel pattern | Performance +10x |
| 2025-12 | Magic links emails | Auto-login CTA | Meilleure UX |
| 2026-01 | Memory Bank | Optimisation contexte | Documentation vivante |
| 2026-01 | Gmail OAuth | Email conversation threading | Sync bidirectionnelle |
| 2026-01 | Audit + Sync Memory Bank | 100% documentation a jour | Metriques precises |
| 2026-01 | Props Email Standardises | Coherence templates ↔ service | Preview fiable |
| 2026-01-23 | Optimisation .claude/ | Reduction duplication | -62% lignes, -6000 tokens/session |
| 2026-01-25 | PWA Push Notifications | Notifications temps reel mobile | 4 canaux complets |
| 2026-01-26 | Migration workflow devis | Suppression statut redondant | 10 → 9 statuts, meilleure separation concerns |
| 2026-01-26 | Pagination client-side | Donnees deja chargees + UX instantanee | Hook reutilisable + pattern documente |
| 2026-01-27 | Integration Skills sp-* | Garantir code sans erreur via invocation automatique | 16 fichiers .claude/ modifies, Red Flags universels |
| 2026-01-28 | Nettoyage Logs Auth | Production-ready, moins de bruit console | ~113 logs supprimes, 31 conserves (errors/warns) |
| **2026-01-28** | **Centralisation Adresses** | **Table unique + Google Maps ready** | **Table addresses + migration donnees existantes** |
| **2026-01-29** | **Thread creation order** | **Participants non ajoutes si threads apres assignments** | **Ordre: intervention → threads → assignments → slots** |
| **2026-01-29** | **Trigger thread_add_managers** | **Managers pas explicitement participants** | **Auto-ajout managers a tous les threads intervention** |
| **2026-01-30** | **SW disabled in dev** | **Timeouts CSP bloquaient l'app** | **Dev fluide, SW actif en prod uniquement** |
| **2026-01-30** | **CSP connect-src exhaustif** | **SW intercepte tous fetch** | **Tous domaines dans connect-src, pas juste img-src/font-src** |
| **2026-01-31** | **Auth Refactoring Complet** | **Appels auth redondants, bug multi-profil** | **14 fichiers refactorisés, ~250 lignes supprimées, nouveau helper centralisé** |
| **2026-01-31** | **Auth API Optimization** | **250+ appels API en 10 min** | **getSession() local au lieu de getUser() réseau, cache() sur supabase client** |
| **2026-02-01** | **Filtrage auth_id Invités** | **Contacts sans compte recevaient conversations/notifs** | **Filtre .not('auth_id', 'is', null) à tous les points d'entrée** |
| **2026-02-02** | **PWA Notification Prompt** | **Maximiser activation notifications PWA** | **Modale rappel + guide paramètres par plateforme** |
| **2026-02-02** | **Quote Notifications Multi-Canal** | **Gaps notifications devis** | **4 nouvelles actions, sendRoleAwarePushNotifications()** |
| **2026-02-02** | **Push Subscription Security** | **RLS silent block + client userId** | **userProfile.id + null data check** |
| **2026-02-03** | **Simplification "Approuvée"** | **UX plus claire, moins de boutons** | **Un seul bouton "Planifier", message simplifié** |
| **2026-02-03** | **ContactSelector dans Modal** | **Mockups → vrais composants** | **Pattern `hideUI={true}` + `ref.openContactModal()`** |
| **2026-02-04** | **Fix ensureInterventionConversationThreads** | **Bug deleted_at fantôme + gap participants group** | **Fonction débloquée, participants ajoutés aux group threads existants** |
| **2026-02-08** | **Performance Navigation Optimization V2** | **Perfs listes + pages detail + Next.js 15 patterns** | **17 stories, 90 fichiers, 4 learnings AGENTS.md, 2 patterns systemPatterns.md** |
| **2026-02-09** | **Planning Button Consolidation** | **2 boutons → 1, ProgrammingModal pre-fill** | **2 fichiers, manage_planning ActionType** |
| **2026-02-09** | **Conversation Thread Fix** | **Trigger auth_user_id guard + participant indicator** | **4 stories, 3 learnings AGENTS.md, migration repair workflow** |
| **2026-02-11** | **Security Consolidation RLS** | **53 linter warnings, overlapping policies** | **4 migrations, 27 policies dropped, helpers expanded (proprietaire+contracts)** |
| **2026-02-12** | **Voice Recorder + Documents + Reports** | **Upload audio, preview docs, affichage rapports** | **13 fichiers, composant ReportsCard shared, 3 learnings AGENTS.md** |
| **2026-02-16** | **Intervention Workflow Polish** | **7 themes: demande_de_devis removal, approved→accepted, finalization API, quote form, details card, dashboards, quote modals** | **40 fichiers, -500 lignes net, 4 learnings AGENTS.md (#035-#038)** |
| **2026-02-17** | **Property Documents + Interventions Step** | **5-step wizard with doc upload, intervention scheduling, multi-lot support** | **~15 fichiers, 2 new hooks, 2 new components, 2 constant files** |
| **2026-02-18** | **Code Review Fixes (3C+7H+2Q)** | **TDZ, multi-lot [0], Zod drift, role validation, type completeness** | **9 fichiers, 4 learnings AGENTS.md (#043-#046), 1 false positive dismissed** |
| **2026-02-19** | **SEO Landing Page Optimization** | **Score 52→78/100, JSON-LD schemas, FAQ structured data** | **13 stories, Title/meta/OG optimization** |
| **2026-02-19** | **Blog Section Complete** | **Content marketing for SEO, article preview on landing** | **6 stories, 7 new files, 4 modified, gray-matter + react-markdown** |
| **2026-02-20** | **Unified Documents Bucket** | **3 buckets → 1 (property/intervention/contract → documents)** | **1 migration, 3 upload routes, storage.service.ts, config.toml** |
| **2026-02-20** | **Lot Wizard Server Component Refactor** | **2914-line page.tsx extraction for maintainability** | **page.tsx (server) + lot-creation-form.tsx (client)** |
| **2026-02-20/21** | **E2E Testing Infrastructure V2** | **Full Puppeteer + Vitest suite with POM pattern** | **25 tests, 4 test files, 5 POMs, API auth, 11 data-testid attrs** |
| **2026-02-21** | **Contract E2E + Storage Fix** | **Service role for storage uploads, useImperativeHandle retry** | **contract-wizard.page.ts, upload-contract-document/route.ts** |
| **2026-02-21/22** | **Stripe Subscription Integration** | **Full billing system with trial, gates, UI** | **48+13+6 stories, 249 tests, 4 migrations, 11 components, 2 services, 2 repos, 4 CRON jobs** |
| **2026-02-25** | **RLS team_members source of truth** | **users.team_id is stale, team_members is canonical** | **1 migration fixing 3 SECURITY DEFINER functions, 3 AGENTS.md learnings (#084-086)** |
| **2026-02-25** | **Guide utilisateur in-app** | **Self-service support, reduce gestionnaire onboarding friction** | **9 sections, 20 FAQ, fuzzy search, responsive layout** |
| **2026-02-26** | **requireRole → getServerAuthContext** | **Consistent auth pattern, cache() dedup, team context** | **7 files migrated, 0 requireRole in app/ pages, AGENTS.md #087** |
| **2026-02-26** | **Storage bucket + RLS auth fix** | **404 bucket not found, auth.uid() ≠ users.id** | **Migration, 3 upload routes, `get_my_profile_ids()` in storage policies** |
| **2026-02-26** | **useDocumentActions shared hook** | **Unify document preview/download across 3 roles** | **1 hook, 3 consumers, ~160 lines duplication eliminated, AGENTS.md #093-#095** |
| **2026-03-01** | **Slot-count business logic** | **1 slot = Date fixe, 2+ = mandatory confirmation** | **isMultiSlot derivation shared across UI + API, AGENTS.md #101-#103** |
| **2026-03-02** | **Server Component parallelization** | **Phase 0 → Wave 1 → Wave 2 for all page.tsx** | **11 pages parallelized, up to 12→3 sequential phases, AGENTS.md #105** |
| **2026-03-02** | **RLS-as-authorization** | **Remove manual team_members auth checks** | **~80 lines removed, ~16 queries/action eliminated, AGENTS.md #106** |
| **2026-03-02** | **next/server after()** | **Defer emails/notifications post-response** | **Invitation email response now immediate, AGENTS.md #107** |
| **2026-03-02** | **unstable_cache on force-dynamic** | **Data cache works independently of route cache** | **Subscription cached 15min + webhook invalidation, AGENTS.md #108** |
| **2026-03-02** | **SECURITY DEFINER RPC batch** | **Single SQL function for N×M cross-RLS queries** | **Thread unread: 15 queries → 1 RPC, AGENTS.md #109** |
| **2026-03-02** | **Supabase bulk patterns** | **Array .insert() + { head: true } for counts** | **Rent reminders 72→18 queries, stats zero data transfer, AGENTS.md #110** |
| **2026-03-02** | **Post-creation redirect** | **Entity creation → detail page, not list** | **4 entities fixed, router.refresh() removed, AGENTS.md #104** |
| **2026-03-14** | **Import deferred geocoding** | **Non-blocking geocoding via after()** | **Phase 0 removed, batch 10 parallel, 40/sec rate limit** |
| **2026-03-14** | **CLAUDE.md INTERDICTIONS at top** | **Critical rules get followed more reliably** | **487→164 lines, INTERDICTIONS section first, skill routing with validation** |
| **2026-03-14** | **Parallel Execution Protocol** | **Worktree-based parallelization for multi-task work** | **Branch awareness, simplify self-check, merge+cleanup lifecycle** |
| **2026-03-14** | **Quality Gate Knowledge Capture** | **Persist learnings BEFORE commit, not after** | **Step 4.5: compound, memory bank, CLAUDE.md, agents/skills check** |
| **2026-03-14** | **PreToolUse safety hooks** | **Deterministic blocking (not advisory)** | **block-dangerous-commands.js + block-secret-writes.js** |
| **2026-03-14** | **Global blueprint** | **Replicable .claude/ ecosystem for any project** | **.claude/claude-code-global-blueprint.md — 33 global + 20-30 per project files** |
| **2026-03-19** | **getTeamManagerContext() helper** | **DRY API route auth boilerplate** | **Extracted to lib/services/helpers/api-team-context.ts, used by email routes** |
| **2026-03-19** | **EMAIL_LIST_COLUMNS pattern** | **Exclude heavy columns from list queries** | **email.repository.ts excludes body_html, reduces payload** |
| **2026-03-19** | **Email visibility plumbing** | **Private/shared email connections** | **OAuth+IMAP flows write visibility, listing/counts filter by access** |

---
*Derniere mise a jour: 2026-03-22*
*Session: Operations section (reminders/recurrence) + AI agent design, 163 learnings in AGENTS.md, 48 retrospectives*
