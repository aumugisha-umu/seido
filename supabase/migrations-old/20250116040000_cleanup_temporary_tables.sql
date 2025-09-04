-- =============================================================================
-- SEIDO APP - NETTOYAGE DES TABLES TEMPORAIRES
-- =============================================================================
-- Cette migration supprime les tables de backup créées pendant les corrections RLS
-- maintenant que tout fonctionne correctement

-- =============================================================================
-- 1. AFFICHER LE CONTENU DES BACKUPS AVANT SUPPRESSION (POUR INFO)
-- =============================================================================

DO $$
DECLARE
    user_policies_count INTEGER := 0;
    team_policies_count INTEGER := 0;
BEGIN
    -- Compter les politiques sauvegardées
    SELECT COUNT(*) INTO user_policies_count FROM temp_user_policies_backup;
    SELECT COUNT(*) INTO team_policies_count FROM temp_team_policies_backup;
    
    RAISE NOTICE '=== NETTOYAGE DES TABLES TEMPORAIRES ===';
    RAISE NOTICE '📊 Politiques users sauvegardées: %', user_policies_count;
    RAISE NOTICE '📊 Politiques teams sauvegardées: %', team_policies_count;
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ Suppression des tables de backup...';
END $$;

-- =============================================================================
-- 2. SUPPRIMER LES TABLES DE BACKUP
-- =============================================================================

-- Supprimer les tables temporaires
DROP TABLE IF EXISTS temp_user_policies_backup;
DROP TABLE IF EXISTS temp_team_policies_backup;

-- Supprimer les fonctions de test si plus nécessaires (optionnel)
DROP FUNCTION IF EXISTS test_user_creation(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS test_user_creation_no_rls(TEXT, TEXT);
DROP FUNCTION IF EXISTS test_team_creation(UUID);

-- =============================================================================
-- 3. VALIDATION FINALE - ÉTAT PROPRE DE LA BASE
-- =============================================================================

DO $$
DECLARE
    temp_tables_count INTEGER := 0;
    users_rls_enabled BOOLEAN;
    users_policies_count INTEGER := 0;
    teams_policies_count INTEGER := 0;
    members_policies_count INTEGER := 0;
BEGIN
    -- Vérifier qu'il n'y a plus de tables temporaires
    SELECT COUNT(*) INTO temp_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'temp_%';
    
    -- Vérifier l'état RLS
    SELECT relrowsecurity INTO users_rls_enabled
    FROM pg_class 
    WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    -- Compter les politiques finales
    SELECT COUNT(*) INTO users_policies_count FROM pg_policies WHERE tablename = 'users';
    SELECT COUNT(*) INTO teams_policies_count FROM pg_policies WHERE tablename = 'teams';
    SELECT COUNT(*) INTO members_policies_count FROM pg_policies WHERE tablename = 'team_members';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ÉTAT FINAL DE LA BASE ===';
    RAISE NOTICE '✅ Tables temporaires supprimées';
    RAISE NOTICE '📊 Tables temp restantes: %', temp_tables_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS users activé: %', users_rls_enabled;
    RAISE NOTICE '📊 Politiques users: %', users_policies_count;
    RAISE NOTICE '📊 Politiques teams: %', teams_policies_count;
    RAISE NOTICE '📊 Politiques team_members: %', members_policies_count;
    RAISE NOTICE '';
    
    IF temp_tables_count = 0 AND users_rls_enabled AND users_policies_count > 0 THEN
        RAISE NOTICE '🎉 BASE DE DONNÉES PROPRE ET SÉCURISÉE !';
        RAISE NOTICE '✅ Inscription fonctionnelle avec RLS correctement configuré';
    ELSE
        RAISE NOTICE '⚠️  Vérifiez la configuration';
    END IF;
END $$;
