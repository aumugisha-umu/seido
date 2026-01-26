-- Migration: Cascade delete all team data including auth users
-- Purpose: Development helper - when a team is deleted, all related data is cleaned up
--
-- WARNING: This is destructive and meant for development environments only!
--
-- Changes:
-- 1. Change users.team_id from ON DELETE SET NULL to ON DELETE CASCADE
-- 2. Create a trigger to delete auth.users when public.users are deleted
-- 3. Create a helper function to delete a team and all its data

-- ============================================================================
-- STEP 1: Change users.team_id to CASCADE DELETE
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_team_id_fkey;

-- Re-add with CASCADE
ALTER TABLE users
ADD CONSTRAINT users_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Create function to delete auth users (SECURITY DEFINER to access auth schema)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_auth_user_on_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only delete auth user if auth_user_id is set
  IF OLD.auth_user_id IS NOT NULL THEN
    -- Delete from auth.users (this cascades to auth.identities, auth.sessions, etc.)
    DELETE FROM auth.users WHERE id = OLD.auth_user_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Grant execute to postgres (service role)
GRANT EXECUTE ON FUNCTION delete_auth_user_on_user_delete() TO postgres;

-- ============================================================================
-- STEP 3: Create trigger on users table
-- ============================================================================

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS tr_delete_auth_user_on_user_delete ON users;

-- Create trigger that fires BEFORE DELETE
-- (needs to be BEFORE so we can access OLD.auth_user_id)
CREATE TRIGGER tr_delete_auth_user_on_user_delete
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user_on_user_delete();

-- ============================================================================
-- STEP 4: Helper function to delete a team completely (convenience for dev)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_team_cascade(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count INTEGER;
  v_team_name TEXT;
BEGIN
  -- Get team info before deletion
  SELECT name INTO v_team_name FROM teams WHERE id = p_team_id;
  
  IF v_team_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Team not found'
    );
  END IF;
  
  -- Count users that will be deleted
  SELECT COUNT(*) INTO v_user_count FROM users WHERE team_id = p_team_id;
  
  -- Delete the team (CASCADE will handle the rest)
  DELETE FROM teams WHERE id = p_team_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'team_name', v_team_name,
    'users_deleted', v_user_count,
    'message', format('Team "%s" and all related data deleted', v_team_name)
  );
END;
$$;

-- Grant execute to authenticated users (for dev convenience)
GRANT EXECUTE ON FUNCTION delete_team_cascade(UUID) TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION delete_auth_user_on_user_delete IS
  'Trigger function that deletes the corresponding auth.users entry when a public.users row is deleted. 
   Ensures auth accounts are cleaned up when users are removed.';

COMMENT ON TRIGGER tr_delete_auth_user_on_user_delete ON users IS
  'Automatically deletes auth.users entry when a public.users row is deleted.
   Part of cascade deletion for development cleanup.';

COMMENT ON FUNCTION delete_team_cascade IS
  'Helper function to completely delete a team and all associated data.
   Usage: SELECT delete_team_cascade(''team-uuid-here'');
   WARNING: Destructive operation - use with caution!';
