# Cycle Complet d'une Intervention - Documentation Technique

## Vue d'ensemble

Cette documentation décrit le fonctionnement complet du cycle de vie d'une intervention dans l'application Seido, de la création à la finalisation administrative. Le système gère trois types d'utilisateurs principaux : **locataires**, **prestataires**, et **gestionnaires**.

## Architecture Technique

### Structure des Données

#### Tables Principales
- `interventions` : Données principales des interventions
- `users` : Utilisateurs du système (locataires, prestataires, gestionnaires)
- `teams` : Équipes de gestion
- `intervention_contacts` : Liens entre interventions et participants

#### Tables de Disponibilités
- `user_availabilities` : Créneaux disponibles des utilisateurs
- `availability_matches` : Résultats de matching des créneaux

#### Tables de Clôture Professionnelle
- `intervention_work_completions` : Rapports de fin de travaux (prestataires)
- `intervention_tenant_validations` : Validations locataires
- `intervention_manager_finalizations` : Finalisations gestionnaires

### Storage des Fichiers
- **Bucket Supabase** : `intervention-documents`
- **Structure** : `interventions/{intervention_id}/{timestamp}-{random}-{filename}`
- **Types de documents** : `photo_avant`, `photo_apres`, `rapport`, `facture`, `devis`, `plan`, `certificat`, `garantie`, `autre`
- **Table métadonnées** : `intervention_documents`

## Cycle de Vie Détaillé

### 1. Création d'Intervention

**Déclenché par** : Locataire ou Gestionnaire
**Statut initial** : `en_attente_de_creneau`

#### Processus Technique
1. **API** : `POST /api/create-intervention`
2. **Validation** : Données requises, permissions utilisateur
3. **Base de données** :
   ```sql
   INSERT INTO interventions (title, description, tenant_id, team_id, status, ...)
   INSERT INTO user_availabilities (user_id, intervention_id, date, start_time, end_time)
   ```
4. **Notifications** : Envoi aux gestionnaires et prestataires concernés

#### Fichiers Impliqués
- `app/api/create-intervention/route.ts`
- `components/intervention/create-intervention-form.tsx`
- `lib/database-service.ts`
- `lib/notification-service.ts`

### 2. Gestion des Disponibilités

**Déclenché par** : Demande de créneaux aux participants
**Statut** : `en_attente_de_creneau`

#### Processus de Matching
1. **Collecte** : Chaque participant soumet ses créneaux disponibles
2. **API de sauvegarde** : `POST /api/intervention/[id]/user-availability`
3. **Algorithme de matching** : `POST /api/intervention/[id]/match-availabilities`
   - Utilise un algorithme de "sweep line" pour détecter les chevauchements
   - Calcule des scores de qualité pour chaque match
   - Retourne : matches parfaits, partiels, suggestions, conflits

#### Types de Résultats
```typescript
interface MatchResult {
  perfectMatches: TimeSlot[]     // Créneaux où tous sont disponibles
  partialMatches: PartialMatch[] // Créneaux avec quelques participants
  suggestions: Suggestion[]      // Alternatives proposées
  conflicts: Conflict[]          // Problèmes détectés
}
```

#### Fichiers Impliqués
- `app/api/intervention/[id]/user-availability/route.ts`
- `app/api/intervention/[id]/match-availabilities/route.ts`
- `components/intervention/availability-coordinator.tsx`
- `hooks/use-availability-matching.ts`

### 3. Sélection du Créneau Final

**Déclenché par** : Gestionnaire ou système automatique
**Transition** : `en_attente_de_creneau` → `planifiee`

#### Processus Technique
1. **API** : `POST /api/intervention/[id]/select-slot`
2. **Validation** : Vérification que le créneau est valide
3. **Mise à jour** :
   ```sql
   UPDATE interventions
   SET status = 'planifiee',
       scheduled_date = ?,
       scheduled_start_time = ?,
       scheduled_end_time = ?
   ```
4. **Notifications** : Confirmation à tous les participants

### 4. Exécution de l'Intervention

**Transition manuelle** : `planifiee` → `en_cours`

#### Processus
- Déclenchement par le gestionnaire ou prestataire
- Notification de début d'intervention
- Suivi en temps réel possible

