-- =====================================================================================
-- Migration: Add Time Slot Status System + Multi-Role Validation
-- Description: Adds status enum and validation columns for intervention time slots
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- 1. CREATE ENUM FOR TIME SLOT STATUS
-- =====================================================================================

-- Status lifecycle for intervention time slots
CREATE TYPE time_slot_status AS ENUM (
  'requested',   -- Requested by manager (when manager proposes)
  'pending',     -- Awaiting validation (default for provider/tenant proposals)
  'selected',    -- Selected as final time slot for intervention
  'rejected',    -- Rejected by one of the parties
  'cancelled'    -- Cancelled by proposer or manager
);

COMMENT ON TYPE time_slot_status IS 'Status lifecycle for intervention time slots';

-- =====================================================================================
-- 2. ADD COLUMNS TO intervention_time_slots TABLE
-- =====================================================================================

ALTER TABLE intervention_time_slots
  -- Status column
  ADD COLUMN status time_slot_status DEFAULT 'pending' NOT NULL,

  -- Multi-role validation columns
  ADD COLUMN selected_by_manager BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN selected_by_provider BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN selected_by_tenant BOOLEAN DEFAULT FALSE NOT NULL,

  -- Cancellation tracking
  ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN intervention_time_slots.status IS 'Current status of the time slot';
COMMENT ON COLUMN intervention_time_slots.selected_by_manager IS 'TRUE if validated by a manager';
COMMENT ON COLUMN intervention_time_slots.selected_by_provider IS 'TRUE if validated by the provider';
COMMENT ON COLUMN intervention_time_slots.selected_by_tenant IS 'TRUE if validated by the tenant';
COMMENT ON COLUMN intervention_time_slots.cancelled_at IS 'Timestamp when slot was cancelled';
COMMENT ON COLUMN intervention_time_slots.cancelled_by IS 'User who cancelled the slot';

-- =====================================================================================
-- 3. CREATE TRIGGER FUNCTION FOR AUTO-VALIDATION
-- =====================================================================================

-- Automatically set the appropriate selected_by_X column based on proposer's role
CREATE OR REPLACE FUNCTION auto_set_time_slot_validation()
RETURNS TRIGGER AS $$
DECLARE
  proposer_role user_role;
BEGIN
  -- Only apply on INSERT when proposed_by is set
  IF NEW.proposed_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the role of the user who proposed this slot
  SELECT role INTO proposer_role
  FROM users
  WHERE id = NEW.proposed_by;

  -- Auto-validate based on proposer role
  IF proposer_role IN ('gestionnaire', 'admin') THEN
    NEW.selected_by_manager := TRUE;
    NEW.status := 'requested'; -- Manager requests are 'requested' not 'pending'
  ELSIF proposer_role = 'prestataire' THEN
    NEW.selected_by_provider := TRUE;
    NEW.status := 'pending';
  ELSIF proposer_role = 'locataire' THEN
    NEW.selected_by_tenant := TRUE;
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_set_time_slot_validation() IS 'Auto-validates time slot based on proposer role';

-- =====================================================================================
-- 4. CREATE TRIGGER
-- =====================================================================================

CREATE TRIGGER set_time_slot_validation_on_insert
  BEFORE INSERT ON intervention_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_time_slot_validation();

COMMENT ON TRIGGER set_time_slot_validation_on_insert ON intervention_time_slots IS 'Auto-sets validation flags when slot is created';

-- =====================================================================================
-- 5. UPDATE EXISTING RLS POLICIES
-- =====================================================================================

-- Drop existing UPDATE policy if it exists (to recreate with new logic)
DROP POLICY IF EXISTS intervention_time_slots_update ON intervention_time_slots;

-- Recreate UPDATE policy with cancellation permissions
-- Can update if:
-- 1. User is the proposer (can cancel their own slots)
-- 2. User is a manager in the intervention's team (can cancel any slot)
-- 3. User is admin (can do anything)
CREATE POLICY intervention_time_slots_update ON intervention_time_slots
  FOR UPDATE
  USING (
    -- Proposer can update their own slots
    proposed_by = auth.uid()
    OR
    -- Team managers can update any slot in their team's interventions
    EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE i.id = intervention_time_slots.intervention_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('gestionnaire', 'admin')
    )
    OR
    -- Admins can update anything
    is_admin()
  );

COMMENT ON POLICY intervention_time_slots_update ON intervention_time_slots IS 'Proposer + team managers + admins can update time slots';

-- =====================================================================================
-- 6. MIGRATE EXISTING DATA
-- =====================================================================================

-- Update existing slots that are selected (is_selected = TRUE)
-- Set them to 'selected' status and mark as validated by manager
UPDATE intervention_time_slots
SET
  status = 'selected',
  selected_by_manager = TRUE
WHERE is_selected = TRUE;

-- All other existing slots default to 'pending' (already set by DEFAULT)

-- For existing slots with proposed_by, run the validation logic manually
UPDATE intervention_time_slots ts
SET
  selected_by_manager = CASE WHEN u.role IN ('gestionnaire', 'admin') THEN TRUE ELSE FALSE END,
  selected_by_provider = CASE WHEN u.role = 'prestataire' THEN TRUE ELSE FALSE END,
  selected_by_tenant = CASE WHEN u.role = 'locataire' THEN TRUE ELSE FALSE END,
  status = CASE
    WHEN u.role IN ('gestionnaire', 'admin') THEN 'requested'::time_slot_status
    ELSE 'pending'::time_slot_status
  END
FROM users u
WHERE ts.proposed_by = u.id
  AND ts.status = 'pending'; -- Only update those not already 'selected'

-- =====================================================================================
-- 7. CREATE HELPER FUNCTION (OPTIONAL)
-- =====================================================================================

-- Function to check if a time slot is fully validated by all parties
CREATE OR REPLACE FUNCTION is_time_slot_fully_validated(slot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  needs_provider BOOLEAN;
  needs_tenant BOOLEAN;
  slot_record RECORD;
BEGIN
  -- Get the slot info
  SELECT
    ts.selected_by_manager,
    ts.selected_by_provider,
    ts.selected_by_tenant,
    i.provider_id,
    i.tenant_id
  INTO slot_record
  FROM intervention_time_slots ts
  INNER JOIN interventions i ON i.id = ts.intervention_id
  WHERE ts.id = slot_id;

  -- Determine if provider/tenant validation is needed
  needs_provider := slot_record.provider_id IS NOT NULL;
  needs_tenant := slot_record.tenant_id IS NOT NULL;

  -- Check if all required validations are present
  RETURN
    slot_record.selected_by_manager = TRUE
    AND (NOT needs_provider OR slot_record.selected_by_provider = TRUE)
    AND (NOT needs_tenant OR slot_record.selected_by_tenant = TRUE);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_time_slot_fully_validated(UUID) IS 'Checks if time slot is validated by all required parties';

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
