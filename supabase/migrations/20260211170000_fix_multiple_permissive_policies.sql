-- ============================================================================
-- Migration: Fix multiple_permissive_policies Linter Warnings
-- Date: 2026-02-11
-- ============================================================================
-- Context: After security fixes migration (20260211160000), the Supabase linter
-- reports ~53 multiple_permissive_policies warnings across 13 tables.
-- These occur when multiple PERMISSIVE policies exist for the same
-- (table, role, action) — PostgreSQL must evaluate ALL of them per query.
--
-- Root cause: Policy evolution over time left redundant/overlapping policies.
-- Old granular policies weren't dropped when unified replacements were added.
--
-- Groups:
--   A: Drop redundant SELECT policies (buildings, lots, interventions)
--   B: Replace FOR ALL with individual action policies (intervention_type_*)
--   C: Merge overlapping UPDATE policies (soft-delete pattern)
--   D: Merge other overlapping policies (quotes, emails, users, interventions INSERT)
-- ============================================================================

-- ============================================================================
-- GROUP A: Drop Redundant SELECT Policies
-- ============================================================================
-- The get_accessible_*_ids() helper functions already handle ALL roles
-- (admin, gestionnaire, prestataire, locataire). Role-specific SELECT policies
-- are therefore redundant and cause multiple_permissive_policies warnings.
--
-- We also add proprietaire support to the helper functions so that
-- proprietaire_*_select policies can be safely dropped too.
-- ============================================================================

-- -------------------------------------------------------
-- A.1: Update get_accessible_building_ids() — add proprietaire branch
-- -------------------------------------------------------

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
    SELECT u.id, u.role::text AS role, u.team_id
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

    -- Gestionnaire: buildings in their team
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      WHERE b.team_id = user_record.team_id
        AND b.deleted_at IS NULL;
    END IF;

    -- Prestataire: buildings with assigned interventions
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.lots l ON l.building_id = b.id
      INNER JOIN public.interventions i ON i.lot_id = l.id
      INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Locataire: buildings containing their lots (via lot_contacts + contracts)
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.lots l ON l.building_id = b.id
      INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
      WHERE lc.user_id = user_record.id
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
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
   SECURITY DEFINER bypasses RLS. Supports: admin, gestionnaire, prestataire, locataire, proprietaire.';

-- -------------------------------------------------------
-- A.2: Update get_accessible_lot_ids() — add proprietaire branch
-- -------------------------------------------------------

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

    -- Gestionnaire: lots in their team (via building team_id)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
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
   SECURITY DEFINER bypasses RLS. Supports: admin, gestionnaire, prestataire, locataire, proprietaire.';

-- -------------------------------------------------------
-- A.2b: Update get_accessible_intervention_ids() — add contract-based locataire access
-- -------------------------------------------------------
-- The locataire branch previously only checked lot_contacts.
-- The now-dropped interventions_select_locataire policy added contract-based access.
-- We must include that logic in the helper to avoid losing access.

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

    -- Gestionnaire: interventions in their team
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lots l ON i.lot_id = l.id
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
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
   SECURITY DEFINER bypasses RLS. Locataire access via lot_contacts + contracts.';

-- -------------------------------------------------------
-- A.3: Drop redundant SELECT policies on buildings
-- -------------------------------------------------------
-- buildings_select_all (via get_accessible_building_ids) covers all roles now.
-- These are all FOR SELECT on buildings, causing multiple_permissive_policies:

DROP POLICY IF EXISTS "buildings_select_locataire" ON buildings;
DROP POLICY IF EXISTS "buildings_select_via_lot_contacts" ON buildings;
DROP POLICY IF EXISTS "proprietaire_buildings_select" ON buildings;

-- -------------------------------------------------------
-- A.4: Drop redundant SELECT policies on lots
-- -------------------------------------------------------

DROP POLICY IF EXISTS "lots_select_locataire" ON lots;
DROP POLICY IF EXISTS "lots_select_via_lot_contacts" ON lots;
DROP POLICY IF EXISTS "proprietaire_lots_select" ON lots;

-- -------------------------------------------------------
-- A.5: Drop redundant SELECT policies on interventions
-- -------------------------------------------------------
-- interventions_select_all (via get_accessible_intervention_ids) covers locataire.

DROP POLICY IF EXISTS "interventions_select_locataire" ON interventions;


-- ============================================================================
-- GROUP B: Replace FOR ALL with Individual Action Policies
-- ============================================================================
-- FOR ALL policies overlap with EVERY action-specific policy for the same role.
-- Replace with individual INSERT/UPDATE/DELETE policies.
-- ============================================================================

-- -------------------------------------------------------
-- B.1: intervention_type_categories
-- -------------------------------------------------------

