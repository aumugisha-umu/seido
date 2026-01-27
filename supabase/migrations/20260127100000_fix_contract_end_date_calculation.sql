-- ============================================================================
-- Migration: Fix contract end_date calculation
-- ============================================================================
--
-- PROBLÈME:
-- La formule actuelle: start_date + N mois = premier jour APRÈS le contrat
-- Exemple: 01/01/2026 + 12 mois = 01/01/2027
--
-- CORRECTION:
-- Nouvelle formule: start_date + N mois - 1 jour = dernier jour DU contrat
-- Exemple: 01/01/2026 + 12 mois - 1 jour = 31/12/2026
--
-- LOGIQUE MÉTIER:
-- Un bail d'1 an commençant le 1er janvier doit se terminer le 31 décembre
-- (dernier jour inclus), pas le 1er janvier suivant.
-- ============================================================================

-- 1. Supprimer la vue qui dépend de end_date
DROP VIEW IF EXISTS contracts_active;

-- 2. Modifier la colonne générée end_date
ALTER TABLE contracts
DROP COLUMN end_date;

ALTER TABLE contracts
ADD COLUMN end_date DATE GENERATED ALWAYS AS (
  start_date + make_interval(months => duration_months) - interval '1 day'
) STORED;

-- 3. Recréer la vue
CREATE VIEW contracts_active AS
SELECT * FROM contracts WHERE deleted_at IS NULL;

COMMENT ON VIEW contracts_active IS
'Vue sur contrats actifs (non soft-deleted). Hérite automatiquement des politiques RLS de la table contracts.';

-- 4. Réattribuer les permissions
GRANT SELECT ON contracts_active TO authenticated;

-- 5. Ajouter un commentaire explicatif sur la colonne
COMMENT ON COLUMN contracts.end_date IS
'Date de fin du contrat (dernier jour inclus). Calculé automatiquement: start_date + duration_months - 1 jour. Ex: 01/01/2026 + 12 mois = 31/12/2026';
