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

### Phase 6: Stripe Subscription Integration ✅ (Complete 2026-02-22)
- [x] **Stripe Subscription System** (2026-02-21/22) - 48 stories + 13 debugging fixes + 6 audit fixes
- [x] **Lot Access Restriction** (2026-02-22) - Trial overage banner, locked lot cards, server-side gates
- [x] **Billing Audit Fixes** (2026-02-22) - mapStripeStatus consolidation, fail-closed patterns, error boundaries

## Sprint Actuel (Feb 2026)

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

## Metriques Projet (2026-02-22)

| Metrique | Valeur |
|----------|--------|
| Repositories | **21** (+2: subscription, stripe-customer) |
| Domain Services | **34** (+2: subscription, subscription-email) |
| API Routes | **120** (+6: 4 CRON, 1 webhook, 1 settings) |
| Hooks | **70** (+2: useSubscription, useStrategicNotification) |
| Components | **381** (+11: billing UI) |
| Pages | **89** (+1: billing settings) |
| Blog Articles | **2** (Jan 2026, Feb 2026) |
| DB Tables | **44** |
| DB Enums | 39 |
| DB Functions | **79** (+5: subscription helpers) |
| Migrations | **174** (+7: 4 Stripe, 2 trial init, 1 signup fix) |
| Server Actions | **17** files |
| Notification Actions | **20** |
| Supabase Client Types | **4** (browser, server, serverAction, serviceRole) |
| **AGENTS.md Learnings** | **87** (+10: #078-#087) |
| **systemPatterns.md Patterns** | **29** |
| **Shared Cards** | **15** |
| **Quote Status Enum (DB)** | **7** (draft, pending, sent, accepted, rejected, expired, cancelled) |
| **E2E Test Files** | **8** (smoke, building, lot, contract, 4 intervention) |
| **E2E Page Objects** | **8** (dashboard, login, 3 wizards, 3 intervention) |
| **E2E Total Tests** | **25+** (wizards) + intervention workflow |
| **Unit Test Files** | **12** (+5: Stripe tests) |
| **Integration Test Files** | **5** (+1: Stripe) |

### Metriques Ecosysteme .claude/ (2026-01-23)

| Categorie | Lignes |
|-----------|--------|
| CLAUDE.md | 269 |
| Agents (11 fichiers) | 1,492 |
| Memory Bank (6 fichiers) | 798 |
| Rules (3 fichiers) | 347 |
| **Total** | ~3,363 |

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

---
*Derniere mise a jour: 2026-02-26*
*Session: Auth migration complete, 87 learnings in AGENTS.md*
