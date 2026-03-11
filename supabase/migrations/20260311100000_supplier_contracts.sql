-- ============================================================================
-- MIGRATION: Supplier Contracts (Contrats Fournisseurs)
-- Date: 2026-03-11
-- Description: Tables for supplier/vendor contracts linked to buildings or lots
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLES
-- ============================================================================

-- Table principale: contrats fournisseurs
CREATE TABLE supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES lots(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,

  reference TEXT NOT NULL,
  cost DECIMAL(10,2),
  cost_frequency TEXT,
  start_date DATE,
  end_date DATE,
  notice_period TEXT,
  notice_date DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'actif',

  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- XOR constraint: building_id OR lot_id (exactly one must be set)
ALTER TABLE supplier_contracts
  ADD CONSTRAINT supplier_contracts_xor_building_lot
  CHECK (
    (building_id IS NOT NULL AND lot_id IS NULL)
    OR (building_id IS NULL AND lot_id IS NOT NULL)
  );

-- Status constraint
ALTER TABLE supplier_contracts
  ADD CONSTRAINT supplier_contracts_valid_status
  CHECK (status IN ('actif', 'expire', 'resilie'));

-- Table documents lies aux contrats fournisseurs
CREATE TABLE supplier_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT CHECK (file_size > 0),
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'contract-documents',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 2: INDEXES
-- ============================================================================

CREATE INDEX idx_supplier_contracts_team_id
  ON supplier_contracts(team_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_supplier_contracts_building_id
  ON supplier_contracts(building_id) WHERE deleted_at IS NULL AND building_id IS NOT NULL;

CREATE INDEX idx_supplier_contracts_lot_id
  ON supplier_contracts(lot_id) WHERE deleted_at IS NULL AND lot_id IS NOT NULL;

CREATE INDEX idx_supplier_contracts_status
  ON supplier_contracts(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_supplier_contracts_notice_date
  ON supplier_contracts(notice_date) WHERE deleted_at IS NULL AND notice_date IS NOT NULL;

CREATE INDEX idx_supplier_contracts_supplier_id
  ON supplier_contracts(supplier_id) WHERE deleted_at IS NULL AND supplier_id IS NOT NULL;

CREATE INDEX idx_supplier_contract_documents_contract
  ON supplier_contract_documents(supplier_contract_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Get team_id for a supplier contract (used in RLS policies)
CREATE OR REPLACE FUNCTION get_supplier_contract_team_id(sc_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT team_id FROM supplier_contracts WHERE id = sc_id;
$$;

GRANT EXECUTE ON FUNCTION get_supplier_contract_team_id TO authenticated;

-- ============================================================================
-- SECTION 4: RLS POLICIES
-- ============================================================================

ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contract_documents ENABLE ROW LEVEL SECURITY;

-- supplier_contracts: SELECT — gestionnaires de l'equipe
CREATE POLICY supplier_contracts_select ON supplier_contracts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
    )
  );

-- supplier_contracts: INSERT — gestionnaires de l'equipe
CREATE POLICY supplier_contracts_insert ON supplier_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

-- supplier_contracts: UPDATE — gestionnaires de l'equipe
CREATE POLICY supplier_contracts_update ON supplier_contracts
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_admin() OR is_team_manager(team_id))
  )
  WITH CHECK (
    is_admin() OR is_team_manager(team_id)
  );

-- supplier_contracts: DELETE — gestionnaires de l'equipe
CREATE POLICY supplier_contracts_delete ON supplier_contracts
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR is_team_manager(team_id)
  );

-- supplier_contract_documents: SELECT
CREATE POLICY supplier_contract_documents_select ON supplier_contract_documents
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
    )
  );

-- supplier_contract_documents: INSERT
CREATE POLICY supplier_contract_documents_insert ON supplier_contract_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_supplier_contract_team_id(supplier_contract_id))
  );

-- supplier_contract_documents: UPDATE
CREATE POLICY supplier_contract_documents_update ON supplier_contract_documents
  FOR UPDATE
  TO authenticated
  USING (
    is_admin()
    OR is_team_manager(get_supplier_contract_team_id(supplier_contract_id))
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(get_supplier_contract_team_id(supplier_contract_id))
  );

-- supplier_contract_documents: DELETE
CREATE POLICY supplier_contract_documents_delete ON supplier_contract_documents
  FOR DELETE
  TO authenticated
  USING (
    is_admin()
    OR is_team_manager(get_supplier_contract_team_id(supplier_contract_id))
  );

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER supplier_contracts_updated_at
  BEFORE UPDATE ON supplier_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: COMMENTS
-- ============================================================================

COMMENT ON TABLE supplier_contracts IS 'Contrats fournisseurs lies aux immeubles ou lots (copropriete, syndic)';
COMMENT ON TABLE supplier_contract_documents IS 'Documents/pieces jointes des contrats fournisseurs';
COMMENT ON FUNCTION get_supplier_contract_team_id IS 'Retourne le team_id d''un contrat fournisseur (pour RLS)';
