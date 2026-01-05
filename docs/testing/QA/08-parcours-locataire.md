# Parcours E2E Locataire - SEIDO

> **Version** : 2.0 (Format Gherkin enrichi)
> **Rôle** : Locataire (8% des utilisateurs)
> **Focus** : Demandes d'intervention, suivi, validation
> **Priorité** : P1 - Important
> **UX** : Simple, rassurant, mobile-first
> **Durée estimée** : 1-1.5 heures

---

## Références

- **Compte de test** : `locataire@test-seido.fr` / `TestSeido2024!`
- **Compte alternatif** : `locataire2@test-seido.fr` / `TestSeido2024!`
- **Données de test** : Voir [11-donnees-test.md](./11-donnees-test.md)
- **Glossaire** : Voir [12-glossaire.md](./12-glossaire.md)

---

## Feature 1: Connexion et Onboarding

```gherkin
Feature: Authentification et Onboarding Locataire
  En tant que locataire
  Je veux me connecter à SEIDO
  Afin de gérer mes demandes d'intervention

  Background:
    Given je suis locataire d'un lot géré par SEIDO

  @smoke @p0 @happy-path
  Scenario: Première connexion via invitation email
    Given j'ai reçu un email d'invitation de mon gestionnaire
    And l'email contient un lien "Accéder à mon espace locataire"
    When je clique sur le lien d'invitation
    Then je suis sur la page "/auth/set-password"
    And je vois "Créez votre mot de passe"

    When je saisis un mot de passe "TestLoca2024!"
    And je confirme avec "TestLoca2024!"
    Then le mot de passe est validé (indicateur de force visible)

    When je clique sur "Activer mon compte"
    Then mon compte est activé
    And je vois un message de bienvenue personnalisé
    And je suis redirigé vers "/locataire/dashboard"

  @smoke @p0 @happy-path
  Scenario: Connexion standard avec identifiants valides
    Given je suis sur la page "/auth/login"
    When je saisis l'email "locataire@test-seido.fr"
    And je saisis le mot de passe "TestSeido2024!"
    And je clique sur "Se connecter"
    Then je suis redirigé vers "/locataire/dashboard" en moins de 3 secondes
    And l'interface est accueillante avec des couleurs rassurantes (emerald/vert)

  @p0 @happy-path
  Scenario: Consultation du dashboard locataire
    Given je suis connecté en tant que locataire
    When je suis sur "/locataire/dashboard"
    Then je vois les éléments suivants :
      | Élément | Description |
      | Message personnalisé | "Bonjour Emma" |
      | Mon logement | Adresse "Apt 3B, 12 rue de la Paix" |
      | Interventions en cours | Liste si présentes |
      | Bouton CTA | "Signaler un problème" bien visible |
    And l'interface est simple, sans surcharge d'informations
    And le design utilise des couleurs rassurantes (vert/emerald)

  @negative @p1
  Scenario: Connexion avec invitation expirée
    Given j'ai reçu une invitation il y a plus de 7 jours
    When je clique sur le lien d'invitation
    Then je vois un message "Cette invitation a expiré"
    And je vois les coordonnées de mon gestionnaire pour le contacter
```

### Checklist de Validation - Feature 1

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 1.1 | Email d'invitation avec lien valide | ☐ |
| 1.2 | Page set-password fonctionnelle | ☐ |
| 1.3 | Message de bienvenue personnalisé | ☐ |
| 1.4 | Dashboard avec adresse du lot visible | ☐ |
| 1.5 | Bouton "Signaler un problème" bien visible | ☐ |
| 1.6 | Interface simple et rassurante | ☐ |
| 1.7 | Pas de surcharge d'informations | ☐ |

---

## Feature 2: Demande d'Intervention (Wizard Simplifié)

