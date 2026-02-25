-- ============================================================================
-- REVERT: Undo all 4 migrations from 2026-02-11
-- ============================================================================
-- Reverts:
--   20260211100000 — views SECURITY INVOKER
--   20260211110000 — search_path = '' on 52 functions (LIKELY ROOT CAUSE of 42P01)
--   20260211120000 — interventions_active SECURITY INVOKER
--   20260211140000 — performance advisor policy/index changes
-- ============================================================================

-- ============================================================================
-- PART A: Revert search_path = '' on all functions → RESET search_path
-- ============================================================================
-- This is the most likely cause of 42P01 errors: functions with search_path=''
-- cannot find tables unless they use fully-qualified names (public.tablename).

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
      'expire_old_invitations',
      'revoke_contact_access',
      'log_intervention_status_change',
      'cleanup_old_webhook_logs',
      'sync_email_link_team_id',
      'get_entity_activity_logs',
      'auto_set_time_slot_validation',
      'handle_internal_time_slot_rejection',
      'update_time_slot_validation_summary',
      'create_responses_for_new_timeslot'
    )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) RESET search_path',
      func_record.proname,
      func_record.args
    );
    RAISE NOTICE 'Reset search_path for: public.%(%)', func_record.proname, func_record.args;
  END LOOP;
END $$;

-- ============================================================================
-- PART B: Revert views from SECURITY INVOKER back to default (SECURITY DEFINER)
-- ============================================================================

ALTER VIEW public.contracts_active SET (security_invoker = off);
ALTER VIEW public.lots_active SET (security_invoker = off);
ALTER VIEW public.buildings_active SET (security_invoker = off);
ALTER VIEW public.lots_with_contacts SET (security_invoker = off);
ALTER VIEW public.activity_logs_with_user SET (security_invoker = off);
ALTER VIEW public.interventions_active SET (security_invoker = off);

-- ============================================================================
-- PART C: Revert email_webhook_logs policy to original
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert webhook logs" ON email_webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
  ON email_webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PART D: Revert performance advisor policy changes
-- Restore original policies with auth.uid() (without select wrapper)
-- ============================================================================

-- D.1: companies policies — restore with auth.uid() instead of (select auth.uid())
DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

DROP POLICY IF EXISTS "companies_update" ON companies;
CREATE POLICY "companies_update" ON companies FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_delete" ON companies FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = companies.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- D.2: intervention_type_categories/types/mapping SELECT — restore with auth.uid()
DROP POLICY IF EXISTS "intervention_type_categories_select" ON intervention_type_categories;
CREATE POLICY "intervention_type_categories_select" ON intervention_type_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "intervention_types_select" ON intervention_types;
CREATE POLICY "intervention_types_select" ON intervention_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping;
CREATE POLICY "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- D.3: buildings proprietaire_buildings_select — restore with auth.uid()
DROP POLICY IF EXISTS "proprietaire_buildings_select" ON buildings;
CREATE POLICY "proprietaire_buildings_select" ON buildings FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
);

-- D.4: lots proprietaire_lots_select — restore with auth.uid()
DROP POLICY IF EXISTS "proprietaire_lots_select" ON lots;
CREATE POLICY "proprietaire_lots_select" ON lots FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT lc.lot_id
    FROM lot_contacts lc
    INNER JOIN users u ON u.id = lc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
  OR
  building_id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
);

-- D.5: team_members policies — restore with auth.uid() and current_setting()
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  current_setting('app.bypass_rls_for_signup', true) = 'true'
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
        AND u.auth_user_id = auth.uid()
        AND tm.role = 'admin'::team_member_role
        AND tm.left_at IS NULL
      )
    )
  )
);

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- D.6: teams policies — restore with current_setting() and auth.uid()
DROP POLICY IF EXISTS "teams_insert_by_gestionnaire" ON teams;
CREATE POLICY "teams_insert_by_gestionnaire" ON teams FOR INSERT
TO authenticated
WITH CHECK (
  current_setting('app.bypass_rls_for_signup', true) = 'true'
  OR
  get_current_user_role() IN ('gestionnaire', 'admin')
);

DROP POLICY IF EXISTS "teams_update_by_admin" ON teams;
CREATE POLICY "teams_update_by_admin" ON teams FOR UPDATE
TO authenticated
USING (
  id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = teams.id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- D.7: user_invitations delete — restore with auth.uid()
DROP POLICY IF EXISTS "user_invitations_delete" ON user_invitations;
CREATE POLICY "user_invitations_delete" ON user_invitations FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = user_invitations.team_id
    AND u.auth_user_id = auth.uid()
    AND (
      u.role = 'gestionnaire'::user_role
      OR
      tm.role = 'admin'::team_member_role
    )
    AND tm.left_at IS NULL
  )
);

-- D.8: users policies — restore with auth.uid() and current_setting()
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
CREATE POLICY "users_select_own_profile" ON users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_contacts" ON users;
CREATE POLICY "users_insert_contacts" ON users FOR INSERT
TO authenticated
WITH CHECK (
  current_setting('app.bypass_rls_for_signup', true) = 'true'
  OR
  current_setting('role') = 'service_role'
  OR
  (
    get_current_user_role() IN ('gestionnaire', 'admin')
    AND team_id IN (SELECT get_user_teams_v2())
  )
);

DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_by_admin" ON users;
CREATE POLICY "users_delete_by_admin" ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id IN (SELECT get_user_teams_v2())
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'::team_member_role
    AND tm.left_at IS NULL
  )
);

-- ============================================================================
-- PART E: Recreate dropped indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_team_created
  ON activity_logs(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buildings_team_active
  ON buildings(team_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON conversation_messages(thread_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intervention_assignments_user_id
  ON intervention_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_intervention_selected
  ON intervention_time_slots(intervention_id)
  WHERE is_selected = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_company_id
  ON users(company_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- PART F: Recreate dropped intervention_time_slots_update policy
-- ============================================================================

CREATE POLICY intervention_time_slots_update ON intervention_time_slots
  FOR UPDATE
  USING (
    proposed_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE i.id = intervention_time_slots.intervention_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('gestionnaire', 'admin')
    )
    OR
    is_admin()
  );

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'REVERT COMPLETE — All 4 migrations from 2026-02-11 have been undone';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '  Part A: search_path RESET on 52 functions';
  RAISE NOTICE '  Part B: 6 views reverted to SECURITY DEFINER';
  RAISE NOTICE '  Part C: email_webhook_logs policy restored';
  RAISE NOTICE '  Part D: 18 RLS policies restored to original (no select wrapper)';
  RAISE NOTICE '  Part E: 6 indexes recreated';
  RAISE NOTICE '  Part F: intervention_time_slots_update policy recreated';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
