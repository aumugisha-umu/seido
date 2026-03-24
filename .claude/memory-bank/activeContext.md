# SEIDO Active Context

## Focus Actuel
**Objectif:** Bank Module Phase 1 MVP complete + Security audit fixes + Gestionnaire verification fixes
**Branch:** `feature/bank-module`
**Sprint:** Banking + Security + Quality (Mar 2026)
**Derniere analyse:** Full-stack audit (128 checks) + gestionnaire verification (93 files) + bank module (17 stories) — 2026-03-22

---

## COMPLETE: Bank Module Phase 1 MVP (2026-03-22)

Full Tink Open Banking integration: OAuth flow, transaction sync, rent call generation, reconciliation, dashboard widgets.

### Key Changes
- **7 new DB tables**: bank_connections, bank_transactions, rent_calls, transaction_links, auto_linking_rules, property_expenses, security_deposits
- **Tink API service**: OAuth, token management (30min expiry), data fetching (accounts + transactions)
- **Bank connection repository**: Encryption for tokens + IBAN, safe client projections
- **Transaction sync**: 4h cron + manual trigger, 90-day lookback, deduplication
- **Rent call generation**: Monthly cron, 4 payment frequencies, 3-month horizon, overdue detection (J+2)
- **Reconciliation**: 5-component confidence scoring, manual search, undo support
- **13 API endpoints**: Connections CRUD, transactions list/reconcile/ignore, sync, reports, suggestions
- **Dashboard widgets**: Reconciliation count, cash flow, overdue rent
- **Quittance PDF**: French legal compliance (Loi 6/7/1989)
- **113 unit tests** across 9 test files, 0 regressions
- **Sidebar**: Landmark icon added between Interventions and Emails

### Security Audit Sprint 1 (6 fixes)
- Zod `.strict()` on service-role update-contact route (mass assignment)
- `getSession()` → `getUser()` in auth-dal (JWT validation)
- CSP `unsafe-eval` dev-only conditional
- CORS origin allowlist (no more `*`)
- Stripe `mapStripeStatus` fail-closed for unknowns
- Lot action Zod validation

### Gestionnaire Verification Sprint 2 (5 fixes)
- `BaseRepository.softDelete()` method (buildings + lots now soft-delete)
- Pre-capture team_id before delete for revalidation
- Proprietaire role handling in contact detail page
- Removed `(profile as any).team_id` casts (2 files)
- Avatar accept restricted to jpeg/png/webp

**Learnings:** AGENTS.md #169-178

---

## COMPLETE: QA Bot E2E Test Suite + Admin Invite + Bug Fixes (2026-03-21)

Full Playwright QA bot suite with 114 passing tests across 8 shards. 70 files, +13,088/-444 lines.

### Key Changes
- **Playwright E2E suite**: 8 spec files (auth-smoke, patrimoine, intervention-lifecycle, conversations-docs, contrats-rappels, email-system, notifications, billing-settings)
- **10 Page Objects (POM)**: building-wizard, lot-wizard, intervention-wizard, intervention-detail, contract-wizard, mail-hub, notifications, billing, dashboard, reminder-wizard, reminder-detail
- **Auth setup**: Supabase GoTrue REST API (no browser login flow)
- **GitHub Actions CI**: Workflow for automated test runs
- **cancelIntervention bug fix**: `string | CancellationData` union type in `lib/intervention-actions-service.ts` (was crashing with `t.trim is not a function`)
- **Admin invite**: `inviteGestionnaireAction` in `app/actions/user-admin-actions.ts` with magic link + Resend email
- **Auth role discovery**: `requireRole('gestionnaire')` does strict equality — admin role is NOT a super-gestionnaire

**Learnings:** AGENTS.md #164-168

---

## COMPLETE: Operations Section + Reminders/Recurrence (2026-03-20)

Major feature: new Operations section replacing standalone Interventions navigation. 118 files, +7102/-1293 lines.

