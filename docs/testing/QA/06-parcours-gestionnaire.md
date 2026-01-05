# Parcours E2E Gestionnaire - SEIDO

> **Version** : 2.0 (Format Gherkin enrichi)
> **Rôle** : Gestionnaire (70% des utilisateurs)
> **Focus** : Gestion d'interventions, biens, contacts
> **Priorité** : P0 - Critique
> **Durée estimée** : 2-3 heures

---

## Références

- **Compte de test** : `gestionnaire@test-seido.fr` / `TestSeido2024!`
- **Données de test** : Voir [11-donnees-test.md](./11-donnees-test.md)
- **Glossaire** : Voir [12-glossaire.md](./12-glossaire.md)

---

## Feature 1: Connexion et Navigation

```gherkin
Feature: Authentification Gestionnaire
  En tant que gestionnaire
  Je veux me connecter à SEIDO
  Afin d'accéder à mon tableau de bord

  Background:
    Given je suis sur la page "/auth/login"
    And je ne suis pas connecté (pas de session active)

  @smoke @p0 @happy-path
  Scenario: Connexion réussie avec identifiants valides
    Given j'ai un compte gestionnaire confirmé
    When je saisis l'email "gestionnaire@test-seido.fr"
    And je saisis le mot de passe "TestSeido2024!"
    And je clique sur "Se connecter"
    Then je vois un loader/spinner pendant le chargement
    And je suis redirigé vers "/gestionnaire/dashboard" en moins de 3 secondes
    And le dashboard affiche mon prénom dans le header
    And les KPIs sont chargés (pas de skeleton visible)

  @negative @p1
  Scenario: Connexion échouée avec email invalide
    When je saisis l'email "inconnu@test.fr"
    And je saisis le mot de passe "TestSeido2024!"
    And je clique sur "Se connecter"
    Then je vois un message d'erreur "Email ou mot de passe incorrect"
    And je reste sur la page "/auth/login"
    And le champ password est vidé

  @negative @p1
  Scenario: Connexion échouée avec mot de passe incorrect
    When je saisis l'email "gestionnaire@test-seido.fr"
    And je saisis le mot de passe "MauvaisMotDePasse!"
    And je clique sur "Se connecter"
    Then je vois un message d'erreur "Email ou mot de passe incorrect"
    And le compteur de tentatives échouées est incrémenté

  @negative @p2
  Scenario: Connexion avec compte non confirmé
    Given j'ai un compte non confirmé "nonconfirme@test-seido.fr"
    When je tente de me connecter avec ces identifiants
    Then je vois un message "Veuillez confirmer votre email"
    And un lien "Renvoyer l'email de confirmation" est visible
```

### Checklist de Validation - Feature 1

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 1.1 | Page login affiche logo SEIDO + formulaire email/password | ☐ |
| 1.2 | Champ password masqué par défaut avec toggle œil | ☐ |
| 1.3 | Bouton "Se connecter" désactivé si champs vides | ☐ |
| 1.4 | Loader visible pendant l'authentification | ☐ |
| 1.5 | Redirection dashboard < 3s après login réussi | ☐ |
| 1.6 | Erreur affichée en rouge sous le formulaire | ☐ |
| 1.7 | Navigation clavier complète (Tab entre champs) | ☐ |

---

## Feature 2: Création d'Intervention

