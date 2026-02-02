# SEIDO Active Context

## Focus Actuel
**Objectif:** PWA Notification Prompt - Modale de rappel à chaque ouverture
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan-Feb 2026)
**Dernière analyse:** PWA Notification Prompt Implementation - 2026-02-02

---

## ✅ COMPLETE: Quote Notifications Multi-Canal (2026-02-02)

### Contexte

Audit complet du système de notifications pour les devis (quotes). Identification et correction de gaps critiques où les notifications push et in-app étaient manquantes.

### État Avant/Après

| Route | Avant | Après |
|-------|-------|-------|
| `intervention-quote-request` | ❌❌❌ | ✅✅✅ (Email + In-App + Push) |
| `intervention-quote-submit` | ✅✅❌ | ✅✅✅ (Push ajouté) |
| `quotes/[id]/approve` | ✅❌❌ | ✅✅✅ (In-App + Push ajoutés) |
| `quotes/[id]/reject` | ✅❌❌ | ✅✅✅ (In-App + Push ajoutés) |

### Nouvelles Actions Créées

| Action | Description |
|--------|-------------|
| `notifyQuoteRequested` | In-app + Push pour prestataire quand demande de devis |
| `notifyQuoteApproved` | In-app + Push pour prestataire quand devis approuvé |
| `notifyQuoteRejected` | In-app + Push pour prestataire quand devis refusé |
| `notifyQuoteSubmittedWithPush` | In-app + Push pour gestionnaires quand devis soumis |

### Helpers Créés

| Helper | Description |
|--------|-------------|
| `getInterventionUrlForRole()` | Retourne l'URL d'intervention selon le rôle (locataire/prestataire/gestionnaire) |
| `sendRoleAwarePushNotifications()` | Envoie push avec URLs adaptées par rôle des destinataires |

### Bug Fix: URLs Push Notifications

**Problème:** Les push notifications pointaient toujours vers `/gestionnaire/interventions/...` même pour locataires et prestataires.

**Solution:** Nouvelle fonction `sendRoleAwarePushNotifications()` qui :
1. Groupe les notifications par rôle (`metadata.assigned_role`)
2. Envoie les push avec l'URL appropriée pour chaque rôle

| Rôle | URL |
|------|-----|
| locataire | `/locataire/interventions/{id}` |
| prestataire | `/prestataire/interventions/{id}` |
| gestionnaire | `/gestionnaire/interventions/{id}` |

### Fichiers Modifiés

| Fichier | Modification |
|---------|-------------|
| `app/actions/notification-actions.ts` | +4 nouvelles actions (280 lignes) |
| `app/api/intervention-quote-request/route.ts` | Ajout bloc notifications complet |
| `app/api/intervention-quote-submit/route.ts` | Migration vers `notifyQuoteSubmittedWithPush` |
| `app/api/quotes/[id]/approve/route.ts` | Ajout `notifyQuoteApproved` |
| `app/api/quotes/[id]/reject/route.ts` | Ajout `notifyQuoteRejected` |

---

## ✅ COMPLETE: PWA Notification Prompt (2026-02-02)

### Contexte

L'application PWA doit maximiser le taux d'activation des notifications. Quand l'utilisateur ouvre l'app PWA (mode standalone) et que les notifications ne sont pas activées, une modale l'invite à les activer.

### Comportement Implémenté

| Événement | Action |
|-----------|--------|
| **Installation PWA** | Auto-demande permission (existant, conservé) |
| **Ouverture PWA + notif désactivées** | Modale de rappel à chaque ouverture |
| **Permission "denied"** | Guide vers paramètres système (iOS, Chrome, etc.) |
| **Changement dans paramètres** | Auto-détection au focus + subscription automatique |

### Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `hooks/use-notification-prompt.tsx` | Hook de détection (isPWA, permission, user) |
| `components/pwa/notification-permission-modal.tsx` | Modal UI avec bénéfices par rôle |
| `components/pwa/notification-settings-guide.tsx` | Instructions paramètres par plateforme |
| `contexts/notification-prompt-context.tsx` | Provider global |

### Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `app/layout.tsx` | Intégration NotificationPromptProvider |
| `hooks/use-pwa-install-with-notifications.ts` | Amélioration logging (info au lieu d'error si notif skipped) |
| `.claude/memory-bank/systemPatterns.md` | Nouveau pattern #23 documenté |

### Design Document

📄 `docs/plans/2026-02-02-pwa-notification-prompt-design.md`

---

## ✅ COMPLETE: Conversations/Notifications pour Contacts Invités (2026-02-01)

### Contexte

Le système SEIDO permet d'ajouter des contacts à une intervention même sans compte (`auth_id = null`). Ces contacts "informatifs" sont utiles pour la traçabilité mais ne doivent PAS :
- Avoir de conversation individuelle créée
- Être ajoutés aux participants des conversations
- Recevoir de notifications (in-app, push, email)

### Règle Métier Implémentée

| Action | Utilisateur Invité (`auth_id` ✓) | Contact Informatif (`auth_id` ✗) |
|--------|----------------------------------|----------------------------------|
| Affiché dans liste sélection | ✅ | ✅ (avec badge "Non invité") |
| Assigné à intervention | ✅ | ✅ (traçabilité) |
| Thread conversation individuel | ✅ Créé | ❌ Ignoré |
| Ajouté comme participant | ✅ | ❌ |
| Notifications in-app | ✅ | ❌ |
| Notifications push | ✅ | ❌ |
| Notifications email | ✅ | ❌ |

### Points de Filtrage Implémentés

```
Création intervention → .not('auth_user_id', 'is', null) ✓
     ↓
Assignation utilisateur → hasAuthAccount check ✓
     ↓
Lazy thread creation → auth_user_id check ✓
     ↓
addInitialParticipants() → auth_user_id filter ✓ (FIXED during review)
     ↓
getInterventionTenants() → auth_user_id filter ✓ (FIXED during review)
     ↓
Envoi notifications push/email → auth_user_id filter ✓
```

### ⚠️ Bug Fix Session (2026-02-01 17:30)

**Bug:** Conversations non créées après implémentation filtrage
**Root Cause:** Utilisation de `auth_id` au lieu de `auth_user_id` (nom réel de la colonne DB)
**Fix:** Remplacement global `auth_id` → `auth_user_id` dans tous les fichiers

**Bug:** Badge locataire affichait son propre nom au lieu de "Gestionnaires"
**Root Cause:** `conversation-selector.tsx` utilisait `thread.title` pour tous les rôles
**Fix:** Détection `isOwnThread` pour afficher "Gestionnaires" côté locataire/prestataire

### Fichiers Modifiés (13 fichiers)

| Couche | Fichier | Modification |
|--------|---------|--------------|
| **API** | `app/api/create-manager-intervention/route.ts` | Filtre `auth_id` sur tenants/providers |
| **Service** | `lib/services/domain/intervention-service.ts` | Vérification `auth_id` avant création thread + fix `createConversationThreads()` |
| **Service** | `lib/services/domain/conversation-service.ts` | 5 filtres `auth_id` sur managers + fix `addInitialParticipants()` + fix `getInterventionTenants()` |
| **Service** | `lib/services/domain/contract.service.ts` | Ajout `has_account` aux retours |
| **Repository** | `lib/services/repositories/contract.repository.ts` | Ajout `auth_id` aux selects utilisateurs |
| **Actions** | `app/actions/conversation-actions.ts` | Vérification `auth_id` dans lazy creation |
| **Actions** | `app/actions/conversation-notification-actions.ts` | Filtre `auth_id` sur managers |
| **Actions** | `app/actions/contract-actions.ts` | Propagation `has_account` |
| **UI** | `components/intervention/assignment-section-v2.tsx` | Badge "Non invité" + messages info |
| **UI** | `nouvelle-intervention-client.tsx` | Passage `has_account` |
| **UI** | `intervention-edit-client.tsx` | Passage `has_account` (mode édition) |

### Issues Trouvées et Corrigées pendant Code Review

| Issue | Fichier | Correction |
|-------|---------|------------|
| **IMPORTANT #1** | `conversation-service.ts` | `getInterventionTenants()` - Ajout filtre `auth_id` via JOIN |
| **IMPORTANT #2** | `conversation-service.ts` | `addInitialParticipants()` case 'group' - Filtre users avec `auth_id` |
| **IMPORTANT #3** | `conversation-service.ts` | `addInitialParticipants()` case 'provider_to_managers' - Filtre providers |
| **Trouvé pendant vérif** | `intervention-service.ts` | `createConversationThreads()` ligne 2107 - Ajout filtre managers |

### Design Document

📄 `docs/plans/2026-02-01-invited-users-only-conversations-design.md`

---

## ✅ COMPLETE: Auth API Optimization (2026-01-31) - CRITIQUE PERFORMANCE

### Problème
**250+ appels API `/auth/v1/user` en 10 minutes** pour un seul utilisateur connecté.

### Solution
**Principe clé :** Le middleware fait l'unique appel réseau `getUser()`. Les pages utilisent `getSession()` qui lit le JWT localement.

| Fichier | Changement |
|---------|------------|
| `lib/auth-dal.ts` | `getUser()` utilise `getSession()` au lieu de `supabase.auth.getUser()` |
| `lib/services/core/supabase-client.ts` | Ajout `cache()` wrapper sur `createServerSupabaseClient` |
| `hooks/use-auth.tsx` | Flag `initialSessionHandled` pour éviter appels dupliqués |

**Résultat:** 250+ appels → 1 appel par navigation

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

### Creation Intervention avec Conversations

**Ordre critique:**
1. Creer intervention
2. **Creer threads conversation** (AVANT assignments!)
3. Creer assignments (trigger ajoute participants aux threads)
4. Creer time slots

---

## Multi-Equipe - Etat Actuel

### Corrections Appliquees (Phase 7+)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 5 | API routes: `.single()` → `.limit(1)` | ✅ |
| Phase 6 | Browser side: auth-service.ts multi-profil | ✅ |
| Phase 7 | RLS: `get_my_profile_ids()` | ✅ |
| Phase 8 | Conversations: `can_view_conversation()` multi-profil | ✅ |
| Phase 9 | Participants: Trigger `thread_add_managers` | ✅ |
| **Phase 10** | **Filtrage auth_id contacts invités** | ✅ NEW |

---

## Prochaines Etapes

### Conversations - À Surveiller
- [ ] Tester création intervention avec contact invité vs non-invité
- [ ] Vérifier badge "Non invité" dans wizard création
- [ ] Vérifier comportement mode édition intervention
- [ ] Tester notifications email/push pour contacts filtrés

### Google Maps Integration
- [x] Phase 1: Table addresses centralisée ✅
- [x] Phase 4: Map display component (LocalisationTab) ✅
- [ ] Phase 2: Composant AddressInput avec Places API
- [ ] Phase 3: Geocoding service automatique

---

## Metriques Systeme (Mise a jour 2026-02-01)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** (+1 addresses, +3 quotes) |
| **Migrations** | **146+** (+1 individual_conversation_threads) |
| **API Routes** | **113** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **232+** |
| **Hooks** | **64** custom hooks |
| **Services domain** | **32** |
| **Repositories** | **22** |
| Statuts intervention | 9 |
| Triggers conversation | 2 |

---

## Points de Vigilance - Filtrage auth_id

### Pattern à Utiliser

```typescript
// ✅ CORRECT - Filtrer utilisateurs avec compte
const { data: users } = await supabase
  .from('users')
  .select('id')
  .not('auth_id', 'is', null)  // Seulement les utilisateurs invités

// ✅ CORRECT - Vérifier avant création thread
const hasAuthAccount = !!userData?.auth_id
if (!hasAuthAccount) {
  logger.info('Skipping thread creation for non-invited user')
  return
}
```

### Points d'Entrée à Vérifier

Si nouveau code ajoute des participants ou crée des threads :
1. Vérifier que `.not('auth_user_id', 'is', null)` est appliqué (**ATTENTION: c'est `auth_user_id`, PAS `auth_id`**)
2. Ou que `hasAuthAccount` est vérifié avant création (basé sur `auth_user_id`)
3. Propager `has_account` depuis repository → service → action → UI

---

*Derniere mise a jour: 2026-02-01 17:45*
*Focus: Filtrage auth_user_id conversations/notifications + Fix badge locataire*

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `18e7c6a` | docs: update memory bank after auth API optimization session |
| `2431cc3` | perf(auth): reduce auth API calls from 250+ to 1 per navigation |
| `a719010` | refactor(auth): centralize authentication + fix intervention forms UX |

## Files Recently Modified
### 2026-02-02 18:32:51 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/lib/push-notification-manager.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/components/push-notification-toggle.tsx`
- `C:/Users/arthu/Desktop/Coding/Seido-app/hooks/use-notification-prompt.tsx`
- `C:/Users/arthu/Desktop/Coding/Seido-app/app/actions/push-subscription-actions.ts`
