# Checklist Real-time (Chat, Notifications, WebSocket) - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Priorité** : P0 - Critique
> **Tests** : 52 tests documentés

---

## Vue d'ensemble

Cette checklist couvre les fonctionnalités real-time de SEIDO utilisant Supabase Realtime : notifications en temps réel, chat/messagerie, et mises à jour live des données.

### Architecture Real-time

| Composant | Fichier | Fonction |
|-----------|---------|----------|
| RealtimeProvider | `contexts/realtime-context.tsx` | Provider centralisé (1 channel/user) |
| Notifications Hook | `hooks/use-realtime-notifications-v2.ts` | Consumer notifications |
| Emails Hook | `hooks/use-realtime-emails-v2.ts` | Consumer emails |
| Chat Interface | `components/chat/chat-interface.tsx` | Interface de messagerie |

### Tables Écoutées (Supabase Realtime)

| Table | Événements | Filtre |
|-------|------------|--------|
| `notifications` | INSERT, UPDATE, DELETE | `user_id=eq.{userId}` |
| `conversation_messages` | * | Filtrage client (thread_id) |
| `interventions` | UPDATE | Aucun |
| `intervention_quotes` | * | Aucun |
| `intervention_time_slots` | * | Aucun |
| `emails` | INSERT | Aucun |

---

## 1. Provider Realtime - Connexion

### Préconditions
- [ ] Utilisateur connecté avec un compte valide
- [ ] Application chargée avec RealtimeProvider wrapping le layout
- [ ] Supabase Realtime activé sur les tables (Dashboard → Database → Replication)

### Tests Connexion

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 1.1 | **Connexion initiale** | Charger l'application connecté | Channel WebSocket établi, `isConnected=true` | P0 | ☐ |
| 1.2 | **État connecting** | Vérifier pendant le chargement | `connectionStatus='connecting'` pendant 1-2s | P1 | ☐ |
| 1.3 | **État connected** | Après chargement complet | `connectionStatus='connected'`, badge vert (si affiché) | P0 | ☐ |
| 1.4 | **Channel unique** | Inspecter DevTools > Network > WS | 1 seul WebSocket par utilisateur (pas 4-10+) | P0 | ☐ |
| 1.5 | **Channel name** | Inspecter payload WebSocket | Channel nommé `seido:{userId}:{teamId}` | P1 | ☐ |

### Tests Déconnexion/Reconnexion

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 1.6 | **Déconnexion réseau** | Activer mode avion/offline | `isConnected=false`, `connectionStatus='error'` | P0 | ☐ |
| 1.7 | **Reconnexion auto** | Désactiver mode offline | Reconnexion automatique après 2s (backoff) | P0 | ☐ |
| 1.8 | **Backoff exponentiel** | 3 déconnexions successives | Délais: 2s → 4s → 8s → 16s → 30s (max) | P1 | ☐ |
| 1.9 | **Max attempts** | 5 tentatives échouées | Log: "Max reconnection attempts reached" | P1 | ☐ |
| 1.10 | **Cleanup logout** | Déconnexion utilisateur | Channel supprimé proprement, pas de fuite mémoire | P0 | ☐ |

### Critères d'Acceptation

```gherkin
Feature: Realtime Connection

  Scenario: Connexion WebSocket réussie
    Given l'utilisateur est connecté
    And Supabase Realtime est activé
    When la page charge complètement
    Then un seul channel WebSocket est créé
    And le statut de connexion est "connected"
    And le channel est nommé "seido:{userId}:{teamId}"

  Scenario: Reconnexion après perte de réseau
    Given l'utilisateur est connecté avec WebSocket actif
    When la connexion réseau est perdue
    Then le statut passe à "error"
    When la connexion réseau est restaurée
    Then une reconnexion automatique est tentée
    And le backoff exponentiel est appliqué (2s, 4s, 8s...)
```

---

## 2. Notifications Real-time

