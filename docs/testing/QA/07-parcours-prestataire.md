# Parcours E2E Prestataire - SEIDO

> **Version** : 2.0 (Format Gherkin enrichi)
> **Rôle** : Prestataire (15% des utilisateurs)
> **Focus** : Exécution des interventions, devis, planning
> **Priorité** : P1 - Important
> **UX** : Mobile-first, gros boutons d'action
> **Durée estimée** : 1.5-2 heures

---

## Références

- **Compte de test** : `prestataire@test-seido.fr` / `TestSeido2024!`
- **Compte alternatif** : `electricien@test-seido.fr` / `TestSeido2024!`
- **Données de test** : Voir [11-donnees-test.md](./11-donnees-test.md)
- **Glossaire** : Voir [12-glossaire.md](./12-glossaire.md)

---

## Feature 1: Connexion et Dashboard

```gherkin
Feature: Authentification et Dashboard Prestataire
  En tant que prestataire
  Je veux me connecter et voir mon tableau de bord
  Afin de gérer mes interventions assignées

  Background:
    Given je suis un prestataire enregistré
    And j'ai des interventions assignées

  @smoke @p0 @happy-path
  Scenario: Première connexion via invitation email
    Given j'ai reçu un email d'invitation de "gestionnaire@test-seido.fr"
    And l'email contient un lien "Rejoindre SEIDO"
    When je clique sur le lien d'invitation
    Then je suis sur la page "/auth/set-password"
    And je vois "Créez votre mot de passe"

    When je saisis un mot de passe "TestPresta2024!"
    And je confirme avec "TestPresta2024!"
    Then le mot de passe est validé (indicateur de force visible)

    When je clique sur "Activer mon compte"
    Then mon compte est activé
    And je suis redirigé vers "/prestataire/dashboard"
    And un wizard de complétion de profil s'affiche (optionnel)

  @smoke @p0 @happy-path
  Scenario: Connexion standard avec identifiants valides
    Given je suis sur la page "/auth/login"
    When je saisis l'email "prestataire@test-seido.fr"
    And je saisis le mot de passe "TestSeido2024!"
    And je clique sur "Se connecter"
    Then je suis redirigé vers "/prestataire/dashboard" en moins de 3 secondes
    And je vois mon prénom dans le header (ex: "Jean")

  @p0 @happy-path
  Scenario: Consultation du dashboard prestataire
    Given je suis connecté en tant que prestataire
    When je suis sur "/prestataire/dashboard"
    Then je vois les KPIs suivants :
      | KPI | Visible |
      | Interventions en cours | Oui |
      | Interventions à venir | Oui |
      | Devis en attente | Oui |
      | Interventions urgentes | Oui (badge rouge si > 0) |
    And les interventions urgentes sont affichées en premier
    And les boutons d'action sont grands et facilement cliquables (touch-friendly)
    And la section "Prochains RDV" montre les interventions planifiées

  @negative @p1
  Scenario: Connexion avec invitation expirée
    Given j'ai reçu une invitation il y a plus de 7 jours
    When je clique sur le lien d'invitation
    Then je vois un message "Cette invitation a expiré"
    And un lien "Demander une nouvelle invitation" est visible
```

### Checklist de Validation - Feature 1

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 1.1 | Email d'invitation reçu avec lien valide | ☐ |
| 1.2 | Page set-password avec validation force mot de passe | ☐ |
| 1.3 | Activation compte avec redirection dashboard | ☐ |
| 1.4 | Connexion standard fonctionnelle | ☐ |
| 1.5 | Dashboard affiche KPIs (interventions, devis) | ☐ |
| 1.6 | Interventions urgentes mises en évidence | ☐ |
| 1.7 | Boutons d'action touch-friendly (≥44px) | ☐ |
| 1.8 | Section "Prochains RDV" visible | ☐ |

---

## Feature 2: Réception et Gestion des Demandes

