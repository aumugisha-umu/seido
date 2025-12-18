# Parcours E2E - Administrateur SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Rôle** : Admin (2% des utilisateurs)
> **Priorité** : P1 - Important
> **Durée estimée** : 45-60 minutes
> **Scenarios** : 28

---

## Références

- **Compte de test** : `admin@test-seido.fr` / `TestSeido2024!`
- **Glossaire** : `12-glossaire.md`
- **Données de test** : `11-donnees-test.md`
- **Cas négatifs** : `14-cas-negatifs.md`

---

## Vue d'Ensemble

Le rôle Admin a des **privilèges système** et peut :
- Gérer tous les utilisateurs (CRUD)
- Changer les rôles des utilisateurs
- Activer/désactiver des comptes
- Impersoner d'autres utilisateurs
- Accéder aux KPIs système

### Pages Admin

| Page | Route | Fonctionnalité |
|------|-------|----------------|
| Dashboard | `/admin/dashboard` | KPIs système, statistiques |
| Utilisateurs | `/admin/users` | Gestion CRUD utilisateurs |
| Notifications | `/admin/notifications` | Notifications admin |
| Profil | `/admin/profile` | Profil administrateur |
| Impersonation | `/auth/impersonate` | Usurper identité |

---

## Feature 1 : Authentification Admin

```gherkin
Feature: Authentification Administrateur
  En tant qu'administrateur SEIDO
  Je veux me connecter à l'application
  Afin d'accéder aux fonctionnalités d'administration système

  Background:
    Given je suis sur la page "/auth/login"
    And je ne suis pas connecté

  @smoke @p0 @happy-path
  Scenario: Login admin réussi
    When je saisis "admin@test-seido.fr" dans le champ email
    And je saisis "TestSeido2024!" dans le champ mot de passe
    And je clique sur le bouton "Se connecter"
    Then je suis redirigé vers "/admin/dashboard" en moins de 3 secondes
    And je vois le message "Bienvenue" dans le header
    And le badge "Admin" est visible dans le header

  @p0 @negative
  Scenario: Login admin avec mauvais mot de passe
    When je saisis "admin@test-seido.fr" dans le champ email
    And je saisis "WrongPassword!" dans le champ mot de passe
    And je clique sur le bouton "Se connecter"
    Then je vois le message d'erreur "Email ou mot de passe incorrect"
    And je reste sur la page "/auth/login"

  @p1 @happy-path
  Scenario: Déconnexion admin
    Given je suis connecté en tant que "admin@test-seido.fr"
    When je clique sur mon avatar dans le header
    And je clique sur "Déconnexion"
    Then je suis redirigé vers "/auth/login"
    And ma session est terminée
```

### Checklist Feature 1

| # | Test | Résultat |
|---|------|----------|
| 1.1 | Login admin avec credentials valides | ☐ |
| 1.2 | Redirection vers /admin/dashboard | ☐ |
| 1.3 | Badge "Admin" visible dans header | ☐ |
| 1.4 | Login avec mauvais mot de passe échoue | ☐ |
| 1.5 | Déconnexion fonctionne | ☐ |

---

## Feature 2 : Dashboard Admin

```gherkin
Feature: Dashboard Administrateur
  En tant qu'administrateur
  Je veux voir les KPIs système
  Afin de surveiller l'état de la plateforme

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/dashboard"

  @smoke @p0 @happy-path
  Scenario: Affichage du dashboard admin
    Then je vois la section "Statistiques Système"
    And je vois le nombre total d'utilisateurs
    And je vois le nombre total d'équipes
    And je vois le nombre d'interventions actives
    And le bouton "Actualiser" est visible

  @p1 @happy-path
  Scenario: Actualisation des données dashboard
    When je clique sur le bouton "Actualiser"
    Then les données du dashboard sont rechargées
    And je vois un indicateur de chargement pendant la mise à jour
    And les statistiques sont mises à jour

  @p1 @happy-path
  Scenario: Navigation vers paramètres système
    When je clique sur le bouton "Paramètres"
    Then je suis redirigé vers la page des paramètres système

  @p1 @negative
  Scenario: Dashboard avec erreur de chargement
    Given le serveur retourne une erreur 500
    When je charge le dashboard
    Then je vois un message d'erreur "Erreur de chargement"
    And un bouton "Réessayer" est visible
```

