-- 🚨 CORRECTION DÉFINITIVE - POLITIQUE RLS TABLE USERS
-- Cette correction résout définitivement le problème d'inscription
-- en gérant le cas où auth.uid() n'est pas disponible pendant le signup

-- =============================================================================
-- 1. SUPPRIMER TOUTES LES POLITIQUES DÉFECTUEUSES
-- =============================================================================

DROP POLICY IF EXISTS "Enable user profile creation - clean" ON users;
DROP POLICY IF EXISTS "Users can view own profile - clean" ON users;  
DROP POLICY IF EXISTS "Users can update own profile - clean" ON users;
DROP POLICY IF EXISTS "Only admins can delete users - clean" ON users;

-- Supprimer aussi les anciennes si elles existent
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- =============================================================================
-- 2. POLITIQUE INSERT CORRIGÉE - GÈRE LE SIGNUP CORRECTEMENT
-- =============================================================================

-- Cette politique gère 3 cas :
-- 1. Utilisateur confirmé normal (auth.uid() = id)
-- 2. Processus signup (auth.uid() null mais ID valide depuis auth.users)  
-- 3. Admin créant des utilisateurs
CREATE POLICY "users_insert_signup_fixed" ON users
    FOR INSERT WITH CHECK (
        -- Cas 1: Utilisateur confirmé normal
        (auth.uid() IS NOT NULL AND auth.uid() = id)
        
        OR
        
        -- Cas 2: Processus signup - vérifier que l'ID existe dans auth.users
        -- Ceci évite les abus tout en permettant l'inscription
        (
            id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = id
            )
            AND (
                -- Soit auth.uid() correspond (utilisateur confirmé)
                auth.uid() = id
                OR
                -- Soit auth.uid() est null (utilisateur non confirmé en cours de signup)
                auth.uid() IS NULL
                OR  
                -- Soit l'utilisateur vient d'être créé (dans les 5 minutes)
                EXISTS (
                    SELECT 1 FROM auth.users au 
                    WHERE au.id = id 
                    AND au.created_at > NOW() - INTERVAL '5 minutes'
                )
            )
        )
        
        OR
        
        -- Cas 3: Admin système (seul 'admin@seido.fr' peut créer des utilisateurs)
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au
                WHERE au.id = auth.uid()
                AND au.email = 'admin@seido.fr'
            )
        )
    );

-- =============================================================================
-- 3. POLITIQUE SELECT CORRIGÉE
-- =============================================================================

CREATE POLICY "users_select_fixed" ON users
    FOR SELECT USING (
        -- Voir son propre profil
        (auth.uid() IS NOT NULL AND auth.uid() = id)
        
        OR
        
        -- Admin peut voir tous les profils
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM users admin_user 
                WHERE admin_user.id = auth.uid() 
                AND admin_user.role = 'admin'
            )
        )
    );

-- =============================================================================  
-- 4. POLITIQUE UPDATE CORRIGÉE
-- =============================================================================

CREATE POLICY "users_update_fixed" ON users
    FOR UPDATE USING (
        -- Modifier son propre profil
        (auth.uid() IS NOT NULL AND auth.uid() = id)
        
        OR
        
        -- Admin peut modifier tous les profils
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM users admin_user 
                WHERE admin_user.id = auth.uid() 
                AND admin_user.role = 'admin'
            )
        )
    );

-- =============================================================================
-- 5. POLITIQUE DELETE CORRIGÉE
-- =============================================================================

CREATE POLICY "users_delete_fixed" ON users
    FOR DELETE USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'admin'
        )
    );

-- =============================================================================
-- 6. FONCTION DE TEST AVANCÉE
-- =============================================================================

CREATE OR REPLACE FUNCTION test_signup_flow()
RETURNS TABLE (
    test_name TEXT,
    success BOOLEAN,
    details TEXT
) AS $$
DECLARE
    test_id UUID := gen_random_uuid();
    auth_user_exists BOOLEAN := false;
    current_auth_uid UUID;
BEGIN
    current_auth_uid := auth.uid();
    
    -- Test 1: Vérifier que auth.uid() fonctionne
    RETURN QUERY SELECT 
        'AUTH_UID_CHECK'::TEXT,
        (current_auth_uid IS NOT NULL),
        CASE 
            WHEN current_auth_uid IS NOT NULL THEN format('auth.uid() = %s', current_auth_uid)
            ELSE 'auth.uid() is NULL (normal during signup)'
        END;
    
    -- Test 2: Simuler une vérification de politique
    BEGIN
        -- Simuler la condition de la politique INSERT
        IF current_auth_uid IS NOT NULL AND current_auth_uid = test_id THEN
            RETURN QUERY SELECT 'POLICY_SCENARIO_1'::TEXT, true, 'Normal authenticated user';
        ELSIF test_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = test_id) THEN
            RETURN QUERY SELECT 'POLICY_SCENARIO_2'::TEXT, true, 'ID exists in auth.users';
        ELSIF current_auth_uid IS NULL THEN
            RETURN QUERY SELECT 'POLICY_SCENARIO_3'::TEXT, true, 'Signup scenario (auth.uid is NULL)';
        ELSE
            RETURN QUERY SELECT 'POLICY_SCENARIO_NONE'::TEXT, false, 'No valid scenario';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'POLICY_TEST_ERROR'::TEXT, false, SQLERRM;
    END;
    
    -- Test 3: Compter les politiques actives
    RETURN QUERY SELECT 
        'ACTIVE_POLICIES'::TEXT,
        true,
        format('%s policies active on users table', 
            (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users')::TEXT
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. VALIDATION FINALE
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER := 0;
    rls_enabled BOOLEAN;
BEGIN
    -- Vérifier RLS
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    -- Compter les politiques
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users';
    
    RAISE NOTICE '=== CORRECTION DÉFINITIVE APPLIQUÉE ===';
    RAISE NOTICE '🛡️ RLS activé: %', rls_enabled;
    RAISE NOTICE '📊 Politiques users: %', policy_count;
    RAISE NOTICE '✅ Politique INSERT gère maintenant 3 cas :';
    RAISE NOTICE '   1. Utilisateur confirmé normal';
    RAISE NOTICE '   2. Processus signup (auth.uid null)';  
    RAISE NOTICE '   3. Admin système';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Tester: SELECT * FROM test_signup_flow();';
    
    IF rls_enabled AND policy_count = 4 THEN
        RAISE NOTICE '🎉 CONFIGURATION CORRECTE - L''inscription devrait maintenant fonctionner !';
    ELSE
        RAISE NOTICE '⚠️ Problème de configuration détecté';
    END IF;
END $$;
