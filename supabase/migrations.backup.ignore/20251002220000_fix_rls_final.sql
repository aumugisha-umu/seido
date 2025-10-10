-- =============================================================================
-- MIGRATION: Final RLS Fix - Eliminate ALL Recursion
-- =============================================================================
-- Date: 2025-10-02 22:00:00 (local)
-- Problem:
--   Auth confirmation creates session, which loads user profile, which triggers
--   RLS policies that check team_members, which triggers policies that check users
--   → infinite recursion loop.
-- Solution (DEFINITIVE):
--   1) Drop ALL SELECT policies on users and team_members
--   2) Create ULTRA-SIMPLE policies that NEVER cross-reference tables
--   3) For users: only auth_user_id = auth.uid()
--   4) For team_members: only user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
--      BUT with SECURITY DEFINER bypass to avoid recursion
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop ALL existing SELECT policies to start fresh
-- =============================================================================

DO $plpgsql$
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop all SELECT policies on users
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
  END LOOP;

  -- Drop all SELECT policies on team_members
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
      AND cmd = 'SELECT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', policy_record.policyname);
  END LOOP;
END
$plpgsql$;

-- =============================================================================
-- STEP 2: Create helper function to get user_id from auth.uid() (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_from_auth() TO authenticated;

-- =============================================================================
-- STEP 3: Create ULTRA-SIMPLE SELECT policies
-- =============================================================================

-- USERS: Only allow reading own profile via auth_user_id
CREATE POLICY "users_select_own_profile_simple"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- TEAM_MEMBERS: Allow reading own team memberships using helper function
CREATE POLICY "team_members_select_own_membership_simple"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  user_id = public.get_user_id_from_auth()
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies recreated with zero recursion risk';
  RAISE NOTICE '  - users: SELECT via auth_user_id = auth.uid() only';
  RAISE NOTICE '  - team_members: SELECT via SECURITY DEFINER helper';
END
$$;