```gherkin
Feature: Réception des Demandes d'Intervention
  En tant que prestataire
  Je veux recevoir et consulter les nouvelles interventions
  Afin de planifier mon travail

  Background:
    Given je suis connecté en tant que "prestataire@test-seido.fr"
    And je suis sur "/prestataire/dashboard"

  @p0 @happy-path
  Scenario: Réception d'une notification de nouvelle intervention
    Given le gestionnaire m'assigne une nouvelle intervention
    Then je reçois une notification "Nouvelle intervention assignée"
    And le badge de notifications s'incrémente
    And la notification apparaît en temps réel (Realtime)

    When je clique sur la notification
    Then je suis redirigé vers la page détail de l'intervention
    And je vois :
      | Élément | Visible |
      | Référence (INT-2025-XXXX) | Oui |
      | Type d'intervention | Oui |
      | Description du problème | Oui |
      | Photos du problème | Oui |
      | Adresse complète | Oui |
      | Nom du locataire | Oui |
      | Priorité (badge couleur) | Oui |

  @p0 @happy-path
  Scenario: Consultation d'une intervention directe (sans devis)
    Given une intervention "INT-2025-0004" m'est assignée en mode direct
    And le statut est "planification"
    When je consulte cette intervention
    Then je vois la section "Proposer vos disponibilités"
    And un calendrier interactif est affiché
    And je dois sélectionner au minimum 3 créneaux

  @p1
  Scenario: Consultation des détails et documents
    Given je suis sur la page détail d'une intervention
    When je clique sur l'onglet "Documents"
    Then je vois les photos du problème envoyées par le locataire
    And je peux agrandir chaque photo au clic

    When je clique sur l'onglet "Adresse"
    Then l'adresse complète est affichée
    And un bouton "Ouvrir dans Maps" est visible
```

### Checklist de Validation - Feature 2

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 2.1 | Notification temps réel à l'assignation | ☐ |
| 2.2 | Badge notifications incrémenté | ☐ |
| 2.3 | Page détail avec toutes les informations | ☐ |
| 2.4 | Photos du problème visibles et agrandissables | ☐ |
| 2.5 | Adresse avec lien vers Maps | ☐ |
| 2.6 | Contact locataire visible (nom, téléphone si autorisé) | ☐ |

---

## Feature 3: Gestion des Devis

