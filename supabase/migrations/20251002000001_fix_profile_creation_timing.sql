-- =============================================================================
-- MIGRATION: Correction Timing Création Profil (Email Confirmation)
-- =============================================================================
-- Date: 2 octobre 2025
-- Description: Modifier le trigger pour créer le profil SEULEMENT après
--              confirmation email (UPDATE au lieu de INSERT)
-- Référence: https://supabase.com/docs/guides/auth/managing-user-data
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Supprimer l'ancien trigger (INSERT)
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =============================================================================
-- ÉTAPE 2: Fonction Améliorée - Créer profil + équipe après confirmation email
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  new_team_id UUID;
  user_team_id UUID;
  is_invited BOOLEAN;
  default_role user_role := 'gestionnaire';
BEGIN
  -- Vérifier si c'est une invitation (team_id déjà fourni dans metadata)
  is_invited := (NEW.raw_user_meta_data->>'invited')::BOOLEAN;

  IF is_invited THEN
    -- INVITATION: Utiliser team_id depuis metadata
    user_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;
    RAISE NOTICE 'Creating profile for invited user: % (team: %)', NEW.email, user_team_id;
  ELSE
    -- SIGNUP PUBLIC: Créer équipe personnelle avec nom unique basé sur UUID
    INSERT INTO public.teams (
      id,
      name,
      description,
      created_by -- Sera mis à jour après création user
    ) VALUES (
      gen_random_uuid(),
      'Équipe-' || substring(NEW.id::TEXT from 1 for 8), -- Nom unique basé sur auth user UUID
      'Équipe personnelle',
      NEW.id -- Temporaire, sera remplacé par users.id
    )
    RETURNING id INTO new_team_id;

    user_team_id := new_team_id;
    RAISE NOTICE 'Created personal team: % for signup user: %', new_team_id, NEW.email;
  END IF;

  -- Créer le profil utilisateur dans public.users
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    name,
    first_name,
    last_name,
    phone,
    role,
    provider_category,
    team_id,
    is_active,
    password_set,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      default_role
    ),
    (NEW.raw_user_meta_data->>'provider_category')::provider_category,
    user_team_id,
    true,
    CASE
      WHEN is_invited AND (NEW.raw_user_meta_data->>'skip_password')::BOOLEAN THEN false
      ELSE true
    END,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Si signup public (pas invitation), mettre à jour created_by de l'équipe
  IF NOT is_invited AND new_team_id IS NOT NULL THEN
    UPDATE public.teams
    SET created_by = new_user_id
    WHERE id = new_team_id;

    RAISE NOTICE 'Updated team created_by to user id: %', new_user_id;
  END IF;

  RAISE NOTICE 'User profile created: % (auth_user_id: %, team: %)', NEW.email, NEW.id, user_team_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    -- Ne pas bloquer l'authentification si la création du profil échoue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ÉTAPE 3: Nouveau Trigger - Déclenché APRÈS CONFIRMATION EMAIL
-- =============================================================================

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email_confirmed_at IS NULL
    AND NEW.email_confirmed_at IS NOT NULL
  )
  EXECUTE FUNCTION public.handle_new_user_confirmed();

-- =============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.handle_new_user_confirmed() IS
  'Trigger function pour créer automatiquement un profil utilisateur + équipe dans public.users/teams APRÈS confirmation email. Gère aussi les invitations avec team_id existant.';

-- COMMENT ON TRIGGER on_auth_user_confirmed ON auth.users IS
--   'Auto-création du profil utilisateur APRÈS confirmation email (UPDATE email_confirmed_at). Évite les données orphelines pour users qui ne confirment jamais leur email.';
-- Note: Permissions insuffisantes pour commenter sur auth.users, commenté pour éviter l'erreur

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger confirmation email installé';
  RAISE NOTICE '📌 Pattern: Supabase Official + Email Confirmation Timing';
  RAISE NOTICE '🔐 Security: SECURITY DEFINER (exécuté avec privilèges function owner)';
  RAISE NOTICE '⚡ Trigger: AFTER UPDATE sur auth.users (email_confirmed_at NULL → NOT NULL)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Comportement:';
  RAISE NOTICE '  - SIGNUP: Crée profil + équipe personnelle (nom unique UUID-based)';
  RAISE NOTICE '  - INVITATION: Crée profil avec team_id depuis metadata (pas d''équipe)';
  RAISE NOTICE '  - Profil créé SEULEMENT après confirmation email';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complète';
END $$;