### Checklist Feature 2

| # | Test | Résultat |
|---|------|----------|
| 2.1 | Dashboard affiche statistiques système | ☐ |
| 2.2 | Nombre total d'utilisateurs visible | ☐ |
| 2.3 | Nombre d'équipes visible | ☐ |
| 2.4 | Bouton Actualiser fonctionne | ☐ |
| 2.5 | Navigation vers paramètres | ☐ |

---

## Feature 3 : Gestion des Utilisateurs - Liste

```gherkin
Feature: Liste des Utilisateurs
  En tant qu'administrateur
  Je veux voir la liste de tous les utilisateurs
  Afin de gérer les comptes de la plateforme

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/users"

  @smoke @p0 @happy-path
  Scenario: Affichage de la liste des utilisateurs
    Then je vois un tableau avec les colonnes :
      | Nom | Email | Rôle | Statut | Actions |
    And au moins 5 utilisateurs sont affichés
    And je vois un champ de recherche
    And je vois un filtre par rôle
    And je vois un bouton "Créer un utilisateur"

  @p1 @happy-path
  Scenario: Recherche d'un utilisateur par nom
    When je saisis "Thomas" dans le champ de recherche
    Then seuls les utilisateurs contenant "Thomas" sont affichés
    And les autres utilisateurs sont masqués

  @p1 @happy-path
  Scenario: Recherche d'un utilisateur par email
    When je saisis "gestionnaire@test-seido.fr" dans le champ de recherche
    Then l'utilisateur avec cet email est affiché
    And les résultats sont mis à jour en temps réel

  @p1 @happy-path
  Scenario: Filtrage par rôle Gestionnaire
    When je sélectionne "Gestionnaire" dans le filtre de rôle
    Then seuls les utilisateurs avec le rôle "Gestionnaire" sont affichés
    And le badge bleu "Gestionnaire" est visible pour chaque ligne

  @p1 @happy-path
  Scenario: Filtrage par rôle Prestataire
    When je sélectionne "Prestataire" dans le filtre de rôle
    Then seuls les utilisateurs avec le rôle "Prestataire" sont affichés
    And le badge orange "Prestataire" est visible pour chaque ligne

  @p1 @happy-path
  Scenario: Filtrage par rôle Locataire
    When je sélectionne "Locataire" dans le filtre de rôle
    Then seuls les utilisateurs avec le rôle "Locataire" sont affichés
    And le badge vert "Locataire" est visible pour chaque ligne

  @p1 @happy-path
  Scenario: Réinitialisation des filtres
    Given j'ai filtré par rôle "Gestionnaire"
    When je sélectionne "Tous les rôles" dans le filtre
    Then tous les utilisateurs sont à nouveau affichés

  @p2 @negative
  Scenario: Recherche sans résultat
    When je saisis "utilisateur_inexistant_xyz" dans le champ de recherche
    Then je vois le message "Aucun utilisateur trouvé"
    And un bouton "Réinitialiser" est visible
```

### Checklist Feature 3

| # | Test | Résultat |
|---|------|----------|
| 3.1 | Tableau des utilisateurs s'affiche | ☐ |
| 3.2 | Colonnes correctes (Nom, Email, Rôle, Statut, Actions) | ☐ |
| 3.3 | Recherche par nom fonctionne | ☐ |
| 3.4 | Recherche par email fonctionne | ☐ |
| 3.5 | Filtre par rôle Gestionnaire | ☐ |
| 3.6 | Filtre par rôle Prestataire | ☐ |
| 3.7 | Filtre par rôle Locataire | ☐ |
| 3.8 | Réinitialisation des filtres | ☐ |
| 3.9 | Message "Aucun résultat" si recherche vide | ☐ |

---

## Feature 4 : Gestion des Utilisateurs - CRUD

