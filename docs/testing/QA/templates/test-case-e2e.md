# Template E2E Gherkin - SEIDO

> **Version** : 1.0
> **Date** : 2025-12-18
> **Usage** : Pour les parcours E2E complets utilisant le format BDD (Behavior-Driven Development)

---

## Syntaxe Gherkin

Le format Gherkin utilise des mots-clés standardisés pour décrire les comportements attendus :

| Mot-clé | Usage | Traduction FR |
|---------|-------|---------------|
| `Feature` | Décrire la fonctionnalité globale | Fonctionnalité |
| `Scenario` | Un cas de test spécifique | Scénario |
| `Given` | État initial / Préconditions | Étant donné |
| `When` | Action de l'utilisateur | Quand |
| `Then` | Résultat attendu | Alors |
| `And` | Étape supplémentaire (Given/When/Then) | Et |
| `But` | Exception à une règle | Mais |
| `Background` | Préconditions communes à tous les scénarios | Contexte |
| `Scenario Outline` | Scénario paramétré avec exemples | Plan de scénario |
| `Examples` | Table de données pour Scenario Outline | Exemples |

---

## Structure d'un Fichier Feature

```gherkin
# ==============================================================================
# Feature: [NOM_FONCTIONNALITÉ]
# ID: FT-[MODULE]-[NNN]
# Priorité: P0/P1/P2
# Rôle principal: [Gestionnaire/Prestataire/Locataire/Admin]
# ==============================================================================

@[tag1] @[tag2]
Feature: [Titre de la fonctionnalité]
  En tant que [rôle utilisateur]
  Je veux [action/capacité]
  Afin de [bénéfice métier]

  # ------------------------------------------------------------------------------
  # Contexte commun à tous les scénarios
  # ------------------------------------------------------------------------------
  Background:
    Given je suis connecté en tant que "[rôle]"
    And je suis sur la page "[URL]"

  # ------------------------------------------------------------------------------
  # Scénario 1: Cas nominal (Happy Path)
  # ------------------------------------------------------------------------------
  @smoke @[module]
  Scenario: [Titre descriptif du scénario nominal]
    Given [précondition spécifique]
    When [action utilisateur]
    Then [résultat attendu]
    And [vérification supplémentaire]

  # ------------------------------------------------------------------------------
  # Scénario 2: Cas d'erreur
  # ------------------------------------------------------------------------------
  @negative @[module]
  Scenario: [Titre descriptif du cas d'erreur]
    Given [précondition]
    When [action invalide]
    Then [message d'erreur attendu]

  # ------------------------------------------------------------------------------
  # Scénario paramétré avec exemples
  # ------------------------------------------------------------------------------
  @parametrized @[module]
  Scenario Outline: [Titre avec <placeholder>]
    Given [précondition avec <variable>]
    When [action avec <donnée>]
    Then [résultat avec <attendu>]

    Examples:
      | variable | donnée | attendu |
      | valeur1  | data1  | result1 |
      | valeur2  | data2  | result2 |
```

---

## Template Parcours E2E Complet