### Key Changes
- **Route restructuring**: `/gestionnaire/interventions/` → `/gestionnaire/operations/interventions/`
- **Reminders system**: Full CRUD with entity linking (building/lot/contact/contract)
- **Recurrence engine**: RFC 5545 RRULE, cron scanner (daily 06:00 UTC), visual builder
- **3 new DB tables**: `reminders`, `recurrence_rules`, `recurrence_occurrences`
- **8 new components**: reminder-card, reminders-list-view, reminders-navigator, stats widget, task-type-segment, recurrence-config
- **Deleted**: assignment-mode-selector, finalize-multi-provider-button, provider-instructions-input

### AI Intervention Agent Design (Validated)
- Design doc: `docs/AI/ai-intervention-agent-design.md`
- Phase 1: Manual "Analyser avec l'IA" button (8 stories)
- Phase 2: Auto-analysis on tenant `demande` (4 stories)
- Phase 2.5: Learning + vector embeddings (3 stories)
- Architecture: Vercel AI SDK ToolLoopAgent + Claude Sonnet/Haiku + existing service layer

---

## COMPLETE: Email Section Cleanup + Visibility Plumbing (2026-03-19)

Major cleanup session across the entire email section (30 files, +1098 -671 lines):

### Compose Email Modal Fix
- Fixed Select dropdown unclickable inside UnifiedModal (z-index conflict z-50 vs z-[9999])
- Fix: `SelectContent className="z-[10000]"` + `SelectTrigger className="bg-white w-full"`
- Added `bg-white` to `.unified-modal__header` in globals.css

### Exhaustive Code Review (3 parallel agents)
- **console->logger**: Replaced ~22 `console.error/warn` across 7 API routes + 5 client components
- **any->unknown**: Eliminated ~20 `any` types
- **Type consolidation**: 3 local `EmailConnection` interfaces -> import `TeamEmailConnection` from `email-integration.ts`
- **Team membership helper**: Extracted `getTeamManagerContext()` in `lib/services/helpers/api-team-context.ts`
- **N+1 fix**: `connections/route.ts` 2N queries -> 2 batch queries
- **select('*') fix**: `email.repository.ts` -> `EMAIL_LIST_COLUMNS` constant (excludes body_html)
- **Sequential deletes -> Promise.all** in connections/[id]/route.ts
- **Parameter sprawl**: `createSharesForThread` 6 params -> options object
- **Duplicate methods**: `markAsProcessed` delegates to `markAsRead`

### Critical Visibility Plumbing
- Added `added_by_user_id` + `visibility` to OAuth callback INSERT
- Added `added_by_user_id` + `visibility` to IMAP POST route
- Connected visibility through OAuth flow (authorize reads param -> state -> callback uses it)
- Applied `EmailVisibilityService.getAccessibleConnectionIds()` to listing + counts routes

**Learnings:** AGENTS.md #159-163

---

## COMPLETE: Contact Role Rename "Autre" -> "Proprietaire" (2026-03-18)

Full rename of the "Autre" contact category to "Proprietaire" across the app:
- **UI labels:** "Autres" -> "Proprietaires" in lot/building contact cards, section headers, tooltips, empty states, buttons
- **Color scheme:** gray -> amber (matching garant/proprietaire pattern)
- **Icon:** UserCircle -> Home (lucide-react)
- **Contact selector key alignment:** `"other"` -> `"owner"` to match `determineAssignmentType()` output
- **Files:** 18 files modified across contact cards, selectors, configs, wizards
- **Learnings:** #157-#158

---

## COMPLETE: Subscription Loading Race Conditions + Audit (2026-03-16)

Critical bug: "Nouvel immeuble" button opened upgrade modal for user with 14/50 lots (valid subscription).
- **Root cause:** `canAddProperty ?? false` during useSubscription loading
- **Fix:** Fail-open during loading on ALL client gates
- **Learnings:** #149-151

---

## COMPLETE: Admin Notification Emails (2026-03-16)