```gherkin
Feature: Création d'Intervention par Gestionnaire
  En tant que gestionnaire
  Je veux créer une nouvelle intervention
  Afin de résoudre un problème dans un bien géré

  Background:
    Given je suis connecté en tant que "gestionnaire@test-seido.fr"
    And je suis sur "/gestionnaire/dashboard"
    And au moins 1 immeuble "IMM-001" existe dans mon portefeuille
    And au moins 1 prestataire "PRE-001" est dans mes contacts

  @smoke @p0 @happy-path
  Scenario: Création d'intervention directe réussie
    When je clique sur "Nouvelle intervention" dans le header ou dashboard
    Then je suis redirigé vers "/gestionnaire/interventions/nouvelle-intervention"
    And un wizard multi-étapes s'affiche avec indicateur de progression

    When je sélectionne l'immeuble "Résidence Les Lilas" (IMM-001)
    Then l'adresse "12 rue de la Paix, 75001 Paris" s'affiche
    And les lots de cet immeuble sont listés

    When je sélectionne le lot "Apt 3B" (LOT-001)
    And je sélectionne le type "Plomberie"
    And je saisis la description "Fuite sous l'évier de la cuisine"
    And je sélectionne la priorité "Normale"
    Then les champs sont validés (bordures vertes ou neutres)

    When je clique sur "Suivant"
    Then je passe à l'étape de sélection du mode

    When je choisis "Intervention directe"
    And je sélectionne le prestataire "Jean Dupont - Plomberie Express"
    Then le prestataire est marqué comme sélectionné

    When je clique sur "Suivant"
    Then je vois un récapitulatif complet :
      | Champ | Valeur attendue |
      | Bien | Résidence Les Lilas - Apt 3B |
      | Type | Plomberie |
      | Priorité | Normale |
      | Prestataire | Jean Dupont - Plomberie Express |

    When je clique sur "Créer l'intervention"
    Then un loader s'affiche "Création en cours..."
    And je suis redirigé vers la page détail de l'intervention
    And un toast vert affiche "Intervention créée avec succès"
    And le statut est "Approuvée" (badge vert)
    And une notification est envoyée au prestataire (vérifiable dans Supabase)

  @p0 @happy-path
  Scenario: Création d'intervention avec demande de devis
    Given je suis sur le wizard de création d'intervention
    And j'ai rempli les informations du bien et du problème
    When je choisis "Demander un devis"
    Then je peux sélectionner plusieurs prestataires (checkboxes)

    When je sélectionne 2 prestataires :
      | Prestataire |
      | Jean Dupont - Plomberie Express |
      | Sophie Leroy - Multi-Services |
    And je clique sur "Créer l'intervention"
    Then l'intervention est créée avec le statut "Demande de devis" (badge orange)
    And la section Devis affiche "En attente de devis (0/2)"
    And les 2 prestataires reçoivent une notification

  @p1
  Scenario: Création avec upload de photos
    Given je suis à l'étape de description du problème
    When je clique sur "Ajouter des photos"
    And je sélectionne "test-image-valid.jpg" (500 KB)
    Then l'image apparaît en preview avec option de suppression

    When j'ajoute une 2ème image "test-image.png"
    Then 2 previews sont visibles
    And le compteur affiche "2 photos ajoutées"

    When je termine la création
    Then les photos sont visibles dans la page détail intervention
    And les photos sont stockées dans Supabase Storage

  @negative @p1
  Scenario: Tentative de création sans sélectionner de bien
    Given je suis sur le wizard de création
    When je clique sur "Suivant" sans sélectionner d'immeuble
    Then une erreur "Veuillez sélectionner un bien" s'affiche
    And je reste sur l'étape 1

  @negative @p1
  Scenario: Tentative d'upload d'un fichier trop volumineux
    When je tente d'uploader "test-image-large.jpg" (15 MB)
    Then une erreur "Le fichier dépasse la taille maximale (10 MB)" s'affiche
    And le fichier n'est pas uploadé

  @negative @p2
  Scenario: Double-click sur le bouton créer
    Given j'ai rempli tous les champs requis
    When je double-clique rapidement sur "Créer l'intervention"
    Then une seule intervention est créée (prévention double submit)
    And le bouton est désactivé après le premier clic
```

### Checklist de Validation - Feature 2

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 2.1 | Bouton "Nouvelle intervention" visible dans header/dashboard | ☐ |
| 2.2 | Wizard avec indicateur d'étapes (1/4, 2/4, etc.) | ☐ |
| 2.3 | Recherche d'immeuble avec autocomplétion | ☐ |
| 2.4 | Liste des lots filtrée par immeuble sélectionné | ☐ |
| 2.5 | Types d'intervention : Plomberie, Électricité, Chauffage, etc. | ☐ |
| 2.6 | Priorités : Basse, Normale, Haute, Urgente | ☐ |
| 2.7 | Upload photos : formats JPG, PNG, WEBP acceptés | ☐ |
| 2.8 | Upload photos : limite 10 MB par fichier | ☐ |
| 2.9 | Mode "Intervention directe" : 1 seul prestataire | ☐ |
| 2.10 | Mode "Demande devis" : multi-sélection prestataires | ☐ |
| 2.11 | Récapitulatif complet avant création | ☐ |
| 2.12 | Toast succès + redirection vers détail | ☐ |
| 2.13 | Notification Realtime envoyée au(x) prestataire(s) | ☐ |

---

## Feature 3: Gestion des Devis