```gherkin
Feature: CRUD Utilisateurs
  En tant qu'administrateur
  Je veux créer, modifier et supprimer des utilisateurs
  Afin de gérer les accès à la plateforme

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/users"

  @p0 @happy-path
  Scenario: Création d'un nouvel utilisateur
    When je clique sur le bouton "Créer un utilisateur"
    Then une modale de création s'ouvre
    When je remplis le formulaire :
      | Champ | Valeur |
      | Prénom | Jean |
      | Nom | Test |
      | Email | jean.test@seido.fr |
      | Rôle | Gestionnaire |
    And je clique sur "Créer"
    Then je vois le message de succès "Utilisateur créé avec succès"
    And le nouvel utilisateur apparaît dans la liste
    And son statut est "En attente" (invitation envoyée)

  @p1 @happy-path
  Scenario: Modification du nom d'un utilisateur
    Given l'utilisateur "jean.test@seido.fr" existe
    When je clique sur le menu actions (⋮) de cet utilisateur
    And je clique sur "Modifier"
    Then une modale de modification s'ouvre
    And les champs sont pré-remplis avec les données actuelles
    When je modifie le nom en "TestModifié"
    And je clique sur "Enregistrer"
    Then je vois le message de succès "Utilisateur modifié"
    And le nom est mis à jour dans la liste

  @p1 @happy-path
  Scenario: Suppression d'un utilisateur
    Given l'utilisateur "jean.test@seido.fr" existe
    When je clique sur le menu actions (⋮) de cet utilisateur
    And je clique sur "Supprimer"
    Then une modale de confirmation s'ouvre
    And je vois le message "Êtes-vous sûr de vouloir supprimer cet utilisateur ?"
    When je clique sur "Confirmer la suppression"
    Then je vois le message de succès "Utilisateur supprimé"
    And l'utilisateur n'apparaît plus dans la liste

  @p0 @negative
  Scenario: Création avec email déjà existant
    When je clique sur "Créer un utilisateur"
    And je remplis avec un email existant "gestionnaire@test-seido.fr"
    And je clique sur "Créer"
    Then je vois le message d'erreur "Un utilisateur avec cet email existe déjà"
    And la modale reste ouverte

  @p1 @negative
  Scenario: Création avec email invalide
    When je clique sur "Créer un utilisateur"
    And je saisis "email-invalide" dans le champ email
    And je clique sur "Créer"
    Then je vois le message d'erreur "Format email invalide"

  @p2 @security
  Scenario: Impossible de se supprimer soi-même
    When je cherche mon propre compte "admin@test-seido.fr"
    And je clique sur le menu actions (⋮)
    Then l'option "Supprimer" est désactivée ou absente
    And un tooltip indique "Vous ne pouvez pas supprimer votre propre compte"
```

### Checklist Feature 4

| # | Test | Résultat |
|---|------|----------|
| 4.1 | Création d'utilisateur fonctionne | ☐ |
| 4.2 | Email d'invitation envoyé après création | ☐ |
| 4.3 | Modification d'utilisateur fonctionne | ☐ |
| 4.4 | Suppression avec confirmation | ☐ |
| 4.5 | Erreur si email déjà existant | ☐ |
| 4.6 | Validation email invalide | ☐ |
| 4.7 | Impossible de se supprimer soi-même | ☐ |

---

## Feature 5 : Changement de Rôle

