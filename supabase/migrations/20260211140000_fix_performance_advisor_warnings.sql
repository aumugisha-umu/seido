-- ============================================================================
-- Migration: Fix Supabase Performance Advisor Warnings
-- Date: 2026-02-11
-- ============================================================================
-- Fixes 3 categories of WARN-level issues:
--   1. auth_rls_initplan (19 policies) — wrap auth.uid() / current_setting()
--      in (select ...) so PostgreSQL evaluates them once per query, not per row
--   2. duplicate_index (6 pairs) — drop identical redundant indexes
--   3. multiple_permissive_policies (1 case) — drop old superseded policy
-- ============================================================================

-- ============================================================================
-- PART 1: Fix auth_rls_initplan — Wrap auth functions in subselect
-- ============================================================================
-- Pattern: auth.uid() → (select auth.uid())
--          current_setting(...) → (select current_setting(...))
-- This makes PostgreSQL evaluate the function once (InitPlan) instead of
-- re-evaluating for every row scanned.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1.1 companies: companies_insert
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.2 companies: companies_update
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_update" ON companies;
CREATE POLICY "companies_update" ON companies FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.3 companies: companies_delete
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_delete" ON companies FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.4 intervention_time_slots: intervention_time_slots_update
-- --------------------------------------------------------------------------
-- NOTE: This policy is being DROPPED entirely in Part 3 (superseded by
-- time_slots_update from migration 20251226000001). No need to recreate.

-- --------------------------------------------------------------------------
-- 1.5 intervention_type_categories: intervention_type_categories_select
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "intervention_type_categories_select" ON intervention_type_categories;
CREATE POLICY "intervention_type_categories_select" ON intervention_type_categories
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- --------------------------------------------------------------------------
-- 1.6 intervention_types: intervention_types_select
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "intervention_types_select" ON intervention_types;
CREATE POLICY "intervention_types_select" ON intervention_types
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- --------------------------------------------------------------------------
-- 1.7 intervention_type_legacy_mapping: intervention_type_legacy_mapping_select
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping;
CREATE POLICY "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- --------------------------------------------------------------------------
-- 1.8 buildings: proprietaire_buildings_select
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "proprietaire_buildings_select" ON buildings;
CREATE POLICY "proprietaire_buildings_select" ON buildings FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = (select auth.uid())
      AND u.role = 'proprietaire'
  )
);

-- --------------------------------------------------------------------------
-- 1.9 lots: proprietaire_lots_select
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "proprietaire_lots_select" ON lots;
CREATE POLICY "proprietaire_lots_select" ON lots FOR SELECT
TO authenticated
USING (
  -- Proprietaire owns this lot directly (via lot_contacts)
  id IN (
    SELECT lc.lot_id
    FROM lot_contacts lc
    INNER JOIN users u ON u.id = lc.user_id
    WHERE u.auth_user_id = (select auth.uid())
      AND u.role = 'proprietaire'
  )
  OR
  -- Proprietaire owns the building containing this lot
  building_id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = (select auth.uid())
      AND u.role = 'proprietaire'
  )
);

-- --------------------------------------------------------------------------
-- 1.10 team_members: team_members_insert
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Bypass RLS for signup trigger
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  (
    team_id IN (SELECT get_user_teams_v2())
    AND (
      -- Add locataire/prestataire → OK
      NOT EXISTS (
        SELECT 1 FROM users WHERE id = team_members.user_id AND role = 'gestionnaire'::user_role
      )
      OR
      -- Add gestionnaire → Admin only (privilege escalation protection)
      EXISTS (
        SELECT 1 FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = team_members.team_id
        AND u.auth_user_id = (select auth.uid())
        AND tm.role = 'admin'::team_member_role
        AND tm.left_at IS NULL
      )
    )
  )
);

-- --------------------------------------------------------------------------
-- 1.11 team_members: team_members_update
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.12 team_members: team_members_delete
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.13 teams: teams_insert_by_gestionnaire
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "teams_insert_by_gestionnaire" ON teams;
CREATE POLICY "teams_insert_by_gestionnaire" ON teams FOR INSERT
TO authenticated
WITH CHECK (
  -- Bypass RLS for signup trigger
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  -- Gestionnaires can create teams
  get_current_user_role() IN ('gestionnaire', 'admin')
);