```gherkin
Feature: Gestion des Devis par Gestionnaire
  En tant que gestionnaire
  Je veux valider ou rejeter les devis reçus
  Afin de choisir le meilleur prestataire pour l'intervention

  Background:
    Given je suis connecté en tant que gestionnaire
    And une intervention "INT-2025-0003" existe en statut "demande_de_devis"
    And le prestataire "PRE-001" a soumis un devis de 250€

  @p0 @happy-path
  Scenario: Réception et notification d'un nouveau devis
    Given le prestataire soumet un devis pour l'intervention
    Then je reçois une notification "Nouveau devis reçu"
    And le badge notifications du header s'incrémente
    And la notification indique :
      | Champ | Valeur |
      | Type | Nouveau devis |
      | Intervention | INT-2025-0003 |
      | Montant | 250,00 € |

  @p0 @happy-path
  Scenario: Validation d'un devis
    Given je suis sur la page détail de l'intervention "INT-2025-0003"
    When je clique sur l'onglet "Devis"
    Then je vois la liste des devis reçus :
      | Prestataire | Montant | Statut |
      | Jean Dupont | 250,00 € | En attente |

    When je clique sur "Voir le détail" du devis
    Then une modal ou page s'ouvre avec :
      | Élément | Visible |
      | Description des travaux | Oui |
      | Montant HT | Oui |
      | TVA | Oui |
      | Montant TTC | Oui |
      | Délai d'intervention | Oui |
      | Pièce jointe PDF (si fournie) | Oui |

    When je clique sur "Accepter ce devis"
    Then une modal de confirmation s'affiche "Confirmer l'acceptation du devis ?"

    When je confirme
    Then le devis est marqué "Accepté" (badge vert)
    And les autres devis (si présents) sont automatiquement rejetés
    And le statut de l'intervention passe à "planification"
    And le prestataire reçoit une notification "Devis accepté"
    And un toast affiche "Devis accepté"

  @p1
  Scenario: Comparaison de plusieurs devis
    Given 3 prestataires ont soumis des devis :
      | Prestataire | Montant | Délai |
      | Jean Dupont | 250 € | 3 jours |
      | Marie Martin | 280 € | 2 jours |
      | Pierre Durand | 230 € | 5 jours |
    When je suis sur l'onglet Devis
    Then je vois un tableau comparatif
    And je peux trier par montant ou délai
    And le devis le moins cher est mis en évidence (optionnel)

  @p1
  Scenario: Rejet d'un devis avec raison
    Given je visualise un devis
    When je clique sur "Rejeter"
    Then une modal demande la raison du rejet

    When je saisis "Montant trop élevé par rapport au marché"
    And je confirme
    Then le devis est marqué "Rejeté" (badge rouge)
    And la raison est enregistrée
    And le prestataire reçoit une notification avec la raison

  @negative @p2
  Scenario: Tentative d'accepter un devis déjà rejeté
    Given un devis a été rejeté
    When je tente d'accepter ce devis
    Then une erreur "Ce devis a déjà été traité" s'affiche
    And aucune modification n'est effectuée
```

### Checklist de Validation - Feature 3

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 3.1 | Notification badge actualisé en temps réel | ☐ |
| 3.2 | Onglet Devis visible sur page détail intervention | ☐ |
| 3.3 | Liste devis avec montant, prestataire, statut | ☐ |
| 3.4 | Détail devis : description, montants, pièces jointes | ☐ |
| 3.5 | Boutons Accepter/Rejeter visibles | ☐ |
| 3.6 | Modal confirmation avant acceptation | ☐ |
| 3.7 | Rejet nécessite une raison (champ obligatoire) | ☐ |
| 3.8 | Statut intervention passe à "planification" après acceptation | ☐ |
| 3.9 | Notifications envoyées aux prestataires concernés | ☐ |

---

## Feature 4: Planification d'Intervention

```gherkin
Feature: Planification d'Intervention
  En tant que gestionnaire
  Je veux planifier le rendez-vous d'intervention
  Afin de coordonner prestataire et locataire

  Background:
    Given je suis connecté en tant que gestionnaire
    And une intervention "INT-2025-0004" existe en statut "planification"
    And le prestataire a proposé des créneaux disponibles

  @p0 @happy-path
  Scenario: Sélection d'un créneau proposé par le prestataire
    Given je suis sur la page détail de l'intervention
    When je clique sur l'onglet "Planning"
    Then je vois les créneaux proposés par le prestataire :
      | Date | Heure | Durée estimée |
      | 20/12/2025 | 09:00 - 11:00 | 2h |
      | 21/12/2025 | 14:00 - 16:00 | 2h |
      | 22/12/2025 | 10:00 - 12:00 | 2h |

    When je sélectionne le créneau "20/12/2025 09:00 - 11:00"
    And je clique sur "Envoyer au locataire pour confirmation"
    Then le locataire reçoit une notification
    And le statut passe à "En attente confirmation locataire"

    When le locataire confirme le créneau
    Then le statut passe à "Planifiée" (badge bleu)
    And le prestataire reçoit une notification "RDV confirmé"
    And la date/heure s'affiche sur la page détail

  @p1
  Scenario: Matching automatique des disponibilités
    Given le prestataire a soumis ses disponibilités
    And le locataire a soumis ses disponibilités
    When le système compare les créneaux
    Then les créneaux communs sont mis en évidence
    And je peux sélectionner directement un créneau compatible

  @p1
  Scenario: Forcer un créneau sans confirmation locataire
    Given aucun créneau commun n'existe
    When je sélectionne un créneau du prestataire
    And je coche "Forcer ce créneau (urgence)"
    And je confirme
    Then l'intervention est planifiée directement
    And le locataire reçoit une notification informative (pas de demande de confirmation)

  @negative @p2
  Scenario: Tentative de planification sans créneau disponible
    Given le prestataire n'a pas encore proposé de créneaux
    When je suis sur l'onglet Planning
    Then un message "En attente des disponibilités du prestataire" s'affiche
    And un bouton "Relancer le prestataire" est visible
```