```gherkin
Feature: Création de Demande d'Intervention
  En tant que locataire
  Je veux signaler un problème dans mon logement
  Afin que le gestionnaire organise une intervention

  Background:
    Given je suis connecté en tant que "locataire@test-seido.fr"
    And je suis sur "/locataire/dashboard"

  @smoke @p0 @happy-path
  Scenario: Création d'une demande d'intervention complète
    When je clique sur "Signaler un problème"
    Then je suis sur un wizard simplifié avec indicateur d'étapes
    And l'étape 1 "Type de problème" est active

    # Étape 1 - Type de problème
    When je vois les catégories de problèmes :
      | Catégorie |
      | Plomberie 🔧 |
      | Électricité ⚡ |
      | Chauffage 🔥 |
      | Serrurerie 🔑 |
      | Autre ⚙️ |
    And je sélectionne "Plomberie"
    And je clique sur "Suivant"
    Then je passe à l'étape 2 "Description"

    # Étape 2 - Description
    When je vois un champ texte avec placeholder guidant :
      """
      Décrivez votre problème...
      Exemple : Fuite d'eau sous l'évier de la cuisine
      """
    And je saisis "Fuite d'eau sous l'évier de la cuisine, goutte régulièrement"
    And je vois l'option "Est-ce urgent ?"
    And je coche "Non, ce n'est pas urgent"
    And je clique sur "Suivant"
    Then je passe à l'étape 3 "Photos"

    # Étape 3 - Photos (optionnel)
    When je vois le message "Ajoutez des photos pour aider le prestataire (optionnel)"
    And je clique sur "Ajouter une photo"
    And je sélectionne "test-image-valid.jpg"
    Then la photo apparaît en preview
    And je peux la supprimer si besoin

    When je clique sur "Suivant"
    Then je passe à l'étape 4 "Récapitulatif"

    # Étape 4 - Récapitulatif
    When je vois le récapitulatif :
      | Champ | Valeur |
      | Type | Plomberie |
      | Description | Fuite d'eau sous l'évier... |
      | Urgence | Non |
      | Photos | 1 photo jointe |
    And je clique sur "Envoyer ma demande"
    Then un loader s'affiche
    And je vois une page de confirmation avec :
      | Élément | Visible |
      | Message succès | "Votre demande a bien été envoyée" |
      | Numéro de demande | INT-2025-XXXX |
      | Prochaines étapes | Explications |
    And le gestionnaire reçoit une notification

  @p0 @happy-path
  Scenario: Création d'une demande urgente
    Given je suis sur le wizard de demande
    And j'ai sélectionné "Électricité"
    When je coche "Oui, c'est urgent"
    Then un badge "Urgent" s'affiche
    And je vois un message : "Votre demande sera traitée en priorité"

    When je complète et envoie la demande
    Then le badge "Urgent" est visible dans le récapitulatif
    And le gestionnaire reçoit une notification urgente

  @p1
  Scenario: Création d'une demande sans photo
    Given je suis sur le wizard de demande
    And j'ai rempli type et description
    When je suis à l'étape Photos
    And je clique sur "Suivant" sans ajouter de photo
    Then je passe directement au récapitulatif
    And la demande peut être envoyée sans photo (optionnel)

  @p1
  Scenario: Modification avant envoi
    Given je suis sur l'étape Récapitulatif
    When je clique sur "Modifier" à côté du type
    Then je reviens à l'étape Type
    And ma description précédente est conservée

  @negative @p1
  Scenario: Tentative d'envoi sans description
    Given je suis sur le wizard de demande
    When je laisse la description vide
    And je clique sur "Suivant"
    Then une erreur "La description est requise" s'affiche
    And je reste sur l'étape Description

  @negative @p1
  Scenario: Annulation en cours de wizard
    Given je suis au milieu du wizard
    When je clique sur "Annuler" ou le bouton retour
    Then une modal de confirmation s'affiche : "Êtes-vous sûr ? Votre demande ne sera pas enregistrée."

    When je confirme l'annulation
    Then je reviens au dashboard
    And aucune demande n'est créée
```

