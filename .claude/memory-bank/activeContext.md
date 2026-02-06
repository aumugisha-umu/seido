# SEIDO Active Context

## Focus Actuel
**Objectif:** Fix ensureInterventionConversationThreads + Stabilisation Conversations
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan-Feb 2026)
**Dernière analyse:** Bugfix critique conversation threads - 2026-02-04

---

## ✅ COMPLETE: Fix ensureInterventionConversationThreads (2026-02-04)

### Contexte
Code review de `ensureInterventionConversationThreads` dans `conversation-actions.ts` a révélé 3 problèmes : 1 bug critique, 1 inefficacité, 1 gap fonctionnel.

### Modifications Effectuées

| Fix | Fichier | Description |
|-----|---------|-------------|
| **Fix 1 (CRITIQUE)** | `conversation-actions.ts:836` | Supprimé `.is('deleted_at', null)` sur `intervention_assignments` — colonne inexistante, la requête échouait silencieusement = zéro threads créés |
| **Fix 2 (Efficacité)** | `conversation-actions.ts:858-884` | Capture directe de `groupThreadId` au lieu de re-query DB après création |
| **Fix 3 (Gap fonctionnel)** | `conversation-actions.ts:948-994` | Ajout `else` branches pour `tenants_group` et `providers_group` existants — nouveaux participants ajoutés aux threads group existants |

### Pattern addParticipant Idempotent

```typescript
// addParticipant utilise ON CONFLICT DO NOTHING
// → Appeler pour un user déjà participant = no-op inoffensif
// → Pas besoin de vérifier l'existence avant ajout
await conversationRepo.addParticipant(existingGroupThread.id, newUser.id)
```

### Leçon: Colonnes Fantômes Supabase

```typescript
// ⚠️ PIÈGE: Supabase PostgREST peut échouer silencieusement
// si on filtre sur une colonne inexistante
.from('intervention_assignments')
.is('deleted_at', null)  // ← deleted_at N'EXISTE PAS sur cette table!
// → Résultat: erreur ou empty array, JAMAIS de données
```

---

## ✅ COMPLETE: Simplification Statut "Approuvée" (2026-02-03)

### Modifications Effectuées

| Fichier | Modification |
|---------|--------------|
| `lib/intervention-action-utils.ts` | Un seul bouton "Planifier" (suppression "Demander estimation") |
| `lib/intervention-utils.ts` | Message "En attente de planification" (au lieu de "assignation prestataire") |
| `components/intervention/modals/programming-modal-FINAL.tsx` | ContactSelector réels au lieu de mockups inline |
| `intervention-detail-client.tsx` | Réactivation ProgrammingModal + props managers/tenants |
| `interventions-page-client.tsx` | Props minimales pour ProgrammingModal depuis liste |
| `intervention-card.tsx` | Callback `onOpenProgrammingModal` pour action start_planning |
| `pending-actions-section.tsx` | Propagation callback vers InterventionCard |

### Pattern ContactSelector dans Modal

```typescript
// Dans ProgrammingModal - Section Participants
<ContactSelector
  ref={contactSelectorRef}
  mode="multiple"
  hideUI={true}  // Pas d'affichage direct, utilise openContactModal()
  {...}
/>

// Ouvrir le sélecteur depuis un bouton
<Button onClick={() => contactSelectorRef.current?.openContactModal()}>
  + Ajouter
</Button>
```

### Logique Locataires par Lot

Pour les interventions sur bâtiment entier (`lot_id = null`):
- Affichage groupé par lot avec switch individuel
- `excludedLotIds` pour exclure certains lots
- Badge "Non invité" pour locataires sans `auth_id`

### État des Handlers

| Handler | État |
|---------|------|
| `onManagerToggle` | ⚠️ Fonction vide - affichage seulement |
| `onTenantToggle` | ⚠️ Fonction vide - affichage seulement |
| `onLotToggle` | ⚠️ Fonction vide - affichage seulement |

**Note:** La modification interactive des participants nécessiterait une gestion d'état supplémentaire.

---

## ✅ COMPLETE: Fix Infinite Refresh Loop (2026-02-03)

### Symptôme
La page de détail d'intervention entrait en boucle infinie de refresh, rendant l'interface inutilisable.

### Root Cause Analysée

**Flux de la boucle infinie:**
```
1. ChatInterface monte → useEffect (300ms delay)
2. markThreadAsReadAction() appelé
3. Server action fait revalidatePath()
4. Cache invalidé → page re-render
5. ChatInterface remonte → useEffect se re-déclenche
6. RETOUR À 1 → BOUCLE ∞
```

**Problème aggravant:** Dans `useInterventionApproval`, double refresh:
1. `onSuccess()` → `handleRefresh()` → `router.refresh()`
2. 500ms plus tard → `router.refresh()` ENCORE

### Fix Appliqué

| Fichier | Modification |
|---------|--------------|
| `hooks/use-intervention-approval.ts` | Un seul refresh: soit callback, soit setTimeout (exclusif) |
| `components/chat/chat-interface.tsx` | Ajout `markedAsReadThreadsRef` pour tracker les threads déjà lus |

**Pattern utilisé:** `useRef<Set<string>>` pour déduplication des appels sans provoquer de re-render.

---

## ✅ COMPLETE: Push Subscription Security Fix (2026-02-02)

