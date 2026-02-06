-- Migration: 20260206100000_remove_auto_add_all_managers_trigger.sql
-- Description: Remove the trigger that auto-adds ALL team managers to conversation threads
--
-- PROBLEM:
-- The trigger `thread_add_managers` and function `add_team_managers_to_thread()`
-- automatically adds ALL team managers as participants when a conversation thread is created.
-- This is incorrect behavior:
--   - For tenant-created interventions: NO managers should be added as participants
--     (they access via RLS, and become participants only when they send their first message)
--   - For manager-created interventions: ONLY assigned managers should be added
--     (handled by `add_assignment_to_conversation_participants` trigger)
--
-- SOLUTION:
-- Remove the `thread_add_managers` trigger and `add_team_managers_to_thread()` function.
-- The `add_assignment_to_conversation_participants` trigger correctly handles:
--   - Adding locataires when assigned
--   - Adding prestataires when assigned
--   - Adding gestionnaires when assigned (via intervention_assignments table)
--
-- Managers will be added as participants only when:
-- 1. They are explicitly assigned to the intervention (intervention_assignments INSERT)
-- 2. They send their first message (handled by application code - US-004)
--
-- NOTE: Existing participants are NOT removed. This migration only affects new threads.

-- ============================================================================
-- DROP THE PROBLEMATIC TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS thread_add_managers ON conversation_threads;

-- ============================================================================
-- DROP THE FUNCTION (no longer needed)
-- ============================================================================

DROP FUNCTION IF EXISTS add_team_managers_to_thread();

-- ============================================================================
-- Update comment on remaining function
-- ============================================================================

COMMENT ON FUNCTION add_assignment_to_conversation_participants IS
  'Automatically adds assigned users (tenants, providers, AND managers) as participants to relevant conversation threads. Only assigned managers become participants, not all team managers.';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- After this migration:
-- - New intervention threads will NOT auto-add all managers
-- - Managers get access via RLS (can_view_conversation function)
-- - Managers become participants when:
--   a) Assigned to intervention (existing trigger handles this)
--   b) Send their first message (application code will handle this)
-- ============================================================================