### Checklist de Validation - Feature 2

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 2.1 | Wizard en 4 étapes avec indicateur de progression | ☐ |
| 2.2 | Catégories de problèmes avec icônes claires | ☐ |
| 2.3 | Champ description avec placeholder guidant | ☐ |
| 2.4 | Option urgence visible et fonctionnelle | ☐ |
| 2.5 | Upload photo optionnel | ☐ |
| 2.6 | Récapitulatif complet avant envoi | ☐ |
| 2.7 | Page confirmation avec numéro de demande | ☐ |
| 2.8 | Temps de création < 2 minutes | ☐ |
| 2.9 | Notification gestionnaire envoyée | ☐ |

---

## Feature 3: Suivi des Interventions

```gherkin
Feature: Suivi des Interventions par Locataire
  En tant que locataire
  Je veux suivre l'avancement de mes demandes
  Afin de savoir quand le problème sera résolu

  Background:
    Given je suis connecté en tant que locataire
    And j'ai au moins une intervention en cours

  @p0 @happy-path
  Scenario: Consultation de la liste des interventions
    When je navigue vers "/locataire/interventions" ou "Mes interventions"
    Then je vois la liste de mes demandes
    And chaque demande affiche :
      | Élément | Visible |
      | Type | Oui (avec icône) |
      | Statut | Oui (badge couleur) |
      | Date de création | Oui |
    And les demandes sont triées par date (récentes en premier)

    When je filtre par "En cours"
    Then seules les interventions actives s'affichent

  @p0 @happy-path
  Scenario: Suivi d'une intervention avec timeline
    Given une intervention "INT-2025-0001" existe
    When je clique sur cette intervention
    Then je vois une page détail avec timeline visuelle :
      | Étape | Statut |
      | Demande envoyée | ✅ Fait |
      | Validation gestionnaire | En cours |
      | Intervention planifiée | À venir |
      | Travaux réalisés | À venir |
      | Validation finale | À venir |
    And je vois le statut actuel clairement indiqué
    And je vois une explication de la prochaine étape

  @p0 @happy-path
  Scenario: Affichage des différents statuts (Vue Locataire)
    Then les statuts s'affichent de manière compréhensible :
      | Statut Code | Affichage Locataire | Message |
      | demande | En attente | "Votre demande est en cours d'examen" |
      | rejetee | Non retenue | "Demande non retenue" + raison |
      | approuvee | Acceptée | "Un prestataire va être assigné" |
      | demande_de_devis | Recherche prestataire | "Nous recherchons le meilleur prestataire" |
      | planification | Planification | "Choisissez vos disponibilités" |
      | planifiee | RDV confirmé | Date + heure du RDV |
      | en_cours | Travaux en cours | "Le prestataire intervient" |
      | cloturee_par_prestataire | Travaux terminés | "Validez les travaux" |
      | cloturee_par_gestionnaire | Terminée | "Intervention clôturée" |

  @p1
  Scenario: Consultation des documents et photos
    Given une intervention avec photos existe
    When je suis sur la page détail
    And je clique sur l'onglet "Documents"
    Then je vois mes photos initiales
    And si le prestataire a ajouté des photos, elles sont visibles
    And je peux agrandir chaque photo au clic
```

### Checklist de Validation - Feature 3

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 3.1 | Liste interventions avec badges statut | ☐ |
| 3.2 | Filtres par statut fonctionnels | ☐ |
| 3.3 | Timeline visuelle sur page détail | ☐ |
| 3.4 | Statuts traduits en langage clair | ☐ |
| 3.5 | Message explicatif pour chaque étape | ☐ |
| 3.6 | Photos consultables et agrandissables | ☐ |

---

## Feature 4: Planification et Disponibilités

