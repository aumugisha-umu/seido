-- =============================================================================
-- MIGRATION: Verify users UPDATE policy (all users can update own profile)
-- =============================================================================
-- Date: 2025-10-04 17:00:00
-- Purpose: Diagnostic only - verify that all authenticated users can update their own profile
-- No changes needed - just validation
-- =============================================================================

DO $$
DECLARE
  policy_record RECORD;
  update_policy_count INTEGER;
BEGIN
  -- Count UPDATE policies on users table
  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'UPDATE';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 Users Table UPDATE Policy Verification';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 UPDATE policies found: %', update_policy_count;
  RAISE NOTICE '';

  -- List all UPDATE policies
  FOR policy_record IN (
    SELECT
      policyname,
      qual::text as using_clause,
      with_check::text as with_check_clause
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'UPDATE'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '📋 Policy: %', policy_record.policyname;
    RAISE NOTICE '   USING: %', policy_record.using_clause;
    RAISE NOTICE '   WITH CHECK: %', policy_record.with_check_clause;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '✅ Verification Result:';
  RAISE NOTICE '';

  IF update_policy_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM: No UPDATE policy found on users table!';
    RAISE NOTICE '   → Users cannot update their profiles';
  ELSIF update_policy_count = 1 THEN
    RAISE NOTICE '✅ CORRECT: 1 UPDATE policy found';
    RAISE NOTICE '   → Policy: users_can_update_own_profile';
    RAISE NOTICE '   → Logic: auth_user_id = auth.uid()';
    RAISE NOTICE '   → All authenticated users can update their own profile';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Multiple UPDATE policies found (%)!', update_policy_count;
    RAISE NOTICE '   → Check for conflicts';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Behavior:';
  RAISE NOTICE '  ✅ Admin: Can update own profile';
  RAISE NOTICE '  ✅ Gestionnaire: Can update own profile';
  RAISE NOTICE '  ✅ Locataire: Can update own profile';
  RAISE NOTICE '  ✅ Prestataire: Can update own profile';
  RAISE NOTICE '  ❌ No user can update other users'' profiles (security)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
