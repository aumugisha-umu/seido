# Parcours E2E Propriétaire - SEIDO

> **Version** : 2.0 (Format Gherkin enrichi)
> **Rôle** : Propriétaire (5% des utilisateurs)
> **Focus** : Consultation patrimoine, suivi interventions (lecture seule)
> **Priorité** : P2 - Standard
> **UX** : Interface professionnelle, données consolidées, pas d'actions de modification
> **Durée estimée** : 45 minutes - 1 heure

---

## Références

- **Compte de test** : `proprietaire@test-seido.fr` / `TestSeido2024!`
- **Données de test** : Voir [11-donnees-test.md](./11-donnees-test.md)
- **Glossaire** : Voir [12-glossaire.md](./12-glossaire.md)

---

## ⚠️ Points Critiques - Rôle Lecture Seule

> **IMPORTANT** : Le rôle Propriétaire est **strictement en lecture seule**.
>
> Le propriétaire ne doit **JAMAIS** pouvoir :
> - Créer des biens, lots, contacts ou interventions
> - Modifier des données existantes
> - Supprimer des éléments
> - Valider ou rejeter des devis
> - Changer le statut d'une intervention
> - Assigner des prestataires
>
> **Toute possibilité de modification = BUG CRITIQUE**

---

## Feature 1: Connexion et Dashboard

```gherkin
Feature: Authentification et Dashboard Propriétaire
  En tant que propriétaire
  Je veux me connecter et voir mon patrimoine
  Afin de suivre mes biens et les interventions

  Background:
    Given je suis propriétaire de biens gérés par SEIDO

  @smoke @p0 @happy-path
  Scenario: Première connexion via invitation email
    Given j'ai reçu un email d'invitation de mon gestionnaire
    And l'email contient un lien "Accéder à mon espace propriétaire"
    When je clique sur le lien d'invitation
    Then je suis sur la page "/auth/set-password"
    And je vois "Créez votre mot de passe"

    When je saisis un mot de passe "TestProp2024!"
    And je confirme avec "TestProp2024!"
    And je clique sur "Activer mon compte"
    Then mon compte est activé
    And je suis redirigé vers "/proprietaire/dashboard"
    And je vérifie que mon rôle est "proprietaire" (lecture seule)

  @smoke @p0 @happy-path
  Scenario: Connexion standard avec identifiants valides
    Given je suis sur la page "/auth/login"
    When je saisis l'email "proprietaire@test-seido.fr"
    And je saisis le mot de passe "TestSeido2024!"
    And je clique sur "Se connecter"
    Then je suis redirigé vers "/proprietaire/dashboard" en moins de 3 secondes
    And l'interface est professionnelle et consolidée

  @p0 @happy-path
  Scenario: Consultation du dashboard propriétaire
    Given je suis connecté en tant que propriétaire
    When je suis sur "/proprietaire/dashboard"
    Then je vois les KPIs consolidés :
      | KPI | Visible |
      | Nombre total de biens | Oui |
      | Nombre d'interventions en cours | Oui |
      | Taux d'occupation (si disponible) | Oui |
    And les données sont présentées de manière claire et professionnelle
    And je peux naviguer vers mes biens et interventions

  @p0 @security @critical
  Scenario: Vérification absence de boutons de création
    Given je suis sur le dashboard propriétaire
    Then je ne vois PAS de bouton "Nouveau bien"
    And je ne vois PAS de bouton "Nouvelle intervention"
    And je ne vois PAS de bouton "Créer" ou "Ajouter"
    And l'interface est clairement en mode consultation
```

### Checklist de Validation - Feature 1

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 1.1 | Email d'invitation avec lien valide | ☐ |
| 1.2 | Activation compte fonctionnelle | ☐ |
| 1.3 | Redirection vers dashboard propriétaire | ☐ |
| 1.4 | KPIs consolidés visibles | ☐ |
| 1.5 | **AUCUN bouton de création visible** | ☐ |
| 1.6 | Interface professionnelle et claire | ☐ |

---

## Feature 2: Consultation des Biens

