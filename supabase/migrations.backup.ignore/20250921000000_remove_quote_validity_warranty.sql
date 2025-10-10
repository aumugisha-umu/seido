-- =============================================================================
-- MIGRATION: Suppression des champs validité et garantie des devis
-- =============================================================================
-- Cette migration supprime les champs valid_until et warranty_period_months
-- de la table intervention_quotes ainsi que les contraintes et index associés

-- Supprimer l'index sur valid_until
DROP INDEX IF EXISTS idx_intervention_quotes_valid_until;

-- Supprimer la contrainte de validation de la date de validité
ALTER TABLE intervention_quotes DROP CONSTRAINT IF EXISTS valid_validity_date;

-- Supprimer les colonnes
ALTER TABLE intervention_quotes DROP COLUMN IF EXISTS valid_until;
ALTER TABLE intervention_quotes DROP COLUMN IF EXISTS warranty_period_months;

-- Log de confirmation
DO $$
BEGIN
    RAISE NOTICE '=== SUPPRESSION CHAMPS VALIDITÉ ET GARANTIE DEVIS ===';
    RAISE NOTICE '✅ Index idx_intervention_quotes_valid_until supprimé';
    RAISE NOTICE '✅ Contrainte valid_validity_date supprimée';
    RAISE NOTICE '✅ Colonne valid_until supprimée';
    RAISE NOTICE '✅ Colonne warranty_period_months supprimée';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Table intervention_quotes simplifiée';
END $$;