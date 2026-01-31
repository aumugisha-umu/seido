-- Migration: Fix - Recreate interventions_active view
-- Date: 2026-01-29
-- Description: The view was dropped in 20260126120000_remove_demande_de_devis_status.sql
-- but never recreated, causing tenant dashboard to not display interventions.
--
-- Root cause: Migration dropped view to modify intervention_status enum
-- but forgot to recreate it at the end (Step 10 was missing).

-- Recreate the interventions_active view
-- This view filters out soft-deleted interventions
CREATE OR REPLACE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON VIEW interventions_active IS
'Vue sur interventions actives (non soft-deleted). Hérite automatiquement des politiques RLS de la table interventions.';

-- Grant same permissions as base table
-- The view inherits RLS from the interventions table automatically
