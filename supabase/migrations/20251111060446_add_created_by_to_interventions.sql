-- Migration: Add created_by to interventions table
-- Date: 2025-11-11
-- Description: Adds created_by field to track who created the intervention

-- Add created_by column
ALTER TABLE interventions
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_interventions_created_by ON interventions(created_by) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN interventions.created_by IS 'User who created the intervention in the system';

-- Backfill existing records: Set created_by to first assigned manager (gestionnaire)
-- This assumes that historically, a manager created or was first assigned to the intervention
UPDATE interventions i
SET created_by = (
  SELECT ia.user_id
  FROM intervention_assignments ia
  INNER JOIN users u ON ia.user_id = u.id
  WHERE ia.intervention_id = i.id
    AND ia.role = 'gestionnaire'
  ORDER BY ia.assigned_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- Note: We don't make it NOT NULL to allow flexibility for system-created interventions
-- or interventions created via API/external systems
