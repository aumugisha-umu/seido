-- Migration: 20260128150000_fix_multi_profile_conversation_access.sql
-- Description: Fix can_view_conversation function to support multi-profile users
-- Problem: Users can have multiple profiles (gestionnaire + prestataire) for different teams
--          The old function only checked ONE profile, which might be the wrong one
-- Solution: Check if ANY profile of the auth user has access to the conversation

-- Update can_view_conversation to handle multi-profile users
CREATE OR REPLACE FUNCTION can_view_conversation(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_thread RECORD;
    v_user_db_ids UUID[];
BEGIN
    -- ✅ MULTI-PROFILE FIX: Get ALL user DB IDs for this auth user
    -- A user can have multiple profiles (e.g., gestionnaire + prestataire)
    SELECT array_agg(id) INTO v_user_db_ids
    FROM users
    WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL;

    IF v_user_db_ids IS NULL OR array_length(v_user_db_ids, 1) = 0 THEN
        RETURN FALSE;
    END IF;

    -- Get the thread
    SELECT * INTO v_thread
    FROM conversation_threads
    WHERE id = p_thread_id;

    IF v_thread IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Case 1: Thread linked to an EMAIL
    -- Only team managers can view
    IF v_thread.email_id IS NOT NULL THEN
        RETURN is_team_manager(v_thread.team_id);
    END IF;

    -- Case 2: Thread linked to an INTERVENTION
    -- Check if ANY of the user's profiles is a participant OR a team manager
    RETURN EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.thread_id = p_thread_id
        AND cp.user_id = ANY(v_user_db_ids)
    ) OR is_manager_of_intervention_team(v_thread.intervention_id);
END;
$$;

-- Add comment explaining the multi-profile support
COMMENT ON FUNCTION can_view_conversation(UUID) IS
'Check if current user can view a conversation thread.
Supports multi-profile users by checking ALL profiles associated with the auth user.
Returns TRUE if any profile is a participant or if user is a team manager.';
