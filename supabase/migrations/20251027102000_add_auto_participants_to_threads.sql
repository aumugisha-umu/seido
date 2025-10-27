-- ============================================================================
-- Migration: Add Automatic Participants to Conversation Threads
-- Date: 2025-10-27 10:20:00
-- ============================================================================
-- This migration fixes the missing participants in conversation threads.
--
-- Problem: When interventions are created, conversation threads are created
-- automatically, but participants (tenants, providers) are never added to
-- the conversation_participants table.
--
-- Solution: Create a trigger that automatically adds assigned users as
-- participants to the appropriate conversation threads.
-- ============================================================================

-- ============================================================================
-- FUNCTION: Add assignment to conversation participants
-- ============================================================================
-- This function is triggered AFTER INSERT on intervention_assignments
-- and adds the assigned user as a participant to the relevant threads.
--
-- Logic:
-- - locataire role → Add to 'tenant_to_managers' and 'group' threads
-- - prestataire role → Add to 'provider_to_managers' and 'group' threads
-- - gestionnaire role → No action (access via RLS team transparency)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_assignment_to_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- ============================================================================
  -- CASE 1: LOCATAIRE (Tenant) Assignment
  -- ============================================================================
  IF NEW.role = 'locataire' THEN

    -- Add to 'tenant_to_managers' thread
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'tenant_to_managers'
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Add to 'group' thread
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'group'
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

  -- ============================================================================
  -- CASE 2: PRESTATAIRE (Provider) Assignment
  -- ============================================================================
  ELSIF NEW.role = 'prestataire' THEN

    -- Add to 'provider_to_managers' thread
    -- Note: This thread is created by another trigger when first provider is assigned
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'provider_to_managers'
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Add to 'group' thread
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'group'
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

  -- ============================================================================
  -- CASE 3: GESTIONNAIRE (Manager) Assignment
  -- ============================================================================
  -- Managers access threads via RLS team transparency (can_view_conversation)
  -- No need to add them explicitly as participants
  -- This maintains the architectural principle of "EXPLICIT participants only"

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_assignment_to_conversation_participants IS
  'Automatically adds assigned users (tenants, providers) as participants to relevant conversation threads. Managers access via RLS team transparency.';

-- ============================================================================
-- TRIGGER: Add participants on assignment
-- ============================================================================

CREATE TRIGGER assignments_add_to_conversations
  AFTER INSERT ON intervention_assignments
  FOR EACH ROW
  EXECUTE FUNCTION add_assignment_to_conversation_participants();

COMMENT ON TRIGGER assignments_add_to_conversations ON intervention_assignments IS
  'Automatically populates conversation_participants when a user is assigned to an intervention.';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- This trigger ensures that:
-- 1. Tenants can see and participate in 'tenant_to_managers' and 'group' threads
-- 2. Providers can see and participate in 'provider_to_managers' and 'group' threads
-- 3. Managers access all threads via RLS (no explicit participant entry needed)
--
-- Architecture principle:
-- - conversation_participants = EXPLICIT participants (tenants, providers)
-- - Team managers = IMPLICIT access via RLS can_view_conversation() helper
--
-- ON CONFLICT DO NOTHING ensures idempotency (safe to re-run assignments)
-- ============================================================================
