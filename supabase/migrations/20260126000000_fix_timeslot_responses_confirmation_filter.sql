-- =====================================================================================
-- Migration: Fix time_slot_responses - Only Create for Participants with requires_confirmation = TRUE
-- Issue: Trigger was creating responses for ALL participants, including those who don't need to confirm
-- Solution: Filter by requires_confirmation = TRUE in the trigger
-- Date: 2026-01-26
-- =====================================================================================

-- =====================================================================================
-- 1. CLEANUP EXISTING DATA
-- =====================================================================================
-- Remove time_slot_responses for participants who don't have requires_confirmation = TRUE
-- This fixes data created before this fix

DELETE FROM time_slot_responses tsr
WHERE NOT EXISTS (
  -- Keep if participant requires confirmation
  SELECT 1
  FROM intervention_time_slots ts
  JOIN intervention_assignments ia ON ia.intervention_id = ts.intervention_id
  WHERE ts.id = tsr.time_slot_id
    AND ia.user_id = tsr.user_id
    AND ia.requires_confirmation = TRUE
)
AND NOT EXISTS (
  -- Keep if this user is the proposer (gestionnaire who created the slot)
  SELECT 1
  FROM intervention_time_slots ts
  WHERE ts.id = tsr.time_slot_id
    AND ts.proposed_by = tsr.user_id
);

-- =====================================================================================
-- 2. RECREATE FUNCTION WITH CONFIRMATION FILTER
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_responses_for_new_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  intervention_requires_confirmation BOOLEAN;
BEGIN
  -- Bypass RLS for this function
  SET LOCAL row_security = OFF;

  -- Check if the intervention requires participant confirmations
  SELECT requires_participant_confirmation INTO intervention_requires_confirmation
  FROM interventions
  WHERE id = NEW.intervention_id;

  -- If the intervention doesn't require confirmations, don't create any responses
  IF intervention_requires_confirmation IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- For each participant who MUST confirm (requires_confirmation = TRUE)
  FOR participant IN
    SELECT ia.user_id, ia.role
    FROM intervention_assignments ia
    WHERE ia.intervention_id = NEW.intervention_id
      AND ia.requires_confirmation = TRUE  -- ✅ FIX: Only those who need to confirm
  LOOP
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
      participant.role::user_role,
      -- If proposer → 'accepted', otherwise → 'pending'
      CASE
        WHEN participant.user_id = NEW.proposed_by THEN 'accepted'::response_type
        ELSE 'pending'::response_type
      END,
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (time_slot_id, user_id) DO NOTHING;
  END LOOP;

  -- Always create an 'accepted' response for the proposer (gestionnaire)
  -- even if they don't have requires_confirmation = TRUE
  IF NEW.proposed_by IS NOT NULL THEN
    INSERT INTO time_slot_responses (
      time_slot_id,
      user_id,
      user_role,
      response,
      created_at,
      updated_at
    )
    SELECT
      NEW.id,
      NEW.proposed_by,
      ia.role::user_role,
      'accepted'::response_type,
      NOW(),
      NOW()
    FROM intervention_assignments ia
    WHERE ia.intervention_id = NEW.intervention_id
      AND ia.user_id = NEW.proposed_by
    ON CONFLICT (time_slot_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_responses_for_new_timeslot() IS
  'Auto-creates time_slot_responses ONLY for participants with requires_confirmation = TRUE, plus the proposer';

-- =====================================================================================
-- 3. VALIDATION
-- =====================================================================================

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Count any remaining orphan responses (should be 0 after cleanup)
  SELECT COUNT(*) INTO orphan_count
  FROM time_slot_responses tsr
  WHERE NOT EXISTS (
    SELECT 1
    FROM intervention_time_slots ts
    JOIN intervention_assignments ia ON ia.intervention_id = ts.intervention_id
    WHERE ts.id = tsr.time_slot_id
      AND ia.user_id = tsr.user_id
      AND (ia.requires_confirmation = TRUE OR ts.proposed_by = tsr.user_id)
  );

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphan time_slot_responses that may need review', orphan_count;
  END IF;

  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_responses_for_new_timeslot'
  ) THEN
    RAISE EXCEPTION 'Migration failed: create_responses_for_new_timeslot() function not found';
  END IF;
END $$;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Cleaned up existing incorrect time_slot_responses
-- ✅ Trigger now checks intervention.requires_participant_confirmation first
-- ✅ Only creates responses for participants with requires_confirmation = TRUE
-- ✅ Always creates 'accepted' response for the proposer (gestionnaire)
--
-- Behavior:
-- Before: All participants got a time_slot_response (even locataire with requires_confirmation = FALSE)
-- After: Only participants needing confirmation get a response + the proposer
-- =====================================================================================