### Préconditions
- [ ] Utilisateur connecté
- [ ] RealtimeProvider actif et connecté
- [ ] Table `notifications` avec RLS policy active

### Tests Réception

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 2.1 | **Nouvelle notification** | Créer intervention (autre user) | Toast + badge notification +1 | P0 | ☐ |
| 2.2 | **Filtrage user_id** | Créer notif pour autre user | Aucune notification reçue (filtre serveur) | P0 | ☐ |
| 2.3 | **Badge count** | Vérifier header | Badge rouge avec nombre correct (unreadCount) | P0 | ☐ |
| 2.4 | **Toast notification** | Réception notification | Toast "Nouvelle notification" avec titre | P0 | ☐ |
| 2.5 | **Liste mise à jour** | Ouvrir popover notifications | Nouvelle notif en haut de liste | P0 | ☐ |

### Tests Actions

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 2.6 | **Mark as read** | Cliquer sur notification | Notification marquée lue (optimistic) | P0 | ☐ |
| 2.7 | **Mark all as read** | Cliquer "Tout marquer lu" | Toutes les notifs marquées lues, badge disparaît | P0 | ☐ |
| 2.8 | **Optimistic update** | Mark as read → vérifier UI | UI mise à jour instantanément (avant API) | P1 | ☐ |
| 2.9 | **Navigation notif** | Cliquer notification | Redirect vers la ressource liée | P0 | ☐ |
| 2.10 | **Delete notification** | Supprimer notification | Notification disparaît de la liste | P1 | ☐ |

### Tests Multi-onglets

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 2.11 | **Sync multi-tab** | Ouvrir 2 onglets, recevoir notif | Badge +1 sur les 2 onglets | P1 | ☐ |
| 2.12 | **Mark read sync** | Marquer lu dans onglet 1 | Badge mis à jour dans onglet 2 | P1 | ☐ |

---

## 3. Chat / Messagerie

### Préconditions
- [ ] Utilisateur connecté (gestionnaire, locataire, ou prestataire)
- [ ] Intervention avec thread de conversation existant
- [ ] Autre participant disponible pour tester la réception

### Tests Affichage

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.1 | **Liste messages** | Ouvrir conversation | Messages affichés chronologiquement | P0 | ☐ |
| 3.2 | **Avatar expéditeur** | Vérifier bulle message | Avatar + nom visible (messages des autres) | P0 | ☐ |
| 3.3 | **Mes messages** | Identifier mes messages | Bulles à droite, fond primaire | P0 | ☐ |
| 3.4 | **Messages autres** | Messages des autres | Bulles à gauche, fond muted | P0 | ☐ |
| 3.5 | **Timestamp** | Vérifier heure | Format HH:mm sous chaque message | P1 | ☐ |
| 3.6 | **Read indicator** | Mes messages | Icône CheckCheck (lu) visible | P1 | ☐ |

### Tests Envoi

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.7 | **Envoyer message** | Taper + cliquer Send | Message ajouté en bas, optimistic update | P0 | ☐ |
| 3.8 | **Enter to send** | Taper + Enter | Message envoyé (pas de saut de ligne) | P0 | ☐ |
| 3.9 | **Message vide** | Cliquer Send sans texte | Bouton désactivé, rien ne se passe | P1 | ☐ |
| 3.10 | **Toast succès** | Après envoi | Toast "Message envoyé" | P1 | ☐ |
| 3.11 | **Auto-scroll** | Envoyer message | Scroll automatique vers le bas | P0 | ☐ |

### Tests Pièces Jointes

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.12 | **Ajouter fichier** | Cliquer icône pièce jointe | Sélecteur fichiers s'ouvre | P0 | ☐ |
| 3.13 | **Preview fichier** | Fichier sélectionné | Miniature/nom affiché avant envoi | P0 | ☐ |
| 3.14 | **Upload fichier** | Envoyer avec fichier | Toast "Upload en cours", puis succès | P0 | ☐ |
| 3.15 | **Message avec fichier** | Vérifier message envoyé | Pièce jointe visible avec icône | P0 | ☐ |
| 3.16 | **Télécharger fichier** | Cliquer sur pièce jointe | Fichier téléchargé | P1 | ☐ |

