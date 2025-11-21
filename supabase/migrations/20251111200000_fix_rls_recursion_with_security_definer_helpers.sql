-- ============================================================================
-- Fix RLS Infinite Recursion with SECURITY DEFINER Helper Functions
-- ============================================================================
-- Description: Completely eliminate RLS recursion by using SECURITY DEFINER
--              helper functions that bypass RLS and return accessible IDs,
--              then use ultra-simple policies with no cross-table queries.
--
-- Root Cause: Previous policies created circular dependencies:
--   interventions → lots → buildings → interventions (INFINITE LOOP)
--
-- Solution: SECURITY DEFINER functions do all complex logic (bypass RLS),
--          policies only check: id IN (SELECT helper_function())
--
-- Based on official Supabase RLS best practices and existing codebase patterns
-- ============================================================================

-- ============================================================================
-- Step 1: DROP ALL existing SELECT policies
-- ============================================================================

-- Drop interventions policies
DROP POLICY IF EXISTS interventions_select ON interventions;
DROP POLICY IF EXISTS interventions_select_admin ON interventions;
DROP POLICY IF EXISTS interventions_select_gestionnaire ON interventions;
DROP POLICY IF EXISTS interventions_select_locataire ON interventions;
DROP POLICY IF EXISTS interventions_select_prestataire ON interventions;

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

-- ============================================================================
-- Step 2: Create SECURITY DEFINER helper function for INTERVENTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_intervention_ids()
RETURNS TABLE(intervention_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user ID and role (bypasses RLS on users table)
  SELECT u.id, u.role::text
  INTO current_user_id, current_user_role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL;

  -- If user not found, return empty set
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Admin: all interventions
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT i.id
    FROM public.interventions i
    WHERE i.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Gestionnaire: interventions from their team (via building team_id)
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.buildings b ON l.building_id = b.id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Prestataire: interventions assigned to them
  IF current_user_role = 'prestataire' THEN
    RETURN QUERY
    SELECT DISTINCT ia.intervention_id
    FROM public.intervention_assignments ia
    WHERE ia.user_id = current_user_id
      AND ia.role = 'prestataire';
    RETURN;
  END IF;

  -- Locataire: interventions for their lots
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lot_contacts lc ON lc.lot_id = i.lot_id
    WHERE lc.user_id = current_user_id
      AND i.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user based on role - SECURITY DEFINER bypasses RLS to prevent recursion';

-- ============================================================================
-- Step 3: Create SECURITY DEFINER helper function for BUILDINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_building_ids()
RETURNS TABLE(building_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user ID and role (bypasses RLS on users table)
  SELECT u.id, u.role::text
  INTO current_user_id, current_user_role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL;

  -- If user not found, return empty set
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Admin: all buildings
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT b.id
    FROM public.buildings b
    WHERE b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Gestionnaire: buildings from their team
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    SELECT DISTINCT b.id
    FROM public.buildings b
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Prestataire: buildings with interventions assigned to them
  IF current_user_role = 'prestataire' THEN
    RETURN QUERY
    SELECT DISTINCT b.id
    FROM public.buildings b
    INNER JOIN public.lots l ON l.building_id = b.id
    INNER JOIN public.interventions i ON i.lot_id = l.id
    INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
    WHERE ia.user_id = current_user_id
      AND ia.role = 'prestataire'
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Locataire: buildings that contain their lots
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    SELECT DISTINCT b.id
    FROM public.buildings b
    INNER JOIN public.lots l ON l.building_id = b.id
    INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
    WHERE lc.user_id = current_user_id
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_building_ids IS
  'Returns building IDs accessible by current user based on role - SECURITY DEFINER bypasses RLS to prevent recursion';

-- ============================================================================
-- Step 4: Create SECURITY DEFINER helper function for LOTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_lot_ids()
RETURNS TABLE(lot_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user ID and role (bypasses RLS on users table)
  SELECT u.id, u.role::text
  INTO current_user_id, current_user_role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL;

  -- If user not found, return empty set
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Admin: all lots
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT l.id
    FROM public.lots l
    WHERE l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Gestionnaire: lots from their team (via building team_id)
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    SELECT DISTINCT l.id
    FROM public.lots l
    INNER JOIN public.buildings b ON l.building_id = b.id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Prestataire: lots with interventions assigned to them
  IF current_user_role = 'prestataire' THEN
    RETURN QUERY
    SELECT DISTINCT l.id
    FROM public.lots l
    INNER JOIN public.interventions i ON i.lot_id = l.id
    INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
    WHERE ia.user_id = current_user_id
      AND ia.role = 'prestataire'
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Locataire: their assigned lots
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    SELECT DISTINCT lc.lot_id
    FROM public.lot_contacts lc
    INNER JOIN public.lots l ON l.id = lc.lot_id
    WHERE lc.user_id = current_user_id
      AND l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_lot_ids IS
  'Returns lot IDs accessible by current user based on role - SECURITY DEFINER bypasses RLS to prevent recursion';

-- ============================================================================
-- Step 5: Create ULTRA-SIMPLE policies for INTERVENTIONS (no recursion!)
-- ============================================================================

CREATE POLICY interventions_select_all ON interventions
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_accessible_intervention_ids())
  );

COMMENT ON POLICY interventions_select_all ON interventions IS
  'All roles: access interventions via SECURITY DEFINER helper (no recursion)';

-- ============================================================================
-- Step 6: Create ULTRA-SIMPLE policies for BUILDINGS (no recursion!)
-- ============================================================================

CREATE POLICY buildings_select_all ON buildings
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_accessible_building_ids())
  );

COMMENT ON POLICY buildings_select_all ON buildings IS
  'All roles: access buildings via SECURITY DEFINER helper (no recursion)';

-- ============================================================================
-- Step 7: Create ULTRA-SIMPLE policies for LOTS (no recursion!)
-- ============================================================================

CREATE POLICY lots_select_all ON lots
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_accessible_lot_ids())
  );

COMMENT ON POLICY lots_select_all ON lots IS
  'All roles: access lots via SECURITY DEFINER helper (no recursion)';

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed infinite recursion by:
-- 1. Created 3 SECURITY DEFINER helper functions (bypass RLS entirely)
-- 2. Moved ALL complex logic (JOINs, role checks) into helper functions
-- 3. Created 3 ultra-simple policies: id IN (SELECT helper())
-- 4. NO cross-table queries in policies = NO recursion possible
--
-- How it works:
-- - PostgREST query: interventions?select=*,lot(building(*))
-- - Step 1: interventions policy calls get_accessible_intervention_ids() (no RLS)
-- - Step 2: lots policy calls get_accessible_lot_ids() (no RLS)
-- - Step 3: buildings policy calls get_accessible_building_ids() (no RLS)
-- - Result: NO RECURSION! Each function runs independently with RLS bypassed
--
-- Performance:
-- - STABLE functions = Postgres caches results per transaction
-- - Single query per table instead of per-row evaluation
-- - Proper indexes on foreign keys ensure fast joins
--
-- Security:
-- - Functions are SECURITY DEFINER but read-only
-- - All checks based on auth.uid() - cannot be spoofed
-- - Follows existing codebase patterns (get_user_id_from_auth, etc.)
-- ============================================================================
