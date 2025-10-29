-- Migration: Fix team_members RLS for client-side queries
-- Problem: get_user_teams_v2() function can't query team_members due to RLS recursion
--
-- Root Cause:
-- 1. Client query: SELECT * FROM team_members WHERE user_id = 'xxx'
-- 2. RLS policy checks: team_id IN (SELECT get_user_teams_v2())
-- 3. get_user_teams_v2() queries: SELECT team_id FROM team_members WHERE ...
-- 4. But team_members RLS is still enabled → creates recursion or returns empty
--
-- Solution:
-- Add direct RLS policy for team_members that doesn't rely on get_user_teams_v2()
-- Allow users to see their own team_members records directly via auth.uid()

-- ============================================================================
-- DROP EXISTING POLICY
-- ============================================================================

DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- ============================================================================
-- CREATE NEW COMPREHENSIVE SELECT POLICY
-- ============================================================================

CREATE POLICY "team_members_select" ON team_members
FOR SELECT
TO authenticated
USING (
  -- OPTION 1: User views their own team memberships
  -- Direct check via auth.uid() → users.auth_user_id → team_members.user_id
  -- This is the PRIMARY path for client queries and avoids recursion
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )

  OR

  -- OPTION 2: User views other members of their teams
  -- Uses get_user_teams_v2() which is SECURITY DEFINER and bypasses RLS
  -- This works for viewing OTHER people's memberships
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "team_members_select" ON team_members IS
  'Users can view:
   1. Their own team memberships (direct via auth.uid())
   2. All members of their teams (via get_user_teams_v2())

   Option 1 is critical for client queries to avoid RLS recursion.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test query that should now work:
-- SELECT * FROM team_members WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid());