```gherkin
Feature: Gestion des Devis par Prestataire
  En tant que prestataire
  Je veux soumettre des devis pour les interventions
  Afin de proposer mes services

  Background:
    Given je suis connecté en tant que prestataire
    And une intervention "INT-2025-0003" est en statut "demande_de_devis"
    And je suis sollicité pour un devis

  @p0 @happy-path
  Scenario: Soumission d'un devis complet
    Given je reçois une notification "Demande de devis"
    When je navigue vers l'intervention
    Then je vois un bouton "Soumettre un devis" ou une section dédiée

    When je clique sur "Soumettre un devis"
    Then un formulaire de devis s'affiche avec les champs :
      | Champ | Type | Obligatoire |
      | Montant HT | Nombre | Oui |
      | TVA | Auto-calculé | Non |
      | Montant TTC | Auto-calculé | Non |
      | Description des travaux | Texte long | Oui |
      | Délai d'intervention | Nombre (jours) | Oui |
      | Validité du devis | Date | Oui |
      | Document PDF | Upload | Non |

    When je saisis :
      | Champ | Valeur |
      | Montant HT | 250 |
      | Description | Remplacement joint sous évier + vérification siphon |
      | Délai | 3 |
    Then le montant TTC est calculé automatiquement (300€ avec TVA 20%)

    When j'uploade "test-devis.pdf" (optionnel)
    And je clique sur "Soumettre le devis"
    Then un récapitulatif s'affiche pour vérification

    When je confirme
    Then le devis est envoyé
    And un toast affiche "Devis soumis avec succès"
    And le statut de mon devis est "En attente"
    And le gestionnaire reçoit une notification

  @p1
  Scenario: Modification d'un devis avant validation
    Given j'ai soumis un devis pour l'intervention "INT-2025-0003"
    And le devis n'a pas encore été validé par le gestionnaire
    When je navigue vers mon devis
    Then un bouton "Modifier" est visible

    When je clique sur "Modifier"
    And je change le montant de 250€ à 280€
    And je saisis une note "Ajout diagnostic complet"
    And je sauvegarde
    Then mon devis est mis à jour
    And le gestionnaire reçoit une notification du changement

  @p1
  Scenario: Réponse à une demande de révision
    Given le gestionnaire a demandé une révision de mon devis
    And j'ai reçu une notification "Demande de révision"
    When je consulte le devis
    Then je vois le commentaire du gestionnaire : "Merci de détailler les pièces"

    When je modifie la description pour ajouter le détail
    And je ressoumets
    Then le devis révisé est envoyé
    And le statut passe à "En attente (révisé)"

  @p1
  Scenario: Consultation du statut de mes devis
    Given j'ai soumis plusieurs devis
    When je navigue vers "/prestataire/devis" ou dashboard
    Then je vois la liste de mes devis avec statuts :
      | Statut | Badge |
      | En attente | Gris |
      | Accepté | Vert |
      | Rejeté | Rouge |

  @negative @p1
  Scenario: Soumission d'un devis sans montant
    Given je suis sur le formulaire de devis
    When je laisse le champ "Montant HT" vide
    And je clique sur "Soumettre"
    Then une erreur "Le montant est requis" s'affiche
    And le formulaire n'est pas soumis

  @negative @p2
  Scenario: Tentative de modification d'un devis accepté
    Given mon devis a été accepté par le gestionnaire
    When je tente de modifier ce devis
    Then le bouton "Modifier" n'est pas visible
    And/Ou un message "Modification impossible (devis accepté)" s'affiche
```

### Checklist de Validation - Feature 3

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 3.1 | Notification "Demande de devis" reçue | ☐ |
| 3.2 | Formulaire devis avec tous les champs | ☐ |
| 3.3 | Calcul automatique TVA et TTC | ☐ |
| 3.4 | Upload document PDF fonctionnel | ☐ |
| 3.5 | Récapitulatif avant confirmation | ☐ |
| 3.6 | Toast succès + notification gestionnaire | ☐ |
| 3.7 | Modification possible avant validation | ☐ |
| 3.8 | Révision suite demande gestionnaire | ☐ |
| 3.9 | Liste devis avec statuts visuels | ☐ |
| 3.10 | Validation champs obligatoires | ☐ |

---

## Feature 4: Planification des Interventions

```gherkin
Feature: Planification des Disponibilités
  En tant que prestataire
  Je veux proposer mes disponibilités
  Afin de planifier les interventions

  Background:
    Given je suis connecté en tant que prestataire
    And une intervention est en statut "planification"
    And je dois proposer mes disponibilités

  @p0 @happy-path
  Scenario: Proposition de créneaux disponibles
    Given je suis sur la page détail de l'intervention
    When je clique sur l'onglet "Planning" ou la section disponibilités
    Then un calendrier de la semaine s'affiche
    And les jours sont divisés en créneaux horaires

    When je sélectionne les créneaux suivants :
      | Date | Créneau |
      | 20/12/2025 | 09:00 - 11:00 |
      | 20/12/2025 | 14:00 - 16:00 |
      | 21/12/2025 | 10:00 - 12:00 |
    Then les créneaux sont mis en surbrillance (highlight)
    And un compteur indique "3 créneaux sélectionnés"

    When je clique sur "Envoyer mes disponibilités"
    Then mes disponibilités sont enregistrées
    And un toast affiche "Disponibilités envoyées"
    And le statut de l'intervention devient "En attente de matching"
    And le gestionnaire reçoit une notification

  @p0 @happy-path
  Scenario: Confirmation d'un RDV par le système
    Given j'ai soumis mes disponibilités
    And le locataire a confirmé un créneau
    Then je reçois une notification "RDV confirmé"

    When je consulte l'intervention
    Then je vois les informations du RDV :
      | Élément | Valeur |
      | Date | 20/12/2025 |
      | Heure | 09:00 - 11:00 |
      | Adresse | 12 rue de la Paix, 75001 Paris |
      | Contact | Emma Locataire - 06 XX XX XX XX |
    And le statut est "Planifiée" (badge bleu)

  @p1
  Scenario: Export du RDV vers calendrier externe
    Given un RDV est confirmé
    When je clique sur "Ajouter au calendrier"
    Then je peux choisir :
      | Option |
      | Google Calendar |
      | Apple Calendar (.ics) |
      | Outlook |

    When je sélectionne "Google Calendar"
    Then une nouvelle fenêtre s'ouvre avec l'événement pré-rempli

  @p1
  Scenario: Rappel automatique J-1
    Given un RDV est prévu demain
    Then je reçois une notification "Rappel : Intervention demain"
    And la notification contient l'adresse et l'heure

  @negative @p2
  Scenario: Tentative d'envoyer moins de 3 créneaux
    Given je sélectionne seulement 2 créneaux
    When je clique sur "Envoyer mes disponibilités"
    Then une erreur "Veuillez sélectionner au moins 3 créneaux" s'affiche
    And le formulaire n'est pas soumis
```

