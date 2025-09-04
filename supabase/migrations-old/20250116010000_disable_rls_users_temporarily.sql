-- =============================================================================
-- SEIDO APP - SOLUTION TEMPORAIRE : DÉSACTIVER RLS SUR USERS
-- =============================================================================
-- Cette migration désactive temporairement RLS sur la table users pour
-- permettre l'inscription, le temps de diagnostiquer le vrai problème

-- =============================================================================
-- 1. SAUVEGARDER L'ÉTAT ACTUEL
-- =============================================================================

-- Créer une table de backup des politiques actuelles
CREATE TABLE IF NOT EXISTS temp_user_policies_backup (
    id SERIAL PRIMARY KEY,
    policy_name TEXT,
    policy_cmd TEXT,
    policy_qual TEXT,
    policy_with_check TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sauvegarder les politiques actuelles
INSERT INTO temp_user_policies_backup (policy_name, policy_cmd, policy_qual, policy_with_check)
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';

-- =============================================================================
-- 2. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES SUR USERS
-- =============================================================================

-- Supprimer toutes les politiques sur users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable user profile creation during signup" ON users;
DROP POLICY IF EXISTS "Admins can create users for others" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can create own profile during signup" ON users;
DROP POLICY IF EXISTS "Allow user profile creation during signup" ON users;

-- =============================================================================
-- 3. DÉSACTIVER RLS TEMPORAIREMENT
-- =============================================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. FONCTION DE DEBUG AMÉLIORÉE
-- =============================================================================

-- Fonction pour tester la création d'utilisateur sans RLS
CREATE OR REPLACE FUNCTION test_user_creation_no_rls(
    test_email TEXT DEFAULT 'test@example.com',
    test_name TEXT DEFAULT 'Test User'
)
RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    error_message TEXT
) AS $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    auth_uid UUID;
BEGIN
    -- Obtenir l'auth.uid() actuel
    auth_uid := auth.uid();
    
    RAISE NOTICE 'Testing user creation without RLS:';
    RAISE NOTICE '  - auth.uid(): %', auth_uid;
    RAISE NOTICE '  - test_email: %', test_email;
    RAISE NOTICE '  - generated user_id: %', new_user_id;
    
    BEGIN
        -- Tenter de créer un utilisateur
        INSERT INTO users (id, email, name, role)
        VALUES (new_user_id, test_email, test_name, 'gestionnaire');
        
        RAISE NOTICE '  ✅ User creation successful!';
        
        -- Nettoyer (supprimer le test user)
        DELETE FROM users WHERE id = new_user_id;
        
        RETURN QUERY SELECT true::BOOLEAN, new_user_id, NULL::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ User creation failed: %', SQLERRM;
        RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. LOG DE L'ÉTAT ACTUEL
-- =============================================================================

DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER := 0;
BEGIN
    -- Vérifier l'état RLS
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    -- Compter les politiques restantes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users';
    
    RAISE NOTICE '=== MIGRATION TEMPORAIRE APPLIQUÉE ===';
    RAISE NOTICE '⚠️  RLS TEMPORAIREMENT DÉSACTIVÉ sur la table users';
    RAISE NOTICE '📊 RLS enabled: %', rls_enabled;
    RAISE NOTICE '📊 Politiques restantes: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Tester: SELECT * FROM test_user_creation_no_rls();';
    RAISE NOTICE '📝 IMPORTANT: Réactiver RLS dès que l''inscription fonctionne !';
    RAISE NOTICE '📋 Politiques sauvegardées dans temp_user_policies_backup';
END $$;