DROP POLICY IF EXISTS "intervention_type_categories_admin_all" ON intervention_type_categories;

CREATE POLICY "intervention_type_categories_admin_insert" ON intervention_type_categories
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "intervention_type_categories_admin_update" ON intervention_type_categories
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "intervention_type_categories_admin_delete" ON intervention_type_categories
  FOR DELETE TO authenticated
  USING (is_admin());

-- -------------------------------------------------------
-- B.2: intervention_types
-- -------------------------------------------------------

DROP POLICY IF EXISTS "intervention_types_admin_all" ON intervention_types;

CREATE POLICY "intervention_types_admin_insert" ON intervention_types
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "intervention_types_admin_update" ON intervention_types
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "intervention_types_admin_delete" ON intervention_types
  FOR DELETE TO authenticated
  USING (is_admin());

-- -------------------------------------------------------
-- B.3: intervention_type_legacy_mapping
-- -------------------------------------------------------

DROP POLICY IF EXISTS "intervention_type_legacy_mapping_admin_all" ON intervention_type_legacy_mapping;

CREATE POLICY "intervention_type_legacy_mapping_admin_insert" ON intervention_type_legacy_mapping
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "intervention_type_legacy_mapping_admin_update" ON intervention_type_legacy_mapping
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "intervention_type_legacy_mapping_admin_delete" ON intervention_type_legacy_mapping
  FOR DELETE TO authenticated
  USING (is_admin());

-- -------------------------------------------------------
-- B.4: import_jobs — drop FOR ALL, merge admin into specific policies
-- -------------------------------------------------------
-- import_jobs_admin_full_access (FOR ALL) overlaps with all 4 specific policies.
-- Admin is already a team member, so import_jobs_select_team_member covers SELECT.
-- Admin can already insert (is_admin() in import_jobs_insert_gestionnaire).
-- For UPDATE/DELETE, we add admin team check.

DROP POLICY IF EXISTS "import_jobs_admin_full_access" ON import_jobs;

-- Recreate UPDATE policy with admin support
DROP POLICY IF EXISTS "import_jobs_update_own" ON import_jobs;
CREATE POLICY "import_jobs_update_own" ON import_jobs
  FOR UPDATE TO authenticated
  USING (
    user_id = get_current_user_id()
    OR (
      is_admin()
      AND team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = get_current_user_id()
          AND tm.left_at IS NULL
      )
    )
  )
  WITH CHECK (
    user_id = get_current_user_id()
    OR (
      is_admin()
      AND team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = get_current_user_id()
          AND tm.left_at IS NULL
      )
    )
  );

-- Recreate DELETE policy with admin support
DROP POLICY IF EXISTS "import_jobs_delete_own" ON import_jobs;
CREATE POLICY "import_jobs_delete_own" ON import_jobs
  FOR DELETE TO authenticated
  USING (
    user_id = get_current_user_id()
    OR (
      is_admin()
      AND team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = get_current_user_id()
          AND tm.left_at IS NULL
      )
    )
  );


-- ============================================================================
-- GROUP C: Merge Overlapping UPDATE Policies (soft-delete pattern)
-- ============================================================================
-- These tables have both a *_update and *_delete policy, BOTH FOR UPDATE.
-- The *_delete is for soft-delete (setting deleted_at). PostgreSQL sees them
-- as 2 PERMISSIVE policies for the same (table, authenticated, UPDATE) action.
-- Merge into a single UPDATE policy with combined USING clause.
-- ============================================================================

-- -------------------------------------------------------
-- C.1: intervention_documents — merge documents_update + documents_delete
-- -------------------------------------------------------
-- documents_update: uploaded_by OR can_validate_document (deleted_at IS NULL)
-- documents_delete: uploaded_by OR can_manage_intervention (no deleted_at check)
-- Combined: cover both cases in one policy

DROP POLICY IF EXISTS "documents_update" ON intervention_documents;
DROP POLICY IF EXISTS "documents_delete" ON intervention_documents;

CREATE POLICY "documents_update_or_delete" ON intervention_documents
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      uploaded_by = get_current_user_id()
      OR can_validate_document(id)
      OR can_manage_intervention(intervention_id)
    )
  )
  WITH CHECK (
    uploaded_by = get_current_user_id()
    OR can_validate_document(id)
    OR can_manage_intervention(intervention_id)
  );

-- -------------------------------------------------------
-- C.2: intervention_quotes — merge quotes_update + quotes_delete
-- -------------------------------------------------------
-- quotes_update: manager OR (provider + assigned), deleted_at IS NULL
-- quotes_delete: manager only (for soft delete)
-- Combined: one policy, manager can always update, provider when assigned

