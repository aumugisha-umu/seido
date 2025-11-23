-- ============================================================================
-- Migration: Add INSERT Policy for activity_logs
-- Date: 2025-11-23 18:35:51
-- ============================================================================
-- Problem: activity_logs table has RLS enabled but NO INSERT policy
-- This causes all INSERT attempts to fail with 400 PGRST204 error
--
-- Solution: Add INSERT policy that allows authenticated users to create logs
-- for their own teams
-- ============================================================================

-- ============================================================================
-- STEP 1: Add INSERT policy for activity_logs
-- ============================================================================

CREATE POLICY "activity_logs_insert"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be creating log for a team they belong to
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = get_current_user_id()
  )
  -- AND user_id must be the authenticated user (can't log as someone else)
  AND user_id = get_current_user_id()
);

COMMENT ON POLICY "activity_logs_insert" ON public.activity_logs IS
  'Allows authenticated users to create activity logs for teams they belong to. Ensures user_id matches current user.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  -- Verify the policy was created
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'activity_logs'
    AND policyname = 'activity_logs_insert';
  
  IF v_policy_count = 1 THEN
    RAISE NOTICE '✅ Policy activity_logs_insert created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create activity_logs_insert policy';
  END IF;
  
  -- Verify RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'activity_logs'
      AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS is enabled on activity_logs';
  ELSE
    RAISE WARNING '⚠️ RLS is NOT enabled on activity_logs';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- This migration adds the missing INSERT policy for activity_logs.
--
-- Security considerations:
-- 1. Users can only create logs for teams they're members of
-- 2. Users cannot impersonate others (user_id must match current user)
-- 3. Uses get_current_user_id() helper for proper auth.uid() -> users.id mapping
--
-- Testing:
-- - Authenticated users should be able to insert activity logs
-- - Users should NOT be able to insert logs for teams they don't belong to
-- - Users should NOT be able to insert logs with a different user_id
-- ============================================================================

