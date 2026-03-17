-- Lightweight signup: handle partial profiles (no name = no team/subscription).
-- When first_name is empty (lightweight signup), create user with email prefix as name,
-- team_id=NULL, skip team/subscription creation. Profile completed later on /auth/complete-profile.
-- When first_name is present, existing behavior unchanged (creates team+sub).
-- Organization used as team name when provided, fallback to "FirstName LastName's Team".

CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_role text;
  v_team_id uuid;
  v_team_name text;
  v_user_name text;
  v_existing_profile_id uuid;
  v_new_user_id uuid;
  v_organization text;
BEGIN
  -- Activer bypass RLS pour ce trigger uniquement
  PERFORM set_config('app.bypass_rls_for_signup', 'true', true);

  -- Vérifier si profil existe déjà
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE auth_user_id = NEW.id;

  IF v_existing_profile_id IS NOT NULL THEN
    RETURN NEW;  -- Profil existe, skip
  END IF;

  -- Extraire métadonnées
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestionnaire');
  v_organization := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'organization', '')), '');

  -- WORKFLOW INVITATION: team_id fourni dans metadata
  IF NEW.raw_user_meta_data ? 'team_id' AND
     (NEW.raw_user_meta_data->>'team_id') IS NOT NULL THEN

    v_team_id := (NEW.raw_user_meta_data->>'team_id')::uuid;
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Créer profil avec équipe existante
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone, password_set
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role::user_role, v_team_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, false)
    );

    -- Ajouter à team_members
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT v_team_id, id, v_role::team_member_role
    FROM public.users WHERE auth_user_id = NEW.id;

    -- Mettre à jour invitation
    UPDATE public.user_invitations
    SET status = 'accepted'::invitation_status, accepted_at = NOW()
    WHERE email = NEW.email AND team_id = v_team_id AND status = 'pending'::invitation_status;

  ELSEIF v_first_name = '' OR v_last_name = '' THEN
    -- WORKFLOW LIGHTWEIGHT SIGNUP: No name provided — create partial profile
    -- Name uses email prefix, no team, no subscription
    -- Profile will be completed on /auth/complete-profile
    v_user_name := COALESCE(SPLIT_PART(NEW.email, '@', 1), 'Utilisateur');

    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone, password_set
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role::user_role, NULL,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, true)
    );

  ELSE
    -- WORKFLOW SIGNUP WITH NAME: Créer USER puis TEAM (existing behavior)
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Step 1: Créer profil SANS team_id
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone, password_set
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role::user_role, NULL,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, true)
    )
    RETURNING id INTO v_new_user_id;

    -- Step 2: Créer équipe — utiliser organization si fourni, sinon nom de l'utilisateur
    v_team_name := COALESCE(v_organization, v_first_name || ' ' || v_last_name || '''s Team');
    INSERT INTO public.teams (name, created_by)
    VALUES (v_team_name, v_new_user_id)
    RETURNING id INTO v_team_id;

    -- Step 3: Mettre à jour profil (équipe principale)
    UPDATE public.users
    SET team_id = v_team_id
    WHERE id = v_new_user_id;

    -- Step 4: Ajouter comme admin team_members
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_new_user_id, 'admin'::team_member_role);

    -- Step 5: Initialize subscription with 30-day trial
    INSERT INTO public.subscriptions (
      team_id,
      status,
      trial_start,
      trial_end,
      billable_properties,
      subscribed_lots
    ) VALUES (
      v_team_id,
      'trialing'::subscription_status,
      NOW(),
      NOW() + INTERVAL '30 days',
      0,
      0
    )
    ON CONFLICT (team_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;
