-- =============================================================================
-- SEIDO APP - Fix RLS Recursion
-- =============================================================================
-- Cette migration corrige la récursion infinie dans les politiques RLS

-- =============================================================================
-- SUPPRIMER LES ANCIENNES POLITIQUES PROBLÉMATIQUES
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Managers can view their tenants" ON users;

-- =============================================================================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- =============================================================================

-- Les utilisateurs peuvent voir leur propre profil (déjà OK)
-- CREATE POLICY "Users can view own profile" ON users
--     FOR SELECT USING (auth.uid() = id);

-- Les utilisateurs peuvent modifier leur propre profil (déjà OK) 
-- CREATE POLICY "Users can update own profile" ON users
--     FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- SOLUTION TEMPORAIRE : POLITIQUES SIMPLIFIÉES
-- =============================================================================

-- Pour l'instant, on permet seulement l'accès au profil personnel
-- Les autres accès (admin, gestionnaire) seront gérés côté application
-- Une fois l'auth stabilisée, nous pourrons ajouter des politiques plus complexes

-- Politique pour permettre aux utilisateurs de s'insérer lors de l'inscription
CREATE POLICY "Allow user creation during signup" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Récursion RLS corrigée ! Politiques simplifiées appliquées.';
    RAISE NOTICE 'L''accès est maintenant limité au profil personnel uniquement.';
    RAISE NOTICE 'Les permissions étendues seront gérées côté application.';
END $$;
