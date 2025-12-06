-- ============================================================================
-- PHASE 4: CONTRACTS/BAUX MIGRATION
-- ============================================================================
-- Date: 2025-12-05
-- Description: Gestion des contrats/baux pour le role gestionnaire
-- Tables: 3 | ENUMs: 5 | Helpers: 3 | Policies: 12 | Indexes: 10
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMs (5 enums)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM: contract_type (Types de contrats/baux)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_type') THEN
    CREATE TYPE contract_type AS ENUM (
      'bail_habitation',     -- Bail d'habitation vide
      'bail_meuble'          -- Bail meuble
    );
  END IF;
END $$;

COMMENT ON TYPE contract_type IS 'Type de contrat de bail';

-- ----------------------------------------------------------------------------
-- ENUM: contract_status (Statuts du contrat)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
    CREATE TYPE contract_status AS ENUM (
      'brouillon',           -- Brouillon, pas encore actif
      'actif',               -- Contrat en cours
      'expire',              -- Contrat expire
      'resilie',             -- Contrat resilie avant terme
      'renouvele'            -- Contrat renouvele (lie a un nouveau)
    );
  END IF;
END $$;

COMMENT ON TYPE contract_status IS 'Statut du cycle de vie du contrat';

-- ----------------------------------------------------------------------------
-- ENUM: guarantee_type (Types de garantie locative)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guarantee_type') THEN
    CREATE TYPE guarantee_type AS ENUM (
      'pas_de_garantie',     -- Pas de depot de garantie
      'compte_proprietaire', -- Depot sur compte du proprietaire
      'compte_bloque',       -- Compte bloque
      'e_depot',             -- E-depot (service en ligne)
      'autre'                -- Autre type de garantie
    );
  END IF;
END $$;

COMMENT ON TYPE guarantee_type IS 'Type de depot de garantie locative';

-- ----------------------------------------------------------------------------
-- ENUM: payment_frequency (Frequence de paiement)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_frequency') THEN
    CREATE TYPE payment_frequency AS ENUM (
      'mensuel',             -- Tous les mois
      'trimestriel',         -- Tous les 3 mois
      'semestriel',          -- Tous les 6 mois
      'annuel'               -- Une fois par an
    );
  END IF;
END $$;

COMMENT ON TYPE payment_frequency IS 'Frequence de paiement du loyer';

-- ----------------------------------------------------------------------------
-- ENUM: contract_document_type (Types de documents lies aux contrats)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_document_type') THEN
    CREATE TYPE contract_document_type AS ENUM (
      'bail',                    -- Le contrat de bail signe
      'avenant',                 -- Avenant au bail (modification)
      'etat_des_lieux_entree',   -- Etat des lieux d'entree
      'etat_des_lieux_sortie',   -- Etat des lieux de sortie
      'attestation_assurance',   -- Attestation assurance habitation
      'justificatif_identite',   -- Piece d'identite locataire/garant
      'justificatif_revenus',    -- Bulletins de salaire, avis imposition
      'caution_bancaire',        -- Document de caution/garantie bancaire
      'quittance',               -- Quittance de loyer
      'reglement_copropriete',   -- Reglement de copropriete
      'diagnostic',              -- DPE, amiante, plomb, etc.
      'autre'                    -- Autre document
    );
  END IF;
END $$;

COMMENT ON TYPE contract_document_type IS 'Types de documents lies aux contrats de bail';

-- ----------------------------------------------------------------------------
-- ENUM: contract_contact_role (Roles des contacts lies aux contrats)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_contact_role') THEN
    CREATE TYPE contract_contact_role AS ENUM (
      'locataire',           -- Locataire principal ou colocataire
      'colocataire',         -- Colocataire
      'garant',              -- Garant/caution
      'representant_legal',  -- Representant legal (mineur, tutelle)
      'autre'                -- Autre role
    );
  END IF;
END $$;

COMMENT ON TYPE contract_contact_role IS 'Role d un contact dans un contrat';