### 5. Clôture par le Prestataire

**Déclenché par** : Prestataire assigné
**Transition** : `en_cours` → `cloturee_par_prestataire`

#### Interface de Rapport de Fin de Travaux
**Composant** : `WorkCompletionReport`

##### Données Collectées
```typescript
interface WorkCompletionData {
  workSummary: string           // Résumé des travaux
  workDetails: string           // Détails techniques
  materialsUsed?: string        // Matériaux utilisés
  actualDurationHours: number   // Durée réelle
  actualCost?: number          // Coût réel
  issuesEncountered?: string   // Problèmes rencontrés
  recommendations?: string     // Recommandations

  // Fichiers
  beforePhotos: UploadedFile[] // Photos avant
  afterPhotos: UploadedFile[]  // Photos après
  documents: UploadedFile[]    // Documents techniques

  // Assurance qualité
  qualityAssurance: {
    workCompleted: boolean      // Travaux terminés
    areaClean: boolean         // Zone nettoyée
    clientInformed: boolean    // Client informé
    warrantyGiven: boolean     // Garantie donnée
  }
}
```

#### Processus Technique
1. **Upload des fichiers** : `POST /api/intervention/[id]/upload-file`
2. **Soumission du rapport** : `POST /api/intervention/[id]/work-completion`
3. **Validation** : Tous les points QA doivent être cochés
4. **Base de données** :
   ```sql
   INSERT INTO intervention_work_completions (...)
   UPDATE interventions SET status = 'cloturee_par_prestataire'
   ```
5. **Notifications** : Locataire et gestionnaires informés

#### Fichiers Impliqués
- `components/intervention/work-completion-report.tsx`
- `app/api/intervention/[id]/work-completion/route.ts`
- `hooks/use-file-upload.ts`
- `components/ui/file-upload.tsx`

### 6. Validation par le Locataire

**Déclenché par** : Locataire concerné
**Transition** : `cloturee_par_prestataire` → `cloturee_par_locataire` ou `contestee`

#### Interface de Validation
**Composant** : `TenantValidationForm`

##### Modes de Validation
1. **Approbation** (`approve`)
   ```typescript
   interface ApprovalData {
     satisfaction: {
       workQuality: number      // Note 1-5 étoiles
       timeliness: number       // Respect des délais
       cleanliness: number      // Propreté
       communication: number    // Communication
       overall: number          // Satisfaction globale
     }
     workApproval: {
       workCompleted: boolean   // Travaux terminés
       workQuality: boolean     // Qualité acceptable
       areaClean: boolean      // Zone propre
       instructionsFollowed: boolean // Instructions suivies
     }
     recommendProvider: boolean // Recommandation prestataire
   }
   ```

2. **Contestation** (`contest`)
   ```typescript
   interface ContestData {
     issues: {
       description: string      // Description du problème
       severity: 'low' | 'medium' | 'high'
       photos: UploadedFile[]   // Photos du problème
     }
   }
   ```

#### Processus Technique
1. **Validation des données** : Selon le type (approve/contest)
2. **API** : `POST /api/intervention/[id]/tenant-validation`
3. **Base de données** :
   ```sql
   INSERT INTO intervention_tenant_validations (...)
   UPDATE interventions SET status = ?
   ```
4. **Notifications** : Gestionnaires et prestataires informés

### 7. Finalisation Administrative

**Déclenché par** : Gestionnaire
**Prérequis** : Statut `cloturee_par_locataire` ou `contestee`
**Transition finale** : → `cloturee_par_gestionnaire`, `archived_with_issues`, ou `cancelled`

#### Interface de Finalisation
**Composant** : `ManagerFinalizationForm`

