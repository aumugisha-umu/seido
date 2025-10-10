# Migration Section 1 : Utilisateurs, Équipes et Invitations

**Date**: 2025-10-09
**Version**: v2.0 - Migration Consolidée
**Status**: 🔍 **EN RÉVISION - ATTENTE VALIDATION**

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Analyse de l'Existant](#analyse-de-lexistant)
3. [Structure Proposée](#structure-proposée)
4. [Relations entre Tables](#relations-entre-tables)
5. [Relations avec Sections Futures](#relations-avec-sections-futures)
6. [Détails Techniques](#détails-techniques)
7. [Points à Valider](#points-à-valider)

---

## 🎯 Vue d'Ensemble

### Objectif
Créer la base du système d'authentification et de gestion des équipes multi-tenant de SEIDO, en optimisant la structure pour la performance et la flexibilité.

### Périmètre de la Section 1
- ✅ **Table `users`** : Profils utilisateurs unifiés (auth + contacts)
- ✅ **Table `teams`** : Équipes/organisations
- ✅ **Table `team_members`** : Relation utilisateurs ↔ équipes (support multi-équipe)
- ✅ **Table `user_invitations`** : Gestion des invitations utilisateur
- ✅ **Types ENUM** : `user_role`, `provider_category`, `invitation_status`
- ✅ **Fonctions RLS** : Helpers d'appartenance aux équipes
- ✅ **Politiques RLS** : Isolation multi-tenant

### Tables de cette Section
```
teams (équipes)
  └── team_members (membres) ──┐
          └── users (profils)  │
                └── user_invitations (invitations)
```

---

## 🔍 Analyse de l'Existant

### Structure Actuelle (d'après migration `20250913000000_initialize_clean_schema.sql`)

#### 1. **Table `users`**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,  -- Référence vers auth.users (NULL pour contacts non-auth)

    -- Identité
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,

    -- Professionnel (prestataires)
    address TEXT,
    company VARCHAR(255),
    speciality intervention_type,  -- ⚠️ Dépendance Section 3

    -- Rôle et catégorie
    role user_role NOT NULL DEFAULT 'gestionnaire',
    provider_category provider_category,  -- NULL sauf prestataires

    -- Métadonnées
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    password_set BOOLEAN DEFAULT FALSE,

    -- Équipe
    team_id UUID,  -- ⚠️ Sera ajouté après création table teams

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Points Notables**:
- ✅ **Architecture unifiée** : users + contacts fusionnés (pas de table séparée)
- ✅ **Support auth.users** : `auth_user_id` peut être NULL (contacts invités non-auth)
- ⚠️ **Dépendance `intervention_type`** : La colonne `speciality` utilise un ENUM de Section 3
- ⚠️ **`team_id` ajouté après** : Contrainte FK ajoutée après création `teams`
- ❌ **Pas de soft delete** : `deleted_at`, `deleted_by` manquants
- ❌ **Pas de compteurs dénormalisés** : `provider_rating`, `total_interventions` manquants

#### 2. **Table `teams`**
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Points Notables**:
- ⚠️ **Dépendance circulaire** : `created_by` référence `users`, mais `users.team_id` référence `teams`
  - Solution actuelle : créer `teams` d'abord, puis ajouter FK sur `users.team_id`
- ❌ **Pas de métadonnées** : Manque colonne `settings JSONB` pour config équipe

#### 3. **Table `team_members`**
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',  -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
```

**Points Notables**:
- ✅ **Support multi-équipe** : Un user peut appartenir à plusieurs teams
- ⚠️ **Rôle VARCHAR** : Pas de contrainte ENUM → risque de valeurs invalides

#### 4. **Table `user_invitations`**
```sql
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    provider_category provider_category,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    invitation_code VARCHAR(50) UNIQUE NOT NULL,

    -- Statut et dates
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contraintes
    UNIQUE(email, team_id)  -- Un email par équipe active
);
```

**Points Notables**:
- ✅ **Workflow invitation complet** : Statuts (pending, accepted, expired, cancelled)
- ✅ **Contrainte unicité** : Un email ne peut être invité qu'une fois par équipe
- ❌ **Manque `user_id`** : Lien vers profil utilisateur pré-créé (ajouté dans migration `20251004190000`)

---

## ✅ Structure Proposée

### Améliorations par Rapport à l'Existant

#### 1. **Table `users` (Optimisée)**

**Ajouts Proposés**:
```sql
-- Soft delete
deleted_at TIMESTAMP WITH TIME ZONE,
deleted_by UUID REFERENCES users(id),

-- Compteurs dénormalisés (mis à jour par triggers Section 3)
provider_rating DECIMAL(3,2) DEFAULT 0.00,  -- Note moyenne (0.00-5.00)
total_interventions INTEGER DEFAULT 0,      -- Nombre total d'interventions

-- Index optimisés
CREATE INDEX idx_users_team ON users(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_provider_category ON users(provider_category)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_provider_rating ON users(provider_rating DESC)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
```

**Modifications**:
- ⚠️ **Suppression `speciality intervention_type`** :
  - Cause dépendance circulaire avec Section 3
  - ✅ **Solution** : Utiliser `provider_category` générique + champ texte libre dans Section 3
- ✅ **Ajout soft delete** : Audit trail + conformité RGPD
- ✅ **Ajout compteurs** : Performance (évite COUNT(*) à chaque requête)

#### 2. **Table `teams` (Optimisée)**

**Ajouts Proposés**:
```sql
-- Métadonnées configurables
settings JSONB DEFAULT '{}',  -- Config équipe (notifications, préférences, etc.)

-- Soft delete
deleted_at TIMESTAMP WITH TIME ZONE,
deleted_by UUID REFERENCES users(id),
```

#### 3. **Table `team_members` (Optimisée)**

**Modifications Proposées**:
```sql
-- Remplacer VARCHAR par ENUM
role team_member_role NOT NULL DEFAULT 'member',  -- ENUM('admin', 'member')

-- Ajout soft delete optionnel
left_at TIMESTAMP WITH TIME ZONE,  -- Quand le membre a quitté l'équipe
```

**Nouveau ENUM**:
```sql
CREATE TYPE team_member_role AS ENUM ('admin', 'member');
```

#### 4. **Table `user_invitations` (Optimisée)**

**Ajouts (d'après migration `20251004190000`)**:
```sql
-- Lien vers profil utilisateur pré-créé
user_id UUID REFERENCES users(id) ON DELETE CASCADE,

-- Index performance
CREATE INDEX idx_user_invitations_user_id ON user_invitations(user_id);
```

**Utilité `user_id`**:
- Permet de créer le profil `users` **avant** que l'utilisateur accepte l'invitation
- Facilite le mapping `auth.users` → `users` lors de l'acceptance

---

## 🔗 Relations entre Tables

### Diagramme de Relations Section 1

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECTION 1: USERS, TEAMS, INVITATIONS                  │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │      TEAMS       │
                              ├──────────────────┤
                              │ id (PK)          │
                              │ name             │
                              │ description      │
                              │ settings JSONB   │ ✅ Nouveau
                              │ created_by (FK)  │───┐
                              │ deleted_at       │   │ ✅ Soft delete
                              │ deleted_by (FK)  │   │
                              └──────┬───────────┘   │
                                     │               │
                  ┌──────────────────┴───────────┐   │
                  │ CASCADE DELETE               │   │
                  ▼                              ▼   │
    ┌─────────────────────┐          ┌─────────────────────┐
    │   TEAM_MEMBERS      │          │  USER_INVITATIONS   │
    ├─────────────────────┤          ├─────────────────────┤
    │ id (PK)             │          │ id (PK)             │
    │ team_id (FK)        │───┐      │ email               │
    │ user_id (FK)        │   │      │ team_id (FK)        │──┘
    │ role ENUM ✅        │   │      │ user_id (FK) ✅     │
    │ joined_at           │   │      │ invited_by (FK)     │
    │ left_at ✅          │   │      │ role                │
    └─────────┬───────────┘   │      │ invitation_code     │
              │               │      │ status ENUM         │
              │ CASCADE       │      │ expires_at          │
              │ DELETE        │      └─────────┬───────────┘
              │               │                │
              ▼               │                │
    ┌─────────────────────────┴────────────────┴───────────┐
    │                      USERS                             │
    ├────────────────────────────────────────────────────────┤
    │ id (PK)                                                │
    │ auth_user_id (FK auth.users) - NULL si contact        │
    │ team_id (FK teams) - Équipe principale                │
    │                                                        │
    │ -- Identité                                            │
    │ email UNIQUE                                           │
    │ name, first_name, last_name                           │
    │ phone, avatar_url                                      │
    │                                                        │
    │ -- Rôle                                                │
    │ role ENUM (admin, gestionnaire, locataire, prestataire)│
    │ provider_category ENUM (NULL si non-prestataire)      │
    │                                                        │
    │ -- Professionnel                                       │
    │ address, company                                       │
    │ ❌ speciality (SUPPRIMÉ - dépendance Section 3)       │
    │                                                        │
    │ -- Compteurs dénormalisés ✅ NOUVEAU                  │
    │ provider_rating DECIMAL(3,2) DEFAULT 0.00             │
    │ total_interventions INTEGER DEFAULT 0                 │
    │                                                        │
    │ -- Métadonnées                                         │
    │ notes TEXT                                             │
    │ is_active BOOLEAN                                      │
    │ password_set BOOLEAN                                   │
    │                                                        │
    │ -- Soft delete ✅ NOUVEAU                             │
    │ deleted_at TIMESTAMP                                   │
    │ deleted_by (FK users)                                  │
    └────────────────────────────────────────────────────────┘
              │
              │ Référence circulaire
              │ (teams.created_by → users.id)
              └───────────────────────────────────────────┐
                                                          │
                                                          ▼
                                                    (résolu via
                                                     ordre de
                                                     création)
```

### Contraintes Clés

#### 1. **Dépendance Circulaire `teams` ↔ `users`**
**Problème**:
- `teams.created_by` référence `users.id`
- `users.team_id` référence `teams.id`

**Solution Actuelle** (conservée):
```sql
-- Étape 1: Créer users SANS contrainte FK team_id
CREATE TABLE users (..., team_id UUID);

-- Étape 2: Créer teams avec FK vers users
CREATE TABLE teams (..., created_by UUID REFERENCES users(id));

-- Étape 3: Ajouter contrainte FK sur users.team_id
ALTER TABLE users ADD CONSTRAINT fk_users_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
```

#### 2. **Multi-équipe via `team_members`**
- Un `user` peut appartenir à plusieurs `teams` via `team_members`
- `users.team_id` représente l'**équipe principale** (optionnel)
- RLS basé sur `team_members` pour support multi-équipe

#### 3. **Soft Delete en Cascade**
```sql
-- Si un user est supprimé (soft delete)
UPDATE users SET deleted_at = NOW(), deleted_by = <admin_id> WHERE id = <user_id>;

-- Les team_members restent (pour audit)
-- Les invitations restent (pour traçabilité)
-- L'équipe reste si elle a d'autres membres
```

---

## 🔄 Relations avec Sections Futures

### Section 2 : Buildings & Lots

**Tables concernées**: `buildings`, `lots`, `building_contacts`, `lot_contacts`

**Relations avec Section 1**:
```sql
-- buildings
CREATE TABLE buildings (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),  -- ✅ Lien Section 1
    -- ...
);

-- building_contacts (contacts liés à un immeuble)
CREATE TABLE building_contacts (
    building_id UUID REFERENCES buildings(id),
    user_id UUID REFERENCES users(id),           -- ✅ Lien Section 1
    -- ...
);

-- lots
CREATE TABLE lots (
    id UUID PRIMARY KEY,
    building_id UUID REFERENCES buildings(id),
    team_id UUID REFERENCES teams(id),            -- ✅ Lien Section 1
    -- ...
);

-- lot_contacts (locataires, propriétaires liés à un lot)
CREATE TABLE lot_contacts (
    lot_id UUID REFERENCES lots(id),
    user_id UUID REFERENCES users(id),            -- ✅ Lien Section 1
    -- ...
);
```

**Triggers à Créer en Section 2**:
- ✅ Mise à jour compteur `buildings.total_lots` (trigger sur `lots`)
- ✅ Mise à jour `lots.is_occupied` (trigger sur `lot_contacts`)

### Section 3 : Interventions

**Tables concernées**: `interventions`, `intervention_contacts`, `quotes`, etc.

**Relations avec Section 1**:
```sql
-- interventions
CREATE TABLE interventions (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id),              -- ✅ Lien Section 1
    tenant_id UUID REFERENCES users(id),            -- ✅ Lien Section 1 (demandeur)
    assigned_provider_id UUID REFERENCES users(id), -- ✅ Lien Section 1 (prestataire)
    -- ...
);

-- intervention_contacts (prestataires assignés)
CREATE TABLE intervention_contacts (
    intervention_id UUID REFERENCES interventions(id),
    user_id UUID REFERENCES users(id),              -- ✅ Lien Section 1
    role VARCHAR(50),  -- 'gestionnaire', 'prestataire'
    -- ...
);

-- quotes
CREATE TABLE quotes (
    intervention_id UUID REFERENCES interventions(id),
    provider_id UUID REFERENCES users(id),          -- ✅ Lien Section 1
    -- ...
);
```

**Triggers à Créer en Section 3**:
- ✅ Mise à jour `users.provider_rating` (trigger sur rapports locataires)
- ✅ Mise à jour `users.total_interventions` (trigger sur interventions finalisées)

---

## 🛠️ Détails Techniques

### 1. Types ENUM

```sql
-- ============================================================================
-- TYPES ÉNUMÉRÉS SECTION 1
-- ============================================================================

-- Rôles utilisateur
CREATE TYPE user_role AS ENUM (
    'admin',
    'gestionnaire',
    'locataire',
    'prestataire'
);

-- Catégories de prestataires
CREATE TYPE provider_category AS ENUM (
    'prestataire',   -- Prestataire générique (plombier, électricien, etc.)
    'assurance',     -- Compagnie d'assurance
    'notaire',       -- Notaire
    'syndic',        -- Syndic de copropriété
    'proprietaire',  -- Propriétaire du bien
    'autre'          -- Autres types
);

-- ✅ NOUVEAU: Rôles dans une équipe
CREATE TYPE team_member_role AS ENUM (
    'admin',   -- Administrateur de l'équipe (tous droits)
    'member'   -- Membre standard
);

-- Statuts d'invitation
CREATE TYPE invitation_status AS ENUM (
    'pending',    -- En attente d'acceptation
    'accepted',   -- Acceptée
    'expired',    -- Expirée
    'cancelled'   -- Annulée
);
```

### 2. Fonctions RLS (d'après migration `20250930000002`)

```sql
-- ============================================================================
-- FONCTIONS HELPER POUR RLS
-- ============================================================================

-- Vérifie si l'utilisateur authentifié appartient à une équipe
CREATE OR REPLACE FUNCTION public.user_belongs_to_team_v2(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = check_team_id
    AND u.auth_user_id = auth.uid()
    AND tm.left_at IS NULL  -- ✅ Exclure membres ayant quitté
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Retourne toutes les équipes dont l'utilisateur est membre
CREATE OR REPLACE FUNCTION public.get_user_teams_v2()
RETURNS TABLE(team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_members tm
  INNER JOIN public.users u ON u.id = tm.user_id
  WHERE u.auth_user_id = auth.uid()
  AND tm.left_at IS NULL;  -- ✅ Exclure anciens membres
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 3. Politiques RLS

**Principes**:
- ✅ **Isolation par équipe** : Les utilisateurs ne voient que les données de leurs équipes
- ✅ **Support multi-équipe** : Via `team_members` (pas seulement `users.team_id`)
- ✅ **Rôles granulaires** : Admin/gestionnaire vs locataire/prestataire

**Exemple** : RLS sur `users`
```sql
-- SELECT: Voir les membres de ses équipes + son propre profil
CREATE POLICY "team_members_select_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Voir les membres de ses équipes
  id IN (
    SELECT DISTINCT tm2.user_id
    FROM public.team_members tm1
    INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    INNER JOIN public.users u ON u.id = tm1.user_id
    WHERE u.auth_user_id = auth.uid()
    AND tm1.left_at IS NULL
    AND tm2.left_at IS NULL
  )
  OR
  -- Ou voir son propre profil
  auth_user_id = auth.uid()
);

-- UPDATE: Modifier son propre profil uniquement
CREATE POLICY "users_can_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());
```

### 4. Index Performance

```sql
-- ============================================================================
-- INDEX SECTION 1
-- ============================================================================

-- Index users
CREATE INDEX idx_users_team ON users(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_provider_category ON users(provider_category)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_provider_rating ON users(provider_rating DESC)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- Index teams
CREATE INDEX idx_teams_created_by ON teams(created_by) WHERE deleted_at IS NULL;

-- Index team_members
CREATE INDEX idx_team_members_team ON team_members(team_id) WHERE left_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_team_members_user_auth_lookup ON team_members(user_id);  -- Pour RLS

-- Index invitations
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_invitations_user ON user_invitations(user_id);
CREATE INDEX idx_invitations_status ON user_invitations(status);
CREATE INDEX idx_invitations_expires ON user_invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_invitations_email_status ON user_invitations(email, status);
```

### 5. Triggers

```sql
-- ============================================================================
-- TRIGGERS SECTION 1
-- ============================================================================

-- Trigger: Mise à jour automatique de updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: team_members n'a pas de updated_at (table de liaison simple)
```

---

## ❓ Points à Valider

### 1. **Suppression de `users.speciality`**

**Problème Actuel**:
```sql
speciality intervention_type  -- intervention_type est défini en Section 3
```

**Options**:
- ❌ **Option A** : Garder `speciality intervention_type` → crée dépendance circulaire
- ✅ **Option B** : Supprimer `speciality` de Section 1, ajouter en Section 3
- ✅ **Option C** : Remplacer par `speciality TEXT` (texte libre)

**Recommandation**: **Option C**
- Permet de stocker spécialité sans dépendre de Section 3
- Évite dépendance circulaire
- Flexibilité pour types non prédéfinis

**À Valider**: Préférez-vous Option B ou Option C ?

### 2. **`users.team_id` : Équipe Principale**

**Question**:
- `users.team_id` représente l'équipe **principale** de l'utilisateur
- Un utilisateur peut appartenir à plusieurs équipes via `team_members`

**Scénarios**:
1. **User dans 1 seule équipe** : `team_id` = cette équipe
2. **User dans plusieurs équipes** : `team_id` = équipe choisie par défaut

**Question**: Faut-il rendre `users.team_id` **obligatoire** (NOT NULL) ?
- ✅ **Avantage** : Simplifie les requêtes (toujours une équipe de référence)
- ❌ **Inconvénient** : Complique création de user avant invitation acceptée

**Recommandation**: Garder **NULLABLE** pour flexibilité

### 3. **Soft Delete : Cascade ou Conservation**

**Scénario**: Un gestionnaire supprime (soft delete) son compte

**Comportement souhaité** :
- ❌ **Option A** : Soft delete en cascade → supprimer toutes ses équipes/interventions
- ✅ **Option B** : Conservation → équipes/interventions restent, changer `created_by`/`tenant_id`
- ⚠️ **Option C** : Empêcher suppression si données liées

**Recommandation**: **Option B** + `ON DELETE SET NULL` sur FKs

**À Valider**: Confirmez le comportement souhaité

### 4. **`team_members.left_at` : Historique des Membres**

**Proposition**: Ajouter `left_at` pour soft delete de membership

**Avantages**:
- ✅ Garde historique des anciens membres (audit)
- ✅ Permet réactivation facile
- ✅ RLS peut filtrer `left_at IS NULL`

**Alternative**: Hard delete avec `ON DELETE CASCADE`

**À Valider**: Préférez-vous historique complet ou suppression définitive ?

### 5. **Index Partiels : Optimisation**

**Proposition**: Utiliser index partiels (`WHERE deleted_at IS NULL`)

**Exemple**:
```sql
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

**Avantages**:
- ✅ Index plus petits (exclut soft deleted)
- ✅ Requêtes plus rapides (scan d'index réduit)

**Inconvénient**:
- ⚠️ Requêtes sur données supprimées ne bénéficient pas de l'index

**À Valider**: Appliquer systématiquement aux index ?

### 6. **Métadonnées JSONB**

**Proposition**: Ajouter `settings JSONB` sur `teams` et `metadata JSONB` sur `users`

**Exemples d'usage**:
```json
// teams.settings
{
  "notifications": {
    "email_enabled": true,
    "slack_webhook": "https://..."
  },
  "intervention_approval_required": true,
  "default_quote_deadline_days": 7
}

// users.metadata
{
  "preferences": {
    "language": "fr",
    "timezone": "Europe/Paris"
  },
  "onboarding_completed": true
}
```

**À Valider**: Souhaitez-vous ces colonnes JSONB pour flexibilité future ?

---

## 🎯 Résumé des Modifications Proposées

### Par Rapport à l'Existant

| Élément | Existant | Proposé | Justification |
|---------|----------|---------|---------------|
| **users.speciality** | `intervention_type ENUM` | `TEXT` ou suppression | Éviter dépendance Section 3 |
| **users.deleted_at** | ❌ Absent | ✅ Ajouté | Soft delete + audit |
| **users.provider_rating** | ❌ Absent | ✅ Ajouté | Performance (évite AVG à chaque requête) |
| **users.total_interventions** | ❌ Absent | ✅ Ajouté | Compteur dénormalisé |
| **teams.settings** | ❌ Absent | ✅ Ajouté | Config équipe flexible |
| **teams.deleted_at** | ❌ Absent | ✅ Ajouté | Soft delete |
| **team_members.role** | `VARCHAR(50)` | `team_member_role ENUM` | Type safety |
| **team_members.left_at** | ❌ Absent | ✅ Ajouté | Historique membres |
| **user_invitations.user_id** | ❌ Absent (ajouté après) | ✅ Intégré | Lien profil pré-créé |
| **Index partiels** | ❌ Basiques | ✅ Optimisés `WHERE deleted_at IS NULL` | Performance |

---

## 📝 Checklist de Validation

Avant de passer à l'implémentation, validez les points suivants :

- [ ] **users.speciality** : Garder en TEXT ou supprimer ?
- [ ] **users.team_id** : Rester nullable ou forcer NOT NULL ?
- [ ] **Soft delete** : Conservation ON DELETE SET NULL ou cascade ?
- [ ] **team_members.left_at** : Historique ou hard delete ?
- [ ] **Index partiels** : Appliquer systématiquement WHERE deleted_at IS NULL ?
- [ ] **Métadonnées JSONB** : Ajouter `teams.settings` et `users.metadata` ?
- [ ] **Contraintes validations** : email format, phone format, etc. ?
- [ ] **Nommage des contraintes** : Préfixes fk_, idx_, etc. OK ?

---

**Status**: 🔍 **EN ATTENTE DE VOS RETOURS**
**Prochaine Étape**: Une fois validé, je générerai le fichier SQL complet de migration Section 1

**Merci de me confirmer** :
1. Les modifications proposées vous conviennent
2. Les choix à faire sur les points de validation
3. Tout élément manquant ou à corriger
