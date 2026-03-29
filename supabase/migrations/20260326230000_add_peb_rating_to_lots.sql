-- 20260326230000_add_peb_rating_to_lots.sql
-- Add PEB/EPC energy performance rating to lots table
-- Values align with the indexation calculation engine (lib/indexation/types.ts)

ALTER TABLE lots
  ADD COLUMN peb_rating TEXT;

ALTER TABLE lots
  ADD CONSTRAINT lots_valid_peb_rating
  CHECK (peb_rating IS NULL OR peb_rating IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'inconnu'));

COMMENT ON COLUMN lots.peb_rating IS 'PEB/EPC energy performance certificate rating. NULL = not set. Used for rent indexation calculations.';
