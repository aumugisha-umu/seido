-- Migration: Ajouter is_contested à la table interventions
-- Description: Permet de tracer si le locataire a contesté les travaux lors de la validation

-- Ajouter le champ is_contested pour tracer les contestations locataire
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS is_contested BOOLEAN DEFAULT FALSE;

-- Commentaire explicatif
COMMENT ON COLUMN interventions.is_contested IS 'Indique si le locataire a contesté les travaux lors de la validation';

-- Index partiel pour requêtes de reporting sur les interventions contestées
CREATE INDEX IF NOT EXISTS idx_interventions_contested
ON interventions(is_contested)
WHERE is_contested = TRUE;