```gherkin
# ==============================================================================
# Feature: Création d'Intervention
# ID: FT-INTV-001
# Priorité: P0
# Rôle principal: Gestionnaire
# Durée estimée: ~10 minutes
# ==============================================================================

@intervention @gestionnaire @p0 @smoke
Feature: Création d'une nouvelle intervention
  En tant que gestionnaire immobilier
  Je veux créer une intervention sur un bien
  Afin de déclencher une action de maintenance

  # ------------------------------------------------------------------------------
  # Contexte
  # ------------------------------------------------------------------------------
  Background:
    Given je suis connecté en tant que "gestionnaire"
      | email    | gestionnaire@test-seido.fr |
      | password | TestSeido2024!             |
    And j'ai au moins 1 immeuble avec l'adresse "12 rue de la Paix, 75001 Paris"
    And j'ai au moins 1 prestataire "Plomberie Express" dans mes contacts
    And je suis sur le dashboard gestionnaire

  # ------------------------------------------------------------------------------
  # Scénario 1: Création intervention directe (Happy Path)
  # TC-INTV-001
  # ------------------------------------------------------------------------------
  @smoke @happy-path
  Scenario: Créer une intervention directe avec assignation prestataire
    # Navigation
    When je clique sur le bouton "Nouvelle intervention"
    Then je vois la page de création d'intervention
    And le titre est "Nouvelle Intervention"

    # Sélection du bien
    When je sélectionne l'immeuble "12 rue de la Paix"
    Then l'adresse complète "12 rue de la Paix, 75001 Paris" s'affiche
    And je peux sélectionner un lot ou "Parties communes"

    When je sélectionne "Parties communes"
    Then "Parties communes" est marqué comme sélectionné

    # Type d'intervention
    When je sélectionne le type "Plomberie"
    Then le type "Plomberie" est sélectionné avec une icône bleue

    # Description
    When je saisis la description:
      """
      Fuite d'eau dans la cave niveau -1.
      Urgence : eau qui coule depuis ce matin.
      Compteur d'eau coupé en attendant.
      """
    Then le compteur de caractères affiche "142/2000"

    # Priorité
    When je sélectionne la priorité "Urgente"
    Then un badge rouge "Urgente" s'affiche

    # Photos (optionnel)
    When j'upload la photo "fuite-cave.jpg"
    Then la miniature de la photo s'affiche
    And je peux la supprimer via l'icône X

    # Mode d'intervention
    When je sélectionne "Intervention directe"
    Then la section "Sélection prestataire" apparaît

    # Assignation prestataire
    When je recherche "Plomberie"
    Then la liste affiche "Plomberie Express"

    When je sélectionne "Plomberie Express"
    Then "Plomberie Express" apparaît avec son numéro de téléphone

    # Récapitulatif
    When je clique sur "Suivant" ou "Vérifier"
    Then je vois un récapitulatif avec:
      | Champ       | Valeur attendue                          |
      | Bien        | 12 rue de la Paix - Parties communes     |
      | Type        | Plomberie                                |
      | Priorité    | Urgente                                  |
      | Prestataire | Plomberie Express                        |
      | Mode        | Intervention directe                     |

    # Création
    When je clique sur "Créer l'intervention"
    Then je vois un spinner pendant le chargement
    And je suis redirigé vers la page détail de l'intervention
    And le toast affiche "Intervention créée avec succès"
    And le statut est "Approuvée" (badge vert)
    And la référence est au format "INT-2025-XXXX"

    # Vérifications post-création
    And le prestataire "Plomberie Express" a reçu une notification
    And l'historique affiche "Intervention créée par [Mon Nom]"

  # ------------------------------------------------------------------------------
  # Scénario 2: Création avec demande de devis
  # TC-INTV-002
  # ------------------------------------------------------------------------------
  @devis @multi-prestataire
  Scenario: Créer une intervention avec demande de devis multiples
    Given je suis sur la page de création d'intervention
    And j'ai rempli les informations de base:
      | Bien        | 12 rue de la Paix - Apt 3B |
      | Type        | Électricité                |
      | Description | Panne tableau électrique   |
      | Priorité    | Normale                    |

    When je sélectionne "Demander un devis"
    Then la section "Sélection prestataires" permet la multi-sélection

    When je sélectionne les prestataires:
      | Nom                 |
      | Électricité Pro     |
      | Dépann'Elec 24h     |
      | Services Électriques|
    Then 3 prestataires sont sélectionnés
    And un message indique "3 prestataires recevront la demande de devis"

    When je crée l'intervention
    Then le statut est "Demande de devis" (badge orange)
    And la section "Devis" affiche "En attente de 3 devis"
    And les 3 prestataires ont reçu une notification

  # ------------------------------------------------------------------------------
  # Scénario 3: Validation des champs obligatoires
  # TC-INTV-003
  # ------------------------------------------------------------------------------
  @validation @negative
  Scenario Outline: Erreur de validation sur champ obligatoire manquant
    Given je suis sur la page de création d'intervention
    When je ne remplis pas le champ "<champ>"
    And je tente de passer à l'étape suivante
    Then je vois l'erreur "<message_erreur>"
    And le champ "<champ>" est surligné en rouge
    And je ne peux pas continuer

    Examples:
      | champ       | message_erreur                        |
      | Bien        | Veuillez sélectionner un bien         |
      | Type        | Veuillez sélectionner un type         |
      | Description | La description est requise            |
      | Prestataire | Veuillez sélectionner un prestataire  |

  # ------------------------------------------------------------------------------
  # Scénario 4: Upload de photos
  # TC-INTV-004
  # ------------------------------------------------------------------------------
  @upload @photos
  Scenario: Gestion des photos jointes
    Given je suis sur l'étape "Photos" de la création

    # Format valide
    When j'upload une image "photo.jpg" de 2MB
    Then la miniature s'affiche
    And le nom du fichier est visible

    # Format invalide
    When j'upload un fichier "document.pdf"
    Then un message d'erreur indique "Seuls les formats JPG, PNG, WEBP sont acceptés"
    And le fichier n'est pas ajouté

    # Taille excessive
    When j'upload une image "grande-image.jpg" de 15MB
    Then un message d'erreur indique "La taille maximale est de 10MB"

    # Limite de fichiers
    When j'ai déjà 5 photos
    And j'essaie d'en ajouter une 6ème
    Then un message indique "Maximum 5 photos par intervention"

    # Suppression
    When je clique sur X sur la première photo
    Then la photo est supprimée de la liste
    And je peux à nouveau ajouter une photo

  # ------------------------------------------------------------------------------
  # Scénario 5: Sauvegarde brouillon (si implémenté)
  # TC-INTV-005
  # ------------------------------------------------------------------------------
  @draft @optional
  Scenario: Sauvegarde automatique en brouillon
    Given je suis sur la page de création d'intervention
    And j'ai rempli partiellement le formulaire

    When je quitte la page accidentellement
    And je reviens sur la création d'intervention
    Then un message propose "Reprendre votre brouillon ?"

    When je clique "Oui, reprendre"
    Then les champs sont pré-remplis avec mes données précédentes

  # ------------------------------------------------------------------------------
  # Scénario 6: Annulation
  # TC-INTV-006
  # ------------------------------------------------------------------------------
  @cancel
  Scenario: Annulation de la création
    Given je suis sur la page de création d'intervention
    And j'ai rempli quelques champs

    When je clique sur "Annuler" ou le bouton retour
    Then une modale de confirmation apparaît
    And le message est "Êtes-vous sûr de vouloir annuler ? Les données non sauvegardées seront perdues."

    When je confirme l'annulation
    Then je suis redirigé vers la page précédente
    And aucune intervention n'est créée
```

