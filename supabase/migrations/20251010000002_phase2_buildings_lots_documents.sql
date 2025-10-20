-- ============================================================================
-- MIGRATION: Phase 2 - Buildings, Lots & Property Documents
-- Date: 2025-10-10
-- Description:
--   - Création des tables buildings, lots avec support standalone
--   - Système de gestion documentaire (property_documents)
--   - Visibilité documents: 2 niveaux (equipe, locataire)
--   - RLS policies complètes avec fonctions helper
--   - Supabase Storage bucket configuration
-- Note: Le partage de documents lors d'interventions sera ajouté en Phase 3
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

-- Enum: Pays supportés
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

-- Enum: Catégories de lots
CREATE TYPE lot_category AS ENUM (
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'parking',
  'autre'
);

COMMENT ON TYPE lot_category IS 'Types de lots (appartements, maisons, locaux commerciaux, parkings, etc.)';

-- Enum: Types de documents property
CREATE TYPE property_document_type AS ENUM (
  'bail',                  -- Contrat de location
  'garantie',              -- Garantie d''appareil
  'facture',               -- Facture de travaux/équipement
  'diagnostic',            -- DPE, amiante, plomb, gaz, électricité
  'photo_compteur',        -- Photo compteur eau/gaz/électricité
  'plan',                  -- Plan du lot/immeuble
  'reglement_copropriete', -- Règlement de copropriété
  'etat_des_lieux',        -- État des lieux entrée/sortie
  'certificat',            -- Certificat de conformité, ramonage, etc.
  'manuel_utilisation',    -- Manuel d''utilisation d''un appareil
  'photo_generale',        -- Photo générale du bien
  'autre'                  -- Autres documents
);

COMMENT ON TYPE property_document_type IS 'Types de documents liés aux immeubles et lots';

-- Enum: Niveaux de visibilité des documents (2 niveaux)
CREATE TYPE document_visibility_level AS ENUM (
  'equipe',               -- Visible par tous les gestionnaires de l''équipe
  'locataire'             -- Visible par les gestionnaires + le locataire du lot
);

COMMENT ON TYPE document_visibility_level IS 'Niveaux de visibilité des documents property (2 niveaux: equipe, locataire). Le partage temporaire lors d''interventions sera ajouté en Phase 3';

-- ============================================================================
-- SECTION 2: TABLES PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: buildings
-- ----------------------------------------------------------------------------
CREATE TABLE buildings (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Informations de base
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country country DEFAULT 'france' NOT NULL,
  description TEXT,

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

COMMENT ON TABLE buildings IS 'Immeubles gérés par les équipes';
COMMENT ON COLUMN buildings.country IS 'Pays de localisation de l''immeuble';
COMMENT ON COLUMN buildings.description IS 'Description de l''immeuble et notes internes';
COMMENT ON COLUMN buildings.total_lots IS 'Nombre total de lots (calculé automatiquement)';
COMMENT ON COLUMN buildings.occupied_lots IS 'Nombre de lots occupés (calculé automatiquement)';
COMMENT ON COLUMN buildings.vacant_lots IS 'Nombre de lots vacants (calculé automatiquement)';
COMMENT ON COLUMN buildings.metadata IS 'Données extensibles (ex: année construction, ascenseur, etc.)';

-- ----------------------------------------------------------------------------
-- Table: lots
-- ----------------------------------------------------------------------------
CREATE TABLE lots (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE, -- NULLABLE pour lots standalone
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, -- Obligatoire pour lots standalone

  -- Informations de base
  reference TEXT NOT NULL,
  category lot_category NOT NULL DEFAULT 'appartement',
  floor INTEGER,
  description TEXT,

  -- Adresse complète (pour lots indépendants/maisons)
  street TEXT,
  city TEXT,
  postal_code TEXT,
  country country,

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
);

COMMENT ON TABLE lots IS 'Lots (appartements, maisons, locaux) liés ou non à un immeuble';
COMMENT ON COLUMN lots.building_id IS 'Immeuble parent (NULL si lot indépendant/standalone)';
COMMENT ON COLUMN lots.team_id IS 'Équipe propriétaire (obligatoire, même pour lots standalone)';
COMMENT ON COLUMN lots.reference IS 'Référence unique du lot au sein de l''équipe';
COMMENT ON COLUMN lots.category IS 'Type de lot (appartement, maison, commerce, parking, etc.)';
COMMENT ON COLUMN lots.description IS 'Description du lot et notes internes';
COMMENT ON COLUMN lots.street IS 'Adresse complète (optionnelle, utilisée si building_id NULL OU si lot dans immeuble non géré)';
COMMENT ON COLUMN lots.metadata IS 'Données extensibles (ex: nb pièces, meublé, etc.)';

-- ----------------------------------------------------------------------------
-- Table: building_contacts
-- ----------------------------------------------------------------------------
CREATE TABLE building_contacts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Métadonnées de la relation
  is_primary BOOLEAN DEFAULT FALSE,
  role TEXT,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT unique_building_user UNIQUE (building_id, user_id)
);

