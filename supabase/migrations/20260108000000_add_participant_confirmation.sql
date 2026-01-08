-- ============================================================================
-- Migration: Système de confirmation des participants
-- Date: 2026-01-08
-- Description:
--   - Ajout de colonnes pour tracker les requirements de confirmation par participant
--   - Permet au créateur de demander confirmation aux participants sélectionnés
--   - Les participants en attente ont un accès restreint (read-only)
-- ============================================================================

-- ============================================================================
-- 1. NOUVEAUX CHAMPS SUR intervention_assignments
-- ============================================================================

-- requires_confirmation: Si ce participant doit confirmer sa disponibilité
ALTER TABLE intervention_assignments
ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN intervention_assignments.requires_confirmation IS
  'Si ce participant doit confirmer sa disponibilité avant de pouvoir interagir pleinement';

-- confirmation_status: État de la confirmation (pending/confirmed/rejected/not_required)
ALTER TABLE intervention_assignments
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'not_required';

-- Contrainte CHECK pour valider les valeurs possibles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'intervention_assignments_confirmation_status_check'
  ) THEN
    ALTER TABLE intervention_assignments
    ADD CONSTRAINT intervention_assignments_confirmation_status_check
    CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected', 'not_required'));
  END IF;
END
$$;

COMMENT ON COLUMN intervention_assignments.confirmation_status IS
  'État de confirmation: pending = en attente, confirmed = accepté, rejected = décliné, not_required = pas de confirmation requise';

-- confirmed_at: Timestamp de la confirmation/rejet
ALTER TABLE intervention_assignments
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN intervention_assignments.confirmed_at IS
  'Date/heure à laquelle le participant a confirmé ou décliné';

-- confirmation_notes: Notes optionnelles (raison du rejet par exemple)
ALTER TABLE intervention_assignments
ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;

COMMENT ON COLUMN intervention_assignments.confirmation_notes IS
  'Notes optionnelles, par exemple la raison d''un rejet';

-- ============================================================================
-- 2. NOUVEAU CHAMP SUR interventions
-- ============================================================================

-- requires_participant_confirmation: Flag global indiquant si cette intervention
-- requiert des confirmations de participants
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS requires_participant_confirmation BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN interventions.requires_participant_confirmation IS
  'Si cette intervention requiert une confirmation de certains participants (mode date fixe avec toggle activé, ou mode créneaux)';

-- ============================================================================
-- 3. INDEX POUR PERFORMANCE
-- ============================================================================

-- Index partiel pour recherche rapide des confirmations en attente
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_pending_confirmation
ON intervention_assignments(intervention_id, confirmation_status)
WHERE requires_confirmation = TRUE;

-- Index pour rechercher les interventions nécessitant des confirmations
CREATE INDEX IF NOT EXISTS idx_interventions_requires_confirmation
ON interventions(id)
WHERE requires_participant_confirmation = TRUE;

-- ============================================================================
-- 4. MISE À JOUR DES DONNÉES EXISTANTES
-- ============================================================================

-- Les assignments existants n'ont pas de confirmation requise
-- (déjà géré par le DEFAULT)

-- ============================================================================
-- Fin de la migration
-- ============================================================================