```gherkin
Feature: Planification des Disponibilités Locataire
  En tant que locataire
  Je veux indiquer mes disponibilités
  Afin de planifier le passage du prestataire

  Background:
    Given je suis connecté en tant que locataire
    And une intervention est en statut "planification"

  @p0 @happy-path
  Scenario: Indication des disponibilités
    Given je reçois une notification "Indiquez vos disponibilités"
    When je clique sur la notification
    Then je suis sur la page de l'intervention
    And je vois une section "Vos disponibilités"

    When je clique sur "Indiquer mes disponibilités"
    Then un calendrier ou une liste de créneaux s'affiche

    When je sélectionne plusieurs créneaux :
      | Date | Créneau |
      | 20/12/2025 | Matin (9h-12h) |
      | 21/12/2025 | Après-midi (14h-17h) |
      | 22/12/2025 | Matin (9h-12h) |
    And je clique sur "Envoyer mes disponibilités"
    Then un toast affiche "Disponibilités envoyées"
    And le statut devient "En attente de confirmation"

  @p0 @happy-path
  Scenario: Confirmation d'un RDV par le système
    Given j'ai envoyé mes disponibilités
    And le gestionnaire a validé un créneau
    Then je reçois une notification "RDV confirmé"

    When je consulte l'intervention
    Then je vois les détails du RDV :
      | Élément | Valeur |
      | Date | 20/12/2025 |
      | Heure | 9h00 - 11h00 |
      | Prestataire | Jean Dupont (Plomberie Express) |
    And je vois des consignes si nécessaire (accès, présence requise)
    And le statut est "Planifiée" (badge bleu)

  @p1
  Scenario: Rappel J-1 avant intervention
    Given un RDV est prévu demain
    Then je reçois une notification de rappel
    And elle contient :
      | Élément |
      | Date et heure |
      | Nom du prestataire |
      | Adresse (même si c'est mon logement) |

  @p1
  Scenario: Demande de report de RDV
    Given un RDV est planifié
    When je suis sur la page de l'intervention
    And je clique sur "Demander un report"
    Then une modal s'affiche pour saisir la raison

    When je saisis "Je serai absent ce jour-là"
    And je confirme
    Then la demande de report est envoyée
    And le gestionnaire reçoit une notification
    And le statut repasse à "Planification"
```

### Checklist de Validation - Feature 4

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 4.1 | Notification "Indiquez vos disponibilités" | ☐ |
| 4.2 | Interface de sélection de créneaux simple | ☐ |
| 4.3 | Envoi disponibilités fonctionnel | ☐ |
| 4.4 | Notification "RDV confirmé" avec détails | ☐ |
| 4.5 | Informations prestataire visibles | ☐ |
| 4.6 | Rappel J-1 reçu | ☐ |
| 4.7 | Demande de report possible | ☐ |

---

## Feature 5: Validation des Travaux

```gherkin
Feature: Validation des Travaux par Locataire
  En tant que locataire
  Je veux valider les travaux réalisés
  Afin de confirmer que le problème est résolu

  Background:
    Given je suis connecté en tant que locataire
    And une intervention est en statut "cloturee_par_prestataire"

  @p0 @happy-path
  Scenario: Validation des travaux satisfaisants
    Given je reçois une notification "Travaux terminés - Validez"
    When je clique sur la notification
    Then je suis sur la page de l'intervention
    And je vois le rapport du prestataire :
      | Élément | Visible |
      | Description des travaux | Oui |
      | Photos "après" | Oui |
    And je peux comparer avec mes photos initiales

    When je clique sur "Valider les travaux"
    Then un formulaire de feedback s'affiche

    When je sélectionne "Je suis satisfait(e)"
    And je donne une note de 5 étoiles (optionnel)
    And j'ajoute un commentaire "Très bon travail, rapide et propre"
    And je confirme
    Then les travaux sont validés
    And le statut passe à "Clôturée (locataire)"
    And je vois un message "Merci pour votre retour !"

  @p1
  Scenario: Signalement d'un problème après intervention
    Given je vois le rapport du prestataire
    And je constate que le problème n'est pas résolu
    When je clique sur "Signaler un problème"
    Then un formulaire s'affiche

    When je saisis "La fuite persiste sous l'évier"
    And j'ajoute une photo du problème
    And j'envoie
    Then le signalement est enregistré
    And le gestionnaire reçoit une alerte
    And le message s'affiche : "Votre signalement a été transmis au gestionnaire"

  @negative @p2
  Scenario: Tentative de double validation
    Given j'ai déjà validé les travaux
    When je retourne sur l'intervention
    Then le bouton "Valider" n'est plus visible
    And je vois "Vous avez validé les travaux le XX/XX/XXXX"
```