```gherkin
Feature: Consultation des Biens (Lecture Seule)
  En tant que propriétaire
  Je veux consulter mon patrimoine immobilier
  Afin de suivre l'état de mes biens

  Background:
    Given je suis connecté en tant que "proprietaire@test-seido.fr"
    And je possède plusieurs biens gérés par SEIDO

  @p0 @happy-path
  Scenario: Consultation de la liste des biens
    When je navigue vers "/proprietaire/biens" ou "Mes biens"
    Then je vois la liste de mes biens :
      | Élément | Visible |
      | Nom de l'immeuble | Oui |
      | Adresse | Oui |
      | Nombre de lots | Oui |
      | Taux d'occupation | Oui (si disponible) |
    And les filtres de recherche sont disponibles
    And la recherche par nom/adresse fonctionne

  @p0 @security @critical
  Scenario: Vérification lecture seule sur liste des biens
    Given je suis sur la liste des biens
    Then je ne vois PAS de bouton "Ajouter un bien"
    And je ne vois PAS de bouton "Nouveau"
    And je ne vois PAS d'icône de suppression
    And les seules actions sont la consultation (clic pour voir détail)

  @p0 @happy-path
  Scenario: Consultation du détail d'un immeuble
    Given je suis sur la liste des biens
    When je clique sur l'immeuble "Résidence Les Lilas"
    Then je vois la page détail avec :
      | Section | Contenu |
      | Informations | Nom, adresse, caractéristiques |
      | Liste des lots | Tous les lots avec statut occupation |
      | Contacts | Gardien, syndic (si associés) |
      | Documents | Documents consultables |

    And pour chaque lot, je vois :
      | Élément | Visible |
      | Référence | Oui |
      | Catégorie | Oui (appartement, garage, etc.) |
      | Statut | Occupé ou Vacant |
      | Locataire | Nom si occupé |

  @p0 @security @critical
  Scenario: Vérification lecture seule sur détail immeuble
    Given je suis sur le détail d'un immeuble
    Then je ne vois PAS de bouton "Modifier"
    And je ne vois PAS de bouton "Supprimer"
    And je ne vois PAS de bouton "Ajouter un lot"
    And toutes les informations sont affichées mais non éditables

  @p1 @happy-path
  Scenario: Consultation du détail d'un lot
    Given je suis sur le détail d'un immeuble
    When je clique sur le lot "Apt 3B"
    Then je vois la page détail avec :
      | Section | Contenu |
      | Caractéristiques | Surface, étage, pièces |
      | Occupation | Locataire actuel si occupé |
      | Contrat | Dates du bail si actif |
      | Interventions | Historique interventions sur ce lot |
      | Documents | Documents du lot |

  @p0 @security @critical
  Scenario: Vérification lecture seule sur détail lot
    Given je suis sur le détail d'un lot
    Then je ne vois PAS de bouton "Modifier"
    And je ne vois PAS de bouton "Supprimer"
    And je ne vois PAS de bouton "Ajouter locataire"
    And les informations du locataire sont visibles mais protégées
```

### Checklist de Validation - Feature 2

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 2.1 | Liste biens avec tous les éléments | ☐ |
| 2.2 | Filtres et recherche fonctionnels | ☐ |
| 2.3 | **AUCUN bouton d'ajout sur liste** | ☐ |
| 2.4 | Détail immeuble complet | ☐ |
| 2.5 | Liste des lots visible | ☐ |
| 2.6 | Statut occupation visible | ☐ |
| 2.7 | **AUCUN bouton Modifier/Supprimer sur détail** | ☐ |
| 2.8 | Détail lot consultable | ☐ |
| 2.9 | Informations locataire visibles | ☐ |

---

## Feature 3: Consultation des Interventions

