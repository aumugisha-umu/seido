# SEIDO Active Context

## Focus Actuel
**Objectif:** Stripe Subscription Integration Complete + Billing Audit Fixes
**Branch:** `feature/stripe-subscription`
**Sprint:** Stripe Billing + Lot Access Restriction (Feb 2026)
**Derniere analyse:** Billing audit fixes complete, 77 learnings in AGENTS.md — 2026-02-22

---

## ✅ COMPLETE: Stripe Subscription Integration (2026-02-21/22)

Full billing system with trial management, subscription gates, and billing UI:

| Category | Details |
|----------|---------|
| **Stories** | 48 billing stories + 13 debugging fixes + 6 audit fixes |
| **Test Coverage** | 249 test cases (218 unit + 15 integration + 16 E2E) |
| **DB Migrations** | 4 (subscriptions, stripe_customers, stripe_invoices, webhook_events) |
| **UI Components** | 11 billing components in components/billing/ |
| **CRON Jobs** | 4 (trial-expiration, trial-notifications, behavioral-triggers, cleanup-webhook-events) |
| **Webhook Handler** | 8 Stripe event types supported |
| **Services** | SubscriptionService with lazy sync from Stripe API |

**Key Features:**
- Trial management (14-day trial, 2 properties free)
- Subscription gates (server-side on lot detail/edit, building detail interventions)
- Trial overage banner (dismissible, amber theme)
- Locked lot cards (semi-transparent overlay + "Déverrouiller" button)
- Intervention action guards on locked lots
- Billing settings page with Stripe portal integration

**New Patterns:**
- Layered fail: service-level = fail-closed, page-level = fail-open
- CRUD access checklist when restricting entities
- canAddProperty(count) for batch quota checks
- CSS overlay for locked card dimming (not parent opacity)

---

## ✅ COMPLETE: Billing Audit Fixes (2026-02-22)

6 stories fixing critical gaps discovered during TDD audit:

| Story | Title | Fix |
|-------|-------|-----|
| US-049 | mapStripeStatus consolidation | Single source in subscription-helpers.ts |
| US-050 | Paused status handling | Added to checkReadOnly/checkCanAddProperty |
| US-051 | Lot edit page gate | Added subscription check |
| US-052 | updateCompleteProperty quota check | canAddProperty(count) for multi-lot ops |
| US-053 | getAccessibleLotIds fail-closed | Return empty array on error (security) |
| US-054 | BillingErrorBoundary + hasError | Graceful degradation in useSubscription |

**AGENTS.md:** 77 learnings total (was 71). New #072-#077.

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
- [ ] Run full test suite to validate Stripe integration: `npm test && npm run test:integration && npm run test:e2e`
- [ ] Merge feature/stripe-subscription to main (PR creation)
- [ ] Plan: Google Maps Integration Phase 2-3
- [ ] Plan: More blog articles (content marketing pipeline)

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible
- [ ] Dashboard analytics avancé

---

## Metriques Systeme (Mise a jour 2026-02-22)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **174** (+7: 4 Stripe, 2 trial init, 1 signup fix) |
| **API Routes** | **120** (+6: 4 CRON, 1 webhook, 1 settings) |
| **Pages** | **89** (+1: billing settings) |
| **Composants** | **381** (+11: billing UI) |
| **Hooks** | **70** (+2: useSubscription, useStrategicNotification) |
| **Services domain** | **34** (+2: subscription, subscription-email) |
| **Repositories** | **21** (+2: subscription, stripe-customer) |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **77** (+6: #072-#077, Stripe billing patterns) |
| **systemPatterns.md Patterns** | **29** |
| **E2E Test Files** | **8** (smoke, building, lot, contract, 4 intervention) |
| **E2E Page Objects** | **8** (dashboard, login, 3 wizards, 3 intervention) |
| **E2E Total Tests** | **25+** (wizard tests) + intervention workflow tests |
| **Unit Test Files** | **12** (+5: Stripe tests) |
| **Integration Test Files** | **5** (+1: Stripe) |
| **Blog articles** | **2** (Jan 2026, Feb 2026) |

---

## Commits Recents (feature/stripe-subscription branch)

| Hash | Description |
|------|-------------|
| `78b1a37` | feat(stripe): billing audit fixes + lot access restriction + trial overage banner |
| `12e0ee2` | feat(stripe): TDD plan with 48 stories, deep audit, Stripe setup complete |
| `875bd28` | feat(e2e+docs): E2E testing infrastructure V2, unified documents bucket, lot wizard refactor |
| `9ca9940` | feat(blog): complete blog section — 6 stories, ~15 files (Ralph methodology) |

---

*Derniere mise a jour: 2026-02-22 (Stripe subscription integration complete)*
*Focus: Stripe billing feature-complete, ready to merge*

## Files Recently Modified
### 2026-02-23 19:12:45 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/app/gestionnaire/(with-navbar)/mail/components/mailbox-sidebar.tsx`
