-- ============================================================================
-- MIGRATION: Fix Remaining auth.uid() Bugs for Multi-Profile Support
-- ============================================================================
-- Date: 2026-01-29
-- Description: Completes multi-profile support by fixing remaining instances where
--              user_id/provider_id was compared to auth.uid() instead of checking
--              against all profile IDs via get_my_profile_ids()
--
-- CONTEXT:
-- - Previous migration (20260128000000) created get_my_profile_ids() and fixed core functions
-- - This migration fixes remaining RLS policies in:
--   * emails table (assigned user access)
--   * email_attachments table
--   * time_slots table (provider_id check)
--   * time_slot_responses table
--   * contacts table
--   * is_provider_assigned_to_building/lot functions
--
-- PATTERN CHANGE:
--   BEFORE: user_id = auth.uid() OR tm.user_id = auth.uid() OR provider_id = auth.uid()
--   AFTER:  user_id IN (SELECT get_my_profile_ids())
--
-- NOTE: The column user_id/provider_id references users.id, NOT auth.users.id
--       So comparing to auth.uid() was always incorrect - it worked by accident
--       for single-profile users only because LIMIT 1 was implicit
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix is_provider_assigned_to_building() for Multi-Profile
-- ============================================================================
-- Problem: ia.user_id = auth.uid() but user_id references users.id
-- Solution: ia.user_id IN (SELECT get_my_profile_ids())

CREATE OR REPLACE FUNCTION is_provider_assigned_to_building(building_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    INNER JOIN public.interventions i ON i.id = ia.intervention_id
    WHERE i.building_id = is_provider_assigned_to_building.building_id
      AND i.deleted_at IS NULL
      AND ia.role = 'prestataire'
      -- MULTI-PROFILE: Check ALL profiles of current auth user
      AND ia.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_provider_assigned_to_building IS
  'Checks if ANY profile of current auth user is assigned as provider to an intervention in this building.
   Fixed Jan 2026: was comparing user_id = auth.uid() (wrong FK reference), now uses get_my_profile_ids().';

-- ============================================================================
-- STEP 2: Fix is_provider_assigned_to_lot() for Multi-Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION is_provider_assigned_to_lot(lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    INNER JOIN public.interventions i ON i.id = ia.intervention_id
    WHERE i.lot_id = is_provider_assigned_to_lot.lot_id
      AND i.deleted_at IS NULL
      AND ia.role = 'prestataire'
      -- MULTI-PROFILE: Check ALL profiles of current auth user
      AND ia.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_provider_assigned_to_lot IS
  'Checks if ANY profile of current auth user is assigned as provider to an intervention in this lot.
   Fixed Jan 2026: was comparing user_id = auth.uid() (wrong FK reference), now uses get_my_profile_ids().';

-- ============================================================================
-- STEP 3: Fix emails SELECT Policy for Assigned Users
-- ============================================================================
-- Source: 20260121000000_add_email_rls_for_assigned_users.sql
-- Problem: ia.user_id = auth.uid() in the assigned users check

DROP POLICY IF EXISTS "Users can view emails for their interventions" ON emails;
CREATE POLICY "Users can view emails for their interventions"
ON emails
FOR SELECT
TO authenticated
USING (
  -- Manager/admin access via team
  (
    team_id IS NOT NULL
    AND user_belongs_to_team_v2(team_id)
    AND get_current_user_role() IN ('gestionnaire', 'admin')
  )
  OR
  -- Provider/tenant assigned to intervention
  (
    intervention_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM intervention_assignments ia
      WHERE ia.intervention_id = emails.intervention_id
        -- MULTI-PROFILE: Check ALL profiles
        AND ia.user_id IN (SELECT get_my_profile_ids())
    )
  )
);

COMMENT ON POLICY "Users can view emails for their interventions" ON emails IS
  'Users can view emails for interventions they are assigned to (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 4: Fix email_attachments SELECT Policy
-- ============================================================================
-- Source: 20260121000000_add_email_rls_for_assigned_users.sql
-- Problem: Similar pattern using ia.user_id = auth.uid()

DROP POLICY IF EXISTS "Users can view attachments for their interventions" ON email_attachments;
CREATE POLICY "Users can view attachments for their interventions"
ON email_attachments
FOR SELECT
TO authenticated
USING (
  email_id IN (
    SELECT e.id
    FROM emails e
    WHERE
      -- Manager/admin access via team
      (
        e.team_id IS NOT NULL
        AND user_belongs_to_team_v2(e.team_id)
        AND get_current_user_role() IN ('gestionnaire', 'admin')
      )
      OR
      -- Provider/tenant assigned to intervention
      (
        e.intervention_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM intervention_assignments ia
          WHERE ia.intervention_id = e.intervention_id
            -- MULTI-PROFILE: Check ALL profiles
            AND ia.user_id IN (SELECT get_my_profile_ids())
        )
      )
  )
);

