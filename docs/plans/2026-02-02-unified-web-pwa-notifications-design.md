# Design: Unified Web & PWA Push Notifications

**Date:** 2026-02-02
**Status:** Implemented ✅
**Author:** Claude + User

---

## Objectif

Adapter le système de notifications push pour fonctionner à la fois sur la version web (navigateur) et PWA installée, avec une modale unifiée qui :
- S'affiche sur web ET PWA (pas seulement PWA)
- Installe la PWA automatiquement via la modale (sur web)
- Réapparaît après 24h si l'utilisateur ferme sans activer
- Permet d'activer les notifications web sans PWA via le toggle paramètres

---

## Architecture

### Deux flux distincts

| Point d'entrée | PWA pas installée | PWA installée |
|----------------|-------------------|---------------|
| **Modale automatique** | Installe PWA → Active notifs | Active notifs |
| **Toggle paramètres** | Active notifs web (sans PWA) | Active notifs PWA |

### Détection de contexte

| Contexte | `canPushDirectly` | `needsPWAInstall` | Action modale |
|----------|-------------------|-------------------|---------------|
| PWA installée | ✅ | ❌ | "Activer les notifications" |
| Chrome/Firefox/Edge desktop | ✅ | ❌ | "Installer l'app" → Active |
| Chrome Android | ✅ | ❌ | "Installer l'app" → Active |
| Safari macOS 16+ | ✅ | ❌ | "Installer l'app" → Active |
| iOS Safari (non-PWA) | ❌ | ✅ | Guide installation manuelle |
| Navigateur non supporté | ❌ | ❌ | Ne pas afficher |

---

## Logique de détection

### Hook `useNotificationContext`

```typescript
interface NotificationContext {
  // Environnement
  isPWAInstalled: boolean      // Mode standalone détecté
  isIOSSafari: boolean         // iOS + Safari (pas Chrome iOS)
  canPushWithoutPWA: boolean   // Desktop/Android browsers

  // État notifications
  browserPermission: NotificationPermission
  hasDBSubscription: boolean
  isServiceWorkerReady: boolean

  // États dérivés
  canActivateDirectly: boolean
  needsPWAFirst: boolean
  isFullyEnabled: boolean
}
```

### Détection plateforme

```typescript
function detectPlatform() {
  const ua = navigator.userAgent

  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
             || (window.navigator as any).standalone === true
  const canPushWithoutPWA = !isIOS || isPWA

  return { isIOS, isSafari, isPWA, isIOSSafari: isIOS && isSafari, canPushWithoutPWA }
}
```

### Condition d'affichage modale

```typescript
const shouldShowModal =
  isSupported &&
  isServiceWorkerReady &&
  isAuthenticated &&
  !hasDBSubscription &&
  !isDismissedRecently() &&    // Vérifie localStorage (24h)
  state !== 'subscribing'
  // SUPPRIMÉ: isPWAMode - on affiche sur web aussi
```

---

## Persistance du dismiss (24h)

```typescript
const DISMISS_KEY = 'seido_notification_prompt_dismissed_at'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

function isDismissedRecently(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  return Date.now() - parseInt(dismissedAt) < DISMISS_DURATION_MS
}

function setDismissed(): void {
  localStorage.setItem(DISMISS_KEY, Date.now().toString())
}
```

---

## UI de la modale

### Écran 1: Installation PWA + Notifications (Web non-PWA)

```
┌─────────────────────────────────────────────────────────────┐
│  🔔  Restez informé en temps réel                          │
├─────────────────────────────────────────────────────────────┤
│  Installez l'application SEIDO pour recevoir               │
│  des notifications instantanées :                          │
│                                                             │
│  ✓ Nouvelles interventions                                 │
│  ✓ Messages et réponses                                    │
│  ✓ Mises à jour de statut                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📲  Installer l'application                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              Plus tard (réapparaît dans 24h)               │
└─────────────────────────────────────────────────────────────┘
```

### Écran 2: Activation notifications (PWA installée)

```
┌─────────────────────────────────────────────────────────────┐
│  🔔  Activez les notifications                             │
├─────────────────────────────────────────────────────────────┤
│  Ne manquez aucune mise à jour importante :                │
│                                                             │
│  ✓ Nouvelles interventions assignées                       │
│  ✓ Réponses à vos messages                                 │
│  ✓ Changements de statut                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔔  Activer les notifications                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              Plus tard (réapparaît dans 24h)               │
└─────────────────────────────────────────────────────────────┘
```

