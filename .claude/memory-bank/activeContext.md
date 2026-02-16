# SEIDO Active Context

## Focus Actuel
**Objectif:** Intervention Workflow Polish — 7 themes, 40 files (EN COURS, non-commité)
**Branch:** `preview`
**Sprint:** Multi-Team Support + Intervention Workflow + Compound Engineering (Jan-Feb 2026)
**Derniere analyse:** Audit complet des 40 fichiers non-commités — 2026-02-16

---

## 🚧 EN COURS: Intervention Workflow Polish (40 files, non-commité)

### Vue d'Ensemble
Refactoring majeur du workflow intervention en 7 themes interconnectés :

### Theme 1: Suppression `demande_de_devis` (COMPLET)
Actions de devis basées sur `requires_quote` flag, pas sur un statut d'intervention.
- **Files:** intervention-action-buttons.tsx, intervention-action-utils.ts, intervention-alert-utils.ts, intervention-action-styles.ts

### Theme 2: Migration `approved` → `accepted` (COMPLET)
DbQuoteStatus aligné sur le vrai enum DB (7 valeurs: draft, pending, sent, accepted, rejected, expired, cancelled).
- **Files:** quote-status-mapper.ts, quote-card.tsx, integrated-quotes-*.tsx, intervention-preview.types.ts, quotes-card.tsx

### Theme 3: Finalization-context API refactoring (COMPLET)
Nested PostgREST select → 6 requêtes parallèles séparées (pattern AGENTS.md #004).
- **Files:** finalization-context/route.ts

### Theme 4: Quote submission simplification (COMPLET)
Logique time slots retirée du formulaire de devis (-726 lignes). Time slots gérés via Planning tab.
- **Files:** quote-submission-form.tsx, quote-submission-modal.tsx, intervention-quote-submit/route.ts

### Theme 5: InterventionDetailsCard enrichi (COMPLET)
Nouvelles props pour le prestataire (slot response, quote modal, pending slots, sections filter).
- **Files:** intervention-details-card.tsx, intervention-preview.types.ts

### Theme 6: Dashboard simplification (COMPLET)
PendingActionsSection supprimé. Menu "Gérer devis" ajouté en list view.
- **Files:** dashboards (3), interventions-list-view-v1.tsx, intervention-card.tsx

### Theme 7: Quote modals + UI polish (COMPLET)
QuoteApprovalModal/QuoteRejectionModal, UnifiedModalHeader badge prop, labels unifiés.
- **Files:** detail-client (3 rôles), unified-modal, time-slot-utils, participants-row

### Fix: Finalization Modal Planning (COMPLET)
`'confirmed'` → `'selected'`, `selected_by_manager`, slot count filtering.

### Nouveaux Learnings (AGENTS.md #035-#038)
- #035: Time slot status 'selected' not 'confirmed'
- #036: Quote actions must be flag-based, not status-based
- #037: DB quote status is 'accepted' not 'approved'
- #038: Separate queries for finalization-context API (RLS safety)

---

## ✅ COMPLETE: Voice Recorder + Documents + Reports Card (2026-02-12)
[Collapsed — see progress.md for details]

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
                        -> rejected (terminal négatif)
                        -> expired (terminal timeout)
                        -> cancelled (terminal annulé)
```

---

## Multi-Equipe - Etat Actuel
Phases 5-11 complètes (voir progress.md).

---

## Prochaines Etapes

### A faire immédiatement
- [ ] Vérifier build complet (`npm run build`)
- [ ] Commiter les 40 fichiers non-commités (git*)

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] PPR activation quand Next.js canary disponible

---

## Metriques Systeme (Mise a jour 2026-02-16)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **165** |
| **API Routes** | **114** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **362** |
| **Hooks** | **68** |
| **Services domain** | **33** |
| **Repositories** | **19** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** (draft, pending, sent, accepted, rejected, expired, cancelled) |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **38** (+3) |
| **systemPatterns.md Patterns** | **29** |
| **Shared Cards** | **15** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `d540064` | fix(planning-tab): fix layout overlap and reorder Planning before Estimation |
| `cc750d3` | fix(quotes): bulk cancel all pending quotes when toggling off estimation |
| `2d6c07b` | feat(intervention): voice recorder, document handlers, reports card + security migrations |

---

*Derniere mise a jour: 2026-02-16 (audit complet 40 fichiers)*
*Focus: Intervention Workflow Polish — 7 themes, prêt pour commit*

## Files Recently Modified
### 2026-02-16 15:28:19 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/AGENTS.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/tasks/progress.txt`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/activeContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/techContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/progress.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/systemPatterns.md`
- `C:/Users/arthu/.claude/projects/C--Users-arthu-Desktop-Coding-Seido-app/memory/MEMORY.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/docs/learnings/2026-02-16-intervention-workflow-polish-retrospective.md`