### Checklist de Validation - Feature 4

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 4.1 | Calendrier semaine avec créneaux horaires | ☐ |
| 4.2 | Sélection multi-créneaux (highlight visuel) | ☐ |
| 4.3 | Minimum 3 créneaux requis | ☐ |
| 4.4 | Confirmation envoi + notification gestionnaire | ☐ |
| 4.5 | Notification "RDV confirmé" reçue | ☐ |
| 4.6 | Détails RDV complets (date, heure, adresse, contact) | ☐ |
| 4.7 | Export calendrier (Google, Apple, Outlook) | ☐ |
| 4.8 | Rappel J-1 fonctionnel | ☐ |

---

## Feature 5: Exécution des Travaux

```gherkin
Feature: Exécution des Interventions sur le Terrain
  En tant que prestataire
  Je veux gérer l'intervention sur place
  Afin de compléter les travaux et documenter

  Background:
    Given je suis connecté en tant que prestataire
    And une intervention "INT-2025-0005" est planifiée pour aujourd'hui
    And le statut est "planifiee"

  @p0 @happy-path
  Scenario: Jour de l'intervention - Vue planning
    When je consulte mon dashboard
    Then je vois la section "Aujourd'hui" avec l'intervention
    And l'intervention affiche :
      | Élément | Visible |
      | Heure | Oui |
      | Adresse | Oui |
      | Type | Oui |
      | Contact | Oui |

    When je clique sur l'intervention
    Then je vois le détail complet

  @p0 @happy-path
  Scenario: Démarrer les travaux
    Given je suis sur la page détail de l'intervention
    When je clique sur "Commencer les travaux"
    Then une modal de confirmation s'affiche
    And je vois "Voulez-vous démarrer l'intervention ?"

    When je confirme
    Then le statut passe à "En cours" (badge violet)
    And l'heure de début est enregistrée
    And le gestionnaire + locataire reçoivent une notification

  @p1
  Scenario: Prise de photos "avant" travaux
    Given l'intervention est en statut "en_cours"
    When je clique sur "Ajouter photos"
    Then l'appareil photo du mobile s'ouvre (ou sélecteur fichiers)

    When je prends 2 photos
    Then les photos sont uploadées avec preview
    And les photos sont taguées "avant" automatiquement

  @p0 @happy-path
  Scenario: Remplir le rapport de travaux
    Given l'intervention est en statut "en_cours"
    And les travaux sont terminés physiquement
    When je clique sur "Terminer et remplir rapport"
    Then un formulaire de rapport s'affiche :
      | Champ | Type | Obligatoire |
      | Description travaux | Texte long | Oui |
      | Photos "après" | Upload multiple | Oui (min 1) |
      | Matériaux utilisés | Liste | Non |
      | Durée réelle | Nombre | Oui |
      | Observations | Texte | Non |

    When je remplis le rapport :
      | Champ | Valeur |
      | Description | Remplacement joint silicone, vérification étanchéité OK |
      | Durée réelle | 1.5 heures |
    And j'uploade 2 photos du résultat
    And je clique sur "Valider et terminer"
    Then le rapport est enregistré
    And le statut passe à "Clôturée (prestataire)" (badge vert clair)
    And le gestionnaire + locataire reçoivent une notification

  @p1
  Scenario: Signaler un problème pendant l'intervention
    Given l'intervention est en statut "en_cours"
    And je rencontre un problème imprévu
    When je clique sur l'onglet "Chat" ou "Commentaires"
    And je saisis "Problème : tuyau corrodé derrière mur, travaux supplémentaires nécessaires"
    And j'attache une photo
    And j'envoie
    Then mon message + photo sont envoyés
    And le gestionnaire reçoit une notification urgente

    When le gestionnaire répond "Continuez, on régularisera après"
    Then sa réponse apparaît en temps réel

  @p1
  Scenario: Navigation vers le lieu d'intervention
    Given je suis sur la page détail de l'intervention
    When je clique sur l'adresse ou "Naviguer"
    Then l'application Maps s'ouvre avec l'adresse en destination
    And je peux lancer la navigation GPS

  @p1
  Scenario: Appeler le locataire
    Given le contact locataire est visible
    When je clique sur le numéro de téléphone
    Then l'application Téléphone s'ouvre
    And le numéro est pré-rempli

  @negative @p2
  Scenario: Terminer sans rapport complet
    Given l'intervention est en statut "en_cours"
    When je clique sur "Terminer"
    And je ne remplis pas la description
    And je n'uploade pas de photo
    Then des erreurs s'affichent :
      | Champ | Erreur |
      | Description | Ce champ est requis |
      | Photos | Au moins 1 photo requise |
    And le formulaire n'est pas soumis
```

