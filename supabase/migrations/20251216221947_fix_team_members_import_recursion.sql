-- ============================================================================
-- Fix: Infinite recursion in team_members INSERT policy
-- Problem: Import tries to add existing users to teams, but RLS policy
--          creates recursion when checking team membership
-- Solution: Create SECURITY DEFINER function to bypass RLS for imports
-- ============================================================================

-- Function to add a user to a team (bypasses RLS)
CREATE OR REPLACE FUNCTION add_user_to_team(
  p_user_id UUID,
  p_team_id UUID,
  p_role team_member_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_membership_id UUID;
BEGIN
  -- Check if membership already exists (not left)
  SELECT id INTO v_membership_id
  FROM team_members
  WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND left_at IS NULL;

  IF v_membership_id IS NOT NULL THEN
    -- Already a member, just return existing ID
    RETURN v_membership_id;
  END IF;

  -- Check if there's an old membership that was left
  SELECT id INTO v_membership_id
  FROM team_members
  WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND left_at IS NOT NULL;

  IF v_membership_id IS NOT NULL THEN
    -- Reactivate old membership
    UPDATE team_members
    SET left_at = NULL,
        role = p_role,
        updated_at = NOW()
    WHERE id = v_membership_id;
    
    RETURN v_membership_id;
  END IF;

  -- Create new membership
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (p_user_id, p_team_id, p_role)
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_team(UUID, UUID, team_member_role) TO authenticated;

-- Comment
COMMENT ON FUNCTION add_user_to_team IS 
  'Adds a user to a team bypassing RLS. Used for imports and system operations.';