### Checklist de Validation - Feature 5

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 5.1 | Notification "Travaux terminés" reçue | ☐ |
| 5.2 | Rapport prestataire visible (description + photos) | ☐ |
| 5.3 | Comparaison photos avant/après possible | ☐ |
| 5.4 | Bouton "Valider les travaux" visible | ☐ |
| 5.5 | Formulaire feedback (note + commentaire) | ☐ |
| 5.6 | Message de remerciement après validation | ☐ |
| 5.7 | Option "Signaler un problème" fonctionnelle | ☐ |
| 5.8 | Impossibilité de double validation | ☐ |

---

## Feature 6: Communication

```gherkin
Feature: Communication Locataire
  En tant que locataire
  Je veux communiquer concernant mes interventions
  Afin d'obtenir des informations ou signaler des problèmes

  Background:
    Given je suis connecté en tant que locataire
    And j'ai une intervention en cours

  @p1 @happy-path
  Scenario: Envoi d'un message sur une intervention
    Given je suis sur la page détail d'une intervention
    When je clique sur l'onglet "Messages" ou "Commentaires"
    Then je vois la zone de conversation

    When je saisis "Bonjour, est-il possible d'avoir une estimation de la date d'intervention ?"
    And je clique sur "Envoyer"
    Then mon message apparaît dans le fil
    And le gestionnaire reçoit une notification

    When le gestionnaire répond "Bonjour Emma, nous vous recontacterons dans 48h."
    Then la réponse apparaît en temps réel (Realtime)

  @p1
  Scenario: Consultation des notifications
    Given j'ai des notifications non lues
    Then le badge rouge affiche le nombre de non-lues

    When je clique sur l'icône notification
    Then je vois les notifications récentes :
      | Type |
      | Demande validée |
      | RDV confirmé |
      | Travaux terminés |

    When je clique sur une notification
    Then elle est marquée comme lue
    And je suis redirigé vers la page concernée
```

### Checklist de Validation - Feature 6

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 6.1 | Zone de messages sur page intervention | ☐ |
| 6.2 | Envoi de message fonctionnel | ☐ |
| 6.3 | Réception réponses en temps réel | ☐ |
| 6.4 | Badge notifications avec compteur | ☐ |
| 6.5 | Click notification → redirection | ☐ |

---

## Feature 7: Profil et Paramètres

```gherkin
Feature: Gestion du Profil Locataire
  En tant que locataire
  Je veux gérer mon profil
  Afin de maintenir mes informations à jour

  Background:
    Given je suis connecté en tant que locataire

  @p1 @happy-path
  Scenario: Consultation et modification du profil
    When je navigue vers "/locataire/profil" ou Menu → Profil
    Then je vois mes informations :
      | Section | Contenu |
      | Identité | Prénom, Nom |
      | Contact | Email, Téléphone |
      | Mon logement | Adresse du lot |

    When je clique sur "Modifier"
    And je change mon téléphone
    And je sauvegarde
    Then mon profil est mis à jour
    And un toast affiche "Profil mis à jour"

  @p2
  Scenario: Gestion des préférences de notification
    When je navigue vers les paramètres
    And je vais dans "Notifications"
    Then je vois les options :
      | Option | Type |
      | Notifications email | Toggle |
      | Notifications push | Toggle |

    When je désactive les emails
    And je sauvegarde
    Then mes préférences sont enregistrées
```

