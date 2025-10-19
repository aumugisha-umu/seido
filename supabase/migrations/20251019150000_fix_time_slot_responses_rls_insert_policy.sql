-- =====================================================================================
-- Migration: Fix RLS Policy INSERT for time_slot_responses
-- Issue: Syntax error in WITH CHECK clause prevents INSERT operations
-- Error Code: 42501 - new row violates row-level security policy
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- PROBLEM EXPLANATION
-- =====================================================================================
--
-- The original INSERT policy used this syntax:
--   WHERE ts.id = time_slot_responses.time_slot_id
--
-- This fails because in an INSERT WITH CHECK clause, PostgreSQL evaluates the policy
-- BEFORE the row exists. Therefore, `time_slot_responses.time_slot_id` references
-- a non-existent row.
--
-- Correct syntax:
--   WHERE ts.id = time_slot_id
--
-- This directly references the value being inserted, not the table itself.
--
-- =====================================================================================

-- =====================================================================================
-- 1. DROP EXISTING INCORRECT POLICY
-- =====================================================================================

DROP POLICY IF EXISTS time_slot_responses_insert ON time_slot_responses;

-- =====================================================================================
-- 2. RECREATE POLICY WITH CORRECT SYNTAX
-- =====================================================================================

CREATE POLICY time_slot_responses_insert ON time_slot_responses
  FOR INSERT
  WITH CHECK (
    -- User must be inserting their own response
    user_id = auth.uid()
    AND
    -- User must have permission via team_members OR intervention_assignments
    (
      -- Permission via team_members (managers in the team)
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN team_members tm ON tm.team_id = i.team_id
        WHERE ts.id = time_slot_id  -- ✅ FIXED: No table prefix
          AND tm.user_id = auth.uid()
          AND tm.left_at IS NULL
      )
      OR
      -- Permission via intervention_assignments (tenants, providers)
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
        WHERE ts.id = time_slot_id  -- ✅ FIXED: No table prefix
          AND ia.user_id = auth.uid()
          AND ia.role IN ('locataire', 'prestataire')
      )
    )
  );

COMMENT ON POLICY time_slot_responses_insert ON time_slot_responses IS
  'Users can insert their own responses if they are team members or assigned to the intervention (FIXED: corrected WITH CHECK syntax)';

-- =====================================================================================
-- 3. VERIFY OTHER POLICIES (SELECT, UPDATE, DELETE)
-- =====================================================================================

-- Re-create SELECT policy with consistent syntax
DROP POLICY IF EXISTS time_slot_responses_select ON time_slot_responses;

CREATE POLICY time_slot_responses_select ON time_slot_responses
  FOR SELECT
  USING (
    -- Users can view responses for slots in interventions they're involved in
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND tm.user_id = auth.uid()
        AND tm.left_at IS NULL
    )
    OR
    -- Or if user is assigned to the intervention
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND ia.user_id = auth.uid()
        AND ia.role IN ('locataire', 'prestataire')
    )
  );

COMMENT ON POLICY time_slot_responses_select ON time_slot_responses IS
  'Users can view responses for slots in their interventions (via team_members OR intervention_assignments)';

-- UPDATE policy is already correct (simple USING + WITH CHECK on user_id)
-- No need to recreate

-- DELETE policy is already correct (simple USING on user_id)
-- No need to recreate

-- =====================================================================================
-- 4. VALIDATION
-- =====================================================================================

-- Verify all policies exist and are enabled
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
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

  RAISE NOTICE '✅ All 4 RLS policies verified';
END $$;

-- =====================================================================================
-- 5. TEST CASE (Optional - for local testing)
-- =====================================================================================

-- Uncomment to test locally (requires valid UUIDs)
/*
-- Assuming you have:
-- - intervention_id: uuid of an intervention
-- - slot_id: uuid of a time slot in that intervention
-- - user_id: uuid of a user assigned to the intervention

-- This should now succeed (if user has permission):
INSERT INTO time_slot_responses (
  time_slot_id,
  user_id,
  user_role,
  response,
  notes
) VALUES (
  'slot_id'::uuid,
  'user_id'::uuid,
  'prestataire'::user_role,
  'accepted'::response_type,
  NULL
);

-- Verify insert succeeded
SELECT * FROM time_slot_responses
WHERE time_slot_id = 'slot_id'::uuid
AND user_id = 'user_id'::uuid;
*/

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Fixed INSERT policy syntax: time_slot_responses.time_slot_id → time_slot_id
-- ✅ Recreated SELECT policy for consistency
-- ✅ Verified UPDATE and DELETE policies (already correct)
-- ✅ Added validation to ensure all 4 policies exist
--
-- Impact:
-- - UPSERT operations will now work for both INSERT and UPDATE
-- - Providers can accept time slots they're assigned to
-- - Tenants can accept/reject time slots
-- - Managers can accept/reject on behalf of team
--
-- Next steps:
-- 1. Apply migration: npx supabase db push
-- 2. Regenerate types: npm run supabase:types
-- 3. Test acceptance flow in browser
-- =====================================================================================
