-- ============================================================================
-- Migration: Fix RLS — Gestionnaire branch uses users.team_id instead of team_members
-- Date: 2026-02-25
-- ============================================================================
-- ROOT CAUSE:
--   get_accessible_intervention_ids() and get_accessible_lot_ids() both use
--   user_record.team_id (from users table) to filter gestionnaire access.
--   But users.team_id is set ONCE at signup/invitation and may become stale:
--     - Admin of a team created via invitation may have users.team_id pointing
--       to their original team, not the team they administer
--     - users.role = 'gestionnaire' even when team_members.role = 'admin'
--     - INSERT policy uses is_team_manager() which checks team_members → succeeds
--     - SELECT policy uses users.team_id → fails (mismatch)
--
-- FIX:
--   Replace users.team_id with team_members lookup in gestionnaire branch.
--   Use interventions.team_id (denormalized) instead of joining building chain.
--   This aligns SELECT with INSERT policy (both use team_members as source of truth).
--
-- ALSO FIX: get_accessible_lot_ids() and get_accessible_building_ids() have the same issue.
-- ============================================================================

-- ============================================================================
-- Step 1: Fix get_accessible_intervention_ids()
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
    SELECT u.id, u.role::text AS role
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

    -- Gestionnaire: interventions in teams where user is an active member
    -- Uses team_members (source of truth) instead of users.team_id (stale)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.team_members tm
        ON tm.team_id = i.team_id
      WHERE tm.user_id = user_record.id
        AND tm.left_at IS NULL
        AND i.deleted_at IS NULL;
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
   SECURITY DEFINER bypasses RLS.
   Gestionnaire: uses team_members + interventions.team_id (denormalized) for reliable access.';

-- ============================================================================
-- Step 2: Fix get_accessible_lot_ids() — same pattern
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
    SELECT u.id, u.role::text AS role
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

    -- Gestionnaire: lots in teams where user is an active member
    -- Uses team_members (source of truth) instead of users.team_id
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      -- Building-linked lots (via building.team_id)
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.buildings b ON l.building_id = b.id
      INNER JOIN public.team_members tm ON tm.team_id = b.team_id
      WHERE tm.user_id = user_record.id
        AND tm.left_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL
      UNION
      -- Standalone lots (building_id IS NULL) — use lot.team_id
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.team_members tm ON tm.team_id = l.team_id
      WHERE l.building_id IS NULL
        AND tm.user_id = user_record.id
        AND tm.left_at IS NULL
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
   SECURITY DEFINER bypasses RLS.
   Gestionnaire: uses team_members (source of truth) for reliable multi-team access.';

-- ============================================================================
-- Step 3: Fix get_accessible_building_ids() — same pattern
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_building_ids()
RETURNS TABLE(building_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT u.id, u.role::text AS role
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: all buildings
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      WHERE b.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: buildings in teams where user is an active member
    -- Uses team_members (source of truth) instead of users.team_id
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.team_members tm ON tm.team_id = b.team_id
      WHERE tm.user_id = user_record.id
        AND tm.left_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Prestataire: buildings with assigned interventions
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT l.building_id
      FROM public.lots l
      INNER JOIN public.interventions i ON i.lot_id = l.id
      INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire'
        AND l.building_id IS NOT NULL
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL;
    END IF;

    -- Locataire: buildings via lot_contacts + contracts
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT l.building_id
      FROM public.lot_contacts lc
      INNER JOIN public.lots l ON l.id = lc.lot_id
      WHERE lc.user_id = user_record.id
        AND l.building_id IS NOT NULL
        AND l.deleted_at IS NULL;
      -- Also via contracts
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.lots l ON l.building_id = b.id
      INNER JOIN public.contracts c ON c.lot_id = l.id
      INNER JOIN public.contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = user_record.id
        AND cc.role IN ('locataire', 'colocataire')
        AND c.status IN ('actif', 'a_venir')
        AND c.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Proprietaire: buildings via building_contacts
    IF user_record.role = 'proprietaire' THEN
      RETURN QUERY
      SELECT DISTINCT bc.building_id
      FROM public.building_contacts bc
      WHERE bc.user_id = user_record.id;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_building_ids IS
  'Returns building IDs accessible by current user based on ALL their profiles/roles.
   SECURITY DEFINER bypasses RLS.
   Gestionnaire: uses team_members (source of truth) for reliable multi-team access.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Fix RLS: Gestionnaire team_id mismatch — Applied Successfully';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ROOT CAUSE: users.team_id (set once at signup) did not match building.team_id';
  RAISE NOTICE '            for users who joined teams via invitation or admin assignment.';
  RAISE NOTICE '';
  RAISE NOTICE 'FIX: Gestionnaire branch now uses team_members (same as is_team_manager)';
  RAISE NOTICE '     get_accessible_intervention_ids(): uses interventions.team_id + team_members';
  RAISE NOTICE '     get_accessible_lot_ids(): uses building.team_id/lot.team_id + team_members';
  RAISE NOTICE '     get_accessible_building_ids(): uses building.team_id + team_members';
  RAISE NOTICE '';
  RAISE NOTICE 'All other branches (admin, prestataire, locataire, proprietaire) unchanged.';
  RAISE NOTICE '============================================================================';
END $$;
