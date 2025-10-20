# 🏢 PHASE 2: Migration Buildings & Lots

**Status**: ✅ APPLIQUÉ (Architecture refactorée - Junction Tables only)
**Date de création**: 2025-10-10
**Dernière mise à jour**: 2025-10-11

---

## 📋 Vue d'ensemble

### Objectifs
Migrer les tables **buildings** (immeubles) et **lots** vers la nouvelle architecture modulaire avec:
- ✅ Row Level Security (RLS) pour isolation multi-tenant
- ✅ Soft delete pour traçabilité
- ✅ Compteurs dénormalisés pour performance
- ✅ **Relations many-to-many EXCLUSIVEMENT via tables de jonction** (pas de colonnes redondantes)
- ✅ Support des interventions à double niveau (immeuble ET lot)
- ✅ **Architecture refactorée** (2025-10-11): Suppression `gestionnaire_id` (buildings) et `tenant_id`/`gestionnaire_id` (lots)

### Entités concernées
1. **Buildings** (Immeubles) - Bâtiments gérés par une équipe
2. **Lots** (Logements/Locaux) - Unités à l'intérieur d'un immeuble
3. **Building Contacts** - Contacts associés aux immeubles (gestionnaires, prestataires)
4. **Lot Contacts** - Contacts associés aux lots (locataires, prestataires)

---

## 🗂️ Schéma des tables

### 0. Enums globaux

```sql
-- ============================================================================
-- ENUM: country
-- Description: Liste des pays supportés par la plateforme
-- ============================================================================

CREATE TYPE country AS ENUM (
  'belgique',
  'france',
  'allemagne',
  'pays-bas',
  'suisse',
  'luxembourg',
  'autre'
);

COMMENT ON TYPE country IS 'Pays supportés pour les adresses d''immeubles et lots (Europe + autre)';
```

---

### 1. Table `buildings`

```sql
-- ============================================================================
-- TABLE: buildings
-- Description: Immeubles gérés par les équipes
-- Relations: team_id (SEULE relation directe, gestionnaires via building_contacts)
-- ============================================================================

CREATE TABLE buildings (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- ⚠️ NOTE: Gestionnaires associés via building_contacts (many-to-many)

  -- Informations de base
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country country DEFAULT 'france' NOT NULL,
  description TEXT, -- Description et notes internes

  -- Compteurs dénormalisés (mis à jour par triggers)
  total_lots INTEGER DEFAULT 0 CHECK (total_lots >= 0),
  occupied_lots INTEGER DEFAULT 0 CHECK (occupied_lots >= 0),
  vacant_lots INTEGER DEFAULT 0 CHECK (vacant_lots >= 0),
  total_interventions INTEGER DEFAULT 0 CHECK (total_interventions >= 0),
  active_interventions INTEGER DEFAULT 0 CHECK (active_interventions >= 0),

  -- Métadonnées extensibles
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT valid_lots_count CHECK (occupied_lots + vacant_lots = total_lots)
);

-- Commentaires
COMMENT ON TABLE buildings IS 'Immeubles gérés par les équipes (gestionnaires via building_contacts)';
COMMENT ON COLUMN buildings.country IS 'Pays de localisation de l''immeuble';
COMMENT ON COLUMN buildings.description IS 'Description de l''immeuble et notes internes';
COMMENT ON COLUMN buildings.total_lots IS 'Nombre total de lots (calculé automatiquement)';
COMMENT ON COLUMN buildings.occupied_lots IS 'Nombre de lots occupés (calculé automatiquement)';
COMMENT ON COLUMN buildings.vacant_lots IS 'Nombre de lots vacants (calculé automatiquement)';
COMMENT ON COLUMN buildings.metadata IS 'Données extensibles (ex: année construction, ascenseur, etc.)';

-- ============================================================================
-- INDEXES pour buildings
-- ============================================================================

-- Index principal: recherche par équipe (RLS)
CREATE INDEX idx_buildings_team
  ON buildings(team_id)
  WHERE deleted_at IS NULL;

-- ⚠️ NOTE: Recherche par gestionnaire se fait via building_contacts (voir indexes building_contacts)

-- Index: recherche par ville
CREATE INDEX idx_buildings_city
  ON buildings(city)
  WHERE deleted_at IS NULL;

-- Index: recherche par code postal
CREATE INDEX idx_buildings_postal
  ON buildings(postal_code)
  WHERE deleted_at IS NULL;

-- Index: recherche par pays
CREATE INDEX idx_buildings_country
  ON buildings(country)
  WHERE deleted_at IS NULL;

-- Index: recherche full-text sur nom et adresse
CREATE INDEX idx_buildings_search
  ON buildings USING gin(to_tsvector('french', name || ' ' || address || ' ' || city));

-- Index: soft delete
CREATE INDEX idx_buildings_deleted
  ON buildings(deleted_at);
```

---

### 2. Table `lots`

