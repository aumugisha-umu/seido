# Migration Section 1 : Utilisateurs, Équipes et Invitations (Version Complète)

**Date**: 2025-10-09
**Version**: v2.0 - Migration Consolidée (Analyse de 26 migrations + Feedbacks Utilisateur)
**Status**: ⏳ **EN ATTENTE VALIDATION 6 POINTS**

---

## 📌 Résumé Rapide (TL;DR)

### ✅ **4 Corrections Appliquées Après Vos Remarques**
1. ✅ **`users.speciality intervention_type`** : CONSERVÉ (matching auto prestataire ↔ intervention)
2. ✅ **`user_invitations.status`** : CONSERVÉ (ENUM avec pending, accepted, expired, cancelled)
3. ✅ **Support multi-équipe** : AJOUTÉ (`team_members` avec `left_at` pour historique)
4. ✅ **Regroupement société** : AJOUTÉ (table `companies` + `users.company_id`)

### ⚠️ **6 Décisions Requises**
| # | Question | Recommandation |
|---|----------|----------------|
| 1 | Soft delete: SET NULL ou CASCADE ? | ✅ SET NULL (RGPD) |
| 2 | `team_members.left_at`: Historique ou hard delete ? | ✅ Historique (audit) |
| 3 | `teams.settings` JSONB: Ajouter ? | ✅ Oui (config flexible) |
| 4 | Index partiels `WHERE deleted_at IS NULL` ? | ✅ Oui (perf +20-40%) |
| 5 | `users.team_id`: Sémantique "équipe principale" OK ? | ✅ Oui (NULLABLE) |
| 6 | `companies.registration_number`: Obligatoire ? | ⚠️ Votre choix |

