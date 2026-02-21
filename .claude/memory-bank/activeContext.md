# SEIDO Active Context

## Focus Actuel
**Objectif:** Cancel Modal Wiring + Intervention Workflow Completion
**Branch:** `preview`
**Sprint:** Intervention UX Completion + E2E Testing V2 (Feb 2026)
**Derniere analyse:** Cancel modal wired, E2E cancel test un-skipped, lint clean — 2026-02-21

---

## ✅ COMPLETE: Cancel Modal Wiring (2026-02-21)

Wired the pre-built cancellation infrastructure into the gestionnaire intervention detail page:
- Imported `useInterventionCancellation` hook + `CancelConfirmationModal` (dynamic)
- Replaced `case 'cancel': // TODO` stub with `cancellationHook.handleCancellationAction()`
- Rendered modal in JSX after ApprovalModal block
- Un-skipped E2E cancel test in `intervention-workflow.e2e.ts`

**Pattern:** Same headless hook + dynamic modal as ApprovalModal (consistent codebase pattern).

---

## ✅ COMPLETE: E2E Testing Infrastructure V2 (2026-02-20/21)

Full Puppeteer + Vitest E2E test suite with Page Object Model pattern:

| Test File | Tests | Wizard | Duration |
|-----------|-------|--------|----------|
| smoke.e2e.ts | 4 | N/A | ~15s |
| building-creation.e2e.ts | 8 | Building (5-step) | ~40s |
| lot-creation.e2e.ts | 12 | Lot (5-step, 2 modes) | ~50s |
| contract-creation.e2e.ts | 1 | Contract (5-step) | ~43s |
| **Total** | **25** | | |

**Infrastructure:**
- `tests/e2e/setup/global-setup.ts` — API-based Supabase auth, cookie encoding
- `tests/e2e/helpers/browser.ts` — Puppeteer browser management (no userDataDir)
- `tests/e2e/helpers/cookies.ts` — Cookie consent + PWA banner dismissal
- `tests/e2e/pages/*.page.ts` — 5 Page Object Models (dashboard, login, 3 wizards)
- `tests/fixtures/test-accounts.ts` — Test credentials with env var overrides
- `tests/fixtures/test-document.pdf` — 316-byte valid PDF for upload tests

---

## ✅ COMPLETE: Unified Documents Bucket (2026-02-20)

Consolidated 3 storage buckets into 1 `documents` bucket:

| Story | Title | Status |
|-------|-------|--------|
| US-001 | Create `documents` bucket + storage RLS | Done |
| US-002 | Point all 3 upload routes to `documents` | Done |
| US-003 | Download/view routes dual-bucket support | Done (no changes needed) |
| US-004 | E2E: Building creation with doc upload | Done (8/8 green) |
| US-005 | E2E: Lot creation with doc upload | Done (12/12 green) |
| US-006 | E2E: Contract creation with doc upload | Done (1/1 green) |

**Key fix:** upload-contract-document/route.ts switched to service role client for storage operations.

---

## ✅ COMPLETE: Lot Wizard Server Component Refactoring (2026-02-20)

Extracted 2914-line page.tsx into `lot-creation-form.tsx` (client) + `page.tsx` (server).

---

## ✅ COMPLETE: Independent Lots Address Display Fix (2026-02-20)

Batch address fetch in `lot.repository.ts:findByTeam()` after JOIN removal optimization.

---

## ✅ COMPLETE: Blog Section + SEO (2026-02-19, committed)

6 stories via Ralph. 2 articles published.

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
- [ ] Commiter all changes (cancel modal wiring, E2E tests, unified bucket, lot refactor, contract wizard)
- [ ] Run E2E cancel test to validate: `npx vitest run --config tests/e2e/vitest.e2e.config.ts tests/e2e/intervention-workflow.e2e.ts`
- [ ] Plan: Unified Document Table migration (current plan in giggly-petting-hickey.md)

### Fonctionnalites a Venir
- [ ] Unified Document Table (documents table replaces 3 separate tables)
- [ ] Stripe Subscription integration (36 user stories ready)
- [ ] Google Maps Integration Phase 2-3
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible

---

## Metriques Systeme (Mise a jour 2026-02-21)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **167** (+2: RLS standalone lots fix, unified documents bucket) |
| **API Routes** | **114** (10 domaines) |
| **Pages** | **89** |
| **Composants** | **365** |
| **Hooks** | **70** |
| **Services domain** | **33** |
| **Repositories** | **19** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **57** (+11: #047-#057, E2E patterns + storage) |
| **systemPatterns.md Patterns** | **29** |
| **E2E Test Files** | **8** (smoke, building, lot, contract, 4 intervention) |
| **E2E Page Objects** | **8** (dashboard, login, 3 wizards, 3 intervention) |
| **E2E Total Tests** | **25+** (wizard tests) + intervention workflow tests |
| **Unit Test Files** | **7** (intervention mappers/permissions/schemas/status/location, quote-status, vat) |
| **Integration Test Files** | **4** (assignments, create, quotes, transitions) |
| **Blog articles** | **2** (Jan 2026, Feb 2026) |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `875bd28` | feat(e2e+docs): E2E testing infrastructure V2, unified documents bucket, lot wizard refactor |
| `9ca9940` | feat(blog): complete blog section — 6 stories, ~15 files (Ralph methodology) |
| `eb0aa6f` | feat(seo): landing page SEO/CRO optimization — score 52 to 78/100 (13 stories) |

---

*Derniere mise a jour: 2026-02-21 (Cancel modal wired, E2E cancel test un-skipped)*
*Focus: Cancel modal functional, intervention workflow feature-complete*

## Files Recently Modified
### 2026-02-21 21:12:59 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/tasks/prd.json`
- `C:/Users/arthu/Desktop/Coding/Seido-app/tasks/progress.txt`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.env.example`