### Checklist de Validation - Feature 5

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 5.1 | Section "Aujourd'hui" sur dashboard | ☐ |
| 5.2 | Bouton "Commencer les travaux" fonctionnel | ☐ |
| 5.3 | Statut passe à "en_cours" | ☐ |
| 5.4 | Prise de photos depuis mobile | ☐ |
| 5.5 | Formulaire rapport avec tous les champs | ☐ |
| 5.6 | Upload photos "après" obligatoire | ☐ |
| 5.7 | Statut passe à "cloturee_par_prestataire" | ☐ |
| 5.8 | Chat pour signaler problèmes | ☐ |
| 5.9 | Navigation GPS vers adresse | ☐ |
| 5.10 | Appel téléphonique direct | ☐ |

---

## Feature 6: Historique et Suivi

```gherkin
Feature: Historique et Statistiques
  En tant que prestataire
  Je veux consulter mon historique
  Afin de suivre mon activité

  Background:
    Given je suis connecté en tant que prestataire

  @p1 @happy-path
  Scenario: Consultation de l'historique des interventions
    When je navigue vers "/prestataire/interventions" ou "Mes interventions"
    Then je vois la liste de toutes mes interventions
    And chaque intervention affiche :
      | Élément | Visible |
      | Référence | Oui |
      | Adresse | Oui |
      | Type | Oui |
      | Statut | Oui (badge couleur) |
      | Date | Oui |

    When je filtre par statut "Terminée"
    Then seules les interventions clôturées s'affichent

    When je clique sur une intervention passée
    Then je vois le détail en lecture seule
    And mon rapport et photos sont visibles

  @p1
  Scenario: Recherche dans l'historique
    When je saisis "rue de la Paix" dans la barre de recherche
    Then les interventions correspondantes s'affichent
    And la recherche fonctionne sur adresse et référence

  @p2
  Scenario: Consultation des statistiques (si disponible)
    When je navigue vers la section "Statistiques"
    Then je vois :
      | Métrique | Type |
      | Interventions ce mois | Nombre |
      | Interventions clôturées | Nombre |
      | Note moyenne | Étoiles (si système de notation) |
      | Revenus (si affiché) | Montant total devis acceptés |
```

