-- ============================================================================
-- MIGRATION: Fix Tenant Access RLS (using a_venir)
-- ============================================================================
-- Date: 2025-12-11
-- Description: Updates RLS policies and helper functions to correctly handle
--              tenant access via 'contracts' table, supporting both
--              'actif' and 'a_venir' statuses.
--
-- Depends on: 20251211000004_add_avenir_enum.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCTION: is_tenant_of_lot (Update to include 'a_venir')
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
      AND c.status IN ('actif', 'a_venir')  -- Now works as 'a_venir' exists in enum
      AND c.deleted_at IS NULL
      AND cc.role IN ('locataire', 'colocataire')
      AND u.auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_tenant_of_lot IS 
  'Vérifie si l''utilisateur est locataire du lot via un contrat actif ou à venir';

-- ----------------------------------------------------------------------------
-- 2. POLICY: lots_select_locataire
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS lots_select_locataire ON lots;

CREATE POLICY lots_select_locataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT c.lot_id
      FROM contracts c
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY lots_select_locataire ON lots IS 
  'Locataires can view lots linked via active/upcoming contracts';

-- ----------------------------------------------------------------------------
-- 3. POLICY: buildings_select_locataire
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS buildings_select_locataire ON buildings;

CREATE POLICY buildings_select_locataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT l.building_id
      FROM lots l
      INNER JOIN contracts c ON c.lot_id = l.id
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND l.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY buildings_select_locataire ON buildings IS 
  'Locataires can view buildings containing their lots (via active/upcoming contracts)';

-- ============================================================================
-- END MIGRATION
-- ============================================================================
