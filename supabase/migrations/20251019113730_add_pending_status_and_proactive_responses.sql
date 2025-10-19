-- =====================================================================================
-- Migration: Proactive Time Slot Responses with Pending Status
-- Description: Adds 'pending' status and auto-creates responses for all participants
--              when a time slot is created
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- 1. ADD 'pending' TO response_type ENUM
-- =====================================================================================

ALTER TYPE response_type ADD VALUE IF NOT EXISTS 'pending';

COMMENT ON TYPE response_type IS 'User response to a time slot proposal: accepted, rejected, or pending';

-- =====================================================================================
-- 2. MODIFY CONSTRAINT TO ALLOW NULL notes FOR 'pending'
-- =====================================================================================

ALTER TABLE time_slot_responses DROP CONSTRAINT IF EXISTS notes_required_for_rejection;

-- Use ::text comparison to avoid enum value usage issue in same transaction
ALTER TABLE time_slot_responses ADD CONSTRAINT notes_required_for_rejection CHECK (
  response::text != 'rejected' OR (notes IS NOT NULL AND length(trim(notes)) > 0)
);

COMMENT ON CONSTRAINT notes_required_for_rejection ON time_slot_responses IS 'Rejection requires notes, all other statuses allow NULL notes';

-- =====================================================================================
-- 3. CREATE FUNCTION TO AUTO-CREATE RESPONSES FOR NEW TIME SLOTS
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_responses_for_new_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
BEGIN
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
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_responses_for_new_timeslot() IS 'Automatically creates time_slot_responses for all intervention participants when a new time slot is created';

-- =====================================================================================
-- 4. CREATE TRIGGER TO AUTO-CREATE RESPONSES
-- =====================================================================================

CREATE TRIGGER auto_create_timeslot_responses
  AFTER INSERT ON intervention_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION create_responses_for_new_timeslot();

COMMENT ON TRIGGER auto_create_timeslot_responses ON intervention_time_slots IS 'Automatically creates responses for all participants when a time slot is created';

-- =====================================================================================
-- 5. UPDATE SUMMARY TRIGGER TO IGNORE 'pending' RESPONSES
-- =====================================================================================

-- Replace the existing function to ignore 'pending' in counts
CREATE OR REPLACE FUNCTION update_time_slot_validation_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_slot_id UUID;
BEGIN
  -- Determine which slot_id to update
  IF TG_OP = 'DELETE' THEN
    target_slot_id := OLD.time_slot_id;
  ELSE
    target_slot_id := NEW.time_slot_id;
  END IF;

  -- Update summary columns based on aggregated responses
  -- IMPORTANT: Only count 'accepted' and 'rejected', ignore 'pending'
  UPDATE intervention_time_slots
  SET
    -- Managers
    selected_by_manager = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role IN ('gestionnaire', 'admin')
        AND response = 'accepted' -- Only count explicit acceptances
    ),
    rejected_by_manager = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role IN ('gestionnaire', 'admin')
        AND response = 'rejected' -- Only count explicit rejections
    ),

    -- Providers
    selected_by_provider = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role = 'prestataire'
        AND response = 'accepted'
    ),
    rejected_by_provider = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role = 'prestataire'
        AND response = 'rejected'
    ),

    -- Tenants
    selected_by_tenant = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role = 'locataire'
        AND response = 'accepted'
    ),
    rejected_by_tenant = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role = 'locataire'
        AND response = 'rejected'
    )
  WHERE id = target_slot_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_time_slot_validation_summary() IS 'Updates validation summary columns, ignoring pending responses';

-- =====================================================================================
-- 6. CREATE VALIDATION FUNCTION TO CHECK IF SLOT CAN BE FINALIZED
-- =====================================================================================

CREATE OR REPLACE FUNCTION check_timeslot_can_be_finalized(slot_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_tenant_acceptance BOOLEAN;
  has_provider_acceptance BOOLEAN;
BEGIN
  -- Check if at least 1 tenant has accepted
  SELECT EXISTS(
    SELECT 1 FROM time_slot_responses
    WHERE time_slot_id = slot_id_param
      AND user_role = 'locataire'
      AND response = 'accepted'
  ) INTO has_tenant_acceptance;

  -- Check if the provider has accepted
  SELECT EXISTS(
    SELECT 1 FROM time_slot_responses
    WHERE time_slot_id = slot_id_param
      AND user_role = 'prestataire'
      AND response = 'accepted'
  ) INTO has_provider_acceptance;

  -- Both conditions must be TRUE
  RETURN has_tenant_acceptance AND has_provider_acceptance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_timeslot_can_be_finalized(UUID) IS 'Returns TRUE if slot meets validation requirements: at least 1 tenant + provider accepted';

-- =====================================================================================
-- 7. MIGRATION VALIDATION
-- =====================================================================================

-- Verify enum has all 3 values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending'
    AND enumtypid = 'response_type'::regtype
  ) THEN
    RAISE EXCEPTION 'Migration failed: pending value not added to response_type enum';
  END IF;
END $$;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Added 'pending' status to response_type enum
-- ✅ Modified constraint to allow NULL notes for 'pending' and 'accepted'
-- ✅ Created function to auto-create responses for all participants
-- ✅ Created trigger to execute auto-creation on time slot insert
-- ✅ Updated summary trigger to ignore 'pending' responses
-- ✅ Created validation function to check if slot can be finalized
--
-- Next steps:
-- 1. Run: npm run supabase:types
-- 2. Update Server Actions (withdrawResponseAction, selectTimeSlotAction)
-- 3. Update UI components (ExecutionTab badges and conditional logic)
-- =====================================================================================
