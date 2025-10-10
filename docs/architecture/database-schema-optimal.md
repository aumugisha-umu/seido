# SEIDO - Schéma de Base de Données Optimal

**Date**: 2025-10-09 (Dernière mise à jour: 2025-10-10)
**Version**: 2.0 (Migration vers nouvelle instance Supabase)
**Status**: ⏳ **EN COURS - Migration progressive par sections**

---

## 📊 État d'Avancement de la Migration

### Vue d'Ensemble

```
Section 1 (Users, Teams, Invitations):  ████████████████████ 100% ✅ COMPLÉTÉE
Section 2 (Buildings, Lots, Contacts):  ░░░░░░░░░░░░░░░░░░░░   0% ❌ À FAIRE
Section 3 (Interventions, Devis):       ░░░░░░░░░░░░░░░░░░░░   0% ❌ À FAIRE

Progression Globale:                     ██████░░░░░░░░░░░░░░  33%
```

### Section 1: ✅ COMPLÉTÉE (2025-10-10)

**Référence**: `20251009000001_phase1_users_teams_companies_invitations.sql`
**Documentation**: `migration-section-1-users-teams-invitations-UPDATED.md`

**Tables Déployées**:
- ✅ `users` (avec soft delete, compteurs dénormalisés)
- ✅ `teams` (avec `settings` JSONB, soft delete)
- ✅ `team_members` (multi-équipe avec `left_at`)
- ✅ `companies` (regroupement prestataires)
- ✅ `invitations` (avec `user_id`, `invitation_token` VARCHAR(255))

**Corrections Post-Déploiement** (Session 2025-10-10):
- ✅ **RLS Infinite Recursion Fix**: Fonction `can_manager_update_user()` SECURITY DEFINER
  - Résolution erreur `42P17` lors de l'édition de contacts
  - Policy simplifiée (lignes 688-695 dans migration)
  - 8 fonctions utilitaires au total
- ✅ **Email Templates Redesign**: Logo repositionné, bouton CTA avec gradient
  - `emails/components/email-header.tsx` optimisé
  - `emails/components/email-button.tsx` optimisé (architecture table-based)

**RLS Policies**: 15 policies actives
**Fonctions Utilitaires**: 8 fonctions (dont `can_manager_update_user()`)
**Indexes**: 19 indexes de performance

### Section 2: ❌ À FAIRE (Prochaine étape)

**Tables à Créer**:
- ❌ `buildings` (avec compteurs dénormalisés)
- ❌ `lots` (avec relation `tenant_id`)
- ❌ `lot_contacts` (association lots ↔ contacts)

**Estimation**: 5 jours (backend 2j, services 1j, API 1j, frontend 1j)

**Voir**: `MIGRATION-MASTER-GUIDE.md` section "Phase 2" pour détails complets

### Section 3: ❌ À FAIRE (Après Section 2)

**Tables à Créer**:
- ❌ `interventions` (statuts FR, workflow complet)
- ❌ `quotes` (devis avec validation)
- ❌ `intervention_documents`
- ❌ `intervention_messages`
- ❌ `availability_slots`

**Nouvelles Fonctionnalités**:
- ❌ Chat temps réel (5 tables)
- ❌ Commentaires internes gestionnaires (4 tables)
- ❌ Rapports d'intervention structurés (4 tables)

**Voir**: Ce document (sections suivantes) pour schéma complet

---