### Checklist de Validation - Feature 7

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 7.1 | Page profil avec informations | ☐ |
| 7.2 | Modification téléphone fonctionnelle | ☐ |
| 7.3 | Adresse du lot visible (lecture seule) | ☐ |
| 7.4 | Préférences notifications modifiables | ☐ |

---

## Feature 8: Tests Mobile (Priorité Haute)

```gherkin
Feature: Expérience Mobile Locataire
  En tant que locataire sur mobile
  Je veux utiliser l'application facilement
  Afin de signaler des problèmes et suivre mes demandes

  Background:
    Given je suis sur un smartphone (viewport 375px)
    And je suis connecté en tant que locataire

  @mobile @p0 @happy-path
  Scenario: Parcours mobile complet - Création de demande
    When je charge le dashboard
    Then tous les éléments sont visibles sans scroll horizontal
    And le bouton "Signaler un problème" est bien visible (gros CTA)

    When je clique sur "Signaler un problème"
    Then le wizard s'affiche correctement sur mobile
    And les étapes sont claires

    When je prends une photo avec l'appareil photo
    Then la photo est uploadée
    And le preview est visible

    When je complète et envoie la demande
    Then je vois la confirmation de succès

  @mobile @p0
  Scenario: Upload photo depuis appareil photo
    Given je suis sur l'étape Photos du wizard
    When je clique sur "Prendre une photo"
    Then l'appareil photo du smartphone s'ouvre

    When je prends une photo
    Then elle est uploadée avec preview

  @mobile @p0
  Scenario: Upload photo depuis galerie
    Given je suis sur l'étape Photos du wizard
    When je clique sur "Choisir depuis la galerie"
    Then la galerie du smartphone s'ouvre

    When je sélectionne une photo
    Then elle est uploadée avec preview

  @mobile @p1
  Scenario: Formulaires utilisables sur mobile
    When je saisis du texte dans un champ
    Then le clavier virtuel s'affiche
    And le champ reste visible (pas masqué par le clavier)
    And je peux scroller si nécessaire

  @mobile @performance @p1
  Scenario Outline: Performance mobile
    When je charge "<page>" en 4G
    Then le chargement initial est < <temps>
    And le scroll est fluide

    Examples:
      | page | temps |
      | Dashboard | 3s |
      | Liste interventions | 2s |
      | Wizard demande | 2s |
```

### Checklist de Validation - Feature 8 (Mobile)

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 8.1 | Pas de scroll horizontal | ☐ |
| 8.2 | Bouton CTA "Signaler" bien visible | ☐ |
| 8.3 | Wizard fonctionnel sur mobile | ☐ |
| 8.4 | Appareil photo accessible | ☐ |
| 8.5 | Upload depuis galerie | ☐ |
| 8.6 | Clavier ne masque pas les champs | ☐ |
| 8.7 | Touch targets ≥44px | ☐ |
| 8.8 | Texte lisible (≥16px) | ☐ |
| 8.9 | Dashboard < 3s en 4G | ☐ |

---

## Feature 9: Accessibilité et Simplicité

```gherkin
Feature: Accessibilité et Simplicité
  En tant que locataire de tout âge et niveau technique
  Je veux une interface simple et accessible
  Afin de l'utiliser sans difficulté

  @accessibility @p1
  Scenario: Navigation au clavier
    Given je suis sur le dashboard
    When je navigue avec la touche Tab
    Then je peux atteindre tous les éléments interactifs
    And l'ordre de tabulation est logique
    And le focus est toujours visible (ring)

  @accessibility @p1
  Scenario: Contraste et lisibilité
    Then tous les textes ont un contraste ≥ 4.5:1
    And les boutons principaux sont clairement visibles
    And les couleurs d'erreur sont distinguables

  @simplicity @p1
  Scenario: Temps de création d'une demande
    When je crée une demande d'intervention
    Then le processus prend moins de 2 minutes
    And je n'ai pas besoin de chercher où cliquer

  @simplicity @p1
  Scenario: Langage utilisé
    Then tous les textes sont en français simple
    And pas de jargon technique
    And les statuts sont compréhensibles par tous
```

