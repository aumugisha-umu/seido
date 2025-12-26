# SEIDO - Documentation Complète du Schéma de Base de Données

> **Généré le** : 2025-12-26
> **Version** : Production
> **Base de données** : PostgreSQL (Supabase)

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture de Sécurité (RLS)](#architecture-de-sécurité-rls)
3. [Phase 1: Users & Teams](#phase-1-users--teams)
4. [Phase 2: Properties](#phase-2-properties)
5. [Phase 3: Interventions](#phase-3-interventions)
6. [Phase 3: Chat System](#phase-3-chat-system)
7. [Phase 3: Notifications & Audit](#phase-3-notifications--audit)
8. [Phase 3: Email System](#phase-3-email-system)
9. [Phase 4: Contracts](#phase-4-contracts)
10. [Phase 4: Import System](#phase-4-import-system)
11. [Enums PostgreSQL](#enums-postgresql)
12. [Indexes de Performance](#indexes-de-performance)

---

## Vue d'Ensemble

### Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| **Tables** | 35 |
| **Enums PostgreSQL** | 31 |
| **Fonctions RLS** | 59 |
| **Indexes** | 100+ |
| **Triggers** | 15+ |
| **Storage Buckets** | 4 |
| **Migrations** | 101 |

> **Dernière mise à jour** : 2025-12-26 (vérifié contre 101 migrations)

### Principes Architecturaux

| Principe | Implémentation |
|----------|----------------|
| **Multi-tenant** | Toutes les tables ont `team_id` pour l'isolation des données |
| **Soft Delete** | Pattern `deleted_at` + `deleted_by` sur toutes les entités principales |
| **RLS (Row Level Security)** | Politiques PostgreSQL pour sécuriser l'accès aux données |
| **Relations Polymorphiques** | `interventions` et `property_documents` peuvent pointer vers `building` OU `lot` |
| **Audit Trail** | Table `activity_logs` pour tracer toutes les actions |

### Diagramme des Relations Principales

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────▶│team_members │◀────│    teams    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  companies  │     │  buildings  │◀────│    lots     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │    (polymorphic)  │
                           ▼                   ▼
                    ┌─────────────────────────────┐
                    │       interventions         │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │  quotes   │ │time_slots │ │  reports  │
             └───────────┘ └───────────┘ └───────────┘
```

---

## Architecture de Sécurité (RLS)

### Vue d'Ensemble RLS

Row Level Security (RLS) est activé sur **toutes les tables** pour garantir l'isolation multi-tenant. Chaque requête est automatiquement filtrée selon le contexte utilisateur.

### Fonctions Helper RLS - Phase 1 (Identité)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `get_current_user_id()` | `UUID` | Retourne l'ID du profil utilisateur connecté |
| `get_current_user_role()` | `user_role` | Retourne le rôle de l'utilisateur (admin, gestionnaire, etc.) |
| `user_belongs_to_team_v2(team_id)` | `BOOLEAN` | Vérifie si l'utilisateur appartient à une équipe |
| `get_user_teams_v2()` | `TABLE(team_id)` | Retourne toutes les équipes de l'utilisateur |
| `is_admin()` | `BOOLEAN` | Vérifie si l'utilisateur est admin |
| `is_gestionnaire()` | `BOOLEAN` | Vérifie si l'utilisateur est gestionnaire |

### Fonctions Helper RLS - Phase 2 (Properties)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `is_team_manager(team_id)` | `BOOLEAN` | Vérifie si l'utilisateur est gestionnaire/admin de l'équipe |
| `get_building_team_id(building_id)` | `UUID` | Retourne le team_id d'un immeuble |
| `get_lot_team_id(lot_id)` | `UUID` | Retourne le team_id d'un lot |
| `can_view_building(building_id)` | `BOOLEAN` | Vérifie l'accès en lecture à un immeuble |
| `can_view_lot(lot_id)` | `BOOLEAN` | Vérifie l'accès en lecture à un lot |
| `is_tenant_of_lot(lot_id)` | `BOOLEAN` | Vérifie si l'utilisateur est locataire du lot |

### Fonctions Helper RLS - Phase 3 (Interventions)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `get_intervention_team_id(intervention_id)` | `UUID` | Retourne le team_id d'une intervention |
| `can_view_intervention(intervention_id)` | `BOOLEAN` | Vérifie l'accès en lecture |
| `can_manage_intervention(intervention_id)` | `BOOLEAN` | Vérifie l'accès en écriture |
| `is_manager_of_intervention_team(intervention_id)` | `BOOLEAN` | Vérifie si gestionnaire de l'équipe |
| `is_assigned_to_intervention(intervention_id)` | `BOOLEAN` | Vérifie si assigné à l'intervention |
| `is_tenant_of_intervention(intervention_id)` | `BOOLEAN` | Vérifie si locataire concerné |

### Fonctions Helper RLS - Chat

| Fonction | Retour | Description |
|----------|--------|-------------|
| `can_view_conversation(thread_id)` | `BOOLEAN` | Vérifie l'accès au fil de discussion |
| `can_send_message_in_thread(thread_id)` | `BOOLEAN` | Vérifie le droit d'envoyer un message |

### Fonctions Helper RLS - Documents & Quotes

| Fonction | Retour | Description |
|----------|--------|-------------|
| `is_document_owner(document_id)` | `BOOLEAN` | Vérifie si propriétaire du document |
| `can_validate_document(document_id)` | `BOOLEAN` | Vérifie le droit de valider |
| `can_view_quote(quote_id)` | `BOOLEAN` | Vérifie l'accès au devis |
| `can_manage_quote(quote_id)` | `BOOLEAN` | Vérifie le droit de modifier le devis |
| `can_view_report(report_id)` | `BOOLEAN` | Vérifie l'accès au rapport |

### Fonctions Helper RLS - Phase 4 (Contracts)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `get_contract_team_id(contract_id)` | `UUID` | Retourne le team_id d'un contrat |
| `can_view_contract(contract_id)` | `BOOLEAN` | Vérifie l'accès en lecture |
| `can_manage_contract(contract_id)` | `BOOLEAN` | Vérifie l'accès en écriture |

### Matrice des Permissions par Rôle

| Table | Admin | Gestionnaire | Prestataire | Locataire |
|-------|-------|--------------|-------------|-----------|
| `users` | CRUD | Read (team) | Read (self) | Read (self) |
| `teams` | CRUD | Read | Read | Read |
| `buildings` | CRUD | CRUD (team) | Read (assigned) | Read (lot) |
| `lots` | CRUD | CRUD (team) | Read (assigned) | Read (own) |
| `interventions` | CRUD | CRUD (team) | RU (assigned) | CR (own) |
| `contracts` | CRUD | CRUD (team) | - | Read (own) |
| `notifications` | CRUD | CRUD (own) | CRUD (own) | CRUD (own) |

> **Légende** : C=Create, R=Read, U=Update, D=Delete

---

## Phase 1: Users & Teams

### Table: `users`

> **Description** : Table centrale des utilisateurs. Contient TOUS les rôles (admin, gestionnaire, locataire, prestataire, propriétaire). Peut exister sans authentification (contacts simples) ou avec authentification (utilisateurs connectés).

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `auth_user_id` | UUID | YES | NULL | Lien vers `auth.users` (Supabase Auth) |
| `email` | VARCHAR(255) | NO | - | Email unique |
| `name` | VARCHAR(255) | YES | NULL | Nom complet (legacy) |
| `first_name` | VARCHAR(255) | YES | NULL | Prénom |
| `last_name` | VARCHAR(255) | YES | NULL | Nom de famille |
| `phone` | VARCHAR(50) | YES | NULL | Téléphone |
| `avatar_url` | TEXT | YES | NULL | URL de l'avatar |
| `address` | TEXT | YES | NULL | Adresse postale |
| `company` | VARCHAR(255) | YES | NULL | Nom de l'entreprise (texte libre) |
| `company_id` | UUID | YES | NULL | FK → `companies.id` |
| `role` | VARCHAR(50) | NO | 'gestionnaire' | Rôle principal (enum `user_role`) |
| `speciality` | VARCHAR(50) | YES | NULL | Spécialité prestataire (enum `intervention_type`) |
| `provider_category` | VARCHAR(50) | YES | NULL | Catégorie prestataire (enum) |
| `provider_rating` | DECIMAL(3,2) | YES | 0.00 | Note moyenne (0.00-5.00) |
| `total_interventions` | INTEGER | YES | 0 | Compteur d'interventions réalisées |
| `notes` | TEXT | YES | NULL | Notes internes |
| `is_active` | BOOLEAN | NO | true | Utilisateur actif |
| `password_set` | BOOLEAN | NO | false | Mot de passe défini |
| `team_id` | UUID | YES | NULL | FK → `teams.id` (équipe principale) |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Date de suppression (soft delete) |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` (qui a supprimé) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Relations :**
- `company_id` → `companies.id` (N:1)
- `team_id` → `teams.id` (N:1) - Équipe principale
- `deleted_by` → `users.id` (self-referential)
- `auth_user_id` → `auth.users.id` (Supabase Auth)

**Indexes :**
- `idx_users_email` (UNIQUE)
- `idx_users_auth_user_id`
- `idx_users_team_id`
- `idx_users_role`
- `idx_users_not_deleted` (partial: WHERE deleted_at IS NULL)

**Politiques RLS :**
```sql
-- Lecture: Utilisateurs de la même équipe ou admin
CREATE POLICY "users_select" ON users FOR SELECT
USING (
  is_admin() OR
  user_belongs_to_team_v2(team_id) OR
  id = get_current_user_id()
);

-- Modification: Soi-même ou gestionnaire de l'équipe
CREATE POLICY "users_update" ON users FOR UPDATE
USING (
  id = get_current_user_id() OR
  (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
);
```

---

### Table: `teams`

> **Description** : Équipes/agences - unité d'isolation multi-tenant. Toutes les données métier sont scopées par `team_id`.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `name` | VARCHAR(255) | NO | - | Nom de l'équipe |
| `description` | TEXT | YES | NULL | Description |
| `created_by` | UUID | YES | NULL | FK → `users.id` (créateur) |
| `settings` | JSONB | YES | `{}` | Configuration personnalisée |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Utilisation du champ `settings` (JSONB) :**
```json
{
  "notifications": {
    "email_enabled": true,
    "push_enabled": true
  },
  "branding": {
    "logo_url": "https://...",
    "primary_color": "#1a73e8"
  },
  "features": {
    "email_integration": true,
    "quote_workflow": true
  }
}
```

**Politiques RLS :**
```sql
-- Lecture: Membres de l'équipe ou admin
CREATE POLICY "teams_select" ON teams FOR SELECT
USING (
  is_admin() OR
  user_belongs_to_team_v2(id)
);
```

---

### Table: `team_members`

> **Description** : Table pivot pour le multi-team. Un utilisateur peut appartenir à plusieurs équipes avec des rôles différents par équipe.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `role` | VARCHAR(50) | NO | 'gestionnaire' | Rôle dans cette équipe (enum) |
| `joined_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'adhésion |
| `left_at` | TIMESTAMPTZ | YES | NULL | Date de départ (soft delete membership) |

**Contraintes :**
- `UNIQUE(team_id, user_id)` - Un seul membership par utilisateur par équipe

**Index critique pour RLS :**
```sql
-- Covering index pour éviter les accès table dans les politiques RLS
CREATE INDEX idx_team_members_user_team_role
ON team_members(user_id, team_id, role)
WHERE left_at IS NULL;
```

**Utilisation :**
```sql
-- Vérifier si un utilisateur est gestionnaire d'une équipe
SELECT EXISTS (
  SELECT 1 FROM team_members
  WHERE user_id = get_current_user_id()
    AND team_id = $1
    AND role IN ('admin', 'gestionnaire')
    AND left_at IS NULL
);
```

---

### Table: `companies`

> **Description** : Entreprises prestataires. Permet de regrouper plusieurs utilisateurs prestataires sous une même société.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `name` | VARCHAR(255) | NO | - | Nom commercial |
| `legal_name` | VARCHAR(255) | YES | NULL | Raison sociale |
| `registration_number` | VARCHAR(50) | YES | NULL | SIRET/SIREN |
| `address` | TEXT | YES | NULL | Adresse |
| `city` | VARCHAR(100) | YES | NULL | Ville |
| `postal_code` | VARCHAR(20) | YES | NULL | Code postal |
| `country` | VARCHAR(100) | YES | NULL | Pays |
| `phone` | VARCHAR(50) | YES | NULL | Téléphone |
| `email` | VARCHAR(255) | YES | NULL | Email |
| `website` | VARCHAR(255) | YES | NULL | Site web |
| `notes` | TEXT | YES | NULL | Notes internes |
| `logo_url` | TEXT | YES | NULL | URL du logo |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

---

### Table: `company_members`

> **Description** : Membres d'une entreprise prestataire. Permet de regrouper plusieurs utilisateurs sous une même société.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `company_id` | UUID | NO | - | FK → `companies.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `role` | VARCHAR(50) | YES | NULL | Rôle dans l'entreprise |
| `is_primary` | BOOLEAN | NO | false | Contact principal |
| `notes` | TEXT | YES | NULL | Notes |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(company_id, user_id)` - Un seul membership par utilisateur par entreprise

**Rôles Courants :**
| Rôle | Description |
|------|-------------|
| `owner` | Propriétaire/dirigeant |
| `admin` | Administrateur |
| `employee` | Employé |
| `contractor` | Sous-traitant |

---

### Table: `user_invitations`

> **Description** : Invitations en attente pour rejoindre une équipe. L'utilisateur peut être pré-créé avant acceptation.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `email` | VARCHAR(255) | NO | - | Email de l'invité |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `user_id` | UUID | YES | NULL | FK → `users.id` (profil pré-créé) |
| `invited_by` | UUID | NO | - | FK → `users.id` (invitant) |
| `role` | VARCHAR(50) | NO | 'gestionnaire' | Rôle proposé |
| `provider_category` | VARCHAR(50) | YES | NULL | Si prestataire |
| `first_name` | VARCHAR(255) | YES | NULL | Prénom (pré-rempli) |
| `last_name` | VARCHAR(255) | YES | NULL | Nom (pré-rempli) |
| `invitation_token` | VARCHAR(255) | YES | NULL | Token sécurisé |
| `status` | VARCHAR(50) | NO | 'pending' | Statut (enum) |
| `invited_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'invitation |
| `expires_at` | TIMESTAMPTZ | NO | `NOW() + 7 days` | Date d'expiration |
| `accepted_at` | TIMESTAMPTZ | YES | NULL | Date d'acceptation |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(email, team_id)` - Une seule invitation active par email par équipe

**Workflow d'invitation :**
```
1. Gestionnaire crée invitation (status='pending')
2. Email envoyé avec lien contenant invitation_token
3. Invité clique → vérifie token + expires_at
4. Si nouveau: création auth.users + users
5. Création team_members
6. status='accepted', accepted_at=NOW()
```

---

## Phase 2: Properties

### Table: `buildings`

> **Description** : Immeubles - peuvent contenir plusieurs lots. Représente une adresse physique avec des caractéristiques communes.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `name` | TEXT | NO | - | Nom de l'immeuble |
| `address` | TEXT | NO | - | Adresse complète |
| `city` | VARCHAR(100) | NO | - | Ville |
| `postal_code` | VARCHAR(20) | NO | - | Code postal |
| `country` | VARCHAR(50) | NO | 'belgique' | Pays (enum `country`) |
| `description` | TEXT | YES | NULL | Description |
| `total_lots` | INTEGER | NO | 0 | Nombre total de lots |
| `occupied_lots` | INTEGER | NO | 0 | Lots occupés |
| `vacant_lots` | INTEGER | NO | 0 | Lots vacants |
| `total_interventions` | INTEGER | NO | 0 | Total interventions |
| `active_interventions` | INTEGER | NO | 0 | Interventions en cours |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
```sql
CONSTRAINT valid_lots_count CHECK (occupied_lots + vacant_lots = total_lots)
```

**Triggers :**
- `update_building_lot_counts` - Maintient les compteurs automatiquement
- `update_building_intervention_counts` - Compte les interventions

**Utilisation du champ `metadata` (JSONB) :**
```json
{
  "construction_year": 1985,
  "total_floors": 5,
  "elevator": true,
  "parking_spaces": 12,
  "heating_type": "collectif_gaz",
  "energy_class": "C",
  "surface_total_m2": 2500
}
```

---

### Table: `lots`

> **Description** : Lots/appartements - peuvent être standalone (maison) ou liés à un building. Représente une unité locative.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `building_id` | UUID | YES | NULL | FK → `buildings.id` (nullable si standalone) |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `reference` | TEXT | NO | - | Référence unique par équipe |
| `category` | VARCHAR(50) | NO | 'appartement' | Type de lot (enum) |
| `floor` | INTEGER | YES | NULL | Étage (-5 à 100) |
| `apartment_number` | TEXT | YES | NULL | Numéro d'appartement |
| `description` | TEXT | YES | NULL | Description |
| `street` | TEXT | YES | NULL | Rue (si standalone) |
| `city` | VARCHAR(100) | YES | NULL | Ville (si standalone) |
| `postal_code` | VARCHAR(20) | YES | NULL | Code postal (si standalone) |
| `country` | VARCHAR(50) | YES | NULL | Pays (si standalone) |
| `total_interventions` | INTEGER | NO | 0 | Total interventions |
| `active_interventions` | INTEGER | NO | 0 | Interventions en cours |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
```sql
UNIQUE(team_id, reference) DEFERRABLE INITIALLY DEFERRED
CHECK (floor >= -5 AND floor <= 100)
```

**Logique Standalone vs Linked :**
```
Si building_id IS NULL:
  → Lot standalone (maison individuelle)
  → Utilise street, city, postal_code, country

Si building_id IS NOT NULL:
  → Lot dans un immeuble
  → Hérite de l'adresse du building
```

**Utilisation du champ `metadata` (JSONB) :**
```json
{
  "surface_m2": 75,
  "rooms": 3,
  "bedrooms": 2,
  "bathrooms": 1,
  "balcony": true,
  "cellar": true,
  "parking_included": false,
  "furnished": false,
  "energy_class": "D"
}
```

---

### Table: `building_contacts`

> **Description** : Table pivot many-to-many entre buildings et users. Associe des contacts (syndic, propriétaire, gardien) à un immeuble.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `building_id` | UUID | NO | - | FK → `buildings.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `team_id` | UUID | NO | - | **🆕 FK → `teams.id`** (dénormalisé pour RLS) |
| `is_primary` | BOOLEAN | NO | false | Contact principal |
| `role` | TEXT | YES | NULL | Rôle (texte libre) |
| `notes` | TEXT | YES | NULL | Notes |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Trigger Automatique :** `tr_building_contacts_team_id` synchronise `team_id` depuis `building.team_id` à l'insertion.

**Contraintes :**
- `UNIQUE(building_id, user_id)` - Un seul lien par couple building/user

**Rôles courants :**
- `syndic` - Syndic de copropriété
- `proprietaire` - Propriétaire
- `gardien` - Gardien/concierge
- `gestionnaire` - Gestionnaire dédié

---

### Table: `lot_contacts`

> **Description** : Table pivot many-to-many entre lots et users. Associe des contacts (locataire, propriétaire, garant) à un lot.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `lot_id` | UUID | NO | - | FK → `lots.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `team_id` | UUID | NO | - | **🆕 FK → `teams.id`** (dénormalisé pour RLS) |
| `is_primary` | BOOLEAN | NO | false | Contact principal |
| `role` | TEXT | YES | NULL | Rôle (texte libre) |
| `notes` | TEXT | YES | NULL | Notes |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Trigger Automatique :** `tr_lot_contacts_team_id` synchronise `team_id` depuis `lot → [building] → team_id` à l'insertion (gère lots standalone et nested).

**Contraintes :**
- `UNIQUE(lot_id, user_id)` - Un seul lien par couple lot/user

**Rôles courants :**
- `locataire` - Locataire actuel
- `ancien_locataire` - Ancien locataire
- `proprietaire` - Propriétaire du lot
- `garant` - Garant du bail
- `colocataire` - Colocataire

---

### Table: `property_documents`

> **Description** : Documents attachés aux immeubles OU aux lots (relation polymorphique). Stockage dans Supabase Storage.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `building_id` | UUID | YES | NULL | FK → `buildings.id` (XOR lot_id) |
| `lot_id` | UUID | YES | NULL | FK → `lots.id` (XOR building_id) |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `document_type` | VARCHAR(50) | NO | 'autre' | Type de document (enum) |
| `category` | TEXT | YES | NULL | Catégorie libre |
| `filename` | TEXT | NO | - | Nom de fichier stocké |
| `original_filename` | TEXT | NO | - | Nom original |
| `file_size` | BIGINT | NO | - | Taille en bytes |
| `mime_type` | TEXT | NO | - | Type MIME |
| `storage_path` | TEXT | NO | - | Chemin dans Storage |
| `storage_bucket` | TEXT | NO | 'property-documents' | Bucket Supabase |
| `title` | TEXT | YES | NULL | Titre affiché |
| `description` | TEXT | YES | NULL | Description |
| `tags` | TEXT[] | YES | `{}` | Tags pour recherche |
| `expiry_date` | DATE | YES | NULL | Date d'expiration |
| `document_date` | DATE | YES | NULL | Date du document |
| `visibility_level` | VARCHAR(50) | NO | 'equipe' | Visibilité (enum) |
| `is_archived` | BOOLEAN | NO | false | Archivé |
| `uploaded_by` | UUID | NO | - | FK → `users.id` |
| `uploaded_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'upload |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |

**Contrainte Polymorphique :**
```sql
CONSTRAINT valid_property_reference CHECK (
  (building_id IS NOT NULL AND lot_id IS NULL) OR
  (building_id IS NULL AND lot_id IS NOT NULL)
)
```

**Niveaux de Visibilité :**
| Valeur | Qui peut voir |
|--------|---------------|
| `equipe` | Gestionnaires et admins de l'équipe |
| `locataire` | + Locataires du lot |
| `intervention` | + Prestataires assignés |

---

## Phase 3: Interventions

### Table: `interventions`

> **Description** : Demandes d'intervention - cœur du workflow métier. Suit un cycle de vie complet de la demande à la clôture.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `reference` | VARCHAR(20) | NO | - | Référence unique (INT-YYYYMMDD-XXX) |
| `building_id` | UUID | YES | NULL | FK → `buildings.id` (XOR lot_id) |
| `lot_id` | UUID | YES | NULL | FK → `lots.id` (XOR building_id) |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `tenant_id` | UUID | YES | NULL | FK → `users.id` (locataire demandeur) |
| `title` | TEXT | NO | - | Titre court |
| `description` | TEXT | YES | NULL | Description détaillée |
| `type` | VARCHAR(50) | NO | 'autre' | Type d'intervention (enum) |
| `urgency` | VARCHAR(50) | NO | 'normale' | Niveau d'urgence (enum) |
| `status` | VARCHAR(50) | NO | 'demande' | Statut actuel (enum - 11 valeurs) |
| `requested_date` | TIMESTAMPTZ | YES | NULL | Date souhaitée |
| `scheduled_date` | TIMESTAMPTZ | YES | NULL | Date planifiée |
| `completed_date` | TIMESTAMPTZ | YES | NULL | Date de réalisation |
| `estimated_cost` | DECIMAL(10,2) | YES | NULL | Coût estimé |
| `final_cost` | DECIMAL(10,2) | YES | NULL | Coût final |
| `is_contested` | BOOLEAN | NO | false | Intervention contestée |
| `scheduling_method` | TEXT | YES | NULL | Méthode de planification |
| `created_by` | UUID | YES | NULL | FK → `users.id` (créateur) |
| `provider_guidelines` | TEXT | YES | NULL | Instructions pour le prestataire |
| `has_attachments` | BOOLEAN | YES | NULL | A des pièces jointes |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Génération de la Référence :**
```sql
-- Format: INT-20251226-001
-- Trigger: generate_intervention_reference
reference = 'INT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(sequence::text, 3, '0')
```

**Diagramme d'État (Status) :**
```
                    ┌──────────┐
                    │ demande  │ (Initial)
                    └────┬─────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌─────────┐   ┌──────────┐   ┌─────────┐
      │rejetee  │   │approuvee │   │annulee  │
      └─────────┘   └────┬─────┘   └─────────┘
                         │
                         ▼
                ┌────────────────┐
                │demande_de_devis│
                └───────┬────────┘
                        │
                        ▼
                ┌──────────────┐
                │ planification│
                └───────┬──────┘
                        │
                        ▼
                  ┌──────────┐
                  │planifiee │
                  └────┬─────┘
                       │
                       ▼
                  ┌─────────┐
                  │en_cours │
                  └────┬────┘
                       │
           ┌───────────┼───────────┐
           ▼           │           ▼
┌──────────────────┐   │   ┌──────────────────┐
│cloturee_par_     │   │   │cloturee_par_     │
│prestataire       │   │   │locataire         │
└────────┬─────────┘   │   └────────┬─────────┘
         │             │            │
         └─────────────┴────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │cloturee_par_         │
            │gestionnaire          │ (Final)
            └──────────────────────┘
```

**Méthodes de Planification :**
| Valeur | Description |
|--------|-------------|
| `direct` | Date fixée directement par le gestionnaire |
| `slots` | Prestataire propose des créneaux, locataire choisit |
| `flexible` | Arrangement direct entre prestataire et locataire |

---

### Table: `intervention_assignments`

> **Description** : Table pivot many-to-many entre interventions et users. Gère les assignations de gestionnaires et prestataires.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `is_primary` | BOOLEAN | NO | false | Assignation principale |
| `role` | TEXT | NO | 'gestionnaire' | Rôle dans l'intervention |
| `notes` | TEXT | YES | NULL | Notes d'assignation |
| `notified` | BOOLEAN | NO | false | Notification envoyée |
| `assigned_by` | UUID | YES | NULL | FK → `users.id` (qui a assigné) |
| `assigned_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'assignation |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
```sql
UNIQUE(intervention_id, user_id, role)
CHECK (role IN ('gestionnaire', 'prestataire'))
```

**Utilisation :**
```sql
-- Trouver le prestataire principal d'une intervention
SELECT u.* FROM users u
JOIN intervention_assignments ia ON ia.user_id = u.id
WHERE ia.intervention_id = $1
  AND ia.role = 'prestataire'
  AND ia.is_primary = true;
```

---

### Table: `intervention_time_slots`

> **Description** : Créneaux horaires proposés pour la planification. Le prestataire propose, le locataire/gestionnaire valide.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `team_id` | UUID | NO | - | **🆕 FK → `teams.id`** (dénormalisé pour RLS) |
| `slot_date` | DATE | NO | - | Date du créneau |
| `start_time` | TIME | NO | - | Heure de début |
| `end_time` | TIME | NO | - | Heure de fin |
| `is_selected` | BOOLEAN | NO | false | Créneau choisi |
| `proposed_by` | UUID | NO | - | FK → `users.id` (proposant) |
| `notes` | TEXT | YES | NULL | Notes |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |

**Trigger Automatique :** `tr_intervention_time_slots_team_id` synchronise `team_id` depuis `intervention.team_id` à l'insertion.

**Contraintes :**
```sql
UNIQUE(intervention_id, slot_date, start_time, end_time)
CHECK (start_time < end_time)
```

**Workflow :**
```
1. Prestataire crée 2-3 créneaux (is_selected=false)
2. Notification au locataire
3. Locataire sélectionne un créneau (is_selected=true)
4. scheduled_date de l'intervention est mis à jour
5. Status passe à 'planifiee'
```

---

### Table: `intervention_quotes`

> **Description** : Devis et factures pour les interventions. Gère les estimations et les coûts finaux.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `provider_id` | UUID | NO | - | FK → `users.id` (prestataire) |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `quote_type` | TEXT | NO | 'estimation' | Type: estimation ou final |
| `amount` | DECIMAL(10,2) | NO | - | Montant total |
| `currency` | TEXT | NO | 'EUR' | Devise |
| `description` | TEXT | YES | NULL | Description générale |
| `line_items` | JSONB | YES | `[]` | Détail des lignes |
| `status` | TEXT | NO | 'draft' | Statut du devis |
| `valid_until` | DATE | YES | NULL | Date de validité |
| `validated_by` | UUID | YES | NULL | FK → `users.id` (validateur) |
| `validated_at` | TIMESTAMPTZ | YES | NULL | Date de validation |
| `rejection_reason` | TEXT | YES | NULL | Raison du refus |
| `created_by` | UUID | YES | NULL | FK → `users.id` (créateur) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |

**Structure `line_items` (JSONB) :**
```json
[
  {
    "description": "Main d'œuvre",
    "quantity": 2,
    "unit": "heures",
    "unit_price": 45.00,
    "total": 90.00
  },
  {
    "description": "Pièces de rechange",
    "quantity": 1,
    "unit": "forfait",
    "unit_price": 35.50,
    "total": 35.50
  }
]
```

**Statuts de Devis :**
| Statut | Description |
|--------|-------------|
| `draft` | Brouillon, non envoyé |
| `sent` | Envoyé au gestionnaire |
| `accepted` | Accepté par le gestionnaire |
| `rejected` | Refusé (voir rejection_reason) |
| `cancelled` | Annulé |
| `expired` | Expiré (date dépassée) |

---

### Table: `intervention_reports`

> **Description** : Rapports textuels sur les interventions. Permet aux différentes parties de documenter le travail.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `report_type` | TEXT | NO | 'general_note' | Type de rapport |
| `title` | TEXT | YES | NULL | Titre |
| `content` | TEXT | NO | - | Contenu (markdown supporté) |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `is_internal` | BOOLEAN | NO | false | Visible équipe uniquement |
| `created_by` | UUID | NO | - | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |

**Types de Rapports :**
| Type | Créateur | Description |
|------|----------|-------------|
| `tenant_report` | Locataire | Retour du locataire |
| `provider_report` | Prestataire | Rapport de fin d'intervention |
| `manager_report` | Gestionnaire | Note de clôture |
| `general_note` | Tous | Note générale |

---

### Table: `intervention_documents`

> **Description** : Documents et pièces jointes des interventions. Peut aussi être lié aux messages de chat.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `message_id` | UUID | YES | NULL | FK → `conversation_messages.id` |
| `document_type` | VARCHAR(50) | NO | 'autre' | Type de document (enum) |
| `filename` | TEXT | NO | - | Nom de fichier stocké |
| `original_filename` | TEXT | NO | - | Nom original |
| `file_size` | BIGINT | NO | - | Taille en bytes |
| `mime_type` | TEXT | NO | - | Type MIME |
| `storage_path` | TEXT | NO | - | Chemin dans Storage |
| `storage_bucket` | TEXT | NO | 'intervention-documents' | Bucket |
| `description` | TEXT | YES | NULL | Description |
| `is_validated` | BOOLEAN | NO | false | Validé par gestionnaire |
| `validated_by` | UUID | YES | NULL | FK → `users.id` |
| `validated_at` | TIMESTAMPTZ | YES | NULL | Date de validation |
| `uploaded_by` | UUID | NO | - | FK → `users.id` |
| `uploaded_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'upload |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |

**Types de Documents Intervention :**
| Type | Description |
|------|-------------|
| `rapport` | Rapport d'intervention |
| `photo_avant` | Photo avant travaux |
| `photo_apres` | Photo après travaux |
| `facture` | Facture |
| `devis` | Devis (PDF) |
| `plan` | Plan/schéma |
| `certificat` | Certificat |
| `garantie` | Document de garantie |
| `bon_de_commande` | Bon de commande |
| `autre` | Autre document |

---

### Table: `intervention_comments`

> **Description** : Système de commentaires threadés sur les interventions. Permet aux différents acteurs de laisser des notes et discussions.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `user_id` | UUID | NO | - | FK → `users.id` (auteur) |
| `parent_id` | UUID | YES | NULL | FK → `intervention_comments.id` (self-ref) |
| `content` | TEXT | NO | - | Contenu du commentaire |
| `is_internal` | BOOLEAN | NO | false | Visible équipe uniquement |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |

**Contraintes :**
- FK `parent_id` → `intervention_comments.id` (self-referential pour threading)

**Utilisation :**
```sql
-- Récupérer les commentaires avec leurs réponses
WITH RECURSIVE comment_tree AS (
  SELECT *, 0 as depth FROM intervention_comments WHERE parent_id IS NULL
  UNION ALL
  SELECT c.*, ct.depth + 1
  FROM intervention_comments c
  JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT * FROM comment_tree WHERE intervention_id = $1;
```

---

### Table: `time_slot_responses`

> **Description** : Réponses granulaires aux créneaux horaires proposés. Permet de tracker qui a accepté/refusé chaque créneau.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `time_slot_id` | UUID | NO | - | FK → `intervention_time_slots.id` |
| `user_id` | UUID | NO | - | FK → `users.id` (répondant) |
| `response_type` | VARCHAR(50) | NO | 'pending' | Réponse (enum) |
| `notes` | TEXT | YES | NULL | Notes optionnelles |
| `responded_at` | TIMESTAMPTZ | YES | NULL | Date de réponse |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(time_slot_id, user_id)` - Une seule réponse par utilisateur par créneau

**Enum `response_type` :**
| Valeur | Description |
|--------|-------------|
| `pending` | En attente de réponse |
| `accepted` | Créneau accepté |
| `rejected` | Créneau refusé |

---

### Table: `intervention_links`

> **Description** : Associations entre interventions liées. Permet de créer des relations parent-enfant ou de suivi.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `source_intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `target_intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `link_type` | VARCHAR(50) | NO | - | Type de relation |
| `notes` | TEXT | YES | NULL | Notes sur la relation |
| `created_by` | UUID | NO | - | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |

**Contraintes :**
- `UNIQUE(source_intervention_id, target_intervention_id, link_type)`
- `CHECK(source_intervention_id != target_intervention_id)` - Pas d'auto-référence

**Types de Liens :**
| Type | Description |
|------|-------------|
| `follow_up` | Intervention de suivi |
| `related` | Intervention liée |
| `duplicate` | Doublon identifié |
| `parent` | Intervention parente |

---

## Phase 3: Chat System

### Table: `conversation_threads`

> **Description** : Fils de discussion liés aux interventions. Permet la communication entre les différentes parties.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `intervention_id` | UUID | NO | - | FK → `interventions.id` |
| `team_id` | UUID | NO | - | FK → `teams.id` (dénormalisé) |
| `thread_type` | VARCHAR(50) | NO | 'group' | Type de fil (enum) |
| `title` | TEXT | YES | NULL | Titre optionnel |
| `message_count` | INTEGER | NO | 0 | Compteur de messages |
| `last_message_at` | TIMESTAMPTZ | YES | NULL | Dernier message |
| `created_by` | UUID | NO | - | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(intervention_id, thread_type)` - Un seul fil par type par intervention

**Types de Fils :**
| Type | Participants | Description |
|------|--------------|-------------|
| `group` | Tous | Discussion générale |
| `tenant_to_managers` | Locataire + Gestionnaires | Communication locataire ↔ gestion |
| `provider_to_managers` | Prestataire + Gestionnaires | Communication prestataire ↔ gestion |

**Note sur la Dénormalisation :**
> `team_id` est dénormalisé depuis `interventions` pour optimiser les politiques RLS. Évite une jointure coûteuse à chaque requête.

---

### Table: `conversation_messages`

> **Description** : Messages individuels dans les fils de discussion. Immuables (pas d'édition, soft delete uniquement).

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `thread_id` | UUID | NO | - | FK → `conversation_threads.id` |
| `user_id` | UUID | YES | NULL | FK → `users.id` (nullable si supprimé) |
| `team_id` | UUID | NO | - | **🆕 FK → `teams.id`** (dénormalisé pour RLS) |
| `content` | TEXT | NO | - | Contenu du message |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `metadata` | JSONB | YES | `{}` | Métadonnées |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |

**Trigger Automatique :** `tr_conversation_messages_team_id` synchronise `team_id` depuis `thread → intervention → team` à l'insertion.

**Politique d'Immutabilité :**
> Les messages ne peuvent PAS être édités après création. Seul le soft delete est possible. Cela garantit l'intégrité des échanges.

**Structure `metadata` (JSONB) :**
```json
{
  "mentions": ["uuid-user-1", "uuid-user-2"],
  "reactions": {
    "👍": ["uuid-user-3"],
    "✅": ["uuid-user-1"]
  },
  "attachments": ["uuid-doc-1"]
}
```

---

### Table: `conversation_participants`

> **Description** : Participants explicites aux fils de discussion. Gère le suivi de lecture.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `thread_id` | UUID | NO | - | FK → `conversation_threads.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `last_read_message_id` | UUID | YES | NULL | FK → `conversation_messages.id` |
| `last_read_at` | TIMESTAMPTZ | YES | NULL | Dernière lecture |
| `joined_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'ajout |

**Contraintes :**
- `UNIQUE(thread_id, user_id)` - Un seul participant par utilisateur par fil

**Calcul des Messages Non Lus :**
```sql
SELECT COUNT(*) FROM conversation_messages m
WHERE m.thread_id = $thread_id
  AND m.created_at > (
    SELECT COALESCE(last_read_at, '1970-01-01'::timestamptz)
    FROM conversation_participants
    WHERE thread_id = $thread_id AND user_id = $current_user_id
  )
  AND m.deleted_at IS NULL;
```

---

## Phase 3: Notifications & Audit

### Table: `notifications`

> **Description** : Notifications in-app en temps réel. Utilise Supabase Realtime pour les mises à jour instantanées.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `user_id` | UUID | NO | - | FK → `users.id` (destinataire) |
| `team_id` | UUID | YES | NULL | FK → `teams.id` |
| `created_by` | UUID | YES | NULL | FK → `users.id` (créateur) |
| `type` | VARCHAR(50) | NO | 'system' | Type de notification (enum) |
| `priority` | VARCHAR(50) | NO | 'normal' | Priorité (enum) |
| `title` | TEXT | NO | - | Titre |
| `message` | TEXT | NO | - | Contenu |
| `read` | BOOLEAN | NO | false | Lu |
| `archived` | BOOLEAN | NO | false | Archivé |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `related_entity_type` | TEXT | YES | NULL | Type d'entité liée |
| `related_entity_id` | UUID | YES | NULL | ID de l'entité liée |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `read_at` | TIMESTAMPTZ | YES | NULL | Date de lecture |

**Types de Notifications :**
| Type | Description | Action typique |
|------|-------------|----------------|
| `intervention` | Nouvelle intervention | Naviguer vers l'intervention |
| `chat` | Nouveau message | Ouvrir le fil de discussion |
| `document` | Document uploadé | Voir le document |
| `system` | Notification système | Informative |
| `team_invite` | Invitation équipe | Accepter/refuser |
| `assignment` | Assignation | Voir l'intervention |
| `status_change` | Changement de statut | Voir l'intervention |
| `reminder` | Rappel | Action contextuelle |
| `deadline` | Échéance proche | Action urgente |

**Relation Polymorphique :**
```sql
-- Exemple: notification liée à une intervention
related_entity_type = 'intervention'
related_entity_id = 'uuid-intervention'

-- Exemple: notification liée à un contrat
related_entity_type = 'contract'
related_entity_id = 'uuid-contract'
```

**Intégration Supabase Realtime :**
```typescript
// Client-side subscription
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Afficher la notification
  })
  .subscribe()
```

---

### Table: `activity_logs`

> **Description** : Journal d'audit complet. Trace toutes les actions importantes pour la conformité et le débogage.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `user_id` | UUID | NO | - | FK → `users.id` (acteur) |
| `action_type` | VARCHAR(50) | NO | - | Type d'action (enum) |
| `entity_type` | VARCHAR(50) | NO | - | Type d'entité (enum) |
| `entity_id` | UUID | NO | - | ID de l'entité |
| `entity_name` | TEXT | YES | NULL | Nom de l'entité (pour affichage) |
| `status` | VARCHAR(50) | NO | 'success' | Statut de l'action (enum) |
| `description` | TEXT | YES | NULL | Description lisible |
| `error_message` | TEXT | YES | NULL | Message d'erreur si échec |
| `metadata` | JSONB | YES | `{}` | Données détaillées |
| `ip_address` | INET | YES | NULL | Adresse IP |
| `user_agent` | TEXT | YES | NULL | User agent |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de l'action |

**Types d'Actions :**
| Action | Description |
|--------|-------------|
| `create` | Création d'entité |
| `update` | Modification |
| `delete` | Suppression |
| `view` | Consultation |
| `assign` | Assignation |
| `unassign` | Désassignation |
| `approve` | Approbation |
| `reject` | Refus |
| `upload` | Upload de fichier |
| `download` | Téléchargement |
| `share` | Partage |
| `comment` | Commentaire |
| `status_change` | Changement de statut |
| `send_notification` | Envoi de notification |
| `login` | Connexion |
| `logout` | Déconnexion |

**Exemple de Log :**
```json
{
  "id": "uuid",
  "team_id": "uuid-team",
  "user_id": "uuid-user",
  "action_type": "status_change",
  "entity_type": "intervention",
  "entity_id": "uuid-intervention",
  "entity_name": "INT-20251226-001",
  "status": "success",
  "description": "Statut changé de 'en_cours' à 'cloturee_par_prestataire'",
  "metadata": {
    "old_status": "en_cours",
    "new_status": "cloturee_par_prestataire",
    "reason": "Travaux terminés"
  },
  "ip_address": "192.168.1.1",
  "created_at": "2025-12-26T10:30:00Z"
}
```

---

### Table: `push_subscriptions`

> **Description** : Abonnements aux notifications push (PWA). Stocke les credentials Web Push.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `endpoint` | TEXT | NO | - | URL du service push (unique) |
| `keys` | JSONB | NO | - | Clés de chiffrement |
| `user_agent` | TEXT | YES | NULL | Navigateur/appareil |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Structure `keys` (JSONB) :**
```json
{
  "p256dh": "BNcRd...",
  "auth": "tBHI..."
}
```

---

## Phase 3: Email System

### Table: `team_email_connections`

> **Description** : Configuration des connexions email IMAP/SMTP par équipe. Permet de recevoir et envoyer des emails.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `provider` | VARCHAR(50) | NO | - | Fournisseur (gmail, outlook, ovh, custom) |
| `email_address` | VARCHAR(255) | NO | - | Adresse email |
| `imap_host` | VARCHAR(255) | NO | - | Serveur IMAP |
| `imap_port` | INTEGER | NO | 993 | Port IMAP |
| `imap_use_ssl` | BOOLEAN | NO | true | SSL pour IMAP |
| `imap_username` | VARCHAR(255) | NO | - | Utilisateur IMAP |
| `imap_password_encrypted` | TEXT | NO | - | Mot de passe chiffré |
| `smtp_host` | VARCHAR(255) | NO | - | Serveur SMTP |
| `smtp_port` | INTEGER | NO | 587 | Port SMTP |
| `smtp_use_tls` | BOOLEAN | NO | true | TLS pour SMTP |
| `smtp_username` | VARCHAR(255) | NO | - | Utilisateur SMTP |
| `smtp_password_encrypted` | TEXT | NO | - | Mot de passe chiffré |
| `last_uid` | BIGINT | YES | NULL | Dernier UID synchronisé |
| `last_sync_at` | TIMESTAMPTZ | YES | NULL | Dernière synchronisation |
| `is_active` | BOOLEAN | NO | true | Connexion active |
| `last_error` | TEXT | YES | NULL | Dernière erreur |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(team_id, email_address)` - Une seule connexion par adresse par équipe

**Configurations Prédéfinies par Provider :**
| Provider | IMAP Host | SMTP Host |
|----------|-----------|-----------|
| `gmail` | imap.gmail.com:993 | smtp.gmail.com:587 |
| `outlook` | outlook.office365.com:993 | smtp.office365.com:587 |
| `ovh` | ssl0.ovh.net:993 | ssl0.ovh.net:587 |
| `custom` | Configuration manuelle | Configuration manuelle |

---

### Table: `emails`

> **Description** : Emails reçus et envoyés. Supporte la recherche full-text en français.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `email_connection_id` | UUID | YES | NULL | FK → `team_email_connections.id` |
| `direction` | VARCHAR(50) | NO | 'received' | Direction (enum) |
| `status` | VARCHAR(50) | NO | 'unread' | Statut (enum) |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `message_id` | TEXT | YES | NULL | Message-ID header |
| `in_reply_to` | UUID | YES | NULL | FK → `emails.id` (réponse à) |
| `references` | TEXT | YES | NULL | References header |
| `from_address` | TEXT | NO | - | Expéditeur |
| `to_addresses` | TEXT[] | NO | `{}` | Destinataires |
| `cc_addresses` | TEXT[] | YES | `{}` | Copie |
| `bcc_addresses` | TEXT[] | YES | `{}` | Copie cachée |
| `subject` | TEXT | YES | NULL | Sujet |
| `body_text` | TEXT | YES | NULL | Corps texte |
| `body_html` | TEXT | YES | NULL | Corps HTML |
| `building_id` | UUID | YES | NULL | FK → `buildings.id` |
| `lot_id` | UUID | YES | NULL | FK → `lots.id` |
| `intervention_id` | UUID | YES | NULL | FK → `interventions.id` |
| `received_at` | TIMESTAMPTZ | YES | NULL | Date de réception |
| `sent_at` | TIMESTAMPTZ | YES | NULL | Date d'envoi |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `search_vector` | TSVECTOR | YES | NULL | Vecteur recherche (généré) |

**Génération du Vecteur de Recherche :**
```sql
search_vector = GENERATED ALWAYS AS (
  setweight(to_tsvector('french', COALESCE(subject, '')), 'A') ||
  setweight(to_tsvector('french', COALESCE(body_text, '')), 'B') ||
  setweight(to_tsvector('french', COALESCE(from_address, '')), 'C')
) STORED
```

**Recherche Full-Text :**
```sql
SELECT * FROM emails
WHERE team_id = $team_id
  AND search_vector @@ plainto_tsquery('french', 'plomberie urgent')
ORDER BY ts_rank(search_vector, plainto_tsquery('french', 'plomberie urgent')) DESC;
```

---

### Table: `email_attachments`

> **Description** : Pièces jointes des emails. Stockées dans Supabase Storage.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `email_id` | UUID | NO | - | FK → `emails.id` |
| `filename` | TEXT | NO | - | Nom du fichier |
| `content_type` | TEXT | NO | - | Type MIME |
| `size_bytes` | INTEGER | NO | - | Taille en bytes |
| `storage_path` | TEXT | NO | - | Chemin dans Storage |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |

---

### Table: `email_blacklist`

> **Description** : Liste noire d'expéditeurs par équipe. Permet de bloquer le spam.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `sender_email` | VARCHAR(500) | NO | - | Email bloqué |
| `sender_domain` | VARCHAR(255) | YES | NULL | Domaine bloqué (optionnel) |
| `reason` | TEXT | YES | NULL | Raison du blocage |
| `blocked_by_user_id` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |

**Contraintes :**
- `UNIQUE(team_id, sender_email)`

**Fonction Helper RLS :**
```sql
CREATE FUNCTION is_sender_blacklisted(p_team_id UUID, p_sender_email VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE team_id = p_team_id
      AND (
        sender_email = p_sender_email OR
        p_sender_email LIKE '%@' || sender_domain
      )
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Phase 4: Contracts

### Table: `contracts`

> **Description** : Baux et contrats de location. Gère le cycle de vie complet d'un bail.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `lot_id` | UUID | NO | - | FK → `lots.id` |
| `created_by` | UUID | YES | NULL | FK → `users.id` |
| `title` | TEXT | YES | NULL | Titre du contrat |
| `contract_type` | VARCHAR(50) | NO | 'bail_habitation' | Type (enum) |
| `status` | VARCHAR(50) | NO | 'brouillon' | Statut (enum) |
| `start_date` | DATE | NO | - | Date de début |
| `duration_months` | INTEGER | NO | 12 | Durée en mois |
| `end_date` | DATE | NO | - | Date de fin (calculée) |
| `signed_date` | DATE | YES | NULL | Date de signature |
| `payment_frequency` | VARCHAR(50) | NO | 'mensuel' | Fréquence paiement (enum) |
| `payment_frequency_value` | INTEGER | NO | 1 | Valeur fréquence (1-12) |
| `rent_amount` | DECIMAL(10,2) | NO | - | Loyer hors charges |
| `charges_amount` | DECIMAL(10,2) | NO | 0 | Charges |
| `guarantee_type` | VARCHAR(50) | NO | 'pas_de_garantie' | Type de garantie (enum) |
| `guarantee_amount` | DECIMAL(10,2) | YES | NULL | Montant de la garantie |
| `guarantee_notes` | TEXT | YES | NULL | Notes sur la garantie |
| `comments` | TEXT | YES | NULL | Commentaires |
| `metadata` | JSONB | YES | `{}` | Données supplémentaires |
| `renewed_from_id` | UUID | YES | NULL | FK → `contracts.id` (renouvellement) |
| `renewed_to_id` | UUID | YES | NULL | FK → `contracts.id` (renouvellement) |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Calcul Automatique de `end_date` :**
```sql
end_date = GENERATED ALWAYS AS (start_date + (duration_months || ' months')::interval) STORED
```

**Contraintes :**
```sql
CHECK (duration_months >= 0 AND duration_months <= 120)
CHECK (payment_frequency_value >= 1 AND payment_frequency_value <= 12)
```

**Types de Contrats :**
| Type | Description |
|------|-------------|
| `bail_habitation` | Bail d'habitation (logement vide) |
| `bail_meuble` | Bail meublé |

**Statuts de Contrat :**
| Statut | Description |
|--------|-------------|
| `brouillon` | En cours de rédaction |
| `actif` | Contrat en cours |
| `expire` | Contrat expiré |
| `resilie` | Résilié avant terme |
| `renouvele` | Remplacé par un renouvellement |

**Types de Garantie :**
| Type | Description |
|------|-------------|
| `pas_de_garantie` | Pas de dépôt de garantie |
| `compte_proprietaire` | Sur compte du propriétaire |
| `compte_bloque` | Compte séquestre |
| `e_depot` | Dépôt électronique (e-depot.be) |
| `autre` | Autre arrangement |

**Chaîne de Renouvellement :**
```
Contrat A (original)
  └── renewed_to_id → Contrat B (1er renouvellement)
                        └── renewed_to_id → Contrat C (2ème renouvellement)
                                             └── renewed_to_id → NULL (actuel)
```

---

### Table: `contract_contacts`

> **Description** : Table pivot many-to-many entre contrats et utilisateurs. Gère les parties au contrat.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `contract_id` | UUID | NO | - | FK → `contracts.id` |
| `user_id` | UUID | NO | - | FK → `users.id` |
| `role` | VARCHAR(50) | NO | 'locataire' | Rôle dans le contrat (enum) |
| `is_primary` | BOOLEAN | NO | false | Contact principal |
| `notes` | TEXT | YES | NULL | Notes |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Contraintes :**
- `UNIQUE(contract_id, user_id, role)` - Un seul rôle par personne par contrat

**Rôles de Contact :**
| Rôle | Description |
|------|-------------|
| `locataire` | Locataire titulaire |
| `colocataire` | Colocataire |
| `garant` | Garant/caution |
| `representant_legal` | Représentant légal |
| `autre` | Autre partie |

---

### Table: `contract_documents`

> **Description** : Documents attachés aux contrats. Stockage dans Supabase Storage.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `contract_id` | UUID | NO | - | FK → `contracts.id` |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `document_type` | VARCHAR(50) | NO | 'autre' | Type (enum) |
| `filename` | TEXT | NO | - | Nom stocké |
| `original_filename` | TEXT | NO | - | Nom original |
| `file_size` | BIGINT | NO | - | Taille en bytes |
| `mime_type` | TEXT | NO | - | Type MIME |
| `storage_path` | TEXT | NO | - | Chemin Storage |
| `storage_bucket` | TEXT | NO | 'contract-documents' | Bucket |
| `title` | TEXT | YES | NULL | Titre |
| `description` | TEXT | YES | NULL | Description |
| `uploaded_by` | UUID | YES | NULL | FK → `users.id` |
| `uploaded_at` | TIMESTAMPTZ | NO | `NOW()` | Date d'upload |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |
| `deleted_by` | UUID | YES | NULL | FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Types de Documents Contrat :**
| Type | Description |
|------|-------------|
| `bail` | Contrat de bail signé |
| `avenant` | Avenant au bail |
| `etat_des_lieux_entree` | État des lieux d'entrée |
| `etat_des_lieux_sortie` | État des lieux de sortie |
| `attestation_assurance` | Attestation d'assurance |
| `justificatif_identite` | Pièce d'identité |
| `justificatif_revenus` | Justificatifs de revenus |
| `caution_bancaire` | Garantie bancaire |
| `quittance` | Quittance de loyer |
| `reglement_copropriete` | Règlement de copropriété |
| `diagnostic` | Diagnostic technique |
| `autre` | Autre document |

---

## Phase 4: Import System

### Table: `import_jobs`

> **Description** : Suivi des imports Excel/CSV. Permet le traitement asynchrone avec progression en temps réel.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Clé primaire |
| `team_id` | UUID | NO | - | FK → `teams.id` |
| `user_id` | UUID | YES | NULL | FK → `users.id` (importateur) |
| `entity_type` | VARCHAR(50) | NO | 'mixed' | Type d'entité (enum) |
| `status` | VARCHAR(50) | NO | 'pending' | Statut (enum) |
| `filename` | VARCHAR(255) | NO | - | Nom du fichier source |
| `total_rows` | INTEGER | NO | 0 | Nombre total de lignes |
| `processed_rows` | INTEGER | NO | 0 | Lignes traitées |
| `success_count` | INTEGER | NO | 0 | Succès |
| `error_count` | INTEGER | NO | 0 | Erreurs |
| `errors` | JSONB | YES | `[]` | Détail des erreurs |
| `created_ids` | JSONB | YES | `{}` | IDs créés par type |
| `updated_ids` | JSONB | YES | `{}` | IDs mis à jour |
| `metadata` | JSONB | YES | `{}` | Métadonnées |
| `started_at` | TIMESTAMPTZ | YES | NULL | Début du traitement |
| `completed_at` | TIMESTAMPTZ | YES | NULL | Fin du traitement |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Date de création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Date de mise à jour |

**Types d'Entités :**
| Type | Description |
|------|-------------|
| `building` | Import d'immeubles uniquement |
| `lot` | Import de lots uniquement |
| `contact` | Import de contacts |
| `contract` | Import de contrats |
| `mixed` | Import mixte (fichier multi-types) |

**Statuts de Job :**
| Statut | Description |
|--------|-------------|
| `pending` | En attente de traitement |
| `validating` | Validation en cours |
| `importing` | Import en cours |
| `completed` | Terminé avec succès |
| `failed` | Échec |
| `cancelled` | Annulé par l'utilisateur |

**Structure `errors` (JSONB) :**
```json
[
  {
    "row": 5,
    "column": "email",
    "value": "invalid-email",
    "message": "Format d'email invalide",
    "severity": "error"
  },
  {
    "row": 12,
    "column": "postal_code",
    "value": "123",
    "message": "Code postal trop court",
    "severity": "warning"
  }
]
```

**Structure `created_ids` (JSONB) :**
```json
{
  "buildings": ["uuid-1", "uuid-2"],
  "lots": ["uuid-3", "uuid-4", "uuid-5"],
  "contacts": ["uuid-6"]
}
```

**Streaming SSE pour la Progression :**
```typescript
// API Route: /api/import/[jobId]/progress
// Envoie des événements SSE pendant le traitement
event: progress
data: {"processed": 50, "total": 100, "current_entity": "Lot A-101"}

event: complete
data: {"success_count": 95, "error_count": 5}
```

---

## Enums PostgreSQL

### Récapitulatif de Tous les Enums

| Enum | Valeurs | Utilisé par |
|------|---------|-------------|
| `user_role` | admin, gestionnaire, locataire, prestataire, proprietaire | users.role |
| `team_member_role` | admin, gestionnaire, locataire, prestataire, proprietaire | team_members.role |
| `provider_category` | prestataire, assurance, notaire, syndic, proprietaire, autre | users.provider_category |
| `invitation_status` | pending, accepted, expired, cancelled | user_invitations.status |
| `country` | belgique, france, allemagne, pays-bas, suisse, luxembourg, autre | buildings.country |
| `lot_category` | appartement, collocation, maison, garage, local_commercial, parking, autre | lots.category |
| `property_document_type` | bail, garantie, facture, diagnostic, photo_compteur, plan, reglement_copropriete, etat_des_lieux, certificat, manuel_utilisation, photo_generale, autre | property_documents.document_type |
| `document_visibility_level` | equipe, locataire, intervention | property_documents.visibility_level |
| `intervention_type` | plomberie, electricite, chauffage, serrurerie, peinture, menage, jardinage, climatisation, vitrerie, toiture, autre | interventions.type, users.speciality |
| `intervention_urgency` | basse, normale, haute, urgente | interventions.urgency |
| `intervention_status` | demande, rejetee, approuvee, demande_de_devis, planification, planifiee, en_cours, cloturee_par_prestataire, cloturee_par_locataire, cloturee_par_gestionnaire, annulee | interventions.status |
| `intervention_scheduling_type` | flexible, fixed, slots | interventions.scheduling_method |
| `time_slot_status` | requested, pending, selected, rejected, cancelled | intervention_time_slots.status |
| `response_type` | accepted, rejected, pending | time_slot_responses.response_type |
| `assignment_mode` | single, group, separate | intervention_assignments (config) |
| `intervention_document_type` | rapport, photo_avant, photo_apres, facture, devis, plan, certificat, garantie, bon_de_commande, autre | intervention_documents.document_type |
| `conversation_thread_type` | group, tenant_to_managers, provider_to_managers | conversation_threads.thread_type |
| `notification_type` | intervention, chat, document, system, team_invite, assignment, status_change, reminder, deadline | notifications.type |
| `notification_priority` | low, normal, high, urgent | notifications.priority |
| `activity_action_type` | create, update, delete, view, assign, unassign, approve, reject, upload, download, share, comment, status_change, send_notification, login, logout | activity_logs.action_type |
| `activity_entity_type` | user, team, building, lot, intervention, document, contact, notification, message, quote, report | activity_logs.entity_type |
| `activity_status` | success, failure, pending | activity_logs.status |
| `email_direction` | received, sent | emails.direction |
| `email_status` | unread, read, archived, deleted | emails.status |
| `contract_type` | bail_habitation, bail_meuble | contracts.contract_type |
| `contract_status` | brouillon, actif, expire, resilie, renouvele | contracts.status |
| `guarantee_type` | pas_de_garantie, compte_proprietaire, compte_bloque, e_depot, autre | contracts.guarantee_type |
| `payment_frequency` | mensuel, trimestriel, semestriel, annuel | contracts.payment_frequency |
| `contract_document_type` | bail, avenant, etat_des_lieux_entree, etat_des_lieux_sortie, attestation_assurance, justificatif_identite, justificatif_revenus, caution_bancaire, quittance, reglement_copropriete, diagnostic, autre | contract_documents.document_type |
| `contract_contact_role` | locataire, colocataire, garant, representant_legal, autre | contract_contacts.role |
| `import_job_status` | pending, validating, importing, completed, failed, cancelled | import_jobs.status |
| `import_entity_type` | building, lot, contact, contract, mixed | import_jobs.entity_type |

---

## Indexes de Performance

### Indexes Critiques pour RLS

```sql
-- Index covering pour éviter les accès table dans les politiques RLS
CREATE INDEX idx_team_members_user_team_role
ON team_members(user_id, team_id, role)
WHERE left_at IS NULL;

-- Index covering pour les requêtes d'intervention
CREATE INDEX idx_interventions_rls_covering
ON interventions(team_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Index pour le chat real-time
CREATE INDEX idx_conversation_threads_intervention_team
ON conversation_threads(intervention_id, team_id);
```

### Indexes Full-Text Search (French)

```sql
-- Recherche dans les immeubles
CREATE INDEX idx_buildings_search ON buildings
USING GIN (to_tsvector('french', name || ' ' || address || ' ' || city));

-- Recherche dans les lots
CREATE INDEX idx_lots_search ON lots
USING GIN (to_tsvector('french', reference || ' ' || COALESCE(description, '')));

-- Recherche dans les documents
CREATE INDEX idx_property_documents_search ON property_documents
USING GIN (to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Recherche dans les emails
CREATE INDEX idx_emails_search_vector ON emails USING GIN (search_vector);

-- Recherche dans les rapports
CREATE INDEX idx_intervention_reports_search ON intervention_reports
USING GIN (to_tsvector('french', COALESCE(title, '') || ' ' || content));

-- Recherche dans les messages
CREATE INDEX idx_conversation_messages_search ON conversation_messages
USING GIN (to_tsvector('french', content));
```

### Indexes Partiels (Soft Delete)

```sql
-- Tous les indexes importants excluent les enregistrements supprimés
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_active ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_active ON lots(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_active ON interventions(team_id, status) WHERE deleted_at IS NULL;
```

---

## Buckets Supabase Storage

| Bucket | Taille Max | Accès | Tables |
|--------|------------|-------|--------|
| `property-documents` | 10 MB | Private | property_documents |
| `intervention-documents` | 10 MB | Private | intervention_documents |
| `email-attachments` | 20 MB | Private | email_attachments |
| `contract-documents` | 50 MB | Private | contract_documents |

---

## Vues

### `lots_with_contacts`

> Agrège les lots avec le comptage des contacts par rôle.

```sql
CREATE VIEW lots_with_contacts AS
SELECT
  l.*,
  COUNT(lc.id) FILTER (WHERE lc.role = 'locataire') AS tenant_count,
  COUNT(lc.id) FILTER (WHERE lc.role = 'proprietaire') AS owner_count,
  COUNT(lc.id) AS total_contacts
FROM lots l
LEFT JOIN lot_contacts lc ON l.id = lc.lot_id
WHERE l.deleted_at IS NULL
GROUP BY l.id;
```

---

## Vues _active (Données Non-Supprimées)

> **🆕 Ajouté le 2025-12-26** - Migration `20251226000002_create_active_views.sql`

Ces vues simplifient les requêtes en filtrant automatiquement les données soft-deleted.

### Vues Disponibles

| Vue | Table Source | Filtre |
|-----|--------------|--------|
| `interventions_active` | `interventions` | `WHERE deleted_at IS NULL` |
| `buildings_active` | `buildings` | `WHERE deleted_at IS NULL` |
| `lots_active` | `lots` | `WHERE deleted_at IS NULL` |
| `contracts_active` | `contracts` | `WHERE deleted_at IS NULL` |

### Utilisation

```typescript
// Requête simplifiée - pas besoin de filtrer deleted_at
const { data } = await supabase
  .from('interventions_active')
  .select('*')
  .eq('team_id', teamId)

// Équivalent à :
const { data } = await supabase
  .from('interventions')
  .select('*')
  .eq('team_id', teamId)
  .is('deleted_at', null)
```

### Héritage RLS

Les vues héritent **automatiquement** des politiques RLS des tables sources. Pas besoin de créer des politiques supplémentaires.

### Note sur les Types TypeScript

Les vues ne génèrent pas de types dans `database.types.ts`. Utilisez les types des tables sources :

```typescript
import { Database } from '@/lib/database.types'
type Intervention = Database['public']['Tables']['interventions']['Row']
// Fonctionne aussi pour interventions_active
```

---

## Propositions d'Amélioration de l'Architecture

> **Sources de référence :**
> - [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
> - [Crunchy Data: Multi-tenancy Design](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
> - [AWS Multi-tenant PostgreSQL](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html)

### 1. Performance RLS (CRITIQUE - Impact 100x)

#### 1.1 Wrapper SELECT pour Caching des Fonctions

**Problème actuel :** Les fonctions dans les politiques RLS sont appelées pour **chaque ligne** scannée.

```sql
-- ❌ LENT: Fonction appelée N fois (N = nombre de lignes)
USING (is_admin() OR auth.uid() = user_id)

-- ✅ RAPIDE: Fonction appelée 1 fois grâce au cache initPlan
USING ((SELECT is_admin()) OR (SELECT auth.uid()) = user_id)
```

**Impact :** Amélioration jusqu'à **100x** sur les grandes tables.

**Tables concernées :** Toutes les tables avec politiques RLS utilisant `is_admin()`, `auth.uid()`, `is_gestionnaire()`, etc.

#### 1.2 Inversion des Requêtes Team

**Problème actuel :**
```sql
-- ❌ LENT: Scanne team_members pour chaque ligne de la table
auth.uid() IN (SELECT user_id FROM team_members WHERE team_id = table.team_id)
```

**Solution optimisée :**
```sql
-- ✅ RAPIDE: Filtre d'abord par l'utilisateur courant (index seek)
team_id IN (SELECT team_id FROM team_members WHERE user_id = (SELECT auth.uid()) AND left_at IS NULL)
```

**Tables concernées :** `buildings`, `lots`, `interventions`, `contracts`, `emails`

#### 1.3 Indexes Manquants pour RLS

```sql
-- Index covering critique pour team_members (utilisé dans toutes les politiques)
CREATE INDEX CONCURRENTLY idx_team_members_user_active
ON team_members(user_id, team_id, role)
WHERE left_at IS NULL;

-- Index pour lot_contacts (vérification locataire)
CREATE INDEX CONCURRENTLY idx_lot_contacts_user_lot
ON lot_contacts(user_id, lot_id);

-- Index pour intervention_assignments (vérification prestataire)
CREATE INDEX CONCURRENTLY idx_intervention_assignments_user_role
ON intervention_assignments(user_id, role, intervention_id);
```

---

### 2. Architecture Multi-Tenant

#### 2.1 Validation : Pool Model ✅

SEIDO utilise le **Pool Model** (Shared Database, Shared Tables) avec `team_id` sur toutes les tables. C'est l'approche recommandée pour :
- Coûts optimisés
- Maintenance simplifiée
- Scalabilité native PostgreSQL

#### 2.2 Amélioration : Dénormalisation team_id

**Principe :** Avoir `team_id` directement sur TOUTES les tables, même si déductible via FK.

| Table | État Actuel | Recommandation |
|-------|-------------|----------------|
| `building_contacts` | Via `building.team_id` | ➕ Ajouter `team_id` direct |
| `lot_contacts` | Via `lot.team_id` | ➕ Ajouter `team_id` direct |
| `intervention_time_slots` | Via `intervention.team_id` | ➕ Ajouter `team_id` direct |
| `conversation_messages` | Via `thread.team_id` | ✅ Déjà optimisé |

**Avantage :** Évite les JOINs dans les politiques RLS → queries plus rapides.

---

### 3. Relations Polymorphiques

#### 3.1 État Actuel (Acceptable)

```sql
-- Pattern XOR pour interventions et property_documents
building_id UUID REFERENCES buildings(id),
lot_id UUID REFERENCES lots(id),
CONSTRAINT valid_property CHECK (
  (building_id IS NOT NULL AND lot_id IS NULL) OR
  (building_id IS NULL AND lot_id IS NOT NULL)
)
```

**Verdict :** Le coût de migration vers une table intermédiaire `property_entities` dépasse les bénéfices. Garder l'approche actuelle.

---

### 4. Soft Delete Améliorations

#### 4.1 Pattern Actuel (Bon ✅)

```sql
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES users(id)
```

#### 4.2 Recommandations

**4.2.1 Vues pour Données Actives**
```sql
-- Créer des vues _active pour simplifier les requêtes
CREATE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

CREATE VIEW buildings_active AS
SELECT * FROM buildings WHERE deleted_at IS NULL;
```

**4.2.2 Index Partiels Systématiques**
```sql
-- S'assurer que TOUTES les tables principales ont l'index partiel
CREATE INDEX idx_contracts_active ON contracts(team_id, status)
WHERE deleted_at IS NULL;
```

---

### 5. Supabase Best Practices Spécifiques

#### 5.1 Realtime Optimisation

```sql
-- Politique RLS optimisée pour Realtime (avec wrapper SELECT)
CREATE POLICY "notifications_realtime" ON notifications
FOR SELECT USING (
  user_id = (SELECT auth.uid())  -- Cache la valeur
);
```

#### 5.2 Edge Functions pour Logique Complexe

| Opération | Candidat Edge Function | Raison |
|-----------|------------------------|--------|
| Création intervention | ✅ Oui | Notifications + threads + validation |
| Changement de statut | ✅ Oui | Workflow + side effects |
| Import Excel | ✅ Oui | Traitement long + transaction |
| CRUD simple | ❌ Non | PostgREST suffit |

#### 5.3 Storage Policies

| Bucket | Statut |
|--------|--------|
| `property-documents` | ✅ RLS configuré |
| `intervention-documents` | ✅ RLS configuré |
| `contract-documents` | ✅ RLS configuré |
| `email-attachments` | ⚠️ À vérifier |

---

### 6. Évolutions Futures

#### 6.1 Historisation des Données

```sql
-- Table d'historique générique (alternative à activity_logs pour données)
CREATE TABLE entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par entité
CREATE INDEX idx_entity_history_lookup
ON entity_history(entity_type, entity_id, changed_at DESC);
```

#### 6.2 Partitionnement (Future Scalabilité)

Pour > 10k interventions par équipe :
```sql
CREATE TABLE interventions_partitioned (
  LIKE interventions INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE interventions_2025 PARTITION OF interventions_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

---

### 7. Matrice de Priorités

| Priorité | Amélioration | Effort | Impact | Statut |
|----------|--------------|--------|--------|--------|
| 🔴 **P0** | Wrapper SELECT dans RLS | Faible | **Très élevé (100x)** | ✅ Déjà fait (SECURITY DEFINER) |
| 🔴 **P0** | Inversion requêtes team | Faible | **Élevé** | ✅ Déjà fait |
| 🟠 **P1** | Indexes RLS manquants | Faible | Élevé | ✅ Déjà fait (147+ indexes) |
| 🟠 **P1** | Dénormalisation team_id | Moyen | Moyen | ✅ **FAIT** (2025-12-26) |
| 🟡 **P2** | Vues _active | Faible | Moyen | ✅ **FAIT** (2025-12-26) |
| 🟡 **P2** | Edge Functions | Élevé | Moyen | ⏳ À évaluer |
| 🟢 **P3** | Historisation | Moyen | Faible | ⏳ Futur |
| 🟢 **P3** | Partitionnement | Élevé | Futur | ⏳ Futur |

### Migrations Appliquées (2025-12-26)

| Migration | Description |
|-----------|-------------|
| `20251226000001_denormalize_team_id.sql` | Ajoute `team_id` sur 4 tables + triggers + nouvelles RLS |
| `20251226000002_create_active_views.sql` | Crée 4 vues `_active` pour données non-supprimées |

---

*Document mis à jour - SEIDO v1.2 - 2025-12-26*
