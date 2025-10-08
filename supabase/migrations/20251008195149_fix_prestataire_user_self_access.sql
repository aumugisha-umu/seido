-- =============================================================================
-- CORRECTION: Permettre aux utilisateurs de lire leur propre profil via auth_user_id
-- =============================================================================
-- Date: 08 octobre 2025
-- Problème: Les prestataires (et autres utilisateurs) ne peuvent pas lire leur propre
--           profil via auth_user_id, causant des erreurs 406/400 et forçant un fallback JWT
-- Solution: Ajouter une policy RLS permettant à tout utilisateur authentifié de lire
--           son propre profil en utilisant auth.uid() pour matcher auth_user_id

-- Vérifier si RLS est activé sur users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne policy si elle existe (pour éviter les conflits)
DROP POLICY IF EXISTS "Users can read their own profile via auth_user_id" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;

-- Créer une policy permettant à chaque utilisateur de lire son propre profil
-- Cette policy utilise auth.uid() (UUID de l'auth Supabase) pour matcher auth_user_id
CREATE POLICY "Users can read their own profile via auth_user_id"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut lire son profil si auth_user_id correspond à auth.uid()
    auth_user_id = auth.uid()
    OR
    -- Admin peut tout lire
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Créer également une policy pour permettre la mise à jour de son propre profil
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR
    -- Admin peut tout modifier
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Créer une policy pour permettre l'insertion du profil lors de la première connexion
DROP POLICY IF EXISTS "Users can insert their own profile on first login" ON users;

CREATE POLICY "Users can insert their own profile on first login"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
  );

-- =============================================================================
-- COMMENTAIRES EXPLICATIFS
-- =============================================================================

COMMENT ON POLICY "Users can read their own profile via auth_user_id" ON users IS
'Permet à tout utilisateur authentifié de lire son propre profil en matchant auth_user_id avec auth.uid()
Cette policy est CRITIQUE pour éviter le mode JWT-only fallback dans auth-service.ts';

COMMENT ON POLICY "Users can update their own profile" ON users IS
'Permet à tout utilisateur authentifié de mettre à jour son propre profil';

COMMENT ON POLICY "Users can insert their own profile on first login" ON users IS
'Permet la création automatique du profil utilisateur lors de la première connexion si nécessaire';

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== CORRECTION ACCÈS PROFIL UTILISATEUR ===';
    RAISE NOTICE '✅ RLS activé sur table users';
    RAISE NOTICE '✅ Policy SELECT créée: lecture de son propre profil via auth_user_id';
    RAISE NOTICE '✅ Policy UPDATE créée: mise à jour de son propre profil';
    RAISE NOTICE '✅ Policy INSERT créée: création du profil à la première connexion';
    RAISE NOTICE '⚠️  IMPORTANT: Cette correction résout les erreurs 406/400 côté prestataire';
    RAISE NOTICE '📋 Prochaine étape: Tester la connexion prestataire sans erreurs';
END $$;