### Checklist de Validation - Feature 4

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 4.1 | Onglet Planning visible sur intervention en "planification" | ☐ |
| 4.2 | Créneaux affichés avec date, heure début/fin | ☐ |
| 4.3 | Sélection visuelle du créneau (highlight) | ☐ |
| 4.4 | Option "Envoyer au locataire" disponible | ☐ |
| 4.5 | Option "Forcer créneau" pour urgences | ☐ |
| 4.6 | Statut passe à "planifiee" après confirmation | ☐ |
| 4.7 | Date/heure RDV affichée sur page détail | ☐ |
| 4.8 | Notifications envoyées aux 3 parties | ☐ |

---

## Feature 5: Suivi et Clôture d'Intervention

```gherkin
Feature: Suivi et Clôture d'Intervention
  En tant que gestionnaire
  Je veux suivre l'avancement et clôturer les interventions
  Afin de maintenir un historique à jour

  Background:
    Given je suis connecté en tant que gestionnaire

  @p0 @happy-path
  Scenario: Consultation de la liste des interventions
    When je navigue vers "/gestionnaire/interventions"
    Then je vois une liste avec les colonnes :
      | Colonne | Présente |
      | Référence | Oui |
      | Bien | Oui |
      | Type | Oui |
      | Statut | Oui |
      | Date création | Oui |
      | Priorité | Oui |
    And des filtres sont disponibles (statut, type, priorité, bien)
    And une barre de recherche est visible

    When je filtre par statut "En cours"
    Then seules les interventions en statut "en_cours" s'affichent
    And le compteur de résultats est mis à jour

  @p0 @happy-path
  Scenario: Suivi d'une intervention en cours
    Given une intervention "INT-2025-0005" est en statut "en_cours"
    When je clique sur cette intervention
    Then je suis sur la page détail
    And je vois la timeline/historique avec toutes les étapes passées :
      | Étape | Date | Acteur |
      | Demande créée | 15/12/2025 | Thomas (gestionnaire) |
      | Devis accepté | 16/12/2025 | Thomas |
      | RDV planifié | 17/12/2025 | Système |
      | Travaux démarrés | 18/12/2025 | Jean (prestataire) |

    When je clique sur l'onglet "Commentaires/Chat"
    Then je vois les échanges entre les acteurs
    And je peux envoyer un nouveau message

  @p0 @happy-path
  Scenario: Clôture finale par gestionnaire
    Given une intervention est en statut "cloturee_par_locataire"
    And je reçois une notification "Travaux validés par le locataire"
    When je navigue vers cette intervention
    Then je vois :
      | Élément | Contenu |
      | Rapport prestataire | Description travaux + photos après |
      | Validation locataire | Note satisfaction + commentaire |

    When je clique sur "Finaliser l'intervention"
    Then une modal demande si je veux ajouter des notes internes

    When je saisis "Intervention clôturée, facture à traiter"
    And je confirme
    Then le statut passe à "Clôturée" (badge vert foncé)
    And l'intervention est archivée
    And un toast affiche "Intervention finalisée"

  @p1
  Scenario: Consultation de l'historique d'interventions
    When je filtre par statut "Clôturée"
    Then je vois les interventions archivées
    And je peux consulter leur détail en lecture seule
    And les actions de modification sont désactivées
```

### Checklist de Validation - Feature 5

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 5.1 | Liste interventions avec pagination (si >20 items) | ☐ |
| 5.2 | Filtres fonctionnels (statut, type, priorité, bien) | ☐ |
| 5.3 | Recherche par référence ou description | ☐ |
| 5.4 | Timeline/historique visible sur page détail | ☐ |
| 5.5 | Onglet Chat avec messages des 3 parties | ☐ |
| 5.6 | Rapport prestataire avec photos visibles | ☐ |
| 5.7 | Validation locataire (note + commentaire) visible | ☐ |
| 5.8 | Bouton "Finaliser" sur intervention "cloturee_par_locataire" | ☐ |
| 5.9 | Notes internes (visibles uniquement gestionnaire) | ☐ |
| 5.10 | Statut final "cloturee_par_gestionnaire" | ☐ |
| 5.11 | Interventions clôturées en lecture seule | ☐ |

---

## Feature 6: Gestion des Biens