##### Données Collectées
```typescript
interface FinalizationData {
  finalStatus: 'completed' | 'archived_with_issues' | 'cancelled'
  adminComments: string

  // Contrôles qualité
  qualityControl: {
    proceduresFollowed: boolean     // Procédures suivies
    documentationComplete: boolean  // Documentation complète
    clientSatisfied: boolean       // Client satisfait
    costsVerified: boolean         // Coûts vérifiés
    warrantyDocumented: boolean    // Garantie documentée
  }

  // Résumé financier
  financialSummary: {
    finalCost: number              // Coût final
    budgetVariance: number         // Écart budgétaire (%)
    costJustification?: string     // Justification si écart > 20%
    paymentStatus: string          // Statut paiement
  }

  // Documentation
  documentation: {
    completionCertificate: boolean // Certificat de fin
    warrantyDocuments: boolean     // Documents garantie
    invoiceGenerated: boolean      // Facture générée
    clientSignOff: boolean         // Validation client
  }

  // Archivage
  archivalData: {
    category: string               // Catégorie d'archivage
    keywords: string[]             // Mots-clés recherche
    retentionPeriod: number        // Période de rétention
    accessLevel: string            // Niveau d'accès
  }

  // Actions de suivi
  followUpActions: {
    warrantyReminder?: Date        // Rappel garantie
    maintenanceSchedule?: Date     // Maintenance préventive
    feedbackRequest?: boolean      // Demande feedback
  }

  additionalDocuments: UploadedFile[] // Documents supplémentaires
}
```

#### Validations Requises
- Tous les contrôles qualité doivent être validés
- Tous les documents doivent être confirmés
- Justification obligatoire si variance budgétaire > 20%
- Coût final positif

#### Processus Technique
1. **Validation complète** des données
2. **API** : `POST /api/intervention/[id]/manager-finalization`
3. **Base de données** :
   ```sql
   INSERT INTO intervention_manager_finalizations (...)
   UPDATE interventions SET
     status = ?,
     final_cost = ?,
     finalized_at = NOW()
   ```
4. **Notifications finales** : Tous les participants informés
5. **Planification des suivis** : Actions programmées

## Système de Gestion des Fichiers

### Architecture Storage Existante

#### API d'Upload
**Fichier** : `app/api/upload-intervention-document/route.ts`

