# Plan de Finalisation du Système d'Interventions

## Vue d'ensemble

Ce document détaille le plan étape par étape pour finaliser le système de gestion d'interventions conformément au workflow décrit dans `Intervention steps.md`. 

### État Actuel Analysé ✅

**✅ FONCTIONNALITÉS EXISTANTES :**

1. **Interfaces Utilisateur de Base**
   - Interface gestionnaire avec onglets (Toutes, Nouvelles, En cours, Terminées)
   - Interface locataire avec liste des interventions et création de demande
   - Interface prestataire avec onglets par statut

2. **Hooks de Gestion par Phase**
   - `use-intervention-approval` : Approbation/rejet par gestionnaire
   - `use-intervention-planning` : Planification et programmation
   - `use-intervention-execution` : Démarrage/annulation
   - `use-intervention-finalization` : Finalisation et paiement

3. **APIs Backend FONCTIONNELLES**
   - `create-intervention` : Création par locataire ✅
   - `create-manager-intervention` : Création par gestionnaire ✅
   - `upload-intervention-document` : Upload de fichiers ✅
   - `download-intervention-document` : Téléchargement de fichiers ✅
   - `view-intervention-document` : Visualisation de fichiers ✅

4. **Services Backend**
   - `interventionService` : CRUD complet avec notifications
   - `notificationService` : Système de notifications existant
   - Système de documents et storage Supabase opérationnel

5. **Composants et Modals**
   - Modals d'approbation, confirmation, succès, programmation
   - Composants de détails d'intervention
   - Upload et gestion de fichiers

**❌ ÉCARTS CRITIQUES IDENTIFIÉS :**

### 🚨 PROBLÈME MAJEUR : STATUTS NON ALIGNÉS

**Statuts actuels dans la DB :**
```sql
intervention_status: "nouvelle_demande" | "en_attente_validation" | "validee" | "en_cours" | "terminee" | "annulee"
```

**Statuts requis selon le workflow souhaité :**
```
demande → rejetee/approuvee → demande_de_devis → planification → 
planifiee → en_cours → cloturee_par_prestataire → cloturee_par_locataire → 
cloturee_par_gestionnaire → annulee
```

**➡️ 9 STATUTS MANQUANTS :**
- `demande` (remplace `nouvelle_demande`)
- `rejetee`
- `approuvee` 
- `demande_de_devis`
- `planification`
- `planifiee`
- `cloturee_par_prestataire`
- `cloturee_par_locataire` 
- `cloturee_par_gestionnaire`

### ❌ APIs D'ACTIONS MANQUANTES

**Actions simulées dans `intervention-actions-service.ts` :**
- `approveIntervention()` → console.log ❌
- `rejectIntervention()` → console.log ❌
- `programIntervention()` → console.log ❌
- `executeIntervention()` → console.log ❌
- `finalizeIntervention()` → console.log ❌

**APIs manquantes critiques :**
- `app/api/intervention-approve/route.ts` ❌
- `app/api/intervention-reject/route.ts` ❌
- `app/api/intervention-schedule/route.ts` ❌
- `app/api/intervention-start/route.ts` ❌
- `app/api/intervention-complete/route.ts` ❌
- `app/api/intervention-finalize/route.ts` ❌

### ❌ FONCTIONNALITÉS WORKFLOW MANQUANTES

#### Phase 1 : Demande
- ✅ Création de demande par locataire (fonctionnel)
- ✅ Upload de fichiers (fonctionnel)
- ✅ Disponibilités (interface présente, stockage à finaliser)
- ❌ **Approbation/Rejet** : Actions simulées (console.log)
- ❌ **Notifications** : Partiellement implémentées
- ❌ **Enrichissement après approbation** : Non connecté

#### Phase 2 : Planification & Exécution
- ❌ **Demande de devis (optionnel)** : Interface absente
- ❌ **Sélection prestataire** : Interface présente mais non fonctionnelle
- ❌ **Magic Links pour prestataires** : Non implémentés
- ❌ **Chat locataire ↔ prestataire** : Non implémenté
- ❌ **Collecte disponibilités (Doodle-like)** : Non implémenté
- ❌ **Notifications automatisées** : Non implémentées

#### Phase 3 : Clôture
- ❌ **Clôture par prestataire** : Interface partiellement présente
- ❌ **Validation par locataire** : Non implémenté
- ❌ **Finalisation par gestionnaire** : Interface présente, logique simulée
- ❌ **Masquage factures pour locataires** : Non implémenté

---

## Plan d'Implémentation RÉVISÉ

### ⚡ PHASE 0 : CORRECTION URGENTE DES STATUTS (1-2 jours)

#### 🎯 Étape 0.1 : Migration Base de Données
**Objectif** : Ajouter les statuts manquants à l'enum `intervention_status`