```gherkin
Feature: Gestion des Biens Immobiliers
  En tant que gestionnaire
  Je veux créer et gérer mon portefeuille de biens
  Afin d'organiser les interventions par localisation

  Background:
    Given je suis connecté en tant que gestionnaire

  @p0 @happy-path
  Scenario: Création d'un immeuble avec wizard multi-étapes
    When je navigue vers "/gestionnaire/biens"
    And je clique sur "Nouveau bien"
    Then une modal ou page propose "Immeuble" ou "Lot individuel"

    When je choisis "Immeuble"
    Then un wizard s'affiche avec les étapes :
      | Étape | Nom |
      | 1 | Informations générales |
      | 2 | Adresse |
      | 3 | Contacts |
      | 4 | Documents |

    # Étape 1 - Informations
    When je saisis le nom "Résidence Test QA"
    And je saisis une description "Immeuble test pour QA"
    And je clique sur "Suivant"
    Then je passe à l'étape 2

    # Étape 2 - Adresse
    When je saisis l'adresse "100 avenue de Test"
    And je saisis le code postal "75001"
    And je saisis la ville "Paris"
    And je clique sur "Suivant"
    Then je passe à l'étape 3

    # Étape 3 - Contacts
    When je recherche un contact existant "gardien"
    And je sélectionne "Paul Gardien"
    And je définis son rôle comme "Gardien"
    And je clique sur "Suivant"
    Then je passe à l'étape 4

    # Étape 4 - Documents (optionnel)
    When je clique sur "Créer l'immeuble"
    Then l'immeuble est créé
    And je suis redirigé vers la page détail
    And un toast affiche "Immeuble créé avec succès"

  @p0 @happy-path
  Scenario: Ajout d'un lot à un immeuble existant
    Given l'immeuble "Résidence Test QA" existe
    When je suis sur sa page détail
    And je clique sur "Ajouter un lot"
    Then un formulaire s'affiche

    When je saisis la référence "Apt 1A"
    And je sélectionne la catégorie "Appartement"
    And je saisis l'étage "1"
    And je saisis la surface "45"
    And je clique sur "Créer le lot"
    Then le lot apparaît dans la liste des lots de l'immeuble
    And les compteurs de l'immeuble sont mis à jour

  @p1
  Scenario: Modification d'un immeuble
    Given l'immeuble "Résidence Les Lilas" existe
    When je navigue vers sa page détail
    And je clique sur "Modifier"
    Then le formulaire d'édition s'affiche avec les valeurs actuelles

    When je modifie le nom en "Résidence Les Lilas - Rénové"
    And je clique sur "Enregistrer"
    Then les modifications sont sauvegardées
    And un toast affiche "Immeuble modifié avec succès"
    And le nouveau nom s'affiche sur la page détail

  @p1 @negative
  Scenario: Suppression d'un immeuble avec lots
    Given l'immeuble "IMM-001" a des lots associés
    When je clique sur "Supprimer l'immeuble"
    Then une modal d'avertissement s'affiche :
      """
      Attention : Cet immeuble contient 8 lots.
      La suppression entraînera également la suppression de tous les lots.
      Cette action est irréversible.
      """
    And je dois cocher "Je comprends les conséquences"
    And taper le nom de l'immeuble pour confirmer

  @negative @p2
  Scenario: Validation des champs obligatoires
    When je tente de créer un immeuble sans nom
    Then une erreur "Le nom est requis" s'affiche

    When je saisis un nom de 1 caractère "A"
    Then une erreur "Minimum 2 caractères" s'affiche

    When je saisis un code postal invalide "7500"
    Then une erreur "Code postal invalide (5 chiffres)" s'affiche
```

### Checklist de Validation - Feature 6

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 6.1 | Page liste biens avec immeubles et lots | ☐ |
| 6.2 | Wizard 4 étapes pour création immeuble | ☐ |
| 6.3 | Validation à chaque étape avant passage suivante | ☐ |
| 6.4 | Autocomplétion adresse (si Google Places intégré) | ☐ |
| 6.5 | Association contacts lors de la création | ☐ |
| 6.6 | Upload documents (PDF, images) | ☐ |
| 6.7 | Ajout de lots depuis page détail immeuble | ☐ |
| 6.8 | Catégories de lot : appartement, garage, etc. | ☐ |
| 6.9 | Modification immeuble/lot fonctionnelle | ☐ |
| 6.10 | Suppression avec avertissement cascade | ☐ |
| 6.11 | Compteurs mis à jour (nombre de lots) | ☐ |

---

## Feature 7: Gestion des Contacts