COMMENT ON POLICY "Users can view attachments for their interventions" ON email_attachments IS
  'Users can view attachments for emails they have access to (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 5: Fix time_slot_responses INSERT Policy
-- ============================================================================
-- Source: 20251019150000_fix_time_slot_responses_rls_insert_policy.sql
-- Problem: tm.user_id = auth.uid() and ia.user_id = auth.uid()

DROP POLICY IF EXISTS "time_slot_responses_insert" ON time_slot_responses;
CREATE POLICY "time_slot_responses_insert"
ON time_slot_responses
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must respond for self (any of user's profiles)
  user_id IN (SELECT get_my_profile_ids())
  AND
  (
    -- Managers can respond via team membership
    EXISTS (
      SELECT 1
      FROM intervention_time_slots ts
      JOIN interventions i ON ts.intervention_id = i.id
      JOIN team_members tm ON tm.team_id = i.team_id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND tm.left_at IS NULL
        -- MULTI-PROFILE: Check ALL profiles
        AND tm.user_id IN (SELECT get_my_profile_ids())
    )
    OR
    -- Assigned users can respond
    EXISTS (
      SELECT 1
      FROM intervention_time_slots ts
      JOIN intervention_assignments ia ON ia.intervention_id = ts.intervention_id
      WHERE ts.id = time_slot_responses.time_slot_id
        -- MULTI-PROFILE: Check ALL profiles
        AND ia.user_id IN (SELECT get_my_profile_ids())
    )
  )
);

COMMENT ON POLICY "time_slot_responses_insert" ON time_slot_responses IS
  'Users can insert responses for time slots they have access to (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 6: Fix time_slot_responses SELECT Policy
-- ============================================================================
-- Source: 20251019150000_fix_time_slot_responses_rls_insert_policy.sql

DROP POLICY IF EXISTS "time_slot_responses_select" ON time_slot_responses;
CREATE POLICY "time_slot_responses_select"
ON time_slot_responses
FOR SELECT
TO authenticated
USING (
  -- Own responses (any profile)
  user_id IN (SELECT get_my_profile_ids())
  OR
  -- Managers via team membership
  EXISTS (
    SELECT 1
    FROM intervention_time_slots ts
    JOIN interventions i ON ts.intervention_id = i.id
    JOIN team_members tm ON tm.team_id = i.team_id
    WHERE ts.id = time_slot_responses.time_slot_id
      AND tm.left_at IS NULL
      -- MULTI-PROFILE: Check ALL profiles
      AND tm.user_id IN (SELECT get_my_profile_ids())
  )
  OR
  -- Assigned users
  EXISTS (
    SELECT 1
    FROM intervention_time_slots ts
    JOIN intervention_assignments ia ON ia.intervention_id = ts.intervention_id
    WHERE ts.id = time_slot_responses.time_slot_id
      -- MULTI-PROFILE: Check ALL profiles
      AND ia.user_id IN (SELECT get_my_profile_ids())
  )
);

COMMENT ON POLICY "time_slot_responses_select" ON time_slot_responses IS
  'Users can view responses for time slots they have access to (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 7: Fix company_members SELECT Policy
-- ============================================================================
-- Source: 20251104000000_add_company_support_to_contacts.sql
-- Problem: tm.user_id = auth.uid() in all 4 policies

DROP POLICY IF EXISTS "company_members_select" ON company_members;
CREATE POLICY "company_members_select"
ON company_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.team_id = company_members.team_id
      AND tm.left_at IS NULL
      -- MULTI-PROFILE: Check ALL profiles
      AND tm.user_id IN (SELECT get_my_profile_ids())
  )
);