##### Fonctionnalités
- Upload sécurisé vers bucket `intervention-documents`
- Validation automatique des permissions (membres d'équipe)
- Génération de noms de fichiers uniques : `{timestamp}-{random}-{filename}`
- Détection intelligente du type de document selon nom et MIME type
- Stockage des métadonnées en base dans `intervention_documents`
- Nettoyage automatique en cas d'erreur

#### Base de Données
**Table** : `intervention_documents`
- `intervention_id` : Référence intervention
- `filename` : Nom de fichier généré
- `original_filename` : Nom original
- `storage_path` : Chemin dans le bucket
- `document_type` : Type détecté automatiquement
- `uploaded_by` : Utilisateur ayant uploadé

#### Politiques de Sécurité
- **Upload** : Membres de l'équipe de l'intervention uniquement
- **Accès** : Via query avec vérification des permissions
- **Types autorisés** : Images et documents standards

#### Types de Documents Intelligents
- **Photos** : `photo_avant`, `photo_apres` (détection par nom de fichier)
- **Documents** : `rapport`, `facture`, `devis`, `plan`, `certificat`, `garantie`
- **Fallback** : `autre` pour les types non reconnus

### Usage dans les Interfaces
- Upload déjà implémenté dans les pages création d'intervention
- Logique de gestion des fichiers intégrée dans les formulaires existants

## Système de Notifications

### Types de Notifications
1. **Intervention créée** → Gestionnaires et prestataires
2. **Créneaux demandés** → Participants concernés
3. **Créneau sélectionné** → Tous les participants
4. **Intervention démarrée** → Tous les participants
5. **Travaux terminés** → Locataire (priorité haute)
6. **Validation reçue** → Gestionnaires et prestataires
7. **Contestation signalée** → Gestionnaires (priorité haute)
8. **Intervention finalisée** → Tous les participants

### Métadonnées des Notifications
```typescript
interface NotificationMetadata {
  interventionId: string
  interventionTitle: string
  actionRequired?: string        // Action attendue
  priority: 'low' | 'normal' | 'high'
  relatedEntityType: 'intervention'
  relatedEntityId: string
}
```

## Composants d'Interface

### Panel d'Actions d'Intervention
**Fichier** : `components/intervention/intervention-action-panel.tsx`

#### Fonctionnalités
- Affichage conditionnel selon statut et rôle utilisateur
- Boutons d'action contextuelle
- Modales intégrées pour les formulaires de clôture
- Gestion d'état pour les interactions

### Composants de Clôture
1. **WorkCompletionReport** : Interface prestataire complète
2. **TenantValidationForm** : Validation/contestation locataire
3. **ManagerFinalizationForm** : Finalisation administrative

### Composants Utilitaires
1. **FileUpload** : Upload de fichiers réutilisable
2. **AvailabilityCoordinator** : Gestion des créneaux
3. **InterventionDetails** : Affichage des informations

## API Endpoints

### Gestion du Cycle
- `POST /api/create-intervention` : Création intervention
- `POST /api/intervention/[id]/user-availability` : Sauvegarde créneaux
- `POST /api/intervention/[id]/match-availabilities` : Matching créneaux
- `POST /api/intervention/[id]/select-slot` : Sélection créneau final

### Clôture Professionnelle
- `POST /api/intervention/[id]/work-completion` : Rapport prestataire
- `POST /api/intervention/[id]/tenant-validation` : Validation locataire
- `POST /api/intervention/[id]/manager-finalization` : Finalisation gestionnaire

### Gestion des Fichiers
- `POST /api/upload-intervention-document` : Upload fichier existant

### Consultation
- `GET /api/intervention/[id]/availabilities` : Vue d'ensemble créneaux

## Statuts d'Intervention

### Flux Normal
1. `en_attente_de_creneau` : Création → Collecte disponibilités
2. `planifiee` : Créneau sélectionné → Attente exécution
3. `en_cours` : Intervention en cours → Travaux actifs
4. `cloturee_par_prestataire` : Rapport soumis → Attente validation
5. `cloturee_par_locataire` : Travaux validés → Attente finalisation
6. `cloturee_par_gestionnaire` : Finalisation complète ✅

### Flux Alternatifs
- `contestee` : Problème signalé par locataire
- `archived_with_issues` : Archivage avec problèmes non résolus
- `cancelled` : Intervention annulée

## Migrations de Base de Données

### Ordre d'Application
1. `20250913000000_initialize_clean_schema.sql` : Schéma initial (inclut storage)
2. `20250920000000_add_user_availabilities.sql` : Tables de disponibilités
3. `20250920000001_add_closure_tables.sql` : Tables de clôture

### Commandes
```bash
# Application des migrations
npx supabase db push

# Vérification
npx supabase db diff
```

## Sécurité et Permissions

### Row Level Security (RLS)
- **Activé** sur toutes les tables sensibles
- **Politiques** basées sur les rôles et appartenances
- **Isolation** des données par équipe et intervention

### Validation des Données
- **Côté client** : Validation immédiate UX
- **Côté serveur** : Validation sécurisée obligatoire
- **Base de données** : Contraintes et triggers

### Gestion des Erreurs
- **Logs structurés** avec contexte
- **Messages utilisateur** localisés
- **Récupération gracieuse** des erreurs

## Performance et Optimisation

### Indexation
- **Requêtes fréquentes** indexées
- **Recherche temporelle** optimisée
- **Jointures** efficaces

### Cache et Storage
- **URLs publiques** cachées
- **Fichiers** avec headers de cache
- **Requêtes** optimisées

## Tests et Qualité

### Points de Test Recommandés
1. **Création intervention** avec disponibilités
2. **Algorithme de matching** avec cas complexes
3. **Upload de fichiers** avec validation
4. **Workflow complet** de clôture
5. **Permissions** et sécurité
6. **Notifications** en cascade

### Validation de Qualité
- **TypeScript** strict activé
- **Validation** des schémas de données
- **Tests d'intégration** des APIs
- **Tests de sécurité** RLS

## Déploiement et Monitoring

### Checklist de Déploiement
- [ ] Migrations appliquées
- [ ] Buckets storage configurés
- [ ] Variables d'environnement
- [ ] Permissions RLS vérifiées
- [ ] Tests de bout en bout

### Monitoring
- **Logs d'erreur** centralisés
- **Métriques** d'utilisation
- **Performance** des requêtes
- **Utilisation storage** surveillée

---

## Conclusion

Ce système fournit une gestion complète et professionnelle du cycle de vie des interventions, avec une interface intuitive pour chaque type d'utilisateur, une sécurité robuste, et une architecture scalable. La documentation technique permet une maintenance et évolution facilitées du système.