```gherkin
Feature: Changement de Rôle Utilisateur
  En tant qu'administrateur
  Je veux changer le rôle d'un utilisateur
  Afin de modifier ses permissions

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/users"

  @p0 @happy-path
  Scenario: Changer un Locataire en Gestionnaire
    Given l'utilisateur "locataire@test-seido.fr" a le rôle "Locataire"
    When je clique sur le menu actions (⋮) de cet utilisateur
    And je clique sur "Changer le rôle"
    Then une modale s'ouvre avec les rôles disponibles
    When je sélectionne "Gestionnaire"
    And je clique sur "Confirmer"
    Then je vois le message "Rôle modifié avec succès"
    And le badge passe de vert (Locataire) à bleu (Gestionnaire)

  @p1 @happy-path
  Scenario: Changer un Gestionnaire en Admin
    Given l'utilisateur "gestionnaire@test-seido.fr" a le rôle "Gestionnaire"
    When je change son rôle en "Administrateur"
    Then le badge devient rouge "Admin"
    And l'utilisateur a maintenant accès au dashboard admin

  @p1 @security
  Scenario: Confirmation requise pour promotion Admin
    When je tente de promouvoir un utilisateur en "Administrateur"
    Then une confirmation supplémentaire est demandée
    And un message avertit "Cette action donnera des privilèges système"

  @p1 @security
  Scenario: Impossible de rétrograder le dernier admin
    Given il n'y a qu'un seul utilisateur avec le rôle "Admin"
    When je tente de changer son rôle
    Then je vois l'erreur "Impossible : au moins un administrateur requis"
```

### Checklist Feature 5

| # | Test | Résultat |
|---|------|----------|
| 5.1 | Changement de rôle fonctionne | ☐ |
| 5.2 | Badge de rôle mis à jour visuellement | ☐ |
| 5.3 | Confirmation pour promotion Admin | ☐ |
| 5.4 | Protection dernier admin | ☐ |

---

## Feature 6 : Activation/Désactivation de Compte

```gherkin
Feature: Activation et Désactivation de Comptes
  En tant qu'administrateur
  Je veux activer ou désactiver des comptes utilisateurs
  Afin de contrôler l'accès à la plateforme

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/users"

  @p0 @happy-path
  Scenario: Désactivation d'un compte actif
    Given l'utilisateur "prestataire@test-seido.fr" a le statut "Actif"
    When je clique sur le menu actions (⋮) de cet utilisateur
    And je clique sur "Désactiver le compte"
    Then une confirmation est demandée
    When je confirme
    Then je vois le message "Compte désactivé"
    And le statut passe à "Désactivé" (badge gris)
    And l'utilisateur ne peut plus se connecter

  @p0 @happy-path
  Scenario: Réactivation d'un compte désactivé
    Given l'utilisateur "prestataire@test-seido.fr" a le statut "Désactivé"
    When je clique sur "Activer le compte"
    Then le statut passe à "Actif" (badge vert)
    And l'utilisateur peut à nouveau se connecter

  @p1 @security
  Scenario: Impossible de se désactiver soi-même
    When je cherche mon propre compte "admin@test-seido.fr"
    Then l'option "Désactiver" n'est pas disponible

  @p1 @negative
  Scenario: Connexion avec compte désactivé
    Given l'utilisateur "test-desactive@seido.fr" est désactivé
    When cet utilisateur tente de se connecter
    Then il voit le message "Ce compte a été désactivé"
    And la connexion est refusée
```

### Checklist Feature 6

| # | Test | Résultat |
|---|------|----------|
| 6.1 | Désactivation de compte fonctionne | ☐ |
| 6.2 | Statut passe à "Désactivé" (badge gris) | ☐ |
| 6.3 | Réactivation de compte fonctionne | ☐ |
| 6.4 | Impossible de se désactiver soi-même | ☐ |
| 6.5 | Utilisateur désactivé ne peut pas se connecter | ☐ |

---

## Feature 7 : Impersonation