### Écran 3: iOS Safari - Installation manuelle obligatoire

```
┌─────────────────────────────────────────────────────────────┐
│  📱  Installez l'app pour les notifications                │
├─────────────────────────────────────────────────────────────┤
│  Sur iPhone/iPad, les notifications nécessitent            │
│  d'installer l'application :                               │
│                                                             │
│  1. Appuyez sur  [↑]  (partager)                          │
│  2. "Sur l'écran d'accueil"                                │
│  3. "Ajouter"                                              │
│                                                             │
│              J'ai compris                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Toggle Paramètres

### Comportement différencié

| Contexte | Toggle | Comportement |
|----------|--------|--------------|
| Desktop/Android | ✅ Actif | Active web push directement |
| PWA installée | ✅ Actif | Active push PWA |
| iOS Safari non-PWA | ❌ Désactivé | Message: "Installez l'app" |

### Message iOS Safari

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 Notifications push                    [Toggle grisé]   │
│  Recevoir des notifications sur cet appareil               │
│                                                             │
│  ⚠️ Sur iOS, installez l'app pour les notifications       │
│     [Comment installer ?]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Flux technique: Installation PWA + Notifications

```
Utilisateur clique "Installer l'application"
           │
           ▼
┌──────────────────────────────────────┐
│ 1. Déclencher prompt installation    │
│    deferredPrompt.prompt()           │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 2. Attendre choix utilisateur        │
│    outcome: 'accepted' | 'dismissed' │
└──────────────────────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 accepted     dismissed
     │           │
     ▼           ▼
┌────────┐  ┌─────────────────────┐
│ 3. PWA │  │ Fermer modale       │
│ s'inst │  │ localStorage 24h    │
└────────┘  └─────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 4. Détecter appinstalled event       │
│    OU attendre standalone mode       │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 5. Auto-activer notifications        │
│    pushManager.subscribe(userId)     │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 6. Vérifier subscription en DB       │
│    → Succès: Fermer modale           │
│    → Échec: Afficher erreur          │
└──────────────────────────────────────┘
```

---

## Fichiers à modifier

### Fichiers existants

| Fichier | Modifications |
|---------|---------------|
| `hooks/use-notification-prompt.tsx` | Supprimer `isPWAMode`, ajouter localStorage 24h, détection contexte |
| `hooks/use-pwa-install-with-notifications.ts` | Exposer `deferredPrompt` et `installPWA()` |
| `components/pwa/notification-permission-modal.tsx` | 3 écrans selon contexte |
| `components/push-notification-toggle.tsx` | Message iOS Safari désactivé |
| `contexts/notification-prompt-context.tsx` | État `deferredPrompt` partagé |

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `hooks/use-notification-context.tsx` | Détection plateforme centralisée |
| `lib/constants/notifications.ts` | Constantes (clé localStorage, durée 24h) |

---

## Sources et références

- [MDN - Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Re-engageable_Notifications_Push)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MagicBell - PWA Push Guide](https://www.magicbell.com/blog/using-push-notifications-in-pwas)
- [iOS PWA Push Best Practices](https://www.magicbell.com/blog/best-practices-for-ios-pwa-push-notifications)

---

## Checklist d'implémentation

- [x] Créer `hooks/use-notification-context.tsx` ✅
- [x] Créer `lib/constants/notifications.ts` ✅
- [x] Modifier `hooks/use-notification-prompt.tsx` (supprimer isPWAMode, ajouter 24h) ✅
- [x] Modifier `hooks/use-pwa-install-with-notifications.ts` (exposer deferredPrompt) ✅
- [x] Modifier `components/pwa/notification-permission-modal.tsx` (3 écrans) ✅
- [x] Modifier `components/push-notification-toggle.tsx` (iOS message) ✅
- [ ] Tester sur Chrome desktop
- [ ] Tester sur Chrome Android
- [ ] Tester sur Safari macOS
- [ ] Tester sur iOS Safari
- [ ] Tester PWA installée

> Note: Le contexte `contexts/notification-prompt-context.tsx` n'a pas besoin d'être modifié
> car le `deferredPrompt` est déjà géré dans `use-pwa-install-with-notifications.ts`
