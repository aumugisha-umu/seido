-- =============================================================================
-- MIGRATION: Fix Service Role Access to Users Table
-- =============================================================================
-- Date: 2025-10-02 23:00:00
-- Problem:
--   Service role key cannot read users table in E2E tests because current
--   RLS policies only check auth.uid() which is NULL for service role.
-- Solution:
--   Add explicit policies to allow service role to bypass RLS for testing
--   and administrative operations.
-- =============================================================================

-- =============================================================================
-- STEP 1: Add Service Role Bypass Policies
-- =============================================================================

-- Allow service_role to read all users (for testing and admin operations)
CREATE POLICY "users_select_service_role"
ON public.users
FOR SELECT
TO service_role
USING (true);

-- Allow service_role to read all team_members (for testing and admin operations)
CREATE POLICY "team_members_select_service_role"
ON public.team_members
FOR SELECT
TO service_role
USING (true);

-- =============================================================================
-- STEP 2: Ensure postgres role also has access (for migrations and admin)
-- =============================================================================

-- Allow postgres role to read all users
CREATE POLICY "users_select_postgres"
ON public.users
FOR SELECT
TO postgres
USING (true);

-- Allow postgres role to read all team_members
CREATE POLICY "team_members_select_postgres"
ON public.team_members
FOR SELECT
TO postgres
USING (true);

-- =============================================================================
-- STEP 3: Verification
-- =============================================================================

-- Log the new policies
DO $$
DECLARE
  policy_count int;
BEGIN
  -- Count policies on users table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';

  RAISE NOTICE '✅ Service role access policies added';
  RAISE NOTICE '  - users table now has % SELECT policies', policy_count;
  RAISE NOTICE '  - service_role can now read all records for testing';
  RAISE NOTICE '  - postgres role can now read all records for admin';
  RAISE NOTICE '  - authenticated users still limited to own profile (security maintained)';
END
$$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show all SELECT policies on users table
SELECT
    policyname,
    roles::text,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'SELECT'
ORDER BY policyname;