```sql
-- ============================================================================
-- TABLE: lots
-- Description: Lots (logements, locaux) à l'intérieur des immeubles
-- Relations: building_id (optionnel), team_id (obligatoire)
-- ⚠️ NOTE: Locataires/Gestionnaires associés via lot_contacts (many-to-many)
-- ============================================================================

-- Enum: catégories de lots
CREATE TYPE lot_category AS ENUM (
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'parking',
  'autre'
);

CREATE TABLE lots (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE, -- ✨ NULLABLE pour lots indépendants
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, -- ✨ Obligatoire pour lots standalone
  -- ⚠️ NOTE: Locataires ET gestionnaires via lot_contacts (many-to-many, support colocation + multi-managers)

  -- Informations de base
  reference TEXT NOT NULL, -- Ex: "A101", "B-RDC-01", "Maison 12"
  category lot_category NOT NULL DEFAULT 'appartement',
  floor INTEGER, -- Étage (NULL pour parking/garage/maison)
  description TEXT, -- Description et notes internes

  -- Adresse complète (pour lots indépendants/maisons)
  street TEXT, -- Numéro et nom de rue (ex: "12 rue de la Paix")
  city TEXT,
  postal_code TEXT,
  country country, -- Pays

  -- Compteurs dénormalisés
  total_interventions INTEGER DEFAULT 0 CHECK (total_interventions >= 0),
  active_interventions INTEGER DEFAULT 0 CHECK (active_interventions >= 0),

  -- Métadonnées extensibles
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT unique_lot_reference_per_team
    UNIQUE (team_id, reference)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT valid_floor_range
    CHECK (floor IS NULL OR (floor >= -5 AND floor <= 100))

  -- ⚠️ Note: Pas de contrainte sur les adresses
  -- Les lots peuvent avoir une adresse complète MÊME s'ils sont dans un immeuble (building_id NOT NULL)
  -- Cas d'usage: Lot dans un immeuble non géré par le gestionnaire → adresse au niveau du lot
);

-- Commentaires
COMMENT ON TABLE lots IS 'Lots (appartements, maisons, locaux) liés ou non à un immeuble. Locataires/gestionnaires via lot_contacts (many-to-many)';
COMMENT ON COLUMN lots.building_id IS 'Immeuble parent (NULL si lot indépendant/standalone)';
COMMENT ON COLUMN lots.team_id IS 'Équipe propriétaire (obligatoire, même pour lots standalone)';
COMMENT ON COLUMN lots.reference IS 'Référence unique du lot au sein de l''équipe';
COMMENT ON COLUMN lots.category IS 'Type de lot (appartement, maison, commerce, parking, etc.)';
COMMENT ON COLUMN lots.description IS 'Description du lot et notes internes (occupancy calculée via lot_contacts)';
COMMENT ON COLUMN lots.street IS 'Adresse complète (optionnelle, utilisée si building_id NULL OU si lot dans immeuble non géré)';
COMMENT ON COLUMN lots.city IS 'Ville (optionnelle, utilisée si adresse au niveau du lot)';
COMMENT ON COLUMN lots.postal_code IS 'Code postal (optionnel, utilisé si adresse au niveau du lot)';
COMMENT ON COLUMN lots.country IS 'Pays (optionnel, utilisé si adresse au niveau du lot)';
COMMENT ON COLUMN lots.metadata IS 'Données extensibles (ex: nb pièces, meublé, etc.)';

-- ============================================================================
-- INDEXES pour lots
-- ============================================================================

-- Index principal: recherche par équipe (pour lots standalone et RLS)
CREATE INDEX idx_lots_team
  ON lots(team_id)
  WHERE deleted_at IS NULL;

-- Index: recherche par immeuble (building_id peut être NULL)
CREATE INDEX idx_lots_building
  ON lots(building_id)
  WHERE deleted_at IS NULL AND building_id IS NOT NULL;

-- Index: lots standalone (sans immeuble parent)
CREATE INDEX idx_lots_standalone
  ON lots(team_id)
  WHERE deleted_at IS NULL AND building_id IS NULL;

-- ⚠️ NOTE: Recherche par gestionnaire/locataire se fait via lot_contacts (voir indexes lot_contacts)

-- Index: recherche par catégorie
CREATE INDEX idx_lots_category
  ON lots(category)
  WHERE deleted_at IS NULL;

-- Index: recherche par ville (pour lots standalone)
CREATE INDEX idx_lots_city
  ON lots(city)
  WHERE deleted_at IS NULL AND city IS NOT NULL;

-- Index: recherche par code postal (pour lots standalone)
CREATE INDEX idx_lots_postal
  ON lots(postal_code)
  WHERE deleted_at IS NULL AND postal_code IS NOT NULL;

-- Index: recherche par pays (pour lots standalone)
CREATE INDEX idx_lots_country
  ON lots(country)
  WHERE deleted_at IS NULL AND country IS NOT NULL;

-- Index: recherche par étage (dans un immeuble)
CREATE INDEX idx_lots_floor
  ON lots(building_id, floor)
  WHERE deleted_at IS NULL AND building_id IS NOT NULL AND floor IS NOT NULL;

-- ⚠️ NOTE: Lots vacants/occupés calculés via lot_contacts (JOIN avec users WHERE role='locataire')
-- ⚠️ Compteurs occupied_lots/vacant_lots dans buildings maintenus par trigger lot_contacts

-- Index: recherche full-text sur référence et adresse (lots standalone)
CREATE INDEX idx_lots_search
  ON lots USING gin(to_tsvector('french',
    reference || ' ' ||
    COALESCE(street, '') || ' ' ||
    COALESCE(city, '')
  ))
  WHERE deleted_at IS NULL;

-- Index: soft delete
CREATE INDEX idx_lots_deleted
  ON lots(deleted_at);
```

---

### 3. Table `building_contacts`

```sql
-- ============================================================================
-- TABLE: building_contacts
-- Description: Relation many-to-many entre immeubles et contacts
-- Utilisé pour: gestionnaires secondaires, prestataires attitrés, etc.
-- ============================================================================

CREATE TABLE building_contacts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Métadonnées de la relation
  is_primary BOOLEAN DEFAULT FALSE, -- Indique le contact principal
  role TEXT, -- Role spécifique pour ce building (ex: "plombier attitré")
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT unique_building_user
    UNIQUE (building_id, user_id)
);

-- Commentaires
COMMENT ON TABLE building_contacts IS 'Association many-to-many entre immeubles et contacts';
COMMENT ON COLUMN building_contacts.is_primary IS 'Indique si c''est le contact principal pour ce building';
COMMENT ON COLUMN building_contacts.role IS 'Rôle spécifique du contact pour cet immeuble';

-- ============================================================================
-- INDEXES pour building_contacts
-- ============================================================================

-- Index: recherche par immeuble
CREATE INDEX idx_building_contacts_building
  ON building_contacts(building_id);

-- Index: recherche par utilisateur
CREATE INDEX idx_building_contacts_user
  ON building_contacts(user_id);

-- Index: contacts principaux
CREATE INDEX idx_building_contacts_primary
  ON building_contacts(building_id)
  WHERE is_primary = TRUE;
```

---

### 4. Table `lot_contacts`

```sql
-- ============================================================================
-- TABLE: lot_contacts
-- Description: Relation many-to-many entre lots et contacts
-- Utilisé pour: colocataires, prestataires attitrés au lot, etc.
-- ============================================================================

CREATE TABLE lot_contacts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Métadonnées de la relation
  is_primary BOOLEAN DEFAULT FALSE, -- Indique le locataire principal
  role TEXT, -- Role spécifique pour ce lot (ex: "colocataire")
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT unique_lot_user
    UNIQUE (lot_id, user_id)
);

-- Commentaires
COMMENT ON TABLE lot_contacts IS 'Association many-to-many entre lots et contacts';
COMMENT ON COLUMN lot_contacts.is_primary IS 'Indique si c''est le locataire principal';
COMMENT ON COLUMN lot_contacts.role IS 'Rôle spécifique du contact pour ce lot (ex: colocataire)';

-- ============================================================================
-- INDEXES pour lot_contacts
-- ============================================================================

-- Index: recherche par lot
CREATE INDEX idx_lot_contacts_lot
  ON lot_contacts(lot_id);

-- Index: recherche par utilisateur
CREATE INDEX idx_lot_contacts_user
  ON lot_contacts(user_id);

-- Index: contacts principaux (locataires principaux)
CREATE INDEX idx_lot_contacts_primary
  ON lot_contacts(lot_id)
  WHERE is_primary = TRUE;
```

---

### 5. Table `property_documents` (🆕 Gestion Documentaire)

