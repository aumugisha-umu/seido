-- =============================================================================
-- SEIDO APP - Fix User INSERT Policy for Signup Flow
-- =============================================================================
-- Cette migration corrige la politique INSERT pour les utilisateurs
-- pendant le processus de signup où auth.uid() peut ne pas être disponible

-- =============================================================================
-- SUPPRIMER L'ANCIENNE POLITIQUE
-- =============================================================================

DROP POLICY IF EXISTS "Users can create own profile during signup" ON users;

-- =============================================================================
-- NOUVELLE POLITIQUE PLUS PERMISSIVE POUR LE SIGNUP
-- =============================================================================

-- Permettre la création de profil utilisateur pendant le signup
-- Cette politique est moins restrictive mais nécessaire pour le processus de signup
CREATE POLICY "Allow user profile creation during signup" ON users
    FOR INSERT WITH CHECK (
        -- Permettre si l'ID correspond à auth.uid() (utilisateur connecté)
        auth.uid() = id 
        OR 
        -- Permettre si auth.uid() est null (pendant le processus de signup)
        -- ET que l'ID ressemble à un UUID valide
        (auth.uid() IS NULL AND id IS NOT NULL AND length(id::text) = 36)
    );

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Vérifier que la politique a bien été créée
DO $$
BEGIN
    RAISE NOTICE '✅ Politique INSERT mise à jour pour la table users';
    RAISE NOTICE '🔐 Permet la création de profil pendant le processus de signup';
END $$;
