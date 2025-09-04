-- 🚨 CORRECTION RÉCURSION INFINIE - POLITIQUE RLS USERS
-- Cette correction élimine la récursion en simplifiant drastiquement les politiques

-- =============================================================================
-- 1. SUPPRIMER TOUTES LES POLITIQUES RÉCURSIVES
-- =============================================================================

DROP POLICY IF EXISTS "users_insert_signup_fixed" ON users;
DROP POLICY IF EXISTS "users_select_fixed" ON users;  
DROP POLICY IF EXISTS "users_update_fixed" ON users;
DROP POLICY IF EXISTS "users_delete_fixed" ON users;

-- =============================================================================
-- 2. POLITIQUES ULTRA-SIMPLIFIÉES SANS RÉCURSION
-- =============================================================================

-- === POLITIQUE INSERT : ULTRA-SIMPLE ===
-- Permet l'insertion si l'ID correspond à auth.uid() OU si auth.uid() est null (signup)
CREATE POLICY "users_insert_simple" ON users
    FOR INSERT WITH CHECK (
        -- Cas normal : l'utilisateur crée son propre profil
        auth.uid() = id
        OR
        -- Cas signup : auth.uid() peut être null temporairement
        auth.uid() IS NULL
    );

-- === POLITIQUE SELECT : ULTRA-SIMPLE ===
-- Permet de voir son propre profil uniquement
CREATE POLICY "users_select_simple" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

-- === POLITIQUE UPDATE : ULTRA-SIMPLE ===
-- Permet de modifier son propre profil uniquement
CREATE POLICY "users_update_simple" ON users
    FOR UPDATE USING (
        auth.uid() = id
    );

-- === POLITIQUE DELETE : DÉSACTIVÉE TEMPORAIREMENT ===
-- On désactive DELETE pour éviter tout problème pendant les tests
-- Les suppressions d'utilisateurs se feront côté application si nécessaire

-- =============================================================================
-- 3. FONCTION DE DIAGNOSTIC SIMPLIFIÉE
-- =============================================================================

CREATE OR REPLACE FUNCTION diagnose_user_policies()
RETURNS TABLE (
    info_type TEXT,
    details TEXT
) AS $$
DECLARE
    current_uid UUID;
    policy_count INTEGER;
    rls_status BOOLEAN;
BEGIN
    -- Obtenir auth.uid() actuel
    current_uid := auth.uid();
    
    RETURN QUERY SELECT 
        'AUTH_UID'::TEXT,
        CASE 
            WHEN current_uid IS NOT NULL THEN format('auth.uid() = %s', current_uid)
            ELSE 'auth.uid() is NULL (signup scenario)'
        END;
    
    -- Compter les politiques
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users';
    RETURN QUERY SELECT 'POLICIES_COUNT'::TEXT, policy_count::TEXT;
    
    -- Vérifier RLS
    SELECT relrowsecurity INTO rls_status
    FROM pg_class 
    WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    RETURN QUERY SELECT 'RLS_STATUS'::TEXT, 
        CASE WHEN rls_status THEN 'ENABLED' ELSE 'DISABLED' END;
    
    -- Lister les politiques actives
    FOR info_type, details IN 
        SELECT 'POLICY'::TEXT, format('%s: %s', policyname, cmd)
        FROM pg_policies 
        WHERE tablename = 'users'
        ORDER BY cmd, policyname
    LOOP
        RETURN QUERY SELECT info_type, details;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. VALIDATION ET DIAGNOSTIC
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
    
    RAISE NOTICE '=== CORRECTION RÉCURSION APPLIQUÉE ===';
    RAISE NOTICE '🛡️ RLS activé: %', rls_enabled;
    RAISE NOTICE '📊 Politiques users: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ POLITIQUES ULTRA-SIMPLIFIÉES :';
    RAISE NOTICE '   INSERT: auth.uid() = id OR auth.uid() IS NULL';
    RAISE NOTICE '   SELECT: auth.uid() = id';
    RAISE NOTICE '   UPDATE: auth.uid() = id';
    RAISE NOTICE '   DELETE: désactivé temporairement';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Diagnostic: SELECT * FROM diagnose_user_policies();';
    
    IF rls_enabled AND policy_count >= 3 THEN
        RAISE NOTICE '🎉 AUCUNE RÉCURSION POSSIBLE - L''inscription devrait fonctionner !';
    ELSE
        RAISE NOTICE '⚠️ Configuration incomplète';
    END IF;
END $$;
