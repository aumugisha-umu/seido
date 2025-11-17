-- Migration: Add scheduling_method column to interventions table
-- Date: 2025-11-17
-- Description: Adds a scheduling_method column to track how the intervention was scheduled
--              (direct = fixed date, slots = proposed time slots, flexible = participants organize)

-- Add scheduling_method column
ALTER TABLE interventions
ADD COLUMN scheduling_method TEXT;

-- Add constraint to allow only specific values
ALTER TABLE interventions
ADD CONSTRAINT interventions_scheduling_method_check
CHECK (scheduling_method IN ('direct', 'slots', 'flexible'));

-- Add comment for documentation
COMMENT ON COLUMN interventions.scheduling_method IS
'Method of scheduling: direct (fixed date), slots (proposed time slots), flexible (participants organize themselves)';

-- Add index for better query performance
CREATE INDEX idx_interventions_scheduling_method ON interventions(scheduling_method);