```gherkin
Feature: Consultation des Interventions (Lecture Seule)
  En tant que propriétaire
  Je veux suivre les interventions sur mon patrimoine
  Afin de connaître les travaux effectués et les coûts

  Background:
    Given je suis connecté en tant que propriétaire
    And des interventions existent sur mes biens

  @p0 @happy-path
  Scenario: Consultation de la liste des interventions
    When je navigue vers "/proprietaire/interventions"
    Then je vois la liste des interventions de mon patrimoine :
      | Colonne | Visible |
      | Référence | Oui |
      | Bien concerné | Oui |
      | Type | Oui |
      | Statut | Oui (badge couleur) |
      | Date | Oui |
      | Coût (si devis validé) | Oui |

    And les filtres sont disponibles :
      | Filtre |
      | Par statut |
      | Par bien |
      | Par type |
      | Par période |

    When je filtre par statut "En cours"
    Then seules les interventions actives s'affichent

  @p0 @security @critical
  Scenario: Vérification lecture seule sur liste interventions
    Given je suis sur la liste des interventions
    Then je ne vois PAS de bouton "Nouvelle intervention"
    And je ne vois PAS de bouton "Créer"
    And les seules actions sont la consultation (clic pour voir détail)

  @p0 @happy-path
  Scenario: Consultation du détail d'une intervention
    Given je suis sur la liste des interventions
    When je clique sur l'intervention "INT-2025-0006"
    Then je vois la page détail avec :
      | Section | Contenu |
      | Informations | Référence, type, description |
      | Statut | Badge statut actuel |
      | Bien | Immeuble et lot concernés (avec lien) |
      | Timeline | Historique complet des actions |
      | Prestataire | Nom et société si assigné |
      | Devis | Montant du devis validé |
      | Coûts | Coûts totaux de l'intervention |
      | Documents | Photos et documents associés |

  @p0 @happy-path
  Scenario: Consultation de la timeline d'une intervention
    Given je suis sur le détail d'une intervention
    When je consulte la timeline
    Then je vois toutes les étapes :
      | Étape | Information |
      | Création | Date + par qui |
      | Validation | Date + par qui |
      | Devis accepté | Date + montant |
      | Planification | Date du RDV |
      | Travaux | Dates début/fin |
      | Clôture | Date + par qui |

  @p0 @happy-path
  Scenario: Consultation des devis
    Given une intervention a un devis validé
    When je suis sur le détail de l'intervention
    And je consulte la section "Devis"
    Then je vois :
      | Élément | Visible |
      | Prestataire | Oui |
      | Montant HT | Oui |
      | Montant TTC | Oui |
      | Description | Oui |
      | Statut | Accepté/Refusé/En attente |
      | Document PDF | Si fourni |

  @p0 @security @critical
  Scenario: Vérification lecture seule sur détail intervention
    Given je suis sur le détail d'une intervention
    Then je ne vois PAS de bouton "Modifier"
    And je ne vois PAS de bouton "Annuler"
    And je ne vois PAS de bouton "Changer statut"
    And je ne vois PAS de bouton "Valider/Rejeter devis"
    And je ne vois PAS de bouton "Assigner prestataire"
    And toutes les informations sont en lecture seule

  @p1
  Scenario: Consultation des documents et photos
    Given une intervention a des photos
    When je suis sur le détail de l'intervention
    And je clique sur l'onglet "Documents"
    Then je vois les photos avant/après
    And je peux agrandir chaque photo au clic
    And je peux télécharger les documents
    And je ne peux PAS supprimer ou ajouter de documents
```

### Checklist de Validation - Feature 3

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 3.1 | Liste interventions complète | ☐ |
| 3.2 | Tous les filtres fonctionnels | ☐ |
| 3.3 | Coûts visibles si devis validé | ☐ |
| 3.4 | **AUCUN bouton de création** | ☐ |
| 3.5 | Détail intervention complet | ☐ |
| 3.6 | Timeline visible avec toutes les étapes | ☐ |
| 3.7 | Devis consultables avec montants | ☐ |
| 3.8 | **AUCUNE action de modification possible** | ☐ |
| 3.9 | Photos consultables mais non modifiables | ☐ |

---

## Feature 4: Tests de Sécurité - Lecture Seule

```gherkin
Feature: Vérification Stricte du Mode Lecture Seule
  En tant que testeur sécurité
  Je veux vérifier que le propriétaire ne peut rien modifier
  Afin de garantir l'intégrité des données

  Background:
    Given je suis connecté en tant que "proprietaire@test-seido.fr"

  @security @critical @p0
  Scenario Outline: Tentative d'accès aux pages de création (URLs directes)
    When je tente d'accéder directement à "<url>"
    Then je suis redirigé vers "/proprietaire/dashboard"
    Ou je vois une erreur 403 "Accès non autorisé"
    And je ne peux pas accéder au formulaire de création

    Examples:
      | url |
      | /gestionnaire/biens/immeubles/nouveau |
      | /gestionnaire/biens/lots/nouveau |
      | /gestionnaire/interventions/nouvelle-intervention |
      | /gestionnaire/contacts/nouveau |
      | /gestionnaire/contrats/nouveau |

  @security @critical @p0
  Scenario: Vérification absence totale de boutons d'action
    Given je navigue sur toutes les pages propriétaire
    Then sur AUCUNE page je ne vois :
      | Bouton interdit |
      | Nouveau |
      | Créer |
      | Ajouter |
      | Modifier |
      | Éditer |
      | Supprimer |
      | Valider devis |
      | Rejeter devis |
      | Changer statut |
      | Assigner |

  @security @critical @p0
  Scenario: Vérification dans le menu de navigation
    When je consulte le menu de navigation
    Then je ne vois PAS "Nouvelle intervention"
    And je ne vois PAS "Nouveau bien"
    And je ne vois PAS "Nouveau contact"
    And le menu contient uniquement des liens de consultation :
      | Lien |
      | Dashboard |
      | Mes biens |
      | Interventions |

  @security @p1
  Scenario: Vérification API - Tentative de modification
    Given je suis authentifié en tant que propriétaire
    When une requête POST est envoyée à "/api/interventions"
    Then la réponse est 403 Forbidden
    And aucune donnée n'est créée

  @security @p1
  Scenario: Vérification RLS - Accès aux biens d'autres propriétaires
    Given un autre propriétaire possède des biens
    When je tente d'accéder au détail de ces biens
    Then je ne vois que mes propres biens
    And les biens des autres ne sont pas accessibles
```

