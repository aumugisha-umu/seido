-- ============================================================================
-- Fix RLS Recursion in Helper Functions and Policies
-- ============================================================================
-- Description: The granular RLS policies introduced circular dependencies
--              causing 500 errors. This migration fixes the recursion by:
--              1. Rewriting helper functions to bypass RLS
--              2. Simplifying policies to avoid circular function calls
--
-- Root Cause: lots_select_gestionnaire calls get_building_team_id() which
--            queries buildings table, triggering buildings_select_gestionnaire,
--            creating potential infinite recursion.
-- ============================================================================

-- ============================================================================
-- APPROACH 1: Fix Helper Functions to Bypass RLS (Recommended)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fix: get_building_team_id - Direct query without RLS check
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_building_team_id(building_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Direct query that won't trigger RLS because of SECURITY DEFINER
  -- and the function owner should be a superuser/service role
  SELECT team_id FROM public.buildings WHERE id = building_uuid;
$$;

COMMENT ON FUNCTION get_building_team_id IS 'Get building team_id - SECURITY DEFINER prevents RLS recursion';

-- ----------------------------------------------------------------------------
-- Fix: get_lot_team_id - Direct query without RLS check
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION get_lot_team_id IS 'Get lot team_id - SECURITY DEFINER prevents RLS recursion';

-- ============================================================================
-- APPROACH 2: Simplify Policies to Avoid Recursive Function Calls
-- ============================================================================
-- Replace the problematic lots_select_gestionnaire policy with a version
-- that doesn't call functions that query other RLS-protected tables

DROP POLICY IF EXISTS lots_select_gestionnaire ON lots;

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
    AND
    -- Direct join to check team membership without helper functions
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
  'Gestionnaires can view lots from their team buildings (non-recursive version)';

-- ============================================================================
-- APPROACH 3: Create Non-Recursive Helper Functions
-- ============================================================================
-- These functions are specifically designed for use in RLS policies
-- They avoid querying tables that have RLS enabled

-- ----------------------------------------------------------------------------
-- Non-recursive function to check if user is gestionnaire of a building's team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_gestionnaire_of_building_team(building_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Single query that joins all needed tables at once
  -- Avoids separate queries that could trigger RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.buildings b
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    INNER JOIN public.users u ON tm.user_id = u.id
    WHERE b.id = building_uuid
      AND u.auth_user_id = auth.uid()
      AND tm.role IN ('gestionnaire', 'admin')
      AND tm.left_at IS NULL
      AND b.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION is_gestionnaire_of_building_team IS
  'Check if current user is gestionnaire of a building team (non-recursive)';

-- ----------------------------------------------------------------------------
-- Non-recursive function to check if user is gestionnaire of a lot's team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_gestionnaire_of_lot_team(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Single query that joins all needed tables at once
  SELECT EXISTS (
    SELECT 1
    FROM public.lots l
    INNER JOIN public.buildings b ON b.id = l.building_id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    INNER JOIN public.users u ON tm.user_id = u.id
    WHERE l.id = lot_uuid
      AND u.auth_user_id = auth.uid()
      AND tm.role IN ('gestionnaire', 'admin')
      AND tm.left_at IS NULL
      AND b.deleted_at IS NULL
      AND l.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION is_gestionnaire_of_lot_team IS
  'Check if current user is gestionnaire of a lot team (non-recursive)';

-- ============================================================================
-- Optional: Update Other Policies to Use Non-Recursive Functions
-- ============================================================================
-- If other policies also use these helper functions, update them too

-- Update buildings_select_gestionnaire to be more explicit
DROP POLICY IF EXISTS buildings_select_gestionnaire ON buildings;

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
    AND
    -- Direct check for team membership
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

-- ============================================================================
-- Verification Query (Run after migration to test)
-- ============================================================================
-- This should return data without 500 errors:
/*
SELECT
  i.*,
  l.id as lot_id,
  l.reference as lot_ref,
  b.id as building_id,
  b.name as building_name
FROM interventions i
LEFT JOIN lots l ON i.lot_id = l.id
LEFT JOIN buildings b ON l.building_id = b.id
LIMIT 1;
*/

-- ============================================================================
-- Summary of Changes
-- ============================================================================
-- 1. Modified get_building_team_id() and get_lot_team_id() to use explicit schema
-- 2. Rewrote lots_select_gestionnaire to avoid recursive function calls
-- 3. Created non-recursive helper functions for RLS policies
-- 4. Simplified buildings_select_gestionnaire for clarity
--
-- These changes eliminate the circular dependency that was causing 500 errors
-- when prestataires tried to query interventions with nested lot/building data.
-- ============================================================================