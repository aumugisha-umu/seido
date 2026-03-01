# SEIDO Active Context

## Focus Actuel
**Objectif:** Document preview/download unification complete + Auth migration + Guide utilisateur + Email enhancements + RLS fix
**Branch:** `preview`
**Sprint:** Post-Stripe polish, auth consistency, UX unification (Feb 2026)
**Derniere analyse:** Unify Document Preview & Download (4 stories via Ralph) complete, 95 learnings in AGENTS.md — 2026-02-26

---

## ✅ COMPLETE: Unify Document Preview & Download (2026-02-26)

Created shared `useDocumentActions` hook replacing ~160 lines of duplicate logic across 3 role views.
All roles now use in-app `DocumentPreviewModal` (locataire/prestataire had `window.open` before).
Downloads use server-side `Content-Disposition: attachment` via API route.
Learnings #093-#095 in AGENTS.md.

---

## ✅ COMPLETE: Storage Bucket Fix + RLS Auth UID (2026-02-26)

Fixed 404 "Bucket not found" by migrating remaining code paths from `intervention-documents` to `documents` bucket.
Fixed RLS `auth.uid()` vs `users.id` mismatch in storage policies via `get_my_profile_ids()`.
Reverted service role bypasses in 3 upload routes back to authenticated client.

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
- [ ] Commit + push preview branch (git*)
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
| **Migrations** | **176** (+2: RLS team_members fix, storage auth fix) |
| **API Routes** | **120** |
| **Pages** | **90** (+1: guide utilisateur) |
| **Composants** | **381** |
| **Hooks** | **71** (+1: useDocumentActions) |
| **Services domain** | **34** |
| **Repositories** | **21** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **95** (+8: #088-#092 billing, #093-#095 document preview) |
| **systemPatterns.md Patterns** | **29** |
| **E2E Test Files** | **8** |
| **Blog articles** | **2** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `e16cbe7` | fix(billing+mail+auth+storage): subscription limit fix, mail cleanup, auth migration, bucket unification |
| `557e447` | fix(pwa): restrict notification modal to authenticated app routes only |
| `8e03601` | docs: compound learnings — RLS team_members source of truth (#084-#086) |
| `107b327` | feat(aide+rls): in-app user guide, email enhancements, fix RLS team access |
| `7a4af58` | feat(mail+docs): email module enhancements + architecture docs overhaul |

---

*Derniere mise a jour: 2026-02-26 (document preview unification complete)*
*Focus: Unification complete, ready to commit + merge preview to main*

## Files Recently Modified
### 2026-03-01 12:46:39 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/docs/AI/ai-phone-assistant-plan.md`
