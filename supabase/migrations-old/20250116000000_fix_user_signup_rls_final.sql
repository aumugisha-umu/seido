-- =============================================================================
-- SEIDO APP - CORRECTION DEFINITIVE DES POLITIQUES RLS POUR L'INSCRIPTION
-- =============================================================================
-- Cette migration corrige définitivement le problème d'inscription en 
-- nettoyant toutes les politiques conflictuelles et en créant une politique
-- robuste pour permettre la création de profils utilisateur lors du signup

-- =============================================================================
-- 1. NETTOYAGE DE TOUTES LES ANCIENNES POLITIQUES INSERT CONFLICTUELLES
-- =============================================================================

-- Supprimer toutes les politiques INSERT existantes sur users
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can create own profile during signup" ON users;
DROP POLICY IF EXISTS "Allow user profile creation during signup" ON users;

-- =============================================================================
-- 2. NOUVELLE POLITIQUE INSERT ROBUSTE
-- =============================================================================

-- Cette politique permet la création de profils utilisateur lors du signup
-- Elle gère plusieurs scenarios :
-- 1. Utilisateur connecté (auth.uid() = id) - cas normal après confirmation
-- 2. Processus de signup (auth.uid() peut être null mais id valide) 
-- 3. Service accounts/admin operations
CREATE POLICY "Enable user profile creation during signup" ON users
    FOR INSERT WITH CHECK (
        -- Scenario 1: Utilisateur connecté normal
        auth.uid() = id
        OR
        -- Scenario 2: Processus de signup où auth.uid() peut ne pas être encore disponible
        -- On vérifie que l'ID est un UUID valide (format Supabase)
        (
            id IS NOT NULL 
            AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND (
                -- L'ID correspond à auth.uid() si disponible
                auth.uid() = id
                OR
                -- OU auth.uid() n'est pas encore disponible (processus signup)
                auth.uid() IS NULL
                OR
                -- OU c'est un utilisateur avec des privilèges élevés
                EXISTS (
                    SELECT 1 FROM auth.users au
                    WHERE au.id = auth.uid()
                    AND (
                        au.email IN ('admin@seido.fr', 'system@seido.fr')
                        OR au.raw_app_meta_data->>'role' IN ('admin', 'service_role')
                    )
                )
            )
        )
    );

-- =============================================================================
-- 3. AJOUTER UNE POLITIQUE ADMIN POUR LA GESTION DES UTILISATEURS
-- =============================================================================

-- Permettre aux admins de créer des utilisateurs pour d'autres personnes
CREATE POLICY "Admins can create users for others" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'admin'
        )
    );

-- =============================================================================
-- 4. POLITIQUE SELECT SIMPLIFIEE POUR DEBUG
-- =============================================================================

-- S'assurer qu'il y a une politique SELECT de base (en la recréant si nécessaire)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- =============================================================================
-- 5. FONCTION DE DEBUG POUR TESTER LES POLITIQUES
-- =============================================================================

-- Fonction pour tester l'inscription depuis l'application
CREATE OR REPLACE FUNCTION test_user_creation(
    test_id UUID,
    test_email TEXT,
    test_name TEXT,
    test_role TEXT DEFAULT 'gestionnaire'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_auth_uid UUID;
    can_insert BOOLEAN := false;
BEGIN
    -- Obtenir l'auth.uid() actuel
    current_auth_uid := auth.uid();
    
    -- Log des informations de debug
    RAISE NOTICE 'Test user creation:';
    RAISE NOTICE '  - test_id: %', test_id;
    RAISE NOTICE '  - test_email: %', test_email;
    RAISE NOTICE '  - current auth.uid(): %', current_auth_uid;
    
    -- Simuler l'insertion (sans vraiment insérer)
    -- Ceci nous dira si les politiques permettraient l'insertion
    BEGIN
        -- Test des conditions de la politique
        IF current_auth_uid = test_id THEN
            RAISE NOTICE '  ✅ Scenario 1: auth.uid() = id';
            can_insert := true;
        ELSIF current_auth_uid IS NULL AND test_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE NOTICE '  ✅ Scenario 2: auth.uid() is NULL but valid UUID';
            can_insert := true;
        ELSE
            RAISE NOTICE '  ❌ No scenario matches';
            can_insert := false;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Exception: %', SQLERRM;
        can_insert := false;
    END;
    
    RETURN can_insert;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. VERIFICATION ET NETTOYAGE DES DONNEES INCONSISTANTES
-- =============================================================================

-- Vérifier s'il y a des utilisateurs orphelins dans auth.users sans profil dans public.users
DO $$
DECLARE
    orphan_count INTEGER := 0;
BEGIN
    -- Compter les utilisateurs auth sans profil public
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'ATTENTION: % utilisateurs dans auth.users sans profil dans public.users', orphan_count;
        RAISE NOTICE 'Ces utilisateurs devront être nettoyés ou leurs profils créés';
    ELSE
        RAISE NOTICE 'Aucun utilisateur orphelin détecté';
    END IF;
END $$;

-- =============================================================================
-- 7. VALIDATION FINALE
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER := 0;
BEGIN
    -- Compter les politiques INSERT sur users
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' 
    AND cmd = 'INSERT';
    
    RAISE NOTICE '=== MIGRATION TERMINEE ===';
    RAISE NOTICE '✅ Anciennes politiques INSERT supprimées';
    RAISE NOTICE '✅ Nouvelle politique INSERT créée: "Enable user profile creation during signup"';
    RAISE NOTICE '✅ Politique admin créée: "Admins can create users for others"';
    RAISE NOTICE '✅ Fonction de test créée: test_user_creation()';
    RAISE NOTICE '📊 Nombre total de politiques INSERT sur users: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Pour tester: SELECT test_user_creation(uuid_generate_v4(), ''test@example.com'', ''Test User'');';
    RAISE NOTICE '🔍 Pour voir les politiques: SELECT * FROM pg_policies WHERE tablename = ''users'';';
END $$;