### Checklist de Validation - Feature 6

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 6.1 | Liste interventions avec tous les statuts | ☐ |
| 6.2 | Filtres par statut fonctionnels | ☐ |
| 6.3 | Recherche par adresse/référence | ☐ |
| 6.4 | Détail intervention passée en lecture seule | ☐ |
| 6.5 | Statistiques mensuelles (si disponible) | ☐ |

---

## Feature 7: Gestion du Profil

```gherkin
Feature: Gestion du Profil Prestataire
  En tant que prestataire
  Je veux gérer mon profil professionnel
  Afin de maintenir mes informations à jour

  Background:
    Given je suis connecté en tant que prestataire

  @p1 @happy-path
  Scenario: Consultation et modification du profil
    When je navigue vers "/prestataire/profil" ou Menu → Profil
    Then je vois ma fiche profil avec :
      | Section | Contenu |
      | Photo | Photo de profil actuelle |
      | Identité | Prénom, Nom |
      | Contact | Email, Téléphone |
      | Spécialités | Catégories d'intervention |
      | Zone | Zone géographique d'intervention |

    When je clique sur "Modifier"
    Then les champs deviennent éditables

    When je change mon téléphone de "06 12 34 56 78" à "06 98 76 54 32"
    And je sauvegarde
    Then mon profil est mis à jour
    And un toast affiche "Profil mis à jour"

  @p1
  Scenario: Modification de la photo de profil
    When je clique sur ma photo de profil
    Then je peux choisir une nouvelle image

    When je sélectionne une photo
    Then un aperçu s'affiche
    And je peux recadrer (optionnel)

    When je confirme
    Then ma nouvelle photo est enregistrée
    And elle s'affiche dans le header

  @p1
  Scenario: Modification des spécialités
    Given mes spécialités actuelles sont "Plomberie"
    When je modifie pour ajouter "Chauffage"
    And je sauvegarde
    Then mes spécialités incluent maintenant "Plomberie" et "Chauffage"
    And je serai sollicité pour ces deux types d'interventions
```

### Checklist de Validation - Feature 7

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 7.1 | Page profil avec toutes les sections | ☐ |
| 7.2 | Mode édition fonctionnel | ☐ |
| 7.3 | Upload/modification photo de profil | ☐ |
| 7.4 | Modification téléphone sauvegardée | ☐ |
| 7.5 | Modification spécialités fonctionnelle | ☐ |
| 7.6 | Toast confirmation après sauvegarde | ☐ |

---

## Feature 8: Notifications et Alertes

```gherkin
Feature: Système de Notifications
  En tant que prestataire
  Je veux recevoir et gérer mes notifications
  Afin de réagir rapidement aux événements

  Background:
    Given je suis connecté en tant que prestataire

  @p0 @happy-path
  Scenario: Réception et consultation des notifications
    Given j'ai des notifications non lues
    Then le badge rouge affiche le nombre de non-lues

    When je clique sur l'icône notification
    Then un popover ou page affiche les notifications récentes
    And chaque notification a :
      | Élément | Présent |
      | Icône type | Oui |
      | Titre | Oui |
      | Date/heure | Oui |
      | Statut lu/non-lu | Oui |

    When je clique sur une notification
    Then elle est marquée comme lue
    And je suis redirigé vers la page concernée

  @p1
  Scenario: Types de notifications reçues
    Then je dois pouvoir recevoir les types suivants :
      | Type | Priorité |
      | Nouvelle intervention assignée | Haute |
      | Demande de devis | Haute |
      | Devis accepté | Moyenne |
      | Devis rejeté (avec raison) | Moyenne |
      | RDV confirmé | Haute |
      | Rappel intervention J-1 | Haute |
      | Nouveau message chat | Moyenne |
      | Travaux validés par locataire | Basse |

  @p1
  Scenario: Marquer toutes comme lues
    Given j'ai 5 notifications non lues
    When je clique sur "Tout marquer comme lu"
    Then toutes passent en lu
    And le badge disparaît
```

