-- Migration: Remove 'en_cours' status from intervention workflow
-- The status is no longer needed - interventions go directly from 'planifiee' to finalization

-- 1. Update any existing interventions with 'en_cours' status to 'planifiee'
UPDATE interventions SET status = 'planifiee' WHERE status = 'en_cours';

-- 2. Drop the DEFAULT constraint (required before changing enum type)
ALTER TABLE interventions ALTER COLUMN status DROP DEFAULT;

-- 3. Drop view that depends on the status column
DROP VIEW IF EXISTS interventions_active;

-- 4. Drop ALL triggers that have WHEN clauses referencing status column
DROP TRIGGER IF EXISTS interventions_log_status_change ON interventions;
DROP TRIGGER IF EXISTS interventions_validate_status_transition ON interventions;

-- 5. Recreate the enum without 'en_cours'
-- Note: PostgreSQL doesn't support removing values from enums directly,
-- so we need to recreate the type

ALTER TYPE intervention_status RENAME TO intervention_status_old;

CREATE TYPE intervention_status AS ENUM (
  'demande',
  'rejetee',
  'approuvee',
  'demande_de_devis',
  'planification',
  'planifiee',
  -- 'en_cours' removed - no longer part of workflow
  'cloturee_par_prestataire',
  'cloturee_par_locataire',
  'cloturee_par_gestionnaire',
  'annulee',
  'contestee'
);

-- 6. Update the column to use the new type
ALTER TABLE interventions
  ALTER COLUMN status TYPE intervention_status
  USING status::text::intervention_status;

-- 7. Restore the DEFAULT constraint with new type
ALTER TABLE interventions ALTER COLUMN status SET DEFAULT 'demande'::intervention_status;

-- 8. Drop the old type
DROP TYPE intervention_status_old;

-- 9. Recreate the triggers
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

-- 10. Recreate the view
CREATE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

COMMENT ON VIEW interventions_active IS
'Vue sur interventions actives (non soft-deleted). Hérite automatiquement des politiques RLS de la table interventions.';