COMMENT ON TABLE building_contacts IS 'Association many-to-many entre immeubles et contacts';
COMMENT ON COLUMN building_contacts.is_primary IS 'Indique si c''est le contact principal pour ce building';
COMMENT ON COLUMN building_contacts.role IS 'Rôle spécifique du contact pour cet immeuble';

-- ----------------------------------------------------------------------------
-- Table: lot_contacts
-- ----------------------------------------------------------------------------
CREATE TABLE lot_contacts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Métadonnées de la relation
  is_primary BOOLEAN DEFAULT FALSE,
  role TEXT,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  CONSTRAINT unique_lot_user UNIQUE (lot_id, user_id)
);

COMMENT ON TABLE lot_contacts IS 'Association many-to-many entre lots et contacts';
COMMENT ON COLUMN lot_contacts.is_primary IS 'Indique si c''est le locataire principal';
COMMENT ON COLUMN lot_contacts.role IS 'Rôle spécifique du contact pour ce lot (ex: colocataire)';

-- ----------------------------------------------------------------------------
-- Table: property_documents
-- ----------------------------------------------------------------------------
CREATE TABLE property_documents (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations (polymorphique: building OU lot)
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type et catégorie
  document_type property_document_type NOT NULL,
  category TEXT,

  -- Informations fichier
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'property-documents' NOT NULL,

  -- Métadonnées
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Dates importantes
  expiry_date DATE,
  document_date DATE,

  -- Visibilité
  visibility_level document_visibility_level DEFAULT 'equipe' NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,

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

COMMENT ON TABLE property_documents IS 'Documents liés aux immeubles et lots (baux, garanties, photos, diagnostics)';
COMMENT ON COLUMN property_documents.building_id IS 'Immeuble (NULL si document de lot)';
COMMENT ON COLUMN property_documents.lot_id IS 'Lot (NULL si document d''immeuble)';
COMMENT ON COLUMN property_documents.visibility_level IS 'Niveau de visibilité du document (2 niveaux: equipe, locataire)';
COMMENT ON COLUMN property_documents.expiry_date IS 'Date d''expiration (garanties, baux, diagnostics)';
COMMENT ON COLUMN property_documents.is_archived IS 'Archivé mais pas supprimé (pour historique)';
COMMENT ON COLUMN property_documents.tags IS 'Tags pour recherche full-text (ex: [''chaudière'', ''viessmann''])';

-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Indexes: buildings (8 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_city ON buildings(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_postal ON buildings(postal_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_country ON buildings(country) WHERE deleted_at IS NULL;
-- Note: Full-text search index sera ajouté via une colonne générée TSVECTOR en Phase 3
-- CREATE INDEX idx_buildings_search ON buildings USING gin(to_tsvector('french', name || ' ' || address || ' ' || city));
CREATE INDEX idx_buildings_deleted ON buildings(deleted_at);

-- ----------------------------------------------------------------------------
-- Indexes: lots (10 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_lots_team ON lots(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE deleted_at IS NULL AND building_id IS NOT NULL;
CREATE INDEX idx_lots_standalone ON lots(team_id) WHERE deleted_at IS NULL AND building_id IS NULL;
CREATE INDEX idx_lots_category ON lots(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_city ON lots(city) WHERE deleted_at IS NULL AND city IS NOT NULL;
CREATE INDEX idx_lots_postal ON lots(postal_code) WHERE deleted_at IS NULL AND postal_code IS NOT NULL;
CREATE INDEX idx_lots_country ON lots(country) WHERE deleted_at IS NULL AND country IS NOT NULL;
CREATE INDEX idx_lots_floor ON lots(building_id, floor) WHERE deleted_at IS NULL AND building_id IS NOT NULL AND floor IS NOT NULL;
-- Note: Full-text search index sera ajouté via une colonne générée TSVECTOR en Phase 3
-- CREATE INDEX idx_lots_search ON lots USING gin(to_tsvector('french', reference || ' ' || COALESCE(street, '') || ' ' || COALESCE(city, ''))) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_deleted ON lots(deleted_at);

-- ----------------------------------------------------------------------------
-- Indexes: building_contacts (5 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_building_contacts_building ON building_contacts(building_id);
CREATE INDEX idx_building_contacts_user ON building_contacts(user_id);
CREATE INDEX idx_building_contacts_primary ON building_contacts(building_id) WHERE is_primary = TRUE;

-- Nouveaux indexes optimisés pour remplacer gestionnaire_id
-- Index composite pour recherches building → gestionnaires (filtrage role='gestionnaire' en application/RLS)
CREATE INDEX idx_building_contacts_building_user ON building_contacts(building_id, user_id);

COMMENT ON INDEX idx_building_contacts_building_user IS 'Index composite pour recherche rapide des contacts par building (filtrage role en application via JOIN users)';

-- ----------------------------------------------------------------------------
-- Indexes: lot_contacts (5 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_user ON lot_contacts(user_id);
CREATE INDEX idx_lot_contacts_primary ON lot_contacts(lot_id) WHERE is_primary = TRUE;

-- Nouveaux indexes optimisés pour remplacer tenant_id
-- Index composite pour recherches lot → locataires (filtrage role='locataire' en application/RLS)
CREATE INDEX idx_lot_contacts_lot_user ON lot_contacts(lot_id, user_id);

COMMENT ON INDEX idx_lot_contacts_lot_user IS 'Index composite pour recherche rapide des contacts par lot (filtrage role en application via JOIN users)';

-- ----------------------------------------------------------------------------
-- Indexes: property_documents (9 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_property_documents_building ON property_documents(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_lot ON property_documents(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_team ON property_documents(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_type ON property_documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_visibility ON property_documents(visibility_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_uploaded_by ON property_documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_expiry ON property_documents(expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_property_documents_archived ON property_documents(is_archived) WHERE deleted_at IS NULL;
-- Note: Full-text search index sera ajouté via une colonne générée TSVECTOR en Phase 3
-- CREATE INDEX idx_property_documents_search ON property_documents USING gin(to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '') || ' ' || array_to_string(tags, ' '))) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_deleted ON property_documents(deleted_at);

-- ============================================================================
-- SECTION 4: FONCTIONS HELPER RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonctions de base (si elles n'existent pas encore)
-- ----------------------------------------------------------------------------

-- Fonction: is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = 'admin'  -- ✅ FIX: Use auth_user_id, not id
  );
$$;

COMMENT ON FUNCTION is_admin IS 'Vérifie si l''utilisateur actuel est un admin';

-- Fonction: is_gestionnaire
CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = 'gestionnaire'  -- ✅ FIX: Use auth_user_id, not id
  );
$$;

COMMENT ON FUNCTION is_gestionnaire IS 'Vérifie si l''utilisateur actuel est un gestionnaire';

-- Fonction: is_team_manager
CREATE OR REPLACE FUNCTION is_team_manager(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND tm.team_id = check_team_id
      AND tm.role IN ('gestionnaire', 'admin')
      AND tm.left_at IS NULL
  );
$$;

COMMENT ON FUNCTION is_team_manager IS 'Vérifie si l''utilisateur est gestionnaire/admin d''une équipe spécifique (actif uniquement)';

-- Fonction de debug: Vérifier auth.uid() et permissions
-- ⚠️ TEMPORAIRE: Pour débogage uniquement, à supprimer en production
CREATE OR REPLACE FUNCTION debug_check_building_insert(check_team_id UUID)
RETURNS TABLE(
  current_auth_uid UUID,
  user_exists BOOLEAN,
  user_role TEXT,
  is_in_team BOOLEAN,
  is_active_member BOOLEAN,
  is_manager_result BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    auth.uid() AS current_auth_uid,
    EXISTS(SELECT 1 FROM users WHERE auth_user_id = auth.uid()) AS user_exists,  -- ✅ FIX
    (SELECT role FROM users WHERE auth_user_id = auth.uid()) AS user_role,  -- ✅ FIX
    EXISTS(
      SELECT 1 FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id  -- ✅ FIX: Join users table
      WHERE u.auth_user_id = auth.uid()  -- ✅ FIX: Use auth_user_id
        AND tm.team_id = check_team_id
    ) AS is_in_team,
    EXISTS(
      SELECT 1 FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id  -- ✅ FIX: Join users table
      WHERE u.auth_user_id = auth.uid()  -- ✅ FIX: Use auth_user_id
        AND tm.team_id = check_team_id
        AND tm.left_at IS NULL
    ) AS is_active_member,
    is_team_manager(check_team_id) AS is_manager_result
$$;

COMMENT ON FUNCTION debug_check_building_insert IS '⚠️ DEBUG: Vérifie auth.uid() et permissions pour buildings_insert (TEMPORAIRE)';

-- ----------------------------------------------------------------------------
-- Fonction: get_building_team_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_building_team_id(building_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT team_id FROM buildings WHERE id = building_uuid;
$$;

COMMENT ON FUNCTION get_building_team_id IS 'Récupère le team_id d''un building (pour RLS policies)';

-- ----------------------------------------------------------------------------
-- Fonction: get_lot_team_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_lot_team_id(lot_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT b.team_id FROM lots l INNER JOIN buildings b ON l.building_id = b.id WHERE l.id = lot_uuid),
    (SELECT team_id FROM lots WHERE id = lot_uuid)
  );
$$;

COMMENT ON FUNCTION get_lot_team_id IS 'Récupère le team_id d''un lot (via building parent OU directement pour lots standalone)';

-- ----------------------------------------------------------------------------
-- Fonction: is_tenant_of_lot (⚠️ MODIFIÉE: utilise lot_contacts au lieu de lots.tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_lot(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lot_contacts lc
    INNER JOIN users u ON lc.user_id = u.id
    WHERE lc.lot_id = lot_uuid
      AND u.auth_user_id = auth.uid()  -- ✅ FIX: Use auth_user_id, not lc.user_id
      AND u.role = 'locataire'
  );
$$;

COMMENT ON FUNCTION is_tenant_of_lot IS 'Vérifie si l''utilisateur est locataire du lot (via lot_contacts)';

-- ----------------------------------------------------------------------------
-- Fonction: can_view_building (⚠️ MODIFIÉE: utilise lot_contacts au lieu de lots.tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_building(building_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM buildings b
    WHERE b.id = building_uuid
      AND b.deleted_at IS NULL
      AND (
        -- Admin voit tout
        is_admin()
        OR
        -- Gestionnaire de l'équipe (ancienne définition - team manager)
        is_team_manager(b.team_id)
        OR
        -- Tout gestionnaire membre de l'équipe
        (is_gestionnaire() AND user_belongs_to_team_v2(b.team_id))
        OR
        -- Locataire d'un lot dans ce building (via lot_contacts)
        EXISTS (
          SELECT 1 FROM lots l
          INNER JOIN lot_contacts lc ON lc.lot_id = l.id
          INNER JOIN users u ON lc.user_id = u.id
          WHERE l.building_id = b.id
            AND u.auth_user_id = auth.uid()
            AND u.role = 'locataire'
        )
      )
  );
$$;

COMMENT ON FUNCTION can_view_building IS 'Admin OR team manager OR gestionnaire membre de l''équipe OR locataire du building';

-- ----------------------------------------------------------------------------
-- Fonction: can_view_lot (⚠️ MODIFIÉE: utilise lot_contacts au lieu de gestionnaire_id/tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_lot(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lots l
    WHERE l.id = lot_uuid
      AND l.deleted_at IS NULL
      AND (
        -- Admin voit tout
        is_admin()
        OR
        -- Gestionnaire de l'équipe (ancienne définition - team manager)
        is_team_manager(get_lot_team_id(l.id))
        OR
        -- Tout gestionnaire membre de l'équipe
        (is_gestionnaire() AND user_belongs_to_team_v2(get_lot_team_id(l.id)))
        OR
        -- Locataire du lot (via lot_contacts)
        is_tenant_of_lot(l.id)
      )
  );
$$;

COMMENT ON FUNCTION can_view_lot IS 'Admin OR team manager OR gestionnaire membre de l''équipe OR locataire du lot';

-- ============================================================================
-- SECTION 5: RLS POLICIES
-- ============================================================================

-- Note: 20 policies au total (4 par table pour 5 tables)

-- ----------------------------------------------------------------------------
-- RLS: buildings (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildings_select ON buildings FOR SELECT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (can_view_building(id));

CREATE POLICY buildings_insert ON buildings FOR INSERT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  WITH CHECK (
    is_admin()
    OR (
      is_gestionnaire()
      AND user_belongs_to_team_v2(team_id)
    )
  );

CREATE POLICY buildings_update ON buildings FOR UPDATE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (deleted_at IS NULL AND (is_admin() OR is_team_manager(team_id)))
  WITH CHECK (is_admin() OR is_team_manager(team_id));

CREATE POLICY buildings_delete ON buildings FOR DELETE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(team_id));

-- ----------------------------------------------------------------------------
-- RLS: lots (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY lots_select ON lots FOR SELECT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (can_view_lot(id));

CREATE POLICY lots_insert ON lots FOR INSERT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  WITH CHECK (
    is_admin()
    OR (
      is_gestionnaire()
      AND (
        -- If linked to a building, user must belong to that building's team
        (building_id IS NOT NULL AND user_belongs_to_team_v2(get_building_team_id(building_id)))
        -- If standalone lot (no building), user must belong to the provided team_id
        OR (building_id IS NULL AND user_belongs_to_team_v2(team_id))
      )
    )
  );

CREATE POLICY lots_update ON lots FOR UPDATE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR is_team_manager(get_lot_team_id(id))
    )
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_lot_team_id(id))
  );

CREATE POLICY lots_delete ON lots FOR DELETE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(get_lot_team_id(id)));

-- ----------------------------------------------------------------------------
-- RLS: building_contacts (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY building_contacts_select ON building_contacts FOR SELECT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (can_view_building(building_id));

CREATE POLICY building_contacts_insert ON building_contacts FOR INSERT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  WITH CHECK (is_admin() OR is_team_manager(get_building_team_id(building_id)));

CREATE POLICY building_contacts_update ON building_contacts FOR UPDATE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(get_building_team_id(building_id)));

CREATE POLICY building_contacts_delete ON building_contacts FOR DELETE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(get_building_team_id(building_id)));

-- ----------------------------------------------------------------------------
-- RLS: lot_contacts (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY lot_contacts_select ON lot_contacts FOR SELECT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (can_view_lot(lot_id));

CREATE POLICY lot_contacts_insert ON lot_contacts FOR INSERT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  WITH CHECK (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

CREATE POLICY lot_contacts_update ON lot_contacts FOR UPDATE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

CREATE POLICY lot_contacts_delete ON lot_contacts FOR DELETE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

-- ----------------------------------------------------------------------------
-- RLS: property_documents (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_documents_select ON property_documents FOR SELECT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (
    deleted_at IS NULL AND (
      -- Admin: accès total
      is_admin()
      OR
      -- Gestionnaire de l'équipe: accès aux documents 'equipe' et 'locataire'
      (
        is_team_manager(team_id) AND (
          visibility_level = 'equipe' OR visibility_level = 'locataire'
        )
      )
      OR
      -- Locataire: accès aux documents 'locataire' de son lot
      (
        visibility_level = 'locataire' AND lot_id IS NOT NULL AND is_tenant_of_lot(lot_id)
      )
    )
  );

COMMENT ON POLICY property_documents_select ON property_documents IS
  'Visibilité selon visibility_level: equipe (team managers), locataire (team managers + tenant du lot)';

CREATE POLICY property_documents_insert ON property_documents FOR INSERT
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  WITH CHECK (is_admin() OR (is_gestionnaire() AND is_team_manager(team_id)));

CREATE POLICY property_documents_update ON property_documents FOR UPDATE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR is_team_manager(team_id)
      OR (uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()) AND is_gestionnaire())  -- ✅ FIX: Resolve auth.uid() to database ID
    )
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(team_id)
    OR (uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()) AND is_gestionnaire())  -- ✅ FIX: Resolve auth.uid() to database ID
  );

CREATE POLICY property_documents_delete ON property_documents FOR DELETE
TO authenticated  -- ✅ Rôle PostgreSQL authenticated (a une session auth)
  USING (is_admin() OR is_team_manager(team_id));

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction trigger: update_updated_at_column
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER building_contacts_updated_at
  BEFORE UPDATE ON building_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER lot_contacts_updated_at
  BEFORE UPDATE ON lot_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER property_documents_updated_at
  BEFORE UPDATE ON property_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Fonction trigger: update_building_lots_count_from_lot_contacts
-- ⚠️ NOUVELLE VERSION: Basée sur lot_contacts au lieu de lots.tenant_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_building_lots_count_from_lot_contacts()
RETURNS TRIGGER AS $$
DECLARE
  v_building_id UUID;
  v_is_tenant BOOLEAN;
  v_lot_has_tenants_before BOOLEAN;
  v_lot_has_tenants_after BOOLEAN;
BEGIN
  -- Déterminer si l'user est un locataire
  SELECT u.role = 'locataire' INTO v_is_tenant
  FROM users u
  WHERE u.id = COALESCE(NEW.user_id, OLD.user_id);

  -- Si ce n'est pas un locataire, ne rien faire
  IF NOT v_is_tenant THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Récupérer le building_id du lot
  SELECT l.building_id INTO v_building_id
  FROM lots l
  WHERE l.id = COALESCE(NEW.lot_id, OLD.lot_id);

  -- Si le lot n'est pas dans un immeuble, ne rien faire
  IF v_building_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- INSERT: Nouveau locataire ajouté
  IF TG_OP = 'INSERT' THEN
    -- Vérifier si c'est le PREMIER locataire du lot
    SELECT EXISTS (
      SELECT 1 FROM lot_contacts lc2
      INNER JOIN users u ON lc2.user_id = u.id
      WHERE lc2.lot_id = NEW.lot_id
        AND u.role = 'locataire'
        AND lc2.id != NEW.id
    ) INTO v_lot_has_tenants_before;

    -- Si c'est le premier locataire, le lot passe de vacant à occupé
    IF NOT v_lot_has_tenants_before THEN
      UPDATE buildings
      SET occupied_lots = occupied_lots + 1,
          vacant_lots = vacant_lots - 1
      WHERE id = v_building_id;
    END IF;

    RETURN NEW;

  -- DELETE: Locataire retiré
  ELSIF TG_OP = 'DELETE' THEN
    -- Vérifier s'il reste des locataires après suppression
    SELECT EXISTS (
      SELECT 1 FROM lot_contacts lc2
      INNER JOIN users u ON lc2.user_id = u.id
      WHERE lc2.lot_id = OLD.lot_id
        AND u.role = 'locataire'
        AND lc2.id != OLD.id
    ) INTO v_lot_has_tenants_after;

    -- Si c'était le dernier locataire, le lot passe d'occupé à vacant
    IF NOT v_lot_has_tenants_after THEN
      UPDATE buildings
      SET occupied_lots = occupied_lots - 1,
          vacant_lots = vacant_lots + 1
      WHERE id = v_building_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_building_lots_count_from_lot_contacts IS 'Maintient les compteurs occupied_lots/vacant_lots basés sur lot_contacts (INSERT/DELETE uniquement)';

-- ----------------------------------------------------------------------------
-- Fonction trigger: update_building_total_lots (pour INSERT/DELETE de lots)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_building_total_lots()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_has_tenants BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.building_id IS NOT NULL THEN
      -- Vérifier si le lot a déjà des locataires dans lot_contacts
      SELECT EXISTS (
        SELECT 1 FROM lot_contacts lc
        INNER JOIN users u ON lc.user_id = u.id
        WHERE lc.lot_id = NEW.id
          AND u.role = 'locataire'
      ) INTO v_lot_has_tenants;

      UPDATE buildings
      SET total_lots = total_lots + 1,
          vacant_lots = vacant_lots + CASE WHEN NOT v_lot_has_tenants THEN 1 ELSE 0 END,
          occupied_lots = occupied_lots + CASE WHEN v_lot_has_tenants THEN 1 ELSE 0 END
      WHERE id = NEW.building_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Si le building_id change (déplacement de lot), recalculer les deux immeubles
    IF (OLD.building_id IS DISTINCT FROM NEW.building_id) THEN
      -- Vérifier si le lot a des locataires
      SELECT EXISTS (
        SELECT 1 FROM lot_contacts lc
        INNER JOIN users u ON lc.user_id = u.id
        WHERE lc.lot_id = NEW.id
          AND u.role = 'locataire'
      ) INTO v_lot_has_tenants;

      -- Décrémenter l'ancien immeuble
      IF OLD.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots - 1,
            vacant_lots = vacant_lots - CASE WHEN NOT v_lot_has_tenants THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots - CASE WHEN v_lot_has_tenants THEN 1 ELSE 0 END
        WHERE id = OLD.building_id;
      END IF;

      -- Incrémenter le nouveau immeuble
      IF NEW.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots + 1,
            vacant_lots = vacant_lots + CASE WHEN NOT v_lot_has_tenants THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots + CASE WHEN v_lot_has_tenants THEN 1 ELSE 0 END
        WHERE id = NEW.building_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.building_id IS NOT NULL THEN
      -- Vérifier si le lot avait des locataires
      SELECT EXISTS (
        SELECT 1 FROM lot_contacts lc
        INNER JOIN users u ON lc.user_id = u.id
        WHERE lc.lot_id = OLD.id
          AND u.role = 'locataire'
      ) INTO v_lot_has_tenants;

      UPDATE buildings
      SET total_lots = total_lots - 1,
          vacant_lots = vacant_lots - CASE WHEN NOT v_lot_has_tenants THEN 1 ELSE 0 END,
          occupied_lots = occupied_lots - CASE WHEN v_lot_has_tenants THEN 1 ELSE 0 END
      WHERE id = OLD.building_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_building_total_lots IS 'Maintient le compteur total_lots lors de l''ajout/suppression de lots';

-- Triggers
CREATE TRIGGER lot_contacts_update_building_count
  AFTER INSERT OR DELETE ON lot_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_building_lots_count_from_lot_contacts();

COMMENT ON TRIGGER lot_contacts_update_building_count ON lot_contacts IS 'Mise à jour des compteurs occupied_lots/vacant_lots lors de l''ajout/suppression de locataires';

CREATE TRIGGER lots_update_building_count
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION update_building_total_lots();

COMMENT ON TRIGGER lots_update_building_count ON lots IS 'Mise à jour du compteur total_lots lors de l''ajout/suppression/déplacement de lots';

-- ============================================================================
-- SECTION 7: SUPABASE STORAGE BUCKET
-- ============================================================================

-- Note: La création du bucket et des Storage RLS policies doit être faite
-- via le script: npx tsx scripts/configure-storage-bucket.ts
--
-- Configuration du bucket property-documents:
-- - public: false (privé, accès via signed URLs)
-- - file_size_limit: 10485760 (10 MB)
-- - allowed_mime_types: images, PDF, Office docs, text, zip (11 types)
--
-- Storage RLS Policies (4 policies) générées par le script:
-- 1. SELECT: Admin + Team managers + Locataires (si visibility = 'locataire')
-- 2. INSERT: Admin + Gestionnaires
-- 3. UPDATE: Admin + Team managers
-- 4. DELETE: Admin + Team managers
--
-- Les policies Storage seront étendues en Phase 3 pour inclure le partage
-- temporaire avec les prestataires lors d'interventions.

-- ============================================================================
-- FIN DE LA MIGRATION PHASE 2
-- ============================================================================