-- ============================================================================
-- SECTION 2: TABLES (3 tables)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: contracts (Table principale des contrats)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations obligatoires
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Informations generales
  title TEXT NOT NULL,
  contract_type contract_type DEFAULT 'bail_habitation' NOT NULL,
  status contract_status DEFAULT 'brouillon' NOT NULL,

  -- Dates
  start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0 AND duration_months <= 120),
  end_date DATE GENERATED ALWAYS AS (start_date + make_interval(months => duration_months)) STORED,
  signed_date DATE,

  -- Paiements
  payment_frequency payment_frequency DEFAULT 'mensuel' NOT NULL,
  payment_frequency_value INTEGER DEFAULT 1 NOT NULL CHECK (payment_frequency_value > 0 AND payment_frequency_value <= 12),
  rent_amount DECIMAL(10,2) NOT NULL CHECK (rent_amount >= 0),
  charges_amount DECIMAL(10,2) DEFAULT 0 CHECK (charges_amount >= 0),

  -- Garantie locative
  guarantee_type guarantee_type DEFAULT 'pas_de_garantie' NOT NULL,
  guarantee_amount DECIMAL(10,2) CHECK (guarantee_amount >= 0),
  guarantee_notes TEXT,

  -- Commentaires
  comments TEXT,

  -- Metadata flexible
  metadata JSONB DEFAULT '{}',

  -- Renouvellement (liens entre contrats)
  renewed_from_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  renewed_to_id UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE contracts IS 'Contrats de bail lies aux lots';
COMMENT ON COLUMN contracts.duration_months IS 'Duree du bail en mois (ex: 12, 24, 36)';
COMMENT ON COLUMN contracts.end_date IS 'Date de fin calculee automatiquement (start_date + duration_months)';
COMMENT ON COLUMN contracts.payment_frequency_value IS 'Nombre d unites de frequence (ex: 1 pour mensuel, 3 pour trimestriel)';
COMMENT ON COLUMN contracts.renewed_from_id IS 'Reference au contrat precedent si renouvellement';
COMMENT ON COLUMN contracts.renewed_to_id IS 'Reference au nouveau contrat si renouvele';

