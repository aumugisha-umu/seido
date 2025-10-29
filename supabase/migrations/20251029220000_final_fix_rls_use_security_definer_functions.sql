-- Migration: Final Fix for RLS Infinite Recursion Using SECURITY DEFINER Functions
-- Problem: Migrations 20251029214500 and 20251029215500 created recursion by using direct subqueries
-- Solution: Revert to Phase 1 pattern using SECURITY DEFINER helper functions that bypass RLS
--
-- Root Cause Analysis:
-- 1. users RLS policy queried users table directly → triggered RLS again → recursion
-- 2. team_members RLS policy queried users table → triggered users RLS → which queries team_members → recursion
--
-- The Fix:
-- Use existing SECURITY DEFINER helper functions that execute with elevated privileges and bypass RLS:
-- - get_user_id_from_auth() - Returns users.id from auth.uid()
-- - get_user_teams_v2() - Returns team IDs for current user
-- - get_current_user_role() - Returns user's role
--
-- These functions are already defined in Phase 1 migration (20251009000001)

-- ============================================================================
-- STEP 1: DROP BROKEN POLICIES FROM PREVIOUS MIGRATIONS
-- ============================================================================

-- Drop users policies from 20251029215500 (these cause recursion)
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
DROP POLICY IF EXISTS "users_select_team_members_managers" ON users;
DROP POLICY IF EXISTS "users_select_limited_access" ON users;

-- Drop team_members policy from 20251029214500/20251029215500
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- ============================================================================
-- STEP 2: CREATE CORRECT USERS POLICIES USING SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Policy 1: Users can always see their own profile
-- SAFE: Uses auth.uid() directly (no table queries, no recursion)
CREATE POLICY "users_select_own_profile" ON users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

COMMENT ON POLICY "users_select_own_profile" ON users IS
  'Users can see their own profile (direct auth.uid() check, no recursion risk)';

-- Policy 2: Gestionnaires/Admins can see users in their teams
-- SAFE: Uses get_current_user_role() and get_user_teams_v2() which are SECURITY DEFINER
CREATE POLICY "users_select_team_members_managers" ON users
FOR SELECT
TO authenticated
USING (
  -- Check user is gestionnaire or admin (uses SECURITY DEFINER function)
  get_current_user_role() IN ('gestionnaire', 'admin')
  AND (
    -- See users in same team (uses SECURITY DEFINER function)
    team_id IN (SELECT get_user_teams_v2())
    OR
    -- See all members of their teams (queries team_members, uses helper for team check)
    id IN (
      SELECT tm.user_id
      FROM team_members tm
      WHERE tm.team_id IN (SELECT get_user_teams_v2())
        AND tm.left_at IS NULL
    )
  )
);

COMMENT ON POLICY "users_select_team_members_managers" ON users IS
  'Gestionnaires/Admins see team members (uses SECURITY DEFINER helpers to avoid recursion)';

-- Policy 3: Locataires/Prestataires can see managers and other members
-- SAFE: Uses get_current_user_role() and get_user_teams_v2() which are SECURITY DEFINER
CREATE POLICY "users_select_limited_access" ON users
FOR SELECT
TO authenticated
USING (
  -- Check user is locataire or prestataire (uses SECURITY DEFINER function)
  get_current_user_role() IN ('locataire', 'prestataire')
  AND (
    -- See gestionnaires/admins in same teams
    (
      role IN ('gestionnaire', 'admin')
      AND team_id IN (SELECT get_user_teams_v2())
    )
    OR
    -- See other members in same teams
    id IN (
      SELECT tm.user_id
      FROM team_members tm
      WHERE tm.team_id IN (SELECT get_user_teams_v2())
        AND tm.left_at IS NULL
    )
  )
);

COMMENT ON POLICY "users_select_limited_access" ON users IS
  'Locataires/Prestataires see managers and members (uses SECURITY DEFINER helpers to avoid recursion)';

-- ============================================================================
-- STEP 3: CREATE CORRECT TEAM_MEMBERS POLICY USING SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Policy: Users can view their own memberships and members of their teams
-- SAFE: Uses get_user_id_from_auth() and get_user_teams_v2() which are SECURITY DEFINER
CREATE POLICY "team_members_select" ON team_members
FOR SELECT
TO authenticated
USING (
  -- User views their own team memberships (uses SECURITY DEFINER function)
  user_id = get_user_id_from_auth()
  OR
  -- User views members of their teams (uses SECURITY DEFINER function)
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "team_members_select" ON team_members IS
  'Users can view their own memberships and members of their teams (uses SECURITY DEFINER helpers to avoid recursion)';

-- ============================================================================
-- VERIFICATION & EXPLANATION
-- ============================================================================

COMMENT ON TABLE users IS
  'Users table with RLS policies that use SECURITY DEFINER helper functions.

   WHY THIS WORKS:
   - Helper functions (get_user_id_from_auth, get_user_teams_v2, get_current_user_role)
     are marked SECURITY DEFINER STABLE
   - SECURITY DEFINER = function executes with creator privileges (bypasses RLS)
   - When a policy calls these functions, they query tables WITHOUT triggering RLS again
   - This breaks the circular dependency: users ↔ team_members

   WHY PREVIOUS MIGRATIONS FAILED:
   - Migrations 20251029214500 and 20251029215500 used direct subqueries
   - Direct subquery: SELECT ... FROM users WHERE ... (triggers users RLS again)
   - This created infinite recursion

   THE PATTERN:
   ❌ Bad:  RLS policy queries same table directly → recursion
   ✅ Good: RLS policy uses SECURITY DEFINER helper → bypasses RLS → no recursion';

COMMENT ON TABLE team_members IS
  'Team members table with RLS policy that uses SECURITY DEFINER helper functions.

   Uses get_user_id_from_auth() and get_user_teams_v2() to avoid recursion.
   These functions bypass RLS when querying users and team_members tables.';

-- ============================================================================
-- TEST QUERIES (for verification after migration)
-- ============================================================================

-- These queries should now work without recursion:
--
-- 1. Get own profile:
--    SELECT * FROM users WHERE auth_user_id = auth.uid();
--
-- 2. Get own team memberships:
--    SELECT * FROM team_members WHERE user_id = get_user_id_from_auth();
--
-- 3. Get all users in my teams:
--    SELECT * FROM users WHERE team_id IN (SELECT get_user_teams_v2());
--
-- 4. Get all members of my teams:
--    SELECT * FROM team_members WHERE team_id IN (SELECT get_user_teams_v2());
--
-- 5. Cross-table query:
--    SELECT u.* FROM users u
--    JOIN team_members tm ON tm.user_id = u.id
--    WHERE tm.team_id IN (SELECT get_user_teams_v2());