### Checklist de Validation - Feature 9

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 9.1 | Navigation clavier complète | ☐ |
| 9.2 | Focus visible sur tous les éléments | ☐ |
| 9.3 | Contraste texte ≥ 4.5:1 | ☐ |
| 9.4 | Labels sur tous les champs de formulaire | ☐ |
| 9.5 | Demande < 2 minutes | ☐ |
| 9.6 | Langage simple et clair | ☐ |
| 9.7 | Aide contextuelle si nécessaire | ☐ |

---

## Feature 10: Cas d'Erreur

```gherkin
Feature: Gestion des Erreurs
  En tant que locataire
  Je veux des messages d'erreur clairs
  Afin de comprendre et résoudre les problèmes

  @negative @p1
  Scenario: Demande sans description
    Given je suis sur le wizard de demande
    When je laisse la description vide
    And je clique sur "Suivant"
    Then une erreur claire s'affiche : "Veuillez décrire votre problème"
    And le champ est mis en évidence (bordure rouge)

  @negative @p1
  Scenario: Upload fichier trop volumineux
    When je tente d'uploader une photo de 15 MB
    Then une erreur s'affiche : "L'image dépasse la taille maximale (10 MB)"
    And le fichier n'est pas uploadé

  @negative @p1
  Scenario: Session expirée
    Given ma session expire pendant que je remplis une demande
    When je clique sur "Envoyer"
    Then je suis redirigé vers la page de login
    And un message doux s'affiche : "Veuillez vous reconnecter"

  @negative @p2
  Scenario: État vide - Aucune intervention
    Given je n'ai jamais fait de demande
    When je consulte "Mes interventions"
    Then je vois un message : "Vous n'avez pas encore d'intervention"
    And un bouton "Signaler un problème" est visible

  @negative @p2
  Scenario: Demande rejetée
    Given une de mes demandes a été rejetée
    When je consulte cette demande
    Then je vois le statut "Non retenue"
    And la raison du rejet est affichée
    And je peux créer une nouvelle demande
```

### Checklist de Validation - Feature 10

| # | Critère d'Acceptation | Status |
|---|----------------------|--------|
| 10.1 | Erreur validation description | ☐ |
| 10.2 | Erreur fichier trop volumineux | ☐ |
| 10.3 | Redirection douce si session expirée | ☐ |
| 10.4 | État vide avec CTA | ☐ |
| 10.5 | Demande rejetée avec explication | ☐ |
| 10.6 | Messages d'erreur clairs et compréhensibles | ☐ |

---

## Résumé Parcours Locataire

| Feature | Scénarios | Happy Path | Negative | Testés |
|---------|-----------|------------|----------|--------|
| 1. Connexion/Onboarding | 4 | 3 | 1 | ☐ |
| 2. Demande Intervention | 6 | 4 | 2 | ☐ |
| 3. Suivi Interventions | 4 | 4 | 0 | ☐ |
| 4. Planification | 4 | 3 | 1 | ☐ |
| 5. Validation Travaux | 3 | 2 | 1 | ☐ |
| 6. Communication | 2 | 2 | 0 | ☐ |
| 7. Profil | 2 | 2 | 0 | ☐ |
| 8. Mobile | 5 | 5 | 0 | ☐ |
| 9. Accessibilité | 4 | 4 | 0 | ☐ |
| 10. Erreurs | 5 | 0 | 5 | ☐ |
| **TOTAL** | **39** | **29** | **10** | |

---

## Informations de Session

| Champ | Valeur |
|-------|--------|
| **Testeur** | _________________ |
| **Date** | _________________ |
| **Environnement** | ☐ Local / ☐ Preview / ☐ Production |
| **Device Mobile** | _________________ |
| **Temps moyen création demande** | _______ minutes |
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
