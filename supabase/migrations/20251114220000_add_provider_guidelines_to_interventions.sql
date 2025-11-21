-- Migration: Add provider_guidelines column to interventions table
-- Description: Stores general instructions from manager to provider for an intervention
-- Author: Claude Code
-- Date: 2025-11-14

-- Add provider_guidelines column
ALTER TABLE interventions
ADD COLUMN provider_guidelines TEXT;

-- Add comment for documentation
COMMENT ON COLUMN interventions.provider_guidelines IS 'General instructions from the manager to the service provider. This field is editable by gestionnaires and visible to assigned prestataires.';

-- Note: No RLS policy changes needed - existing policies already cover all columns
-- The field follows the same access rules as other intervention fields:
-- - Gestionnaires can read/write (via can_view_building/can_view_lot helpers)
-- - Prestataires can read when assigned to the intervention
-- - Admins have full access
