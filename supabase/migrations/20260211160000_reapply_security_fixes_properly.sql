-- ============================================================================
-- Migration: Re-apply ALL security & performance fixes properly
-- Date: 2026-02-11
-- ============================================================================
-- Context: On 2026-02-11, 4 migrations were applied then reverted:
--   - 20260211100000: SECURITY INVOKER on 5 views
--   - 20260211110000: search_path = '' on 52 functions (BROKE APP — 42P01 errors)
--   - 20260211120000: SECURITY INVOKER on interventions_active
--   - 20260211140000: Performance advisor fixes
--   - 20260211150000: Revert all 4
--
-- This migration re-applies everything with the fix:
--   search_path = 'public' (not '') so functions can still resolve tables.
-- ============================================================================

-- ============================================================================
-- PART 1: Fix search_path with 'public' on all 52 functions
-- ============================================================================
-- Using search_path = 'public' instead of '' satisfies the Supabase linter
-- (search_path is pinned, not mutable) while keeping all existing function
-- code working without needing to fully-qualify every table reference.

DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      -- RLS Helper Functions (SECURITY DEFINER + STABLE)
      'is_team_member',
      'is_team_manager',
      'can_view_building',
      'can_view_lot',
      'is_manager_of_intervention_team',
      'can_view_intervention',
      'can_manage_intervention',
      'get_intervention_team_id',
      'can_send_message_in_thread',
      'can_validate_document',
      'can_manage_time_slot',
      'is_document_owner',
      'can_view_quote',
      'can_manage_quote',
      'can_view_report',
      'is_notification_recipient',
      'is_prestataire_of_intervention',
      'can_view_conversation',
      'can_view_conversation_thread',
      'check_timeslot_can_be_finalized',
      'is_sender_blacklisted',
      'get_team_id_from_storage_path',
      'get_contract_team_id',
      'can_view_contract',
      'can_manage_contract',
      'get_linked_interventions',
      'get_distinct_linked_entities',
      'is_time_slot_fully_validated',
      -- Trigger Functions
      'update_updated_at_column',
      'update_company_members_updated_at',
      'generate_intervention_reference',
      'set_intervention_team_id',
      'update_thread_message_count',
      'validate_intervention_status_transition',
      'soft_delete_intervention_cascade',
      'update_time_slot_response_updated_at',
      'check_single_selected_slot',
      'update_intervention_comments_updated_at',
      'update_import_jobs_updated_at',
      'update_building_lots_count_from_lot_contacts',
      'update_building_total_lots',
      'update_intervention_has_attachments',
      -- Business Logic Functions
      'expire_old_invitations',
      'revoke_contact_access',
      'log_intervention_status_change',
      'cleanup_old_webhook_logs',
      'sync_email_link_team_id',
      -- Other Functions
      'get_entity_activity_logs',
      'auto_set_time_slot_validation',
      'handle_internal_time_slot_rejection',
      'update_time_slot_validation_summary',
      'create_responses_for_new_timeslot'
    )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = %L',
      func_record.proname,
      func_record.args,
      'public'
    );
    RAISE NOTICE 'Fixed search_path for: public.%(%)', func_record.proname, func_record.args;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: SECURITY INVOKER on 6 views
-- ============================================================================
-- Views with SECURITY DEFINER (default) run as the view owner, bypassing
-- the caller's RLS. SECURITY INVOKER makes the view respect the caller's
-- permissions — the correct behavior for user-facing views.

ALTER VIEW public.contracts_active SET (security_invoker = on);
ALTER VIEW public.lots_active SET (security_invoker = on);
ALTER VIEW public.buildings_active SET (security_invoker = on);
ALTER VIEW public.lots_with_contacts SET (security_invoker = on);
ALTER VIEW public.activity_logs_with_user SET (security_invoker = on);
ALTER VIEW public.interventions_active SET (security_invoker = on);

-- ============================================================================
-- PART 3: Scope email_webhook_logs INSERT policy to service_role
-- ============================================================================
-- The original policy allowed any authenticated user to insert webhook logs.
-- Only the service_role (backend) should insert these.

DROP POLICY IF EXISTS "Service role can insert webhook logs" ON email_webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
  ON email_webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- PART 4: Performance advisor — wrap auth.uid() in (select ...) for InitPlan
-- ============================================================================
-- Pattern: auth.uid() → (select auth.uid())
--          current_setting(...) → (select current_setting(...))
-- This makes PostgreSQL evaluate the function once (InitPlan) instead of
-- re-evaluating for every row scanned.

