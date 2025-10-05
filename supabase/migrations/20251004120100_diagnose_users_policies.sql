-- =============================================================================
-- DIAGNOSTIC: List all policies on users table
-- =============================================================================

DO $$
DECLARE
  policy_record RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Diagnostic: Policies on users table';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  -- Count all policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  RAISE NOTICE 'Total policies on users: %', policy_count;
  RAISE NOTICE '';

  -- List all policies
  FOR policy_record IN (
    SELECT policyname, cmd, qual::text as definition
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '📋 Policy: %', policy_record.policyname;
    RAISE NOTICE '   Command: %', policy_record.cmd;
    RAISE NOTICE '   Definition: %', policy_record.definition;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