```sql
-- ============================================================================
-- TABLE: property_documents
-- Description: Documents liés aux immeubles et lots (baux, garanties, photos, diagnostics)
-- ============================================================================

-- Enum: Types de documents property
CREATE TYPE property_document_type AS ENUM (
  'bail',                  -- Contrat de location
  'garantie',              -- Garantie d'appareil
  'facture',               -- Facture de travaux/équipement
  'diagnostic',            -- DPE, amiante, plomb, gaz, électricité
  'photo_compteur',        -- Photo compteur eau/gaz/électricité
  'plan',                  -- Plan du lot/immeuble
  'reglement_copropriete', -- Règlement de copropriété
  'etat_des_lieux',        -- État des lieux entrée/sortie
  'certificat',            -- Certificat de conformité, ramonage, etc.
  'manuel_utilisation',    -- Manuel d'utilisation d'un appareil
  'photo_generale',        -- Photo générale du bien
  'autre'                  -- Autres documents
);

-- Enum: Niveaux de visibilité (3 niveaux)
CREATE TYPE document_visibility_level AS ENUM (
  'equipe',               -- Visible par tous les gestionnaires de l'équipe
  'locataire',            -- Visible par les gestionnaires + le locataire du lot
  'intervention'          -- Partagé temporairement lors d'une intervention spécifique
);

CREATE TABLE property_documents (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations (polymorphique: building OU lot)
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type et catégorie
  document_type property_document_type NOT NULL,
  category TEXT, -- Catégorie custom (ex: "Chaudière Viessmann", "Compteur EDF")

  -- Informations fichier
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'property-documents' NOT NULL,

  -- Métadonnées
  title TEXT, -- Titre personnalisé (ex: "Garantie chaudière - expire 2027")
  description TEXT,
  tags TEXT[] DEFAULT '{}', -- Tags pour recherche (ex: ['chaudière', 'viessmann', '2024'])

  -- Dates importantes
  expiry_date DATE, -- Date d'expiration (pour garanties, baux, diagnostics)
  document_date DATE, -- Date du document (ex: date de signature du bail)

  -- Visibilité
  visibility_level document_visibility_level DEFAULT 'equipe' NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE, -- Archive sans supprimer

  -- Audit
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Contraintes
  CONSTRAINT valid_property_reference CHECK (
    (building_id IS NOT NULL AND lot_id IS NULL) OR
    (building_id IS NULL AND lot_id IS NOT NULL)
  ),
  CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date >= document_date)
);

-- Commentaires
COMMENT ON TABLE property_documents IS 'Documents liés aux immeubles et lots (baux, garanties, photos, diagnostics)';
COMMENT ON COLUMN property_documents.building_id IS 'Immeuble (NULL si document de lot)';
COMMENT ON COLUMN property_documents.lot_id IS 'Lot (NULL si document d''immeuble)';
COMMENT ON COLUMN property_documents.visibility_level IS 'Niveau de visibilité du document';
COMMENT ON COLUMN property_documents.expiry_date IS 'Date d''expiration (garanties, baux, diagnostics)';
COMMENT ON COLUMN property_documents.is_archived IS 'Archivé mais pas supprimé (pour historique)';
COMMENT ON COLUMN property_documents.tags IS 'Tags pour recherche full-text (ex: [''chaudière'', ''viessmann''])';

-- ============================================================================
-- INDEXES pour property_documents
-- ============================================================================

-- Index: recherche par immeuble
CREATE INDEX idx_property_documents_building
  ON property_documents(building_id)
  WHERE deleted_at IS NULL;

-- Index: recherche par lot
CREATE INDEX idx_property_documents_lot
  ON property_documents(lot_id)
  WHERE deleted_at IS NULL;

-- Index: recherche par équipe
CREATE INDEX idx_property_documents_team
  ON property_documents(team_id)
  WHERE deleted_at IS NULL;

-- Index: recherche par type
CREATE INDEX idx_property_documents_type
  ON property_documents(document_type)
  WHERE deleted_at IS NULL;

-- Index: recherche par visibilité
CREATE INDEX idx_property_documents_visibility
  ON property_documents(visibility_level)
  WHERE deleted_at IS NULL;

-- Index: recherche par uploadeur
CREATE INDEX idx_property_documents_uploaded_by
  ON property_documents(uploaded_by)
  WHERE deleted_at IS NULL;

-- Index: documents expirant bientôt
CREATE INDEX idx_property_documents_expiry
  ON property_documents(expiry_date)
  WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

-- Index: documents archivés
CREATE INDEX idx_property_documents_archived
  ON property_documents(is_archived)
  WHERE deleted_at IS NULL;

-- Index: recherche full-text sur titre, description, tags
CREATE INDEX idx_property_documents_search
  ON property_documents
  USING gin(to_tsvector('french',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    array_to_string(tags, ' ')
  ))
  WHERE deleted_at IS NULL;

-- Index: soft delete
CREATE INDEX idx_property_documents_deleted
  ON property_documents(deleted_at);
```

---

### 6. Table `document_intervention_shares` (🆕 Partage Documents lors Interventions)

```sql
-- ============================================================================
-- TABLE: document_intervention_shares
-- Description: Partage de documents property lors d'interventions spécifiques
-- ============================================================================

CREATE TABLE document_intervention_shares (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  document_id UUID NOT NULL REFERENCES property_documents(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,

  -- Qui peut voir ce document lors de l'intervention ?
  visible_to_provider BOOLEAN DEFAULT FALSE,
  visible_to_tenant BOOLEAN DEFAULT TRUE,

  -- Notes optionnelles du gestionnaire
  share_note TEXT, -- Ex: "Voir photo compteur avant intervention"

  -- Audit
  shared_by UUID NOT NULL REFERENCES users(id), -- Gestionnaire qui a partagé
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE, -- Date de révocation du partage
  revoked_by UUID REFERENCES users(id),

  -- Contraintes
  CONSTRAINT unique_document_intervention UNIQUE (document_id, intervention_id)
);

-- Commentaires
COMMENT ON TABLE document_intervention_shares IS 'Partage de documents property lors d''interventions spécifiques';
COMMENT ON COLUMN document_intervention_shares.visible_to_provider IS 'Le prestataire peut voir ce document';
COMMENT ON COLUMN document_intervention_shares.visible_to_tenant IS 'Le locataire peut voir ce document';
COMMENT ON COLUMN document_intervention_shares.share_note IS 'Note du gestionnaire pour expliquer le partage';
COMMENT ON COLUMN document_intervention_shares.revoked_at IS 'Date de révocation (NULL si toujours actif)';

-- ============================================================================
-- INDEXES pour document_intervention_shares
-- ============================================================================

-- Index: recherche par document
CREATE INDEX idx_doc_shares_document
  ON document_intervention_shares(document_id)
  WHERE revoked_at IS NULL;

-- Index: recherche par intervention
CREATE INDEX idx_doc_shares_intervention
  ON document_intervention_shares(intervention_id)
  WHERE revoked_at IS NULL;

-- Index: recherche par partageur
CREATE INDEX idx_doc_shares_shared_by
  ON document_intervention_shares(shared_by);
```

---

## 🔒 Row Level Security (RLS)

> **⚠️ APPROCHE RECOMMANDÉE**: Ce plan utilise l'approche **Helper Functions** (best practice officielle Supabase)
> 📚 **Documentation complète**: Voir `migration-phase2-rls-best-practices.md`

