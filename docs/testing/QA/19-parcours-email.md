# Parcours E2E Email/Mail - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Rôle principal** : Gestionnaire
> **Priorité** : P1 - Important
> **Scénarios Gherkin** : 32
> **Durée estimée** : 1h30-2h

---

## Vue d'ensemble

Ce document décrit les parcours End-to-End de la fonctionnalité Email/Mail de SEIDO. Cette fonctionnalité permet aux gestionnaires de gérer les emails liés à leurs immeubles directement depuis l'application.

### Architecture Technique

| Composant | Fichier | Fonction |
|-----------|---------|----------|
| Page principale | `app/gestionnaire/(with-navbar)/mail/page.tsx` | Interface 3 panneaux |
| Sidebar | `components/mailbox-sidebar.tsx` | Navigation dossiers |
| Liste emails | `components/email-list.tsx` | Liste avec pagination |
| Détail email | `components/email-detail.tsx` | Affichage et actions |
| Real-time | `hooks/use-realtime-emails-v2.ts` | Sync temps réel |

### Fonctionnalités Clés

- **Dossiers** : Boîte de réception, Envoyés, Brouillons, Archives
- **Actions** : Répondre, Archiver, Supprimer, Lier à immeuble
- **Filtres** : Par immeuble, Par étiquette (Urgent, Intervention)
- **Real-time** : Nouveaux emails via Supabase Realtime
- **Conversations** : Groupement par thread

---

## Préconditions Globales

### Données Requises

```yaml
Utilisateur:
  - Gestionnaire connecté avec compte: gestionnaire@test-seido.fr
  - Team ID valide
  - Email connection configurée (email_connections table)

Emails de test:
  - Au moins 10 emails dans inbox
  - Au moins 3 emails envoyés
  - Au moins 1 email archivé
  - Au moins 1 conversation (2+ emails liés)

Immeubles:
  - Au moins 2 immeubles avec lots
  - Au moins 1 email lié à un immeuble
```

### État Initial

```
☐ Utilisateur connecté en tant que Gestionnaire
☐ Page /gestionnaire/mail accessible
☐ Email connection active (IMAP/SMTP configuré)
☐ Supabase Realtime connecté
```

---

## Feature 1 : Navigation et Dossiers

### Scenario 1.1 : Accéder à la page Email

```gherkin
Feature: Navigation Email

  Scenario: Accéder à la page Email depuis le dashboard
    Given je suis connecté en tant que Gestionnaire
    And je suis sur le dashboard
    When je clique sur "Emails" dans la navigation
    Then je suis redirigé vers /gestionnaire/mail
    And la page Email se charge en moins de 3 secondes
    And le panneau latéral des dossiers est visible
    And la liste des emails est affichée
    And le premier email est sélectionné automatiquement
```

### Scenario 1.2 : Naviguer entre les dossiers

```gherkin
  Scenario: Changer de dossier
    Given je suis sur la page Email
    And le dossier "Boîte de réception" est actif
    When je clique sur "Envoyés" dans le panneau latéral
    Then le dossier "Envoyés" devient actif (fond secondaire)
    And la liste affiche uniquement les emails envoyés
    And le compteur des emails se met à jour

  Scenario: Voir le compteur des emails non lus
    Given je suis sur la page Email
    And j'ai 5 emails non lus dans ma boîte de réception
    Then un badge "5" est affiché à côté de "Boîte de réception"
    And le badge est de couleur primaire (bleu)
```

### Scenario 1.3 : Filtrer par immeuble

```gherkin
  Scenario: Filtrer les emails par immeuble
    Given je suis sur la page Email
    And j'ai des emails liés à l'immeuble "Résidence Lumière"
    When je clique sur "Résidence Lumière" dans la section Immeubles
    Then seuls les emails liés à cet immeuble sont affichés
    And le nom de l'immeuble est affiché dans le header de la liste
```

### Scenario 1.4 : Filtrer par étiquette

```gherkin
  Scenario: Afficher les emails urgents
    Given je suis sur la page Email
    When je clique sur "Urgent" dans la section Étiquettes
    Then seuls les emails marqués comme urgents sont affichés
    And chaque email affiche une icône étoile jaune
```

---

## Feature 2 : Liste des Emails

### Scenario 2.1 : Afficher la liste des emails

```gherkin
Feature: Liste des Emails

  Scenario: Afficher la liste des emails
    Given je suis sur la page Email
    And j'ai 10 emails dans ma boîte de réception
    Then 10 emails sont listés
    And chaque email affiche:
      | Champ | Visible |
      | Nom expéditeur | Oui |
      | Sujet | Oui |
      | Extrait (snippet) | Oui |
      | Date/heure | Oui |
      | Icône pièce jointe (si applicable) | Oui |
    And les emails non lus ont un style différent (gras)
```

