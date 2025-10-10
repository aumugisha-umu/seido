-- =============================================================================
-- MIGRATION: Qualify enum types in triggers/functions and set search_path
-- =============================================================================
-- Date: 2025-10-02 19:05:00 (local)
-- Motivation:
--   Production logs showed: type "user_role" does not exist during email confirmation.
--   Root cause is search_path resolution inside SECURITY DEFINER functions casting
--   to enums without schema qualification. We now fully-qualify enum types and
--   set search_path = public for the functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: public.handle_new_user()  (AFTER INSERT on auth.users)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role public.user_role := 'gestionnaire'; -- Rôle par défaut pour signup
BEGIN
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
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      default_role
    ),
    true,
    true,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User profile created for: % (auth_user_id: %)', NEW.email, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Function: public.handle_new_user_confirmed() (AFTER UPDATE on auth.users)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  new_team_id UUID;
  user_team_id UUID;
  is_invited BOOLEAN;
  default_role public.user_role := 'gestionnaire';
BEGIN
  -- Vérifier si c'est une invitation (team_id déjà fourni dans metadata)
  is_invited := (NEW.raw_user_meta_data->>'invited')::BOOLEAN;

  IF is_invited THEN
    -- INVITATION: Utiliser team_id depuis metadata
    user_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;
    RAISE NOTICE 'Creating profile for invited user: % (team: %)', NEW.email, user_team_id;
  ELSE
    -- SIGNUP PUBLIC: Créer équipe personnelle
    INSERT INTO public.teams (
      id,
      name,
      description,
      created_by
    ) VALUES (
      gen_random_uuid(),
      'Équipe-' || substring(NEW.id::TEXT from 1 for 8),
      'Équipe personnelle',
      NEW.id
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
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      default_role
    ),
    (NEW.raw_user_meta_data->>'provider_category')::public.provider_category,
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

  -- Mise à jour created_by pour les signups publics
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
    RAISE WARNING 'Error creating user profile for %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;



