-- ============================================================================
-- ADD SELECTED_SLOT_ID TO INTERVENTIONS TABLE
-- ============================================================================
-- Date: 2025-10-20
-- Description: Add foreign key to track which time slot was selected for the intervention
-- Reason: Frontend tries to update this field but it doesn't exist in DB
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add selected_slot_id column to interventions table
-- ----------------------------------------------------------------------------

ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS selected_slot_id UUID REFERENCES intervention_time_slots(id) ON DELETE SET NULL;

COMMENT ON COLUMN interventions.selected_slot_id IS 'Reference to the selected time slot for this intervention';

-- ----------------------------------------------------------------------------
-- 2. Create index for performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_interventions_selected_slot
  ON interventions(selected_slot_id)
  WHERE selected_slot_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX idx_interventions_selected_slot IS 'Index for quick lookup of intervention by selected slot';

-- ----------------------------------------------------------------------------
-- 3. Add constraint to ensure only one slot is selected per intervention
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_single_selected_slot()
RETURNS TRIGGER AS $$
BEGIN
  -- If this slot is being marked as selected
  IF NEW.is_selected = TRUE AND OLD.is_selected = FALSE THEN
    -- Unselect all other slots for this intervention
    UPDATE intervention_time_slots
    SET is_selected = FALSE
    WHERE intervention_id = NEW.intervention_id
      AND id != NEW.id
      AND is_selected = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ensure_single_selected_slot'
  ) THEN
    CREATE TRIGGER ensure_single_selected_slot
      BEFORE UPDATE OF is_selected ON intervention_time_slots
      FOR EACH ROW
      EXECUTE FUNCTION check_single_selected_slot();
  END IF;
END $$;

COMMENT ON TRIGGER ensure_single_selected_slot ON intervention_time_slots IS 'Ensures only one slot can be selected per intervention';

-- ----------------------------------------------------------------------------
-- 4. Migrate existing data: Link existing selected slots
-- ----------------------------------------------------------------------------

-- For interventions that have a selected slot, update the reference
UPDATE interventions i
SET selected_slot_id = ts.id
FROM intervention_time_slots ts
WHERE ts.intervention_id = i.id
  AND ts.is_selected = TRUE
  AND i.selected_slot_id IS NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================