```gherkin
Feature: Gestion des Contacts
  En tant que gestionnaire
  Je veux gérer mes contacts (prestataires, locataires, propriétaires)
  Afin de les associer aux biens et interventions

  Background:
    Given je suis connecté en tant que gestionnaire

  @p0 @happy-path
  Scenario: Création d'un contact prestataire avec invitation
    When je navigue vers "/gestionnaire/contacts"
    And je clique sur "Nouveau contact"
    Then un formulaire s'affiche

    When je sélectionne le type "Individu"
    And je saisis :
      | Champ | Valeur |
      | Prénom | Marc |
      | Nom | Électricien |
      | Email | marc.elec@test.fr |
      | Téléphone | 06 11 22 33 44 |
    And je sélectionne le rôle "Prestataire"
    And je sélectionne la catégorie "Électricité"
    And je coche "Envoyer une invitation à rejoindre SEIDO"
    And je clique sur "Créer le contact"
    Then le contact est créé
    And un badge "Invitation envoyée" apparaît sur le contact
    And un email d'invitation est envoyé à "marc.elec@test.fr"

  @p1
  Scenario: Association d'un contact à un immeuble
    Given l'immeuble "Résidence Les Lilas" existe
    And le contact "Paul Gardien" existe
    When je navigue vers la page détail de l'immeuble
    And je clique sur "Ajouter un contact"
    Then un sélecteur de contact s'affiche

    When je recherche "Paul"
    And je sélectionne "Paul Gardien"
    And je définis son rôle "Gardien"
    And je confirme
    Then le contact apparaît dans la section Contacts de l'immeuble
    And son rôle "Gardien" est affiché

  @p1
  Scenario: Création d'un contact société
    When je crée un nouveau contact de type "Société"
    And je saisis :
      | Champ | Valeur |
      | Raison sociale | Plomberie Express SARL |
      | SIRET | 12345678901234 |
      | Email | contact@plomberie-express.fr |
      | Téléphone | 01 23 45 67 89 |
      | Adresse | 10 rue du Commerce, 75010 Paris |
    And je sélectionne la catégorie "Plomberie"
    Then la société est créée comme contact

  @negative @p2
  Scenario: Validation du format email
    When je saisis un email invalide "contact@"
    Then une erreur "Format d'email invalide" s'affiche

  @negative @p2
  Scenario: Validation du numéro SIRET
    When je saisis un SIRET invalide "1234"
    Then une erreur "Le SIRET doit contenir 14 chiffres" s'affiche
```

### Checklist de Validation - Feature 7

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 7.1 | Liste contacts avec filtres (rôle, catégorie) | ☐ |
| 7.2 | Création individu : prénom, nom, email, téléphone | ☐ |
| 7.3 | Création société : raison sociale, SIRET, adresse | ☐ |
| 7.4 | Rôles : Prestataire, Locataire, Propriétaire, Autre | ☐ |
| 7.5 | Catégories prestataire : Plomberie, Électricité, etc. | ☐ |
| 7.6 | Option invitation à rejoindre SEIDO | ☐ |
| 7.7 | Badge statut invitation (envoyée, acceptée, expirée) | ☐ |
| 7.8 | Association contact ↔ bien avec rôle contextuel | ☐ |
| 7.9 | Validation SIRET (14 chiffres, format Luhn) | ☐ |

---

## Feature 8: Gestion des Contrats

```gherkin
Feature: Gestion des Contrats de Location
  En tant que gestionnaire
  Je veux créer et gérer les contrats de location
  Afin de lier locataires et lots

  Background:
    Given je suis connecté en tant que gestionnaire
    And au moins 1 lot vacant "LOT-004" existe
    And au moins 1 contact locataire existe

  @p1 @happy-path
  Scenario: Création d'un contrat de location
    When je navigue vers "/gestionnaire/contrats"
    And je clique sur "Nouveau contrat"
    Then un formulaire s'affiche

    When je sélectionne le lot "Studio 12" (LOT-004)
    And je sélectionne le locataire "Emma Locataire"
    And je saisis :
      | Champ | Valeur |
      | Date début | 01/01/2026 |
      | Date fin | 31/12/2028 |
      | Loyer mensuel | 850 |
      | Charges | 50 |
      | Dépôt de garantie | 850 |
    And j'uploade le bail signé "test-bail.pdf"
    And je clique sur "Créer le contrat"
    Then le contrat est créé avec statut "Actif"
    And le lot "LOT-004" affiche maintenant le locataire associé
    And le locataire peut se connecter et voir son lot

  @p1
  Scenario: Modification des termes du contrat
    Given un contrat actif existe
    When je clique sur "Modifier"
    And je change le loyer de 850€ à 870€
    And je saisis la raison "Révision annuelle indice IRL"
    Then un historique des modifications est créé
    And le nouveau loyer s'affiche

  @p2
  Scenario: Fin de contrat et libération du lot
    Given un contrat actif existe pour le lot "LOT-001"
    When je clique sur "Terminer le contrat"
    And je saisis la date de fin effective
    And je confirme
    Then le contrat passe en statut "Terminé"
    And le lot redevient "Vacant"
    And le locataire perd l'accès au lot dans SEIDO
```

