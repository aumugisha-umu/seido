# SEIDO Active Context

## Focus Actuel
**Objectif:** Auth migration complete + Guide utilisateur + Email enhancements + RLS fix
**Branch:** `preview`
**Sprint:** Post-Stripe polish, auth consistency, content (Feb 2026)
**Derniere analyse:** requireRole → getServerAuthContext migration complete, 87 learnings in AGENTS.md — 2026-02-26

---

## ✅ COMPLETE: requireRole → getServerAuthContext Migration (2026-02-26)

Migrated ALL remaining `requireRole()` calls in app pages/layouts/actions to modern helpers:

| File | Pattern |
|------|---------|
| `app/admin/layout.tsx` | `getServerAuthContext('admin')` |
| `app/admin/(with-navbar)/layout.tsx` | `getServerAuthContext('admin')` |
| `app/proprietaire/layout.tsx` | `getServerAuthContext('proprietaire')` |
| `app/proprietaire/dashboard/page.tsx` | `getServerAuthContext('proprietaire')` |
| `app/proprietaire/interventions/page.tsx` | `getServerAuthContext('proprietaire')` |
| `app/proprietaire/biens/page.tsx` | `getServerAuthContext('proprietaire')` |
| `app/gestionnaire/(with-navbar)/dashboard/actions.ts` | `getServerActionAuthContextOrNull('gestionnaire')` |

**Result:** Zero `requireRole` usage left in `app/` (except comments and lib files).
**New learning:** AGENTS.md #087

---

## ✅ COMPLETE: Guide Utilisateur In-App (2026-02-25)

`/gestionnaire/aide` — 9 sections, 20 FAQ, search with fuzzy matching.

---

## ✅ COMPLETE: RLS Fix — team_members source of truth (2026-02-25)

`get_accessible_*_ids()` functions now use `team_members` instead of stale `users.team_id`.
Learnings #084-#086 in AGENTS.md.

---

## ✅ COMPLETE: Email Enhancements (2026-02-25)

Attachment preview modal, blacklist API, thread batch-linking, storage RLS tightening.

---

## ✅ COMPLETE: Stripe Subscription Integration (2026-02-22)

48 stories + 13 debugging fixes + 6 audit fixes. Full billing system with trial management.

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
- [ ] Merge preview to main (PR creation)
- [ ] Plan: Google Maps Integration Phase 2-3
- [ ] Plan: More blog articles (content marketing pipeline)

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2-3
- [ ] More blog articles (content marketing pipeline)
- [ ] PPR activation quand Next.js canary disponible
- [ ] Dashboard analytics avance

---

## Metriques Systeme (Mise a jour 2026-02-26)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **175** (+1: RLS team_members fix) |
| **API Routes** | **120** |
| **Pages** | **90** (+1: guide utilisateur) |
| **Composants** | **381** |
| **Hooks** | **70** |
| **Services domain** | **34** |
| **Repositories** | **21** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **87** (+1: #087 auth migration) |
| **systemPatterns.md Patterns** | **29** |
| **E2E Test Files** | **8** |
| **Blog articles** | **2** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `557e447` | fix(pwa): restrict notification modal to authenticated app routes only |
| `8e03601` | docs: compound learnings — RLS team_members source of truth (#084-#086) |
| `107b327` | feat(aide+rls): in-app user guide, email enhancements, fix RLS team access |
| `7a4af58` | feat(mail+docs): email module enhancements + architecture docs overhaul |
| `c6300de` | feat(mail): redesign link-to-entity dialog with UnifiedModal + MD3 filter chips + inbox count fix |

---

*Derniere mise a jour: 2026-02-26 (requireRole migration complete)*
*Focus: Auth consistency complete, ready for next features*

## Files Recently Modified
### 2026-02-26 19:41:08 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/AGENTS.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/docs/learnings/2026-02-26-subscription-limit-false-positive-retrospective.md`
- `C:/Users/arthu/.claude/projects/C--Users-arthu-Desktop-Coding-Seido-app/memory/MEMORY.md`