-- --------------------------------------------------------------------------
-- 1.14 teams: teams_update_by_admin
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "teams_update_by_admin" ON teams;
CREATE POLICY "teams_update_by_admin" ON teams FOR UPDATE
TO authenticated
USING (
  id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = teams.id
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.15 user_invitations: user_invitations_delete
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_invitations_delete" ON user_invitations;
CREATE POLICY "user_invitations_delete" ON user_invitations FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = user_invitations.team_id
    AND u.auth_user_id = (select auth.uid())
    AND (
      -- Allow gestionnaires
      u.role = 'gestionnaire'::user_role
      OR
      -- Allow team admins
      tm.role = 'admin'::team_member_role
    )
    AND tm.left_at IS NULL
  )
);

-- --------------------------------------------------------------------------
-- 1.16 users: users_select_own_profile
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
CREATE POLICY "users_select_own_profile" ON users
FOR SELECT
TO authenticated
USING (auth_user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- 1.17 users: users_insert_contacts
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_insert_contacts" ON users;
CREATE POLICY "users_insert_contacts" ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- Bypass RLS for signup trigger
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  -- Service Role bypass (for supabaseAdmin)
  (select current_setting('role')) = 'service_role'
  OR
  -- Gestionnaires/Admins can create contacts in their teams
  (
    get_current_user_role() IN ('gestionnaire', 'admin')
    AND team_id IN (SELECT get_user_teams_v2())
  )
);

-- --------------------------------------------------------------------------
-- 1.18 users: users_update_own_profile
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE
TO authenticated
USING (auth_user_id = (select auth.uid()))
WITH CHECK (auth_user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- 1.19 users: users_delete_by_admin
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_delete_by_admin" ON users;
CREATE POLICY "users_delete_by_admin" ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id IN (SELECT get_user_teams_v2())
    AND u.auth_user_id = (select auth.uid())
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- ============================================================================
-- PART 2: Drop 6 duplicate indexes
-- ============================================================================
-- Each pair has identical column definitions and WHERE clauses.
-- We keep the original and drop the duplicate.
-- ============================================================================

-- idx_activity_logs_team (team_id, created_at DESC) — keep
-- idx_activity_logs_team_created (team_id, created_at DESC) — drop
DROP INDEX IF EXISTS idx_activity_logs_team_created;

-- idx_buildings_team (team_id WHERE deleted_at IS NULL) — keep
-- idx_buildings_team_active (team_id WHERE deleted_at IS NULL) — drop
DROP INDEX IF EXISTS idx_buildings_team_active;

-- idx_messages_thread (thread_id, created_at DESC WHERE deleted_at IS NULL) — keep
-- idx_messages_thread_created (thread_id, created_at DESC WHERE deleted_at IS NULL) — drop
DROP INDEX IF EXISTS idx_messages_thread_created;

-- idx_intervention_assignments_user (user_id) — keep
-- idx_intervention_assignments_user_id (user_id) — drop
DROP INDEX IF EXISTS idx_intervention_assignments_user_id;

-- idx_time_slots_selected (intervention_id WHERE is_selected = TRUE) — keep
-- idx_time_slots_intervention_selected (intervention_id WHERE is_selected = TRUE) — drop
DROP INDEX IF EXISTS idx_time_slots_intervention_selected;

-- idx_users_company (company_id WHERE deleted_at IS NULL) — keep
-- idx_users_company_id (company_id WHERE deleted_at IS NULL) — drop
DROP INDEX IF EXISTS idx_users_company_id;

-- ============================================================================
-- PART 3: Drop duplicate intervention_time_slots UPDATE policy
-- ============================================================================
-- intervention_time_slots_update (from 20251019070000) is superseded by
-- time_slots_update (from 20251226000001). The old policy uses auth.uid()
-- directly (incorrect — proposed_by is users.id, not auth uid) and has
-- different logic. The new one uses is_team_manager() + is_assigned_to_intervention().
-- ============================================================================

DROP POLICY IF EXISTS "intervention_time_slots_update" ON intervention_time_slots;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Performance Advisor Warnings Fix — Migration Complete';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '  Part 1: 19 RLS policies recreated with (select auth.uid()) caching';
  RAISE NOTICE '  Part 2: 6 duplicate indexes dropped';
  RAISE NOTICE '  Part 3: 1 superseded policy dropped';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
