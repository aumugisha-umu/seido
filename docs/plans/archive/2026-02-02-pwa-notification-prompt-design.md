# Design : Modale de Notifications PWA Persistante

> **Date** : 2026-02-02
> **Auteur** : Claude Code
> **Statut** : En cours de validation
> **Branch** : `preview`

---

## 1. Résumé Exécutif

### Objectif
Implémenter une modale qui s'affiche **à chaque ouverture de l'app PWA** (mode standalone) si les notifications ne sont pas encore activées, pour maximiser le taux d'activation.

### Comportement Cible

| Contexte | Action |
|----------|--------|
| **Installation PWA** | Auto-activation des notifications (demande permission immédiate) |
| **Ouverture PWA sans notifications** | Affiche modale de rappel à chaque fois |
| **Permission = "denied"** | Affiche instructions pour activer dans paramètres système |
| **Permission = "granted"** | Pas de modale |

### Best Practices Appliquées

Basé sur l'analyse exhaustive des guidelines 2025-2026 :

| Guideline | Application |
|-----------|-------------|
| **Apple HIG** | Une seule demande système, guidage si denied |
| **Material Design 3** | Soft prompt avec bénéfices clairs avant prompt système |
| **Chrome Dev** | Éviter throttling par demandes contextuelles |
| **NN/g Research** | Timing optimal = après action de valeur |

---

## 2. Architecture Technique

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        app/layout.tsx                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     AuthProvider                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │     NotificationPromptProvider (NOUVEAU)            │  │  │
│  │  │     - Vérifie mode standalone                        │  │  │
│  │  │     - Vérifie permission notifications               │  │  │
│  │  │     - Gère affichage modale                          │  │  │
│  │  │                                                       │  │  │
│  │  │     ┌─────────────────────────────────────────────┐  │  │  │
│  │  │     │  NotificationPermissionModal (NOUVEAU)      │  │  │  │
│  │  │     │  - UI avec bénéfices (MD3)                  │  │  │  │
│  │  │     │  - Détection permission denied + guide      │  │  │  │
│  │  │     │  - Boutons "Activer" / "Plus tard"          │  │  │  │
│  │  │     └─────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Fichiers à Créer/Modifier

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `hooks/use-notification-prompt.tsx` | **CRÉER** | Hook de détection et logique |
| `components/pwa/notification-permission-modal.tsx` | **CRÉER** | Modal d'activation |
| `components/pwa/notification-settings-guide.tsx` | **CRÉER** | Guide vers paramètres (si denied) |
| `contexts/notification-prompt-context.tsx` | **CRÉER** | Context provider global |
| `app/layout.tsx` | **MODIFIER** | Intégrer le provider |
| `hooks/use-pwa-install-with-notifications.ts` | **MODIFIER** | Garder auto-activation à l'install |
| `lib/push-notification-manager.ts` | **MODIFIER** | Ajouter monitoring permission |

### 2.3 Dépendances Existantes Réutilisées

- `PushNotificationManager` (singleton) - `lib/push-notification-manager.ts`
- `UnifiedModal` - `components/ui/unified-modal.tsx`
- `useAuth()` - `hooks/use-auth.tsx`
- Table `push_subscriptions` - Déjà en place avec RLS

---

## 3. Logique de Détection

### 3.1 Conditions d'Affichage de la Modale

```typescript
// Pseudo-code de la logique
const shouldShowModal =
  isPWAMode &&                          // Mode standalone (installé)
  isAuthenticated &&                    // Utilisateur connecté
  !isLoading &&                         // Auth terminée
  notificationPermission !== 'granted' && // Pas encore accordé
  !isCurrentlySubscribed                // Pas d'abonnement actif
```

### 3.2 Détection Mode PWA

```typescript
// Méthode recommandée (cohérente avec le codebase)
const isPWAMode = window.matchMedia('(display-mode: standalone)').matches

// Alternative pour iOS Safari
const isPWAiOS = window.navigator.standalone === true
```