COMMENT ON POLICY "company_members_select" ON company_members IS
  'Team members can view company_members in their teams (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 8: Fix company_members INSERT Policy
-- ============================================================================

DROP POLICY IF EXISTS "company_members_insert" ON company_members;
CREATE POLICY "company_members_insert"
ON company_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = company_members.team_id
      AND tm.left_at IS NULL
      AND u.role IN ('admin', 'gestionnaire')
      -- MULTI-PROFILE: Check ALL profiles
      AND tm.user_id IN (SELECT get_my_profile_ids())
  )
);

COMMENT ON POLICY "company_members_insert" ON company_members IS
  'Managers can insert company_members in their teams (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 9: Fix company_members UPDATE Policy
-- ============================================================================

DROP POLICY IF EXISTS "company_members_update" ON company_members;
CREATE POLICY "company_members_update"
ON company_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = company_members.team_id
      AND tm.left_at IS NULL
      AND u.role IN ('admin', 'gestionnaire')
      -- MULTI-PROFILE: Check ALL profiles
      AND tm.user_id IN (SELECT get_my_profile_ids())
  )
);

COMMENT ON POLICY "company_members_update" ON company_members IS
  'Managers can update company_members in their teams (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 10: Fix company_members DELETE Policy
-- ============================================================================

DROP POLICY IF EXISTS "company_members_delete" ON company_members;
CREATE POLICY "company_members_delete"
ON company_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = company_members.team_id
      AND tm.left_at IS NULL
      AND u.role IN ('admin', 'gestionnaire')
      -- MULTI-PROFILE: Check ALL profiles
      AND tm.user_id IN (SELECT get_my_profile_ids())
  )
  AND get_current_user_role() IN ('gestionnaire', 'admin')
);

COMMENT ON POLICY "company_members_delete" ON company_members IS
  'Managers can delete company_members in their teams (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 11: Fix intervention_time_slots SELECT Policy
-- ============================================================================
-- Source: 20251208100000_multi_provider_assignments.sql
-- Problem: provider_id = auth.uid() - provider_id references users.id not auth.uid()

DROP POLICY IF EXISTS "time_slots_select" ON intervention_time_slots;
CREATE POLICY "time_slots_select"
ON intervention_time_slots
FOR SELECT
TO authenticated
USING (
  -- Can view slot via intervention access function (handles team + assignment checks)
  can_view_time_slot_for_provider(id)
  OR
  -- Direct assignment via provider_id (when slot is provider-specific)
  (provider_id IS NOT NULL AND provider_id IN (SELECT get_my_profile_ids()))
);

COMMENT ON POLICY "time_slots_select" ON intervention_time_slots IS
  'Users can view time slots they have access to via intervention or direct assignment.
   Fixed Jan 2026: provider_id check uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 12: Fix quotes/devis SELECT Policy for Providers
-- ============================================================================
-- Source: 20251014134531_phase3_interventions_chat_system.sql
-- Problem: provider_id = auth.uid() but provider_id references users.id

DROP POLICY IF EXISTS "Providers can view their own quotes" ON intervention_quotes;
CREATE POLICY "Providers can view their own quotes"
ON intervention_quotes
FOR SELECT
TO authenticated
USING (
  -- Provider who created the quote (any profile)
  provider_id IN (SELECT get_my_profile_ids())
  OR
  -- Manager of the intervention's team
  is_manager_of_intervention_team(intervention_id)
  OR
  -- Assigned to the intervention
  is_assigned_to_intervention(intervention_id)
);

COMMENT ON POLICY "Providers can view their own quotes" ON intervention_quotes IS
  'Providers can view quotes they created, plus managers and assigned users (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 13: Fix quotes/devis INSERT Policy for Providers
-- ============================================================================

DROP POLICY IF EXISTS "Providers can create quotes for their assigned interventions" ON intervention_quotes;
CREATE POLICY "Providers can create quotes for their assigned interventions"
ON intervention_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  -- Provider must set themselves as provider_id (any profile)
  provider_id IN (SELECT get_my_profile_ids())
  AND
  -- Must be assigned to the intervention as provider
  EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    WHERE ia.intervention_id = intervention_quotes.intervention_id
      AND ia.role = 'prestataire'
      AND ia.user_id IN (SELECT get_my_profile_ids())
  )
);