### Checklist de Validation - Feature 8

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 8.1 | Liste contrats avec statut (Actif, Terminé) | ☐ |
| 8.2 | Création : sélection lot parmi lots vacants | ☐ |
| 8.3 | Création : sélection locataire existant ou nouveau | ☐ |
| 8.4 | Champs financiers : loyer, charges, dépôt | ☐ |
| 8.5 | Upload bail PDF | ☐ |
| 8.6 | Statut lot mis à jour (Vacant → Occupé) | ☐ |
| 8.7 | Locataire peut accéder à son lot après création | ☐ |
| 8.8 | Historique modifications du contrat | ☐ |
| 8.9 | Fin de contrat libère le lot | ☐ |

---

## Feature 9: Notifications et Communication

```gherkin
Feature: Notifications et Communication
  En tant que gestionnaire
  Je veux recevoir et gérer mes notifications
  Afin de réagir rapidement aux événements

  Background:
    Given je suis connecté en tant que gestionnaire
    And j'ai des notifications non lues

  @p0 @happy-path
  Scenario: Consultation des notifications
    Then je vois un badge rouge sur l'icône notification avec le nombre de non-lues

    When je clique sur l'icône notification
    Then un popover affiche les 5 dernières notifications
    And chaque notification montre :
      | Élément | Présent |
      | Icône type | Oui |
      | Titre | Oui |
      | Date relative (il y a 2h) | Oui |

    When je clique sur une notification
    Then elle est marquée comme lue
    And je suis redirigé vers la page concernée (intervention, devis, etc.)

  @p1
  Scenario: Page notifications complète
    When je clique sur "Voir toutes les notifications"
    Then je suis sur "/gestionnaire/notifications"
    And je vois la liste complète avec pagination
    And des filtres sont disponibles (type, lu/non-lu, date)

    When je clique sur "Tout marquer comme lu"
    Then toutes les notifications passent en "lu"
    And le badge du header disparaît

  @p1
  Scenario: Chat en temps réel sur intervention
    Given une intervention "INT-2025-0005" existe
    When je suis sur la page détail, onglet Chat
    And je saisis "Bonjour, où en êtes-vous ?"
    And je clique sur "Envoyer"
    Then mon message apparaît dans le fil
    And le prestataire reçoit une notification Realtime

    When le prestataire répond "Je commence dans 10 minutes"
    Then sa réponse apparaît immédiatement (Realtime, pas de refresh)

  @p1
  Scenario: Envoi de pièce jointe dans le chat
    When je clique sur l'icône pièce jointe
    And je sélectionne une image "photo-probleme.jpg"
    And j'ajoute un message "Voici une photo du problème"
    And j'envoie
    Then le message avec l'image apparaît dans le fil
    And l'image peut être agrandie au clic
```

### Checklist de Validation - Feature 9

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 9.1 | Badge notification avec compteur temps réel | ☐ |
| 9.2 | Popover avec 5 dernières notifications | ☐ |
| 9.3 | Click notification → marque lu + redirection | ☐ |
| 9.4 | Page notifications avec pagination | ☐ |
| 9.5 | Filtres : type, statut lu, date | ☐ |
| 9.6 | "Tout marquer comme lu" fonctionnel | ☐ |
| 9.7 | Chat intervention temps réel (Realtime) | ☐ |
| 9.8 | Upload pièce jointe dans chat | ☐ |
| 9.9 | Notifications Realtime (pas de polling) | ☐ |

---

## Feature 10: Annulation et Gestion d'Erreurs

```gherkin
Feature: Annulation d'Intervention
  En tant que gestionnaire
  Je veux pouvoir annuler une intervention
  Afin de gérer les cas où elle n'est plus nécessaire

  Background:
    Given je suis connecté en tant que gestionnaire
    And une intervention "INT-2025-0002" existe en statut "approuvee"

  @p1 @happy-path
  Scenario: Annulation d'une intervention
    When je suis sur la page détail de l'intervention
    And je clique sur le menu "⋮" (actions)
    And je sélectionne "Annuler l'intervention"
    Then une modal de confirmation s'affiche

    When je saisis la raison "Le locataire a résolu le problème lui-même"
    And je confirme l'annulation
    Then le statut passe à "Annulée" (badge rouge)
    And la raison est enregistrée dans l'historique
    And le prestataire reçoit une notification
    And le locataire reçoit une notification

  @p1
  Scenario: Rejet d'une demande de locataire
    Given une intervention en statut "demande" créée par un locataire
    When je visualise la demande
    And je clique sur "Rejeter la demande"
    And je saisis "Problème non couvert par le bail"
    And je confirme
    Then le statut passe à "Rejetée"
    And le locataire reçoit une notification avec la raison

  @negative @p2
  Scenario: Tentative d'annulation d'une intervention clôturée
    Given une intervention en statut "cloturee_par_gestionnaire"
    When je tente d'annuler cette intervention
    Then le bouton "Annuler" n'est pas visible
    And/Ou une erreur "Impossible d'annuler une intervention clôturée" s'affiche
```

