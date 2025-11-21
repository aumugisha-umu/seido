-- ============================================================================
-- Fix Provider Access to Buildings and Lots
-- ============================================================================
-- Description: Extend RLS policies to allow providers (prestataires) to view
--              buildings and lots associated with interventions they are assigned to.
--              This fixes the "Localisation non spécifiée" issue in provider UI.
--
-- Changes:
-- 1. Create helper functions to check provider assignments
-- 2. Update buildings_select and lots_select policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper Function: Check if provider is assigned to a building
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_provider_assigned_to_building(building_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    JOIN interventions i ON ia.intervention_id = i.id
    WHERE i.building_id = $1
      AND ia.user_id = auth.uid()
      AND ia.role = 'prestataire'
      AND ia.deleted_at IS NULL
      AND i.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_provider_assigned_to_building IS
  'Check if current user is a provider assigned to any intervention in the given building';

-- ----------------------------------------------------------------------------
-- Helper Function: Check if provider is assigned to a lot
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_provider_assigned_to_lot(lot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    JOIN interventions i ON ia.intervention_id = i.id
    WHERE i.lot_id = $1
      AND ia.user_id = auth.uid()
      AND ia.role = 'prestataire'
      AND ia.deleted_at IS NULL
      AND i.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_provider_assigned_to_lot IS
  'Check if current user is a provider assigned to any intervention in the given lot';

-- ----------------------------------------------------------------------------
-- Update RLS Policy: buildings_select
-- ----------------------------------------------------------------------------
-- Drop existing policy
DROP POLICY IF EXISTS buildings_select ON buildings;

-- Recreate with provider access
CREATE POLICY buildings_select ON buildings
  FOR SELECT
  USING (
    is_admin()
    OR is_team_manager(team_id)
    OR (
      -- Team member (gestionnaire or locataire)
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = buildings.team_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('gestionnaire', 'locataire')
          AND tm.left_at IS NULL
      )
    )
    OR is_provider_assigned_to_building(id)  -- ✅ NEW: Provider access
  );

COMMENT ON POLICY buildings_select ON buildings IS
  'Allow users to view buildings from their team or if they are assigned providers';

-- ----------------------------------------------------------------------------
-- Update RLS Policy: lots_select
-- ----------------------------------------------------------------------------
-- Drop existing policy
DROP POLICY IF EXISTS lots_select ON lots;

-- Recreate with provider access
CREATE POLICY lots_select ON lots
  FOR SELECT
  USING (
    is_admin()
    OR is_team_manager(get_building_team_id(building_id))
    OR (
      -- Team member (gestionnaire)
      EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN buildings b ON b.team_id = tm.team_id
        WHERE b.id = lots.building_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'gestionnaire'
          AND tm.left_at IS NULL
          AND b.deleted_at IS NULL
      )
    )
    OR is_tenant_of_lot(id)
    OR is_provider_assigned_to_lot(id)  -- ✅ NEW: Provider access
  );

COMMENT ON POLICY lots_select ON lots IS
  'Allow users to view lots from their team, tenants to view their own lots, or assigned providers';
