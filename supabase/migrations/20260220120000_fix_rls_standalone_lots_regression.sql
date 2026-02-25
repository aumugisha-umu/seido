-- ============================================================================
-- Migration: Fix RLS Regression — Standalone Lots Invisible to Gestionnaires
-- Date: 2026-02-20
-- ============================================================================
-- Root cause: Migration 20260211170000_fix_multiple_permissive_policies.sql
-- rewrote get_accessible_lot_ids() and get_accessible_intervention_ids()
-- to add proprietaire support, but LOST the UNION for standalone lots that
-- was introduced in 20251225000001_fix_rls_standalone_lots.sql.
--
-- The gestionnaire branch used:
--   INNER JOIN buildings b ON l.building_id = b.id
-- which excludes all lots where building_id IS NULL (standalone lots).
--
-- Fix: Re-add the UNION for standalone lots in both functions.
-- All other branches (admin, prestataire, locataire, proprietaire) unchanged.
-- ============================================================================

-- ============================================================================
-- Step 1: Fix get_accessible_lot_ids() — gestionnaire branch
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_lot_ids()
RETURNS TABLE(lot_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: all lots
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      WHERE l.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: lots in their team (via building OR standalone)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      -- Building-linked lots (via building.team_id)
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL
      UNION
      -- Standalone lots (building_id IS NULL) — use lot.team_id directly
      SELECT DISTINCT l.id
      FROM public.lots l
      WHERE l.building_id IS NULL
        AND l.team_id = user_record.team_id
        AND l.deleted_at IS NULL;
    END IF;

    -- Prestataire: lots with assigned interventions
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.interventions i ON i.lot_id = l.id
      INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL;
    END IF;

    -- Locataire: lots via lot_contacts + contracts
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT lc.lot_id
      FROM public.lot_contacts lc
      INNER JOIN public.lots l ON l.id = lc.lot_id
      WHERE lc.user_id = user_record.id
        AND l.deleted_at IS NULL;
      -- Also via contracts
      RETURN QUERY
      SELECT DISTINCT c.lot_id
      FROM public.contracts c
      INNER JOIN public.contract_contacts cc ON cc.contract_id = c.id
      INNER JOIN public.lots l ON l.id = c.lot_id
      WHERE cc.user_id = user_record.id
        AND cc.role IN ('locataire', 'colocataire')
        AND c.status IN ('actif', 'a_venir')
        AND c.deleted_at IS NULL
        AND l.deleted_at IS NULL;
    END IF;

    -- Proprietaire: lots via lot_contacts + building_contacts fallthrough
    IF user_record.role = 'proprietaire' THEN
      -- Direct lot contact
      RETURN QUERY
      SELECT DISTINCT lc.lot_id
      FROM public.lot_contacts lc
      INNER JOIN public.lots l ON l.id = lc.lot_id
      WHERE lc.user_id = user_record.id
        AND l.deleted_at IS NULL;
      -- Building contact → all lots in that building
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.building_contacts bc ON bc.building_id = l.building_id
      WHERE bc.user_id = user_record.id
        AND l.deleted_at IS NULL;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_lot_ids IS
  'Returns lot IDs accessible by current user based on ALL their profiles/roles.
   SECURITY DEFINER bypasses RLS. Supports: admin, gestionnaire (incl. standalone lots), prestataire, locataire, proprietaire.';

-- ============================================================================
-- Step 2: Fix get_accessible_intervention_ids() — gestionnaire branch
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_intervention_ids()
RETURNS TABLE(intervention_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: all interventions
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      WHERE i.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: interventions in their team (via building OR standalone lots)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      -- Interventions on building-linked lots
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lots l ON i.lot_id = l.id
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL
      UNION
      -- Interventions on standalone lots (building_id IS NULL)
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lots l ON i.lot_id = l.id
      WHERE l.building_id IS NULL
        AND l.team_id = user_record.team_id
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL;
    END IF;

    -- Prestataire: assigned interventions
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT ia.intervention_id
      FROM public.intervention_assignments ia
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire';
    END IF;

    -- Locataire: interventions via lot_contacts + contracts
    IF user_record.role = 'locataire' THEN
      -- Via lot_contacts (legacy)
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lot_contacts lc ON lc.lot_id = i.lot_id
      WHERE lc.user_id = user_record.id
        AND i.deleted_at IS NULL;
      -- Via contracts (current)
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.contracts c ON c.lot_id = i.lot_id
      INNER JOIN public.contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = user_record.id
        AND cc.role IN ('locataire', 'colocataire')
        AND c.status IN ('actif', 'a_venir')
        AND c.deleted_at IS NULL
        AND i.deleted_at IS NULL;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user based on ALL their profiles/roles.
   SECURITY DEFINER bypasses RLS. Gestionnaire access includes interventions on standalone lots.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Fix RLS Standalone Lots Regression — Applied Successfully';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'get_accessible_lot_ids(): gestionnaire branch now includes UNION for standalone lots';
  RAISE NOTICE 'get_accessible_intervention_ids(): gestionnaire branch now includes UNION for standalone lots';
  RAISE NOTICE '';
  RAISE NOTICE 'All other branches (admin, prestataire, locataire, proprietaire) unchanged.';
  RAISE NOTICE '============================================================================';
END $$;
