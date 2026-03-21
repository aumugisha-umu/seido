# SEIDO Active Context

## Focus Actuel
**Objectif:** QA Bot E2E suite shipped (114 tests, Playwright), admin invite feature, cancel bug fix deployed
**Branch:** `preview`
**Sprint:** Quality + Operations + AI features (Mar 2026)
**Derniere analyse:** QA Bot E2E suite + cancelIntervention bug fix + admin invite — 2026-03-21

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
- [ ] Verify cancelIntervention bug fix in deployment (string | CancellationData)
- [ ] AI Intervention Agent Phase 1 implementation (8 stories — design in docs/AI/ai-intervention-agent-design.md)
- [ ] Test email visibility end-to-end (private vs shared connections)
- [ ] Deploy preview branch and validate operations section + data sync in production
- [ ] Dead revalidation cleanup -- remove 68 dead revalidatePath/revalidateTag calls (9 files)

### Fonctionnalites a Venir
- [ ] AI Intervention Agent Phase 2 (auto on demande, enriched notifications)
- [ ] Email Visibility Phase 2 (sharing UI, permission management)
- [ ] Google Maps Integration Phase 2-3
- [ ] Locataire lot details page (plan in docs/plans/)
- [ ] Landing page AI redesign (plan in docs/plans/)
- [ ] More blog articles (content marketing pipeline)
- [ ] Dashboard analytics avance
- [ ] WhatsApp agent integration (plan in docs/AI/)

---

## Metriques Systeme (Mise a jour 2026-03-20)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **49** (+3: reminders, recurrence_rules, recurrence_occurrences) |
| **Migrations** | **201** |
| **API Routes** | **130** |
| **Pages** | **83** (+5 operations pages) |
| **Composants** | **420** (+8 operations components) |
| **Hooks** | **66** (+1: use-reminders) |
| **Services domain** | **40** (+1: reminder) |
| **Repositories** | **25** (+2: reminder, recurrence) |
| **DB Functions** | **80** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **168** |
| **Blog articles** | **23** |
| **Retrospectives** | **49** |
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

*Derniere mise a jour: 2026-03-21 (QA bot E2E suite + admin invite + cancel bug fix)*
*Focus: Deployment verification + AI Intervention Agent Phase 1*

## Files Recently Modified
### 2026-03-21 09:00:20 (Auto-updated)
- `/home/user/seido/docs/plans/2026-03-21-e2e-testing-strategy-design.md`
- `/home/user/seido/tasks/prd.json`
- `/home/user/seido/tasks/progress.txt`
- `/home/user/seido/tests/e2e/setup/auth.setup.ts`
- `/home/user/seido/tests/e2e/playwright.config.ts`
- `/home/user/seido/.gitignore`
- `/home/user/seido/package.json`
- `/home/user/seido/tests/e2e/smoke/auth-smoke.spec.ts`
- `/home/user/seido/tests/e2e/pages/building-wizard.page.pw.ts`
- `/home/user/seido/tests/e2e/pages/lot-wizard.page.pw.ts`
- `/home/user/seido/tests/e2e/flows/property/building-creation.spec.ts`
- `/home/user/seido/tests/e2e/flows/property/lot-creation.spec.ts`
- `/home/user/seido/tests/e2e/pages/contract-wizard.page.pw.ts`
- `/home/user/seido/tests/e2e/pages/intervention-wizard.page.pw.ts`
- `/home/user/seido/tests/e2e/flows/contract/contract-creation.spec.ts`
- `/home/user/seido/tests/e2e/flows/billing/billing-ui.spec.ts`
- `/home/user/seido/tests/e2e/flows/billing/read-only-enforcement.spec.ts`
