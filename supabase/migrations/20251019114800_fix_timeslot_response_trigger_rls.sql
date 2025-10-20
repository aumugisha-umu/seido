-- =====================================================================================
-- Migration: Fix RLS Bypass in create_responses_for_new_timeslot() Trigger
-- Issue: RLS policies block INSERT for non-auth.uid() users in trigger
-- Solution: Add SET LOCAL row_security = OFF to bypass RLS during trigger execution
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- 1. RECREATE FUNCTION WITH RLS BYPASS
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_responses_for_new_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
BEGIN
  -- ✅ CRITICAL: Bypass RLS for this function
  -- This allows the trigger to insert responses for ALL participants,
  -- not just the current auth.uid() user who created the time slot
  SET LOCAL row_security = OFF;

  -- For each participant assigned to the intervention
  FOR participant IN
    SELECT ia.user_id, ia.role
    FROM intervention_assignments ia
    WHERE ia.intervention_id = NEW.intervention_id
  LOOP
    -- Create a response for this participant
    INSERT INTO time_slot_responses (
      time_slot_id,
      user_id,
      user_role,
      response,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      participant.user_id,
      participant.role,
      -- If proposer → 'accepted', otherwise → 'pending'
      CASE
        WHEN participant.user_id = NEW.proposed_by THEN 'accepted'::response_type
        ELSE 'pending'::response_type
      END,
      NULL, -- Notes NULL for 'pending' and 'accepted'
      NOW(),
      NOW()
    )
    -- Idempotent: skip if response already exists
    ON CONFLICT (time_slot_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_responses_for_new_timeslot() IS 'Auto-creates time_slot_responses for all participants (bypasses RLS with SET LOCAL row_security = OFF)';

-- =====================================================================================
-- 2. VALIDATION
-- =====================================================================================

-- Verify function exists with correct signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_responses_for_new_timeslot'
    AND pronargs = 0
  ) THEN
    RAISE EXCEPTION 'Migration failed: create_responses_for_new_timeslot() function not found';
  END IF;
END $$;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Added SET LOCAL row_security = OFF to bypass RLS in trigger
-- ✅ Added ON CONFLICT DO NOTHING for idempotency
-- ✅ Function now successfully inserts responses for all participants
--
-- Why this works:
-- - SET LOCAL only affects current transaction (secure)
-- - SECURITY DEFINER allows setting row_security
-- - RLS policies remain enforced for regular user queries
-- - Trigger creates responses for intervention_assignments only (authorized users)
-- =====================================================================================