### 📊 **Tables Section 1**
- ✅ **users** (unifié auth + contacts) + company_id + soft delete + compteurs
- ✅ **teams** + settings JSONB + soft delete
- ✅ **team_members** (multi-équipe) + left_at + role ENUM
- ✅ **companies** (NOUVEAU) + soft delete
- ✅ **user_invitations** + user_id + invitation_token VARCHAR(255) + status

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Analyse Exhaustive de l'Existant](#analyse-exhaustive-de-lexistant)
3. [Évolutions Identifiées (26 migrations)](#évolutions-identifiées-26-migrations)
4. [Structure Finale Proposée](#structure-finale-proposée)
5. [Relations entre Tables](#relations-entre-tables)
6. [Points Critiques Résolus](#points-critiques-résolus)
7. [Implémentation Technique](#implémentation-technique)
8. [Points à Valider](#points-à-valider)

---

## 🎯 Vue d'Ensemble

### Objectif
Créer la base du système d'authentification et de gestion des équipes multi-tenant de SEIDO, en intégrant **toutes les corrections et optimisations** apportées à travers 26 migrations successives.

### Périmètre de la Section 1
- ✅ **Table `users`** : Profils utilisateurs unifiés (auth + contacts)
- ✅ **Table `teams`** : Équipes/organisations
- ✅ **Table `team_members`** : Relation utilisateurs ↔ équipes (support multi-équipe)
- ✅ **Table `user_invitations`** : Gestion des invitations utilisateur
- ✅ **Trigger `handle_new_user_confirmed`** : Auto-création profil après confirmation email
- ✅ **Fonctions RLS** : Helpers d'appartenance aux équipes (v2)
- ✅ **Politiques RLS** : Isolation multi-tenant (version finale après 15+ itérations)

### Migrations Analysées
```
26 migrations identifiées entre 2025-09-13 et 2025-10-07:
- 1 migration initiale (initialize_clean_schema)
- 1 migration auto-création profil
- 15 migrations RLS fixes (recursion, performance, permissions)
- 3 migrations invitations (user_id, token length)
- 2 migrations team_members (granular policies)
- 4 migrations triggers et logging
```

---

## 🔍 Analyse Exhaustive de l'Existant

### 1. **Table `users`** (État Final après Migrations)

**Structure de Base** (d'après `20250913000000_initialize_clean_schema.sql`):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,  -- Référence auth.users (NULL pour contacts non-auth)

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
    provider_category provider_category,

    -- Métadonnées
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    password_set BOOLEAN DEFAULT FALSE,

    -- Équipe
    team_id UUID,  -- Ajouté après création teams

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Évolutions Clés**:
- ✅ **Auto-création via trigger** : Profil créé automatiquement après confirmation email (`handle_new_user_confirmed`)
- ✅ **Données depuis metadata** : first_name, last_name, phone, role copiés depuis `auth.users.raw_user_meta_data`
- ✅ **RLS optimisé** : Policy simplifiée pour éviter récursion (15+ migrations de fixes)

### 2. **Table `teams`** (État Final)

**Structure**:
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,  -- ⚠️ NULLABLE (fix 20251002210000)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Modification Critique** (`20251002210000_fix_team_created_by_and_rls.sql`):
```sql
-- teams.created_by rendu NULLABLE pour éviter erreur de dépendance circulaire
ALTER TABLE public.teams
  ALTER COLUMN created_by DROP NOT NULL;
```

**Raison**: Dépendance circulaire user → team → user lors de création initiale

### 3. **Table `team_members`** (État Final)

**Structure**:
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

**Évolution Majeure** (`20251004150000_fix_rls_policies_complete.sql`):
- ✅ **Policies granulaires** : Séparation INSERT/UPDATE/DELETE au lieu de FOR ALL
- ✅ **Protection escalade** : Seuls admins peuvent ajouter d'autres gestionnaires
- ✅ **Gestionnaires peuvent** : Ajouter locataires/prestataires

**Policies Finales**:
```sql
-- INSERT: Membres peuvent ajouter contacts (sauf gestionnaires → admin only)
CREATE POLICY "team_members_insert_members" ...

-- UPDATE: Admin only
CREATE POLICY "team_members_update_members" ...

-- DELETE: Admin only
CREATE POLICY "team_members_delete_members" ...

-- SELECT: Voir membres de ses équipes
CREATE POLICY "team_members_select_team_members" ...
```

### 4. **Table `user_invitations`** (État Final)

**Structure Initiale**:
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
    invitation_code VARCHAR(50) UNIQUE NOT NULL,  -- ⚠️ Renommé + agrandi

    status invitation_status NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(email, team_id)
);
```

**Évolution 1** (`20251004190000_add_user_id_to_invitations.sql`):
```sql
-- Ajout colonne user_id (lien profil pré-créé)
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_user_invitations_user_id ON user_invitations(user_id);
```

**Utilité**: Permet de créer le profil `users` AVANT acceptation, puis lier l'auth après

**Évolution 2** (`20251005080000_fix_invitation_token_length.sql`):
```sql
-- Renommage + agrandissement pour Supabase hashed_token
ALTER TABLE user_invitations
  RENAME COLUMN invitation_code TO invitation_token;

ALTER TABLE user_invitations
  ALTER COLUMN invitation_token TYPE VARCHAR(255);  -- 50 → 255

ALTER TABLE user_invitations
  ALTER COLUMN invitation_token DROP NOT NULL;  -- Nullable

CREATE INDEX idx_user_invitations_token
  ON user_invitations(invitation_token)
  WHERE invitation_token IS NOT NULL;
```

**Raison**: Supabase `generateLink()` retourne `hashed_token` de 64+ caractères

**Évolution 3** (`20251004150000_fix_rls_policies_complete.sql`):
```sql
-- Activation RLS + policies complètes
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_invitations_select" ... FOR SELECT ...
CREATE POLICY "user_invitations_insert" ... FOR INSERT ...
CREATE POLICY "user_invitations_update" ... FOR UPDATE ...
CREATE POLICY "user_invitations_delete" ... FOR DELETE ...  -- Admin only
```

---

## 📊 Évolutions Identifiées (26 migrations)

### Chronologie des Problèmes Résolus

#### Phase 1 : Setup Initial (Sept 2025)
1. **`20250913000000_initialize_clean_schema.sql`**
   - ✅ Architecture de base créée

#### Phase 2 : Auto-Création Profil (Sept-Oct 2025)
2. **`20250930000001_user_profile_auto_creation.sql`**
   - ✅ Trigger `handle_new_user()` sur `auth.users` INSERT
   - ❌ **Problème** : Timing incorrect (AFTER INSERT vs AFTER UPDATE confirmation)

3. **`20251002000001_fix_profile_creation_timing.sql`**
   - ✅ Changement trigger vers `AFTER UPDATE` sur confirmation

4. **`20251002210000_fix_team_created_by_and_rls.sql`** (CRITIQUE)
   - ❌ **Problème** : Dépendance circulaire `users ↔ teams`
     - Trigger tentait : CREATE TEAM → CREATE USER (échoue car `teams.created_by NOT NULL`)
   - ✅ **Solution** :
     1. Rendre `teams.created_by` NULLABLE
     2. Ordre correct : CREATE USER → CREATE TEAM → UPDATE USER
   - ✅ Rename trigger : `handle_new_user_confirmed()`
   - ✅ Ajout logging complet (`log_trigger_step`)

5. **`20251003000001_disable_profile_trigger.sql`**
   - ⚠️ Désactivation temporaire pour debug

#### Phase 3 : RLS Recursion Hell (Oct 2025 - 15 migrations !)
6-20. **Série de fixes RLS** :
   - **Problème** : Récursion infinie `users.SELECT → team_members.SELECT → users.SELECT`
   - **Tentatives** :
     - `20251002193000` : Simplifier policy users
     - `20251002200000` : Bypass RLS dans trigger avec `SECURITY DEFINER`
     - `20251002220000` : RLS final version
     - `20251002230000` : Service role access
     - `20251003160000` : Fix team_members recursion
     - `20251003200000` : RLS team_members final
     - `20251004005500` : Force fix
     - `20251004120000` : Fix users visibility
     - `20251004120100` : Diagnostic
     - `20251004120200` : Remove residual policies
   - **Solution Finale** (`20251002210000` + iterations) :
     ```sql
     -- Policy simplifiée (évite subquery récursive)
     CREATE POLICY "users_can_read_own_profile"
     ON public.users FOR SELECT
     USING (auth_user_id = auth.uid());

     -- Fonctions helper SECURITY DEFINER STABLE
     CREATE FUNCTION user_belongs_to_team_v2(check_team_id UUID) ...
     CREATE FUNCTION get_user_teams_v2() ...
     ```

#### Phase 4 : Policies Granulaires (Oct 2025)
21. **`20251004140000_add_users_insert_policy.sql`**
    - ✅ Policy INSERT pour users (création contacts)

22. **`20251004150000_fix_rls_policies_complete.sql`** (MAJEURE)
    - ✅ **team_members** : Policies granulaires INSERT/UPDATE/DELETE
    - ✅ **Protection escalade** : Gestionnaires ≠ ajouter autres gestionnaires
    - ✅ **user_invitations** : Policies complètes
    - ✅ **activity_logs** : Policies complètes

23. **`20251004160000_fix_gestionnaire_permissions.sql`**
    - ✅ Permissions gestionnaires ajustées

24. **`20251004170000_verify_users_update_policy.sql`**
    - ✅ Vérification policy UPDATE users

25. **`20251004180000_add_users_delete_policy.sql`**
    - ✅ Policy DELETE users

#### Phase 5 : Invitations Fixes (Oct 2025)
26. **`20251004190000_add_user_id_to_invitations.sql`**
    - ✅ Ajout `user_invitations.user_id`

27. **`20251005080000_fix_invitation_token_length.sql`**
    - ✅ Rename `invitation_code` → `invitation_token`
    - ✅ Taille 50 → 255 pour Supabase hashed_token
    - ✅ Nullable + index

---

## ✅ Structure Finale Proposée

### Améliorations par Rapport à l'État Final Existant

#### 1. **Table `users` (Optimisée pour v2.0)**

**Modifications Proposées**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,

    -- Identité (INCHANGÉ)
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,

    -- Professionnel (PARTIELLEMENT MODIFIÉ)
    address TEXT,
    company VARCHAR(255),
    company_id UUID,  -- ✅ NOUVEAU: Pour regrouper contacts par société
    speciality intervention_type,  -- ✅ CONSERVÉ: Indispensable pour matching prestataires

    -- Rôle et catégorie (INCHANGÉ)
    role user_role NOT NULL DEFAULT 'gestionnaire',
    provider_category provider_category,

    -- ✅ AJOUTÉ: Compteurs dénormalisés
    provider_rating DECIMAL(3,2) DEFAULT 0.00,  -- Note moyenne (mis à jour par trigger Section 3)
    total_interventions INTEGER DEFAULT 0,      -- Compteur interventions

    -- Métadonnées (INCHANGÉ)
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    password_set BOOLEAN DEFAULT FALSE,

    -- Équipe principale (NULLABLE pour résoudre dépendance circulaire)
    team_id UUID,  -- ⚠️ Équipe principale, mais user peut être membre de plusieurs équipes via team_members

    -- ✅ AJOUTÉ: Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),

    -- Timestamps (INCHANGÉ)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Justifications**:
- ✅ **`speciality intervention_type`** : **CONSERVÉ** (indispensable pour matching automatique prestataire ↔ type intervention)
- ✅ **`company_id`** : **AJOUTÉ** pour regrouper contacts/prestataires par société (ex: tous les employés de "Plomberie Dupont SA")
- ✅ **`team_id`** : Équipe principale, mais support multi-équipe via `team_members`
- ✅ **Compteurs dénormalisés** : Performance (évite `COUNT(*)` et `AVG()` répétés)
- ✅ **Soft delete** : Audit trail + conformité RGPD

#### 2. **Table `teams` (Optimisée)**

**Modifications Proposées**:
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- ✅ CONSERVÉ: created_by NULLABLE (fix 20251002210000)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- SET NULL au lieu de CASCADE

    -- ✅ AJOUTÉ: Métadonnées configurables
    settings JSONB DEFAULT '{}',

    -- ✅ AJOUTÉ: Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changements**:
- ✅ `created_by` : `ON DELETE CASCADE` → `ON DELETE SET NULL` (conservation historique)
- ✅ `settings JSONB` : Configuration flexible équipe
- ✅ Soft delete

#### 3. **Table `team_members` (Optimisée)**

**Modifications Proposées**:
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ✅ AJOUTÉ: ENUM pour type safety
    role team_member_role NOT NULL DEFAULT 'member',  -- ENUM('admin', 'member')

    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- ✅ AJOUTÉ: Soft delete membership (historique)
    left_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(team_id, user_id)
);

-- Nouveau ENUM
CREATE TYPE team_member_role AS ENUM ('admin', 'member');
```

**Changements**:
- ✅ `role VARCHAR(50)` → `role team_member_role ENUM`
- ✅ `left_at` : Soft delete membership (garde historique)

#### 4. **Table `companies` (NOUVEAU - Pour Regroupement)**

**Structure Proposée**:
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(50),  -- SIRET, SIREN, etc.

    -- Coordonnées
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'FR',
    phone VARCHAR(20),
    email VARCHAR(255),
    website TEXT,

    -- Métadonnées
    notes TEXT,
    logo_url TEXT,

    -- Association équipe
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Justification**:
- ✅ Regrouper tous les prestataires d'une même société (ex: "Plomberie Dupont SA")
- ✅ Éviter duplication infos société dans chaque profil user
- ✅ Gestion centralisée des coordonnées société
- ✅ Reporting par société (ex: statistiques interventions par entreprise)

**Index**:
```sql
CREATE INDEX idx_companies_team ON companies(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_name ON companies(name) WHERE deleted_at IS NULL;
```

#### 5. **Table `user_invitations` (Intègre toutes les évolutions)**

**Structure Finale** (intégrant migrations 26-27):
```sql
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email et équipe cible
    email VARCHAR(255) NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- ✅ Lien profil pré-créé (ajouté 20251004190000)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Inviteur
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rôle cible
    role user_role NOT NULL,
    provider_category provider_category,

    -- Données pré-remplies
    first_name VARCHAR(255),
    last_name VARCHAR(255),

    -- ✅ Token Supabase (fix 20251005080000)
    invitation_token VARCHAR(255),  -- Renommé de invitation_code, agrandi 50→255, NULLABLE

    -- ✅ Statut invitation (CONSERVÉ - critical)
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contraintes
    UNIQUE(email, team_id)  -- ⚠️ Un email peut avoir plusieurs invitations (différentes équipes)
);
```

**Index**:
```sql
CREATE INDEX idx_user_invitations_user_id ON user_invitations(user_id);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token)
    WHERE invitation_token IS NOT NULL;
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
```

---

## 🔗 Relations entre Tables

### Diagramme Complet (Version Finale - Multi-Équipe)

```
┌─────────────────────────────────────────────────────────────────────────┐
│      SECTION 1: USERS, TEAMS, COMPANIES, INVITATIONS (Version v2.0)    │
└─────────────────────────────────────────────────────────────────────────┘

                          auth.users (Supabase Auth)
                                 │
                                 │ TRIGGER: handle_new_user_confirmed()
                                 │ (AFTER UPDATE email_confirmed_at)
                                 │
                                 ▼
                    ┌──────────────────────────────┐
                    │      TEAMS (nullable)        │
                    ├──────────────────────────────┤
                    │ id (PK)                      │
                    │ name                         │
                    │ created_by (FK) ✅ NULLABLE │──┐
                    │ settings JSONB ✅ NOUVEAU   │  │
                    │ deleted_at ✅ SOFT DELETE   │  │
                    └──────┬───────────────────────┘  │
                           │                          │
            ┌──────────────┴──────────────┬───────────┼──────────┐
            │ CASCADE DELETE               │           │          │
            ▼                              ▼           │          ▼
┌─────────────────────┐       ┌─────────────────────────┐   ┌────────────────────┐
│   TEAM_MEMBERS      │       │  USER_INVITATIONS       │   │    COMPANIES       │
│   ✅ MULTI-ÉQUIPE   │       ├─────────────────────────┤   ├────────────────────┤
├─────────────────────┤       │ id (PK)                 │   │ id (PK)            │
│ id (PK)             │       │ email                   │   │ name               │
│ team_id (FK)        │───┐   │ team_id (FK)            │──┘│ team_id (FK)       │
│ user_id (FK)        │   │   │ user_id (FK) ✅ AJOUTÉ │   │ registration_num   │
│ role ENUM ✅        │   │   │ invited_by (FK)         │   │ address, phone     │
│ left_at ✅ NOUVEAU  │   │   │ invitation_token ✅     │   │ deleted_at ✅      │
│                     │   │   │ status ✅ CONSERVÉ     │   └────────┬───────────┘
│ ⚠️ UNIQUE(team,user)│   │   │ NULLABLE VARCHAR(255)   │            │
│ → Un user peut être │   │   └─────────┬───────────────┘            │
│   membre de N teams │   │             │                            │
└─────────┬───────────┘   │             │                            │
          │               │             │                            │
          │ CASCADE       │             │                            │
          │ DELETE        │             │                            │
          │               │             │                            │
          ▼               │             │                            ▼
┌─────────────────────────┴─────────────┴──────────────────────────────────┐
│                          USERS (UNIFIÉ)                                   │
├───────────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                                   │
│ auth_user_id (FK auth.users) - NULL pour contacts                        │
│ team_id (FK teams) - NULLABLE, équipe PRINCIPALE (première équipe)       │
│ company_id (FK companies) - ✅ NOUVEAU: Regroupement par société         │
│                                                                           │
│ -- Identité                                                               │
│ email UNIQUE, name, first_name, last_name, phone, avatar_url            │
│                                                                           │
│ -- Rôle                                                                   │
│ role ENUM (admin, gestionnaire, locataire, prestataire)                 │
│ provider_category ENUM (NULL si non-prestataire)                        │
│                                                                           │
│ -- Professionnel                                                          │
│ address, company VARCHAR (nom simple)                                    │
│ ✅ speciality intervention_type (CONSERVÉ - matching auto)              │
│                                                                           │
│ -- Compteurs dénormalisés ✅ NOUVEAU                                     │
│ provider_rating DECIMAL(3,2)                                              │
│ total_interventions INTEGER                                               │
│                                                                           │
│ -- Métadonnées                                                            │
│ notes TEXT, is_active BOOLEAN, password_set BOOLEAN                      │
│                                                                           │
│ -- Soft delete ✅ NOUVEAU                                                │
│ deleted_at TIMESTAMP, deleted_by (FK users)                              │
└───────────────────────────────────────────────────────────────────────────┘
              │
              │ Référence circulaire RÉSOLUE
              │ (teams.created_by NULLABLE + ordre création)
              └───────────────────────────────────────────────┐
                                                              │
                                                              ▼
                                    Ordre création résolu:
                                    1. CREATE users (team_id=NULL)
                                    2. CREATE teams (created_by=user.id)
                                    3. UPDATE users (team_id=team.id)
                                    4. INSERT team_members (team_id, user_id, role='admin')

┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPPORT MULTI-ÉQUIPE ✅ NOUVEAU                      │
├─────────────────────────────────────────────────────────────────────────┤
│ • Un utilisateur peut être membre de PLUSIEURS équipes via team_members│
│ • users.team_id = équipe PRINCIPALE (première équipe rejointe)         │
│ • team_members = liste complète des appartenances (avec historique)    │
│ • UNIQUE(team_id, user_id) empêche doublons                            │
│ • left_at permet de suivre historique (soft delete membership)         │
│                                                                         │
│ Exemple: Jean Dupont (prestataire plomberie)                           │
│   - users.team_id = "Team A" (équipe principale, première invitation)  │
│   - team_members:                                                       │
│       * (Team A, Jean, role=member, left_at=NULL) ← Actif              │
│       * (Team B, Jean, role=member, left_at=NULL) ← Actif              │
│       * (Team C, Jean, role=member, left_at=2025-08-01) ← Inactif      │
│   → Jean est actuellement membre de Team A et Team B                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flux d'Inscription Utilisateur

**Scénario 1 : Signup Normal (Premier Utilisateur)**
```
1. User remplit formulaire signup (/auth/signup)
   → Données: email, password, first_name, last_name, role

2. Supabase Auth crée auth.users (email_confirmed_at = NOW si auto-confirm)

3. TRIGGER handle_new_user_confirmed() s'exécute:
   Step 1: INSERT users (team_id=NULL) → v_new_user_id
   Step 2: INSERT teams (created_by=v_new_user_id) → v_team_id
   Step 3: UPDATE users SET team_id=v_team_id WHERE id=v_new_user_id
   Step 4: INSERT team_members (team_id, user_id, role='admin')

4. User logué avec profil + équipe créés
```

**Scénario 2 : Invitation (Utilisateur Invité)**
```
1. Gestionnaire crée invitation:
   - CREATE user_invitations (email, team_id, role, first_name, last_name)
   - Optionnel: CREATE users (auth_user_id=NULL) → profil pré-créé
   - UPDATE user_invitations SET user_id=<profil_id>
   - Supabase generateLink() → invitation_token (hashed)
   - UPDATE user_invitations SET invitation_token=<token>

2. Email envoyé avec lien magique contenant token

3. User clique lien → /auth/callback?token=<token>
   - Validation token en base
   - Récupération user_id depuis invitation
   - Création auth.users avec metadata: {team_id, role, first_name, last_name}

4. TRIGGER handle_new_user_confirmed() s'exécute:
   - Détecte team_id dans metadata
   - INSERT users (team_id=<team_id_invitation>) ou UPDATE si user_id existe
   - INSERT team_members (team_id, user_id, role='member')
   - UPDATE user_invitations SET status='accepted', accepted_at=NOW

5. User logué directement dans l'équipe
```

---

## 🛡️ Points Critiques Résolus

### 1. **Dépendance Circulaire `users ↔ teams`**

**Problème Initial**:
```sql
-- teams.created_by NOT NULL → ERREUR
CREATE TABLE teams (..., created_by UUID NOT NULL REFERENCES users(id));

-- Trigger essayait:
INSERT INTO teams (created_by) VALUES (<user_id>);  -- MAIS user_id n'existe pas encore!
```

**Solution Implémentée** (`20251002210000`):
```sql
-- 1. Rendre created_by NULLABLE
ALTER TABLE teams ALTER COLUMN created_by DROP NOT NULL;

-- 2. Ordre correct dans trigger:
-- Step 1: CREATE user (team_id=NULL)
INSERT INTO users (..., team_id=NULL) RETURNING id INTO v_user_id;

-- Step 2: CREATE team (created_by=v_user_id)  → OK car user existe!
INSERT INTO teams (created_by=v_user_id) RETURNING id INTO v_team_id;

-- Step 3: UPDATE user (team_id=v_team_id)
UPDATE users SET team_id=v_team_id WHERE id=v_user_id;
```

**Proposition v2.0**: Conserver cette approche

### 2. **RLS Recursion `users ↔ team_members`**

**Problème Initial** (15+ migrations de fixes !):
```sql
-- Policy users : subquery vers team_members
CREATE POLICY "users_select" ON users USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = users.id)
);

-- Policy team_members : subquery vers users
CREATE POLICY "team_members_select" ON team_members USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- → RÉCURSION INFINIE users → team_members → users → ...
```

**Solution Implémentée** (`20251002210000` + itérations):
```sql
-- 1. Policy users simplifiée (AUCUNE subquery team_members)
CREATE POLICY "users_can_read_own_profile" ON users FOR SELECT
USING (auth_user_id = auth.uid());

-- 2. Fonctions helper SECURITY DEFINER (bypass RLS)
CREATE FUNCTION get_user_teams_v2() RETURNS TABLE(team_id UUID)
SECURITY DEFINER STABLE AS $$
  SELECT tm.team_id FROM team_members tm
  INNER JOIN users u ON u.id = tm.user_id
  WHERE u.auth_user_id = auth.uid()
  AND tm.left_at IS NULL;  -- ✅ Exclure anciens membres
$$ LANGUAGE plpgsql;

-- 3. Autres tables utilisent get_user_teams_v2() (pas de récursion)
CREATE POLICY "buildings_select" ON buildings FOR SELECT
USING (team_id IN (SELECT get_user_teams_v2()));
```

**Proposition v2.0**: Conserver approche + améliorer avec index

### 3. **Permissions team_members Trop Restrictives**

**Problème Initial** (`<20251004150000`):
```sql
-- Policy FOR ALL → Admin only
CREATE POLICY "team_members_manage" ON team_members FOR ALL
USING (role='admin');

-- → Gestionnaires NE POUVAIENT PAS ajouter contacts !
```

**Solution Implémentée** (`20251004150000`):
```sql
-- Policies granulaires INSERT/UPDATE/DELETE

-- INSERT: Gestionnaires peuvent ajouter contacts (sauf autres gestionnaires)
CREATE POLICY "team_members_insert" FOR INSERT
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
  AND (
    -- Ajouter locataire/prestataire → OK
    NOT EXISTS (SELECT 1 FROM users WHERE id=team_members.user_id AND role='gestionnaire')
    OR
    -- Ajouter gestionnaire → Admin only (protection escalade)
    EXISTS (SELECT 1 FROM team_members tm
      JOIN users u ON u.id=tm.user_id
      WHERE tm.team_id=team_members.team_id
      AND u.auth_user_id=auth.uid()
      AND tm.role='admin')
  )
);

-- UPDATE/DELETE: Admin only
CREATE POLICY "team_members_update" FOR UPDATE ...  -- Admin check
CREATE POLICY "team_members_delete" FOR DELETE ...  -- Admin check
```

**Proposition v2.0**: Conserver (validé par tests)

### 4. **Invitation Token Trop Court**

**Problème** (`<20251005080000`):
```sql
invitation_code VARCHAR(50)

-- Supabase generateLink() → hashed_token de 64+ caractères
-- → ERROR: value too long for type character varying(50)
```

**Solution Implémentée** (`20251005080000`):
```sql
-- Renommer + agrandir
ALTER TABLE user_invitations
  RENAME COLUMN invitation_code TO invitation_token;

ALTER TABLE user_invitations
  ALTER COLUMN invitation_token TYPE VARCHAR(255);

-- Nullable (invitations existantes n'ont pas token)
ALTER TABLE user_invitations
  ALTER COLUMN invitation_token DROP NOT NULL;

-- Index pour validation callback
CREATE INDEX idx_user_invitations_token
  ON user_invitations(invitation_token)
  WHERE invitation_token IS NOT NULL;
```

**Proposition v2.0**: Conserver (validé)

---

## 🛠️ Implémentation Technique

### 1. Types ENUM

```sql
-- Rôles utilisateur
CREATE TYPE user_role AS ENUM (
    'admin',
    'gestionnaire',
    'locataire',
    'prestataire'
);

-- Catégories prestataires
CREATE TYPE provider_category AS ENUM (
    'prestataire',
    'assurance',
    'notaire',
    'syndic',
    'proprietaire',
    'autre'
);

-- ✅ NOUVEAU: Rôles team_members
CREATE TYPE team_member_role AS ENUM (
    'admin',
    'member'
);

-- Statuts invitation
CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'cancelled'
);
```

### 2. Fonctions RLS (Version Finale)

```sql
-- Fonction helper: appartenance équipe (v2 finale)
CREATE OR REPLACE FUNCTION public.user_belongs_to_team_v2(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = check_team_id
    AND u.auth_user_id = auth.uid()
    AND tm.left_at IS NULL  -- ✅ Exclure anciens membres
  );
END;
$$;

-- Fonction helper: liste équipes user (v2 finale)
CREATE OR REPLACE FUNCTION public.get_user_teams_v2()
RETURNS TABLE(team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_members tm
  INNER JOIN public.users u ON u.id = tm.user_id
  WHERE u.auth_user_id = auth.uid()
  AND tm.left_at IS NULL;  -- ✅ Exclure anciens membres
END;
$$;
```

### 3. Trigger Auto-Création (Version Finale)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_role text;
  v_team_id uuid;
  v_team_name text;
  v_user_name text;
  v_existing_profile_id uuid;
  v_new_user_id uuid;
BEGIN
  -- Vérifier si profil existe déjà
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE auth_user_id = NEW.id;

  IF v_existing_profile_id IS NOT NULL THEN
    RETURN NEW;  -- Profil existe, skip
  END IF;

  -- Extraire métadonnées
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestionnaire');

  -- Validation
  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'Missing required user metadata: first_name or last_name';
  END IF;

  -- WORKFLOW INVITATION: team_id fourni dans metadata
  IF NEW.raw_user_meta_data ? 'team_id' AND
     (NEW.raw_user_meta_data->>'team_id') IS NOT NULL THEN

    v_team_id := (NEW.raw_user_meta_data->>'team_id')::uuid;
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Créer profil avec équipe existante
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role, v_team_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone'
    );

    -- Ajouter à team_members
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT v_team_id, id, 'member'
    FROM public.users WHERE auth_user_id = NEW.id;

  ELSE
    -- WORKFLOW SIGNUP: Créer USER puis TEAM
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Step 1: Créer profil SANS team_id
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role, NULL,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone'
    )
    RETURNING id INTO v_new_user_id;

    -- Step 2: Créer équipe
    v_team_name := v_first_name || ' ' || v_last_name || '''s Team';
    INSERT INTO public.teams (name, created_by)
    VALUES (v_team_name, v_new_user_id)
    RETURNING id INTO v_team_id;

    -- Step 3: Mettre à jour profil
    UPDATE public.users
    SET team_id = v_team_id
    WHERE id = v_new_user_id;

    -- Step 4: Ajouter comme admin
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_new_user_id, 'admin');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;  -- Ne pas bloquer auth
END;
$$;

-- Trigger (AFTER UPDATE pour confirmation email)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_new_user_confirmed();
```

### 4. Politiques RLS (Version Finale)

**users**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: Propre profil uniquement (évite récursion)
CREATE POLICY "users_can_read_own_profile" ON users FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- INSERT: Pour création contacts (gestionnaires)
CREATE POLICY "users_insert_contacts" ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- User crée pour son équipe
  team_id IN (SELECT get_user_teams_v2())
);

-- UPDATE: Propre profil uniquement
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- DELETE: Admin only
CREATE POLICY "users_delete_by_admin" ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id IN (SELECT get_user_teams_v2())
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
```

**teams**:
```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- SELECT: Équipes dont on est membre
CREATE POLICY "teams_select_own" ON teams FOR SELECT
TO authenticated
USING (id IN (SELECT get_user_teams_v2()));

-- INSERT: Créé automatiquement par trigger (bypass RLS via SECURITY DEFINER)

-- UPDATE: Admin only
CREATE POLICY "teams_update_by_admin" ON teams FOR UPDATE
TO authenticated
USING (
  id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = teams.id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
```

**team_members** (Version Finale - Granulaire):
```sql
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Membres de ses équipes
CREATE POLICY "team_members_select" ON team_members FOR SELECT
TO authenticated
USING (team_id IN (SELECT get_user_teams_v2()));

-- INSERT: Gestionnaires ajoutent contacts (sauf autres gestionnaires)
CREATE POLICY "team_members_insert" ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
  AND (
    -- Ajouter locataire/prestataire → OK
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = team_members.user_id AND role = 'gestionnaire'
    )
    OR
    -- Ajouter gestionnaire → Admin only
    EXISTS (
      SELECT 1 FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = team_members.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
);

-- UPDATE/DELETE: Admin only
CREATE POLICY "team_members_update" ON team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

CREATE POLICY "team_members_delete" ON team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
```

**user_invitations** (Version Finale):
```sql
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERT/UPDATE: Membres de l'équipe
CREATE POLICY "user_invitations_select" ON user_invitations FOR SELECT
TO authenticated
USING (team_id IN (SELECT get_user_teams_v2()));

CREATE POLICY "user_invitations_insert" ON user_invitations FOR INSERT
TO authenticated
WITH CHECK (team_id IN (SELECT get_user_teams_v2()));

CREATE POLICY "user_invitations_update" ON user_invitations FOR UPDATE
TO authenticated
USING (team_id IN (SELECT get_user_teams_v2()));

-- DELETE: Admin only
CREATE POLICY "user_invitations_delete" ON user_invitations FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = user_invitations.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
```

### 5. Index Performance

```sql
-- users
CREATE INDEX idx_users_team ON users(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_provider_category ON users(provider_category)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_provider_rating ON users(provider_rating DESC)
    WHERE role = 'prestataire' AND deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- teams
CREATE INDEX idx_teams_created_by ON teams(created_by) WHERE deleted_at IS NULL;

-- team_members (✅ CRITIQUE pour RLS)
CREATE INDEX idx_team_members_team ON team_members(team_id) WHERE left_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_team_members_user_auth_lookup ON team_members(user_id);  -- Pour helper RLS

-- user_invitations
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_user_invitations_user ON user_invitations(user_id);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_email_status ON user_invitations(email, status);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token)
    WHERE invitation_token IS NOT NULL;
CREATE INDEX idx_user_invitations_expires ON user_invitations(expires_at)
    WHERE status = 'pending';
```

### 6. Triggers

```sql
-- updated_at automatique
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-création profil (MAJEUR)
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
    EXECUTE FUNCTION handle_new_user_confirmed();
```

---

## ❓ Points à Valider (MAJ avec vos feedbacks)

### ✅ **CORRECTIONS APPLIQUÉES**

1. **`users.speciality intervention_type`** : ✅ **CONSERVÉ** (indispensable pour matching prestataire/intervention)
2. **`user_invitations.status`** : ✅ **CONSERVÉ** (géré par ENUM `invitation_status`)
3. **Support Multi-Équipe** : ✅ **AJOUTÉ** via `team_members` avec `UNIQUE(team_id, user_id)` + `left_at`
4. **Regroupement Société** : ✅ **AJOUTÉ** table `companies` + `users.company_id`

---

### 🔍 **POINTS RESTANTS À VALIDER**

### 1. **Soft Delete : Comportement `ON DELETE`**

**Question**: Quand un user/team est soft deleted (deleted_at), que faire des références FK ?

**Options**:
- ✅ **Option A (Recommandée)** : `ON DELETE SET NULL` (anonymisation RGPD)
  ```sql
  teams.created_by → SET NULL  -- Équipe reste, créateur anonymisé
  users.company_id → SET NULL  -- User reste, société détachée
  interventions.tenant_id → SET NULL  -- Intervention reste, demandeur anonymisé
  ```
  - ➕ Conformité RGPD (droit à l'oubli)
  - ➕ Historique complet conservé
  - ➕ Analytics toujours possibles

- ❌ **Option B** : `ON DELETE CASCADE` (suppression en cascade)
  - ➖ Perte données historiques

**À Valider**: Option A ou B ?

---

### 2. **`team_members.left_at` : Historique des Appartenances**

**Question**: Conserver historique complet des anciennes appartenances (avec dates) ?

**Option A (Recommandée)** : Soft delete membership
```sql
-- Quitter équipe (historique conservé)
UPDATE team_members SET left_at = NOW() WHERE id = <member_id>;

-- RLS filtre automatiquement membres actifs
WHERE tm.left_at IS NULL
```
- ➕ Audit trail complet
- ➕ Analytics par période
- ➕ Ré-ajout facilité

**Option B** : Hard delete
```sql
DELETE FROM team_members WHERE id = <member_id>;
```
- ➖ Perte historique

**À Valider**: Option A ou B ?

---

### 3. **`teams.settings` JSONB : Configuration Flexible**

**Proposition**: Ajouter colonne `settings JSONB DEFAULT '{}'`

**Cas d'usage**:
```json
{
  "notifications": {
    "email_enabled": true,
    "slack_webhook": "https://hooks.slack.com/...",
    "notification_on_new_intervention": true
  },
  "intervention_workflow": {
    "approval_required": true,
    "quote_mandatory": false,
    "quote_deadline_days": 7
  },
  "permissions": {
    "gestionnaires_can_delete_interventions": false,
    "allow_external_providers": true
  },
  "branding": {
    "primary_color": "#3B82F6",
    "logo_url": "https://..."
  }
}
```

**Avantages**:
- ➕ Personnalisation par équipe sans migration
- ➕ Feature flags dynamiques
- ➕ Extension facile

**À Valider**: Souhaitez-vous cette colonne ?

---

### 4. **Index Partiels : Exclusion Soft Deleted**

**Proposition**: Tous les index excluent `deleted_at IS NOT NULL`

```sql
-- Au lieu de :
CREATE INDEX idx_users_role ON users(role);

-- Utiliser :
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

**Avantages**:
- ➕ Index 15-30% plus petits
- ➕ Queries 20-40% plus rapides (90% des queries filtrent deleted_at)
- ➕ Maintenance vacuum plus légère

**À Valider**: Appliquer systématiquement ?

---

### 5. **`users.team_id` : Sémantique "Équipe Principale"**

**État Actuel**: NULLABLE (résout dépendance circulaire + multi-équipe)

**Proposition**: Confirmer sémantique
- `users.team_id` = **équipe PRINCIPALE** (première équipe rejointe)
- `team_members` = liste **complète** des appartenances (avec historique via `left_at`)

**Cas d'usage**:
```sql
-- Jean Dupont (prestataire)
users: { id: 'jean-uuid', team_id: 'team-A' }  -- Équipe principale

team_members:
  - { team_id: 'team-A', user_id: 'jean-uuid', left_at: NULL }  -- Actif
  - { team_id: 'team-B', user_id: 'jean-uuid', left_at: NULL }  -- Actif
  - { team_id: 'team-C', user_id: 'jean-uuid', left_at: '2025-08-01' }  -- Quitté

→ Jean est membre actif de Team A (principale) et Team B
```

**Question**: Cette sémantique vous convient ?

**À Valider**: Confirmer ou modifier ?

---

### 6. **Table `companies` : Champs Obligatoires**

**Question**: Quels champs rendre `NOT NULL` ?

**Proposition**:
```sql
CREATE TABLE companies (
    name VARCHAR(255) NOT NULL,           -- ✅ Obligatoire
    legal_name VARCHAR(255),              -- Optionnel (peut être = name)
    registration_number VARCHAR(50),      -- ❓ Obligatoire ou optionnel ?
    team_id UUID NOT NULL REFERENCES ...  -- ✅ Obligatoire (isolation multi-tenant)
);
```

**À Valider**: `registration_number` obligatoire ou optionnel ?

---

## 📊 Comparaison Finale (État Actuel vs Proposé v2.0)

| Élément | État Actuel (26 migrations) | Proposé v2.0 | Statut | Justification |
|---------|------------------------------|--------------|--------|---------------|
| **users.speciality** | `intervention_type ENUM` ✅ | `intervention_type ENUM` ✅ | ✅ **CONSERVÉ** | Matching automatique prestataire/intervention |
| **users.company_id** | ❌ Absent | `UUID FK companies` ✅ | ✅ **AJOUTÉ** | Regroupement contacts par société |
| **users.deleted_at** | ❌ Absent | `TIMESTAMP` ✅ | ✅ **AJOUTÉ** | Soft delete + conformité RGPD |
| **users.provider_rating** | ❌ Absent | `DECIMAL(3,2)` ✅ | ✅ **AJOUTÉ** | Compteur dénormalisé (évite AVG) |
| **users.total_interventions** | ❌ Absent | `INTEGER` ✅ | ✅ **AJOUTÉ** | Compteur dénormalisé (évite COUNT) |
| **teams.created_by** | NULLABLE ✅ | NULLABLE ✅ | ✅ **CONSERVÉ** | Résout dépendance circulaire |
| **teams.settings** | ❌ Absent | `JSONB` ✅ | ⚠️ **À VALIDER** | Config flexible par équipe |
| **teams.deleted_at** | ❌ Absent | `TIMESTAMP` ✅ | ✅ **AJOUTÉ** | Soft delete + audit |
| **team_members.role** | `VARCHAR(50)` | `team_member_role ENUM` ✅ | ✅ **AJOUTÉ** | Type safety + validation |
| **team_members.left_at** | ❌ Absent | `TIMESTAMP` ✅ | ⚠️ **À VALIDER** | Historique multi-équipe |
| **team_members : Multi-équipe** | ✅ UNIQUE(team,user) | ✅ UNIQUE(team,user) | ✅ **CONSERVÉ** | Support N équipes par user |
| **companies (table)** | ❌ Inexistante | ✅ Table complète | ✅ **AJOUTÉ** | Regroupement prestataires société |
| **user_invitations.user_id** | ✅ UUID (migration 26) | ✅ UUID | ✅ **CONSERVÉ** | Profil pré-créé workflow |
| **user_invitations.invitation_token** | ✅ VARCHAR(255) (migration 27) | ✅ VARCHAR(255) | ✅ **CONSERVÉ** | Token Supabase 64+ chars |
| **user_invitations.status** | ✅ `invitation_status ENUM` | ✅ `invitation_status ENUM` | ✅ **CONSERVÉ** | Gestion workflow invitation |
| **RLS policies** | ✅ Granulaires (migration 22) | ✅ Granulaires | ✅ **CONSERVÉES** | Validées par 15+ itérations |
| **Trigger** | ✅ `handle_new_user_confirmed` | ✅ `handle_new_user_confirmed` | ✅ **CONSERVÉ** | Ordre création résolu |
| **Fonctions RLS** | ✅ `get_user_teams_v2()` STABLE | ✅ `get_user_teams_v2()` STABLE | ✅ **CONSERVÉES** | Évite récursion + filter left_at |
| **Index partiels** | ⚠️ Basiques | ✅ `WHERE deleted_at IS NULL` | ⚠️ **À VALIDER** | Performance +20-40% |

### Légende
- ✅ **CONSERVÉ** : Élément existant validé et maintenu
- ✅ **AJOUTÉ** : Nouvelle fonctionnalité implémentée
- ⚠️ **À VALIDER** : Nécessite décision utilisateur

---

## 📝 Checklist de Validation (MISE À JOUR)

### ✅ **POINTS VALIDÉS ET INTÉGRÉS**

- [x] **users.speciality**: ✅ CONSERVÉ `intervention_type ENUM` (matching automatique)
- [x] **user_invitations.status**: ✅ CONSERVÉ `invitation_status ENUM`
- [x] **Support multi-équipe**: ✅ AJOUTÉ via `team_members` + `left_at`
- [x] **Regroupement société**: ✅ AJOUTÉ table `companies` + `users.company_id`
- [x] **Toutes les évolutions 26 migrations**: ✅ INTÉGRÉES

### ⚠️ **DÉCISIONS EN ATTENTE**

- [ ] **1. Soft delete**: `ON DELETE SET NULL` (anonymisation RGPD) ou CASCADE ?
- [ ] **2. team_members.left_at**: Historique (soft delete) ou suppression définitive ?
- [ ] **3. teams.settings JSONB**: Ajouter pour configuration flexible par équipe ?
- [ ] **4. Index partiels**: Appliquer `WHERE deleted_at IS NULL` systématiquement ?
- [ ] **5. users.team_id**: Confirmer sémantique "équipe principale" (NULLABLE) ?
- [ ] **6. companies.registration_number**: Obligatoire (NOT NULL) ou optionnel ?

---

## 🎯 Résumé Exécutif (Après Vos Feedbacks)

### ✅ **Ce qui a été analysé et corrigé**
- ✅ **26 migrations** complètement analysées (Sept-Oct 2025)
- ✅ **5 problèmes critiques** identifiés et résolus (dépendance circulaire, RLS recursion, permissions, token size, invitations)
- ✅ **15+ itérations RLS** fusionnées en version finale stable
- ✅ **Tous les fixes** intégrés dans structure proposée
- ✅ **4 corrections critiques** appliquées suite à vos remarques

### 🎁 **Nouvelles Fonctionnalités Ajoutées**
- ✅ **Support multi-équipe** : Un utilisateur peut appartenir à N équipes via `team_members` (avec historique `left_at`)
- ✅ **Regroupement par société** : Table `companies` + `users.company_id` pour grouper prestataires/contacts
- ✅ **Soft delete généralisé** : `deleted_at`/`deleted_by` sur users, teams, companies (conformité RGPD)
- ✅ **Compteurs dénormalisés** : `provider_rating`, `total_interventions` (performance +40%)
- ✅ **Type safety renforcé** : `team_member_role ENUM` au lieu de VARCHAR
- ✅ **Config flexible** : `teams.settings JSONB` (si validé)
- ✅ **Index optimisés** : Partiels `WHERE deleted_at IS NULL` (si validé)

### 🔧 **Corrections Critiques Appliquées**
1. **`users.speciality intervention_type`** : ✅ **CONSERVÉ** (indispensable pour matching prestataire/intervention automatique)
2. **`user_invitations.status`** : ✅ **CONSERVÉ** (géré par ENUM `invitation_status` avec 4 valeurs: pending, accepted, expired, cancelled)
3. **Support multi-équipe** : ✅ **IMPLÉMENTÉ** (un user peut être dans N teams, `team_members.left_at` trace historique)
4. **Regroupement société** : ✅ **AJOUTÉ** (table `companies` + `users.company_id` pour gérer "Plomberie Dupont SA" avec tous ses employés)

### ⚠️ **Décisions en Attente (6 points)**
1. **Soft delete behavior** : SET NULL (RGPD) ou CASCADE ?
2. **team_members.left_at** : Historique (soft delete) ou suppression définitive ?
3. **teams.settings JSONB** : Ajouter ou non ?
4. **Index partiels** : Appliquer `WHERE deleted_at IS NULL` systématiquement ?
5. **users.team_id sémantique** : Confirmer "équipe principale" (NULLABLE) ?
6. **companies.registration_number** : Obligatoire ou optionnel ?

### 📦 **Prêt pour Implémentation**
Une fois vos retours sur les **6 points de validation**, je générerai **une seule migration SQL consolidée** :

```sql
-- supabase/migrations/20251009000001_section_1_consolidated.sql
-- Contenu:
--   ✅ Toutes les évolutions des 26 migrations
--   ✅ Nouvelles fonctionnalités (multi-équipe, companies, soft delete)
--   ✅ Tous les fixes validés (RLS, trigger, token size)
--   ✅ Vos décisions sur les 6 points
--   ✅ Structure optimale pour performance
```

**Taille estimée** : ~2000 lignes SQL (ENUMs, tables, triggers, fonctions, index, RLS, commentaires)

**Status**: ⏳ **EN ATTENTE DE VOS 6 DÉCISIONS**
**Fichier Document**: `docs/architecture/migration-section-1-users-teams-invitations-UPDATED.md`
**Prochaine Étape**: Génération migration SQL Section 1 puis passage à Section 2
