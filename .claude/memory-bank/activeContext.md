# SEIDO Active Context

## Focus Actuel
**Objectif:** Supplier Contracts Feature + Intervention Planner Refactoring
**Branch:** `feature/ai-phone-assistant`
**Sprint:** Supplier Contracts + Intervention Planner (Mar 2026)
**Derniere analyse:** PostgREST FK fix + supplier card display + compound learnings #133-#134 — 2026-03-11

---

## 🚧 EN COURS: Supplier Contracts (2026-03-11)

New feature: supplier contracts linked to buildings/lots with full CRUD.
- DB: `supplier_contracts` + `supplier_contract_documents` tables (3 migrations)
- Repository: `supplier-contract.repository.ts` (4 query methods with FK-disambiguated nested selects)
- Service: `supplier-contract.service.ts`
- UI: `supplier-contract-card.tsx` (person name + purple company badge), `building-contracts-tab.tsx`
- Wizard: `supplier-contracts-step.tsx`, `supplier-confirmation-step.tsx`
- **PostgREST FK fix**: `!fk_users_company` hint for `users→companies` nested select (PGRST201)
- **Card display**: Person name primary + company badge (matching contact-card-compact pattern)

---

## ✅ COMPLETE: Intervention Planner Refactoring (2026-03-11)

Extracted shared `InterventionPlannerStep` from `LeaseInterventionsStep` (540→345 lines).
6/6 stories passed. Reusable for supplier contract reminders with configurable roles.
- Design: `docs/plans/2026-03-11-intervention-planner-refactoring.md`
- New files: `intervention-planner-step.tsx`, `intervention-planner.types.ts`, `assignable-roles.ts`, `supplier-interventions.ts`

---

## ✅ COMPLETE: Blog Hub/Cluster Redesign (2026-03-11)

23 blog articles (Jan/Feb/Mar 2026 Belgian real estate news).
Hub-cluster architecture with `hub` field linking cluster articles to their hub.
AGENTS.md learnings #130-#132.

---

## ✅ COMPLETE: AI Phone Assistant Phase 1 (2026-03-09)

13 stories: webhook hardening, email notifications, AI phone call integration.
Retrospective: `docs/learnings/2026-03-09-ai-phone-webhook-fallback-retrospective.md`

---

## ✅ COMPLETE: Email Section Refonte Phase 1 (2026-03-06)

12 stories: counts system, navigation, dead code cleanup.
Retrospective: `docs/learnings/2026-03-06-email-refonte-phase1-retrospective.md`

---

## ✅ COMPLETE: Performance Optimization TIER 1+2 (2026-03-02)

13 stories from 6-agent audit (96 findings consolidated).
New AGENTS.md learnings: #105-#110.
Retrospective: `docs/learnings/2026-03-02-performance-optimization-tier1-tier2-retrospective.md`

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
- [ ] Complete intervention planner refactoring (6 stories in prd.json)
- [ ] Finalize supplier contracts feature
- [ ] Commit + push feature/ai-phone-assistant branch (git*)

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] Locataire lot details page (plan in docs/plans/)
- [ ] Landing page AI redesign (plan in docs/plans/)
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible
- [ ] Dashboard analytics avance

---

## Metriques Systeme (Mise a jour 2026-03-11)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **46** (+2: supplier_contracts, supplier_contract_documents) |
| **Migrations** | **193** (+15 since last update) |
| **API Routes** | **121** (+1: upload-supplier-contract-document) |
| **Pages** | **90** |
| **Composants** | **390+** |
| **Hooks** | **71** |
| **Services domain** | **35** (+1: supplier-contract.service) |
| **Repositories** | **23** (+2: supplier-contract, supplier-contract-document) |
| **DB Functions** | **80** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **134** (+24 since Mar 02: #111-#134) |
| **Blog articles** | **23** (+21 since last update) |
| **Retrospectives** | **39** |

---

## Commits Recents (feature/ai-phone-assistant branch)

| Hash | Description |
|------|-------------|
| `c228627` | fix(intervention): update "Traiter la demande" label |
| `7c7b9e7` | feat(landing+blog): landing page redesign plan, blog hub-cluster articles |
| `0e77737` | feat(ui): move Load More button inline with pagination |
| `48914a1` | feat(wizard): harmonize document/intervention wizard sections |
| `334fe71` | feat(ui): restore card views and default cards across all navigators |
| `f855295` | feat(ai-phone): AI Phone Assistant Phase 1 — 13 stories |

---

*Derniere mise a jour: 2026-03-11 (supplier contracts FK fix + card display + compound #133-#134)*
*Focus: Supplier Contracts + Intervention Planner Refactoring*

## Files Recently Modified
### 2026-03-11 22:30:16 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/systemPatterns.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/techContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/productContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/projectbrief.md`