### Tests Real-time Chat

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.17 | **Recevoir message** | Autre user envoie message | Message apparaît instantanément | P0 | ☐ |
| 3.18 | **Animation réception** | Message reçu | Animation fade-in fluide | P1 | ☐ |
| 3.19 | **Son notification** | Optionnel - message reçu | Son de notification (si activé) | P2 | ☐ |

### Tests Participants

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.20 | **Liste participants** | Vérifier header chat | Avatars participants visibles (max 3 + "+N") | P0 | ☐ |
| 3.21 | **Tooltip participant** | Hover sur avatar | Nom + rôle du participant | P1 | ☐ |
| 3.22 | **Ajouter participant** | Cliquer bouton + | Modal sélection membres d'équipe | P1 | ☐ |
| 3.23 | **Types de thread** | Vérifier badge | "Groupe" / "Locataire → Gestionnaires" / "Prestataire → Gestionnaires" | P1 | ☐ |

---

## 4. Types de Conversations

### Tests Thread Types

| # | Test | Thread Type | Comportement Attendu | Status |
|---|------|-------------|----------------------|--------|
| 4.1 | **Groupe** | `group` | Tous les participants voient tous les messages | ☐ |
| 4.2 | **Locataire → Gestionnaire** | `tenant_to_managers` | Privé entre locataire et gestionnaire(s) | ☐ |
| 4.3 | **Prestataire → Gestionnaire** | `provider_to_managers` | Privé entre prestataire et gestionnaire(s) | ☐ |
| 4.4 | **Badge transparence** | Non-groupe + gestionnaire | Badge "Gestionnaire présent" visible | ☐ |
| 4.5 | **Isolation messages** | Threads différents | Messages d'un thread non visibles dans l'autre | ☐ |

---

## 5. Performance Real-time

### Tests Performance

| # | Test | Métrique | Seuil | Status |
|---|------|----------|-------|--------|
| 5.1 | **Latence notification** | Temps création → réception | < 500ms (réseau local) | ☐ |
| 5.2 | **Latence message** | Envoi → affichage chez l'autre | < 300ms | ☐ |
| 5.3 | **WebSocket connections** | Nombre par user | 1 (pas 4-10+) | ☐ |
| 5.4 | **Memory usage** | Après 1h utilisation | Pas de fuite mémoire (stable) | ☐ |
| 5.5 | **CPU idle** | Chat ouvert sans activité | < 5% CPU | ☐ |
| 5.6 | **Messages scroll** | 100+ messages | Scroll fluide 60 FPS | ☐ |

---

## 6. Cas Négatifs

### Tests Erreurs

| # | Scénario | Action | Comportement Attendu | Status |
|---|----------|--------|----------------------|--------|
| 6.1 | **Realtime désactivé** | Table sans replication | Log: "Realtime non activé", pas de crash | ☐ |
| 6.2 | **Provider absent** | Composant hors RealtimeProvider | Error boundary ou fallback gracieux | ☐ |
| 6.3 | **Channel error** | Erreur WebSocket | Tentative de reconnexion automatique | ☐ |
| 6.4 | **Timeout** | Pas de réponse serveur | Status "error", retry après 3s | ☐ |
| 6.5 | **Envoi message offline** | Envoyer sans réseau | Toast erreur, message préservé dans input | ☐ |
| 6.6 | **Upload fichier échoué** | Fichier trop gros (>10MB) | Toast "Fichier trop volumineux" | ☐ |
| 6.7 | **Thread inexistant** | threadId invalide | Message "Conversation non trouvée" | ☐ |
| 6.8 | **Permission denied** | Accès thread non autorisé | Erreur RLS, message approprié | ☐ |