### Checklist de Validation - Feature 8

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 8.1 | Badge avec compteur temps réel | ☐ |
| 8.2 | Popover/page notifications | ☐ |
| 8.3 | Click → marque lu + redirection | ☐ |
| 8.4 | Tous les types de notifications fonctionnels | ☐ |
| 8.5 | "Tout marquer comme lu" | ☐ |

---

## Feature 9: Tests Mobile (Mobile-First)

```gherkin
Feature: Expérience Mobile Prestataire
  En tant que prestataire sur le terrain
  Je veux utiliser l'application sur mon smartphone
  Afin de gérer mes interventions en mobilité

  Background:
    Given je suis sur un smartphone (viewport 375px)
    And je suis connecté en tant que prestataire

  @mobile @p0 @happy-path
  Scenario: Navigation mobile fluide
    When je charge le dashboard
    Then tous les éléments sont visibles sans scroll horizontal
    And les boutons ont une taille minimum de 44px (touch-friendly)
    And le texte est lisible (≥16px)

    When je navigue entre les pages
    Then la navigation est fluide
    And les menus sont accessibles via hamburger menu

  @mobile @p0
  Scenario: Prise de photo depuis l'application
    Given je suis sur une intervention en cours
    When je clique sur "Ajouter photo"
    Then l'appareil photo du smartphone s'ouvre

    When je prends une photo
    Then la photo est uploadée
    And un preview est visible

    When je clique sur "Galerie"
    Then je peux sélectionner depuis mes photos existantes

  @mobile @p0
  Scenario: Navigation GPS vers intervention
    Given je suis sur la page détail d'une intervention
    When je clique sur l'adresse
    Then une option s'affiche :
      | App | Action |
      | Google Maps | Ouvre avec navigation |
      | Apple Plans | Ouvre avec navigation |
      | Waze | Ouvre avec navigation |

  @mobile @p0
  Scenario: Appel téléphonique au locataire
    Given le contact locataire affiche "06 XX XX XX XX"
    When je clique sur le numéro
    Then l'application Téléphone s'ouvre
    And l'appel peut être lancé

  @mobile @p1
  Scenario: Formulaires utilisables sur mobile
    When je remplis le formulaire de devis sur mobile
    Then le clavier virtuel s'affiche correctement
    And les champs ne sont pas masqués par le clavier
    And je peux scroller dans le formulaire

  @mobile @performance @p1
  Scenario Outline: Performance mobile
    When je charge "<page>" en 4G
    Then le chargement initial est < <temps>
    And le scroll est fluide (60fps)

    Examples:
      | page | temps |
      | Dashboard | 3s |
      | Liste interventions | 2s |
      | Détail intervention | 2s |

  @mobile @p2
  Scenario: Mode hors-ligne partiel
    Given je perds ma connexion internet
    Then un indicateur "Hors ligne" s'affiche
    And je peux toujours consulter les données en cache
    And les actions d'envoi sont mises en attente
```

### Checklist de Validation - Feature 9 (Mobile)

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 9.1 | Pas de scroll horizontal sur mobile | ☐ |
| 9.2 | Boutons ≥44px (touch-friendly) | ☐ |
| 9.3 | Texte lisible (≥16px) | ☐ |
| 9.4 | Appareil photo accessible | ☐ |
| 9.5 | Upload depuis galerie | ☐ |
| 9.6 | Navigation GPS fonctionnelle | ☐ |
| 9.7 | Appel téléphonique direct | ☐ |
| 9.8 | Clavier virtuel ne masque pas les champs | ☐ |
| 9.9 | Dashboard < 3s en 4G | ☐ |
| 9.10 | Indicateur hors-ligne (si implémenté) | ☐ |

