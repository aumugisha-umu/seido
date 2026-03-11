# SEIDO Active Context

## Focus Actuel
**Objectif:** Performance Optimization TIER 1+2 complete + Post-creation redirect UX + Compound learnings
**Branch:** `preview`
**Sprint:** Performance optimization + UX polish (Mar 2026)
**Derniere analyse:** 13 stories performance optimization + 7 new AGENTS.md learnings (#104-#110) — 2026-03-02

---

## ✅ COMPLETE: Performance Optimization TIER 1+2 (2026-03-02)

13 stories from 6-agent audit (96 findings consolidated):
- **US-001**: Composite index on conversation_participants (thread_id, user_id)
- **US-002**: Removed redundant auth checks in 4 server action files (~80 lines, ~16 queries/action)
- **US-003/004/006**: Parallelized 11 Server Component pages (Phase 0 → Wave 1 → Wave 2 pattern)
- **US-005**: Parallelized create-manager-intervention API
- **US-007/008**: Batch operations (contract rent reminders 72→18 queries, contact insertion N→1)
- **US-009**: Deferred invitation emails via `after()` from next/server
- **US-010**: Removed ~85 dead revalidation calls (~120 lines)
- **US-011**: Cached Stripe subscription info (unstable_cache, 15min TTL, webhook invalidation)
- **US-012**: RPC for thread unread counts (15 queries → 1 RPC call)
- **US-013**: Stats head:true optimization + contrats page after()

New AGENTS.md learnings: #105-#110
Retrospective: `docs/learnings/2026-03-02-performance-optimization-tier1-tier2-retrospective.md`

---

## ✅ COMPLETE: Post-Creation Redirect UX (2026-03-02)

4 one-line edits: immeuble, lot (single+multi), contact standalone now redirect to detail page after creation.
Removed redundant `router.refresh()` after `router.push()`.
AGENTS.md learning #104.

---

## ✅ COMPLETE: Slot-Count Business Logic + Confirmation Fix (2026-03-01)

`isMultiSlot` derivation: 1 slot = optional confirmation (Date fixe behavior), 2+ = mandatory.
Non-invited contacts: confirmation logic fix.
AGENTS.md learnings #101-#103.

---

## ✅ COMPLETE: Subscription Billing + Onboarding Polish (2026-03-01)

- Enhanced billing interval handling (monthly/yearly display)
- Onboarding checklist: swapped steps 2↔3, hid useless building option
- Removed beta access gate from signup page

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
- [ ] Commit + push preview branch (git*)
- [ ] Merge preview to main (PR creation)
- [ ] Deploy + verify performance improvements in production

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] AI Phone Assistant (design doc in docs/AI/)
- [ ] Locataire lot details page (plan in docs/plans/)
- [ ] Landing page AI redesign (plan in docs/plans/)
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible
- [ ] Dashboard analytics avance

---

## Metriques Systeme (Mise a jour 2026-03-02)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **178** (+2: conversation_participants index, unread counts RPC) |
| **API Routes** | **120** |
| **Pages** | **90** |
| **Composants** | **381** |
| **Hooks** | **71** |
| **Services domain** | **34** |
| **Repositories** | **21** |
| **DB Functions** | **80** (+1: get_thread_unread_counts) |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **110** (+15: #096-#103 slot/billing, #104 redirect, #105-#110 perf) |
| **systemPatterns.md Patterns** | **32** (+3: parallelization, after(), RLS-as-auth) |
| **E2E Test Files** | **8** |
| **Blog articles** | **2** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `82869f1` | feat(subscription): enhance billing interval handling and update UI components |
| `6d3077f` | fix(onboarding+lots): swap checklist steps 2↔3 and hide useless building option |
| `27ffa30` | fix(auth): remove beta access gate from signup page |
| `89cea06` | fix(interventions): confirmation logic for non-invited contacts + slot-count business rules |
| `e16cbe7` | fix(billing+mail+auth+storage): subscription limit fix, mail cleanup, auth migration, bucket unification |

---

*Derniere mise a jour: 2026-03-02 (performance optimization TIER 1+2 complete)*
*Focus: 13 stories perf optimization + post-creation redirect UX + 110 learnings in AGENTS.md*

## Files Recently Modified
### 2026-03-11 00:05:29 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/AGENTS.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/docs/learnings/2026-03-11-blog-hub-cluster-redesign-retrospective.md`