COMMENT ON POLICY "Providers can create quotes for their assigned interventions" ON intervention_quotes IS
  'Providers can create quotes for interventions they are assigned to (any profile).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 14: Fix lots SELECT Policy for Tenants (via lot_contacts)
-- ============================================================================
-- Source: 20251111181000_granular_rls_policies_by_role.sql
-- Problem: lc.user_id = auth.uid()
-- Note: lot_contacts is deprecated (use contract_contacts), but policy still exists

DROP POLICY IF EXISTS "lots_select_via_lot_contacts" ON lots;
-- Only create if lot_contacts table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lot_contacts') THEN
    EXECUTE '
      CREATE POLICY "lots_select_via_lot_contacts"
      ON lots
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT lc.lot_id
          FROM lot_contacts lc
          WHERE lc.user_id IN (SELECT get_my_profile_ids())
        )
      )
    ';
    COMMENT ON POLICY "lots_select_via_lot_contacts" ON lots IS
      'Tenants can view lots they are linked to via lot_contacts (deprecated, use contract_contacts).
       Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';
  END IF;
END $$;

-- ============================================================================
-- STEP 15: Fix buildings SELECT Policy for Tenants (via lot_contacts)
-- ============================================================================
-- Source: 20251111181000_granular_rls_policies_by_role.sql + 20251111183000_fix_rls_recursion_final.sql

DROP POLICY IF EXISTS "buildings_select_via_lot_contacts" ON buildings;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lot_contacts') THEN
    EXECUTE '
      CREATE POLICY "buildings_select_via_lot_contacts"
      ON buildings
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT l.building_id
          FROM lots l
          JOIN lot_contacts lc ON lc.lot_id = l.id
          WHERE lc.user_id IN (SELECT get_my_profile_ids())
            AND l.building_id IS NOT NULL
        )
      )
    ';
    COMMENT ON POLICY "buildings_select_via_lot_contacts" ON buildings IS
      'Tenants can view buildings containing lots they are linked to (deprecated, use contract_contacts).
       Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION: Fix Remaining auth.uid() Bugs COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED FUNCTIONS:';
  RAISE NOTICE '  1. is_provider_assigned_to_building() - multi-profile check';
  RAISE NOTICE '  2. is_provider_assigned_to_lot() - multi-profile check';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - emails:';
  RAISE NOTICE '  3. "Users can view emails for their interventions"';
  RAISE NOTICE '  4. "Users can view attachments for their interventions"';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - time_slot_responses:';
  RAISE NOTICE '  5. time_slot_responses_insert';
  RAISE NOTICE '  6. time_slot_responses_select';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - company_members:';
  RAISE NOTICE '  7. company_members_select';
  RAISE NOTICE '  8. company_members_insert';
  RAISE NOTICE '  9. company_members_update';
  RAISE NOTICE '  10. company_members_delete';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - time_slots:';
  RAISE NOTICE '  11. time_slots_select (provider_id check)';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - intervention_quotes:';
  RAISE NOTICE '  12. "Providers can view their own quotes"';
  RAISE NOTICE '  13. "Providers can create quotes for their assigned interventions"';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED POLICIES - lot_contacts based (deprecated):';
  RAISE NOTICE '  14. lots_select_via_lot_contacts';
  RAISE NOTICE '  15. buildings_select_via_lot_contacts';
  RAISE NOTICE '';
  RAISE NOTICE 'PATTERN CHANGE:';
  RAISE NOTICE '  BEFORE: user_id = auth.uid() / tm.user_id = auth.uid() / provider_id = auth.uid()';
  RAISE NOTICE '  AFTER:  ... IN (SELECT get_my_profile_ids())';
  RAISE NOTICE '';
  RAISE NOTICE 'TESTING:';
  RAISE NOTICE '  1. Provider multi-equipe: voit emails/devis de toutes ses interventions';
  RAISE NOTICE '  2. Gestionnaire multi-equipe: voit company_members de toutes ses equipes';
  RAISE NOTICE '  3. Time slots: reponses visibles de tous les profils';
  RAISE NOTICE '============================================================================';
END $$;