**Actions CRITIQUES :**
- [ ] **Créer migration** : `20241216_add_missing_intervention_statuses.sql`
```sql
-- Ajouter les nouveaux statuts à l'enum
ALTER TYPE intervention_status ADD VALUE 'demande';
ALTER TYPE intervention_status ADD VALUE 'rejetee';
ALTER TYPE intervention_status ADD VALUE 'approuvee';
ALTER TYPE intervention_status ADD VALUE 'demande_de_devis';
ALTER TYPE intervention_status ADD VALUE 'planification';
ALTER TYPE intervention_status ADD VALUE 'planifiee';
ALTER TYPE intervention_status ADD VALUE 'cloturee_par_prestataire';
ALTER TYPE intervention_status ADD VALUE 'cloturee_par_locataire';
ALTER TYPE intervention_status ADD VALUE 'cloturee_par_gestionnaire';

-- Optionnel : Migrer les données existantes
UPDATE interventions SET status = 'demande' WHERE status = 'nouvelle_demande';
UPDATE interventions SET status = 'approuvee' WHERE status = 'validee';
```

- [ ] **Mettre à jour `database.types.ts`** avec les nouveaux statuts
- [ ] **Mettre à jour `intervention-utils.ts`** avec les nouveaux mappings colors/labels

#### 🎯 Étape 0.2 : Mise à Jour des Interfaces
**Actions :**
- [ ] Mettre à jour les filtres d'onglets dans les pages interventions
- [ ] Réviser les groupements selon le nouveau workflow :
  - **Demandé** : `demande`, `approuvee`
  - **Exécution** : `demande_de_devis`, `planification`, `planifiee`, `en_cours`, `cloturee_par_prestataire`
  - **Clôturé** : `cloturee_par_locataire`, `cloturee_par_gestionnaire`, `annulee`, `rejetee`

### 🔥 PHASE 1 : APIs D'ACTIONS RÉELLES (3-5 jours)

#### Étape 1.1 : APIs d'Approbation/Rejet
**Objectif** : Remplacer les console.log par de vraies actions

**Actions :**
- [ ] **Créer `/api/intervention-approve/route.ts`**
  ```typescript
  // Changer statut demande → approuvee
  // Créer notification au locataire
  // Déclencher webhook/email optionnel
  ```

- [ ] **Créer `/api/intervention-reject/route.ts`**
  ```typescript  
  // Changer statut demande → rejetee
  // Enregistrer motif de rejet dans manager_comment
  // Créer notification au locataire avec motif
  ```

- [ ] **Connecter avec `use-intervention-approval`**
  - Remplacer les appels `console.log` par vrais appels fetch
  - Gestion d'erreurs robuste
  - Refresh des données après succès

#### Étape 1.2 : APIs de Planification
**Actions :**
- [ ] **Créer `/api/intervention-schedule/route.ts`**
  ```typescript
  // Gestion créneaux fixes vs proposés
  // Statut approuvee → planifiee (si créneau fixe)
  // Statut approuvee → planification (si créneaux à choisir)
  // Notifications aux parties prenantes
  ```

- [ ] **Créer `/api/intervention-quote-request/route.ts`** (optionnel)
  ```typescript
  // Statut approuvee → demande_de_devis
  // Envoi email/notification au prestataire
  // Génération Magic Link si nécessaire
  ```

#### Étape 1.3 : APIs d'Exécution
**Actions :**
- [ ] **Créer `/api/intervention-start/route.ts`**
  ```typescript
  // Statut planifiee → en_cours
  // Notifications automatiques
  // Logging de début d'intervention
  ```

- [ ] **Créer `/api/intervention-complete/route.ts`**
  ```typescript
  // Statut en_cours → cloturee_par_prestataire
  // Upload photos finales, notes, facture
  // Notification au locataire pour validation
  ```

#### Étape 1.4 : APIs de Finalisation
**Actions :**
- [ ] **Créer `/api/intervention-validate-tenant/route.ts`**
  ```typescript
  // Statut cloturee_par_prestataire → cloturee_par_locataire
  // Possibilité de contester avec fichiers/commentaires
  // Notification au gestionnaire
  ```

- [ ] **Créer `/api/intervention-finalize/route.ts`**
  ```typescript
  // Statut cloturee_par_locataire → cloturee_par_gestionnaire
  // Validation finale, processus paiement
  // Archivage et clôture définitive
  ```

### PHASE 2 : Fonctionnalités Avancées (5-7 jours)

#### Étape 2.1 : Système de Devis Complet
**Objectif** : Workflow de devis optionnel

**Actions :**
- [ ] **Table `intervention_quotes`**
```sql
CREATE TABLE intervention_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id),
  provider_id uuid REFERENCES users(id),
  amount decimal(10,2),
  description text,
  files jsonb,
  status quote_status DEFAULT 'pending',
  valid_until timestamp,
  created_at timestamp DEFAULT now()
);
```

- [ ] **Interface de soumission** (prestataire)
- [ ] **Interface de validation** (gestionnaire)  
- [ ] **Workflow complet** devis → planification

#### Étape 2.2 : Magic Links pour Prestataires
**Objectif** : Accès sécurisé sans compte complet

**Actions :**
- [ ] **Table `intervention_magic_links`**
```sql
CREATE TABLE intervention_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id),
  provider_email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT now()
);
```

