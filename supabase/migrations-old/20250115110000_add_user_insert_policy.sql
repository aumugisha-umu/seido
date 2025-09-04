-- =============================================================================
-- SEIDO APP - Add User INSERT Policy
-- =============================================================================
-- Cette migration ajoute la politique manquante pour permettre aux utilisateurs
-- de créer leur propre profil lors du signup

-- =============================================================================
-- POLITIQUE INSERT POUR LA TABLE USERS
-- =============================================================================

-- Permettre aux utilisateurs de créer leur propre profil lors du signup
-- L'utilisateur ne peut créer que son propre profil (id doit correspondre à auth.uid())
CREATE POLICY "Users can create own profile during signup" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Vérifier que la politique a bien été créée
DO $$
BEGIN
    RAISE NOTICE '✅ Politique INSERT ajoutée pour la table users';
    RAISE NOTICE '📝 Les utilisateurs peuvent maintenant créer leur profil lors du signup';
END $$;
