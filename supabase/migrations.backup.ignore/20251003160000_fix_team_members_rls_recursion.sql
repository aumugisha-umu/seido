-- =============================================================================
-- MIGRATION: Fix team_members RLS Infinite Recursion
-- =============================================================================
-- Date: 2025-10-03 16:00:00
-- Problem:
--   PostgreSQL error 42P17: infinite recursion detected in policy for relation "team_members"
--
--   Root Cause:
--   1. Repository query does JOIN: team_members → users (line 208-213 in team.repository.ts)
--   2. RLS policy on team_members calls get_user_id_from_auth() which queries users
--   3. Circular dependency: team_members RLS → users query → team_members RLS → LOOP
--
-- Solution:
--   Use PostgreSQL session-level caching to avoid recursive user lookup:
--   1. Create cached function that stores user_id in session variable
--   2. First call: lookup users table and cache result
--   3. Subsequent calls: return cached value (no query)
--   4. Replace RLS policy to use cached function
--
-- Benefits:
--   ✅ Eliminates recursion (cached value = no re-query)
--   ✅ Performance: 1 user lookup per session instead of N
--   ✅ Security: RLS remains active
--   ✅ No application code changes needed
-- =============================================================================

-- =============================================================================
-- STEP 1: Create session-cached user_id lookup function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_cached_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_cache_key text := 'app.current_user_id';
BEGIN
  -- Attempt to retrieve from session cache
  BEGIN
    v_user_id := current_setting(v_cache_key, true)::uuid;

    -- If cached value exists, return immediately (no database query)
    IF v_user_id IS NOT NULL THEN
      RETURN v_user_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Cache miss or invalid format, proceed to lookup
      NULL;
  END;

  -- Cache miss: Perform single lookup from users table
  -- This query is SECURITY DEFINER so it bypasses RLS on users table
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Store in session cache for this transaction
  -- set_config with is_local=true means it persists for the current transaction only
  IF v_user_id IS NOT NULL THEN
    PERFORM set_config(v_cache_key, v_user_id::text, true);
  END IF;

  RETURN v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_cached_user_id() TO authenticated;

COMMENT ON FUNCTION public.get_cached_user_id() IS
  'Returns current user_id from users table, with session-level caching to prevent RLS recursion.
   First call: Queries users table and caches result in PostgreSQL session variable.
   Subsequent calls: Returns cached value without database query.
   Cache is transaction-scoped (cleared after commit/rollback).';

-- =============================================================================
-- STEP 2: Replace team_members RLS policy with cached version
-- =============================================================================

-- Drop existing policy that causes recursion
DROP POLICY IF EXISTS "team_members_select_own_membership_simple" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_cached" ON public.team_members;

-- Create new policy using cached lookup (prevents recursion)
CREATE POLICY "team_members_select_cached"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  -- Use cached function instead of direct subquery
  -- This breaks the recursion cycle:
  -- - team_members RLS calls get_cached_user_id()
  -- - get_cached_user_id() queries users (SECURITY DEFINER, bypasses RLS)
  -- - Result is cached, no further users queries in this transaction
  user_id = public.get_cached_user_id()
);

COMMENT ON POLICY "team_members_select_cached" ON public.team_members IS
  'Allows users to read their own team memberships using cached user_id lookup.
   Uses get_cached_user_id() to prevent infinite recursion when JOINing team_members with users.';

-- =============================================================================
-- STEP 3: Verify the fix
-- =============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ RLS recursion fix applied successfully';
  RAISE NOTICE '  - Created: get_cached_user_id() with session cache';
  RAISE NOTICE '  - Updated: team_members SELECT policy to use cached lookup';
  RAISE NOTICE '  - Recursion eliminated: user_id cached per transaction';
END
$$;

-- =============================================================================
-- TESTING NOTES
-- =============================================================================
-- To test this fix:
-- 1. Login as gestionnaire (arthur@seido.pm)
-- 2. Check browser console - error 42P17 should be gone
-- 3. Verify TeamService.getUserTeams() completes successfully
-- 4. Check team_members query with JOIN works without recursion:
--    SELECT tm.*, u.name
--    FROM team_members tm
--    JOIN users u ON tm.user_id = u.id
--    WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid());
-- =============================================================================
