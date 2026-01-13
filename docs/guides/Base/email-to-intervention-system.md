# Système de Conversion Email vers Intervention

## Vue d'ensemble

Cette fonctionnalité permet de transformer automatiquement les emails reçus sur les alias d'équipes (ex: `mon-agence@seido-app.com`) en demandes d'intervention dans l'application Seido.

**Objectif** : Simplifier la création d'interventions en permettant aux locataires/contacts d'envoyer directement un email à l'équipe gestionnaire sans passer par l'interface web.

## Architecture du système

```
Email entrant → Google Workspace → Webhook → API Seido → Base de données → Notification
```

## Étapes détaillées d'implémentation

### 1. Configuration Google Workspace

#### 1.1 Création du compte principal
- **Action** : Créer `gestionnaire@seido-app.com` sur Google Workspace
- **Pourquoi** : C'est le compte maître qui recevra tous les emails des alias. Avoir un compte dédié permet de séparer cette fonctionnalité du système principal et facilite la gestion des permissions.

#### 1.2 Configuration des alias d'équipes
- **Action** : Créer des alias comme `mon-agence@seido-app.com`, `agence-paris@seido-app.com`, etc.
- **Configuration** : Tous les alias redirigent vers `gestionnaire@seido-app.com`
- **Pourquoi** : Les alias permettent d'avoir des adresses personnalisées par équipe tout en centralisant la réception sur un seul compte. Cela simplifie la gestion technique.

#### 1.3 Configuration Gmail API
- **Action** : Activer Gmail API dans Google Cloud Console
- **Permissions nécessaires** : 
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.modify`
- **Pourquoi** : L'API Gmail permet de lire programmatiquement les emails entrants et de les marquer comme traités.

### 2. Configuration du webhook Gmail

#### 2.1 Mise en place de Gmail Push Notifications
- **Action** : Configurer Google Cloud Pub/Sub pour recevoir les notifications d'emails
- **Endpoint** : Créer un topic Pub/Sub qui notifiera notre API à chaque nouvel email
- **Pourquoi** : Plutôt que de vérifier périodiquement s'il y a de nouveaux emails (polling), le système push nous notifie instantanément. C'est plus efficace et réactif.

#### 2.2 Configuration du webhook endpoint
- **Action** : Créer une route API `/api/email-webhook` dans l'application
- **Sécurité** : Vérifier la signature Google pour s'assurer que les requêtes viennent bien de Google
- **Pourquoi** : Ce endpoint recevra les notifications de nouveaux emails et déclenchera le traitement.

### 3. Développement du service de traitement d'emails

#### 3.1 Service de récupération des emails
```typescript
// Pseudo-code du service
class EmailProcessingService {
  async processNewEmail(messageId: string) {
    // Récupérer l'email complet via Gmail API
    // Parser le contenu et les métadonnées
    // Identifier l'équipe destinataire
    // Extraire les informations pour créer l'intervention
  }
}
```

- **Pourquoi** : Centraliser la logique de traitement permet une maintenance plus facile et une évolutivité du système.

#### 3.2 Parser de contenu email
- **Action** : Créer un système pour extraire :
  - L'expéditeur (email + nom)
  - Le sujet (titre de l'intervention)
  - Le corps du message (description)
  - Les pièces jointes éventuelles
  - L'alias destinataire (pour identifier l'équipe)

- **Pourquoi** : Structurer ces données permet de créer des interventions cohérentes avec toutes les informations nécessaires.

#### 3.3 Système de correspondance équipe/alias
- **Action** : Créer une table `team_email_aliases` dans la base de données
```sql
CREATE TABLE team_email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  email_alias VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- **Pourquoi** : Cette table fait le lien entre les alias emails et les équipes dans l'application, permettant de router correctement chaque email vers la bonne équipe.

### 4. Création automatique d'interventions

#### 4.1 Service de création d'intervention
- **Action** : Adapter le service existant `InterventionActionsService` pour accepter les données d'email
- **Logique** :
  1. Vérifier si l'expéditeur existe dans les contacts
  2. Si non, créer un nouveau contact
  3. Déterminer le logement (si mentionné dans l'email ou via l'historique du contact)
  4. Créer l'intervention avec le statut "En attente de validation"
  5. Associer les fichiers attachés à l'intervention

- **Pourquoi** : Réutiliser le service existant garantit la cohérence avec les interventions créées manuellement et évite la duplication de code.

#### 4.2 Gestion des contacts inconnus
- **Action** : Créer automatiquement un contact avec les informations de l'email
- **Données** : Email, nom (si disponible), statut "À vérifier"
- **Pourquoi** : Permet de ne pas perdre les demandes même si le contact n'est pas encore enregistré dans le système.

