# SEIDO Active Context

## Focus Actuel
**Objectif:** Data Invalidation Broadcast + UX Improvements
**Branch:** `preview`
**Sprint:** Real-time sync + UX polish (Mar 2026)
**Derniere analyse:** Data invalidation broadcast system — Supabase Broadcast for cross-team cache sync, onboarding auto-expand, sticky tabs — 2026-03-15

---

## ✅ COMPLETE: Data Invalidation Broadcast (2026-03-15)

Supabase Broadcast-based system for real-time cross-team data synchronization.
- **Architecture:** Team channel `seido-team:{teamId}` for invalidation broadcasts (separate from per-user channel)
- **Core:** `lib/data-invalidation.ts` (types) + `contexts/realtime-context.tsx` (channel + API)
- **Hooks wired:** use-buildings, use-manager-stats, use-team-contacts, use-contacts-data, use-interventions
- **Mutation sites:** 12+ forms/detail pages broadcast invalidation (buildings, lots, contacts, interventions, contracts)
- **Debounce:** Batch-debounced dispatch (500ms window, handler called at most once per batch)
- **UX:** Onboarding auto-expand on dashboard, sticky tabs in creation wizards
- **Learnings:** #142-144 (batch debounce, broadcast vs postgres_changes, channel scoping)
- **Remaining:** Task 10 — remove 68 dead revalidatePath/revalidateTag calls (deferred)

---

## ✅ COMPLETE: Claude Code Ecosystem Optimization (2026-03-14)

Major restructuring of the entire `.claude/` ecosystem for consistency and reliability:
- **CLAUDE.md compressed** from 487→164 lines (INTERDICTIONS at top, skill routing, parallel execution protocol)
- **23 skills enriched** with Code Craftsmanship Standards hooks (before/while/after writing code)
- **8 agents enriched** with SEIDO-specific learnings and AGENTS.md references
- **4 new skills** created: sp-release, sp-monitoring, sp-a11y, sp-analytics
- **Safety hooks**: block-dangerous-commands.js, block-secret-writes.js (PreToolUse)
- **Quality gate**: Added Step 2.5 (Simplify Quick-Scan) + Step 4.5 (Knowledge Capture)
- **Parallel execution**: sp-dispatching-parallel-agents rewritten with full worktree lifecycle
- **Global blueprint**: `.claude/claude-code-global-blueprint.md` for replication to other projects
- **Extracted to rules/**: seido-reference.md, feature-reference.md (conditional loading)
- **Extracted to skill**: sp-orchestration (trigger matrix, chains, compound methodology)

---

## ✅ COMPLETE: Import Review + Simplify + Deferred Geocoding (2026-03-14)

3/3 stories passed. Import wizard bug fixes, code simplification, geocoding deferred to after().
- 7 bugs fixed (auth wrapper, SSE error handling, AbortController, setMonth overflow, phase index)
- Shared validators/utils.ts extracted (mapZodErrorToCode, normalizeCountry, normalizePhone)
- Dead code removed (~150 lines COLUMN_MAPPING, /api/import/execute/ route)
- Geocoding moved to next/server after() — non-blocking post-response

---

## ✅ COMPLETE: Supplier Contracts (2026-03-11)

Supplier contracts linked to buildings/lots with full CRUD.
- DB: `supplier_contracts` + `supplier_contract_documents` tables (3 migrations)
- Repository: `supplier-contract.repository.ts` (4 query methods with FK-disambiguated nested selects)
- UI: `supplier-contract-card.tsx` (person name + purple company badge)

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
- [ ] Dead revalidation cleanup — remove 68 dead revalidatePath/revalidateTag calls (9 files)
- [ ] Manual testing: verify invalidation broadcast works across 2 tabs/devices
- [ ] Deploy preview branch and validate data sync in production

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] Locataire lot details page (plan in docs/plans/)
- [ ] Landing page AI redesign (plan in docs/plans/)
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible
- [ ] Dashboard analytics avance
- [ ] WhatsApp agent integration (plan in docs/AI/)

---

## Metriques Systeme (Mise a jour 2026-03-15)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **46** |
| **Migrations** | **193** |
| **API Routes** | **121** |
| **Pages** | **90** |
| **Composants** | **390+** |
| **Hooks** | **71** |
| **Services domain** | **35** |
| **Repositories** | **23** |
| **DB Functions** | **80** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **144** (+3 since Mar 14: #142-#144) |
| **Blog articles** | **23** |
| **Retrospectives** | **40** |
| **.claude/ Skills** | **23** |
| **.claude/ Agents** | **15** |
| **.claude/ Rules** | **5** |
| **.claude/ Scripts** | **5** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `0be45d6` | feat: data invalidation broadcast + onboarding auto-expand + sticky tabs |
| `f82240f` | feat: onboarding topbar lift-up + WhatsApp webhook scaffold + Google Maps layout fix |
| `d157c0e` | feat(claude): ecosystem optimization + import review + deferred geocoding |
| `2fbb24d` | feat(skills): embed Code Craftsmanship Standards into upstream skills |
| `d11519c` | feat(analytics): replace Contentsquare with Microsoft Clarity |

---

*Derniere mise a jour: 2026-03-15 (data invalidation broadcast + UX improvements)*
*Focus: Real-time cross-team data synchronization + onboarding UX*

## Files Recently Modified
### 2026-03-15 21:24:46 (Auto-updated)
- `C:/Users/arthu/.claude/plans/shimmering-giggling-russell.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/lib/services/repositories/lot.repository.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