### Principes généraux
- **✅ Pattern officiel Supabase**: Fonctions PostgreSQL réutilisables + Policies simples
- **✅ DRY (Don't Repeat Yourself)**: Logique centralisée dans 10 fonctions helper
- **✅ Performance optimale**: Fonctions `STABLE` inlinées par PostgreSQL
- **✅ Maintainabilité**: Une modification dans la fonction = toutes les policies héritent

### Architecture RLS

**10 Fonctions Helper** (`SECURITY DEFINER`):
1. `is_admin()` - Vérifie si l'utilisateur est admin
2. `is_gestionnaire()` - Vérifie si l'utilisateur est gestionnaire
3. `user_in_team(team_id)` - Vérifie l'appartenance à une équipe
4. `is_team_manager(team_id)` - Vérifie si gestionnaire d'une équipe donnée
5. `can_view_building(id)` - Logique SELECT consolidée pour buildings
6. `can_view_lot(id)` - Logique SELECT consolidée pour lots (standalone ET immeuble)
7. `get_building_team_id(id)` - Récupère le team_id d'un building
8. `get_lot_team_id(id)` - ⚠️ **MODIFIÉ**: Récupère le team_id d'un lot (via building parent OU directement)
9. `is_assigned_to_building(id)` - Vérifie assignation prestataire au building
10. `is_tenant_of_lot(id)` - Vérifie si locataire du lot

**16 Policies Simples** (4 par table) utilisant les fonctions ci-dessus

> ⚠️ **IMPORTANT - Lots Standalone**: Les fonctions `get_lot_team_id()` et `can_view_lot()` doivent gérer deux cas:
> - **Lot dans un immeuble** (`building_id NOT NULL`): Récupérer le team_id via `buildings.team_id`
> - **Lot standalone** (`building_id NULL`): Utiliser directement `lots.team_id`

---

### RLS pour `buildings`

**Note**: Les policies utilisent les fonctions helper définies dans `migration-phase2-rls-best-practices.md`

```sql
-- ============================================================================
-- RLS POLICIES: buildings (Version simplifiée avec Helper Functions)
-- ============================================================================

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Admin + Gestionnaire équipe + Prestataire assigné + Locataire du building
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_select
  ON buildings FOR SELECT
  USING (can_view_building(id));

COMMENT ON POLICY buildings_select ON buildings IS
  'Utilise can_view_building() qui gère: admin (tout), équipe (leur team), prestataire (assignés), locataire (leur building)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_insert
  ON buildings FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_insert ON buildings IS
  'Admin peut créer partout, gestionnaire peut créer dans son équipe uniquement';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_update
  ON buildings FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR
      is_team_manager(team_id)
    )
  )
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_update ON buildings IS
  'Admin peut modifier partout, gestionnaire peut modifier dans son équipe';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin + Gestionnaire de l'équipe (soft delete)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_delete
  ON buildings FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_delete ON buildings IS
  'Admin peut supprimer partout, gestionnaire peut supprimer dans son équipe (soft delete recommandé)';
```

---

### RLS pour `lots`

**Note**: Les policies utilisent les fonctions helper, notamment `can_view_lot()` qui gère le gestionnaire_id ajouté

```sql
-- ============================================================================
-- RLS POLICIES: lots (Version simplifiée avec Helper Functions)
-- ============================================================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Logique complexe gérée par can_view_lot()
-- Admin + Gestionnaire équipe + Gestionnaire direct (gestionnaire_id) + Prestataire + Locataire
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_select
  ON lots FOR SELECT
  USING (can_view_lot(id));

COMMENT ON POLICY lots_select ON buildings IS
  'Utilise can_view_lot() qui gère: admin, gestionnaire équipe, gestionnaire direct du lot, prestataire assigné, locataire du lot';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin + Gestionnaire de l'équipe (building parent OU team_id pour standalone)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_insert
  ON lots FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    -- Si lot dans un immeuble, vérifier la team de l'immeuble
    (building_id IS NOT NULL AND is_team_manager(get_building_team_id(building_id)))
    OR
    -- Si lot standalone, vérifier directement la team du lot
    (building_id IS NULL AND is_team_manager(team_id))
  );

COMMENT ON POLICY lots_insert ON lots IS
  'Admin peut créer partout, gestionnaire peut créer dans son équipe (immeuble OU standalone)';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin + Gestionnaire équipe + Gestionnaire direct du lot (gestionnaire_id)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_update
  ON lots FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR
      is_team_manager(get_lot_team_id(id))
      OR
      (gestionnaire_id = auth.uid() AND is_gestionnaire())  -- ✨ Gestionnaire direct du lot
    )
  )
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(id))
    OR
    (gestionnaire_id = auth.uid() AND is_gestionnaire())
  );

COMMENT ON POLICY lots_update ON lots IS
  'Admin, gestionnaire d''équipe, OU gestionnaire direct du lot (gestionnaire_id) peuvent modifier';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_delete
  ON lots FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(id))
  );

COMMENT ON POLICY lots_delete ON lots IS
  'Admin ou gestionnaire d''équipe peuvent supprimer (soft delete recommandé)';
```

---

### RLS pour `building_contacts`

```sql
-- ============================================================================
-- RLS POLICIES: building_contacts (Version simplifiée)
-- ============================================================================

ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Peut voir si peut voir le building parent
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY building_contacts_select
  ON building_contacts FOR SELECT
  USING (can_view_building(building_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT/UPDATE/DELETE: Admin + Gestionnaire de l'équipe du building
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY building_contacts_insert
  ON building_contacts FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

CREATE POLICY building_contacts_update
  ON building_contacts FOR UPDATE
  USING (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

CREATE POLICY building_contacts_delete
  ON building_contacts FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );
```

---

### RLS pour `lot_contacts`

```sql
-- ============================================================================
-- RLS POLICIES: lot_contacts (Version simplifiée)
-- ============================================================================

ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Peut voir si peut voir le lot parent
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lot_contacts_select
  ON lot_contacts FOR SELECT
  USING (can_view_lot(lot_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT/UPDATE/DELETE: Admin + Gestionnaire de l'équipe du lot
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lot_contacts_insert
  ON lot_contacts FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );

CREATE POLICY lot_contacts_update
  ON lot_contacts FOR UPDATE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );

CREATE POLICY lot_contacts_delete
  ON lot_contacts FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );
```

---

### RLS pour `property_documents`

```sql
-- ============================================================================
-- RLS POLICIES: property_documents (Gestion documentaire)
-- ============================================================================

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Selon visibility_level
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY property_documents_select
  ON property_documents FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Admin: voit tout
      is_admin()
      OR
      -- Gestionnaire de l'équipe: voit selon visibility_level
      (
        is_team_manager(team_id)
        AND (
          visibility_level = 'equipe'
          OR visibility_level = 'locataire'
        )
      )
      OR
      -- Locataire: voit documents de son lot si visibility_level = 'locataire'
      (
        visibility_level = 'locataire'
        AND lot_id IS NOT NULL
        AND is_tenant_of_lot(lot_id)
      )
      OR
      -- Partage lors d'une intervention (via document_intervention_shares)
      EXISTS (
        SELECT 1 FROM document_intervention_shares dis
        INNER JOIN interventions i ON dis.intervention_id = i.id
        WHERE dis.document_id = property_documents.id
          AND dis.revoked_at IS NULL
          AND (
            -- Prestataire assigné à l'intervention ET visible_to_provider = TRUE
            (i.prestataire_id = auth.uid() AND dis.visible_to_provider = TRUE)
            OR
            -- Locataire de l'intervention ET visible_to_tenant = TRUE
            (i.tenant_id = auth.uid() AND dis.visible_to_tenant = TRUE)
            OR
            -- Gestionnaire de l'équipe de l'intervention
            is_team_manager((SELECT team_id FROM lots WHERE id = i.lot_id))
          )
      )
    )
  );

COMMENT ON POLICY property_documents_select ON property_documents IS
  'Visibilité selon visibility_level: equipe (team managers), locataire (team managers + tenant du lot), intervention (partagé temporairement via document_intervention_shares)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY property_documents_insert
  ON property_documents FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    (is_gestionnaire() AND is_team_manager(team_id))
  );

COMMENT ON POLICY property_documents_insert ON property_documents IS
  'Admin peut uploader partout, gestionnaire peut uploader dans son équipe';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin + Gestionnaire de l'équipe + Uploadeur
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY property_documents_update
  ON property_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR
      is_team_manager(team_id)
      OR
      (uploaded_by = auth.uid() AND is_gestionnaire())
    )
  )
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(team_id)
    OR
    (uploaded_by = auth.uid() AND is_gestionnaire())
  );

COMMENT ON POLICY property_documents_update ON property_documents IS
  'Admin, gestionnaire d''équipe, ou uploadeur peuvent modifier';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY property_documents_delete
  ON property_documents FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY property_documents_delete ON property_documents IS
  'Admin ou gestionnaire d''équipe peuvent supprimer (soft delete recommandé)';
```

---

### RLS pour `document_intervention_shares`

```sql
-- ============================================================================
-- RLS POLICIES: document_intervention_shares (Partage de documents)
-- ============================================================================

ALTER TABLE document_intervention_shares ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Admin + Gestionnaire équipe + Prestataire/Locataire concernés
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY doc_shares_select
  ON document_intervention_shares FOR SELECT
  USING (
    revoked_at IS NULL
    AND (
      -- Admin: voit tout
      is_admin()
      OR
      -- Gestionnaire: voit les partages de son équipe
      EXISTS (
        SELECT 1 FROM interventions i
        INNER JOIN lots l ON i.lot_id = l.id
        WHERE i.id = document_intervention_shares.intervention_id
          AND is_team_manager(l.team_id)
      )
      OR
      -- Prestataire: voit si assigné ET visible_to_provider = TRUE
      EXISTS (
        SELECT 1 FROM interventions i
        WHERE i.id = document_intervention_shares.intervention_id
          AND i.prestataire_id = auth.uid()
          AND document_intervention_shares.visible_to_provider = TRUE
      )
      OR
      -- Locataire: voit si c'est son lot ET visible_to_tenant = TRUE
      EXISTS (
        SELECT 1 FROM interventions i
        WHERE i.id = document_intervention_shares.intervention_id
          AND i.tenant_id = auth.uid()
          AND document_intervention_shares.visible_to_tenant = TRUE
      )
    )
  );

COMMENT ON POLICY doc_shares_select ON document_intervention_shares IS
  'Gestionnaires voient les partages de leur équipe, prestataires/locataires voient selon flags de visibilité';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin + Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY doc_shares_insert
  ON document_intervention_shares FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    -- Gestionnaire de l'équipe de l'intervention
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN lots l ON i.lot_id = l.id
      WHERE i.id = document_intervention_shares.intervention_id
        AND is_team_manager(l.team_id)
    )
  );

COMMENT ON POLICY doc_shares_insert ON document_intervention_shares IS
  'Admin ou gestionnaire de l''équipe peuvent partager des documents lors d''interventions';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin + Gestionnaire de l'équipe + Partageur original
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY doc_shares_update
  ON document_intervention_shares FOR UPDATE
  USING (
    is_admin()
    OR
    shared_by = auth.uid()
    OR
    -- Gestionnaire de l'équipe de l'intervention
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN lots l ON i.lot_id = l.id
      WHERE i.id = document_intervention_shares.intervention_id
        AND is_team_manager(l.team_id)
    )
  )
  WITH CHECK (
    is_admin()
    OR
    shared_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN lots l ON i.lot_id = l.id
      WHERE i.id = document_intervention_shares.intervention_id
        AND is_team_manager(l.team_id)
    )
  );

COMMENT ON POLICY doc_shares_update ON document_intervention_shares IS
  'Admin, gestionnaire d''équipe, ou partageur original peuvent modifier/révoquer les partages';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin + Gestionnaire de l'équipe + Partageur original
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY doc_shares_delete
  ON document_intervention_shares FOR DELETE
  USING (
    is_admin()
    OR
    shared_by = auth.uid()
    OR
    -- Gestionnaire de l'équipe de l'intervention
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN lots l ON i.lot_id = l.id
      WHERE i.id = document_intervention_shares.intervention_id
        AND is_team_manager(l.team_id)
    )
  );

COMMENT ON POLICY doc_shares_delete ON document_intervention_shares IS
  'Admin, gestionnaire d''équipe, ou partageur original peuvent supprimer les partages (soft delete avec revoked_at recommandé)';
```

---

## ⚙️ Triggers

### 1. Auto-update `updated_at`

```sql
-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

-- Fonction générique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur buildings
CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur lots
CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur building_contacts
CREATE TRIGGER building_contacts_updated_at
  BEFORE UPDATE ON building_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur lot_contacts
CREATE TRIGGER lot_contacts_updated_at
  BEFORE UPDATE ON lot_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. Compteurs dénormalisés

```sql
-- ============================================================================
-- TRIGGER: Maintenir total_lots dans buildings
-- ⚠️ IMPORTANT: Ne s'applique QU'AUX lots liés à un immeuble (building_id NOT NULL)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_building_lots_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Seulement si le lot est dans un immeuble
    IF NEW.building_id IS NOT NULL THEN
      UPDATE buildings
      SET total_lots = total_lots + 1,
          vacant_lots = vacant_lots + CASE WHEN NEW.tenant_id IS NULL THEN 1 ELSE 0 END,
          occupied_lots = occupied_lots + CASE WHEN NEW.tenant_id IS NOT NULL THEN 1 ELSE 0 END
      WHERE id = NEW.building_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Si le building_id change (déplacement de lot), recalculer les deux immeubles
    IF (OLD.building_id IS DISTINCT FROM NEW.building_id) THEN
      -- Décrémenter l'ancien immeuble
      IF OLD.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots - 1,
            vacant_lots = vacant_lots - CASE WHEN OLD.tenant_id IS NULL THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots - CASE WHEN OLD.tenant_id IS NOT NULL THEN 1 ELSE 0 END
        WHERE id = OLD.building_id;
      END IF;

      -- Incrémenter le nouveau immeuble
      IF NEW.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots + 1,
            vacant_lots = vacant_lots + CASE WHEN NEW.tenant_id IS NULL THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots + CASE WHEN NEW.tenant_id IS NOT NULL THEN 1 ELSE 0 END
        WHERE id = NEW.building_id;
      END IF;

    -- Si le tenant_id change (sans changer de building), recalculer occupied/vacant
    ELSIF (OLD.tenant_id IS DISTINCT FROM NEW.tenant_id) AND NEW.building_id IS NOT NULL THEN
      UPDATE buildings
      SET occupied_lots = occupied_lots + CASE
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
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Seulement si le lot était dans un immeuble
    IF OLD.building_id IS NOT NULL THEN
      UPDATE buildings
      SET total_lots = total_lots - 1,
          vacant_lots = vacant_lots - CASE WHEN OLD.tenant_id IS NULL THEN 1 ELSE 0 END,
          occupied_lots = occupied_lots - CASE WHEN OLD.tenant_id IS NOT NULL THEN 1 ELSE 0 END
      WHERE id = OLD.building_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lots_update_building_count
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION update_building_lots_count();
```

---

## 📦 Supabase Storage - Bucket Configuration

### Bucket: `property-documents`

```sql
-- ============================================================================
-- STORAGE BUCKET: property-documents
-- Description: Stockage des documents liés aux immeubles et lots
-- ============================================================================

-- Création du bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false, -- Bucket privé, accès via signed URLs
  10485760, -- 10 MB = 10 * 1024 * 1024 bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]
);

