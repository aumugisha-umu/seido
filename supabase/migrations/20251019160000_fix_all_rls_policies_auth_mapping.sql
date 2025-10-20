-- =====================================================================================
-- Migration: Fix All RLS Policies - Auth UID to Public Users ID Mapping
-- Issue: Policies incorrectly compare auth.uid() (auth.users.id) with user_id (public.users.id)
-- Error: 42501 - new row violates row-level security policy
-- Solution: Create helper function to map auth.uid() → public.users.id
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- PROBLEM EXPLANATION
-- =====================================================================================
--
-- Supabase Architecture has TWO user tables:
--
-- 1. auth.users (Supabase Auth internal)
--    - Managed by Supabase Auth
--    - auth.uid() returns auth.users.id
--
-- 2. public.users (Custom user table)
--    - Contains user profile data
--    - Column: id (UUID) ← Used in FK relationships
--    - Column: auth_user_id (UUID) ← References auth.users.id
--
-- Current RLS policies incorrectly do:
--   WHERE user_id = auth.uid()
--
-- This compares:
--   public.users.id (in user_id column) with auth.users.id (from auth.uid())
--
-- These are DIFFERENT UUIDs, causing RLS to always fail!
--
-- Correct approach:
--   WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
--
-- Or use a helper function for performance and clarity.
--
-- =====================================================================================

-- =====================================================================================
-- 1. CREATE HELPER FUNCTION FOR AUTH MAPPING
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_id_from_auth() IS
  'Maps Supabase auth.uid() to public.users.id via auth_user_id column. Used in RLS policies.';

-- =====================================================================================
-- 2. FIX time_slot_responses RLS POLICIES
-- =====================================================================================

-- DROP ALL EXISTING INCORRECT POLICIES
DROP POLICY IF EXISTS time_slot_responses_select ON time_slot_responses;
DROP POLICY IF EXISTS time_slot_responses_insert ON time_slot_responses;
DROP POLICY IF EXISTS time_slot_responses_update ON time_slot_responses;
DROP POLICY IF EXISTS time_slot_responses_delete ON time_slot_responses;

-- =====================================================================================
-- 2.1 SELECT POLICY (CORRECTED)
-- =====================================================================================

CREATE POLICY time_slot_responses_select ON time_slot_responses
  FOR SELECT
  USING (
    -- Users can view responses for slots in interventions they're involved in
    -- via team_members (managers)
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND tm.user_id = get_user_id_from_auth()  -- ✅ FIXED: Use helper function
        AND tm.left_at IS NULL
    )
    OR
    -- OR via intervention_assignments (tenants, providers)
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND ia.user_id = get_user_id_from_auth()  -- ✅ FIXED: Use helper function
        AND ia.role IN ('locataire', 'prestataire')
    )
  );

COMMENT ON POLICY time_slot_responses_select ON time_slot_responses IS
  'Users can view responses for slots in their interventions (via team_members OR intervention_assignments). Uses get_user_id_from_auth() for correct identity mapping.';

-- =====================================================================================
-- 2.2 INSERT POLICY (CORRECTED)
-- =====================================================================================

CREATE POLICY time_slot_responses_insert ON time_slot_responses
  FOR INSERT
  WITH CHECK (
    -- User must be inserting their own response
    user_id = get_user_id_from_auth()  -- ✅ FIXED: Use helper function
    AND
    -- User must have permission via team_members OR intervention_assignments
    (
      -- Permission via team_members (managers in the team)
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN team_members tm ON tm.team_id = i.team_id
        WHERE ts.id = time_slot_id  -- No table prefix in WITH CHECK
          AND tm.user_id = get_user_id_from_auth()  -- ✅ FIXED: Use helper function
          AND tm.left_at IS NULL
      )
      OR
      -- Permission via intervention_assignments (tenants, providers)
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
        WHERE ts.id = time_slot_id  -- No table prefix in WITH CHECK
          AND ia.user_id = get_user_id_from_auth()  -- ✅ FIXED: Use helper function
          AND ia.role IN ('locataire', 'prestataire')
      )
    )
  );

