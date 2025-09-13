-- =============================================================================
-- FIX: RENDRE TENANT_ID NULLABLE POUR LES INTERVENTIONS
-- =============================================================================
-- Cette migration corrige la contrainte NOT NULL sur tenant_id pour permettre
-- aux gestionnaires de créer des interventions sans locataire spécifique
-- (ex: interventions sur bâtiment entier, parties communes, etc.)

-- =============================================================================
-- MODIFICATION DE LA CONTRAINTE TENANT_ID
-- =============================================================================

-- Supprimer la contrainte NOT NULL sur tenant_id dans la table interventions
ALTER TABLE interventions 
ALTER COLUMN tenant_id DROP NOT NULL;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== CONTRAINTE TENANT_ID MISE À JOUR AVEC SUCCÈS ===';
    RAISE NOTICE 'Les interventions peuvent maintenant être créées sans locataire spécifique';
END $$;
