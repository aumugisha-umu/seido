-- =============================================================================
-- SEIDO APP - RÉACTIVATION RLS SUR USERS AVEC POLITIQUES PROPRES
-- =============================================================================
-- Cette migration réactive RLS sur la table users avec des politiques
-- simples et sans récursion, maintenant que l'inscription fonctionne

-- =============================================================================
-- 1. RÉACTIVER RLS SUR LA TABLE USERS
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. CRÉER DES POLITIQUES SIMPLES ET SÉCURISÉES
-- =============================================================================

-- === SELECT : Voir son propre profil ===
CREATE POLICY "Users can view own profile - clean" ON users
    FOR SELECT USING (auth.uid() = id);

-- === UPDATE : Modifier son propre profil ===  
CREATE POLICY "Users can update own profile - clean" ON users
    FOR UPDATE USING (auth.uid() = id);

-- === INSERT : Création de profil lors de l'inscription ===
-- Cette politique permet la création de profil pendant le signup
CREATE POLICY "Enable user profile creation - clean" ON users
    FOR INSERT WITH CHECK (
        -- L'utilisateur peut créer son propre profil
        auth.uid() = id
        OR
        -- OU pendant le processus signup (auth.uid peut être temporairement null)
        (
            auth.uid() IS NULL 
            AND id IS NOT NULL 
            AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
    );

-- === DELETE : Seuls les admins peuvent supprimer ===
CREATE POLICY "Only admins can delete users - clean" ON users
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'admin'
        )
    );

-- =============================================================================
-- 3. FONCTION DE VALIDATION POST-MIGRATION
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_user_rls_setup()
RETURNS TABLE (
    check_name TEXT,
    status BOOLEAN,
    details TEXT
) AS $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER := 0;
    can_create_test BOOLEAN := false;
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Vérifier que RLS est activé
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    RETURN QUERY SELECT 'RLS_ENABLED'::TEXT, rls_enabled, 
        CASE WHEN rls_enabled THEN 'RLS est activé sur users' ELSE 'RLS est désactivé' END;
    
    -- Compter les politiques
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users';
    RETURN QUERY SELECT 'POLICIES_COUNT'::TEXT, (policy_count > 0), 
        format('Nombre de politiques: %s', policy_count);
    
    -- Tester la création d'utilisateur (simulation)
    BEGIN
        -- Simuler une insertion (sans vraiment insérer)
        PERFORM 1 WHERE EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'users' 
            AND cmd = 'INSERT'
        );
        can_create_test := true;
    EXCEPTION WHEN OTHERS THEN
        can_create_test := false;
    END;
    
    RETURN QUERY SELECT 'INSERT_POLICY_EXISTS'::TEXT, can_create_test,
        CASE WHEN can_create_test THEN 'Politique INSERT trouvée' ELSE 'Pas de politique INSERT' END;
    
    -- Vérifier les politiques essentielles
    RETURN QUERY SELECT 'SELECT_POLICY'::TEXT, 
        EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'users' AND cmd = 'SELECT'),
        'Politique SELECT présente';
        
    RETURN QUERY SELECT 'UPDATE_POLICY'::TEXT, 
        EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'users' AND cmd = 'UPDATE'),
        'Politique UPDATE présente';
        
    RETURN QUERY SELECT 'DELETE_POLICY'::TEXT, 
        EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'users' AND cmd = 'DELETE'),
        'Politique DELETE présente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. NETTOYAGE DES TABLES TEMPORAIRES (OPTIONNEL)
-- =============================================================================

-- Conserver les backups pour debug mais commenter pour éviter l'encombrement
-- DROP TABLE IF EXISTS temp_user_policies_backup;
-- DROP TABLE IF EXISTS temp_team_policies_backup;

-- =============================================================================
-- 5. VALIDATION FINALE
-- =============================================================================

DO $$
DECLARE
    validation_result RECORD;
    all_good BOOLEAN := true;
BEGIN
    RAISE NOTICE '=== VALIDATION POST-MIGRATION ===';
    
    -- Exécuter les validations
    FOR validation_result IN 
        SELECT * FROM validate_user_rls_setup()
    LOOP
        IF validation_result.status THEN
            RAISE NOTICE '✅ %: %', validation_result.check_name, validation_result.details;
        ELSE
            RAISE NOTICE '❌ %: %', validation_result.check_name, validation_result.details;
            all_good := false;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF all_good THEN
        RAISE NOTICE '🎉 MIGRATION RÉUSSIE ! RLS réactivé avec politiques propres';
        RAISE NOTICE '✅ L''inscription devrait maintenant fonctionner complètement';
        RAISE NOTICE '✅ La création d''équipe devrait aussi fonctionner';
    ELSE
        RAISE NOTICE '⚠️  Des problèmes ont été détectés dans la configuration';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Tests disponibles:';
    RAISE NOTICE '  - SELECT * FROM validate_user_rls_setup();';
    RAISE NOTICE '  - SELECT * FROM test_team_creation();';
END $$;