```gherkin
Feature: Impersonation d'Utilisateurs
  En tant qu'administrateur
  Je veux me connecter en tant qu'un autre utilisateur
  Afin de diagnostiquer des problèmes ou vérifier des permissions

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/users"

  @p0 @happy-path
  Scenario: Impersoner un Gestionnaire
    Given l'utilisateur "gestionnaire@test-seido.fr" existe et est actif
    When je clique sur le menu actions (⋮) de cet utilisateur
    And je clique sur "Se connecter en tant que"
    Then une confirmation est demandée
    And un message avertit "Vous allez voir l'application comme cet utilisateur"
    When je confirme
    Then je suis redirigé vers "/gestionnaire/dashboard"
    And je vois une bannière "Mode impersonation : gestionnaire@test-seido.fr"
    And un bouton "Revenir à mon compte" est visible

  @p0 @happy-path
  Scenario: Retour à son compte après impersonation
    Given je suis en mode impersonation en tant que "gestionnaire@test-seido.fr"
    When je clique sur "Revenir à mon compte"
    Then je suis redirigé vers "/admin/dashboard"
    And la bannière d'impersonation disparaît
    And je suis reconnecté en tant qu'admin

  @p1 @happy-path
  Scenario: Impersoner un Locataire
    When j'impersone l'utilisateur "locataire@test-seido.fr"
    Then je suis redirigé vers "/locataire/dashboard"
    And je vois l'interface locataire
    And je peux créer une demande d'intervention

  @p1 @happy-path
  Scenario: Impersoner un Prestataire
    When j'impersone l'utilisateur "prestataire@test-seido.fr"
    Then je suis redirigé vers "/prestataire/dashboard"
    And je vois le planning du prestataire
    And je peux accéder aux devis

  @p1 @security
  Scenario: Impossible d'impersoner un autre Admin
    Given l'utilisateur "autre-admin@seido.fr" a le rôle "Admin"
    When je tente de l'impersoner
    Then je vois l'erreur "Impossible d'impersoner un administrateur"

  @p1 @security
  Scenario: Impossible d'impersoner un compte désactivé
    Given l'utilisateur "desactive@seido.fr" est désactivé
    When je tente de l'impersoner
    Then je vois l'erreur "Ce compte est désactivé"

  @p2 @security
  Scenario: Audit log de l'impersonation
    When j'impersone l'utilisateur "gestionnaire@test-seido.fr"
    Then un log d'audit est créé avec :
      | Champ | Valeur |
      | Action | impersonation_start |
      | Admin | admin@test-seido.fr |
      | Target | gestionnaire@test-seido.fr |
      | Timestamp | [date/heure] |
```

### Checklist Feature 7

| # | Test | Résultat |
|---|------|----------|
| 7.1 | Impersonation d'un Gestionnaire | ☐ |
| 7.2 | Bannière d'impersonation visible | ☐ |
| 7.3 | Retour à son compte fonctionne | ☐ |
| 7.4 | Impersonation d'un Locataire | ☐ |
| 7.5 | Impersonation d'un Prestataire | ☐ |
| 7.6 | Impossible d'impersoner un Admin | ☐ |
| 7.7 | Impossible d'impersoner compte désactivé | ☐ |

---

## Feature 8 : Notifications Admin

```gherkin
Feature: Notifications Administrateur
  En tant qu'administrateur
  Je veux recevoir des notifications système
  Afin d'être alerté des événements importants

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"

  @p1 @happy-path
  Scenario: Affichage du badge de notifications
    Given j'ai 3 notifications non lues
    Then je vois le badge "3" sur l'icône de notification dans le header

  @p1 @happy-path
  Scenario: Accès à la page des notifications
    When je clique sur l'icône de notification
    Then je suis redirigé vers "/admin/notifications"
    And je vois la liste de mes notifications
    And les notifications non lues sont mises en évidence

  @p1 @happy-path
  Scenario: Marquer une notification comme lue
    Given j'ai une notification non lue
    When je clique sur cette notification
    Then elle est marquée comme lue
    And le badge diminue de 1

  @p2 @happy-path
  Scenario: Marquer toutes les notifications comme lues
    Given j'ai 5 notifications non lues
    When je clique sur "Tout marquer comme lu"
    Then toutes les notifications sont marquées comme lues
    And le badge disparaît
```

### Checklist Feature 8

| # | Test | Résultat |
|---|------|----------|
| 8.1 | Badge de notifications visible | ☐ |
| 8.2 | Page notifications accessible | ☐ |
| 8.3 | Marquer comme lu fonctionne | ☐ |
| 8.4 | Marquer tout comme lu fonctionne | ☐ |

---

## Feature 9 : Profil Admin