## 📋 Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Analyse de l'Architecture Actuelle](#analyse-de-larchitecture-actuelle)
3. [Problèmes Identifiés](#problèmes-identifiés)
4. [Schéma Optimal Proposé](#schéma-optimal-proposé)
5. [Nouvelles Fonctionnalités](#nouvelles-fonctionnalités)
6. [Plan de Migration](#plan-de-migration)
7. [Gains de Performance Attendus](#gains-de-performance-attendus)

---

## 📊 Résumé Exécutif

### État Actuel
- **11 tables principales** : users, teams, buildings, lots, interventions, contacts, quotes, etc.
- **Architecture multi-tenant** : Isolation par team_id avec RLS
- **Performance actuelle** :
  - Dashboard : 500-1000ms
  - Liste interventions : 300-500ms
  - Détail intervention : 150-500ms

### Problèmes Majeurs Identifiés
1. ❌ **N+1 Queries** : 150+ requêtes pour charger 50 immeubles
2. ❌ **Duplication Statuts** : Valeurs FR + EN en parallèle
3. ❌ **Joins Profonds** : Relations imbriquées causant lenteur
4. ❌ **Index Manquants** : Colonnes fréquemment filtrées non indexées
5. ❌ **Pas de Soft Delete** : Perte de données définitive

### Améliorations Proposées
- ✅ **Optimisation Performance** : Réduction latence de 60-80%
- ✅ **3 Nouvelles Fonctionnalités** : Chat, Commentaires Internes, Rapports
- ✅ **Meilleure Architecture** : Normalization + dénormalisation stratégique
- ✅ **Analytics Intégrés** : Vues matérialisées pour métriques

### Objectifs de Performance
| Métrique | Actuel | Cible | Amélioration |
|----------|--------|-------|--------------|
| Dashboard Load | 500-1000ms | **<200ms** | -60 à -80% |
| Liste Interventions | 300-500ms | **<100ms** | -67 à -80% |
| Détail Intervention | 150-500ms | **<50ms** | -67 à -90% |
| Nombre de Queries | 150+ | **<10** | -93% |

---

## 🔍 Analyse de l'Architecture Actuelle

### Schéma Actuel Simplifié

```
┌─────────────────────────────────────────────────────────────────┐
│                         SEIDO - Schéma Actuel                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   TEAMS      │──────┐
└──────────────┘      │
                      │
       ┌──────────────▼──────────────┐
       │          USERS              │
       │  (role: admin/gestionnaire/ │
       │   prestataire/locataire)    │
       └──────────────┬──────────────┘
                      │
       ┌──────────────▼──────────────┐
       │        BUILDINGS            │
       │  (team_id, gestionnaire_id) │
       └──────────────┬──────────────┘
                      │
       ┌──────────────▼──────────────┐
       │          LOTS               │
       │  (building_id, tenant_id?)  │
       └──────────────┬──────────────┘
                      │
       ┌──────────────▼──────────────────────────┐
       │          INTERVENTIONS                    │
       │  (status: 11 valeurs FR,                 │
       │   type, urgency, dates...)               │
       └──────────────┬──────────────────────────┘
                      │
       ┌──────────────┴──────────────┐
       │                             │
┌──────▼────────┐          ┌─────────▼────────┐
│ INTERVENTION_ │          │   QUOTES         │
│   CONTACTS    │          │  (status, price) │
│ (prestataire, │          └──────────────────┘
│  locataire)   │
└───────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TABLES JONCTION (Problème de Structure)             │
├─────────────────────────────────────────────────────────────────┤
│ • building_contacts  (N-N buildings ↔ users)                    │
│ • lot_contacts       (N-N lots ↔ users)                         │
│ • intervention_contacts (N-N interventions ↔ users)             │
│   → Complexité: Chaque entité a sa propre table de jonction     │
│   → Impact: Joins multiples pour récupérer les contacts         │
└─────────────────────────────────────────────────────────────────┘
```

### Tables Existantes (11 principales)

#### 1. **teams**
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **users** (Utilisateurs + Contacts fusionnés)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id), -- NULL pour contacts invités
  team_id UUID REFERENCES teams(id),
  role TEXT CHECK (role IN ('admin', 'gestionnaire', 'prestataire', 'locataire')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  provider_category TEXT, -- Pour prestataires uniquement
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **buildings**
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  gestionnaire_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  total_lots INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. **lots**
```sql
CREATE TABLE lots (
  id UUID PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES users(id), -- NULL si vacant
  name TEXT NOT NULL,
  floor INTEGER,
  size_sqm DECIMAL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. **interventions** (❌ Problème: Statuts dupliqués)
```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  tenant_id UUID REFERENCES users(id),
  reference TEXT UNIQUE NOT NULL,

  -- ❌ PROBLÈME: Duplication FR/EN
  status TEXT CHECK (status IN (
    'demande', 'rejetee', 'approuvee', 'demande_de_devis',
    'planification', 'planifiee', 'en_cours',
    'cloturee_par_prestataire', 'cloturee_par_locataire',
    'cloturee_par_gestionnaire', 'annulee'
  )),

  type TEXT CHECK (type IN (
    'plomberie', 'electricite', 'chauffage', 'serrurerie',
    'vitrerie', 'peinture', 'autre'
  )),

  urgency TEXT CHECK (urgency IN ('basse', 'moyenne', 'haute', 'urgente')),

  title TEXT NOT NULL,
  description TEXT,

  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  approved_date TIMESTAMP,
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  finalized_date TIMESTAMP
);
```

#### 6. **intervention_contacts** (❌ Problème: Table jonction complexe)
```sql
CREATE TABLE intervention_contacts (
  id UUID PRIMARY KEY,
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('prestataire', 'locataire')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(intervention_id, user_id)
);
```

#### 7. **quotes**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  amount DECIMAL(10,2),
  description TEXT,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. **building_contacts**, **lot_contacts** (❌ Redondance)
```sql
-- Similaires à intervention_contacts
-- Créent des joins complexes pour chaque niveau de hiérarchie
```

---

## ❌ Problèmes Identifiés

### 1. Performance - N+1 Queries

**Exemple Actuel** : Chargement de 50 immeubles avec leurs lots et contacts
```typescript
// ❌ ANTI-PATTERN ACTUEL
const buildings = await supabase.from('buildings').select('*') // 1 query

for (const building of buildings) {
  // ❌ 50 queries supplémentaires pour les lots
  const lots = await supabase
    .from('lots')
    .select('*')
    .eq('building_id', building.id)

  // ❌ 50 queries supplémentaires pour les contacts
  const contacts = await supabase
    .from('building_contacts')
    .select('*, users(*)')
    .eq('building_id', building.id)
}
// TOTAL: 1 + 50 + 50 = 101 queries !
```

**Impact Mesuré**:
- Dashboard gestionnaire : **5-7 requêtes séparées** au lieu de 1-2
- Temps total : 500-1000ms
- Latence réseau multipliée par le nombre de requêtes

### 2. Duplication de Données - Statuts FR/EN

**Problème**:
```typescript
// ❌ Code actuel avec conversion bidirectionnelle
const FR_STATUS = {
  'demande': 'pending',
  'approuvee': 'approved',
  // ... 11 mappings
}

const EN_STATUS = {
  'pending': 'demande',
  'approved': 'approuvee',
  // ... 11 mappings inversés
}

// Code avec conversions partout
const statusFR = convertToFrench(intervention.status)
const statusEN = convertToEnglish(statusInput)
```

**Conséquences**:
- 315 lignes de code de conversion
- Risque d'inconsistance
- Complexité maintenance
- Impossible d'ajouter langues supplémentaires facilement

### 3. Structure de Contacts - Tables Jonction Multiples

**Problème**:
```sql
-- ❌ 3 tables jonction différentes pour le même concept
building_contacts (building_id, user_id, role)
lot_contacts (lot_id, user_id, role)
intervention_contacts (intervention_id, user_id, role)

-- Requête complexe pour obtenir tous les contacts d'une intervention
SELECT u.*
FROM users u
JOIN intervention_contacts ic ON ic.user_id = u.id
WHERE ic.intervention_id = $1

UNION

SELECT u.*
FROM users u
JOIN lot_contacts lc ON lc.user_id = u.id
JOIN lots l ON l.id = lc.lot_id
JOIN interventions i ON i.lot_id = l.id
WHERE i.id = $1

UNION

SELECT u.*
FROM users u
JOIN building_contacts bc ON bc.user_id = u.id
JOIN buildings b ON b.id = bc.building_id
JOIN interventions i ON i.building_id = b.id
WHERE i.id = $1
```

**Impact**:
- Joins imbriqués profonds (3-4 niveaux)
- Temps de réponse : 150-500ms par intervention
- Code complexe à maintenir

### 4. Index Manquants

**Colonnes Fréquemment Filtrées Sans Index**:
```sql
-- ❌ Scans complets de table
SELECT * FROM interventions WHERE status = 'approuvee' AND urgency = 'urgente';
-- Scan complet sur status + urgency (pas d'index composite)

SELECT * FROM users WHERE role = 'prestataire' AND provider_category = 'plomberie';
-- Scan complet (pas d'index sur provider_category)

SELECT * FROM interventions WHERE created_at >= '2025-01-01';
-- Scan complet (pas d'index sur created_at pour filtrage)
```

### 5. Absence de Soft Delete

**Problème**:
```sql
-- ❌ Suppression définitive
DELETE FROM interventions WHERE id = $1;

-- Perte de données pour analytics
-- Impossible de tracer historique
-- Problèmes de compliance RGPD (droit à l'oubli vs audit trail)
```

### 6. Pas de Dénormalisation Stratégique

**Exemple** : Compteurs recalculés à chaque requête
```sql
-- ❌ Count() à chaque chargement de dashboard
SELECT
  b.id,
  b.name,
  (SELECT COUNT(*) FROM lots WHERE building_id = b.id) as total_lots,
  (SELECT COUNT(*) FROM interventions WHERE building_id = b.id) as total_interventions
FROM buildings b;

-- Si 100 buildings → 200 subqueries !
```

---

## ✅ Schéma Optimal Proposé

### Principes Directeurs

1. **Single Source of Truth** : Statuts en français uniquement
2. **Optimisation Lecture** : Dénormalisation stratégique (compteurs)
3. **Soft Delete Généralisé** : Toutes les entités critiques
4. **Index Complets** : Toutes les colonnes de filtrage
5. **Analytics Intégrés** : Vues matérialisées pour métriques

### Architecture Optimale - Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│              SEIDO - Architecture Optimale v2.0                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│    CORE ENTITIES         │
├──────────────────────────┤
│  teams                   │
│  users                   │
│  buildings               │◄──┐
│  lots                    │   │ Dénormalisation
│  interventions           │   │ (compteurs)
└──────────────────────────┘   │
                               │
┌──────────────────────────┐   │
│  WORKFLOW & RELATIONS    │   │
├──────────────────────────┤   │
│  entity_contacts         │───┘ Table unique unifiée
│  quotes                  │
│  intervention_reports    │◄── Nouveau (3 types)
│  report_media            │
└──────────────────────────┘

┌──────────────────────────┐
│  COMMUNICATION           │
├──────────────────────────┤
│  chat_conversations      │◄── Nouveau
│  chat_messages           │
│  chat_participants       │
│  internal_comments       │◄── Nouveau (gestionnaires)
└──────────────────────────┘

┌──────────────────────────┐
│  ANALYTICS & CACHE       │
├──────────────────────────┤
│  intervention_analytics  │◄── Vue matérialisée
│  provider_performance    │◄── Vue matérialisée
│  building_statistics     │◄── Vue matérialisée
└──────────────────────────┘
```

---

## 📐 Schéma Détaillé - Tables Optimisées

### 1. **teams** (Inchangé)
```sql
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_created ON teams(created_at DESC);
```

### 2. **users** (✅ Optimisé avec soft delete)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Identité
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestionnaire', 'prestataire', 'locataire')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,

  -- Spécifique prestataire
  provider_category TEXT CHECK (
    provider_category IS NULL OR
    provider_category IN ('plomberie', 'electricite', 'chauffage', 'serrurerie', 'vitrerie', 'peinture', 'autre')
  ),
  provider_rating DECIMAL(3,2) DEFAULT 0.00, -- ✅ Dénormalisé pour performance
  total_interventions INTEGER DEFAULT 0,     -- ✅ Compteur dénormalisé

  -- Soft delete
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT provider_category_for_prestataires CHECK (
    (role = 'prestataire' AND provider_category IS NOT NULL) OR
    (role != 'prestataire' AND provider_category IS NULL)
  )
);

-- ✅ Index optimisés
CREATE INDEX idx_users_team ON users(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_provider_category ON users(provider_category)
  WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_provider_rating ON users(provider_rating DESC)
  WHERE role = 'prestataire' AND deleted_at IS NULL;
```

### 3. **buildings** (✅ Optimisé avec compteurs)
```sql
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  gestionnaire_id UUID NOT NULL REFERENCES users(id),

  -- Informations
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,

  -- ✅ Compteurs dénormalisés (mis à jour par triggers)
  total_lots INTEGER DEFAULT 0,
  occupied_lots INTEGER DEFAULT 0,
  vacant_lots INTEGER DEFAULT 0,
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ Index optimisés
CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_gestionnaire ON buildings(gestionnaire_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_city ON buildings(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_postal_code ON buildings(postal_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_created ON buildings(created_at DESC) WHERE deleted_at IS NULL;
```

### 4. **lots** (✅ Optimisé)
```sql
CREATE TABLE lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Informations
  name TEXT NOT NULL,
  floor INTEGER,
  size_sqm DECIMAL(10,2),

  -- ✅ Compteur dénormalisé
  total_interventions INTEGER DEFAULT 0,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ Index optimisés
CREATE INDEX idx_lots_building ON lots(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_tenant ON lots(tenant_id) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;
CREATE INDEX idx_lots_vacant ON lots(building_id) WHERE tenant_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_lots_occupied ON lots(building_id) WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;
```

### 5. **interventions** (✅ Optimisé - Statuts FR uniquement)
```sql
CREATE TYPE intervention_status AS ENUM (
  'demande',                        -- Demande initiale
  'rejetee',                        -- Rejetée par gestionnaire
  'approuvee',                      -- Approuvée par gestionnaire
  'demande_de_devis',               -- Devis demandé
  'planification',                  -- Recherche créneau
  'planifiee',                      -- Créneau confirmé
  'en_cours',                       -- Travaux en cours
  'cloturee_par_prestataire',       -- Terminée par prestataire
  'cloturee_par_locataire',         -- Validée par locataire
  'cloturee_par_gestionnaire',      -- Finalisée par gestionnaire
  'annulee'                         -- Annulée
);

CREATE TYPE intervention_type AS ENUM (
  'plomberie', 'electricite', 'chauffage', 'serrurerie',
  'vitrerie', 'peinture', 'autre'
);

CREATE TYPE intervention_urgency AS ENUM (
  'basse', 'moyenne', 'haute', 'urgente'
);

CREATE TABLE interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,

  -- Relations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES users(id),
  assigned_provider_id UUID REFERENCES users(id), -- ✅ Dénormalisé pour performance

  -- ✅ Statuts en français uniquement (single source of truth)
  status intervention_status NOT NULL DEFAULT 'demande',
  type intervention_type NOT NULL,
  urgency intervention_urgency NOT NULL,

  -- Description
  title TEXT NOT NULL,
  description TEXT,

  -- Dates de workflow
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  quote_requested_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tenant_validated_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- ✅ Métriques dénormalisées
  total_quotes INTEGER DEFAULT 0,
  accepted_quote_amount DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  duration_hours DECIMAL(10,2),

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ✅ Contraintes pour cohérence workflow
  CONSTRAINT valid_workflow_dates CHECK (
    (approved_at IS NULL OR approved_at >= created_at) AND
    (scheduled_at IS NULL OR scheduled_at >= approved_at) AND
    (completed_at IS NULL OR completed_at >= scheduled_at)
  )
);

-- ✅ Index composites optimisés
CREATE INDEX idx_interventions_team_status ON interventions(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_building ON interventions(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_lot ON interventions(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_tenant ON interventions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_provider ON interventions(assigned_provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_status ON interventions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_urgency ON interventions(urgency) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_type ON interventions(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_created ON interventions(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_scheduled ON interventions(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND deleted_at IS NULL;

-- ✅ Index pour recherche full-text
CREATE INDEX idx_interventions_search ON interventions
  USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));
```

### 6. **entity_contacts** (✅ NOUVEAU - Table Unifiée)
```sql
-- ✅ Remplace building_contacts, lot_contacts, intervention_contacts
CREATE TYPE entity_type AS ENUM ('building', 'lot', 'intervention');
CREATE TYPE contact_role AS ENUM ('gestionnaire', 'prestataire', 'locataire', 'contact');

CREATE TABLE entity_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relation polymorphique
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role contact_role NOT NULL,

  -- Métadonnées
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ✅ Contrainte unique par entité
  CONSTRAINT unique_entity_contact UNIQUE (entity_type, entity_id, user_id),

  -- ✅ Contraintes d'intégrité référentielle (vérifiées par trigger)
  CONSTRAINT valid_entity_reference CHECK (
    (entity_type = 'building' AND EXISTS (SELECT 1 FROM buildings WHERE id = entity_id)) OR
    (entity_type = 'lot' AND EXISTS (SELECT 1 FROM lots WHERE id = entity_id)) OR
    (entity_type = 'intervention' AND EXISTS (SELECT 1 FROM interventions WHERE id = entity_id))
  )
);

-- ✅ Index optimisés pour requêtes polymorphiques
CREATE INDEX idx_entity_contacts_entity ON entity_contacts(entity_type, entity_id);
CREATE INDEX idx_entity_contacts_user ON entity_contacts(user_id);
CREATE INDEX idx_entity_contacts_role ON entity_contacts(role);
CREATE INDEX idx_entity_contacts_building ON entity_contacts(entity_id)
  WHERE entity_type = 'building';
CREATE INDEX idx_entity_contacts_lot ON entity_contacts(entity_id)
  WHERE entity_type = 'lot';
CREATE INDEX idx_entity_contacts_intervention ON entity_contacts(entity_id)
  WHERE entity_type = 'intervention';
```

**Avantages de la table unifiée**:
- ✅ **-67% de tables** : 1 table au lieu de 3
- ✅ **Requêtes simplifiées** : Un seul JOIN pour obtenir tous les contacts
- ✅ **Code réutilisable** : Même logique pour tous les types d'entités
- ✅ **Extensibilité** : Facile d'ajouter de nouveaux types d'entités

### 7. **quotes** (✅ Optimisé)
```sql
CREATE TYPE quote_status AS ENUM ('en_attente', 'approuve', 'rejete', 'annule');

CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),

  -- Devis
  status quote_status NOT NULL DEFAULT 'en_attente',
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT,

  -- Détails
  labor_cost DECIMAL(10,2),
  materials_cost DECIMAL(10,2),
  other_costs DECIMAL(10,2),

  -- Validité
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Approbation
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ Index
CREATE INDEX idx_quotes_intervention ON quotes(intervention_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_provider ON quotes(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_status ON quotes(status) WHERE deleted_at IS NULL;
```

---

## 🆕 Nouvelles Fonctionnalités

### 1. Système de Chat Temps Réel

**Tables** : `chat_conversations`, `chat_messages`, `chat_participants`, `chat_message_attachments`, `chat_typing_indicators`

**Fonctionnalités**:
- ✅ Chat direct 1-1 entre utilisateurs
- ✅ Chat de groupe automatique par intervention
- ✅ Pièces jointes (photos, documents)
- ✅ Indicateurs de saisie en temps réel
- ✅ Accusés de lecture
- ✅ Réactions sur messages
- ✅ Recherche full-text dans l'historique

**Schéma Simplifié**:
```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('direct', 'intervention')),
  intervention_id UUID REFERENCES interventions(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chat_conversations(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_participants (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chat_conversations(id),
  user_id UUID REFERENCES users(id),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);
```

**Intégration avec Interventions**:
- Création automatique d'un chat de groupe lors d'une nouvelle intervention
- Ajout automatique du locataire, gestionnaire, et prestataire(s) assigné(s)
- Messages système pour les changements de statut

### 2. Commentaires Internes Gestionnaires

**Tables** : `internal_comments`, `internal_comment_attachments`, `internal_comment_history`, `internal_comment_reactions`

**Fonctionnalités**:
- ✅ Commentaires privés uniquement entre gestionnaires
- ✅ Threading (réponses imbriquées jusqu'à 5 niveaux)
- ✅ Mentions @user avec notifications
- ✅ Catégories (urgent, follow-up, documentation, decision, warning, question)
- ✅ Pièces jointes
- ✅ Réactions rapides (emojis)
- ✅ Historique complet des modifications
- ✅ Recherche full-text
- ✅ Niveaux de visibilité (équipe, managers uniquement, auteur uniquement)

**Schéma Simplifié**:
```sql
CREATE TYPE comment_category AS ENUM (
  'urgent', 'follow_up', 'documentation', 'decision', 'warning', 'question', 'general'
);

CREATE TABLE internal_comments (
  id UUID PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES interventions(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  author_id UUID NOT NULL REFERENCES users(id),

  parent_comment_id UUID REFERENCES internal_comments(id),
  thread_depth INTEGER DEFAULT 0 CHECK (thread_depth <= 5),

  content TEXT NOT NULL,
  category comment_category DEFAULT 'general',
  mentioned_user_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  is_pinned BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy: Seulement gestionnaires de la même équipe
CREATE POLICY "gestionnaires_only"
  ON internal_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'gestionnaire'
      AND team_id = internal_comments.team_id
    )
  );
```

**Cas d'Usage**:
- Gestionnaire A note des difficultés avec un locataire → commentaire privé
- Gestionnaire B demande conseil sur un devis → mention @GestionnaireC
- Équipe documente les décisions prises pour audit futur

### 3. Système de Rapports d'Intervention

**Tables** : `intervention_reports`, `intervention_report_versions`, `intervention_report_media`, `intervention_report_signatures`

**3 Types de Rapports Structurés**:

#### a) **Rapport Prestataire** (à la fin des travaux)
```json
{
  "workPerformed": {
    "description": "Remplacement complet du robinet de cuisine...",
    "tasksCompleted": ["Démontage ancien robinet", "Installation nouveau robinet", "Test étanchéité"]
  },
  "timeSpent": {
    "totalHours": 2.5,
    "breakdown": [
      { "date": "2025-01-10", "startTime": "09:00", "endTime": "11:30", "description": "Installation" }
    ]
  },
  "materials": {
    "used": [
      { "name": "Robinet Grohe Eurosmart", "quantity": 1, "unitPrice": 89.99, "totalPrice": 89.99 }
    ],
    "totalCost": 89.99
  },
  "photos": {
    "beforePhotoIds": ["uuid1", "uuid2"],
    "afterPhotoIds": ["uuid3", "uuid4"]
  },
  "difficulty": 3,
  "followUpNeeded": false
}
```

#### b) **Rapport Locataire** (validation travaux)
```json
{
  "satisfaction": {
    "rating": 5,
    "wouldRecommend": true
  },
  "workQuality": {
    "onTime": true,
    "professionalBehavior": true,
    "workAreaClean": true,
    "qualityOfWork": "excellent"
  },
  "providerPerformance": {
    "communication": 5,
    "punctuality": 5,
    "professionalism": 5,
    "expertise": 5
  },
  "issues": {
    "hasRemainingIssues": false
  },
  "signature": {
    "type": "checkbox",
    "agreedToTerms": true,
    "signedAt": "2025-01-10T14:30:00Z"
  }
}
```

#### c) **Rapport Gestionnaire** (finalisation)
```json
{
  "overallAssessment": {
    "summary": "Intervention réalisée dans les délais avec un travail de qualité...",
    "objectives": "met",
    "qualityRating": "excellent"
  },
  "costAnalysis": {
    "quotedAmount": 150.00,
    "actualAmount": 145.50,
    "variance": -4.50,
    "variancePercent": -3.0,
    "budgetStatus": "under"
  },
  "timelineAnalysis": {
    "plannedStartDate": "2025-01-10",
    "actualStartDate": "2025-01-10",
    "efficiency": "on_time"
  },
  "providerPerformance": {
    "rating": 5,
    "wouldRehire": true,
    "addToPreferredList": true
  },
  "internalTags": ["plomberie", "preventive"],
  "approval": {
    "status": "approved"
  }
}
```

**Schéma de Base**:
```sql
CREATE TABLE intervention_reports (
  id UUID PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES interventions(id),
  report_type TEXT CHECK (report_type IN ('prestataire', 'locataire', 'gestionnaire')),
  author_id UUID NOT NULL REFERENCES users(id),

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'disputed')),
  report_data JSONB NOT NULL, -- Données structurées selon le type
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,

  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (intervention_id, report_type, is_latest) WHERE is_latest = TRUE
);

-- Média (photos avant/après, documents)
CREATE TABLE intervention_report_media (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES intervention_reports(id),
  media_type TEXT CHECK (media_type IN ('before_photo', 'after_photo', 'document', 'signature')),
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Workflow Intégré**:
1. Prestataire termine travaux → Soumet rapport avec photos avant/après
2. Système change statut intervention → `cloturee_par_prestataire`
3. Locataire notifié → Valide avec son rapport de satisfaction
4. Système change statut → `cloturee_par_locataire`
5. Gestionnaire finalise → Rapport d'analyse coût/qualité
6. Système change statut → `cloturee_par_gestionnaire` (terminé)

**Export PDF**:
- Génération automatique de PDF pour archivage
- QR code pour vérification d'authenticité
- Intégration avec stockage Supabase

---

## 🚀 Triggers et Fonctions d'Optimisation

### 1. Mise à Jour Automatique des Compteurs

```sql
-- ✅ Trigger: Mise à jour compteur lots dans buildings
CREATE OR REPLACE FUNCTION update_building_lot_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE buildings
    SET
      total_lots = total_lots + 1,
      occupied_lots = occupied_lots + CASE WHEN NEW.tenant_id IS NOT NULL THEN 1 ELSE 0 END,
      vacant_lots = vacant_lots + CASE WHEN NEW.tenant_id IS NULL THEN 1 ELSE 0 END
    WHERE id = NEW.building_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si tenant change
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      UPDATE buildings
      SET
        occupied_lots = occupied_lots + CASE
          WHEN NEW.tenant_id IS NOT NULL AND OLD.tenant_id IS NULL THEN 1
          WHEN NEW.tenant_id IS NULL AND OLD.tenant_id IS NOT NULL THEN -1
          ELSE 0
        END,
        vacant_lots = vacant_lots + CASE
          WHEN NEW.tenant_id IS NULL AND OLD.tenant_id IS NOT NULL THEN 1
          WHEN NEW.tenant_id IS NOT NULL AND OLD.tenant_id IS NULL THEN -1
          ELSE 0
        END
      WHERE id = NEW.building_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE buildings
    SET
      total_lots = total_lots - 1,
      occupied_lots = occupied_lots - CASE WHEN OLD.tenant_id IS NOT NULL THEN 1 ELSE 0 END,
      vacant_lots = vacant_lots - CASE WHEN OLD.tenant_id IS NULL THEN 1 ELSE 0 END
    WHERE id = OLD.building_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_building_lot_counts
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW EXECUTE FUNCTION update_building_lot_counts();

-- ✅ Trigger: Mise à jour compteur interventions
CREATE OR REPLACE FUNCTION update_intervention_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrémenter compteurs
    UPDATE buildings SET total_interventions = total_interventions + 1,
                         active_interventions = active_interventions + 1
    WHERE id = NEW.building_id;

    UPDATE lots SET total_interventions = total_interventions + 1
    WHERE id = NEW.lot_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Si statut passe à terminé
    IF OLD.status != 'cloturee_par_gestionnaire' AND NEW.status = 'cloturee_par_gestionnaire' THEN
      UPDATE buildings SET active_interventions = active_interventions - 1
      WHERE id = NEW.building_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE buildings SET total_interventions = total_interventions - 1,
                         active_interventions = active_interventions - CASE
                           WHEN OLD.status != 'cloturee_par_gestionnaire' THEN 1
                           ELSE 0
                         END
    WHERE id = OLD.building_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intervention_counts
  AFTER INSERT OR UPDATE OR DELETE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_intervention_counts();
```

### 2. Mise à Jour Automatique des Ratings Prestataires

```sql
-- ✅ Trigger: Calcul automatique de la note moyenne prestataire
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  intervention_count INTEGER;
BEGIN
  -- Récupérer moyenne des notes depuis rapports locataires
  SELECT
    AVG((r.report_data->'satisfaction'->>'rating')::INTEGER),
    COUNT(DISTINCT r.intervention_id)
  INTO avg_rating, intervention_count
  FROM intervention_reports r
  JOIN interventions i ON i.id = r.intervention_id
  WHERE r.report_type = 'locataire'
    AND r.status = 'submitted'
    AND i.assigned_provider_id = NEW.author_id;

  -- Mettre à jour profil prestataire
  UPDATE users
  SET
    provider_rating = COALESCE(avg_rating, 0.00),
    total_interventions = COALESCE(intervention_count, 0)
  WHERE id = NEW.author_id
    AND role = 'prestataire';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_rating
  AFTER INSERT OR UPDATE ON intervention_reports
  FOR EACH ROW
  WHEN (NEW.report_type = 'locataire' AND NEW.status = 'submitted')
  EXECUTE FUNCTION update_provider_rating();
```

### 3. Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer à toutes les tables pertinentes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Etc...
```

---

## 📊 Vues Matérialisées pour Analytics

### 1. Performance Prestataires

```sql
CREATE MATERIALIZED VIEW provider_performance_stats AS
SELECT
  u.id as provider_id,
  u.name as provider_name,
  u.provider_category,
  u.provider_rating,
  u.total_interventions,

  -- Métriques de satisfaction (depuis rapports locataires)
  AVG((lr.report_data->'satisfaction'->>'rating')::INTEGER) as avg_satisfaction,
  AVG((lr.report_data->'providerPerformance'->>'communication')::INTEGER) as avg_communication,
  AVG((lr.report_data->'providerPerformance'->>'punctuality')::INTEGER) as avg_punctuality,
  AVG((lr.report_data->'providerPerformance'->>'professionalism')::INTEGER) as avg_professionalism,

  -- Métriques opérationnelles (depuis rapports prestataires)
  AVG((pr.report_data->'difficulty')::INTEGER) as avg_difficulty,
  SUM(CASE WHEN (pr.report_data->>'followUpNeeded')::BOOLEAN = FALSE THEN 1 ELSE 0 END) as first_time_fixes,
  COUNT(*) FILTER (WHERE (pr.report_data->>'followUpNeeded')::BOOLEAN = FALSE)::DECIMAL /
    NULLIF(COUNT(*), 0) * 100 as first_time_fix_rate,

  -- Métriques de coût (depuis rapports gestionnaires)
  AVG((gr.report_data->'costAnalysis'->>'variancePercent')::DECIMAL) as avg_cost_variance,
  SUM(CASE WHEN (gr.report_data->'costAnalysis'->>'budgetStatus') = 'under' THEN 1 ELSE 0 END) as under_budget_count,

  -- Métriques de temps
  AVG(EXTRACT(EPOCH FROM (i.completed_at - i.started_at))/3600) as avg_completion_hours,
  COUNT(*) FILTER (WHERE i.completed_at <= i.scheduled_at) as on_time_count,
  COUNT(*) FILTER (WHERE i.completed_at <= i.scheduled_at)::DECIMAL /
    NULLIF(COUNT(*), 0) * 100 as on_time_rate

FROM users u
JOIN interventions i ON i.assigned_provider_id = u.id
LEFT JOIN intervention_reports pr ON pr.intervention_id = i.id
  AND pr.report_type = 'prestataire' AND pr.is_latest = TRUE
LEFT JOIN intervention_reports lr ON lr.intervention_id = i.id
  AND lr.report_type = 'locataire' AND lr.is_latest = TRUE
LEFT JOIN intervention_reports gr ON gr.intervention_id = i.id
  AND gr.report_type = 'gestionnaire' AND gr.is_latest = TRUE

WHERE u.role = 'prestataire'
  AND i.status = 'cloturee_par_gestionnaire'
  AND u.deleted_at IS NULL

GROUP BY u.id, u.name, u.provider_category, u.provider_rating, u.total_interventions;

-- Index sur la vue matérialisée
CREATE INDEX idx_provider_perf_rating ON provider_performance_stats(avg_satisfaction DESC);
CREATE INDEX idx_provider_perf_category ON provider_performance_stats(provider_category);

-- Rafraîchissement automatique (nightly)
CREATE OR REPLACE FUNCTION refresh_provider_performance()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_performance_stats;
END;
$$ LANGUAGE plpgsql;
```

### 2. Statistiques Immeubles

```sql
CREATE MATERIALIZED VIEW building_statistics AS
SELECT
  b.id as building_id,
  b.name as building_name,
  b.team_id,
  b.total_lots,
  b.occupied_lots,
  b.vacant_lots,
  b.total_interventions,
  b.active_interventions,

  -- Métriques interventions
  COUNT(i.id) as completed_interventions,
  AVG(EXTRACT(EPOCH FROM (i.completed_at - i.created_at))/86400) as avg_resolution_days,

  -- Répartition par type
  COUNT(*) FILTER (WHERE i.type = 'plomberie') as plomberie_count,
  COUNT(*) FILTER (WHERE i.type = 'electricite') as electricite_count,
  COUNT(*) FILTER (WHERE i.type = 'chauffage') as chauffage_count,

  -- Répartition par urgence
  COUNT(*) FILTER (WHERE i.urgency = 'urgente') as urgent_count,
  COUNT(*) FILTER (WHERE i.urgency = 'haute') as high_priority_count,

  -- Coûts
  SUM(i.accepted_quote_amount) as total_quoted_amount,
  SUM(i.actual_cost) as total_actual_cost,
  AVG(i.actual_cost) as avg_intervention_cost,

  -- Satisfaction moyenne
  AVG((lr.report_data->'satisfaction'->>'rating')::INTEGER) as avg_tenant_satisfaction

FROM buildings b
LEFT JOIN interventions i ON i.building_id = b.id
  AND i.status = 'cloturee_par_gestionnaire'
  AND i.deleted_at IS NULL
LEFT JOIN intervention_reports lr ON lr.intervention_id = i.id
  AND lr.report_type = 'locataire'
  AND lr.is_latest = TRUE

WHERE b.deleted_at IS NULL

GROUP BY b.id, b.name, b.team_id, b.total_lots, b.occupied_lots, b.vacant_lots,
         b.total_interventions, b.active_interventions;

CREATE INDEX idx_building_stats_team ON building_statistics(team_id);
```

### 3. Dashboard Metrics (Gestionnaires)

```sql
CREATE MATERIALIZED VIEW dashboard_gestionnaire_metrics AS
SELECT
  t.id as team_id,
  t.name as team_name,

  -- Immeubles
  COUNT(DISTINCT b.id) as total_buildings,
  SUM(b.total_lots) as total_lots,
  SUM(b.occupied_lots) as occupied_lots,
  SUM(b.vacant_lots) as vacant_lots,

  -- Interventions actives
  COUNT(*) FILTER (WHERE i.status IN ('demande', 'approuvee', 'planifiee', 'en_cours')) as active_interventions,
  COUNT(*) FILTER (WHERE i.status = 'demande') as pending_approval,
  COUNT(*) FILTER (WHERE i.status = 'cloturee_par_prestataire') as pending_tenant_validation,
  COUNT(*) FILTER (WHERE i.status = 'cloturee_par_locataire') as pending_manager_finalization,

  -- Urgences
  COUNT(*) FILTER (WHERE i.urgency = 'urgente' AND i.status NOT IN ('cloturee_par_gestionnaire', 'annulee')) as urgent_open,

  -- Cette semaine
  COUNT(*) FILTER (WHERE i.created_at >= date_trunc('week', NOW())) as interventions_this_week,
  COUNT(*) FILTER (WHERE i.status = 'cloturee_par_gestionnaire' AND i.finalized_at >= date_trunc('week', NOW())) as completed_this_week,

  -- Performance globale
  AVG((lr.report_data->'satisfaction'->>'rating')::INTEGER) as avg_satisfaction_rating,
  COUNT(*) FILTER (WHERE i.completed_at <= i.scheduled_at)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE i.scheduled_at IS NOT NULL), 0) * 100 as on_time_completion_rate

FROM teams t
LEFT JOIN buildings b ON b.team_id = t.id AND b.deleted_at IS NULL
LEFT JOIN interventions i ON i.team_id = t.id AND i.deleted_at IS NULL
LEFT JOIN intervention_reports lr ON lr.intervention_id = i.id
  AND lr.report_type = 'locataire'
  AND lr.is_latest = TRUE

GROUP BY t.id, t.name;

CREATE UNIQUE INDEX idx_dashboard_metrics_team ON dashboard_gestionnaire_metrics(team_id);
```

**Rafraîchissement Automatique** :
```sql
-- Job quotidien (à configurer avec pg_cron ou externe)
SELECT cron.schedule('refresh-analytics', '0 2 * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_performance_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY building_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_gestionnaire_metrics;
$$);
```

---

## 📈 Gains de Performance Attendus

### Avant (Architecture Actuelle)

#### Dashboard Gestionnaire - Chargement
```sql
-- ❌ Requête 1: Buildings
SELECT * FROM buildings WHERE team_id = $1; -- 100ms

-- ❌ Requête 2: Lots par building (50 buildings × 20ms)
FOR EACH building:
  SELECT * FROM lots WHERE building_id = $building_id; -- 50 × 20ms = 1000ms

-- ❌ Requête 3: Interventions actives
SELECT * FROM interventions WHERE team_id = $1 AND status IN (...); -- 150ms

-- ❌ Requête 4: Contacts par building
FOR EACH building:
  SELECT * FROM building_contacts WHERE building_id = $building_id; -- 50 × 15ms = 750ms

-- ❌ Requête 5: Stats interventions
SELECT COUNT(*), AVG(...) FROM interventions WHERE team_id = $1; -- 200ms

-- TOTAL: 100 + 1000 + 150 + 750 + 200 = 2200ms 🔴
```

### Après (Architecture Optimale)

#### Dashboard Gestionnaire - Chargement
```sql
-- ✅ Requête unique: Vue matérialisée
SELECT * FROM dashboard_gestionnaire_metrics WHERE team_id = $1; -- 15ms

-- ✅ Requête 2: Buildings avec compteurs dénormalisés (optionnel)
SELECT id, name, total_lots, occupied_lots, active_interventions
FROM buildings WHERE team_id = $1; -- 30ms

-- TOTAL: 15 + 30 = 45ms ✅
-- AMÉLIORATION: -98% (de 2200ms à 45ms)
```

### Comparaison Détaillée

| Opération | Avant | Après | Amélioration |
|-----------|-------|-------|--------------|
| **Dashboard Load** | 2200ms | 45ms | **-98%** |
| **Liste Interventions (50)** | 450ms | 60ms | **-87%** |
| **Détail Intervention** | 350ms | 40ms | **-89%** |
| **Recherche Interventions** | 800ms | 120ms | **-85%** |
| **Création Intervention** | 200ms | 80ms | **-60%** |
| **Analytics Prestataires** | 3500ms | 20ms | **-99%** |

### Nombre de Requêtes Réduites

| Workflow | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| **Chargement Dashboard** | 105 queries | **2 queries** | -98% |
| **Liste 50 Immeubles** | 151 queries | **1 query** | -99% |
| **Détail Intervention** | 7 queries | **1 query** | -86% |
| **Recherche Full-Text** | 5 queries | **1 query** | -80% |

---

## 🔄 Plan de Migration

### Étape 1: Préparation (1 jour)

#### 1.1 Sauvegarde Complète
```bash
# Backup de l'ancienne DB (si existante)
npx supabase db dump --file backup_$(date +%Y%m%d).sql

# Export des données critiques en CSV
# (users, buildings, lots, interventions)
```

#### 1.2 Initialisation Nouvelle Instance Supabase
```bash
# Modifier .env.local avec nouvelles clés Supabase
NEXT_PUBLIC_SUPABASE_URL=https://nouvelle-instance.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=nouvelle_cle_anon
SUPABASE_SERVICE_ROLE_KEY=nouvelle_cle_service

# Test connexion
npx supabase db ping
```

### Étape 2: Migration Schéma (2-3 jours)

#### 2.1 Créer Migration Initiale Consolidée
```bash
# Au lieu de multiples migrations, on crée UNE migration initiale propre
npx supabase migration new init_seido_v2_optimal_schema
```

**Contenu de la migration** (`supabase/migrations/XXXXXXX_init_seido_v2_optimal_schema.sql`):
```sql
-- ============================================================================
-- SEIDO v2.0 - Migration Initiale Optimale
-- Date: 2025-10-09
-- Description: Schéma complet optimisé avec nouvelles fonctionnalités
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: TYPES ÉNUMÉRÉS
-- ============================================================================

CREATE TYPE intervention_status AS ENUM (...);
CREATE TYPE intervention_type AS ENUM (...);
CREATE TYPE intervention_urgency AS ENUM (...);
CREATE TYPE entity_type AS ENUM ('building', 'lot', 'intervention');
CREATE TYPE contact_role AS ENUM ('gestionnaire', 'prestataire', 'locataire', 'contact');
-- ... autres types

-- ============================================================================
-- SECTION 2: TABLES CORE
-- ============================================================================

CREATE TABLE teams (...);
CREATE TABLE users (...);
CREATE TABLE buildings (...);
CREATE TABLE lots (...);
CREATE TABLE interventions (...);

-- ============================================================================
-- SECTION 3: TABLES RELATIONS
-- ============================================================================

CREATE TABLE entity_contacts (...); -- ✅ Remplace 3 tables jonction
CREATE TABLE quotes (...);

-- ============================================================================
-- SECTION 4: NOUVELLES FONCTIONNALITÉS - RAPPORTS
-- ============================================================================

CREATE TABLE intervention_reports (...);
CREATE TABLE intervention_report_media (...);
CREATE TABLE intervention_report_versions (...);
CREATE TABLE intervention_report_signatures (...);

-- ============================================================================
-- SECTION 5: NOUVELLES FONCTIONNALITÉS - CHAT
-- ============================================================================

CREATE TABLE chat_conversations (...);
CREATE TABLE chat_messages (...);
CREATE TABLE chat_participants (...);
CREATE TABLE chat_message_attachments (...);
CREATE TABLE chat_typing_indicators (...);

-- ============================================================================
-- SECTION 6: NOUVELLES FONCTIONNALITÉS - COMMENTAIRES INTERNES
-- ============================================================================

CREATE TABLE internal_comments (...);
CREATE TABLE internal_comment_attachments (...);
CREATE TABLE internal_comment_history (...);
CREATE TABLE internal_comment_reactions (...);

-- ============================================================================
-- SECTION 7: INDEX
-- ============================================================================

-- Index users
CREATE INDEX idx_users_team ON users(team_id) WHERE deleted_at IS NULL;
-- ... tous les index (environ 80 index)

-- ============================================================================
-- SECTION 8: FONCTIONS ET TRIGGERS
-- ============================================================================

CREATE FUNCTION update_building_lot_counts() RETURNS TRIGGER AS $$ ... $$;
CREATE TRIGGER trigger_update_building_lot_counts ...;
-- ... tous les triggers

-- ============================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_team_isolation" ON users ...;
-- ... toutes les policies RLS

-- ============================================================================
-- SECTION 10: VUES MATÉRIALISÉES
-- ============================================================================

CREATE MATERIALIZED VIEW provider_performance_stats AS ...;
CREATE MATERIALIZED VIEW building_statistics AS ...;
CREATE MATERIALIZED VIEW dashboard_gestionnaire_metrics AS ...;

-- ============================================================================
-- SECTION 11: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('intervention-reports', 'intervention-reports', FALSE),
  ('chat-attachments', 'chat-attachments', FALSE),
  ('internal-comment-attachments', 'internal-comment-attachments', FALSE);

-- Storage policies
CREATE POLICY "users_upload_reports" ON storage.objects ...;
-- ... toutes les policies storage

COMMIT;
```

#### 2.2 Appliquer Migration
```bash
# Push vers Supabase
npx supabase db push

# Vérifier le schéma
npx supabase db remote exec "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Générer les types TypeScript
npm run supabase:types
```

### Étape 3: Migration Données (1-2 jours)

#### 3.1 Script de Migration de Données
```typescript
// scripts/migrate-data-to-v2.ts

import { createClient } from '@supabase/supabase-js'

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL!
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_SERVICE_KEY!
const NEW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const NEW_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const oldDB = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY)
const newDB = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY)

async function migrateData() {
  console.log('🚀 Début migration données...')

  // 1. Migrer teams
  console.log('📦 Migration teams...')
  const { data: teams } = await oldDB.from('teams').select('*')
  await newDB.from('teams').insert(teams)

  // 2. Migrer users
  console.log('👥 Migration users...')
  const { data: users } = await oldDB.from('users').select('*')
  await newDB.from('users').insert(users)

  // 3. Migrer buildings
  console.log('🏢 Migration buildings...')
  const { data: buildings } = await oldDB.from('buildings').select('*')
  await newDB.from('buildings').insert(buildings)

  // 4. Migrer lots
  console.log('🚪 Migration lots...')
  const { data: lots } = await oldDB.from('lots').select('*')
  await newDB.from('lots').insert(lots)

  // 5. Migrer interventions (avec conversion statuts)
  console.log('🔧 Migration interventions...')
  const { data: interventions } = await oldDB.from('interventions').select('*')

  // ✅ Pas besoin de conversion: déjà en français !
  await newDB.from('interventions').insert(interventions)

  // 6. Migrer contacts (building_contacts → entity_contacts)
  console.log('📋 Migration contacts...')
  const { data: buildingContacts } = await oldDB.from('building_contacts').select('*')
  const { data: lotContacts } = await oldDB.from('lot_contacts').select('*')
  const { data: interventionContacts } = await oldDB.from('intervention_contacts').select('*')

  // Conversion vers entity_contacts unifié
  const entityContacts = [
    ...buildingContacts.map(c => ({
      entity_type: 'building',
      entity_id: c.building_id,
      user_id: c.user_id,
      role: c.role
    })),
    ...lotContacts.map(c => ({
      entity_type: 'lot',
      entity_id: c.lot_id,
      user_id: c.user_id,
      role: c.role
    })),
    ...interventionContacts.map(c => ({
      entity_type: 'intervention',
      entity_id: c.intervention_id,
      user_id: c.user_id,
      role: c.role
    }))
  ]

  await newDB.from('entity_contacts').insert(entityContacts)

  // 7. Migrer quotes
  console.log('💰 Migration quotes...')
  const { data: quotes } = await oldDB.from('quotes').select('*')
  await newDB.from('quotes').insert(quotes)

  // 8. Rafraîchir vues matérialisées
  console.log('📊 Rafraîchissement analytics...')
  await newDB.rpc('refresh_provider_performance')

  console.log('✅ Migration terminée avec succès!')
}

migrateData().catch(console.error)
```

#### 3.2 Exécuter Migration
```bash
# Définir variables d'environnement temporaires
export OLD_SUPABASE_URL=https://ancienne-instance.supabase.co
export OLD_SUPABASE_SERVICE_KEY=ancienne_cle_service

# Exécuter script
npx tsx scripts/migrate-data-to-v2.ts

# Vérifier données migrées
npx supabase db remote exec "SELECT COUNT(*) FROM users;"
npx supabase db remote exec "SELECT COUNT(*) FROM interventions;"
```

### Étape 4: Adaptation Code Application (3-4 jours)

#### 4.1 Mettre à Jour Repositories
```typescript
// lib/services/repositories/intervention.repository.ts

// ❌ AVANT
async getInterventionContacts(interventionId: string) {
  const { data } = await this.client
    .from('intervention_contacts')
    .select('*, users(*)')
    .eq('intervention_id', interventionId)
  return data
}

// ✅ APRÈS
async getInterventionContacts(interventionId: string) {
  const { data } = await this.client
    .from('entity_contacts')
    .select('*, users(*)')
    .eq('entity_type', 'intervention')
    .eq('entity_id', interventionId)
  return data
}
```

#### 4.2 Supprimer Code de Conversion Statuts
```typescript
// ❌ SUPPRIMER: lib/intervention-status-converter.ts (315 lignes)
// ❌ SUPPRIMER: lib/intervention-status-labels-fr.ts

// ✅ GARDER: Statuts déjà en français dans la DB
type InterventionStatus = 'demande' | 'approuvee' | ... // Français direct
```

#### 4.3 Adapter Hooks
```typescript
// hooks/use-intervention-data.ts

// ❌ AVANT
const { data: interventions } = await supabase
  .from('interventions')
  .select('*')

for (const intervention of interventions) {
  const { data: contacts } = await supabase
    .from('intervention_contacts')
    .select('*, users(*)')
    .eq('intervention_id', intervention.id)

  intervention.contacts = contacts
}

// ✅ APRÈS (query optimisée avec join)
const { data: interventions } = await supabase
  .from('interventions')
  .select(`
    *,
    building:buildings(id, name, address),
    lot:lots(id, name),
    tenant:users!interventions_tenant_id_fkey(id, name, email),
    provider:users!interventions_assigned_provider_id_fkey(id, name, provider_rating),
    contacts:entity_contacts(
      role,
      user:users(id, name, email, phone, role)
    )
  `)
  .eq('entity_contacts.entity_type', 'intervention')

// ✅ 1 seule requête au lieu de N+1 !
```

### Étape 5: Tests Complets (2-3 jours)

#### 5.1 Tests Unitaires
```bash
# Tester les repositories
npm test lib/services/repositories/

# Tester les services
npm test lib/services/domain/

# Vérifier couverture
npm run test:coverage
```

#### 5.2 Tests E2E
```bash
# Tester workflows complets
npm run test:e2e:intervention-flow

# Tester multi-rôles
npm run test:e2e:gestionnaire
npm run test:e2e:prestataire
npm run test:e2e:locataire

# Tester nouvelles fonctionnalités
npm run test:e2e:chat
npm run test:e2e:reports
```

#### 5.3 Tests de Performance
```typescript
// tests/performance/dashboard-load.spec.ts
import { test, expect } from '@playwright/test'

test('Dashboard load < 200ms', async ({ page }) => {
  const startTime = Date.now()

  await page.goto('/gestionnaire/dashboard')
  await page.waitForSelector('[data-testid="dashboard-loaded"]')

  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(200) // ✅ Cible: < 200ms
  console.log(`Dashboard loaded in ${loadTime}ms`)
})
```

### Étape 6: Déploiement (1 jour)

#### 6.1 Mise en Production
```bash
# 1. Vérifier build production
npm run build

# 2. Déployer sur Vercel/autre
vercel --prod

# 3. Vérifier santé application
curl https://seido-app.vercel.app/api/health

# 4. Monitorer logs
vercel logs --follow
```

#### 6.2 Validation Post-Déploiement
- ✅ Tous les dashboards se chargent correctement
- ✅ Créer une intervention de test (workflow complet)
- ✅ Tester chat temps réel
- ✅ Soumettre un rapport d'intervention
- ✅ Vérifier analytics (vues matérialisées)

---

## 📋 Checklist de Migration

### Pré-Migration
- [ ] Sauvegarde complète de l'ancienne DB
- [ ] Export CSV des données critiques
- [ ] Nouvelle instance Supabase créée
- [ ] `.env.local` mis à jour avec nouvelles clés
- [ ] Test de connexion à la nouvelle DB

### Migration Schéma
- [ ] Migration initiale consolidée créée
- [ ] Migration appliquée avec `npx supabase db push`
- [ ] Types TypeScript générés avec `npm run supabase:types`
- [ ] Toutes les tables créées (vérifiées)
- [ ] Tous les index créés
- [ ] Toutes les RLS policies actives
- [ ] Storage buckets créés

### Migration Données
- [ ] Script de migration testé en local
- [ ] Teams migrées
- [ ] Users migrées
- [ ] Buildings migrées
- [ ] Lots migrées
- [ ] Interventions migrées
- [ ] Contacts unifiés dans entity_contacts
- [ ] Quotes migrées
- [ ] Vues matérialisées rafraîchies

### Adaptation Code
- [ ] Repositories mis à jour
- [ ] Code conversion statuts supprimé
- [ ] Hooks optimisés (N+1 éliminés)
- [ ] Types TypeScript mis à jour
- [ ] Services adaptés

### Tests
- [ ] Tests unitaires passent (100%)
- [ ] Tests E2E passent (100%)
- [ ] Tests de performance validés
- [ ] Pas de régressions détectées

### Déploiement
- [ ] Build production réussie
- [ ] Application déployée
- [ ] Santé vérifiée
- [ ] Logs surveillés
- [ ] Validation utilisateur réelle

---

## 🎯 Résumé des Bénéfices

### Performance
- ✅ **-98% temps de chargement dashboard** (2200ms → 45ms)
- ✅ **-99% nombre de requêtes** (151 → 1 pour liste immeubles)
- ✅ **-87% latence interventions** (450ms → 60ms)

### Architecture
- ✅ **Single Source of Truth** : Statuts FR uniquement (-315 lignes)
- ✅ **Table unifiée contacts** : -67% de tables (1 au lieu de 3)
- ✅ **Dénormalisation stratégique** : Compteurs pré-calculés
- ✅ **Soft delete généralisé** : Audit trail complet

### Fonctionnalités
- ✅ **Chat temps réel** : Communication instantanée
- ✅ **Commentaires internes** : Collaboration gestionnaires
- ✅ **Rapports structurés** : Analytics automatiques

### Analytics
- ✅ **Vues matérialisées** : Métriques temps réel
- ✅ **Performance prestataires** : Rankings automatiques
- ✅ **Dashboard metrics** : KPIs pré-calculés

### Maintenance
- ✅ **Code simplifié** : -40% de complexité
- ✅ **Tests automatisés** : 100% couverture critique
- ✅ **Extensibilité** : Architecture modulaire

---

## 📚 Prochaines Étapes

1. **Validation Architecture** : Revoir ce document et valider l'approche
2. **Priorités Fonctionnalités** : Décider quelles nouvelles features implémenter en premier
3. **Planning Migration** : Bloquer 7-10 jours pour migration complète
4. **Création Migration SQL** : Générer le fichier de migration consolidé
5. **Tests Locaux** : Valider schéma en environnement local
6. **Migration Progressive** : Suivre le plan étape par étape

---

**Statut**: 🎯 **EN ATTENTE VALIDATION**
**Prochaine Action**: Revoir architecture proposée et confirmer plan de migration
