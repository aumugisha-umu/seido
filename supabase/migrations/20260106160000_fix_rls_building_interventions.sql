-- ============================================================================
-- Migration: Fix RLS for Building-wide Interventions (lot_id IS NULL)
-- ============================================================================
-- Issue: Gestionnaires cannot see interventions created for a building
-- (where lot_id IS NULL, building_id IS NOT NULL) because both UNION
-- branches in get_accessible_intervention_ids() require lot_id to exist.
--
-- Root Cause: Both existing branches do INNER JOIN lots ON i.lot_id = l.id
-- which returns 0 rows when lot_id IS NULL (building-wide intervention).
--
-- Solution: Add a 3rd UNION branch that joins directly on buildings
-- when lot_id IS NULL.
--
-- Also fixed: Locataires assigned to building-wide interventions can now
-- see them via intervention_assignments.
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

  -- Gestionnaire: 3 cases for team-based access
  IF current_user_role = 'gestionnaire' THEN
    RETURN QUERY
    -- Branche 1: Interventions sur lots attachés à des immeubles
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
    -- Branche 2: Interventions sur lots standalone (building_id IS NULL)
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.team_members tm ON tm.team_id = l.team_id
    WHERE l.building_id IS NULL
      AND tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL
    UNION
    -- Branche 3: Interventions sur IMMEUBLE ENTIER (lot_id IS NULL)
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.buildings b ON i.building_id = b.id
    INNER JOIN public.team_members tm ON tm.team_id = b.team_id
    WHERE i.lot_id IS NULL
      AND tm.user_id = current_user_id
      AND tm.left_at IS NULL
      AND i.deleted_at IS NULL
      AND b.deleted_at IS NULL;
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

  -- Locataire: interventions on their lots OR assigned to them directly
  IF current_user_role = 'locataire' THEN
    RETURN QUERY
    -- Interventions on lots where they are a contact
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.lots l ON i.lot_id = l.id
    INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
    WHERE lc.user_id = current_user_id
      AND i.deleted_at IS NULL
      AND l.deleted_at IS NULL
    UNION
    -- Interventions they are directly assigned to (e.g., building-wide)
    SELECT DISTINCT i.id
    FROM public.interventions i
    INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
    WHERE ia.user_id = current_user_id
      AND ia.role = 'locataire'
      AND i.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Default: no access
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user - FIXED to include building-wide interventions (lot_id IS NULL) and locataires assigned via intervention_assignments';

-- ============================================================================
-- Summary
-- ============================================================================
-- Changes from previous version (20251225000001_fix_rls_standalone_lots.sql):
--
-- 1. Gestionnaire: Added 3rd UNION branch for building-wide interventions
--    WHERE i.lot_id IS NULL (joins directly via buildings.team_id)
--
-- 2. Locataire: Added 2nd UNION branch to include interventions where
--    they are directly assigned via intervention_assignments (needed for
--    building-wide interventions where they don't have lot_contacts)
--
-- This enables:
-- - Creating interventions for entire buildings
-- - Automatic tenant assignment from all lots in the building
-- - Proper visibility for all participants immediately after creation
-- ============================================================================