```gherkin
Feature: Profil Administrateur
  En tant qu'administrateur
  Je veux gérer mon profil
  Afin de maintenir mes informations à jour

  Background:
    Given je suis connecté en tant que "admin@test-seido.fr"
    And je suis sur la page "/admin/profile"

  @p1 @happy-path
  Scenario: Affichage du profil admin
    Then je vois mes informations :
      | Champ | Valeur |
      | Nom | Admin Test |
      | Email | admin@test-seido.fr |
      | Rôle | Administrateur |
    And je vois un avatar ou une icône par défaut
    And je vois un bouton "Modifier le profil"

  @p1 @happy-path
  Scenario: Modification du nom
    When je clique sur "Modifier le profil"
    And je change mon nom en "Admin Modifié"
    And je clique sur "Enregistrer"
    Then je vois le message "Profil mis à jour"
    And mon nom est mis à jour dans le header

  @p2 @happy-path
  Scenario: Upload d'un avatar
    When je clique sur "Modifier l'avatar"
    And je sélectionne une image (jpg, 500x500px, <2MB)
    Then l'avatar est mis à jour
    And je vois l'aperçu de ma nouvelle photo
```

### Checklist Feature 9

| # | Test | Résultat |
|---|------|----------|
| 9.1 | Profil affiche les bonnes informations | ☐ |
| 9.2 | Modification du nom fonctionne | ☐ |
| 9.3 | Upload d'avatar fonctionne | ☐ |

---

## Résumé des Tests

### Statistiques

| Feature | Scenarios | Happy Path | Negative | Security |
|---------|-----------|------------|----------|----------|
| 1. Auth Admin | 3 | 2 | 1 | 0 |
| 2. Dashboard | 4 | 3 | 1 | 0 |
| 3. Liste Utilisateurs | 8 | 7 | 1 | 0 |
| 4. CRUD Utilisateurs | 6 | 3 | 2 | 1 |
| 5. Changement Rôle | 4 | 2 | 0 | 2 |
| 6. Activation/Désactivation | 4 | 2 | 1 | 1 |
| 7. Impersonation | 7 | 4 | 0 | 3 |
| 8. Notifications | 4 | 4 | 0 | 0 |
| 9. Profil | 3 | 3 | 0 | 0 |
| **TOTAL** | **28** | **20** | **4** | **4** |

### Priorisation

| Priorité | Tests | Description |
|----------|-------|-------------|
| P0 (Bloquant) | 8 | Login, CRUD utilisateurs, Impersonation base |
| P1 (Important) | 16 | Filtres, rôles, activation, notifications |
| P2 (Standard) | 4 | Audit log, avatar, fonctions avancées |

---

## Tests de Sécurité Obligatoires

### Vérifications Critiques

| # | Test Critique | Résultat |
|---|---------------|----------|
| S1 | Admin ne peut pas se supprimer lui-même | ☐ Pass / ☐ FAIL |
| S2 | Admin ne peut pas se désactiver lui-même | ☐ Pass / ☐ FAIL |
| S3 | Admin ne peut pas impersoner un autre Admin | ☐ Pass / ☐ FAIL |
| S4 | Dernier admin ne peut pas être rétrogradé | ☐ Pass / ☐ FAIL |
| S5 | Compte désactivé ne peut pas se connecter | ☐ Pass / ☐ FAIL |
| S6 | Impersonation logguée dans audit | ☐ Pass / ☐ FAIL |

**Si un test échoue → BUG CRITIQUE P0**

---

## Informations de Session

| Champ | Valeur |
|-------|--------|
| **Date du test** | ____/____/________ |
| **Testeur** | ________________________ |
| **Environnement** | ☐ Local ☐ Preview ☐ Production |
| **Navigateur** | ________________________ |
| **Résolution** | ________________________ |

### Résultat Global

| Métrique | Valeur |
|----------|--------|
| **Tests passés** | ____/28 |
| **Tests échoués** | ____ |
| **Bugs découverts** | ____ |
| **Durée totale** | ____ minutes |

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (28 scenarios) |

---

**Mainteneur** : Claude Code
