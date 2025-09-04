-- =============================================================================
-- SEIDO APP - RESET COMPLET DE LA BASE DE DONNÉES DISTANTE
-- =============================================================================
-- Cette migration supprime TOUT pour repartir de zéro proprement
-- ⚠️  ATTENTION: Ceci va supprimer toutes les données existantes !

-- =============================================================================
-- 1. SUPPRIMER TOUTES LES POLITIQUES RLS
-- =============================================================================

-- Supprimer toutes les politiques existantes pour éviter les conflits
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Supprimer toutes les politiques RLS
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- =============================================================================
-- 2. SUPPRIMER TOUTES LES TABLES DANS L'ORDRE CORRECT
-- =============================================================================

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS building_contacts CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS lots CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Supprimer les tables temporaires si elles existent
DROP TABLE IF EXISTS temp_user_policies_backup CASCADE;
DROP TABLE IF EXISTS temp_team_policies_backup CASCADE;

-- =============================================================================
-- 3. SUPPRIMER TOUTES LES FONCTIONS PERSONNALISÉES
-- =============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_intervention_reference() CASCADE;
DROP FUNCTION IF EXISTS set_intervention_reference() CASCADE;
DROP FUNCTION IF EXISTS get_user_teams(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_belongs_to_team(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS check_user_permissions() CASCADE;
DROP FUNCTION IF EXISTS test_user_creation(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS test_user_creation_no_rls(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS test_team_creation(UUID) CASCADE;
DROP FUNCTION IF EXISTS test_signup_flow() CASCADE;
DROP FUNCTION IF EXISTS diagnose_user_policies() CASCADE;
DROP FUNCTION IF EXISTS validate_user_rls_setup() CASCADE;
DROP FUNCTION IF EXISTS validate_rls_complete() CASCADE;
DROP FUNCTION IF EXISTS validate_rls_setup() CASCADE;

-- =============================================================================
-- 4. SUPPRIMER TOUS LES TYPES ÉNUMÉRÉS
-- =============================================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS intervention_status CASCADE;
DROP TYPE IF EXISTS intervention_urgency CASCADE;
DROP TYPE IF EXISTS intervention_type CASCADE;

-- =============================================================================
-- 5. NETTOYER LES SÉQUENCES ET AUTRES OBJETS
-- =============================================================================

-- Supprimer les séquences générées automatiquement si elles existent
DROP SEQUENCE IF EXISTS temp_user_policies_backup_id_seq CASCADE;
DROP SEQUENCE IF EXISTS temp_team_policies_backup_id_seq CASCADE;

-- =============================================================================
-- 6. VALIDATION DU NETTOYAGE
-- =============================================================================

DO $$
DECLARE
    table_count INTEGER := 0;
    function_count INTEGER := 0;
    type_count INTEGER := 0;
    policy_count INTEGER := 0;
BEGIN
    -- Compter les tables restantes (hors système)
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Compter les fonctions personnalisées restantes
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    AND routine_name NOT LIKE 'pg_%'
    AND routine_name NOT LIKE '_pg_%';
    
    -- Compter les types personnalisés restants
    SELECT COUNT(*) INTO type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typname NOT LIKE 'pg_%'
    AND t.typname NOT LIKE '_%';
    
    -- Compter les politiques RLS restantes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '=== NETTOYAGE COMPLET TERMINÉ ===';
    RAISE NOTICE '📊 Tables publiques restantes: %', table_count;
    RAISE NOTICE '📊 Fonctions personnalisées restantes: %', function_count;
    RAISE NOTICE '📊 Types personnalisés restants: %', type_count;
    RAISE NOTICE '📊 Politiques RLS restantes: %', policy_count;
    RAISE NOTICE '';
    
    IF table_count = 0 AND policy_count = 0 THEN
        RAISE NOTICE '✅ BASE DE DONNÉES COMPLÈTEMENT NETTOYÉE !';
        RAISE NOTICE '🎯 Prêt pour les nouvelles migrations';
    ELSE
        RAISE NOTICE '⚠️  Nettoyage partiel - Vérifiez les objets restants';
    END IF;
END $$;
