-- ============================================================================
-- Fix RLS Infinite Recursion - Final Version
-- ============================================================================
-- Description: Completely remove recursive policies and replace with
--              non-recursive versions that avoid circular dependencies.
--
-- Root Cause: lots_select_gestionnaire called get_building_team_id() which
--            queries buildings table, triggering buildings_select_gestionnaire,
--            creating infinite recursion loop.
--
-- Solution: Drop ALL existing SELECT policies and recreate with direct joins
--          that don't trigger recursive policy evaluation.
-- ============================================================================

-- ============================================================================
-- Step 1: Drop ALL existing SELECT policies
-- ============================================================================

-- Drop ALL existing SELECT policies for buildings
DROP POLICY IF EXISTS buildings_select ON buildings;
DROP POLICY IF EXISTS buildings_select_admin ON buildings;
DROP POLICY IF EXISTS buildings_select_gestionnaire ON buildings;
DROP POLICY IF EXISTS buildings_select_locataire ON buildings;
DROP POLICY IF EXISTS buildings_select_prestataire ON buildings;

-- Drop ALL existing SELECT policies for lots
DROP POLICY IF EXISTS lots_select ON lots;
DROP POLICY IF EXISTS lots_select_admin ON lots;
DROP POLICY IF EXISTS lots_select_gestionnaire ON lots;
DROP POLICY IF EXISTS lots_select_locataire ON lots;
DROP POLICY IF EXISTS lots_select_prestataire ON lots;

-- ============================================================================
-- Step 2: Update helper functions to use SECURITY DEFINER properly
-- ============================================================================

-- Fix get_building_team_id to bypass RLS
CREATE OR REPLACE FUNCTION get_building_team_id(building_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.buildings WHERE id = building_uuid;
$$;

COMMENT ON FUNCTION get_building_team_id IS
  'Get building team_id - SECURITY DEFINER bypasses RLS to prevent recursion';

-- Fix get_lot_team_id to bypass RLS
CREATE OR REPLACE FUNCTION get_lot_team_id(lot_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.team_id
     FROM public.lots l
     INNER JOIN public.buildings b ON l.building_id = b.id
     WHERE l.id = lot_uuid),
    (SELECT team_id FROM public.lots WHERE id = lot_uuid)
  );
$$;

COMMENT ON FUNCTION get_lot_team_id IS
  'Get lot team_id - SECURITY DEFINER bypasses RLS to prevent recursion';

-- ============================================================================
-- Step 3: Create non-recursive SELECT policies for BUILDINGS
-- ============================================================================

-- Policy 1: Admin - Full access
CREATE POLICY buildings_select_admin ON buildings
  FOR SELECT
  TO authenticated
  USING (is_admin());

COMMENT ON POLICY buildings_select_admin ON buildings IS
  'Admins can view all buildings without restriction';

-- Policy 2: Gestionnaire - Team buildings (non-recursive)
CREATE POLICY buildings_select_gestionnaire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has gestionnaire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
    )
    AND
    -- Direct team membership check (no function call)
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.team_id = buildings.team_id
        AND tm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.role IN ('gestionnaire', 'admin')
        AND tm.left_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_gestionnaire ON buildings IS
  'Gestionnaires can view buildings from their team (non-recursive)';

-- Policy 3: Locataire - Parent buildings of their lots
CREATE POLICY buildings_select_locataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has locataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
    AND
    -- Building is parent of a lot they're linked to
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

-- Policy 4: Prestataire - Buildings with assigned interventions
CREATE POLICY buildings_select_prestataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
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
-- Step 4: Create non-recursive SELECT policies for LOTS
-- ============================================================================

-- Policy 1: Admin - Full access
CREATE POLICY lots_select_admin ON lots
  FOR SELECT
  TO authenticated
  USING (is_admin());

COMMENT ON POLICY lots_select_admin ON lots IS
  'Admins can view all lots without restriction';

-- Policy 2: Gestionnaire - Team lots (non-recursive via direct join)
CREATE POLICY lots_select_gestionnaire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has gestionnaire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
    )
    AND
    -- Direct join to buildings and team_members (no function call)
    EXISTS (
      SELECT 1
      FROM buildings b
      INNER JOIN team_members tm ON tm.team_id = b.team_id
      WHERE b.id = lots.building_id
        AND tm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.role IN ('gestionnaire', 'admin')
        AND tm.left_at IS NULL
        AND b.deleted_at IS NULL
    )
  );

COMMENT ON POLICY lots_select_gestionnaire ON lots IS
  'Gestionnaires can view lots from their team buildings (non-recursive)';

-- Policy 3: Locataire - Only their lots
CREATE POLICY lots_select_locataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has locataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
    AND
    -- Lot is linked to this user via lot_contacts
    EXISTS (
      SELECT 1
      FROM lot_contacts lc
      WHERE lc.lot_id = lots.id
        AND lc.user_id = auth.uid()
    )
  );

COMMENT ON POLICY lots_select_locataire ON lots IS
  'Locataires can only view lots they are linked to via lot_contacts';

-- Policy 4: Prestataire - Lots with assigned interventions
CREATE POLICY lots_select_prestataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
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
-- Fixed infinite recursion by:
-- 1. Dropping all old SELECT policies (including recursive ones)
-- 2. Updated helper functions with SECURITY DEFINER + SET search_path
-- 3. Created non-recursive policies using direct JOINs instead of function calls
-- 4. Each role has explicit, granular access:
--    - Admin: Full access
--    - Gestionnaire: Team-scoped via direct JOIN
--    - Locataire: Personal lots + parent buildings
--    - Prestataire: Intervention-scoped via helper functions
-- ============================================================================
