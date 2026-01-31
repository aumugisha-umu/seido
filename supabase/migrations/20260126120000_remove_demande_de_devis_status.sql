-- Migration: Remove demande_de_devis status from intervention workflow
-- Date: 2026-01-26
-- Description: The demande_de_devis status is REDUNDANT because quote status
-- can be derived from the intervention_quotes table. This simplifies the workflow
-- from 10 to 9 statuses while maintaining full quote visibility via badges.
-- Pattern copied from 20260114100000_remove_en_cours_status.sql

-- ============================================================================
-- STEP 1: Update existing interventions in demande_de_devis status
-- ============================================================================

UPDATE interventions
SET status = 'planification',
    updated_at = NOW()
WHERE status = 'demande_de_devis';

-- Log how many were updated
DO $$
DECLARE
    affected_count INT;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM interventions
    WHERE updated_at >= NOW() - INTERVAL '1 minute'
      AND status = 'planification';
    RAISE NOTICE 'Migrated % interventions from demande_de_devis to planification', affected_count;
END $$;

-- ============================================================================
-- STEP 2: Drop the DEFAULT constraint (required before changing enum type)
-- ============================================================================

ALTER TABLE interventions ALTER COLUMN status DROP DEFAULT;

-- ============================================================================
-- STEP 3: Drop view that depends on the status column (if exists)
-- ============================================================================

DROP VIEW IF EXISTS interventions_active;

-- ============================================================================
-- STEP 4: Drop ALL triggers that have WHEN clauses referencing status column
-- ============================================================================

DROP TRIGGER IF EXISTS interventions_log_status_change ON interventions;
DROP TRIGGER IF EXISTS interventions_validate_status_transition ON interventions;

-- ============================================================================
-- STEP 5: Rename old enum and create new one without demande_de_devis
-- ============================================================================

ALTER TYPE intervention_status RENAME TO intervention_status_old;

CREATE TYPE intervention_status AS ENUM (
    'demande',
    'rejetee',
    'approuvee',
    'planification',
    'planifiee',
    'cloturee_par_prestataire',
    'cloturee_par_locataire',
    'cloturee_par_gestionnaire',
    'annulee'
);

-- ============================================================================
-- STEP 6: Convert the column to use the new type
-- ============================================================================

ALTER TABLE interventions
    ALTER COLUMN status TYPE intervention_status
    USING status::text::intervention_status;

-- ============================================================================
-- STEP 7: Restore the DEFAULT constraint with new type
-- ============================================================================

ALTER TABLE interventions ALTER COLUMN status SET DEFAULT 'demande'::intervention_status;

-- ============================================================================
-- STEP 8: Drop the old type
-- ============================================================================

DROP TYPE intervention_status_old;

-- ============================================================================
-- STEP 9: Recreate the triggers
-- ============================================================================

CREATE TRIGGER interventions_log_status_change
    AFTER UPDATE ON interventions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_intervention_status_change();

CREATE TRIGGER interventions_validate_status_transition
    BEFORE UPDATE ON interventions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_intervention_status_transition();

-- ============================================================================
-- STEP 10: Recreate the interventions_active view
-- ============================================================================

CREATE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

COMMENT ON VIEW interventions_active IS
'Vue sur interventions actives (non soft-deleted). Hérite automatiquement des politiques RLS de la table interventions.';

-- ============================================================================
-- VERIFICATION QUERY (for post-migration check)
-- ============================================================================

-- Run this after migration to verify:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'intervention_status'::regtype ORDER BY enumsortorder;
-- Expected: demande, rejetee, approuvee, planification, planifiee,
--           cloturee_par_prestataire, cloturee_par_locataire, cloturee_par_gestionnaire, annulee