Platform owner email notifications for 4 user lifecycle events via Resend.
- **Service:** `lib/services/domain/admin-notification/` (service + MRR helper + HTML builder)
- **Learnings:** #145-148

---

## COMPLETE: Data Invalidation Broadcast (2026-03-15)

Supabase Broadcast-based system for real-time cross-team data synchronization.
- **Core:** `lib/data-invalidation.ts` + `contexts/realtime-context.tsx`
- **Remaining:** Task 10 -- remove 68 dead revalidatePath/revalidateTag calls (deferred)

---

## Flow des Interventions - Vue Complete

### Statuts (9 actifs)
```
demande -> rejetee (terminal)
        -> approuvee -> planification -> planifiee
                                              |
                                    cloturee_par_prestataire
                                              |
                                    cloturee_par_locataire
                                              |
                                    cloturee_par_gestionnaire (terminal)
        -> annulee (terminal - possible a chaque etape)
```

### Quote Statuts (7 valeurs DB)
```
draft -> pending -> sent -> accepted (terminal positif)
                        -> rejected (terminal negatif)
                        -> expired (terminal timeout)
                        -> cancelled (terminal annule)
```

---

## Prochaines Etapes

### A faire immediatement
- [ ] Bank Module: Apply migration to linked DB + regenerate types
- [ ] Bank Module: Test Tink OAuth flow in staging (Tink sandbox)
- [ ] Bank Module: Configure Vercel cron jobs (4 new crons)
- [ ] Deploy feature/bank-module branch to preview
- [ ] Dead revalidation cleanup (68 dead revalidatePath/revalidateTag calls)

### Fonctionnalites a Venir
- [ ] Bank Module Phase 2 (bulk reconciliation, auto-linking rules UI, owner payments)
- [ ] AI Intervention Agent Phase 1 (8 stories)
- [ ] Audit Sprint 2 (code quality) + Sprint 3 (tech debt)
- [ ] Email Visibility Phase 2
- [ ] Google Maps Integration Phase 2-3
- [ ] Dashboard analytics avance
- [ ] WhatsApp agent integration

---

## Metriques Systeme (Mise a jour 2026-03-22)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **56** (+7 bank tables) |
| **Migrations** | **202** |
| **API Routes** | **143** (+13 bank endpoints) |
| **Pages** | **84** (+1 banque page) |
| **Composants** | **430** (+10 bank components) |
| **Hooks** | **66** |
| **Services domain** | **44** (+4 bank services) |
| **Repositories** | **29** (+4 bank repositories) |
| **DB Functions** | **81** |
| **Cron jobs** | **9** (+4 bank crons) |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **183** |
| **Unit tests** | **652** (45 files) |
| **Blog articles** | **23** |
| **Retrospectives** | **50** |
| **.claude/ Skills** | **23** |
| **.claude/ Agents** | **15** |
| **.claude/ Rules** | **5** |
| **.claude/ Scripts** | **5** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `3ccd8d2` | feat: QA bot E2E suite (114 tests, Playwright) + admin invite + cancel bug fix |
| `3696e9f` | fix: align reminder confirmation with intervention pattern + fix RecurrenceConfig setState-in-render |
| `fbbca14` | docs: add AI intervention agent design document |
| `bc23040` | feat: operations section — reminders, recurrence, redesigned cards + safety limits |
| `5e53dc4` | update: sync last sync timestamp and enhance contact role definitions |

---

*Derniere mise a jour: 2026-03-22 (Bank Module Phase 1 + Security audit + Gestionnaire verification)
*Focus: Bank Module deployment + Tink sandbox testing

## Files Recently Modified
### 2026-03-24 21:08:46 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/seido-app/app/api/upload-contract-document/route.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/app/api/upload-intervention-document/route.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/app/api/upload-supplier-contract-document/route.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/lib/rate-limit.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/lib/constants/mime-types.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/lib/validation/schemas.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/hooks/use-contract-upload.ts`
- `C:/Users/arthu/Desktop/Coding/seido-app/components/contract/supplier-confirmation-step.tsx`