- [ ] **API `/api/generate-magic-link`**
- [ ] **Interface prestataire via token** `/prestataire/intervention/[token]`
- [ ] **Sécurisation et expiration** des liens

#### Étape 2.3 : Collecte de Disponibilités (Doodle-like)
**Objectif** : Système de vote sur les créneaux

**Actions :**
- [ ] **Interface de proposition** de créneaux multiples
- [ ] **Interface de vote** locataire/prestataire  
- [ ] **Logique de sélection** automatique du créneau optimal
- [ ] **Notifications** de confirmation

#### Étape 2.4 : Chat Temps Réel
**Objectif** : Communication directe locataire ↔ prestataire

**Actions :**
- [ ] **Table `intervention_messages`**
- [ ] **Composant de chat** en temps réel
- [ ] **API WebSocket ou Server-Sent Events**
- [ ] **Notifications** de nouveaux messages

### PHASE 3 : Workflow de Clôture Robuste (3-4 jours)

#### Étape 3.1 : Interface Complète de Clôture Prestataire
**Actions :**
- [ ] **Formulaire de clôture** avec upload multiple
- [ ] **Catégorisation automatique** des documents (photos avant/après, facture, rapport)
- [ ] **Validation côté client/serveur**
- [ ] **Statut → `cloturee_par_prestataire`** automatique

#### Étape 3.2 : Système de Validation Locataire
**Actions :**
- [ ] **Interface de validation** avec aperçu complet
- [ ] **Masquage des informations financières** (factures)
- [ ] **Système de contestation** avec upload de preuves
- [ ] **Workflow de résolution** des litiges

#### Étape 3.3 : Finalisation Administrative
**Actions :**
- [ ] **Interface gestionnaire** de revue complète
- [ ] **Validation des factures** et montants
- [ ] **Processus de paiement** (intégration future)
- [ ] **Archivage et reporting**

### PHASE 4 : Polish et Optimisations (2-3 jours)

#### Étape 4.1 : Indicateurs UX Avancés
**Actions :**
- [ ] **Badges d'actions attendues** contextuels
- [ ] **Progress bars** par phase d'intervention
- [ ] **Notifications de rappel** automatiques
- [ ] **Statuts en temps réel**

#### Étape 4.2 : Performance et Robustesse
**Actions :**
- [ ] **Optimisation des requêtes** avec indexes
- [ ] **Cache des données** critiques
- [ ] **Error boundaries** robustes
- [ ] **Retry logic** pour les actions critiques

#### Étape 4.3 : Tests et Validation
**Actions :**
- [ ] **Tests e2e** de chaque workflow complet
- [ ] **Tests de permissions** par rôle
- [ ] **Tests de performance** sous charge
- [ ] **Validation mobile** responsive

---

## Ordre de Priorité RÉVISÉ

### 🚨 CRITIQUE (À faire IMMÉDIATEMENT)
1. **Migration Statuts** (Phase 0) - **1-2 jours**
2. **APIs d'Actions Réelles** (Phase 1.1-1.4) - **3-5 jours**

### 🔥 IMPORTANT (Fonctionnalités core)
3. **Workflow Clôture** (Phase 3) - **3-4 jours** 
4. **Magic Links** (Phase 2.2) - **1-2 jours**
5. **Notifications Robustes** - **1-2 jours**

### ⭐ AMÉLIORATIONS (Si temps disponible)
6. **Système Devis** (Phase 2.1) - **2-3 jours**
7. **Chat Temps Réel** (Phase 2.4) - **2-3 jours**
8. **Doodle-like** (Phase 2.3) - **2-3 jours**

---

## Estimation Totale RÉVISÉE

- **Phase 0** (Statuts) : 1-2 jours - **🚨 BLOQUANT**
- **Phase 1** (APIs réelles) : 3-5 jours - **🚨 CRITIQUE**
- **Phase 2** (Fonctionnalités) : 3-7 jours (selon choix)
- **Phase 3** (Clôture) : 3-4 jours - **🔥 IMPORTANT**
- **Phase 4** (Polish) : 2-3 jours

**Total minimum fonctionnel** : 9-14 jours
**Total avec fonctionnalités avancées** : 12-21 jours

---

## Notes Techniques Importantes

### Migration Statuts - ATTENTION ⚠️
- **Les enums PostgreSQL ne permettent pas de RENOMMER** les valeurs
- **Il faut AJOUTER les nouveaux** puis migrer les données
- **Considérer un mapping temporaire** pendant la transition

### Sécurité Magic Links 
- **Expiration courte** (24-48h max)
- **Usage unique** ou limité
- **HTTPS obligatoire** en production
- **Logging** des accès pour audit

### Performance
- **Index sur** `intervention_id`, `status`, `team_id`
- **Optimisation requêtes** avec `intervention_contacts`
- **Cache notifications** pour éviter spam
- **Pagination** pour grandes listes

---

*Ce plan a été créé suite à l'analyse complète des interfaces, APIs backend existantes, schéma de base de données et workflow souhaité. Il est prêt pour implémentation immédiate.*