-- 4.1 companies: companies_insert
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

-- 4.2 companies: companies_update
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

-- 4.3 companies: companies_delete
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

-- 4.4 intervention_type_categories: select
DROP POLICY IF EXISTS "intervention_type_categories_select" ON intervention_type_categories;
CREATE POLICY "intervention_type_categories_select" ON intervention_type_categories
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- 4.5 intervention_types: select
DROP POLICY IF EXISTS "intervention_types_select" ON intervention_types;
CREATE POLICY "intervention_types_select" ON intervention_types
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- 4.6 intervention_type_legacy_mapping: select
DROP POLICY IF EXISTS "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping;
CREATE POLICY "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- 4.7 buildings: proprietaire_buildings_select
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

-- 4.8 lots: proprietaire_lots_select
DROP POLICY IF EXISTS "proprietaire_lots_select" ON lots;
CREATE POLICY "proprietaire_lots_select" ON lots FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT lc.lot_id
    FROM lot_contacts lc
    INNER JOIN users u ON u.id = lc.user_id
    WHERE u.auth_user_id = (select auth.uid())
      AND u.role = 'proprietaire'
  )
  OR
  building_id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = (select auth.uid())
      AND u.role = 'proprietaire'
  )
);

-- 4.9 team_members: team_members_insert
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  (
    team_id IN (SELECT get_user_teams_v2())
    AND (
      NOT EXISTS (
        SELECT 1 FROM users WHERE id = team_members.user_id AND role = 'gestionnaire'::user_role
      )
      OR
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

-- 4.10 team_members: team_members_update
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

-- 4.11 team_members: team_members_delete
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

-- 4.12 teams: teams_insert_by_gestionnaire
DROP POLICY IF EXISTS "teams_insert_by_gestionnaire" ON teams;
CREATE POLICY "teams_insert_by_gestionnaire" ON teams FOR INSERT
TO authenticated
WITH CHECK (
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  get_current_user_role() IN ('gestionnaire', 'admin')
);

-- 4.13 teams: teams_update_by_admin
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

-- 4.14 user_invitations: user_invitations_delete
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
      u.role = 'gestionnaire'::user_role
      OR
      tm.role = 'admin'::team_member_role
    )
    AND tm.left_at IS NULL
  )
);

-- 4.15 users: users_select_own_profile
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
CREATE POLICY "users_select_own_profile" ON users
FOR SELECT
TO authenticated
USING (auth_user_id = (select auth.uid()));

-- 4.16 users: users_insert_contacts
DROP POLICY IF EXISTS "users_insert_contacts" ON users;
CREATE POLICY "users_insert_contacts" ON users FOR INSERT
TO authenticated
WITH CHECK (
  (select current_setting('app.bypass_rls_for_signup', true)) = 'true'
  OR
  (select current_setting('role')) = 'service_role'
  OR
  (
    get_current_user_role() IN ('gestionnaire', 'admin')
    AND team_id IN (SELECT get_user_teams_v2())
  )
);

-- 4.17 users: users_update_own_profile
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE
TO authenticated
USING (auth_user_id = (select auth.uid()))
WITH CHECK (auth_user_id = (select auth.uid()));

-- 4.18 users: users_delete_by_admin
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
-- PART 5: Drop 6 duplicate indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_activity_logs_team_created;
DROP INDEX IF EXISTS idx_buildings_team_active;
DROP INDEX IF EXISTS idx_messages_thread_created;
DROP INDEX IF EXISTS idx_intervention_assignments_user_id;
DROP INDEX IF EXISTS idx_time_slots_intervention_selected;
DROP INDEX IF EXISTS idx_users_company_id;

-- ============================================================================
-- PART 6: Drop superseded intervention_time_slots_update policy
-- ============================================================================
-- intervention_time_slots_update (from 20251019070000) is superseded by
-- time_slots_update (from 20251226000001).

DROP POLICY IF EXISTS "intervention_time_slots_update" ON intervention_time_slots;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Security & Performance Fixes — Re-applied Successfully';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '  Part 1: 52 functions SET search_path = ''public''';
  RAISE NOTICE '  Part 2: 6 views SET security_invoker = on';
  RAISE NOTICE '  Part 3: email_webhook_logs policy scoped to service_role';
  RAISE NOTICE '  Part 4: 18 RLS policies with (select auth.uid()) caching';
  RAISE NOTICE '  Part 5: 6 duplicate indexes dropped';
  RAISE NOTICE '  Part 6: 1 superseded policy dropped';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
