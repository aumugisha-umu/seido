-- Migration: Fix Lot Reference Uniqueness
-- Allow same lot reference in different buildings
--
-- BEFORE: UNIQUE (team_id, reference) - reference must be unique per team
-- AFTER: UNIQUE (building_id, reference) WHERE building_id IS NOT NULL - reference must be unique per building
--
-- This allows:
-- - "Appartement 3" in Building A
-- - "Appartement 3" in Building B
-- - BUT NOT two "Appartement 3" in the same building
-- - Independent lots (building_id IS NULL) can have duplicate references

-- Step 1: Drop the existing constraint
ALTER TABLE lots
DROP CONSTRAINT IF EXISTS unique_lot_reference_per_team;

-- Step 2: Add new constraint for lots linked to buildings
-- Using partial unique index (WHERE building_id IS NOT NULL)
-- This allows:
-- - Same reference in different buildings
-- - Multiple independent lots (building_id IS NULL) with same reference
CREATE UNIQUE INDEX unique_lot_reference_per_building
ON lots (building_id, reference)
WHERE building_id IS NOT NULL;

-- Update comments
COMMENT ON COLUMN lots.reference IS 'Reference du lot (unique au sein d''un meme immeuble)';
