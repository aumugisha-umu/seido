# SEIDO Active Context

## Focus Actuel
**Objectif:** Email private/shared visibility feature - plumbing connected, testing next
**Branch:** `preview`
**Sprint:** Email integration + platform improvements (Mar 2026)
**Derniere analyse:** Email section cleanup + visibility plumbing — 2026-03-19

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
- [ ] Test email visibility end-to-end (private vs shared connections)
- [ ] Remaining email visibility stories in prd.json
- [ ] Dead revalidation cleanup -- remove 68 dead revalidatePath/revalidateTag calls (9 files)
- [ ] Deploy preview branch and validate data sync in production

### Fonctionnalites a Venir
- [ ] Email Visibility Phase 2 (sharing UI, permission management)
- [ ] Google Maps Integration Phase 2-3
- [ ] Locataire lot details page (plan in docs/plans/)
- [ ] Landing page AI redesign (plan in docs/plans/)
- [ ] More blog articles (content marketing pipeline)
- [ ] Dashboard analytics avance
- [ ] WhatsApp agent integration (plan in docs/AI/)

---

## Metriques Systeme (Mise a jour 2026-03-19)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **46** |
| **Migrations** | **199** |
| **API Routes** | **129** |
| **Pages** | **78** |
| **Composants** | **412** |
| **Hooks** | **65** |
| **Services domain** | **39** |
| **Repositories** | **23** |
| **DB Functions** | **80** |
| Statuts intervention | 9 |
| Statuts devis (DB enum) | **7** |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **163** (+5 since Mar 18: #159-#163) |
| **Blog articles** | **23** |
| **Retrospectives** | **48** |
| **.claude/ Skills** | **23** |
| **.claude/ Agents** | **15** |
| **.claude/ Rules** | **5** |
| **.claude/ Scripts** | **5** |

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `9863159` | fix: remove proprietaire from provider categories dropdown |
| `2914b62` | update: improve building/lot creation forms and sync memory |
| `4c41d87` | feat: add Airtable-style overlay sidebar on hover |
| `37fa042` | update: align contact role terminology and fix related issues |
| `039b4d0` | update: sync last sync timestamp and update contact role terminology |

---

*Derniere mise a jour: 2026-03-19 (email section cleanup + visibility plumbing)*
*Focus: Email private/shared visibility testing + remaining stories*

## Files Recently Modified
### 2026-03-20 03:35:54 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/app/api/cron/intervention-reminders/route.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/app/api/cron/recurrence-scan/route.ts`
