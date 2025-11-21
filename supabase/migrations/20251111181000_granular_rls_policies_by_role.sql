-- ============================================================================
-- Granular RLS Policies by Role for Buildings and Lots
-- ============================================================================
-- Description: Replace monolithic SELECT policies with role-specific policies
--              for fine-grained access control based on user role.
--
-- Access Matrix:
-- - Admin: All buildings/lots (no restriction)
-- - Gestionnaire: All buildings/lots from their team
-- - Locataire: Only lots they are linked to via lot_contacts + parent buildings
-- - Prestataire: Only lots/buildings linked via intervention_assignments
-- ============================================================================

-- ============================================================================
-- BUILDINGS TABLE - Granular Policies
-- ============================================================================

-- Drop existing monolithic policy
DROP POLICY IF EXISTS buildings_select ON buildings;

-- ----------------------------------------------------------------------------
-- Policy 1: Admin Access - All Buildings
-- ----------------------------------------------------------------------------
CREATE POLICY buildings_select_admin ON buildings
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

COMMENT ON POLICY buildings_select_admin ON buildings IS
  'Admins can view all buildings without restriction';

-- ----------------------------------------------------------------------------
-- Policy 2: Gestionnaire Access - Team Buildings
-- ----------------------------------------------------------------------------
CREATE POLICY buildings_select_gestionnaire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'gestionnaire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
    )
    AND (
      -- Is team manager
      is_team_manager(team_id)
      OR
      -- Is team member (gestionnaire)
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = buildings.team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'gestionnaire'
          AND tm.left_at IS NULL
      )
    )
  );

COMMENT ON POLICY buildings_select_gestionnaire ON buildings IS
  'Gestionnaires can view all buildings from their team';

-- ----------------------------------------------------------------------------
-- Policy 3: Locataire Access - Only Parent Buildings of Their Lots
-- ----------------------------------------------------------------------------
CREATE POLICY buildings_select_locataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'locataire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
    AND
    -- Building is parent of a lot they are tenant of
    EXISTS (
      SELECT 1
      FROM lots l
      JOIN lot_contacts lc ON lc.lot_id = l.id
      WHERE l.building_id = buildings.id
        AND lc.user_id = auth.uid()
        AND l.deleted_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_locataire ON buildings IS
  'Locataires can only view buildings that are parents of their lots';

-- ----------------------------------------------------------------------------
-- Policy 4: Prestataire Access - Buildings with Assigned Interventions
-- ----------------------------------------------------------------------------
CREATE POLICY buildings_select_prestataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'prestataire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
    )
    AND
    -- Building has interventions assigned to this provider
    is_provider_assigned_to_building(id)
  );

COMMENT ON POLICY buildings_select_prestataire ON buildings IS
  'Prestataires can only view buildings with interventions assigned to them';

-- ============================================================================
-- LOTS TABLE - Granular Policies
-- ============================================================================

-- Drop existing monolithic policy
DROP POLICY IF EXISTS lots_select ON lots;

-- ----------------------------------------------------------------------------
-- Policy 1: Admin Access - All Lots
-- ----------------------------------------------------------------------------
CREATE POLICY lots_select_admin ON lots
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

COMMENT ON POLICY lots_select_admin ON lots IS
  'Admins can view all lots without restriction';

-- ----------------------------------------------------------------------------
-- Policy 2: Gestionnaire Access - Team Lots
-- ----------------------------------------------------------------------------
CREATE POLICY lots_select_gestionnaire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'gestionnaire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
    )
    AND (
      -- Is team manager of building's team
      is_team_manager(get_building_team_id(building_id))
      OR
      -- Is team member (gestionnaire) of building's team
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
  );

COMMENT ON POLICY lots_select_gestionnaire ON lots IS
  'Gestionnaires can view all lots from their team';

-- ----------------------------------------------------------------------------
-- Policy 3: Locataire Access - Only Their Lots via lot_contacts
-- ----------------------------------------------------------------------------
CREATE POLICY lots_select_locataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'locataire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
    AND
    -- Lot is linked to this locataire via lot_contacts
    EXISTS (
      SELECT 1
      FROM lot_contacts lc
      WHERE lc.lot_id = lots.id
        AND lc.user_id = auth.uid()
    )
  );

COMMENT ON POLICY lots_select_locataire ON lots IS
  'Locataires can only view lots they are linked to via lot_contacts';

-- ----------------------------------------------------------------------------
-- Policy 4: Prestataire Access - Lots with Assigned Interventions
-- ----------------------------------------------------------------------------
CREATE POLICY lots_select_prestataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has 'prestataire' role in profile
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
    )
    AND
    -- Lot has interventions assigned to this provider
    is_provider_assigned_to_lot(id)
  );

COMMENT ON POLICY lots_select_prestataire ON lots IS
  'Prestataires can only view lots with interventions assigned to them';

-- ============================================================================
-- Summary
-- ============================================================================
-- Buildings: 4 policies (admin, gestionnaire, locataire, prestataire)
-- Lots: 4 policies (admin, gestionnaire, locataire, prestataire)
--
-- Each role has explicit, granular access rules:
-- - Admin: Full access (maintenance & support)
-- - Gestionnaire: Team-scoped access (property management)
-- - Locataire: Personal lots only + parent buildings (privacy)
-- - Prestataire: Intervention-scoped access (need-to-know basis)
-- ============================================================================
