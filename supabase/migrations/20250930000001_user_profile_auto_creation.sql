-- =============================================================================
-- MIGRATION: Auto-création Profil Utilisateur
-- =============================================================================
-- Date: 30 septembre 2025
-- Description: Trigger pour créer automatiquement un profil dans users
--              quand un utilisateur s'inscrit via auth.users (pattern officiel Supabase)
-- Référence: https://supabase.com/docs/guides/auth/managing-user-data
-- =============================================================================

-- =============================================================================
-- FONCTION: handle_new_user()
-- =============================================================================
-- Fonction trigger qui créé automatiquement un profil utilisateur
-- après qu'un user soit créé dans auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role user_role := 'gestionnaire'; -- Rôle par défaut pour signup
BEGIN
  -- Créer le profil utilisateur dans la table public.users
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    name,
    first_name,
    last_name,
    phone,
    role,
    is_active,
    password_set,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),                           -- Générer nouvel UUID pour users.id
    NEW.id,                                       -- auth_user_id = auth.users.id
    NEW.email,                                    -- Email depuis auth
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',     -- Nom complet depuis metadata
      NEW.email                                  -- Fallback sur email
    ),
    NEW.raw_user_meta_data->>'first_name',      -- Prénom depuis metadata
    NEW.raw_user_meta_data->>'last_name',       -- Nom depuis metadata
    NEW.raw_user_meta_data->>'phone',           -- Téléphone depuis metadata
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,  -- Rôle depuis metadata si fourni
      default_role                               -- Sinon gestionnaire par défaut
    ),
    true,                                        -- Actif par défaut
    true,                                        -- Password set = true (signup avec password)
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User profile created for: % (auth_user_id: %)', NEW.email, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    -- Ne pas bloquer l'authentification si la création du profil échoue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: on_auth_user_created
-- =============================================================================
-- Déclenché après l'insertion d'un nouvel utilisateur dans auth.users

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function pour créer automatiquement un profil utilisateur dans public.users après signup. Pattern officiel Supabase.';

-- COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
--   'Auto-création du profil utilisateur après inscription via Supabase Auth.';
-- Note: Permissions insuffisantes pour commenter sur auth.users, commenté pour éviter l'erreur

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger auto-création profil utilisateur installé';
  RAISE NOTICE '📌 Pattern: Supabase Official (handle_new_user)';
  RAISE NOTICE '🔐 Security: SECURITY DEFINER (exécuté avec privilèges function owner)';
  RAISE NOTICE '⚡ Trigger: AFTER INSERT sur auth.users';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Données copiées depuis metadata:';
  RAISE NOTICE '  - first_name, last_name, phone';
  RAISE NOTICE '  - role (optionnel, défaut: gestionnaire)';
  RAISE NOTICE '  - full_name (ou email comme fallback)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complète';
END $$;
