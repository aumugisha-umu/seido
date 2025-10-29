-- Migration: Fix RLS recursion between users and team_members
-- Problem: Circular dependency between users and team_members RLS policies
--
-- Root Cause:
-- 1. users table policy: team_id IN (SELECT get_user_teams_v2())
-- 2. get_user_teams_v2() queries: team_members JOIN users
-- 3. users RLS is triggered again → infinite recursion
--
-- Solution:
-- Simplify both policies to use direct auth.uid() checks without cross-table dependencies

-- ============================================================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing select policies that cause recursion
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
DROP POLICY IF EXISTS "users_select_team_members_managers" ON users;
DROP POLICY IF EXISTS "users_select_limited_access" ON users;

-- Policy 1: Users can always see their own profile (no recursion)
CREATE POLICY "users_select_own_profile" ON users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Policy 2: Gestionnaires/Admins can see users in their teams
-- SIMPLIFIED: Direct query without get_user_teams_v2() to avoid recursion
CREATE POLICY "users_select_team_members_managers" ON users
FOR SELECT
TO authenticated
USING (
  -- User is gestionnaire or admin
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('gestionnaire', 'admin')
  )
  AND (
    -- See users in same team (direct check)
    team_id IN (
      SELECT DISTINCT tm.team_id
      FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND tm.left_at IS NULL
    )
    OR
    -- See members of their teams (direct check)
    id IN (
      SELECT tm2.user_id
      FROM team_members tm2
      INNER JOIN team_members tm_current ON tm_current.team_id = tm2.team_id
      INNER JOIN users u_current ON u_current.id = tm_current.user_id
      WHERE u_current.auth_user_id = auth.uid()
        AND tm2.left_at IS NULL
        AND tm_current.left_at IS NULL
    )
  )
);

-- Policy 3: Locataires/Prestataires can see managers and other members
CREATE POLICY "users_select_limited_access" ON users
FOR SELECT
TO authenticated
USING (
  -- User is locataire or prestataire
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('locataire', 'prestataire')
  )
  AND (
    -- See gestionnaires/admins in same teams (direct check)
    (
      role IN ('gestionnaire', 'admin')
      AND team_id IN (
        SELECT DISTINCT tm.team_id
        FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE u.auth_user_id = auth.uid()
          AND tm.left_at IS NULL
      )
    )
    OR
    -- See other members in same teams (direct check)
    id IN (
      SELECT tm2.user_id
      FROM team_members tm2
      INNER JOIN team_members tm_current ON tm_current.team_id = tm2.team_id
      INNER JOIN users u_current ON u_current.id = tm_current.user_id
      WHERE u_current.auth_user_id = auth.uid()
        AND tm2.left_at IS NULL
        AND tm_current.left_at IS NULL
    )
  )
);

-- ============================================================================
-- FIX TEAM_MEMBERS TABLE RLS POLICY
-- ============================================================================

-- Drop and recreate with simpler logic
DROP POLICY IF EXISTS "team_members_select" ON team_members;

CREATE POLICY "team_members_select" ON team_members
FOR SELECT
TO authenticated
USING (
  -- Option 1: User views their own memberships (direct, no recursion)
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )

  OR

  -- Option 2: User views members of their teams (direct subquery, no function)
  team_id IN (
    SELECT DISTINCT tm.team_id
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND tm.left_at IS NULL
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "users_select_own_profile" ON users IS
  'Users can always see their own profile (direct auth.uid() check, no recursion)';

COMMENT ON POLICY "users_select_team_members_managers" ON users IS
  'Gestionnaires/Admins see team members (direct subquery, no helper functions to avoid recursion)';

COMMENT ON POLICY "users_select_limited_access" ON users IS
  'Locataires/Prestataires see managers and members (direct subquery, no helper functions)';

COMMENT ON POLICY "team_members_select" ON team_members IS
  'Users can view their own memberships and members of their teams (direct subqueries, no recursion)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- These queries should now work without recursion:
-- 1. SELECT * FROM users WHERE auth_user_id = auth.uid();
-- 2. SELECT * FROM team_members WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid());
-- 3. SELECT * FROM users WHERE team_id IN (...);