COMMENT ON POLICY time_slot_responses_insert ON time_slot_responses IS
  'Users can insert their own responses if they are team members or assigned to the intervention. Uses get_user_id_from_auth() for correct identity mapping.';

-- =====================================================================================
-- 2.3 UPDATE POLICY (CORRECTED)
-- =====================================================================================

CREATE POLICY time_slot_responses_update ON time_slot_responses
  FOR UPDATE
  USING (user_id = get_user_id_from_auth())  -- ✅ FIXED: Use helper function
  WITH CHECK (user_id = get_user_id_from_auth());  -- ✅ FIXED: Use helper function

COMMENT ON POLICY time_slot_responses_update ON time_slot_responses IS
  'Users can update their own responses. Uses get_user_id_from_auth() for correct identity mapping.';

-- =====================================================================================
-- 2.4 DELETE POLICY (CORRECTED)
-- =====================================================================================

CREATE POLICY time_slot_responses_delete ON time_slot_responses
  FOR DELETE
  USING (user_id = get_user_id_from_auth());  -- ✅ FIXED: Use helper function

COMMENT ON POLICY time_slot_responses_delete ON time_slot_responses IS
  'Users can delete (withdraw) their own responses. Uses get_user_id_from_auth() for correct identity mapping.';

-- =====================================================================================
-- 3. VALIDATION
-- =====================================================================================

-- Verify all 4 policies exist and are enabled
DO $$
DECLARE
  policy_count INTEGER;
  helper_exists BOOLEAN;
BEGIN
  -- Check helper function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_user_id_from_auth'
  ) INTO helper_exists;

  IF NOT helper_exists THEN
    RAISE EXCEPTION 'Migration failed: Helper function get_user_id_from_auth() not found';
  END IF;

  -- Check all policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'time_slot_responses'
    AND policyname IN (
      'time_slot_responses_select',
      'time_slot_responses_insert',
      'time_slot_responses_update',
      'time_slot_responses_delete'
    );

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Migration failed: Expected 4 RLS policies, found %', policy_count;
  END IF;

  RAISE NOTICE '✅ Helper function created';
  RAISE NOTICE '✅ All 4 RLS policies corrected with auth mapping';
  RAISE NOTICE '📋 Policies now use get_user_id_from_auth() for identity resolution';
END $$;

-- =====================================================================================
-- 4. VERIFICATION QUERY (For manual testing)
-- =====================================================================================

-- Uncomment to verify the mapping works correctly:
/*
SELECT
  auth.uid() as auth_user_id,
  get_user_id_from_auth() as public_user_id,
  u.id as direct_user_id,
  u.email,
  u.name
FROM public.users u
WHERE u.auth_user_id = auth.uid();

-- Should return 1 row with matching public_user_id and direct_user_id
*/

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Created helper function get_user_id_from_auth()
-- ✅ Fixed SELECT policy: Uses helper for tm.user_id and ia.user_id
-- ✅ Fixed INSERT policy: Uses helper for user_id and tm.user_id/ia.user_id
-- ✅ Fixed UPDATE policy: Uses helper for user_id (USING and WITH CHECK)
-- ✅ Fixed DELETE policy: Uses helper for user_id
-- ✅ Validated all policies exist
--
-- Impact:
-- - RLS policies now correctly map auth.uid() to public.users.id
-- - UPSERT operations will work (both INSERT and UPDATE paths)
-- - Providers can accept time slots they're assigned to
-- - Tenants can accept/reject time slots
-- - Managers can accept/reject on behalf of team
--
-- Technical Details:
-- - Helper function marked as STABLE for query caching
-- - SECURITY DEFINER allows access to public.users
-- - No table prefix in WITH CHECK (time_slot_id, not time_slot_responses.time_slot_id)
--
-- Next steps:
-- 1. Apply migration: npx supabase db push
-- 2. Regenerate types: npm run supabase:types
-- 3. Test acceptance flow in browser with DevTools console open
-- 4. Verify logs show: ✅ Response upserted successfully
-- =====================================================================================