---

## 7. Accessibilité Real-time

### Tests Accessibilité

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 7.1 | **Focus chat input** | Tab vers zone saisie | Input focusé, clavier visible (mobile) | ☐ |
| 7.2 | **Screen reader notif** | Nouvelle notification | Annonce vocale du contenu | ☐ |
| 7.3 | **Screen reader message** | Nouveau message reçu | Annonce du message et expéditeur | ☐ |
| 7.4 | **Keyboard navigation** | Tab dans chat | Navigation fluide entre messages | ☐ |
| 7.5 | **Contraste badges** | Badge count notifications | Ratio ≥ 4.5:1 | ☐ |

---

## 8. Mobile Real-time

### Tests Mobile

| # | Test | Viewport | Résultat Attendu | Status |
|---|------|----------|------------------|--------|
| 8.1 | **Chat 375px** | iPhone SE | Chat utilisable, input visible | ☐ |
| 8.2 | **Clavier virtuel** | Focus input | Chat se redimensionne, pas de masquage | ☐ |
| 8.3 | **Touch messages** | Tap sur message | Action contextuelle (si applicable) | ☐ |
| 8.4 | **Scroll touch** | Scroll dans chat | Scroll fluide, pas de lag | ☐ |
| 8.5 | **Notif mobile** | Réception notification | Toast visible même sur petit écran | ☐ |

---

## Résumé d'Exécution

### Compteur de Tests

| Section | Tests | Passés | Échoués |
|---------|-------|--------|---------|
| 1. Provider Connexion | 10 | ☐ /10 | ☐ |
| 2. Notifications | 12 | ☐ /12 | ☐ |
| 3. Chat/Messagerie | 23 | ☐ /23 | ☐ |
| 4. Types Conversations | 5 | ☐ /5 | ☐ |
| 5. Performance | 6 | ☐ /6 | ☐ |
| 6. Cas Négatifs | 8 | ☐ /8 | ☐ |
| 7. Accessibilité | 5 | ☐ /5 | ☐ |
| 8. Mobile | 5 | ☐ /5 | ☐ |
| **TOTAL** | **74** | ☐ /74 | ☐ |

### Critères de Go/No-Go

| Résultat | Décision |
|----------|----------|
| **Sections 1-4 : 50/50** | ✅ GO - Core real-time fonctionnel |
| **40-49/50 core** | ⚠️ WARNING - Vérifier les échecs critiques |
| **< 40/50 core** | ❌ NO-GO - Real-time instable |

---

## Debugging Real-time

### Console Logs

```javascript
// Logs attendus au démarrage
[REALTIME] Setting up channel for user {userId}
[REALTIME] ✅ Connected to channel seido:{userId}:{teamId}
[REALTIME] Handler registered: notifications:* (handler_xxx)

// Logs réception événement
[REALTIME] Dispatched notifications:INSERT to 1 handler(s)
```

### DevTools WebSocket

1. Ouvrir DevTools → Network → WS
2. Vérifier 1 seul WebSocket vers `*.supabase.co`
3. Inspecter les frames pour voir les événements

### Vérification Supabase Dashboard

1. **Database → Replication** : Toutes les tables doivent être listées
2. **Realtime → Policies** : RLS policies doivent être actives
3. **Realtime → Inspector** : Voir les événements en temps réel

---

## Références

- **Supabase Realtime** : [Official Docs](https://supabase.com/docs/guides/realtime)
- **Provider** : `contexts/realtime-context.tsx`
- **Hooks** : `hooks/use-realtime-*.ts`
- **Chat** : `components/chat/chat-interface.tsx`

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (74 tests) |

---

**Mainteneur** : Claude Code
**Tests** : 74 (52 core + 22 extended)
**Durée estimée** : 1h30-2h
