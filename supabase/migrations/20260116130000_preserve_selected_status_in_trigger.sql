-- =====================================================================================
-- Migration: Preserve 'selected' status in auto-validation trigger
-- Description: When a time slot is explicitly created with status='selected',
--              the trigger should preserve it instead of overwriting to 'requested'.
--              This fixes the issue where time slots created from lease (bail) were
--              showing as "proposed" instead of "selected".
-- Date: 2026-01-16
-- =====================================================================================

CREATE OR REPLACE FUNCTION auto_set_time_slot_validation()
RETURNS TRIGGER AS $$
DECLARE
  proposer_role user_role;
BEGIN
  -- Only apply on INSERT when proposed_by is set
  IF NEW.proposed_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- ✅ NEW: If status is explicitly 'selected', preserve it (bail auto-creation case)
  -- This allows intervention-actions.ts to create pre-selected time slots
  -- when interventions are created from a lease
  IF NEW.status = 'selected' THEN
    -- Just ensure manager validation is set, don't change status
    NEW.selected_by_manager := TRUE;
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

COMMENT ON FUNCTION auto_set_time_slot_validation() IS
  'Auto-validates time slot based on proposer role. Preserves selected status if explicitly set (for lease-created interventions).';

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
