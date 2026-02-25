-- Migration: 20260209100000_fix_trigger_individual_threads.sql
-- Description: Fix add_assignment_to_conversation_participants trigger:
--   1. Filter by participant_id for individual threads (not LIMIT 1)
--   2. Only add users WITH auth accounts (auth_user_id IS NOT NULL)
--   3. Managers added to ALL individual threads via FOR loop
-- Problems fixed:
--   - LIMIT 1 picked wrong thread when multiple individual threads exist
--   - Contacts without accounts were added to group/individual threads
-- Solution: Check auth_user_id first, then filter by participant_id

-- ============================================================================
-- UPDATED FUNCTION: Add assignment to conversation participants
-- ============================================================================

CREATE OR REPLACE FUNCTION add_assignment_to_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
  v_has_auth BOOLEAN;
BEGIN
  -- ============================================================================
  -- GUARD: Only add users with auth accounts to conversations
  -- Contacts without accounts (auth_user_id IS NULL) cannot log in,
  -- so they should not be added as conversation participants.
  -- ============================================================================
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = NEW.user_id AND auth_user_id IS NOT NULL
  ) INTO v_has_auth;

  IF NOT v_has_auth THEN
    RETURN NEW; -- Skip: user has no auth account
  END IF;

  -- ============================================================================
  -- CASE 1: LOCATAIRE (Tenant) Assignment
  -- ============================================================================
  IF NEW.role = 'locataire' THEN

    -- Add to individual 'tenant_to_managers' thread (matched by participant_id)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'tenant_to_managers'
      AND participant_id = NEW.user_id
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Add to 'tenants_group' thread (if exists)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'tenants_group'
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

    -- Add to individual 'provider_to_managers' thread (matched by participant_id)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'provider_to_managers'
      AND participant_id = NEW.user_id
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Add to 'providers_group' thread (if exists)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'providers_group'
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
  ELSIF NEW.role = 'gestionnaire' THEN

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

    -- Add manager to ALL 'tenant_to_managers' threads (all individual tenant threads)
    FOR v_thread_id IN
      SELECT id FROM conversation_threads
      WHERE intervention_id = NEW.intervention_id
        AND thread_type = 'tenant_to_managers'
    LOOP
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END LOOP;

    -- Add manager to ALL 'provider_to_managers' threads (all individual provider threads)
    FOR v_thread_id IN
      SELECT id FROM conversation_threads
      WHERE intervention_id = NEW.intervention_id
        AND thread_type = 'provider_to_managers'
    LOOP
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END LOOP;

    -- Add manager to 'tenants_group' thread (if exists)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'tenants_group'
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      INSERT INTO conversation_participants (thread_id, user_id, joined_at)
      VALUES (v_thread_id, NEW.user_id, NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END IF;

    -- Add manager to 'providers_group' thread (if exists)
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'providers_group'
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
  'Automatically adds assigned users as participants to relevant conversation threads. '
  'Only users with auth accounts (auth_user_id IS NOT NULL) are added. '
  'Uses participant_id to match individual threads (provider_to_managers, tenant_to_managers). '
  'Managers are added to ALL threads. Fixed in 20260209.';

-- ============================================================================
-- RETROACTIVE FIX: Add missing participants to individual threads
-- ============================================================================
-- Some providers/tenants might be missing from their individual threads
-- because the old trigger used LIMIT 1 without filtering by participant_id

-- Fix providers: add them to their individual provider_to_managers threads
-- (only if they have an auth account)
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    ct.participant_id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN users u ON u.id = ct.participant_id AND u.auth_user_id IS NOT NULL
WHERE ct.thread_type = 'provider_to_managers'
  AND ct.participant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = ct.participant_id
  )
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- Fix tenants: add them to their individual tenant_to_managers threads
-- (only if they have an auth account)
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    ct.participant_id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN users u ON u.id = ct.participant_id AND u.auth_user_id IS NOT NULL
WHERE ct.thread_type = 'tenant_to_managers'
  AND ct.participant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = ct.participant_id
  )
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- RETROACTIVE CLEANUP: Remove participants without auth accounts
-- ============================================================================
-- Users without auth_user_id should NOT be in conversation_participants
-- (they were incorrectly added by the old trigger that didn't check auth)

DELETE FROM conversation_participants cp
WHERE cp.user_id IN (
  SELECT u.id FROM users u WHERE u.auth_user_id IS NULL
);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Changes from 20260129200005:
--
-- 1. AUTH GUARD: Early return if user has no auth_user_id
--    - Prevents contacts without accounts from being added to any conversation
--
-- 2. Individual thread matching: Uses participant_id instead of LIMIT 1
--    - Old: SELECT id WHERE thread_type = 'provider_to_managers' LIMIT 1
--    - New: SELECT id WHERE thread_type = 'provider_to_managers' AND participant_id = NEW.user_id
--
-- 3. Manager assignment: Now iterates ALL individual threads with FOR loop
--    - Old: LIMIT 1 (only added to first thread found)
--    - New: FOR loop iterates all tenant_to_managers and provider_to_managers threads
--
-- 4. Group threads: Added tenants_group and providers_group support
--
-- 5. Retroactive fix: Adds missing participants to existing individual threads
--    (only for users with auth accounts)
--
-- 6. Retroactive cleanup: Removes participants without auth accounts
-- ============================================================================
