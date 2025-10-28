-- ============================================================================
-- Migration: Fix Tenant Conversation Creation
-- Date: 2025-10-28 20:35:00
-- ============================================================================
-- This migration fixes the bug where tenant conversations are not created
-- when a manager creates an intervention with tenant assignments.
--
-- Problem:
-- - Old trigger `create_intervention_conversations()` references the removed
--   `interventions.tenant_id` column (removed in migration 20251015193000)
-- - Current `add_assignment_to_conversation_participants()` only adds participants
--   to existing threads but doesn't create threads if they don't exist
-- - Result: Tenants assigned to interventions have no conversations
--
-- Solution:
-- 1. Drop old trigger that references non-existent tenant_id column
-- 2. Merge provider thread creation into assignment trigger
-- 3. Enhance assignment trigger to CREATE threads if they don't exist
-- 4. Unified approach: threads created on-demand when participants are assigned
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop old broken trigger and function
-- ============================================================================
-- This trigger references interventions.tenant_id which no longer exists
-- It was creating tenant threads at intervention INSERT, but that field is gone

DROP TRIGGER IF EXISTS interventions_create_conversations ON interventions;
DROP FUNCTION IF EXISTS create_intervention_conversations();

COMMENT ON SCHEMA public IS 'Dropped broken trigger interventions_create_conversations (referenced removed tenant_id field)';

-- ============================================================================
-- STEP 2: Drop separate provider conversation trigger
-- ============================================================================
-- We're merging this logic into the unified assignment trigger below

DROP TRIGGER IF EXISTS assignments_create_provider_conversation ON intervention_assignments;
DROP FUNCTION IF EXISTS create_provider_conversation();

COMMENT ON SCHEMA public IS 'Dropped separate provider trigger - logic merged into unified assignment trigger';

-- ============================================================================
-- STEP 3: Drop and recreate the assignment trigger
-- ============================================================================
-- Need to recreate it because we're changing its behavior significantly

DROP TRIGGER IF EXISTS assignments_add_to_conversations ON intervention_assignments;

-- ============================================================================
-- FUNCTION: Enhanced Assignment to Conversation Participants
-- ============================================================================
-- This function now both CREATES threads (if needed) AND adds participants.
-- Triggered AFTER INSERT on intervention_assignments.
--
-- Logic:
-- 1. LOCATAIRE role:
--    - Create 'tenant_to_managers' thread (if not exists)
--    - Create 'group' thread (if not exists)
--    - Add tenant as participant to both
--
-- 2. PRESTATAIRE role:
--    - Create 'provider_to_managers' thread (if not exists)
--    - Create 'group' thread (if not exists)
--    - Add provider as participant to both
--
-- 3. GESTIONNAIRE role:
--    - No action (access via RLS team transparency)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_assignment_to_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
  v_intervention interventions;
