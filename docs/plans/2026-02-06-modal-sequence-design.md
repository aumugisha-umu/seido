# Design : Séquence des Modales de Première Connexion

**Date** : 2026-02-06
**Statut** : Approuvé
**Auteur** : Claude + Arthur

## Objectif

Coordonner l'ordre d'affichage des modales lors de la première connexion d'un gestionnaire :

1. **D'abord** : Modale Notification/PWA (installation + activation notifications)
2. **Ensuite** : Modale Onboarding (explication des fonctionnalités)

## Décisions Clés

| Question | Décision |
|----------|----------|
| Comportement si refusé/fermé | Onboarding s'affiche immédiatement (délai 300ms) |
| Périmètre des rôles | Gestionnaire seulement |
| Approche technique | Coordination simple via context existant |
| Skip automatique | Oui, si modale notifications non nécessaire |

## Architecture

```
NotificationPromptContext
    │
    │ expose: hasCompletedNotificationFlow
    │
    ▼
OnboardingModal
    │
    │ attend: hasCompletedNotificationFlow === true
    │ puis: affiche avec délai 300ms
    ▼
```

## Fichiers Modifiés

### 1. `hooks/use-notification-prompt.tsx`

Ajout de l'état `hasCompletedFlow` qui devient `true` quand :
- Notifications non supportées
- Déjà subscrit en DB
- Permission déjà denied
- Dismiss récent (24h)
- User accepte ou refuse la modale

### 2. `components/onboarding/onboarding-modal.tsx`

Modification de l'effet auto-open pour :
- Attendre `hasCompletedNotificationFlow === true`
- Ajouter délai de 300ms pour transition fluide
- Fallback `?? true` si context non disponible

## Cas Limites

| Scénario | Comportement |
|----------|-------------|
| Première visite, notifications supportées | Notif → 300ms → Onboarding |
| Première visite, notifications non supportées | Onboarding direct |
| Retour utilisateur (déjà subscrit) | Onboarding direct (si pas vu) |
| Retour utilisateur (tout vu) | Rien ne s'affiche |
| Installation PWA | App se recharge → Onboarding au prochain load |
| OnboardingModal hors context | Fallback: s'affiche normalement |

## Tests Manuels Recommandés

1. [ ] Nouvelle inscription → Vérifier ordre Notif → Onboarding
2. [ ] Clic "Plus tard" sur notif → Onboarding apparaît
3. [ ] Activer notifications → Onboarding apparaît après
4. [ ] User existant avec subscription → Onboarding direct
5. [ ] Navigateur sans support notifications → Onboarding direct