### Checklist de Validation - Feature 10

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 10.1 | Menu actions (⋮) avec option Annuler | ☐ |
| 10.2 | Modal confirmation avec champ raison obligatoire | ☐ |
| 10.3 | Statut "annulee" après confirmation | ☐ |
| 10.4 | Raison visible dans l'historique/timeline | ☐ |
| 10.5 | Notifications envoyées à tous les acteurs | ☐ |
| 10.6 | Rejet demande locataire fonctionnel | ☐ |
| 10.7 | Impossible d'annuler intervention clôturée | ☐ |

---

## Feature 11: Performance et Edge Cases

```gherkin
Feature: Performance et Robustesse
  En tant que gestionnaire
  Je veux une application rapide et fiable
  Afin de travailler efficacement

  @performance @p0
  Scenario Outline: Temps de chargement des pages critiques
    When je navigue vers "<page>"
    Then la page est interactive (LCP) en moins de <temps_max>
    And aucune erreur n'apparaît dans la console (F12)

    Examples:
      | page | temps_max |
      | /gestionnaire/dashboard | 3s |
      | /gestionnaire/interventions | 2s |
      | /gestionnaire/biens | 2s |
      | /gestionnaire/contacts | 2s |

  @performance @p1
  Scenario: Liste avec grand volume de données
    Given j'ai 100+ interventions
    When je charge la liste des interventions
    Then le chargement initial affiche les 20 premiers items en < 2s
    And le scroll infini charge les suivants progressivement
    And/Ou la pagination fonctionne correctement

  @edge-case @p1
  Scenario: Session expirée pendant une action
    Given ma session expire pendant que je remplis un formulaire
    When je clique sur "Enregistrer"
    Then je suis redirigé vers la page de login
    And un message "Session expirée, veuillez vous reconnecter" s'affiche
    And mes données de formulaire sont préservées (optionnel, nice-to-have)

  @edge-case @p1
  Scenario: Perte de connexion pendant un upload
    Given je suis en train d'uploader une image
    When la connexion est perdue
    Then un message d'erreur "Connexion perdue" s'affiche
    And un bouton "Réessayer" est disponible

  @edge-case @p2
  Scenario: Double soumission de formulaire
    Given je remplis le formulaire de création d'intervention
    When je double-clique sur "Créer"
    Then une seule intervention est créée
    And le bouton est désactivé après le premier clic

  @edge-case @p2
  Scenario: Intervention sur bien supprimé entre-temps
    Given je suis sur une intervention liée au bien "IMM-004"
    When un autre gestionnaire supprime ce bien
    And je tente de modifier l'intervention
    Then un message "Le bien associé n'existe plus" s'affiche
    And l'intervention est marquée comme "orpheline" ou gérée gracieusement
```

### Checklist de Validation - Feature 11

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 11.1 | Dashboard charge en < 3s | ☐ |
| 11.2 | Listes chargent en < 2s | ☐ |
| 11.3 | Pas d'erreur console sur navigation standard | ☐ |
| 11.4 | Pagination ou scroll infini fonctionnel | ☐ |
| 11.5 | Session expirée → redirection login gracieuse | ☐ |
| 11.6 | Erreur réseau → message + option retry | ☐ |
| 11.7 | Prévention double soumission | ☐ |
| 11.8 | Gestion données orphelines/supprimées | ☐ |

---

## Résumé Parcours Gestionnaire

| Feature | Scénarios | Happy Path | Negative | Testés |
|---------|-----------|------------|----------|--------|
| 1. Connexion | 4 | 1 | 3 | ☐ |
| 2. Création Intervention | 6 | 3 | 3 | ☐ |
| 3. Gestion Devis | 4 | 2 | 1 | ☐ |
| 4. Planification | 4 | 2 | 2 | ☐ |
| 5. Suivi/Clôture | 4 | 3 | 1 | ☐ |
| 6. Gestion Biens | 5 | 3 | 2 | ☐ |
| 7. Gestion Contacts | 5 | 3 | 2 | ☐ |
| 8. Gestion Contrats | 3 | 2 | 1 | ☐ |
| 9. Notifications | 4 | 4 | 0 | ☐ |
| 10. Annulation | 3 | 2 | 1 | ☐ |
| 11. Performance | 6 | 2 | 4 | ☐ |
| **TOTAL** | **48** | **27** | **20** | |

---

## Informations de Session

| Champ | Valeur |
|-------|--------|
| **Testeur** | _________________ |
| **Date** | _________________ |
| **Environnement** | ☐ Local / ☐ Preview / ☐ Production |
| **Navigateur** | _________________ |
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
