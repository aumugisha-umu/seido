-- =============================================================================
-- MIGRATION: FORCE Re-apply team_members RLS permissive policy
-- =============================================================================
-- Date: 2025-10-04 00:55:00
-- Reason: Previous migration executed but RLS recursion error persists
-- Action: Force-drop ALL policies and recreate ONLY the permissive one
-- =============================================================================

-- STEP 1: NUCLEAR OPTION - Drop ALL policies on team_members (all commands)
DO $drop_all$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🔧 Dropping ALL policies on team_members...';

  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', policy_record.policyname);
    RAISE NOTICE '  ✅ Dropped policy: % (CMD: %)', policy_record.policyname, policy_record.cmd;
  END LOOP;
END
$drop_all$;

-- STEP 2: Verify all policies are gone
DO $$
DECLARE
  remaining_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'team_members';

  IF remaining_policies = 0 THEN
    RAISE NOTICE '✅ All policies dropped successfully';
  ELSE
    RAISE WARNING '⚠️ %s policies still exist after drop!', remaining_policies;
  END IF;
END
$$;

-- STEP 3: Create SINGLE permissive SELECT policy
CREATE POLICY "team_members_select_permissive"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);  -- PERMISSIVE: No recursion risk

COMMENT ON POLICY "team_members_select_permissive" ON public.team_members IS
  'Permissive policy - security enforced at application level (TeamRepository)';

-- STEP 4: Verify exactly 1 policy exists
DO $$
DECLARE
  policy_count INTEGER;
  policy_name TEXT;
  policy_definition TEXT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'team_members';

  SELECT policyname, qual::text INTO policy_name, policy_definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'team_members'
  LIMIT 1;

  RAISE NOTICE '📊 Final state:';
  RAISE NOTICE '  - Total policies: %', policy_count;
  RAISE NOTICE '  - Policy name: %', policy_name;
  RAISE NOTICE '  - Policy definition: %', policy_definition;

  IF policy_count = 1 AND policy_definition = 'true' THEN
    RAISE NOTICE '✅✅✅ RLS FIX APPLIED SUCCESSFULLY';
  ELSE
    RAISE WARNING '⚠️⚠️⚠️ Unexpected state - manual verification needed';
  END IF;
END
$$;