### Scenario 2.2 : Sélectionner un email

```gherkin
  Scenario: Sélectionner un email dans la liste
    Given je suis sur la page Email
    And la liste contient plusieurs emails
    When je clique sur un email
    Then l'email est marqué comme sélectionné (surbrillance)
    And le panneau de détail affiche le contenu de l'email
    And l'email est automatiquement marqué comme lu
```

### Scenario 2.3 : Pagination (Load More)

```gherkin
  Scenario: Charger plus d'emails
    Given je suis sur la page Email
    And j'ai 100 emails dans ma boîte
    And 50 emails sont affichés (limite par défaut)
    When je scroll jusqu'en bas de la liste
    And je clique sur "Charger plus"
    Then 50 emails supplémentaires sont chargés
    And le total affiché est 100 emails
    And le bouton "Charger plus" disparaît
```

### Scenario 2.4 : Conversations groupées

```gherkin
  Scenario: Afficher une conversation groupée
    Given je suis sur la page Email
    And j'ai une conversation de 3 emails (1 parent + 2 réponses)
    Then la conversation est affichée comme un seul item
    And un indicateur "3" montre le nombre de messages
    When je clique sur la conversation
    Then le thread complet est affiché dans le panneau de détail
```

---

## Feature 3 : Détail de l'Email

### Scenario 3.1 : Afficher le détail d'un email

```gherkin
Feature: Détail Email

  Scenario: Afficher le contenu complet d'un email
    Given je suis sur la page Email
    When je sélectionne un email
    Then le panneau de détail affiche:
      | Élément | Contenu |
      | Expéditeur | Nom + adresse email |
      | Destinataire | Adresse email |
      | Sujet | Texte complet |
      | Date | Format relatif (il y a 2h) ou absolu |
      | Corps | HTML rendu ou texte brut |
    And les liens dans le corps sont cliquables
    And les images sont affichées (si présentes)
```

### Scenario 3.2 : Afficher les pièces jointes

```gherkin
  Scenario: Afficher les pièces jointes
    Given je suis sur la page Email
    And je sélectionne un email avec 2 pièces jointes
    Then la section "Pièces jointes" est visible
    And chaque pièce jointe affiche:
      | Champ | Exemple |
      | Nom du fichier | "document.pdf" |
      | Taille | "1.2 MB" |
      | Type | Icône selon mime type |
    When je clique sur une pièce jointe
    Then le fichier se télécharge
```

### Scenario 3.3 : Afficher l'immeuble lié

```gherkin
  Scenario: Afficher l'immeuble lié à l'email
    Given je suis sur la page Email
    And je sélectionne un email lié à "Résidence Lumière"
    Then un badge "Résidence Lumière" est affiché
    When je clique sur le badge
    Then je suis redirigé vers la page de l'immeuble
```

---

## Feature 4 : Actions sur les Emails

### Scenario 4.1 : Répondre à un email

```gherkin
Feature: Actions Email

  Scenario: Répondre à un email
    Given je suis sur la page Email
    And je sélectionne un email
    When je clique sur le bouton "Répondre"
    Then un éditeur de réponse s'ouvre
    And le sujet est pré-rempli avec "Re: [sujet original]"
    And le destinataire est pré-rempli avec l'expéditeur
    When je tape "Merci pour votre message"
    And je clique sur "Envoyer"
    Then un toast "Réponse envoyée" s'affiche
    And l'email de réponse apparaît dans "Envoyés"
```

### Scenario 4.2 : Archiver un email

```gherkin
  Scenario: Archiver un email
    Given je suis sur la page Email
    And je sélectionne un email dans la boîte de réception
    When je clique sur le bouton "Archiver"
    Then un toast "Email archivé" s'affiche
    And l'email disparaît de la boîte de réception
    And l'email est visible dans le dossier "Archives"
    And le compteur de la boîte de réception diminue de 1
```

### Scenario 4.3 : Supprimer un email

```gherkin
  Scenario: Supprimer un email
    Given je suis sur la page Email
    And je sélectionne un email
    When je clique sur le bouton "Supprimer"
    Then une confirmation s'affiche (optionnel)
    When je confirme la suppression
    Then un toast "Email supprimé" s'affiche
    And l'email disparaît de la liste
    And l'email suivant est automatiquement sélectionné
```

### Scenario 4.4 : Lier un email à un immeuble

