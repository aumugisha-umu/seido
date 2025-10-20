-- ============================================================================
-- ADD MISSING PLANNING COLUMNS TO INTERVENTIONS
-- ============================================================================
-- Date: 2025-10-16
-- Description: Add requires_quote, scheduling_type, and specific_location
-- Reason: Frontend sends these fields but they don't exist in DB
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create ENUM for scheduling_type
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intervention_scheduling_type') THEN
    CREATE TYPE intervention_scheduling_type AS ENUM (
      'flexible',    -- Horaire à définir (défaut)
      'fixed',       -- Date et heure fixe
      'slots'        -- Proposer des créneaux
    );
  END IF;
END $$;

COMMENT ON TYPE intervention_scheduling_type IS 'Type de planification intervention: flexible (à définir), fixed (date fixe), slots (créneaux proposés)';

-- ----------------------------------------------------------------------------
-- 2. Add columns to interventions table
-- ----------------------------------------------------------------------------

-- Add requires_quote column
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS requires_quote BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN interventions.requires_quote IS 'TRUE si un devis est requis avant l''intervention (checkbox frontend)';

-- Add scheduling_type column
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS scheduling_type intervention_scheduling_type DEFAULT 'flexible' NOT NULL;

COMMENT ON COLUMN interventions.scheduling_type IS 'Type de planification: flexible (à définir), fixed (date/heure fixe), slots (créneaux proposés)';

-- Add specific_location column
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS specific_location TEXT;

COMMENT ON COLUMN interventions.specific_location IS 'Localisation spécifique dans le logement (ex: "Salle de bain du 2ème étage")';

-- ----------------------------------------------------------------------------
-- 3. Create index for requires_quote (for filtering quote requests)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interventions_requires_quote
  ON interventions(requires_quote)
  WHERE requires_quote = TRUE AND deleted_at IS NULL;

COMMENT ON INDEX idx_interventions_requires_quote IS 'Index pour filtrer rapidement les interventions nécessitant un devis';

-- ----------------------------------------------------------------------------
-- 4. Create index for scheduling_type (for filtering by planning type)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interventions_scheduling_type
  ON interventions(scheduling_type)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_interventions_scheduling_type IS 'Index pour filtrer les interventions par type de planification';

-- ============================================================================
-- DATA MIGRATION (Optional - for existing records)
-- ============================================================================

-- Update existing interventions: set scheduling_type based on scheduled_date
UPDATE interventions
SET scheduling_type = CASE
  WHEN scheduled_date IS NOT NULL THEN 'fixed'::intervention_scheduling_type
  ELSE 'flexible'::intervention_scheduling_type
END
WHERE scheduling_type = 'flexible'::intervention_scheduling_type;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