### 3.3 États de Permission

| État | Comportement Modale |
|------|---------------------|
| `'default'` | Afficher modale avec bouton "Activer" → déclenche `requestPermission()` |
| `'granted'` | Ne pas afficher (notifications OK) |
| `'denied'` | Afficher modale avec guide vers paramètres système |

---

## 4. Composants UI

### 4.1 NotificationPermissionModal - État Normal

Design basé sur `pwa-install-prompt-modal.tsx` pour cohérence :

```
┌─────────────────────────────────────────────────────────────┐
│  🔔  Activez les notifications                              │
│      Restez informé en temps réel                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🔵 Nouvelles interventions                            │  │
│  │    Soyez alerté dès qu'une intervention est créée    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🟢 Messages importants                                │  │
│  │    Recevez les messages des gestionnaires/locataires │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🟣 Mises à jour en temps réel                         │  │
│  │    Suivez l'avancement de vos interventions          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│           [Plus tard]     [Activer les notifications]       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 NotificationPermissionModal - État Denied

Quand `permission === 'denied'`, afficher un guide vers les paramètres :

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Notifications bloquées                                 │
│      Vous manquez des alertes importantes                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Les notifications sont bloquées par votre navigateur.      │
│  Pour les activer, suivez ces étapes :                      │
│                                                             │
│  📱 Sur iPhone/iPad (Safari) :                              │
│     1. Ouvrez Réglages → SEIDO                              │
│     2. Activez "Autoriser les notifications"                │
│                                                             │
│  🖥️ Sur Chrome/Edge :                                       │
│     1. Cliquez sur 🔒 dans la barre d'adresse               │
│     2. Notifications → Autoriser                            │
│                                                             │
│  💡 Après avoir activé, revenez ici et l'app                │
│     détectera automatiquement le changement.                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        [J'ai compris]                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Détection Automatique du Changement

Quand l'utilisateur revient après avoir modifié les paramètres système :

```typescript
// Dans le hook, écouter les changements au focus
useEffect(() => {
  const handleFocus = async () => {
    const newPermission = pushManager.getPermissionStatus()
    if (newPermission === 'granted' && previousPermission !== 'granted') {
      // L'utilisateur a activé dans les paramètres !
      await pushManager.subscribe(user.id)
      setShowModal(false)
      toast.success('Notifications activées avec succès !')
    }
    setPreviousPermission(newPermission)
  }

  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [previousPermission, user?.id])
```

---

## 5. Flow Complet

### 5.1 Installation PWA + Auto-Activation

```
Utilisateur clique "Installer"
         │
         ▼
PWA s'installe (beforeinstallprompt)
         │
         ▼
usePWAInstallWithNotifications.triggerInstall()
         │
         ▼
Notification.requestPermission() ← AUTOMATIQUE
         │
    ┌────┴────┐
    ▼         ▼
 granted    denied/default
    │         │
    ▼         ▼
Subscribe   Continue sans notifications
    │         │
    ▼         ▼
  SUCCESS   La modale apparaîtra à la prochaine
            ouverture de l'app PWA
```

### 5.2 Ouverture PWA - Rappel Notifications

```
Utilisateur ouvre l'app PWA
         │
         ▼
AuthProvider charge l'utilisateur
         │
         ▼
NotificationPromptProvider vérifie:
  - isPWAMode? ✓
  - user authentifié? ✓
  - permission !== 'granted'? ✓
         │
         ▼
Affiche NotificationPermissionModal
         │
    ┌────┴────────────┐
    ▼                 ▼
"Activer"          "Plus tard"
    │                 │
    ▼                 ▼
requestPermission()  Fermer modal
    │                 │
    ▼                 ▼
 granted?         Réapparaîtra à la
    │             prochaine ouverture
    ▼
Subscribe + Toast succès
```

### 5.3 Permission Denied - Guide Paramètres

```
Utilisateur a déjà refusé (permission = 'denied')
         │
         ▼
NotificationPermissionModal (mode guide)
         │
         ▼
Affiche instructions spécifiques :
  - iOS Safari: Réglages → App → Notifications
  - Chrome: 🔒 → Notifications → Autoriser
  - Android: Paramètres → Apps → SEIDO
         │
         ▼
Utilisateur va dans paramètres système
         │
         ▼
Revient sur l'app (focus event)
         │
         ▼
Hook détecte permission = 'granted'
         │
         ▼
Auto-subscribe + Toast succès
```

---

## 6. Amélioration de l'Existant

### 6.1 Modification de `use-pwa-install-with-notifications.ts`

Le hook existant gère déjà l'auto-activation. On garde ce comportement mais on améliore le logging :

```typescript
// GARDER le comportement actuel (lignes 109-121)
// Mais améliorer la gestion du refus :

try {
  await notificationManager.subscribe(user.id)
  notificationsEnabled = true
  logger.info('✅ [PWA-HOOK] Notifications enabled at install')
} catch (notifError) {
  // L'utilisateur a refusé ou une erreur s'est produite
  // La modale de rappel prendra le relais aux prochaines ouvertures
  logger.info('🔔 [PWA-HOOK] Notifications skipped at install, will prompt later', {
    error: notifError instanceof Error ? notifError.message : 'Unknown'
  })
}
```

### 6.2 Amélioration de `PushNotificationManager`

Ajouter une méthode pour monitoring :

```typescript
// Nouvelle méthode pour vérifier si on doit montrer le prompt
shouldPromptForPermission(): boolean {
  if (!this.isSupported()) return false

  const permission = this.getPermissionStatus()
  // On veut montrer le prompt si:
  // - 'default' : pas encore demandé
  // - 'denied' : refusé mais on peut guider vers paramètres
  return permission !== 'granted'
}

// Nouvelle méthode pour détecter si déjà abonné côté serveur
async hasServerSubscription(userId: string): Promise<boolean> {
  // Check si l'utilisateur a un abonnement en DB
  // (Même si browser subscription est perdue)
  const response = await fetch(`/api/push/check?userId=${userId}`)
  return response.ok && (await response.json()).hasSubscription
}
```

---

## 7. Table DB - Pas de Modification Requise

La table `push_subscriptions` existante est suffisante :

```sql
-- Structure actuelle (suffisante)
push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  endpoint TEXT UNIQUE,
  keys JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Aucune migration DB nécessaire.**

---

## 8. Gestion des Rôles

### 8.1 Bénéfices Affichés par Rôle

| Rôle | Bénéfice 1 | Bénéfice 2 | Bénéfice 3 |
|------|------------|------------|------------|
| **Gestionnaire** | Nouvelles demandes d'intervention | Messages des locataires | Devis des prestataires |
| **Prestataire** | Nouvelles missions | Messages des gestionnaires | Rappels d'intervention |
| **Locataire** | Mises à jour intervention | Réponses du gestionnaire | Visites planifiées |

### 8.2 Implémentation

```typescript
const getBenefitsByRole = (role: UserRole) => {
  const benefits = {
    gestionnaire: [
      { icon: 'inbox', title: 'Nouvelles demandes', desc: 'Soyez alerté des demandes d\'intervention' },
      { icon: 'message', title: 'Messages locataires', desc: 'Répondez rapidement aux questions' },
      { icon: 'file-text', title: 'Devis reçus', desc: 'Validez les devis des prestataires' }
    ],
    prestataire: [
      { icon: 'briefcase', title: 'Nouvelles missions', desc: 'Ne manquez aucune opportunité' },
      { icon: 'message', title: 'Messages gestionnaires', desc: 'Communiquez efficacement' },
      { icon: 'calendar', title: 'Rappels RDV', desc: 'Soyez ponctuel à chaque intervention' }
    ],
    locataire: [
      { icon: 'wrench', title: 'Suivi intervention', desc: 'Suivez l\'avancement en temps réel' },
      { icon: 'message', title: 'Réponses', desc: 'Recevez les réponses du gestionnaire' },
      { icon: 'calendar', title: 'Visites', desc: 'Soyez notifié des RDV planifiés' }
    ]
  }
  return benefits[role] || benefits.locataire
}
```

---

## 9. Tests Recommandés

### 9.1 Scénarios E2E

| Scénario | Action | Résultat Attendu |
|----------|--------|------------------|
| PWA install + accept notif | Install → Accept permission | Notifications actives, pas de modale |
| PWA install + refuse notif | Install → Deny permission | À la prochaine ouverture → modale |
| PWA ouverture (default) | Ouvrir app | Modale s'affiche |
| PWA ouverture (granted) | Ouvrir app | Pas de modale |
| PWA ouverture (denied) | Ouvrir app | Modale avec guide paramètres |
| Denied → Settings → Allow | Modifier paramètres + revenir | Auto-subscribe au focus |
| Click "Plus tard" | Fermer modale | Réapparaît à prochaine ouverture |

### 9.2 Tests Unitaires

```typescript
describe('useNotificationPrompt', () => {
  it('shows modal in PWA mode with default permission', () => {...})
  it('hides modal when permission is granted', () => {...})
  it('shows settings guide when permission is denied', () => {...})
  it('detects permission change on window focus', () => {...})
  it('does not show modal in browser mode', () => {...})
})
```

---

## 10. Métriques de Succès

| Métrique | Baseline | Objectif | Mesure |
|----------|----------|----------|--------|
| Taux d'activation notifications | ~30% (estimation) | 70%+ | `push_subscriptions.count / users.count` |
| Taux de refus permanent | N/A | < 10% | `permission === 'denied'` tracking |
| Temps moyen avant activation | N/A | < 2 sessions | Analytics event timing |

---

## 11. Plan d'Implémentation

### Phase 1 : Hook et Provider (Core Logic)
1. Créer `hooks/use-notification-prompt.tsx`
2. Créer `contexts/notification-prompt-context.tsx`
3. Intégrer dans `app/layout.tsx`

### Phase 2 : Composants UI
4. Créer `components/pwa/notification-permission-modal.tsx`
5. Créer `components/pwa/notification-settings-guide.tsx`
6. Personnaliser bénéfices par rôle

### Phase 3 : Amélioration Existant
7. Améliorer `lib/push-notification-manager.ts` (monitoring)
8. Ajouter endpoint `/api/push/check`

### Phase 4 : Tests et Polish
9. Tests E2E Playwright
10. Tests unitaires
11. Documentation mise à jour

---

## 12. Considérations UX

### 12.1 Timing de la Modale

La modale apparaît **après** que :
1. L'authentification est complète (`loading === false`)
2. L'utilisateur est sur une page authentifiée (pas `/auth/*`)
3. Un délai de 1-2 secondes (éviter flash)

### 12.2 Animation

```typescript
// Entrée douce pour ne pas surprendre
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 1.5 }}
>
  <NotificationPermissionModal />
</motion.div>
```

### 12.3 Accessibilité

- `aria-labelledby` sur la modale
- Focus trap pendant que la modale est ouverte
- Escape key pour fermer
- Screen reader friendly

---

## 13. Risques et Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Modale trop intrusive | Moyen | Frustration utilisateur | Design soigné, délai avant affichage |
| iOS Safari limitations | Certain | Pas de push sans PWA | Guide clair vers installation |
| Chrome throttling | Faible | Prompt pas affiché | Pattern soft prompt déjà appliqué |
| Permission denied permanent | Moyen | Utilisateur bloqué | Guide vers paramètres système |

---

*Document créé le 2026-02-02*
*Basé sur l'analyse exhaustive de l'architecture PWA SEIDO et des best practices 2025-2026*