COMMENT ON TABLE storage.buckets IS 'Bucket privé pour documents property (baux, garanties, photos, diagnostics) - Limite 10MB par fichier';
```

### Storage RLS Policies

```sql
-- ============================================================================
-- STORAGE RLS: property-documents
-- Description: Policies d'accès au bucket property-documents
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Télécharger un fichier
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "property_documents_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND (
      -- Admin: accès total
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
      OR
      -- Gestionnaire de l'équipe: accès aux documents de son équipe
      EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
      OR
      -- Locataire: accès aux documents de ses lots si visibility = 'locataire'
      EXISTS (
        SELECT 1 FROM property_documents pd
        INNER JOIN lots l ON pd.lot_id = l.id
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND pd.visibility_level = 'locataire'
          AND l.tenant_id = auth.uid()
      )
      OR
      -- Prestataire: accès via document_intervention_shares
      EXISTS (
        SELECT 1 FROM property_documents pd
        INNER JOIN document_intervention_shares dis ON dis.document_id = pd.id
        INNER JOIN interventions i ON dis.intervention_id = i.id
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND dis.revoked_at IS NULL
          AND dis.visible_to_provider = TRUE
          AND i.prestataire_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "property_documents_select" ON storage.objects IS
  'Accès lecture selon RLS property_documents: admin, team managers, locataires (si visibility), prestataires (si partagé)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Upload un fichier
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "property_documents_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (
      -- Admin: peut uploader partout
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
      OR
      -- Gestionnaire: peut uploader dans les buildings/lots de son équipe
      -- Note: Vérification du team_id dans l'application avant upload
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = auth.uid()
          AND tm.role = 'gestionnaire'
      )
    )
  );

COMMENT ON POLICY "property_documents_insert" ON storage.objects IS
  'Admin et gestionnaires peuvent uploader (vérification team_id dans l''app)';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Modifier un fichier (généralement non utilisé)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "property_documents_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-documents'
    AND (
      -- Admin: peut modifier partout
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
      OR
      -- Gestionnaire de l'équipe: peut modifier les fichiers de son équipe
      EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
    )
  );