#### 4.3 Gestion des logements
- **Stratégies** :
  1. Parser l'email pour des mentions d'adresse/appartement
  2. Historique des interventions précédentes du contact
  3. Par défaut, laisser vide et demander à l'équipe de compléter

- **Pourquoi** : Le logement est crucial pour une intervention, ces stratégies permettent de l'identifier automatiquement quand c'est possible.

### 5. Système de notifications

#### 5.1 Notification en temps réel
- **Action** : Utiliser le système de notifications existant pour alerter l'équipe
- **Canaux** : Notification dans l'app + email de confirmation
- **Pourquoi** : L'équipe doit être immédiatement informée qu'une nouvelle intervention a été créée automatiquement.

#### 5.2 Email de confirmation à l'expéditeur
- **Action** : Envoyer un email automatique confirmant la réception
- **Contenu** : 
  - Numéro de l'intervention créée
  - Délai de traitement estimé
  - Contact de l'équipe pour un suivi
- **Pourquoi** : Cela rassure l'expéditeur que sa demande a bien été prise en compte et lui donne un numéro de référence.

### 6. Interface d'administration

#### 6.1 Gestion des alias d'équipes
- **Action** : Ajouter une section dans les paramètres d'équipe pour :
  - Voir l'alias email actuel
  - Modifier l'alias (si autorisé)
  - Historique des emails reçus
  - Statistiques de conversion email → intervention

- **Pourquoi** : Les gestionnaires doivent pouvoir administrer cette fonctionnalité sans intervention technique.

#### 6.2 Dashboard des emails traités
- **Action** : Créer une page listant :
  - Emails reçus récemment
  - Status de traitement (succès/échec)
  - Interventions créées automatiquement
  - Emails rejetés avec raisons

- **Pourquoi** : Permet de monitorer le bon fonctionnement du système et d'identifier les problèmes.

### 7. Gestion des erreurs et cas particuliers

#### 7.1 Emails malformés ou spam
- **Action** : Implémenter des filtres pour :
  - Vérifier la validité de l'email
  - Détecter les spams potentiels
  - Gérer les bounces/erreurs de delivery

- **Pourquoi** : Éviter de polluer le système avec des interventions non valides.

#### 7.2 Doublons
- **Action** : Système de détection basé sur :
  - Email expéditeur + sujet + plage temporelle
  - Hash du contenu de l'email
- **Traitement** : Ignorer ou regrouper avec l'intervention existante

- **Pourquoi** : Un utilisateur pourrait renvoyer le même email par erreur ou impatience.

#### 7.3 Logs et monitoring
- **Action** : Logger toutes les étapes du processus
- **Métriques** : 
  - Emails reçus vs traités avec succès
  - Temps de traitement moyen
  - Taux d'erreur par type

- **Pourquoi** : Essentiel pour maintenir et améliorer le système en production.

## Sécurité et conformité

### 8.1 Protection des données
- **RGPD** : S'assurer que les emails traités respectent les règles de protection des données
- **Chiffrement** : Chiffrer le stockage temporaire des emails pendant le traitement
- **Retention** : Définir une politique de conservation des emails traités

### 8.2 Authentification et autorisation
- **Google API** : Utiliser OAuth 2.0 avec les scopes minimums nécessaires
- **Webhook** : Vérifier systématiquement la signature des requêtes entrantes
- **Rate limiting** : Limiter le nombre de requêtes pour éviter les abus

## Phases de déploiement

### Phase 1 : Fondations (Semaine 1-2)
- Configuration Google Workspace
- Mise en place de l'API Gmail
- Configuration du webhook basique

### Phase 2 : Traitement des emails (Semaine 3-4)
- Service de parsing des emails
- Création automatique d'interventions
- Tests avec quelques alias

### Phase 3 : Interface et monitoring (Semaine 5-6)
- Dashboard d'administration
- Système de notifications
- Logs et métriques

### Phase 4 : Optimisation et production (Semaine 7-8)
- Gestion des cas d'erreur
- Optimisation des performances
- Déploiement progressif par équipes

## Technologies requises

- **Google Workspace API** : Gestion des emails
- **Google Cloud Pub/Sub** : Notifications push
- **Next.js API Routes** : Endpoints pour les webhooks
- **Supabase Functions** : Traitement asynchrone des emails
- **Nouvelles tables DB** : team_email_aliases, email_processing_logs
- **Service de parsing** : Extraction des données d'email

## Coût estimé

- **Google Workspace** : ~6€/mois pour le compte gestionnaire
- **Google Cloud Pub/Sub** : ~0.50€/mois (estimation pour volume moyen)
- **Développement** : ~40-50 heures de développement

Cette architecture modulaire permet un déploiement progressif et une maintenance facilitée tout en gardant une séparation claire des responsabilités entre les différents composants du système.
