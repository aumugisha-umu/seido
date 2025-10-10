-- Migration Part 2: Migrate intervention status data from French to English
-- Date: 2025-10-03
-- Description: Updates all intervention records to use English status values

-- Migrate data from French to English values
UPDATE interventions
SET status = CASE status::text
  WHEN 'demande' THEN 'pending'::intervention_status
  WHEN 'rejetee' THEN 'rejected'::intervention_status
  WHEN 'approuvee' THEN 'approved'::intervention_status
  WHEN 'demande_de_devis' THEN 'quote_requested'::intervention_status
  WHEN 'planification' THEN 'scheduling'::intervention_status
  WHEN 'planifiee' THEN 'scheduled'::intervention_status
  WHEN 'en_cours' THEN 'in_progress'::intervention_status
  WHEN 'cloturee_par_prestataire' THEN 'provider_completed'::intervention_status
  WHEN 'cloturee_par_locataire' THEN 'tenant_validated'::intervention_status
  WHEN 'cloturee_par_gestionnaire' THEN 'completed'::intervention_status
  WHEN 'annulee' THEN 'cancelled'::intervention_status
  ELSE status
END
WHERE status::text IN (
  'demande',
  'rejetee',
  'approuvee',
  'demande_de_devis',
  'planification',
  'planifiee',
  'en_cours',
  'cloturee_par_prestataire',
  'cloturee_par_locataire',
  'cloturee_par_gestionnaire',
  'annulee'
);

-- Verify migration
DO $$
DECLARE
  total_count INTEGER;
  french_count INTEGER;
  status_distribution TEXT;
BEGIN
  -- Count total interventions
  SELECT COUNT(*) INTO total_count FROM interventions;

  -- Count remaining French statuses
  SELECT COUNT(*) INTO french_count
  FROM interventions
  WHERE status::text IN (
    'demande', 'rejetee', 'approuvee', 'demande_de_devis',
    'planification', 'planifiee', 'en_cours',
    'cloturee_par_prestataire', 'cloturee_par_locataire',
    'cloturee_par_gestionnaire', 'annulee'
  );

  -- Get status distribution
  SELECT string_agg(status::text || ': ' || count::text, ', ' ORDER BY status::text)
  INTO status_distribution
  FROM (
    SELECT status, COUNT(*) as count
    FROM interventions
    GROUP BY status
  ) s;

  -- Log results
  RAISE NOTICE '✅ Migration completed';
  RAISE NOTICE '   Total interventions: %', total_count;
  RAISE NOTICE '   Remaining French statuses: %', french_count;
  RAISE NOTICE '   Status distribution: %', status_distribution;

  -- Fail if French statuses remain
  IF french_count > 0 THEN
    RAISE EXCEPTION '❌ Migration incomplete: % interventions still have French statuses', french_count;
  END IF;
END$$;

-- Update comments
COMMENT ON TYPE intervention_status IS 'Intervention status ENUM (English): pending, rejected, approved, quote_requested, scheduling, scheduled, in_progress, provider_completed, tenant_validated, completed, cancelled';
COMMENT ON COLUMN interventions.status IS 'Current intervention status (English ENUM)';