COMMENT ON POLICY "property_documents_update" ON storage.objects IS
  'Admin et gestionnaires d''équipe peuvent modifier les fichiers';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Supprimer un fichier
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "property_documents_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-documents'
    AND (
      -- Admin: peut supprimer partout
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
      OR
      -- Gestionnaire de l'équipe: peut supprimer les fichiers de son équipe
      EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
    )
  );

COMMENT ON POLICY "property_documents_delete" ON storage.objects IS
  'Admin et gestionnaires d''équipe peuvent supprimer les fichiers (soft delete recommandé dans property_documents)';
```

### Organisation des fichiers dans le bucket

```
property-documents/
├── buildings/
│   └── {building_id}/
│       ├── {timestamp}-{random}.pdf      # Ex: Règlement copropriété
│       ├── {timestamp}-{random}.jpg      # Ex: Photo façade
│       └── ...
└── lots/
    └── {lot_id}/
        ├── {timestamp}-{random}.pdf      # Ex: Bail de location
        ├── {timestamp}-{random}.jpg      # Ex: Photo compteur
        ├── {timestamp}-{random}.pdf      # Ex: Garantie chaudière
        └── ...
```

**Pattern de nommage**: `{timestamp}-{random}.{extension}`
- `timestamp`: `YYYY-MM-DDTHH-mm-ss` (ISO 8601, caractères `:` et `.` remplacés par `-`)
- `random`: 6 caractères alphanumériques (évite les collisions)
- `extension`: Extension du fichier original (ex: pdf, jpg, png)

**Exemple**: `2025-10-10T14-30-45-abc123.pdf`

---

## 🔗 Points de connexion

### 1. Interventions ↔ Buildings/Lots

Les interventions peuvent être liées à:
- **Building uniquement** (`building_id` NOT NULL, `lot_id` NULL) - Ex: réparation toiture immeuble
- **Lot dans un immeuble** (`lot_id` NOT NULL, lot.building_id NOT NULL) - Ex: fuite robinet appartement
- **Lot standalone** (`lot_id` NOT NULL, lot.building_id NULL) - Ex: réparation chaudière maison individuelle
- **Les deux explicitement** (`building_id` NOT NULL, `lot_id` NOT NULL) - Ex: intervention commune avec impact locataire

> ⚠️ **Note importante**: Avec les lots standalone, l'intervention peut cibler un `lot_id` qui n'a pas de `building_id` parent. La logique métier doit gérer ce cas.

```sql
-- Table interventions (déjà existante, à modifier si nécessaire)
ALTER TABLE interventions
  ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  ADD CONSTRAINT intervention_location_check
    CHECK (building_id IS NOT NULL OR lot_id IS NOT NULL);