---

## Tags Standards

| Tag | Usage |
|-----|-------|
| `@smoke` | Tests critiques pour validation rapide |
| `@regression` | Tests de non-régression |
| `@p0`, `@p1`, `@p2` | Priorité du test |
| `@happy-path` | Cas nominal / chemin heureux |
| `@negative` | Cas d'erreur |
| `@gestionnaire`, `@prestataire`, `@locataire` | Rôle testé |
| `@intervention`, `@devis`, `@planning` | Module fonctionnel |
| `@wip` | Work In Progress - test incomplet |
| `@skip` | Test désactivé temporairement |
| `@manual` | Test à exécuter manuellement |

---

## Étapes Réutilisables (Step Definitions)

### Authentification
```gherkin
Given je suis connecté en tant que "{role}"
Given je suis déconnecté
When je me connecte avec "{email}" et "{password}"
Then je suis redirigé vers "{url}"
```

### Navigation
```gherkin
Given je suis sur la page "{nom_page}"
Given je suis sur l'URL "{url}"
When je clique sur le bouton "{texte}"
When je clique sur le lien "{texte}"
When je navigue vers "{url}"
Then je vois la page "{titre}"
Then l'URL contient "{fragment}"
```

### Formulaires
```gherkin
When je saisis "{valeur}" dans le champ "{nom_champ}"
When je sélectionne "{option}" dans la liste "{nom_liste}"
When je coche la case "{label}"
When je décoche la case "{label}"
When je soumets le formulaire
Then le champ "{nom}" contient "{valeur}"
Then le champ "{nom}" est en erreur avec "{message}"
```

### Assertions
```gherkin
Then je vois le texte "{texte}"
Then je ne vois pas le texte "{texte}"
Then l'élément "{sélecteur}" est visible
Then l'élément "{sélecteur}" est masqué
Then le toast affiche "{message}"
Then le badge affiche "{valeur}"
```

### Attentes
```gherkin
When j'attends {secondes} secondes
Then la page charge en moins de {millisecondes}ms
Then le spinner disparaît
```

---

## Bonnes Pratiques Gherkin

### DO (À faire)

- [ ] Écrire du point de vue de l'utilisateur (pas technique)
- [ ] Un scénario = Un comportement métier
- [ ] Utiliser des données réalistes et explicites
- [ ] Garder les scénarios courts (< 15 étapes)
- [ ] Utiliser Background pour factoriser les préconditions communes

### DON'T (À éviter)

- [ ] ❌ Détails techniques : `When I click on div#submit-btn`
- [ ] ❌ Scénarios trop longs (> 20 étapes)
- [ ] ❌ Conditions multiples dans un When : `When je clique et je saisis et je valide`
- [ ] ❌ Assertions vagues : `Then ça marche`

---

## Conversion Checklist → Gherkin

### Avant (Checklist)
```markdown
| # | Test | Status |
|---|------|--------|
| 2.3.1 | Formulaire multi-étapes visible | ☐ |
| 2.3.2 | Step 1: Informations générales | ☐ |
| 2.3.3 | Step 2: Adresse | ☐ |
```

### Après (Gherkin)
```gherkin
Scenario: Navigation dans le formulaire multi-étapes
  Given je suis sur la page de création d'immeuble
  Then je vois un stepper avec 4 étapes:
    | Étape | Nom          | État   |
    | 1     | Informations | Active |
    | 2     | Adresse      | À venir |
    | 3     | Contacts     | À venir |
    | 4     | Documents    | À venir |

  When je remplis les informations générales
  And je clique "Suivant"
  Then l'étape 2 "Adresse" devient active
  And l'étape 1 affiche une coche verte
```

---

## Références

- [Cucumber Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)
- [Writing Good Gherkin](https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/)