DROP POLICY IF EXISTS "quotes_update" ON intervention_quotes;
DROP POLICY IF EXISTS "quotes_delete" ON intervention_quotes;

CREATE POLICY "quotes_update_or_delete" ON intervention_quotes
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_manager_of_intervention_team(intervention_id)
      OR (
        provider_id = get_current_user_id()
        AND is_assigned_to_intervention(intervention_id)
      )
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      is_manager_of_intervention_team(intervention_id)
      OR (
        provider_id = get_current_user_id()
        AND is_assigned_to_intervention(intervention_id)
      )
    )
  );

-- -------------------------------------------------------
-- C.3: intervention_reports — merge reports_update + reports_delete
-- -------------------------------------------------------
-- reports_update: created_by OR is_team_manager, deleted_at IS NULL
-- reports_delete: is_team_manager only (for soft delete)
-- Combined: one policy covering both

DROP POLICY IF EXISTS "reports_update" ON intervention_reports;
DROP POLICY IF EXISTS "reports_delete" ON intervention_reports;

CREATE POLICY "reports_update_or_delete" ON intervention_reports
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = get_current_user_id()
      OR is_team_manager(team_id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      created_by = get_current_user_id()
      OR is_team_manager(team_id)
    )
  );

-- -------------------------------------------------------
-- C.4: interventions — merge interventions_update + interventions_delete
-- -------------------------------------------------------
-- interventions_update: can_manage OR is_tenant OR is_prestataire, deleted_at IS NULL
-- interventions_delete: can_manage only (soft delete, FOR UPDATE)
-- Combined: one policy — the existing update already has the broader logic

DROP POLICY IF EXISTS "interventions_update" ON interventions;
DROP POLICY IF EXISTS "interventions_delete" ON interventions;

CREATE POLICY "interventions_update" ON interventions
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)
      OR is_prestataire_of_intervention(id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)
      OR is_prestataire_of_intervention(id)
    )
  );


-- ============================================================================
-- GROUP D: Merge Other Overlapping Policies
-- ============================================================================

-- -------------------------------------------------------
-- D.1: intervention_quotes SELECT — drop redundant provider policy
-- -------------------------------------------------------
-- "Providers can view their own quotes" overlaps with "quotes_select"
-- quotes_select already includes: provider_id = get_current_user_id()

DROP POLICY IF EXISTS "Providers can view their own quotes" ON intervention_quotes;

-- -------------------------------------------------------
-- D.2: intervention_quotes INSERT — drop redundant provider policy
-- -------------------------------------------------------
-- "Providers can create quotes for their assigned interventions" overlaps with "quotes_insert"
-- quotes_insert CASE 2 already covers provider insert

DROP POLICY IF EXISTS "Providers can create quotes for their assigned interventions" ON intervention_quotes;

-- -------------------------------------------------------
-- D.3: interventions INSERT — merge into single policy
-- -------------------------------------------------------
-- Currently 3 INSERT policies exist:
--   interventions_insert: manager OR tenant (from 20251016112000)
--   interventions_insert_manager: manager only (from 20251015173000)
--   interventions_insert_tenant: tenant only (from 20251015180000, uses tenant_id which no longer exists)
-- The first one (interventions_insert) already covers both manager and tenant.
-- Drop the other two.

DROP POLICY IF EXISTS "interventions_insert_manager" ON interventions;
DROP POLICY IF EXISTS "interventions_insert_tenant" ON interventions;

-- -------------------------------------------------------
-- D.4: emails SELECT — merge into single policy
-- -------------------------------------------------------
-- "Team members can view their emails" (is_team_manager) overlaps with
-- "Users can view emails for their interventions" which already covers
-- both manager access (team_id check) and assigned user access (intervention_id check).
-- Drop the first one.

DROP POLICY IF EXISTS "Team members can view their emails" ON emails;

-- -------------------------------------------------------
-- D.5: email_attachments SELECT — merge into single policy
-- -------------------------------------------------------
-- "Team members can view attachments of their emails" (via is_team_manager)
-- is redundant with "Users can view attachments for their interventions"
-- which already covers both access patterns.

DROP POLICY IF EXISTS "Team members can view attachments of their emails" ON email_attachments;

-- -------------------------------------------------------
-- D.6: users SELECT — merge 3 policies into 1
-- -------------------------------------------------------
-- users_select_own_profile: auth_user_id = (select auth.uid())
-- users_select_team_members_managers: gestionnaire/admin sees team members
-- users_select_limited_access: locataire/prestataire sees team members
-- Combined into one policy with OR of all 3 conditions.