```

### 2. Teams ↔ Buildings

Relation directe via `team_id` dans `buildings`:
- Un building appartient à UNE équipe
- Une équipe peut avoir PLUSIEURS buildings
- Cascade DELETE: si l'équipe est supprimée, les buildings aussi

### 2bis. Teams ↔ Lots (Standalone)

**✨ Nouveauté**: Les lots standalone ont une relation directe avec l'équipe via `team_id`:
- Un lot standalone appartient à UNE équipe (obligatoire)
- Un lot dans un immeuble hérite de l'équipe du building (via `building_id → buildings.team_id`)
- Cascade DELETE: si l'équipe est supprimée, les lots standalone aussi
- Permet aux équipes de gérer des maisons individuelles, locaux commerciaux autonomes, etc.

### 3. Users ↔ Buildings/Lots

Trois types de relations:
1. **Direct** via `gestionnaire_id` (buildings) et `tenant_id` (lots)
2. **Many-to-many** via `building_contacts` et `lot_contacts`
3. **Indirect** via `team_members` (tous les membres voient via RLS)

### 4. Contacts ↔ Buildings/Lots

Via tables de jonction:
- `building_contacts`: gestionnaires secondaires, prestataires attitrés à l'immeuble
- `lot_contacts`: colocataires, prestataires attitrés au lot

---

## 📊 Stratégie de migration

### Étape 1: Création des tables (Jour 1)
1. ✅ Créer enum `country` (Belgique, France, Allemagne, Pays-Bas, Suisse, Luxembourg, autre)
2. ✅ Créer enum `lot_category`
3. ✅ 🆕 Créer enum `property_document_type` (12 types: bail, garantie, facture, etc.)
4. ✅ 🆕 Créer enum `document_visibility_level` (3 niveaux: equipe, locataire, intervention)
5. ✅ Créer table `buildings` avec indexes (dont champ `country`)
6. ✅ Créer table `lots` avec indexes (support **lots standalone** + champs adresse complète)
7. ✅ Créer table `building_contacts` avec indexes
8. ✅ Créer table `lot_contacts` avec indexes
9. ✅ 🆕 Créer table `property_documents` avec 10 indexes (dont full-text search)
10. ✅ 🆕 Créer table `document_intervention_shares` avec 3 indexes

### Étape 2: RLS & Triggers & Storage (Jour 1)
11. ✅ Créer 10 fonctions helper RLS (`SECURITY DEFINER`) - ⚠️ **Adapter pour lots standalone**
12. ✅ Activer RLS sur toutes les tables (6 tables maintenant)
13. ✅ Créer 24 policies (4 par table pour 6 tables) utilisant les fonctions helper
14. ✅ Créer triggers `updated_at` (6 triggers: buildings, lots, building_contacts, lot_contacts, property_documents, document_intervention_shares)
15. ✅ Créer triggers pour compteurs dénormalisés - ⚠️ **Gérer lots standalone (building_id NULL)**
16. ✅ 🆕 Créer bucket Supabase Storage `property-documents` (privé, 10MB limit)
17. ✅ 🆕 Créer 4 Storage RLS policies (SELECT, INSERT, UPDATE, DELETE)

### Étape 3: Repositories & Services (Jour 2)
18. ✅ Créer `BuildingRepository` (déjà existant, à migrer) - Ajouter gestion `country`
19. ✅ Créer `LotRepository` (déjà existant, à migrer) - **Support lots standalone** (building_id NULL)
20. ✅ Créer `BuildingContactRepository`
21. ✅ Créer `LotContactRepository`
22. ✅ 🆕 Créer `PropertyDocumentRepository` - CRUD avec filtres (type, visibility, expiry, tags)
23. ✅ 🆕 Créer `DocumentShareRepository` - Gestion partages interventions
24. ✅ Créer `BuildingService` (déjà existant, à migrer) - Valider `country` enum
25. ✅ Créer `LotService` (déjà existant, à migrer) - Valider adresse si standalone
26. ✅ 🆕 Créer `PropertyDocumentService` - Upload, validation, expiry alerts
27. ✅ 🆕 Créer `DocumentShareService` - Logique partage/révocation

### Étape 4: API Routes (Jour 3)
28. ✅ `GET /api/buildings` - Liste avec pagination + filtres (country, city, etc.)
29. ✅ `GET /api/buildings/[id]` - Détails avec relations
30. ✅ `POST /api/buildings` - Création (validation country enum)
31. ✅ `PUT /api/buildings/[id]` - Modification (country, description)
32. ✅ `DELETE /api/buildings/[id]` - Soft delete
33. ✅ `GET /api/lots` - Liste avec filtres (building_id, standalone, vacant, country, etc.)
34. ✅ `GET /api/lots/[id]` - Détails avec locataire
35. ✅ `POST /api/lots` - Création (validation adresse si standalone)
36. ✅ `PUT /api/lots/[id]` - Modification (assignation locataire, description)
37. ✅ `DELETE /api/lots/[id]` - Soft delete
38. ✅ 🆕 `GET /api/property-documents` - Liste avec filtres (type, visibility, building_id, lot_id)
39. ✅ 🆕 `GET /api/property-documents/[id]` - Détails avec signed URL
40. ✅ 🆕 `POST /api/property-documents` - Upload avec validation (10MB, MIME types)
41. ✅ 🆕 `PUT /api/property-documents/[id]` - Modification métadonnées (title, tags, visibility)
42. ✅ 🆕 `DELETE /api/property-documents/[id]` - Soft delete + cleanup storage
43. ✅ 🆕 `POST /api/interventions/[id]/share-document` - Partage document lors intervention
44. ✅ 🆕 `DELETE /api/interventions/[id]/share-document/[shareId]` - Révocation partage

### Étape 5: Frontend Components (Jours 4-5)
45. ✅ `<BuildingList>` - Liste avec recherche/filtres (dont country)
46. ✅ `<BuildingCard>` - Card avec statistiques
47. ✅ `<BuildingDetails>` - Vue détails + liste lots + description
48. ✅ `<BuildingFormModal>` - Création/édition (sélection country, description)
49. ✅ 🆕 `<BuildingDocuments>` - Liste documents de l'immeuble (avec upload)
50. ✅ `<LotList>` - Liste avec filtres (étage, catégorie, occupancy, standalone, country)
51. ✅ `<LotCard>` - Card avec info locataire + badge "standalone" si applicable
52. ✅ `<LotDetails>` - Vue détails + historique interventions + description
53. ✅ `<LotFormModal>` - Création/édition (mode standalone avec adresse complète, description)
54. ✅ 🆕 `<LotDocuments>` - Liste documents du lot (avec upload)
55. ✅ `<TenantAssignmentModal>` - Assignation locataire
56. ✅ 🆕 `<DocumentUploadModal>` - Upload multi-fichiers avec métadonnées
57. ✅ 🆕 `<DocumentCard>` - Card document avec aperçu, tags, expiry badge
58. ✅ 🆕 `<DocumentShareModal>` - Partage lors intervention (flags provider/tenant)
59. ✅ 🆕 `<DocumentExpiryAlert>` - Alertes documents expirant bientôt

### Étape 6: Tests & Validation (Jour 5-6)
60. ✅ Tests unitaires repositories (6 fichiers dont 2 nouveaux) - Tester country, lots standalone, documents
61. ✅ Tests unitaires services (4 fichiers dont 2 nouveaux) - Valider logique adresse lots, upload documents
62. ✅ Tests E2E création building + lots (avec country)
63. ✅ Tests E2E création lot standalone (avec adresse complète)
64. ✅ Tests E2E assignation locataire
65. ✅ 🆕 Tests E2E upload documents (building & lot) - Validation 10MB, MIME types
66. ✅ 🆕 Tests E2E partage documents lors intervention - Flags visibility
67. ✅ 🆕 Tests E2E révocation partages
68. ✅ Tests E2E RLS (isolation multi-tenant + lots standalone + documents)
69. ✅ Tests E2E cascade delete (avec cleanup storage)
70. ✅ Validation performance (indexes, compteurs dénormalisés, full-text search)
71. ✅ 🆕 Tests Storage RLS policies (upload, download selon rôle)

---

## ✅ Checklist de complétion

### Backend (Base de données)
- [ ] **Enum `country`** créé (belgique, france, allemagne, pays-bas, suisse, luxembourg, autre)
- [ ] Enum `lot_category` créé
- [ ] 🆕 Enum `property_document_type` créé (12 types)
- [ ] 🆕 Enum `document_visibility_level` créé (3 niveaux: equipe, locataire, intervention)
- [ ] Table `buildings` créée avec tous les champs (dont `gestionnaire_id`, **`country`**)
- [ ] Table `lots` créée avec **support lots standalone**:
  - [ ] `building_id` NULLABLE
  - [ ] `team_id` NOT NULL (pour lots standalone)
  - [ ] Champs adresse: `street`, `city`, `postal_code`, `country`
  - [ ] ~~`size_sqm` retiré~~ (plus dans le schéma)
  - [ ] `gestionnaire_id` + `tenant_id`
- [ ] Table `building_contacts` créée
- [ ] Table `lot_contacts` créée
- [ ] 🆕 Table `property_documents` créée avec:
  - [ ] Support polymorphique (building_id OU lot_id)
  - [ ] 24 colonnes (fichier, métadonnées, dates, visibilité, audit, soft delete)
  - [ ] Contraintes: valid_property_reference, valid_expiry_date
- [ ] 🆕 Table `document_intervention_shares` créée avec:
  - [ ] Relations document_id + intervention_id
  - [ ] Flags visibility (visible_to_provider, visible_to_tenant)
  - [ ] Révocation (revoked_at, revoked_by)
- [ ] **Indexes créés et optimisés**:
  - [ ] 10 indexes buildings (dont `idx_buildings_country`)
  - [ ] 17 indexes lots (dont team, standalone, city, postal, country)
  - [ ] 🆕 10 indexes property_documents (dont full-text search GIN)
  - [ ] 🆕 3 indexes document_intervention_shares
- [ ] **10 fonctions helper RLS** créées et adaptées pour lots standalone:
  - [ ] `get_lot_team_id()` gère building_id NULL
  - [ ] `can_view_lot()` gère lots standalone
- [ ] 24 RLS policies actives et testées (4 par table x 6 tables)
- [ ] 6 triggers `updated_at` fonctionnels (4 existants + 2 nouveaux)
- [ ] Triggers compteurs dénormalisés **gèrent lots standalone** (building_id NULL)
- [ ] 🆕 Bucket Supabase Storage `property-documents` créé:
  - [ ] Configuration: privé, 10MB limit, 11 MIME types autorisés
  - [ ] 4 Storage RLS policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Migration testée sur environnement de dev

### Repositories & Services
- [ ] `BuildingRepository` migré vers nouvelle architecture
  - [ ] Support champ `country`
- [ ] `LotRepository` migré vers nouvelle architecture
  - [ ] Support **lots standalone** (building_id NULL)
  - [ ] Support champs adresse (`street`, `city`, `postal_code`, `country`)
- [ ] `BuildingContactRepository` créé
- [ ] `LotContactRepository` créé
- [ ] 🆕 `PropertyDocumentRepository` créé:
  - [ ] CRUD complet
  - [ ] Filtres (type, visibility, building_id, lot_id, expiry, tags)
  - [ ] Full-text search
  - [ ] Soft delete
- [ ] 🆕 `DocumentShareRepository` créé:
  - [ ] CRUD partages
  - [ ] Révocation
  - [ ] Filtres par intervention, document
- [ ] `BuildingService` migré et testé
  - [ ] Validation enum `country`
- [ ] `LotService` migré et testé
  - [ ] Validation logique lot standalone vs lot dans immeuble
- [ ] 🆕 `PropertyDocumentService` créé:
  - [ ] Upload avec validation (10MB, MIME types)
  - [ ] Génération signed URLs
  - [ ] Alertes documents expirant
  - [ ] Gestion tags et métadonnées
- [ ] 🆕 `DocumentShareService` créé:
  - [ ] Logique partage lors intervention
  - [ ] Contrôle flags visibility
  - [ ] Révocation avec audit
- [ ] Tests unitaires > 80% coverage (6 repositories + 4 services)

### API Routes
- [ ] 5 routes `/api/buildings/*` créées et testées (avec filtres country)
- [ ] 5 routes `/api/lots/*` créées et testées (avec support standalone + filtres country)
- [ ] 🆕 7 routes `/api/property-documents/*` créées:
  - [ ] `GET /api/property-documents` - Liste avec filtres
  - [ ] `GET /api/property-documents/[id]` - Détails + signed URL
  - [ ] `POST /api/property-documents` - Upload
  - [ ] `PUT /api/property-documents/[id]` - Modification métadonnées
  - [ ] `DELETE /api/property-documents/[id]` - Soft delete + cleanup storage
  - [ ] `POST /api/interventions/[id]/share-document` - Partage
  - [ ] `DELETE /api/interventions/[id]/share-document/[shareId]` - Révocation
- [ ] Validation Zod sur tous les inputs (dont country enum, document types)
- [ ] Gestion erreurs standardisée
- [ ] Tests E2E pour toutes les routes (dont cas standalone + documents)

### Frontend
- [ ] 4 composants Buildings (List, Card, Details, Form)
  - [ ] Sélection `country` dans le formulaire
  - [ ] Affichage `description`
- [ ] 🆕 Composant `<BuildingDocuments>` intégré à BuildingDetails
  - [ ] Liste documents de l'immeuble
  - [ ] Upload multi-fichiers
  - [ ] Filtres par type
  - [ ] Actions (download, delete, share)
- [ ] 5 composants Lots (List, Card, Details, Form, TenantAssignment)
  - [ ] Mode **standalone** dans le formulaire (avec adresse complète)
  - [ ] Badge "Standalone" sur les cards si building_id NULL
  - [ ] Affichage `description`
- [ ] 🆕 Composant `<LotDocuments>` intégré à LotDetails
  - [ ] Liste documents du lot
  - [ ] Upload multi-fichiers
  - [ ] Filtres par type + expiry
  - [ ] Badges documents expirant
- [ ] 🆕 5 composants Documents (Upload, Card, Share, ExpiryAlert, Viewer):
  - [ ] `<DocumentUploadModal>` - Upload avec drag-and-drop, validation
  - [ ] `<DocumentCard>` - Card avec aperçu, métadonnées, actions
  - [ ] `<DocumentShareModal>` - Partage lors intervention avec flags
  - [ ] `<DocumentExpiryAlert>` - Alertes proactives documents expirant
  - [ ] `<DocumentViewer>` - Visualisation PDF/images avec signed URLs
- [ ] Hooks `use-building-data.ts`, `use-lot-data.ts` créés
- [ ] 🆕 Hooks `use-property-documents.ts`, `use-document-share.ts` créés
- [ ] Intégration dans `/gestionnaire/buildings` et `/gestionnaire/lots`
- [ ] 🆕 Intégration dans `/gestionnaire/interventions/[id]` (partage documents)
- [ ] Tests E2E workflow complet:
  - [ ] Création building → lots
  - [ ] Création lot standalone (avec adresse)
  - [ ] Assignation locataire
  - [ ] Intervention sur lot standalone
  - [ ] 🆕 Upload documents (building + lot)
  - [ ] 🆕 Partage documents lors intervention
  - [ ] 🆕 Révocation partages
  - [ ] 🆕 Alertes expiry

### Documentation
- [ ] Migration SQL commentée et documentée
- [ ] README services mis à jour
- [ ] Guide utilisateur mis à jour
- [ ] `MIGRATION-MASTER-GUIDE.md` mis à jour (Phase 2 complétée)
- [ ] 🆕 `property-document-system.md` créé (guide détaillé système documentaire)

---

## 📈 Estimation de temps

| Étape | Durée estimée | Dépendances |
|-------|---------------|-------------|
| Création tables + indexes | 2h | - |
| RLS policies + triggers | 3h | Tables créées |
| Repositories (4 classes) | 4h | Tables créées |
| Services (2 classes) | 3h | Repositories créés |
| API routes (10 routes) | 6h | Services créés |
| Frontend (9 composants) | 12h | API routes créées |
| Tests (unitaires + E2E) | 10h | Tout créé |
| **TOTAL** | **40h (5 jours)** | - |

---

## 🎯 Critères de succès

### Performance
- ✅ SELECT buildings avec relations < 50ms (avec indexes)
- ✅ SELECT lots par building < 30ms
- ✅ Compteurs dénormalisés éliminat 100% des COUNT(*) queries

### Sécurité
- ✅ RLS policies bloquent 100% des accès non autorisés
- ✅ Isolation multi-tenant parfaite (aucune fuite de données entre équipes)
- ✅ Soft delete protège contre suppressions accidentelles

### Fonctionnalité
- ✅ Workflow complet: création building → ajout lots → assignation locataires → création interventions
- ✅ Cascade DELETE fonctionne (building supprimé → lots supprimés)
- ✅ Compteurs mis à jour automatiquement (total_lots, occupied_lots, etc.)

---

## 🚨 Points d'attention

### 1. Gestion des compteurs (avec lots standalone)
⚠️ **Attention**: Les triggers doivent gérer TOUS les cas:
- INSERT lot avec `building_id NOT NULL` → total_lots++ sur le building
- INSERT lot avec `building_id NULL` (standalone) → **NE PAS** toucher aux compteurs
- UPDATE lot.tenant_id (NULL → UUID) → occupied_lots++, vacant_lots--
- UPDATE lot.building_id (déplacement) → recalculer l'ancien ET le nouveau building
- DELETE lot → total_lots--
- Soft delete (deleted_at) NE DOIT PAS déclencher les triggers

### 2. Performance RLS (avec lots standalone)
⚠️ **Attention**: Les policies RLS utilisent des JOIN sur `team_members` ET gèrent lots standalone.
💡 **Solution**:
- Indexes sur `team_members(user_id, team_id)`
- Indexes sur `buildings(team_id)` ET `lots(team_id)`
- Fonctions `get_lot_team_id()` et `can_view_lot()` doivent gérer `building_id NULL`

### 3. Cascade DELETE (avec lots standalone)
⚠️ **Attention**:
- Supprimer un building supprime TOUS les lots associés (`building_id NOT NULL`)
- Supprimer une team supprime TOUS les lots standalone (`building_id NULL`)
💡 **Solution**: Soft delete par défaut, hard delete réservé aux admins avec confirmation

### 4. Interventions multi-niveaux (avec lots standalone)
⚠️ **Attention**: Interventions peuvent cibler:
- Building uniquement
- Lot dans un immeuble
- **Lot standalone** (pas de building parent)
💡 **Solution**:
- Contrainte `CHECK (building_id IS NOT NULL OR lot_id IS NOT NULL)`
- Logique UI adaptée pour afficher l'adresse (building OU lot)
- API doit renvoyer l'adresse complète (merger building + lot si nécessaire)

### 5. Validation adresse lots
⚠️ **Attention**: Les lots peuvent avoir une adresse complète MÊME s'ils sont dans un immeuble.
💡 **Cas d'usage**: Lot dans un immeuble non géré par le gestionnaire → adresse au niveau du lot
💡 **Pas de contrainte CHECK** sur les champs adresse (tous optionnels)

---

## 📚 Références

### Documentation interne
- **Guide principal**: `MIGRATION-MASTER-GUIDE.md`
- **🆕 RLS Best Practices**: `migration-phase2-rls-best-practices.md` ⭐ (Approche Helper Functions)
- **Schéma optimal**: `database-schema-optimal.md` (lignes 500-700)
- **Repositories existants**:
  - `lib/services/repositories/building.repository.ts` (499 lignes)
  - `lib/services/repositories/lot.repository.ts` (529 lignes)
- **Phase 1**: `migration-section-1-users-teams-invitations-UPDATED.md`

### Documentation externe
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase SSR (Next.js 15)**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **PostgreSQL Security Functions**: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

---

**Prochaine étape**: Valider ce plan avec l'équipe, puis créer le fichier de migration SQL `20251010000001_phase2_buildings_lots.sql`.