```gherkin
  Scenario: Lier un email à un immeuble
    Given je suis sur la page Email
    And je sélectionne un email non lié
    When je clique sur "Lier à un immeuble"
    Then un dropdown avec la liste des immeubles s'affiche
    When je sélectionne "Résidence Lumière"
    Then un toast "Lié à l'immeuble" s'affiche
    And un badge "Résidence Lumière" apparaît sur l'email
    And l'email est visible dans le filtre "Résidence Lumière"
```

### Scenario 4.5 : Créer une intervention depuis un email

```gherkin
  Scenario: Créer une intervention depuis un email
    Given je suis sur la page Email
    And je sélectionne un email lié à un immeuble
    When je clique sur "Créer intervention"
    Then le formulaire de création d'intervention s'ouvre
    And l'immeuble est pré-rempli
    And le titre est pré-rempli avec le sujet de l'email
    And la description contient un extrait du corps de l'email
```

### Scenario 4.6 : Marquer comme traité

```gherkin
  Scenario: Marquer un email comme traité
    Given je suis sur la page Email
    And je sélectionne un email non traité
    When je clique sur "Marquer comme traité"
    Then un toast "Marqué comme traité" s'affiche
    And l'email est visuellement marqué (icône check ou style différent)
```

### Scenario 4.7 : Bloquer un expéditeur (Blacklist)

```gherkin
  Scenario: Bloquer un expéditeur
    Given je suis sur la page Email
    And je sélectionne un email de spam
    When je clique sur "Bloquer l'expéditeur"
    Then une confirmation s'affiche
    And je peux entrer une raison (optionnel)
    When je confirme le blocage
    Then un toast "Expéditeur bloqué" s'affiche
    And les futurs emails de cet expéditeur seront masqués
```

---

## Feature 5 : Synchronisation et Real-time

### Scenario 5.1 : Synchroniser manuellement

```gherkin
Feature: Synchronisation Email

  Scenario: Synchroniser les emails manuellement
    Given je suis sur la page Email
    When je clique sur le bouton "Synchroniser"
    Then l'icône de synchronisation tourne (animation)
    And un toast "Synchronisation des emails..." s'affiche
    When la synchronisation est terminée
    Then un toast "Emails synchronisés" s'affiche
    And les nouveaux emails apparaissent en haut de la liste
    And les compteurs sont mis à jour
```

### Scenario 5.2 : Recevoir un email en temps réel

```gherkin
  Scenario: Recevoir un nouvel email en temps réel
    Given je suis sur la page Email
    And je suis sur le dossier "Boîte de réception"
    When un nouvel email arrive (via webhook Supabase)
    Then un toast "Nouvel email de [expéditeur]" s'affiche
    And le nouvel email apparaît en haut de la liste
    And le compteur d'emails non lus augmente de 1
    And l'animation d'apparition est fluide
```

### Scenario 5.3 : Connexion Realtime perdue

```gherkin
  Scenario: Reconnexion après perte de connexion
    Given je suis sur la page Email
    And la connexion Realtime est établie
    When la connexion est perdue (simuler offline)
    Then un indicateur de déconnexion apparaît (badge orange)
    When la connexion est rétablie
    Then l'indicateur disparaît
    And les emails manqués sont synchronisés
```

---

## Feature 6 : Rédaction d'Email

### Scenario 6.1 : Ouvrir le compositeur

```gherkin
Feature: Rédaction Email

  Scenario: Ouvrir le compositeur d'email
    Given je suis sur la page Email
    When je clique sur "Rédiger"
    Then un modal de composition s'ouvre
    And le champ "À" est vide et focusé
    And les champs suivants sont visibles:
      | Champ | Type |
      | À | Input email |
      | Cc | Input email (optionnel) |
      | Sujet | Input texte |
      | Corps | Éditeur riche |
```

### Scenario 6.2 : Envoyer un nouvel email

```gherkin
  Scenario: Envoyer un nouvel email
    Given le compositeur d'email est ouvert
    When je remplis les champs:
      | Champ | Valeur |
      | À | locataire@example.com |
      | Sujet | Rappel loyer |
      | Corps | Bonjour, ceci est un rappel. |
    And je clique sur "Envoyer"
    Then un toast "Email envoyé" s'affiche
    And le modal se ferme
    And l'email apparaît dans "Envoyés"
```

---

## Feature 7 : Accessibilité et Performance

### Scenario 7.1 : Navigation clavier