### Checklist de Validation - Feature 4 (Sécurité)

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 4.1 | Redirection si accès URL /gestionnaire/* | ☐ |
| 4.2 | Aucun bouton de création sur aucune page | ☐ |
| 4.3 | Aucun bouton de modification sur aucune page | ☐ |
| 4.4 | Aucun bouton de suppression sur aucune page | ☐ |
| 4.5 | Menu navigation sans options de création | ☐ |
| 4.6 | API refuse les modifications (403) | ☐ |
| 4.7 | RLS : accès uniquement à son patrimoine | ☐ |

---

## Feature 5: Navigation et UX

```gherkin
Feature: Navigation et Expérience Utilisateur
  En tant que propriétaire
  Je veux une navigation claire et professionnelle
  Afin de consulter facilement mes informations

  Background:
    Given je suis connecté en tant que propriétaire

  @p1 @happy-path
  Scenario: Navigation complète
    When j'ouvre le menu de navigation
    Then je vois les sections :
      | Section |
      | Dashboard |
      | Mes biens |
      | Interventions |
      | Profil |

    When je clique sur "Mes biens"
    Then je suis sur la page liste des biens

    When je navigue vers "Interventions"
    Then je suis sur la page liste des interventions

  @p1 @happy-path
  Scenario: Fil d'Ariane (Breadcrumb)
    Given je suis sur le détail du lot "Apt 3B"
    Then le fil d'Ariane affiche :
      """
      Dashboard > Biens > Résidence Les Lilas > Apt 3B
      """

    When je clique sur "Résidence Les Lilas"
    Then je reviens sur la page détail de l'immeuble

  @p1
  Scenario: Liens entre entités
    Given je suis sur le détail d'une intervention
    When je clique sur le lien du bien concerné
    Then je suis redirigé vers la page détail du bien

    Given je suis sur le détail d'un lot
    When je clique sur une intervention liée
    Then je suis redirigé vers la page détail de l'intervention
```

### Checklist de Validation - Feature 5

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 5.1 | Menu navigation clair | ☐ |
| 5.2 | Fil d'Ariane fonctionnel | ☐ |
| 5.3 | Bouton retour fonctionnel | ☐ |
| 5.4 | Liens entre entités fonctionnels | ☐ |
| 5.5 | Interface professionnelle et consolidée | ☐ |

---

## Feature 6: Tests Mobile

```gherkin
Feature: Expérience Mobile Propriétaire
  En tant que propriétaire sur mobile
  Je veux consulter mon patrimoine
  Afin de suivre mes biens en déplacement

  Background:
    Given je suis sur un smartphone (viewport 375px)
    And je suis connecté en tant que propriétaire

  @mobile @p1 @happy-path
  Scenario: Navigation mobile
    When je charge le dashboard
    Then tous les éléments sont visibles sans scroll horizontal
    And le menu hamburger est accessible
    And les KPIs sont lisibles

    When je navigue vers "Mes biens"
    Then la liste s'affiche correctement
    And je peux cliquer sur un bien pour voir le détail

  @mobile @p1
  Scenario: Consultation détails sur mobile
    When je consulte le détail d'un immeuble
    Then les informations sont lisibles
    And les lots sont visibles (scroll vertical OK)
    And les onglets sont accessibles

  @mobile @performance @p1
  Scenario Outline: Performance mobile
    When je charge "<page>" en 4G
    Then le chargement initial est < <temps>

    Examples:
      | page | temps |
      | Dashboard | 3s |
      | Liste biens | 2s |
      | Détail immeuble | 2s |
```

### Checklist de Validation - Feature 6 (Mobile)

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 6.1 | Pas de scroll horizontal | ☐ |
| 6.2 | Menu hamburger fonctionnel | ☐ |
| 6.3 | Listes lisibles sur mobile | ☐ |
| 6.4 | Détails consultables sur mobile | ☐ |
| 6.5 | Performance < 3s sur 4G | ☐ |

---

## Feature 7: Gestion des Erreurs

```gherkin
Feature: Gestion des Erreurs
  En tant que propriétaire
  Je veux des messages clairs en cas de problème
  Afin de comprendre les situations d'erreur

  @negative @p1
  Scenario: Bien non trouvé
    When je tente d'accéder à un bien inexistant
    Then je vois une page 404 ou un message "Bien non trouvé"
    And je peux retourner à la liste des biens

  @negative @p1
  Scenario: Intervention d'un autre patrimoine
    Given une intervention existe sur un bien que je ne possède pas
    When je tente d'accéder au détail de cette intervention
    Then je vois un message "Accès non autorisé"
    Ou l'intervention n'apparaît pas dans ma liste

  @negative @p1
  Scenario: Session expirée
    Given ma session expire
    When je tente de naviguer
    Then je suis redirigé vers la page de login
    And un message "Session expirée, veuillez vous reconnecter" s'affiche

  @negative @p2
  Scenario: Erreur serveur
    Given une erreur serveur se produit
    Then je vois un message d'erreur clair
    And je peux réessayer ou contacter le support
```

### Checklist de Validation - Feature 7

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 7.1 | Page 404 pour bien inexistant | ☐ |
| 7.2 | Accès refusé aux biens d'autres propriétaires | ☐ |
| 7.3 | Redirection login si session expirée | ☐ |
| 7.4 | Messages d'erreur clairs | ☐ |

---

## Résumé Parcours Propriétaire

| Feature | Scénarios | Happy Path | Security | Testés |
|---------|-----------|------------|----------|--------|
| 1. Connexion/Dashboard | 4 | 3 | 1 | ☐ |
| 2. Consultation Biens | 6 | 3 | 3 | ☐ |
| 3. Consultation Interventions | 7 | 5 | 2 | ☐ |
| 4. Sécurité Lecture Seule | 5 | 0 | 5 | ☐ |
| 5. Navigation UX | 3 | 3 | 0 | ☐ |
| 6. Mobile | 3 | 3 | 0 | ☐ |
| 7. Erreurs | 4 | 0 | 0 | ☐ |
| **TOTAL** | **32** | **17** | **11** | |

---

## Points de Contrôle Critiques

### ⚠️ Tests Obligatoires avant Validation

| # | Test Critique | Résultat |
|---|--------------|----------|
| C1 | **AUCUN** bouton "Créer" visible nulle part | ☐ Pass / ☐ FAIL |
| C2 | **AUCUN** bouton "Modifier" visible nulle part | ☐ Pass / ☐ FAIL |
| C3 | **AUCUN** bouton "Supprimer" visible nulle part | ☐ Pass / ☐ FAIL |
| C4 | URLs /gestionnaire/* inaccessibles | ☐ Pass / ☐ FAIL |
| C5 | API refuse toute modification (403) | ☐ Pass / ☐ FAIL |
| C6 | Seuls mes biens sont visibles (RLS) | ☐ Pass / ☐ FAIL |

**Si un test échoue → BUG CRITIQUE P0**

---

## Informations de Session

| Champ | Valeur |
|-------|--------|
| **Testeur** | _________________ |
| **Date** | _________________ |
| **Environnement** | ☐ Local / ☐ Preview / ☐ Production |
| **Device** | ☐ Desktop / ☐ Tablet / ☐ Mobile |
| **Tests critiques** | ☐ Tous passés / ☐ Échecs (voir notes) |
| **Bugs trouvés** | _________________ |

---

## Notes et Observations

```
[Espace pour notes du testeur - NOTER TOUT BOUTON D'ACTION VISIBLE]




```

---

**Version** : 2.0
**Dernière mise à jour** : 2025-12-18
**Basé sur** : Template E2E Gherkin (`templates/test-case-e2e.md`)
