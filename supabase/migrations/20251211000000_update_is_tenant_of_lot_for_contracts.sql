-- ============================================================================
-- MIGRATION: Update is_tenant_of_lot to use contract_contacts
-- ============================================================================
-- Date: 2025-12-11
-- Description: Updates the is_tenant_of_lot RLS helper function to check
--              tenant linkage via contracts (contract_contacts) instead of
--              the old lot_contacts table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: is_tenant_of_lot (UPDATED: uses contract_contacts via contracts)
-- ----------------------------------------------------------------------------
-- The tenant-lot linkage has moved from:
--   BEFORE: lot_contacts (direct lot -> user link)
--   AFTER:  contracts -> contract_contacts (lot -> contract -> user link)
--
-- This function verifies if the current authenticated user is a tenant of a lot
-- by checking if they have an active contract (status = 'actif') for that lot
-- with a role of 'locataire' or 'colocataire' in contract_contacts.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_tenant_of_lot(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM contracts c
    INNER JOIN contract_contacts cc ON cc.contract_id = c.id
    INNER JOIN users u ON cc.user_id = u.id
    WHERE c.lot_id = lot_uuid
      AND c.status = 'actif'
      AND c.deleted_at IS NULL
      AND cc.role IN ('locataire', 'colocataire')
      AND u.auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_tenant_of_lot IS 
  'Vérifie si l''utilisateur est locataire du lot via un contrat actif (contract_contacts avec role locataire/colocataire)';

-- ============================================================================
-- END MIGRATION
-- ============================================================================
