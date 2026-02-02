# SEIDO Active Context

## Focus Actuel
**Objectif:** Fix Push Subscription + Debug Page Paramètres
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan-Feb 2026)
**Dernière analyse:** Push Subscription Security Fix + Settings Page Debug - 2026-02-02

---

## 🚧 EN COURS: Debug Page Paramètres (2026-02-02)

### Symptôme
La page `/gestionnaire/parametres` reste bloquée sur "Chargement..." malgré les logs console montrant une initialisation partielle.

### Logs Observés
```
✅ PWA Service Worker registered
🔔 [NotificationPrompt] Initialized {platform: {...}, supported: true, permission: 'granted', hasDBSubscription: false}
🔴 [SESSION-KEEPALIVE] User became inactive
```

### Analyse en Cours

**Point de blocage potentiel:** `settings-page.tsx:26-28`
```typescript
if (!user) {
  return <div>Chargement...</div>
}
```

Le composant attend `user` de `useAuth()`. Si le hook ne retourne jamais `user`, la page reste bloquée.

### À Vérifier
- [ ] Rafraîchir la page avec Ctrl+Shift+R
- [ ] Vérifier si le déploiement Vercel a réussi
- [ ] Regarder les logs Vercel pour erreurs serveur
- [ ] Tester si le problème existait AVANT le fix push-subscribe

### Note Importante
Le fix `push-subscribe` appliqué **ne devrait PAS** affecter le chargement de la page car :
1. C'est une API POST côté serveur
2. Elle n'est appelée que lors de l'activation des notifications
3. Le chargement de `settings-page.tsx` ne fait aucun appel à cette API

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

## Metriques Systeme (Mise a jour 2026-02-02)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **147+** |
| **API Routes** | **113** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **235+** (+3 PWA notification) |
| **Hooks** | **65** (+1 use-notification-prompt) |
| **Services domain** | **32** |
| **Repositories** | **22** |
| Statuts intervention | 9 |
| Notification actions | **20** (+4 quote notifications) |

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

*Derniere mise a jour: 2026-02-02 23:30*
*Focus: Push subscription security fix + Debug page paramètres*

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `4d8a8e8` | fix(push-subscribe): enhance security by using userProfile.id for subscriptions |
| `61fd200` | docs(rails-architecture): cleanup obsolete intervention statuses |
| `66e95df` | feat(notifications): unify web and PWA push notification system |
| `4f53914` | feat(notifications): complete push notification system + quote workflow notifications |

## Files Recently Modified
### 2026-02-02 23:23:58 (Auto-updated)
- `C:/Users/arthu/.claude/plans/golden-toasting-shell.md`