DROP POLICY IF EXISTS "users_select_own_profile" ON users;
DROP POLICY IF EXISTS "users_select_team_members_managers" ON users;
DROP POLICY IF EXISTS "users_select_limited_access" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (
    -- Own profile (any role)
    auth_user_id = (select auth.uid())
    OR
    -- Gestionnaire/Admin: see users in same teams
    (
      get_current_user_role() IN ('gestionnaire', 'admin')
      AND (
        team_id IN (SELECT get_user_teams_v2())
        OR id IN (
          SELECT tm.user_id
          FROM team_members tm
          WHERE tm.team_id IN (SELECT get_user_teams_v2())
            AND tm.left_at IS NULL
        )
      )
    )
    OR
    -- Locataire/Prestataire: see managers and members in their teams
    (
      get_current_user_role() IN ('locataire', 'prestataire')
      AND (
        (
          role IN ('gestionnaire', 'admin')
          AND team_id IN (SELECT get_user_teams_v2())
        )
        OR id IN (
          SELECT tm.user_id
          FROM team_members tm
          WHERE tm.team_id IN (SELECT get_user_teams_v2())
            AND tm.left_at IS NULL
        )
      )
    )
  );

COMMENT ON POLICY "users_select" ON users IS
  'Unified SELECT: own profile + team members (role-dependent visibility). Replaces 3 separate policies.';

-- -------------------------------------------------------
-- D.7: users UPDATE — merge 2 policies into 1
-- -------------------------------------------------------
-- users_update_own_profile: auth_user_id = (select auth.uid())
-- users_update_by_team_managers: manager can update team users
-- Note: users_update_by_team_managers may not exist on remote (only in phase1).
-- Use DROP IF EXISTS to be safe.

DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_by_team_managers" ON users;

CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR (
      get_current_user_role() IN ('gestionnaire', 'admin')
      AND team_id IN (SELECT get_user_teams_v2())
      AND EXISTS (
        SELECT 1 FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = users.team_id
          AND u.auth_user_id = (select auth.uid())
          AND tm.role = 'admin'::team_member_role
          AND tm.left_at IS NULL
      )
    )
  )
  WITH CHECK (
    auth_user_id = (select auth.uid())
    OR (
      get_current_user_role() IN ('gestionnaire', 'admin')
      AND team_id IN (SELECT get_user_teams_v2())
      AND EXISTS (
        SELECT 1 FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = users.team_id
          AND u.auth_user_id = (select auth.uid())
          AND tm.role = 'admin'::team_member_role
          AND tm.left_at IS NULL
      )
    )
  );

COMMENT ON POLICY "users_update" ON users IS
  'Unified UPDATE: own profile + admin team managers can update team members. Replaces 2 separate policies.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
  v_table TEXT;
  v_action TEXT;
  v_problem BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Fix Multiple Permissive Policies — Applied Successfully';
  RAISE NOTICE '============================================================================';

  -- Check for remaining duplicates on the tables we fixed
  FOR v_table, v_action, v_count IN
    SELECT p.tablename, p.cmd, COUNT(*)
    FROM pg_policies p
    WHERE p.tablename IN (
      'buildings', 'lots', 'interventions',
      'intervention_type_categories', 'intervention_types', 'intervention_type_legacy_mapping',
      'import_jobs',
      'intervention_documents', 'intervention_quotes', 'intervention_reports',
      'emails', 'email_attachments',
      'users'
    )
    AND p.permissive = 'PERMISSIVE'
    AND p.roles::text[] @> ARRAY['authenticated']
    GROUP BY p.tablename, p.cmd
    HAVING COUNT(*) > 1
  LOOP
    RAISE WARNING '  STILL MULTIPLE: % % has % permissive policies', v_table, v_action, v_count;
    v_problem := TRUE;
  END LOOP;

  IF NOT v_problem THEN
    RAISE NOTICE '  All fixed tables now have at most 1 permissive policy per action.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Group A: Dropped 7 redundant SELECT policies (buildings, lots, interventions)';
  RAISE NOTICE '         Updated get_accessible_building_ids() + get_accessible_lot_ids()';
  RAISE NOTICE '         with proprietaire + contract-based locataire support';
  RAISE NOTICE 'Group B: Replaced 3 FOR ALL policies with 9 individual action policies';
  RAISE NOTICE '         (intervention_type_categories, intervention_types, legacy_mapping)';
  RAISE NOTICE '         Dropped import_jobs FOR ALL, merged admin into specific policies';
  RAISE NOTICE 'Group C: Merged 8 UPDATE policies into 4 (soft-delete pattern)';
  RAISE NOTICE '         (documents, quotes, reports, interventions)';
  RAISE NOTICE 'Group D: Merged overlapping policies on quotes, emails, users, interventions INSERT';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