-- ----------------------------------------------------------------------------
-- TABLE: contract_contacts (Contacts lies aux contrats: locataires, garants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_contacts (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role et priorite
  role contract_contact_role DEFAULT 'locataire' NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,

  -- Notes specifiques
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contrainte d'unicite: un contact ne peut avoir qu'un role par contrat
  CONSTRAINT unique_contract_contact_role UNIQUE (contract_id, user_id, role)
);

COMMENT ON TABLE contract_contacts IS 'Contacts lies aux contrats (locataires, garants, etc.)';
COMMENT ON COLUMN contract_contacts.role IS 'Role du contact: locataire, colocataire, garant, etc.';
COMMENT ON COLUMN contract_contacts.is_primary IS 'Indique le contact principal pour ce role (ex: locataire principal)';

-- ----------------------------------------------------------------------------
-- TABLE: contract_documents (Documents lies aux contrats)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_documents (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type de document
  document_type contract_document_type DEFAULT 'autre' NOT NULL,

  -- Informations fichier
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'contract-documents' NOT NULL,

  -- Metadata
  title TEXT,
  description TEXT,

  -- Upload info
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE contract_documents IS 'Documents lies aux contrats de bail';
COMMENT ON COLUMN contract_documents.document_type IS 'Type de document: bail, avenant, etat des lieux, etc.';
COMMENT ON COLUMN contract_documents.storage_bucket IS 'Bucket Supabase Storage (defaut: contract-documents)';

-- ============================================================================
-- SECTION 3: INDEXES (10 indexes)
-- ============================================================================

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_team_id ON contracts(team_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_lot_id ON contracts(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date) WHERE deleted_at IS NULL AND status = 'actif';
-- Note: Partial index for active contracts expiring soon (filtering done at query time)
CREATE INDEX IF NOT EXISTS idx_contracts_expiring ON contracts(end_date, status)
  WHERE deleted_at IS NULL AND status = 'actif';
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by) WHERE deleted_at IS NULL;

-- Contract contacts indexes
CREATE INDEX IF NOT EXISTS idx_contract_contacts_contract ON contract_contacts(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_contacts_user ON contract_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_contacts_role ON contract_contacts(contract_id, role);

-- Contract documents indexes
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON contract_documents(contract_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 4: RLS HELPER FUNCTIONS (3 helpers)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: get_contract_team_id (Obtenir le team_id d'un contrat)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_contract_team_id(contract_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT team_id FROM contracts WHERE id = contract_uuid AND deleted_at IS NULL;
$$;

COMMENT ON FUNCTION get_contract_team_id IS 'Retourne le team_id d un contrat pour les policies RLS';

-- ----------------------------------------------------------------------------
-- FUNCTION: can_view_contract (Verifier si l'utilisateur peut voir un contrat)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_contract(contract_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_uuid
      AND c.deleted_at IS NULL
      AND (
        -- Admin peut tout voir
        is_admin()
        -- Gestionnaire de l'equipe
        OR is_team_manager(c.team_id)
        -- Membre de l'equipe (gestionnaire)
        OR (is_gestionnaire() AND user_belongs_to_team_v2(c.team_id))
        -- Locataire du lot associe au contrat
        OR is_tenant_of_lot(c.lot_id)
      )
  );
$$;

COMMENT ON FUNCTION can_view_contract IS 'Verifie si l utilisateur peut voir un contrat (gestionnaire equipe ou locataire du lot)';

-- ----------------------------------------------------------------------------
-- FUNCTION: can_manage_contract (Verifier si l'utilisateur peut modifier un contrat)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_contract(contract_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = contract_uuid
      AND c.deleted_at IS NULL
      AND (
        is_admin()
        OR is_team_manager(c.team_id)
      )
  );
$$;

COMMENT ON FUNCTION can_manage_contract IS 'Verifie si l utilisateur peut modifier un contrat (admin ou gestionnaire equipe)';

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY POLICIES (12 policies)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICIES: contracts
-- ----------------------------------------------------------------------------

-- SELECT: Gestionnaires de l'equipe ou locataires du lot
CREATE POLICY contracts_select ON contracts
  FOR SELECT
  TO authenticated
  USING (can_view_contract(id));

-- INSERT: Gestionnaires de l'equipe uniquement
CREATE POLICY contracts_insert ON contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

-- UPDATE: Gestionnaires de l'equipe uniquement (et non supprime)
CREATE POLICY contracts_update ON contracts
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL AND can_manage_contract(id))
  WITH CHECK (can_manage_contract(id));

-- DELETE: Admin ou gestionnaire de l'equipe
CREATE POLICY contracts_delete ON contracts
  FOR DELETE
  TO authenticated
  USING (can_manage_contract(id));

-- ----------------------------------------------------------------------------
-- POLICIES: contract_contacts
-- ----------------------------------------------------------------------------

-- SELECT: Memes regles que le contrat parent
CREATE POLICY contract_contacts_select ON contract_contacts
  FOR SELECT
  TO authenticated
  USING (can_view_contract(contract_id));

-- INSERT: Gestionnaires uniquement
CREATE POLICY contract_contacts_insert ON contract_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_contract_team_id(contract_id))
  );

-- UPDATE: Gestionnaires uniquement
CREATE POLICY contract_contacts_update ON contract_contacts
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_team_manager(get_contract_team_id(contract_id)))
  WITH CHECK (is_admin() OR is_team_manager(get_contract_team_id(contract_id)));

-- DELETE: Gestionnaires uniquement
CREATE POLICY contract_contacts_delete ON contract_contacts
  FOR DELETE
  TO authenticated
  USING (is_admin() OR is_team_manager(get_contract_team_id(contract_id)));

-- ----------------------------------------------------------------------------
-- POLICIES: contract_documents
-- ----------------------------------------------------------------------------

-- SELECT: Memes regles que le contrat parent
CREATE POLICY contract_documents_select ON contract_documents
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND can_view_contract(contract_id));

-- INSERT: Gestionnaires uniquement
CREATE POLICY contract_documents_insert ON contract_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_contract_team_id(contract_id))
  );

-- UPDATE: Gestionnaires uniquement (et non supprime)
CREATE POLICY contract_documents_update ON contract_documents
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL AND (is_admin() OR is_team_manager(get_contract_team_id(contract_id))))
  WITH CHECK (is_admin() OR is_team_manager(get_contract_team_id(contract_id)));

-- DELETE: Gestionnaires uniquement
CREATE POLICY contract_documents_delete ON contract_documents
  FOR DELETE
  TO authenticated
  USING (is_admin() OR is_team_manager(get_contract_team_id(contract_id)));

-- ============================================================================
-- SECTION 6: TRIGGERS (2 triggers)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRIGGER: contracts_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGER: contract_contacts_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER contract_contacts_updated_at
  BEFORE UPDATE ON contract_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGER: contract_documents_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER contract_documents_updated_at
  BEFORE UPDATE ON contract_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: COMMENTS FINAUX
-- ============================================================================

COMMENT ON TABLE contracts IS 'Phase 4: Contrats de bail - Table principale des baux lies aux lots';
COMMENT ON TABLE contract_contacts IS 'Phase 4: Contacts lies aux contrats (locataires, garants)';
COMMENT ON TABLE contract_documents IS 'Phase 4: Documents des contrats (bail, EDL, attestations)';

-- ============================================================================
-- FIN DE LA MIGRATION PHASE 4
-- ============================================================================