BEGIN
  -- Fetch intervention details (need team_id and reference for thread creation)
  SELECT * INTO v_intervention
  FROM interventions
  WHERE id = NEW.intervention_id;

  IF v_intervention.id IS NULL THEN
    RAISE WARNING 'Intervention % not found for assignment', NEW.intervention_id;
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- CASE 1: LOCATAIRE (Tenant) Assignment
  -- ============================================================================
  IF NEW.role = 'locataire' THEN

    -- --------------------------------------------------------------------------
    -- 1A. Ensure 'tenant_to_managers' thread exists
    -- --------------------------------------------------------------------------
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'tenant_to_managers'
    LIMIT 1;

    IF v_thread_id IS NULL THEN
      -- CREATE the thread
      INSERT INTO conversation_threads (
        intervention_id,
        team_id,
        thread_type,
        created_by,
        title
      )
      VALUES (
        NEW.intervention_id,
        v_intervention.team_id,
        'tenant_to_managers',
        COALESCE(NEW.assigned_by, NEW.user_id), -- Use assigner or tenant as creator
        'Locataire ↔ Gestionnaires - ' || v_intervention.reference
      )
      RETURNING id INTO v_thread_id;

      RAISE NOTICE 'Created tenant_to_managers thread % for intervention %',
        v_thread_id, v_intervention.reference;
    END IF;

    -- Add tenant as participant
    INSERT INTO conversation_participants (thread_id, user_id, joined_at)
    VALUES (v_thread_id, NEW.user_id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;

    -- --------------------------------------------------------------------------
    -- 1B. Ensure 'group' thread exists
    -- --------------------------------------------------------------------------
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'group'
    LIMIT 1;

    IF v_thread_id IS NULL THEN
      -- CREATE the thread
      INSERT INTO conversation_threads (
        intervention_id,
        team_id,
        thread_type,
        created_by,
        title
      )
      VALUES (
        NEW.intervention_id,
        v_intervention.team_id,
        'group',
        COALESCE(NEW.assigned_by, NEW.user_id), -- Use assigner or tenant as creator
        'Discussion générale - ' || v_intervention.reference
      )
      RETURNING id INTO v_thread_id;

      RAISE NOTICE 'Created group thread % for intervention %',
        v_thread_id, v_intervention.reference;
    END IF;

    -- Add tenant as participant
    INSERT INTO conversation_participants (thread_id, user_id, joined_at)
    VALUES (v_thread_id, NEW.user_id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;

  -- ============================================================================
  -- CASE 2: PRESTATAIRE (Provider) Assignment
  -- ============================================================================
  ELSIF NEW.role = 'prestataire' THEN

    -- --------------------------------------------------------------------------
    -- 2A. Ensure 'provider_to_managers' thread exists
    -- --------------------------------------------------------------------------
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'provider_to_managers'
    LIMIT 1;

    IF v_thread_id IS NULL THEN
      -- CREATE the thread
      INSERT INTO conversation_threads (
        intervention_id,
        team_id,
        thread_type,
        created_by,
        title
      )
      VALUES (
        NEW.intervention_id,
        v_intervention.team_id,
        'provider_to_managers',
        COALESCE(NEW.assigned_by, NEW.user_id), -- Use assigner or provider as creator
        'Prestataire ↔ Gestionnaires - ' || v_intervention.reference
      )
      RETURNING id INTO v_thread_id;

      RAISE NOTICE 'Created provider_to_managers thread % for intervention %',
        v_thread_id, v_intervention.reference;
    END IF;

    -- Add provider as participant
    INSERT INTO conversation_participants (thread_id, user_id, joined_at)
    VALUES (v_thread_id, NEW.user_id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;

    -- --------------------------------------------------------------------------
    -- 2B. Ensure 'group' thread exists
    -- --------------------------------------------------------------------------
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE intervention_id = NEW.intervention_id
      AND thread_type = 'group'
    LIMIT 1;

    IF v_thread_id IS NULL THEN
      -- CREATE the thread
      INSERT INTO conversation_threads (
        intervention_id,
        team_id,
        thread_type,
        created_by,
        title
      )
      VALUES (
        NEW.intervention_id,
        v_intervention.team_id,
        'group',
        COALESCE(NEW.assigned_by, NEW.user_id), -- Use assigner or provider as creator
        'Discussion générale - ' || v_intervention.reference
      )
      RETURNING id INTO v_thread_id;

      RAISE NOTICE 'Created group thread % for intervention %',
        v_thread_id, v_intervention.reference;
    END IF;

    -- Add provider as participant
    INSERT INTO conversation_participants (thread_id, user_id, joined_at)
    VALUES (v_thread_id, NEW.user_id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;

  -- ============================================================================
  -- CASE 3: GESTIONNAIRE (Manager) Assignment
  -- ============================================================================
  -- Managers access threads via RLS team transparency (can_view_conversation)
  -- No need to add them explicitly as participants OR create any threads
  -- This maintains the architectural principle of "EXPLICIT participants only"

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_assignment_to_conversation_participants IS
  'Enhanced: Creates conversation threads on-demand AND adds participants. Handles tenants and providers. Managers access via RLS.';

-- ============================================================================
-- TRIGGER: Create threads and add participants on assignment
-- ============================================================================

CREATE TRIGGER assignments_add_to_conversations
  AFTER INSERT ON intervention_assignments
  FOR EACH ROW
  EXECUTE FUNCTION add_assignment_to_conversation_participants();

COMMENT ON TRIGGER assignments_add_to_conversations ON intervention_assignments IS
  'Creates conversation threads (tenant_to_managers, provider_to_managers, group) on-demand and adds assigned users as participants.';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Architecture changes:
--
-- BEFORE:
-- - Intervention INSERT → Create tenant/group threads (using non-existent tenant_id)
-- - Provider assignment → Create provider thread (separate trigger)
-- - Assignment INSERT → Add participant to existing threads (or skip if missing)
--
-- AFTER:
-- - Intervention INSERT → No thread creation
-- - ANY assignment (tenant/provider) → Create threads IF needed, add participant
-- - Unified logic in single trigger function
--
-- Benefits:
-- 1. ✅ Works with current schema (no tenant_id dependency)
-- 2. ✅ Lazy thread creation (only when participants are assigned)
-- 3. ✅ Handles manager-created interventions correctly
-- 4. ✅ Handles tenant-created interventions correctly
-- 5. ✅ Idempotent (safe to re-run, ON CONFLICT DO NOTHING)
-- 6. ✅ Single source of truth for conversation logic
--
-- Testing checklist:
-- □ Manager creates intervention with tenant → threads created
-- □ Manager creates intervention, adds tenant later → threads created
-- □ Tenant creates their own intervention → threads created
-- □ Provider assignment → provider threads created
-- □ Multiple assignments to same intervention → no duplicate threads
-- ============================================================================
