-- =====================================================================================
-- Migration: Fix user_role Cast in create_responses_for_new_timeslot() Trigger
-- Issue: participant.role is TEXT but user_role column expects user_role enum
-- Solution: Add explicit cast with ::user_role
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- 1. RECREATE FUNCTION WITH PROPER TYPE CAST
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_responses_for_new_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
BEGIN
  -- Bypass RLS for this function
  -- This allows the trigger to insert responses for ALL participants
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
      participant.role::user_role,  -- ✅ CAST TEXT → user_role enum
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

COMMENT ON FUNCTION create_responses_for_new_timeslot() IS 'Auto-creates time_slot_responses for all participants (casts TEXT role to user_role enum)';

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
-- ✅ Added ::user_role cast to participant.role
-- ✅ Function now correctly converts TEXT to user_role enum
-- ✅ Trigger will successfully insert responses without type error
--
-- Technical note:
-- intervention_assignments.role is stored as TEXT for flexibility
-- time_slot_responses.user_role uses user_role enum for type safety
-- Explicit cast bridges the type mismatch
-- =====================================================================================