```gherkin
Feature: Accessibilité Email

  Scenario: Naviguer avec le clavier
    Given je suis sur la page Email
    When j'appuie sur Tab
    Then le focus se déplace vers le premier dossier
    When j'appuie sur Entrée
    Then le dossier est sélectionné
    When j'appuie sur Flèche Bas
    Then le focus se déplace vers l'email suivant
    When j'appuie sur Entrée
    Then l'email est sélectionné et affiché
```

### Scenario 7.2 : Raccourcis clavier

```gherkin
  Scenario: Utiliser les raccourcis clavier
    Given je suis sur la page Email
    And un email est sélectionné
    When j'appuie sur "R"
    Then le compositeur de réponse s'ouvre
    When j'appuie sur "A"
    Then l'email est archivé
    When j'appuie sur "Delete"
    Then la confirmation de suppression s'affiche
```

### Scenario 7.3 : Performance de chargement

```gherkin
  Scenario: Charger la page Email rapidement
    Given je suis connecté
    When je navigue vers /gestionnaire/mail
    Then la page se charge en moins de 3 secondes (LCP)
    And le premier email est affiché en moins de 1 seconde
    And le scroll de la liste est fluide (60 FPS)
```

---

## Cas Négatifs

### Scenario N1 : Aucun email

```gherkin
Feature: Cas Négatifs Email

  Scenario: Boîte de réception vide
    Given je suis sur la page Email
    And ma boîte de réception est vide
    Then un message "Aucun email" est affiché
    And une illustration (empty state) est visible
    And le panneau de détail affiche "Sélectionnez un email"
```

### Scenario N2 : Erreur de chargement

```gherkin
  Scenario: Erreur lors du chargement des emails
    Given je suis sur la page Email
    When le serveur retourne une erreur 500
    Then un toast "Échec du chargement des emails" s'affiche
    And un bouton "Réessayer" est visible
    When je clique sur "Réessayer"
    Then la requête est relancée
```

### Scenario N3 : Erreur d'envoi

```gherkin
  Scenario: Échec de l'envoi d'un email
    Given le compositeur d'email est ouvert
    And le serveur SMTP est indisponible
    When je clique sur "Envoyer"
    Then un toast "Échec de l'envoi de la réponse" s'affiche
    And le modal reste ouvert (draft préservé)
    And un bouton "Réessayer" est visible
```

### Scenario N4 : Email sans connexion configurée

```gherkin
  Scenario: Répondre sans connexion email
    Given je suis sur la page Email
    And l'email sélectionné n'a pas d'email_connection_id
    When je clique sur "Répondre"
    Then un toast "Impossible de répondre : Aucune connexion email associée" s'affiche
    And le compositeur ne s'ouvre pas
```

---

## Résumé d'Exécution

### Compteur de Scénarios

| Feature | Scénarios | Status |
|---------|-----------|--------|
| 1. Navigation/Dossiers | 4 | ☐ |
| 2. Liste Emails | 4 | ☐ |
| 3. Détail Email | 3 | ☐ |
| 4. Actions Email | 7 | ☐ |
| 5. Sync/Realtime | 3 | ☐ |
| 6. Rédaction | 2 | ☐ |
| 7. Accessibilité | 3 | ☐ |
| Cas Négatifs | 4 | ☐ |
| **TOTAL** | **32** | ☐ |

### Critères de Go/No-Go

| Résultat | Décision |
|----------|----------|
| **28/32 (87%)** | ✅ GO - Fonctionnalité stable |
| **24-27 (75-84%)** | ⚠️ WARNING - Corrections mineures requises |
| **< 24 (< 75%)** | ❌ NO-GO - Fonctionnalité instable |

---

## Références Techniques

### API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/emails` | GET | Liste des emails |
| `/api/emails/[id]` | GET | Détail email |
| `/api/emails/send` | POST | Envoyer email |
| `/api/emails/[id]/archive` | POST | Archiver |
| `/api/emails/[id]/delete` | DELETE | Supprimer |
| `/api/emails/sync` | POST | Sync manuelle |
| `/api/emails/counts` | GET | Compteurs dossiers |

### Types

```typescript
type EmailDirection = 'received' | 'sent'
type EmailStatus = 'unread' | 'read' | 'archived' | 'deleted'

interface MailboxEmail {
  id: string
  sender_email: string
  sender_name: string
  subject: string
  snippet: string
  body_html: string
  received_at: string
  is_read: boolean
  has_attachments: boolean
  building_id?: string
  conversation_id?: string
  direction: EmailDirection
  status: EmailStatus
}
```

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (32 scénarios) |

---

**Mainteneur** : Claude Code
**Scénarios** : 32 (28 core + 4 négatifs)
**Durée estimée** : 1h30-2h
