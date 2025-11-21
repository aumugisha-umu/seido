-- ============================================================================
-- Fix RLS Infinite Recursion for Buildings Table
-- ============================================================================
-- Description: Fix infinite recursion in buildings RLS policy by:
--              1. Updating helper functions to properly bypass RLS with SET search_path
--              2. Rewriting prestataire policies to use direct JOINs instead of function calls
--
-- Root Cause: buildings_select_prestataire calls is_provider_assigned_to_building(id)
--            which queries interventions table. When PostgREST queries interventions
--            with nested buildings, this creates a circular dependency loop.
--
-- Solution: Replace function calls in policies with direct JOIN queries that
--          don't trigger recursive policy evaluation.
-- ============================================================================

-- ============================================================================
-- Step 1: Update helper functions to properly bypass RLS
-- ============================================================================

-- Fix is_provider_assigned_to_building to bypass RLS properly
CREATE OR REPLACE FUNCTION is_provider_assigned_to_building(building_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    JOIN public.interventions i ON ia.intervention_id = i.id
    WHERE i.building_id = $1
      AND ia.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND ia.role = 'prestataire'
      AND i.deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION is_provider_assigned_to_building IS
  'Check if current user is a provider assigned to any intervention in the given building - SECURITY DEFINER bypasses RLS to prevent recursion';

-- Fix is_provider_assigned_to_lot to bypass RLS properly
CREATE OR REPLACE FUNCTION is_provider_assigned_to_lot(lot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    JOIN public.interventions i ON ia.intervention_id = i.id
    WHERE i.lot_id = $1
      AND ia.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND ia.role = 'prestataire'
      AND i.deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION is_provider_assigned_to_lot IS
  'Check if current user is a provider assigned to any intervention in the given lot - SECURITY DEFINER bypasses RLS to prevent recursion';

-- ============================================================================
-- Step 2: Rewrite buildings_select_prestataire policy with direct JOINs
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS buildings_select_prestataire ON buildings;

-- Recreate with direct JOINs (non-recursive)
CREATE POLICY buildings_select_prestataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
    )
    AND
    -- Building has interventions assigned to this provider (direct JOIN, no function call)
    EXISTS (
      SELECT 1
      FROM public.intervention_assignments ia
      JOIN public.interventions i ON ia.intervention_id = i.id
      WHERE i.building_id = buildings.id
        AND ia.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
    )
  );

COMMENT ON POLICY buildings_select_prestataire ON buildings IS
  'Prestataires can only view buildings with interventions assigned to them (non-recursive via direct JOIN)';

-- ============================================================================
-- Step 3: Rewrite lots_select_prestataire policy with direct JOINs
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS lots_select_prestataire ON lots;

-- Recreate with direct JOINs (non-recursive)
CREATE POLICY lots_select_prestataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    -- User has prestataire role
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'prestataire'
    )
    AND
    -- Lot has interventions assigned to this provider (direct JOIN, no function call)
    EXISTS (
      SELECT 1
      FROM public.intervention_assignments ia
      JOIN public.interventions i ON ia.intervention_id = i.id
      WHERE i.lot_id = lots.id
        AND ia.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
    )
  );

COMMENT ON POLICY lots_select_prestataire ON lots IS
  'Prestataires can only view lots with interventions assigned to them (non-recursive via direct JOIN)';

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed infinite recursion by:
-- 1. Updated helper functions with SET search_path = public for proper RLS bypass
-- 2. Rewrote buildings_select_prestataire to use direct JOINs instead of function call
-- 3. Rewrote lots_select_prestataire to use direct JOINs instead of function call
-- 4. All policies now avoid circular dependencies by using inline queries
-- ============================================================================

