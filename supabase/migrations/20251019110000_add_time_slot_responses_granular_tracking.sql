-- =====================================================================================
-- Migration: Time Slot Responses - Granular Tracking System
-- Description: Adds granular tracking for individual user responses (accept/reject)
--              to time slots with multi-tenant support and automatic validation
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- 1. CREATE ENUM FOR RESPONSE TYPE
-- =====================================================================================

CREATE TYPE response_type AS ENUM ('accepted', 'rejected');

COMMENT ON TYPE response_type IS 'User response to a time slot proposal';

-- =====================================================================================
-- 2. CREATE TABLE FOR TIME SLOT RESPONSES
-- =====================================================================================

CREATE TABLE time_slot_responses (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  time_slot_id UUID NOT NULL REFERENCES intervention_time_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Response data
  user_role user_role NOT NULL, -- Cached role for faster queries
  response response_type NOT NULL,
  notes TEXT, -- Required for 'rejected', optional for 'accepted'

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_user_response UNIQUE (time_slot_id, user_id),
  CONSTRAINT notes_required_for_rejection CHECK (
    (response = 'rejected' AND notes IS NOT NULL AND length(trim(notes)) > 0)
    OR response = 'accepted'
  )
);

-- Indexes for performance
CREATE INDEX idx_time_slot_responses_slot_id ON time_slot_responses(time_slot_id);
CREATE INDEX idx_time_slot_responses_user_id ON time_slot_responses(user_id);
CREATE INDEX idx_time_slot_responses_response ON time_slot_responses(response);
CREATE INDEX idx_time_slot_responses_role_response ON time_slot_responses(user_role, response);

-- Comments
COMMENT ON TABLE time_slot_responses IS 'Granular tracking of individual user responses to time slot proposals';
COMMENT ON COLUMN time_slot_responses.user_role IS 'Cached user role at time of response for faster queries';
COMMENT ON COLUMN time_slot_responses.notes IS 'Mandatory reason when rejecting, optional comment when accepting';
COMMENT ON CONSTRAINT notes_required_for_rejection ON time_slot_responses IS 'Rejection must include a reason';

-- =====================================================================================
-- 3. ADD REJECTION TRACKING COLUMNS TO intervention_time_slots
-- =====================================================================================

ALTER TABLE intervention_time_slots
  ADD COLUMN rejected_by_manager BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN rejected_by_provider BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN rejected_by_tenant BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN intervention_time_slots.rejected_by_manager IS 'TRUE if at least one manager has rejected this slot';
COMMENT ON COLUMN intervention_time_slots.rejected_by_provider IS 'TRUE if at least one provider has rejected this slot';
COMMENT ON COLUMN intervention_time_slots.rejected_by_tenant IS 'TRUE if at least one tenant has rejected this slot';

-- =====================================================================================
-- 4. TRIGGER: UPDATE VALIDATION SUMMARY ON RESPONSE CHANGE
-- =====================================================================================

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
  UPDATE intervention_time_slots
  SET
    -- Managers
    selected_by_manager = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role IN ('gestionnaire', 'admin')
        AND response = 'accepted'
    ),
    rejected_by_manager = EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = target_slot_id
        AND user_role IN ('gestionnaire', 'admin')
        AND response = 'rejected'
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

COMMENT ON FUNCTION update_time_slot_validation_summary() IS 'Automatically updates validation summary columns when responses change';

CREATE TRIGGER update_validation_summary_on_response
  AFTER INSERT OR UPDATE OR DELETE ON time_slot_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_time_slot_validation_summary();

-- =====================================================================================
-- 5. TRIGGER: HANDLE INTERNAL REJECTIONS (Auto-cancel if same group rejects)
-- =====================================================================================

CREATE OR REPLACE FUNCTION handle_internal_time_slot_rejection()
RETURNS TRIGGER AS $$
DECLARE
  slot_proposer_id UUID;
  slot_proposer_role user_role;
  rejector_role user_role;
  intervention_id_value UUID;