### Contexte
Les push subscriptions n'étaient pas sauvegardées en base malgré l'API retournant 200.

### Root Causes Identifiées

| Issue | Description |
|-------|-------------|
| **RLS Silent Block** | Supabase avec anon key peut bloquer silencieusement les inserts via RLS |
| **No Null Check** | `.single()` retourne `null` si RLS bloque, pas d'erreur |
| **Client userId** | Utilisait `userId` du client au lieu de `userProfile.id` authentifié |

### Fix Appliqué

**Fichier:** `app/api/push/subscribe/route.ts`

| Ligne | Avant | Après |
|-------|-------|-------|
| 38 | `user_id: userId` | `user_id: userProfile.id` |
| 58-65 | *(absent)* | Check `if (!data)` pour détecter RLS silent blocks |
| Logs | `userId` | `userProfileId: userProfile.id` (cohérence) |

### Code Ajouté
```typescript
// ✅ Check for null data - RLS may silently block inserts
if (!data) {
  logger.error({ userProfileId: userProfile.id }, '❌ [PUSH-SUBSCRIBE] Insert blocked (RLS or constraint)')
  return NextResponse.json(
    { error: 'Subscription not created - permission denied' },
    { status: 500 }
  )
}
```

### Commit
`4d8a8e8` fix(push-subscribe): enhance security by using userProfile.id for subscriptions

---

## ✅ COMPLETE: Quote Notifications Multi-Canal (2026-02-02)

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

### Bug Fix: URLs Push Notifications
**Problème:** Les push notifications pointaient toujours vers `/gestionnaire/interventions/...`
**Solution:** `sendRoleAwarePushNotifications()` groupe par rôle et envoie l'URL appropriée

---

## ✅ COMPLETE: PWA Notification Prompt (2026-02-02)

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
| `hooks/use-notification-prompt.tsx` | Hook de détection |
| `components/pwa/notification-permission-modal.tsx` | Modal UI |
| `components/pwa/notification-settings-guide.tsx` | Instructions paramètres |
| `contexts/notification-prompt-context.tsx` | Provider global |

---

## ✅ COMPLETE: Web/PWA Notification Unification (2026-02-02)

### Changements Majeurs

| Composant | Avant | Après |
|-----------|-------|-------|
| **PushNotificationToggle** | Web uniquement | Web + PWA unifié |
| **NotificationPrompt** | PWA modal séparé | Intégré dans toggle |
| **Settings Guide** | N/A | Instructions par plateforme |

### Pattern Architecture
```
NotificationPromptProvider (layout.tsx)
    └── useNotificationPrompt (hook)
            ├── isPWA detection
            ├── permission state
            └── hasDBSubscription check
                    └── NotificationPermissionModal
                            └── NotificationSettingsGuide (si denied)
```

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
| Phase 10 | Filtrage auth_id contacts invités | ✅ |
| **Phase 11** | **Push subscription security fix** | ✅ NEW |

---

## Prochaines Etapes

### Debug Immédiat
- [ ] Identifier cause blocage page paramètres
- [ ] Vérifier déploiement Vercel réussi
- [ ] Tester push subscription après fix

### Google Maps Integration
- [x] Phase 1: Table addresses centralisée ✅
- [x] Phase 4: Map display component (LocalisationTab) ✅
- [ ] Phase 2: Composant AddressInput avec Places API
- [ ] Phase 3: Geocoding service automatique

---

## Metriques Systeme (Mise a jour 2026-02-03)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **155** |
| **API Routes** | **113** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **358** |
| **Hooks** | **61** |
| **Services domain** | **32** |
| **Repositories** | **22** |
| Statuts intervention | 9 |
| Notification actions | **20** |

---

## Points de Vigilance - Push Subscriptions

### Pattern RLS Silent Block
```typescript
// ⚠️ Supabase avec anon key peut bloquer silencieusement via RLS
const { data, error } = await supabase
  .from('push_subscriptions')
  .upsert({...})
  .select()
  .single()

// ❌ INCORRECT - Ne vérifie que error
if (error) { /* ... */ }

// ✅ CORRECT - Vérifie aussi data null
if (error) { /* ... */ }
if (!data) { /* RLS blocked silently! */ }
```

### Pattern userProfile.id vs client userId
```typescript
// ✅ CORRECT - Utiliser l'ID authentifié du serveur
user_id: userProfile.id

// ❌ RISQUÉ - Utiliser l'ID fourni par le client
user_id: userId  // (même si validé, préférer l'ID serveur)
```

---

*Derniere mise a jour: 2026-02-04 18:10*
*Focus: Fix critique ensureInterventionConversationThreads (deleted_at fantôme + efficacité + gap participants)*

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `55e969a` | fix(notifications): fix push notification URL routing and add debug logs |
| `514af5d` | feat(notifications): enhance PWA notification system and fix push subscription security |
| `4d8a8e8` | fix(push-subscribe): enhance security by using userProfile.id for subscriptions |
| `61fd200` | docs(rails-architecture): cleanup obsolete intervention statuses |

## Files Recently Modified
### 2026-02-06 20:33:47 (Auto-updated)
- `C:/Users/arthu/.claude/plans/mutable-gathering-pancake.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/components/landing/landing-header.tsx`
