-- Migration: 20260128170000_add_managers_to_conversation_participants.sql
-- Description: Add managers as explicit participants in conversation threads
-- Problem: Managers are NOT added to conversation_participants table by design,
--          but the UI reads participants from this table, causing "Aucun participant" display
--          and 406 errors when fetching last_read_message_id
-- Solution:
--   1. Modify the trigger to also add managers as explicit participants
--   2. Retroactively add managers to all existing threads

-- ============================================================================
-- UPDATED FUNCTION: Add assignment to conversation participants
-- ============================================================================
-- Now includes managers as explicit participants (not just RLS access)
-- This ensures UI displays correctly and last_read_message_id works

CREATE OR REPLACE FUNCTION add_assignment_to_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
  v_intervention_team_id UUID;
  v_manager RECORD;
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
  -- ✅ CHANGE: Now add managers as explicit participants
  -- This ensures:
  --   1. UI displays managers in participant list
  --   2. last_read_message_id queries work for managers
  --   3. Unread counts work correctly for managers
  ELSIF NEW.role = 'gestionnaire' THEN

    -- Get the intervention's team_id
    SELECT team_id INTO v_intervention_team_id
    FROM interventions
    WHERE id = NEW.intervention_id;

    -- Add manager to 'group' thread
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

    -- Add manager to 'tenant_to_managers' thread
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

    -- Add manager to 'provider_to_managers' thread
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

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_assignment_to_conversation_participants IS
  'Automatically adds assigned users (tenants, providers, AND managers) as participants to relevant conversation threads. All roles are now explicit participants.';

-- ============================================================================
-- NEW FUNCTION: Add all team managers to intervention threads
-- ============================================================================
-- Called when conversation threads are created to ensure all managers are added

CREATE OR REPLACE FUNCTION add_team_managers_to_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intervention_team_id UUID;
  v_manager RECORD;
BEGIN
  -- Only process intervention-linked threads (not email threads)
  IF NEW.intervention_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the intervention's team_id
  SELECT team_id INTO v_intervention_team_id
  FROM interventions
  WHERE id = NEW.intervention_id;

  IF v_intervention_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Add all team managers as participants
  FOR v_manager IN
    SELECT id
    FROM users
    WHERE team_id = v_intervention_team_id
      AND role IN ('gestionnaire', 'admin')
      AND deleted_at IS NULL
      AND auth_user_id IS NOT NULL
  LOOP
    INSERT INTO conversation_participants (thread_id, user_id, joined_at)
    VALUES (NEW.id, v_manager.id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_team_managers_to_thread IS
  'Automatically adds all team managers as participants when a conversation thread is created for an intervention.';

-- ============================================================================
-- TRIGGER: Add managers when thread is created
-- ============================================================================

DROP TRIGGER IF EXISTS thread_add_managers ON conversation_threads;

CREATE TRIGGER thread_add_managers
  AFTER INSERT ON conversation_threads
  FOR EACH ROW
  EXECUTE FUNCTION add_team_managers_to_thread();

COMMENT ON TRIGGER thread_add_managers ON conversation_threads IS
  'Ensures all team managers are automatically added as participants when a new conversation thread is created.';

-- ============================================================================
-- RETROACTIVE FIX: Add missing managers to ALL existing threads
-- ============================================================================
-- This ensures existing interventions also have managers as participants

-- Add managers to all intervention threads where they're missing
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    u.id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN interventions i ON i.id = ct.intervention_id
JOIN users u ON u.team_id = i.team_id
    AND u.role IN ('gestionnaire', 'admin')
    AND u.deleted_at IS NULL
    AND u.auth_user_id IS NOT NULL
WHERE ct.intervention_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = u.id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Changes from previous architecture:
--
-- BEFORE: Managers accessed threads via RLS (can_view_conversation) without
--         being explicit participants. This caused:
--         - "Aucun participant" display in UI
--         - 406 errors when fetching last_read_message_id
--         - Unread count issues for managers
--
-- AFTER: All users (tenants, providers, AND managers) are explicit participants.
--        This ensures:
--        - Correct UI display of all participants
--        - Working last_read_message_id for all users
--        - Proper unread count tracking
--
-- RLS still controls access, but participation is now explicit for all roles.
-- ============================================================================
