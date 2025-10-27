-- ============================================================================
-- Migration: Fix Phase 3 Triggers and Policies
-- Date: 2025-10-27 09:30:00
-- ============================================================================
-- This migration fixes three critical issues blocking intervention creation:
-- 1. Trigger notify_intervention_assignment() using removed 'priority' column
-- 2. RLS policy threads_insert using auth.uid() instead of get_current_user_id()
-- 3. RLS policy messages_insert consistency verification
-- ============================================================================

-- ============================================================================
-- FIX 1: Update notify_intervention_assignment() trigger
-- ============================================================================
-- Problem: Trigger tries to INSERT into removed 'priority' column
-- Solution: Use 'is_personal' boolean instead (assignment = personal notification)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_intervention_assignment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_intervention interventions;
BEGIN
  -- Fetch intervention details
  SELECT * INTO v_intervention
  FROM interventions
  WHERE id = NEW.intervention_id;

  -- Create notification for assigned user
  INSERT INTO notifications (
    user_id,
    team_id,
    created_by,
    type,
    is_personal,  -- ✅ Changed from 'priority' to 'is_personal'
    title,
    message,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    NEW.user_id,
    v_intervention.team_id,
    NEW.assigned_by,
    'assignment',
    true,  -- ✅ Assignment notifications are personal (was 'normal' priority)
    'Nouvelle assignation: ' || v_intervention.reference,
    'Vous avez été assigné(e) à l''intervention "' || v_intervention.title || '" en tant que ' || NEW.role,
    'intervention',
    NEW.intervention_id,
    jsonb_build_object(
      'assignment_role', NEW.role,
      'is_primary', NEW.is_primary
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 2: Update conversation_threads RLS INSERT policy
-- ============================================================================
-- Problem: Policy uses auth.uid() which maps to auth_user_id, not users.id
-- Solution: Use get_current_user_id() helper for correct mapping
-- ============================================================================

DROP POLICY IF EXISTS threads_insert ON conversation_threads;

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT
  WITH CHECK (
    created_by = get_current_user_id()  -- ✅ Use helper instead of auth.uid()
    AND is_manager_of_intervention_team(intervention_id)
  );

-- ============================================================================
-- FIX 3: Verify conversation_messages RLS INSERT policy consistency
-- ============================================================================
-- Ensure messages policy also uses get_current_user_id() for consistency
-- ============================================================================

DROP POLICY IF EXISTS messages_insert ON conversation_messages;

CREATE POLICY messages_insert ON conversation_messages
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()  -- ✅ Ensure consistency
    AND can_send_message_in_thread(thread_id)
  );

-- ============================================================================
-- VERIFICATION: Check that all related policies are consistent
-- ============================================================================
-- Verify that other Phase 3 policies also use get_current_user_id()
-- ============================================================================

-- Update assignments_insert policy if needed
DROP POLICY IF EXISTS assignments_insert ON intervention_assignments;

CREATE POLICY assignments_insert ON intervention_assignments
  FOR INSERT
  WITH CHECK (
    assigned_by = get_current_user_id()  -- ✅ Consistency check
    AND is_manager_of_intervention_team(intervention_id)
  );

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Changes made:
-- 1. notify_intervention_assignment() trigger:
--    - Removed reference to 'priority' column (removed in migration 20251026220000)
--    - Added 'is_personal' boolean (true for assignment notifications)
--
-- 2. conversation_threads.threads_insert policy:
--    - Changed auth.uid() to get_current_user_id()
--    - Fixes 403 Forbidden error on thread creation
--
-- 3. conversation_messages.messages_insert policy:
--    - Verified get_current_user_id() usage
--    - Ensures consistency across chat system
--
-- 4. intervention_assignments.assignments_insert policy:
--    - Updated for consistency with get_current_user_id()
--    - Prevents similar issues in assignment creation
--
-- Expected Results:
-- ✅ Intervention assignment notifications will be created successfully
-- ✅ Conversation threads can be created without 403 errors
-- ✅ Messages can be sent without auth mapping issues
-- ✅ Intervention assignments work correctly
-- ============================================================================
