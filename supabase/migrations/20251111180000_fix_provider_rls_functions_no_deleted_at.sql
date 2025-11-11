-- ============================================================================
-- Fix Provider RLS Functions - Remove deleted_at Check
-- ============================================================================
-- Description: The intervention_assignments table does not have a deleted_at
--              column, causing the RLS helper functions to always return FALSE.
--              This migration removes the erroneous deleted_at check.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fix Helper Function: Check if provider is assigned to a building
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
      -- ❌ REMOVED: AND ia.deleted_at IS NULL (column doesn't exist)
      AND i.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_provider_assigned_to_building IS
  'Check if current user is a provider assigned to any intervention in the given building';

-- ----------------------------------------------------------------------------
-- Fix Helper Function: Check if provider is assigned to a lot
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
      -- ❌ REMOVED: AND ia.deleted_at IS NULL (column doesn't exist)
      AND i.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_provider_assigned_to_lot IS
  'Check if current user is a provider assigned to any intervention in the given lot';
