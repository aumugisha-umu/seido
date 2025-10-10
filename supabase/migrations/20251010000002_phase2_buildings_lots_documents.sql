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
  gestionnaire_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

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
COMMENT ON COLUMN buildings.gestionnaire_id IS 'Gestionnaire principal de l''immeuble';
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
  gestionnaire_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
COMMENT ON COLUMN lots.gestionnaire_id IS 'Gestionnaire principal du lot (optionnel, peut différer du gestionnaire du building)';
COMMENT ON COLUMN lots.tenant_id IS 'Locataire principal (NULL si vacant)';
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
-- Indexes: buildings (9 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_gestionnaire ON buildings(gestionnaire_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_city ON buildings(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_postal ON buildings(postal_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_country ON buildings(country) WHERE deleted_at IS NULL;
-- Note: Full-text search index sera ajouté via une colonne générée TSVECTOR en Phase 3
-- CREATE INDEX idx_buildings_search ON buildings USING gin(to_tsvector('french', name || ' ' || address || ' ' || city));
CREATE INDEX idx_buildings_deleted ON buildings(deleted_at);

-- ----------------------------------------------------------------------------
-- Indexes: lots (16 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_lots_team ON lots(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE deleted_at IS NULL AND building_id IS NOT NULL;
CREATE INDEX idx_lots_standalone ON lots(team_id) WHERE deleted_at IS NULL AND building_id IS NULL;
CREATE INDEX idx_lots_gestionnaire ON lots(gestionnaire_id) WHERE deleted_at IS NULL AND gestionnaire_id IS NOT NULL;
CREATE INDEX idx_lots_tenant ON lots(tenant_id) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;
CREATE INDEX idx_lots_category ON lots(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_city ON lots(city) WHERE deleted_at IS NULL AND city IS NOT NULL;
CREATE INDEX idx_lots_postal ON lots(postal_code) WHERE deleted_at IS NULL AND postal_code IS NOT NULL;
CREATE INDEX idx_lots_country ON lots(country) WHERE deleted_at IS NULL AND country IS NOT NULL;
CREATE INDEX idx_lots_floor ON lots(building_id, floor) WHERE deleted_at IS NULL AND building_id IS NOT NULL AND floor IS NOT NULL;
CREATE INDEX idx_lots_vacant_building ON lots(building_id) WHERE deleted_at IS NULL AND building_id IS NOT NULL AND tenant_id IS NULL;
CREATE INDEX idx_lots_occupied_building ON lots(building_id) WHERE deleted_at IS NULL AND building_id IS NOT NULL AND tenant_id IS NOT NULL;
CREATE INDEX idx_lots_vacant_team ON lots(team_id) WHERE deleted_at IS NULL AND tenant_id IS NULL;
CREATE INDEX idx_lots_occupied_team ON lots(team_id) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;
-- Note: Full-text search index sera ajouté via une colonne générée TSVECTOR en Phase 3
-- CREATE INDEX idx_lots_search ON lots USING gin(to_tsvector('french', reference || ' ' || COALESCE(street, '') || ' ' || COALESCE(city, ''))) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_deleted ON lots(deleted_at);

-- ----------------------------------------------------------------------------
-- Indexes: building_contacts (3 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_building_contacts_building ON building_contacts(building_id);
CREATE INDEX idx_building_contacts_user ON building_contacts(user_id);
CREATE INDEX idx_building_contacts_primary ON building_contacts(building_id) WHERE is_primary = TRUE;

-- ----------------------------------------------------------------------------
-- Indexes: lot_contacts (3 indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_user ON lot_contacts(user_id);
CREATE INDEX idx_lot_contacts_primary ON lot_contacts(lot_id) WHERE is_primary = TRUE;

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
    WHERE id = auth.uid() AND role = 'admin'
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
    WHERE id = auth.uid() AND role = 'gestionnaire'
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
    WHERE tm.user_id = auth.uid()
      AND tm.team_id = check_team_id
      AND u.role = 'gestionnaire'
  );
$$;

COMMENT ON FUNCTION is_team_manager IS 'Vérifie si l''utilisateur est gestionnaire d''une équipe spécifique';

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
-- Fonction: is_tenant_of_lot
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_lot(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lots
    WHERE id = lot_uuid
      AND tenant_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_tenant_of_lot IS 'Vérifie si l''utilisateur est le locataire du lot';

-- ----------------------------------------------------------------------------
-- Fonction: can_view_building
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
        -- Gestionnaire de l'équipe
        is_team_manager(b.team_id)
        OR
        -- Locataire d'un lot dans ce building
        EXISTS (
          SELECT 1 FROM lots l
          WHERE l.building_id = b.id
            AND l.tenant_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION can_view_building IS 'Vérifie si l''utilisateur peut voir un building (admin, team manager, ou locataire)';

-- ----------------------------------------------------------------------------
-- Fonction: can_view_lot
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
        -- Gestionnaire de l'équipe (via building OU directement)
        is_team_manager(get_lot_team_id(l.id))
        OR
        -- Gestionnaire direct du lot
        (l.gestionnaire_id = auth.uid() AND is_gestionnaire())
        OR
        -- Locataire du lot
        l.tenant_id = auth.uid()
      )
  );
$$;

COMMENT ON FUNCTION can_view_lot IS 'Vérifie si l''utilisateur peut voir un lot (admin, team manager, gestionnaire direct, ou locataire)';

-- ============================================================================
-- SECTION 5: RLS POLICIES
-- ============================================================================

-- Note: 20 policies au total (4 par table pour 5 tables)

-- ----------------------------------------------------------------------------
-- RLS: buildings (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (can_view_building(id));

CREATE POLICY buildings_insert ON buildings FOR INSERT
  WITH CHECK (is_admin() OR is_team_manager(team_id));

CREATE POLICY buildings_update ON buildings FOR UPDATE
  USING (deleted_at IS NULL AND (is_admin() OR is_team_manager(team_id)))
  WITH CHECK (is_admin() OR is_team_manager(team_id));

CREATE POLICY buildings_delete ON buildings FOR DELETE
  USING (is_admin() OR is_team_manager(team_id));

-- ----------------------------------------------------------------------------
-- RLS: lots (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY lots_select ON lots FOR SELECT
  USING (can_view_lot(id));

CREATE POLICY lots_insert ON lots FOR INSERT
  WITH CHECK (
    is_admin()
    OR (building_id IS NOT NULL AND is_team_manager(get_building_team_id(building_id)))
    OR (building_id IS NULL AND is_team_manager(team_id))
  );

CREATE POLICY lots_update ON lots FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR is_team_manager(get_lot_team_id(id))
      OR (gestionnaire_id = auth.uid() AND is_gestionnaire())
    )
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_lot_team_id(id))
    OR (gestionnaire_id = auth.uid() AND is_gestionnaire())
  );

CREATE POLICY lots_delete ON lots FOR DELETE
  USING (is_admin() OR is_team_manager(get_lot_team_id(id)));

-- ----------------------------------------------------------------------------
-- RLS: building_contacts (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY building_contacts_select ON building_contacts FOR SELECT
  USING (can_view_building(building_id));

CREATE POLICY building_contacts_insert ON building_contacts FOR INSERT
  WITH CHECK (is_admin() OR is_team_manager(get_building_team_id(building_id)));

CREATE POLICY building_contacts_update ON building_contacts FOR UPDATE
  USING (is_admin() OR is_team_manager(get_building_team_id(building_id)));

CREATE POLICY building_contacts_delete ON building_contacts FOR DELETE
  USING (is_admin() OR is_team_manager(get_building_team_id(building_id)));

-- ----------------------------------------------------------------------------
-- RLS: lot_contacts (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY lot_contacts_select ON lot_contacts FOR SELECT
  USING (can_view_lot(lot_id));

CREATE POLICY lot_contacts_insert ON lot_contacts FOR INSERT
  WITH CHECK (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

CREATE POLICY lot_contacts_update ON lot_contacts FOR UPDATE
  USING (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

CREATE POLICY lot_contacts_delete ON lot_contacts FOR DELETE
  USING (is_admin() OR is_team_manager(get_lot_team_id(lot_id)));

-- ----------------------------------------------------------------------------
-- RLS: property_documents (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_documents_select ON property_documents FOR SELECT
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
  WITH CHECK (is_admin() OR (is_gestionnaire() AND is_team_manager(team_id)));

CREATE POLICY property_documents_update ON property_documents FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR is_team_manager(team_id)
      OR (uploaded_by = auth.uid() AND is_gestionnaire())
    )
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(team_id)
    OR (uploaded_by = auth.uid() AND is_gestionnaire())
  );

CREATE POLICY property_documents_delete ON property_documents FOR DELETE
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
-- Fonction trigger: update_building_lots_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_building_lots_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.building_id IS NOT NULL THEN
      UPDATE buildings
      SET total_lots = total_lots + 1,
          vacant_lots = vacant_lots + CASE WHEN NEW.tenant_id IS NULL THEN 1 ELSE 0 END,
          occupied_lots = occupied_lots + CASE WHEN NEW.tenant_id IS NOT NULL THEN 1 ELSE 0 END
      WHERE id = NEW.building_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.building_id IS DISTINCT FROM NEW.building_id) THEN
      IF OLD.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots - 1,
            vacant_lots = vacant_lots - CASE WHEN OLD.tenant_id IS NULL THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots - CASE WHEN OLD.tenant_id IS NOT NULL THEN 1 ELSE 0 END
        WHERE id = OLD.building_id;
      END IF;

      IF NEW.building_id IS NOT NULL THEN
        UPDATE buildings
        SET total_lots = total_lots + 1,
            vacant_lots = vacant_lots + CASE WHEN NEW.tenant_id IS NULL THEN 1 ELSE 0 END,
            occupied_lots = occupied_lots + CASE WHEN NEW.tenant_id IS NOT NULL THEN 1 ELSE 0 END
        WHERE id = NEW.building_id;
      END IF;

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