BEGIN
  -- Only process if this is a rejection
  IF NEW.response != 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Get proposer info and intervention_id
  SELECT
    ts.proposed_by,
    u.role,
    ts.intervention_id
  INTO
    slot_proposer_id,
    slot_proposer_role,
    intervention_id_value
  FROM intervention_time_slots ts
  LEFT JOIN users u ON u.id = ts.proposed_by
  WHERE ts.id = NEW.time_slot_id;

  rejector_role := NEW.user_role;

  -- Check if rejection is from same group as proposer
  -- Manager rejecting manager's slot, or tenant rejecting tenant's slot, etc.
  IF (slot_proposer_role IN ('gestionnaire', 'admin') AND rejector_role IN ('gestionnaire', 'admin'))
     OR (slot_proposer_role = 'prestataire' AND rejector_role = 'prestataire')
     OR (slot_proposer_role = 'locataire' AND rejector_role = 'locataire') THEN

    -- Cancel the slot automatically
    UPDATE intervention_time_slots
    SET
      status = 'rejected',
      cancelled_at = NOW(),
      cancelled_by = NEW.user_id
    WHERE id = NEW.time_slot_id
      AND status NOT IN ('selected', 'cancelled', 'rejected'); -- Don't override final states

    -- Log the internal rejection in activity logs
    INSERT INTO activity_logs (
      intervention_id,
      user_id,
      action,
      details
    )
    VALUES (
      intervention_id_value,
      NEW.user_id,
      'time_slot_rejected_internally',
      jsonb_build_object(
        'slot_id', NEW.time_slot_id,
        'reason', NEW.notes,
        'rejector_role', rejector_role::text,
        'proposer_role', slot_proposer_role::text,
        'proposer_id', slot_proposer_id
      )
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_internal_time_slot_rejection() IS 'Auto-cancels time slot if rejected by someone from same role group as proposer';

CREATE TRIGGER on_time_slot_response_rejection
  AFTER INSERT OR UPDATE ON time_slot_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_internal_time_slot_rejection();

-- =====================================================================================
-- 6. AUTO-UPDATE updated_at TRIGGER
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_time_slot_response_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_time_slot_response_updated_at
  BEFORE UPDATE ON time_slot_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_time_slot_response_updated_at();

-- =====================================================================================
-- 7. RLS POLICIES FOR time_slot_responses
-- =====================================================================================

-- Enable RLS
ALTER TABLE time_slot_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view responses for slots in their interventions
CREATE POLICY time_slot_responses_select ON time_slot_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND tm.user_id = auth.uid()
    )
    OR
    -- Or if user is tenant/provider assigned to the intervention via intervention_assignments
    EXISTS (
      SELECT 1 FROM intervention_time_slots ts
      INNER JOIN interventions i ON i.id = ts.intervention_id
      INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ts.id = time_slot_responses.time_slot_id
        AND ia.user_id = auth.uid()
        AND ia.role IN ('locataire', 'prestataire')
    )
  );

COMMENT ON POLICY time_slot_responses_select ON time_slot_responses IS 'Users can view responses for slots in their interventions (via team_members OR intervention_assignments)';

-- Policy: Users can insert their own responses
CREATE POLICY time_slot_responses_insert ON time_slot_responses
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    -- Can only respond to slots in interventions they're involved in
    (
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN team_members tm ON tm.team_id = i.team_id
        WHERE ts.id = time_slot_responses.time_slot_id
          AND tm.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM intervention_time_slots ts
        INNER JOIN interventions i ON i.id = ts.intervention_id
        INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
        WHERE ts.id = time_slot_responses.time_slot_id
          AND ia.user_id = auth.uid()
          AND ia.role IN ('locataire', 'prestataire')
      )
    )
  );

COMMENT ON POLICY time_slot_responses_insert ON time_slot_responses IS 'Users can insert their own responses (via team_members OR intervention_assignments)';

-- Policy: Users can update their own responses
CREATE POLICY time_slot_responses_update ON time_slot_responses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY time_slot_responses_update ON time_slot_responses IS 'Users can update their own responses';

-- Policy: Users can delete their own responses
CREATE POLICY time_slot_responses_delete ON time_slot_responses
  FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON POLICY time_slot_responses_delete ON time_slot_responses IS 'Users can delete (withdraw) their own responses';

-- =====================================================================================
-- 8. MIGRATE EXISTING DATA
-- =====================================================================================

-- Migrate existing auto-validations to time_slot_responses
-- For slots that were auto-validated when created, insert synthetic responses

INSERT INTO time_slot_responses (time_slot_id, user_id, user_role, response, notes, created_at)
SELECT
  ts.id as time_slot_id,
  ts.proposed_by as user_id,
  u.role as user_role,
  'accepted'::response_type as response,
  'Auto-validated when slot was created' as notes,
  ts.created_at as created_at
FROM intervention_time_slots ts
INNER JOIN users u ON u.id = ts.proposed_by
WHERE ts.proposed_by IS NOT NULL
  AND (
    (u.role IN ('gestionnaire', 'admin') AND ts.selected_by_manager = TRUE)
    OR (u.role = 'prestataire' AND ts.selected_by_provider = TRUE)
    OR (u.role = 'locataire' AND ts.selected_by_tenant = TRUE)
  )
ON CONFLICT (time_slot_id, user_id) DO NOTHING;

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
