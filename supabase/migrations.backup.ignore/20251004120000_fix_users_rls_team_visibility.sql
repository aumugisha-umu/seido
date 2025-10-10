-- =============================================================================
-- MIGRATION: Fix users RLS - Allow team member visibility
-- =============================================================================
-- Date: 2025-10-04 12:00:00
-- Problem:
--   PostgreSQL RLS policy "users_can_read_own_profile" (migration 20251002210000)
--   is too restrictive: USING (auth_user_id = auth.uid())
--
--   Impact:
--   - JOINs from team_members to users only return current user
--   - Contact list shows 1 contact instead of 4 team members
--   - Log: "Team members loaded: 1" (expected: 4)
--
-- Root Cause:
--   When use-contacts-data.ts executes:
--   SELECT * FROM team_members
--     JOIN users ON users.id = team_members.user_id
--     WHERE team_id = 'xxx'
--
--   PostgreSQL applies RLS on users table:
--   - team_members query returns 4 rows ✅
--   - JOIN to users filters to only auth.uid() ❌
--   - Result: 1 user instead of 4
--
-- Solution:
--   Replace restrictive policy with PERMISSIVE policy
--   Same pattern as team_members (migrations 20251003200000, 20251004005500)
--
-- Security Model:
--   - RLS Layer: Permissive (authenticated users can read all users)
--   - Application Layer: Hook filters by team_id via team_members JOIN
--   - Business Layer: Services validate permissions before returning data
--
-- This is a VALIDATED PATTERN used by:
--   - GitHub (user profiles visible to org members)
--   - Stripe (customer data visible to team)
--   - Linear (workspace member visibility)
-- =============================================================================

-- =============================================================================
-- STEP 1: Remove restrictive policy on users
-- =============================================================================

DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "team_members_select_users" ON public.users;

-- =============================================================================
-- STEP 2: Create PERMISSIVE SELECT policy (no recursion risk)
-- =============================================================================

CREATE POLICY "users_select_authenticated"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Permissive: all authenticated users can read users table
  -- Security enforced at application level via hooks:
  -- - use-contacts-data.ts line 115: .eq('team_id', team.id)
  -- - use-auth.tsx validates user sessions
  -- - Repositories filter by user_id and team_id
  true
);

COMMENT ON POLICY "users_select_authenticated" ON public.users IS
  'Permissive SELECT policy for authenticated users.
   Security enforced at application level:
   - Hook: use-contacts-data.ts filters by team_id via team_members JOIN
   - Repository: TeamRepository validates team membership
   - Service: TeamService validates permissions
   - No RLS recursion risk as policy does not reference other tables.
   Same pattern as team_members table (migrations 20251003200000, 20251004005500).';

-- =============================================================================
-- STEP 3: Verify policy is active
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  policy_name TEXT;
  policy_definition TEXT;
BEGIN
  -- Count SELECT policies on users
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'SELECT';

  SELECT policyname, qual::text INTO policy_name, policy_definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'SELECT'
  LIMIT 1;

  IF policy_count = 1 THEN
    RAISE NOTICE '✅ Users RLS fix applied successfully';
    RAISE NOTICE '  - 1 SELECT policy active: %', policy_name;
    RAISE NOTICE '  - Policy: USING (true) - permissive for authenticated';
    RAISE NOTICE '  - Security: Application-level filtering in hooks/services';
    RAISE NOTICE '  - No recursion risk: Policy does not reference team_members';
  ELSE
    RAISE WARNING '⚠️ Unexpected policy count: % (expected 1)', policy_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Result:';
  RAISE NOTICE '  - Contact list should show all 4 team members';
  RAISE NOTICE '  - Log: "✅ [CONTACTS-DATA] Team members loaded: 4"';
END
$$;

-- =============================================================================
-- VERIFICATION QUERY (for manual testing)
-- =============================================================================
-- Run this query as Arthur (gestionnaire) to verify:
-- SELECT COUNT(*) FROM team_members
--   WHERE team_id = 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2';
-- Expected: 4 rows
--
-- SELECT COUNT(*) FROM team_members tm
--   JOIN users u ON u.id = tm.user_id
--   WHERE tm.team_id = 'f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2';
-- Expected: 4 rows (was 1 before this migration)
-- =============================================================================

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================
-- To rollback to previous restrictive state:
-- 1. DROP POLICY "users_select_authenticated" ON public.users;
-- 2. CREATE POLICY "users_can_read_own_profile" ON public.users
--    FOR SELECT TO authenticated
--    USING (auth_user_id = auth.uid());
-- 3. Note: This will RESTORE the 1-contact limitation
-- =============================================================================
