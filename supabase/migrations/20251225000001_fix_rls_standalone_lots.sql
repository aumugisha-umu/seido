-- ============================================================================
-- Migration: Fix RLS for Standalone/Independent Lots
-- ============================================================================
-- Issue: Gestionnaires cannot see standalone lots (where building_id IS NULL)
-- because get_accessible_lot_ids() only joins via buildings table.
--
-- Root Cause: INNER JOIN buildings ON l.building_id = b.id excludes lots
-- where building_id IS NULL.
--
-- Solution: Add UNION to also return standalone lots where team_id matches
-- the gestionnaire's team memberships.
--
-- Impact: This also affects get_accessible_intervention_ids() which joins
-- lots to buildings - we need to fix that too.
-- ============================================================================

-- ============================================================================
-- Step 1: Fix get_accessible_lot_ids() for standalone lots
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

  -- Gestionnaire: lots from their team
  -- Includes BOTH:
  -- 1. Lots attached to buildings in their team (via building.team_id)
  -- 2. Standalone lots directly assigned to their team (via lot.team_id)
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    -- Lots attached to buildings
    SELECT DISTINCT l.id
    FROM public.lots l
    INNER JOIN public.buildings b ON l.building_id = b.id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL
    UNION
    -- Standalone lots (building_id IS NULL) - use lot.team_id directly
    SELECT l.id
    FROM public.lots l
    INNER JOIN public.team_members tm ON tm.team_id = l.team_id
    WHERE l.building_id IS NULL
      AND tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND l.deleted_at IS NULL;
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

  -- Locataire: lots they are assigned to via lot_contacts
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    SELECT DISTINCT l.id
    FROM public.lots l
    INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
    WHERE lc.user_id = current_user_id
      AND l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_lot_ids IS
  'Returns lot IDs accessible by current user based on role - FIXED to include standalone lots for gestionnaires';

-- ============================================================================
-- Step 2: Fix get_accessible_intervention_ids() for interventions on standalone lots
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

  -- Gestionnaire: interventions from their team
  -- Includes interventions on BOTH building-attached and standalone lots
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    -- Interventions on lots attached to buildings
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.buildings b ON l.building_id = b.id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL
      AND b.deleted_at IS NULL
    UNION
    -- Interventions on standalone lots (building_id IS NULL)
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.team_members tm ON tm.team_id = l.team_id
    WHERE l.building_id IS NULL
      AND tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Prestataire: interventions assigned to them
  IF current_user_role = 'prestataire' THEN
    RETURN QUERY
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
    WHERE ia.user_id = current_user_id
      AND ia.role = 'prestataire'
      AND i.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Locataire: interventions on their lots
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
    WHERE lc.user_id = current_user_id
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user - FIXED to include interventions on standalone lots for gestionnaires';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration fixes a critical issue where standalone/independent lots
-- (lots with building_id IS NULL) were not visible to gestionnaires.
--
-- Changes:
-- 1. get_accessible_lot_ids(): Added UNION to include standalone lots
--    where lot.team_id matches the user's team memberships
--
-- 2. get_accessible_intervention_ids(): Added UNION to include interventions
--    on standalone lots
--
-- Impact:
-- - Gestionnaires can now see and manage standalone lots (maisons, garages, etc.)
-- - Imports with independent lots will now work correctly
-- - Interventions on standalone lots are now accessible
-- ============================================================================