---

## Feature 10: Cas d'Erreur et Edge Cases

```gherkin
Feature: Gestion des Erreurs
  En tant que prestataire
  Je veux que l'application gère les erreurs gracieusement
  Afin de ne pas perdre mon travail

  @negative @p1
  Scenario: Soumission devis avec champs invalides
    Given je remplis le formulaire de devis
    When je saisis un montant négatif "-50"
    Then une erreur "Le montant doit être positif" s'affiche

    When je saisis un délai de "0" jours
    Then une erreur "Le délai doit être d'au moins 1 jour" s'affiche

  @negative @p1
  Scenario: Upload fichier trop volumineux
    When je tente d'uploader une photo de 15 MB
    Then une erreur "La taille maximale est de 10 MB" s'affiche
    And le fichier n'est pas uploadé

  @negative @p1
  Scenario: Session expirée pendant action
    Given ma session expire pendant que je remplis un rapport
    When je clique sur "Enregistrer"
    Then je suis redirigé vers la page de login
    And un message "Session expirée, veuillez vous reconnecter" s'affiche

  @negative @p1
  Scenario: Double soumission de formulaire
    Given je remplis le formulaire de devis
    When je double-clique sur "Soumettre"
    Then un seul devis est créé
    And le bouton est désactivé après le premier clic

  @negative @p2
  Scenario: Intervention déjà clôturée par gestionnaire
    Given l'intervention a été clôturée par le gestionnaire
    When je tente d'y accéder pour modifier mon rapport
    Then un message "Cette intervention est clôturée" s'affiche
    And je peux la consulter en lecture seule uniquement

  @negative @p2
  Scenario: Perte connexion pendant upload
    Given j'uploade une photo
    When la connexion est perdue
    Then un message "Connexion perdue" s'affiche
    And un bouton "Réessayer" est visible
```

### Checklist de Validation - Feature 10

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 10.1 | Validation montant positif | ☐ |
| 10.2 | Validation délai ≥1 jour | ☐ |
| 10.3 | Erreur fichier trop volumineux | ☐ |
| 10.4 | Redirection login si session expirée | ☐ |
| 10.5 | Prévention double soumission | ☐ |
| 10.6 | Intervention clôturée en lecture seule | ☐ |
| 10.7 | Retry upload après perte connexion | ☐ |

---

## Résumé Parcours Prestataire

| Feature | Scénarios | Happy Path | Negative | Testés |
|---------|-----------|------------|----------|--------|
| 1. Connexion/Dashboard | 4 | 3 | 1 | ☐ |
| 2. Réception Demandes | 3 | 3 | 0 | ☐ |
| 3. Gestion Devis | 6 | 4 | 2 | ☐ |
| 4. Planification | 5 | 4 | 1 | ☐ |
| 5. Exécution Travaux | 7 | 6 | 1 | ☐ |
| 6. Historique | 3 | 3 | 0 | ☐ |
| 7. Profil | 3 | 3 | 0 | ☐ |
| 8. Notifications | 3 | 3 | 0 | ☐ |
| 9. Mobile | 7 | 7 | 0 | ☐ |
| 10. Erreurs | 6 | 0 | 6 | ☐ |
| **TOTAL** | **47** | **36** | **11** | |

---

## Informations de Session

| Champ | Valeur |
|-------|--------|
| **Testeur** | _________________ |
| **Date** | _________________ |
| **Environnement** | ☐ Local / ☐ Preview / ☐ Production |
| **Navigateur Desktop** | _________________ |
| **Device Mobile** | _________________ |
| **Durée totale** | _________________ |
| **Bugs trouvés** | _________________ |

---

## Notes et Observations

```
[Espace pour notes du testeur]




```

---

**Version** : 2.0
**Dernière mise à jour** : 2025-12-18
**Basé sur** : Template E2E Gherkin (`templates/test-case-e2e.md`)
