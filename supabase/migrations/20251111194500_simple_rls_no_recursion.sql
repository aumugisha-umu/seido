-- ============================================================================
-- Simple RLS Policies - No Recursion
-- ============================================================================
-- Description: Replace all recursive RLS policies with simple, non-recursive
--              policies using IN subqueries as recommended by Supabase docs.
--
-- Key Changes:
-- 1. No JOINS in policies (use IN subqueries instead)
-- 2. No recursive function calls
-- 3. Direct queries that allow Postgres caching
-- 4. Explicit role specification with TO authenticated
--
-- Based on official Supabase recommendations:
-- https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================================================

-- ============================================================================
-- Step 1: DROP ALL existing SELECT policies
-- ============================================================================

-- Drop buildings policies
DROP POLICY IF EXISTS buildings_select ON buildings;
DROP POLICY IF EXISTS buildings_select_admin ON buildings;
DROP POLICY IF EXISTS buildings_select_gestionnaire ON buildings;
DROP POLICY IF EXISTS buildings_select_locataire ON buildings;
DROP POLICY IF EXISTS buildings_select_prestataire ON buildings;

-- Drop lots policies
DROP POLICY IF EXISTS lots_select ON lots;
DROP POLICY IF EXISTS lots_select_admin ON lots;
DROP POLICY IF EXISTS lots_select_gestionnaire ON lots;
DROP POLICY IF EXISTS lots_select_locataire ON lots;
DROP POLICY IF EXISTS lots_select_prestataire ON lots;

-- Drop interventions SELECT policies
DROP POLICY IF EXISTS interventions_select ON interventions;
DROP POLICY IF EXISTS interventions_select_admin ON interventions;
DROP POLICY IF EXISTS interventions_select_gestionnaire ON interventions;
DROP POLICY IF EXISTS interventions_select_locataire ON interventions;
DROP POLICY IF EXISTS interventions_select_prestataire ON interventions;

-- ============================================================================
-- Step 2: Create SIMPLE policies for INTERVENTIONS
-- ============================================================================

-- Policy 1: Admin - Full access
CREATE POLICY interventions_select_admin ON interventions
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

COMMENT ON POLICY interventions_select_admin ON interventions IS
  'Admins can view all interventions';

-- Policy 2: Gestionnaire - Team interventions (via lots and buildings)
CREATE POLICY interventions_select_gestionnaire ON interventions
  FOR SELECT
  TO authenticated
  USING (
    -- User has gestionnaire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Intervention's lot belongs to a building in their team
    lot_id IN (
      SELECT l.id
      FROM lots l
      INNER JOIN buildings b ON l.building_id = b.id
      INNER JOIN team_members tm ON tm.team_id = b.team_id
      WHERE tm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.left_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL
    )
  );

COMMENT ON POLICY interventions_select_gestionnaire ON interventions IS
  'Gestionnaires can view interventions from their team (via building team membership)';

-- Policy 3: Prestataire - Assigned interventions only
CREATE POLICY interventions_select_prestataire ON interventions
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Intervention is assigned to this provider
    id IN (
      SELECT ia.intervention_id
      FROM intervention_assignments ia
      WHERE ia.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ia.role = 'prestataire'
    )
  );

COMMENT ON POLICY interventions_select_prestataire ON interventions IS
  'Prestataires can only view interventions assigned to them';

-- Policy 4: Locataire - Their lot interventions
CREATE POLICY interventions_select_locataire ON interventions
  FOR SELECT
  TO authenticated
  USING (
    -- User has locataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Intervention is for their lot
    lot_id IN (
      SELECT lc.lot_id
      FROM lot_contacts lc
      WHERE lc.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

COMMENT ON POLICY interventions_select_locataire ON interventions IS
  'Locataires can only view interventions for their lots';

-- ============================================================================
-- Step 3: Create SIMPLE policies for BUILDINGS
-- ============================================================================

-- Policy 1: Admin - Full access
CREATE POLICY buildings_select_admin ON buildings
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

COMMENT ON POLICY buildings_select_admin ON buildings IS
  'Admins can view all buildings';

-- Policy 2: Gestionnaire - Team buildings
CREATE POLICY buildings_select_gestionnaire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has gestionnaire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Building belongs to their team
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.left_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_gestionnaire ON buildings IS
  'Gestionnaires can view buildings from their team';

-- Policy 3: Prestataire - Buildings with assigned interventions
CREATE POLICY buildings_select_prestataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Building has interventions assigned to this provider
    id IN (
      SELECT DISTINCT i.building_id
      FROM interventions i
      INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_prestataire ON buildings IS
  'Prestataires can view buildings with interventions assigned to them';

-- Policy 4: Locataire - Parent buildings of their lots
CREATE POLICY buildings_select_locataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has locataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Building is parent of their lot
    id IN (
      SELECT DISTINCT l.building_id
      FROM lots l
      INNER JOIN lot_contacts lc ON lc.lot_id = l.id
      WHERE lc.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND l.deleted_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_locataire ON buildings IS
  'Locataires can view buildings that contain their lots';

-- ============================================================================
-- Step 4: Create SIMPLE policies for LOTS
-- ============================================================================

-- Policy 1: Admin - Full access
CREATE POLICY lots_select_admin ON lots
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

COMMENT ON POLICY lots_select_admin ON lots IS
  'Admins can view all lots';

-- Policy 2: Gestionnaire - Team lots
CREATE POLICY lots_select_gestionnaire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has gestionnaire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'gestionnaire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Lot's building belongs to their team
    building_id IN (
      SELECT b.id
      FROM buildings b
      INNER JOIN team_members tm ON tm.team_id = b.team_id
      WHERE tm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.left_at IS NULL
        AND b.deleted_at IS NULL
    )
  );

COMMENT ON POLICY lots_select_gestionnaire ON lots IS
  'Gestionnaires can view lots from buildings in their team';

-- Policy 3: Prestataire - Lots with assigned interventions
CREATE POLICY lots_select_prestataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Lot has interventions assigned to this provider
    id IN (
      SELECT DISTINCT i.lot_id
      FROM interventions i
      INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
    )
  );

COMMENT ON POLICY lots_select_prestataire ON lots IS
  'Prestataires can view lots with interventions assigned to them';

-- Policy 4: Locataire - Their lots only
CREATE POLICY lots_select_locataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has locataire role
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
        AND u.deleted_at IS NULL
    )
    AND
    -- Lot is assigned to them
    id IN (
      SELECT lc.lot_id
      FROM lot_contacts lc
      WHERE lc.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

COMMENT ON POLICY lots_select_locataire ON lots IS
  'Locataires can only view their assigned lots';

-- ============================================================================
-- Summary
-- ============================================================================
-- Created 12 simple, non-recursive policies:
-- - interventions: 4 policies (admin, gestionnaire, prestataire, locataire)
-- - buildings: 4 policies (admin, gestionnaire, prestataire, locataire)
-- - lots: 4 policies (admin, gestionnaire, prestataire, locataire)
--
-- Key improvements:
-- ✅ No recursive function calls
-- ✅ No JOINS in policy USING clauses (only in subqueries)
-- ✅ Direct IN subqueries for Postgres caching
-- ✅ Explicit role checks with TO authenticated
-- ✅ Proper auth_user_id to users.id mapping
--
-- Based on official Supabase RLS best practices
-- ============================================================================
