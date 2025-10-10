-- =============================================================================
-- MIGRATION: Remove residual restrictive policy on users
-- =============================================================================
-- Date: 2025-10-04 12:02:00
-- Problem:
--   Diagnostic shows 4 SELECT policies on users table:
--   1. users_select_authenticated (USING true) ✅ Our new permissive policy
--   2. users_select_own_profile_simple (USING auth_user_id = auth.uid()) ❌ RESTRICTIVE
--   3. users_select_postgres (USING true) - For postgres role
--   4. users_select_service_role (USING true) - For service_role
--
--   PostgreSQL applies SELECT policies in AND mode (restrictive):
--   - Query must pass ALL SELECT policies
--   - users_select_own_profile_simple filters to only current user
--   - Result: Still only 1 contact visible instead of 4
--
-- Solution:
--   Drop the residual restrictive policy users_select_own_profile_simple
--   Keep only:
--   - users_select_authenticated (permissive for authenticated users)
--   - users_select_postgres (for database admin)
--   - users_select_service_role (for backend service)
-- =============================================================================

-- =============================================================================
-- STEP 1: Remove residual restrictive policy
-- =============================================================================

DO $$
BEGIN
  -- Drop the restrictive policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_own_profile_simple'
  ) THEN
    DROP POLICY "users_select_own_profile_simple" ON public.users;
    RAISE NOTICE '✅ Dropped restrictive policy: users_select_own_profile_simple';
  ELSE
    RAISE NOTICE '⚠️ Policy users_select_own_profile_simple does not exist';
  END IF;
END
$$;

-- =============================================================================
-- STEP 2: Verify final state
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  select_policy_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  -- Count SELECT policies
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'SELECT';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Users table RLS - Final State';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE 'SELECT policies: %', select_policy_count;
  RAISE NOTICE '';

  -- List SELECT policies
  FOR policy_record IN (
    SELECT policyname, qual::text as definition
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '📋 %: %', policy_record.policyname, policy_record.definition;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Behavior:';
  RAISE NOTICE '  - Authenticated users can see all users (permissive)';
  RAISE NOTICE '  - Application filters by team_id via team_members JOIN';
  RAISE NOTICE '  - Contact list should show all 4 team members';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
